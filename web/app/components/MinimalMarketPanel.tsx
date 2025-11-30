'use client';

import { useState, useMemo } from 'react';
import { formatEther, parseEther } from 'viem';
import { formatToken } from '../../lib/format';
import { MinimalButton } from './MinimalButton';

type MinimalMarketPanelProps = {
  account?: string;
  reserveEth: bigint;
  reserveDemo: bigint;
  priceEthPerDemo: string;
  poolFunded: boolean;
  poolHasDemo: boolean;
  slippage: string;
  setSlippage: (value: string) => void;
  slippageBps: bigint | null;
  handleBuyDemo: (demoAmount: bigint, maxEthIn: bigint) => Promise<void>;
  handleSellDemo: (demoAmount: bigint, minEthOut: bigint) => Promise<void>;
  handleSpendEth: (ethAmount: bigint, minDemoOut: bigint) => Promise<void>;
  demoBalance: bigint;
  trading: boolean;
  setShowProviderModal: (show: boolean) => void;
};

export function MinimalMarketPanel({
  account,
  reserveEth,
  reserveDemo,
  priceEthPerDemo,
  poolFunded,
  poolHasDemo,
  slippage,
  setSlippage,
  slippageBps,
  handleBuyDemo,
  handleSpendEth,
  handleSellDemo,
  demoBalance,
  trading,
  setShowProviderModal,
}: MinimalMarketPanelProps) {
  const [direction, setDirection] = useState<'eth-to-demo' | 'demo-to-eth'>('eth-to-demo');
  const [inputAmount, setInputAmount] = useState('');
  const [outputAmount, setOutputAmount] = useState('');
  const [lastEdited, setLastEdited] = useState<'input' | 'output'>('input');

  const isBuying = direction === 'eth-to-demo';

  // Calculate based on which field was last edited
  const { calculatedAmount, calculationError } = useMemo(() => {
    if (!poolFunded || !poolHasDemo) {
      return { calculatedAmount: null, calculationError: null };
    }

    const editedAmount = lastEdited === 'input' ? inputAmount : outputAmount;
    if (!editedAmount || editedAmount === '0') {
      return { calculatedAmount: null, calculationError: null };
    }

    try {
      const amount = parseEther(editedAmount);
      if (amount <= 0n) return { calculatedAmount: null, calculationError: null };

      let calculated: bigint | null = null;
      let error: string | null = null;

      if (lastEdited === 'input') {
        if (isBuying) {
          calculated = (amount * reserveDemo) / (reserveEth + amount);
        } else {
          if (amount > demoBalance) {
            error = 'Insufficient DEMO balance';
          } else {
            calculated = (amount * reserveEth) / (reserveDemo + amount);
          }
        }
      } else {
        if (isBuying) {
          if (amount >= reserveDemo) {
            error = 'Cannot buy more DEMO than pool reserve';
          } else {
            calculated = (amount * reserveEth) / (reserveDemo - amount);
          }
        } else {
          if (amount >= reserveEth) {
            error = 'Cannot receive more ETH than pool reserve';
          } else {
            const demoNeeded = (amount * reserveDemo) / (reserveEth - amount);
            if (demoNeeded > demoBalance) {
              error = 'Insufficient DEMO balance';
            } else {
              calculated = demoNeeded;
            }
          }
        }
      }

      return { calculatedAmount: calculated, calculationError: error };
    } catch {
      return { calculatedAmount: null, calculationError: 'Invalid amount' };
    }
  }, [lastEdited, inputAmount, outputAmount, poolFunded, poolHasDemo, reserveEth, reserveDemo, demoBalance, isBuying]);

  // Update the opposite field when calculation changes
  useMemo(() => {
    if (calculatedAmount !== null) {
      const formatted = formatEther(calculatedAmount);
      if (lastEdited === 'input') {
        setOutputAmount(formatted);
      } else {
        setInputAmount(formatted);
      }
    } else if (!inputAmount && !outputAmount) {
      setInputAmount('');
      setOutputAmount('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calculatedAmount, lastEdited]);

  const handleInputChange = (value: string) => {
    setInputAmount(value);
    setLastEdited('input');
    if (!value) setOutputAmount('');
  };

  const handleOutputChange = (value: string) => {
    setOutputAmount(value);
    setLastEdited('output');
    if (!value) setInputAmount('');
  };

  const handleTrade = async () => {
    if (!account) {
      setShowProviderModal(true);
      return;
    }

    if (!poolFunded || !poolHasDemo) return;
    if (calculationError) return;
    if (!inputAmount || !outputAmount) return;
    if (!slippageBps) return;

    try {
      const input = parseEther(inputAmount);
      const output = parseEther(outputAmount);

      if (isBuying) {
        if (lastEdited === 'input') {
          const minDemoOut = output - (output * slippageBps) / 10000n;
          await handleSpendEth(input, minDemoOut > 0n ? minDemoOut : 1n);
        } else {
          const maxEthIn = input + (input * slippageBps) / 10000n;
          await handleBuyDemo(output, maxEthIn);
        }
      } else {
        const minEthOut = output - (output * slippageBps) / 10000n;
        await handleSellDemo(input, minEthOut > 0n ? minEthOut : 1n);
      }

      setInputAmount('');
      setOutputAmount('');
    } catch (err) {
      console.error(err);
    }
  };

  const getButtonText = () => {
    if (!account) return 'Connect Wallet';
    if (trading) return 'Processing...';
    if (!poolFunded) return 'Pool Not Funded';
    if (calculationError) return calculationError;
    if (!inputAmount || inputAmount === '0') return 'Enter Amount';
    return isBuying ? 'Swap' : 'Swap';
  };

  const isButtonDisabled = trading || !poolFunded || !!calculationError || !inputAmount || inputAmount === '0' || !outputAmount || outputAmount === '0';

  if (!poolFunded) {
    return (
      <section className="mx-auto max-w-2xl px-4 py-8">
        <div className="minimal-card p-6 text-center">
          <h2 className="text-xl font-semibold mb-4">Pool Not Ready</h2>
          <p className="text-slate-400">The AMM needs ETH liquidity before trading can begin</p>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-2xl px-4 py-8">
      <div className="minimal-card p-6">
        <h2 className="text-xl font-semibold mb-4">Trade DEMO</h2>

        <div className="space-y-4">
          {/* Input */}
          <div>
            <label className="block text-sm text-slate-400 mb-2">You pay</label>
            <div className="relative">
              <input
                type="text"
                inputMode="decimal"
                value={inputAmount}
                onChange={(e) => handleInputChange(e.target.value)}
                placeholder="0.0"
                className="w-full bg-slate-950 border border-slate-800 rounded px-4 py-3 pr-16 sm:pr-20 text-slate-100 focus:border-emerald-500 focus:outline-none"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                {isBuying ? 'ETH' : 'DEMO'}
              </div>
              {!isBuying && demoBalance > 0n && (
                <button
                  onClick={() => handleInputChange(formatEther(demoBalance))}
                  className="absolute right-14 sm:right-16 top-1/2 -translate-y-1/2 text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition px-2 py-1 rounded hover:bg-emerald-400/10 touch-target"
                  aria-label="Set to maximum DEMO balance"
                >
                  MAX
                </button>
              )}
            </div>
            {!isBuying && (
              <p className="mt-1 text-xs text-slate-500">Balance: {formatToken(demoBalance)} DEMO</p>
            )}
          </div>

          {/* Swap Direction */}
          <div className="flex justify-center -my-3 relative z-10">
            <button
              onClick={() => {
                setDirection(isBuying ? 'demo-to-eth' : 'eth-to-demo');
                setInputAmount('');
                setOutputAmount('');
              }}
              className="bg-slate-900 border border-slate-800 p-2 rounded-full text-slate-400 hover:text-emerald-400 hover:border-emerald-500/50 transition-colors shadow-lg touch-target"
              aria-label="Switch direction"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M7 15l5 5 5-5"/>
                <path d="M7 9l5-5 5 5"/>
              </svg>
            </button>
          </div>

          {/* Output */}
          <div>
            <label className="block text-sm text-slate-400 mb-2">You receive</label>
            <div className="relative">
              <input
                type="text"
                inputMode="decimal"
                value={outputAmount}
                onChange={(e) => handleOutputChange(e.target.value)}
                placeholder="0.0"
                className="w-full bg-slate-950 border border-slate-800 rounded px-4 py-3 pr-16 text-slate-100 focus:border-emerald-500 focus:outline-none"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                {isBuying ? 'DEMO' : 'ETH'}
              </div>
            </div>
            {calculationError && (
              <p className="mt-1 text-xs text-red-400">{calculationError}</p>
            )}
          </div>

          {/* Slippage */}
          <div>
            <label className="block text-sm text-slate-400 mb-2">Slippage (%)</label>
            <div className="flex flex-wrap gap-2">
              {['0.5', '1.0', '2.0'].map((preset) => (
                <button
                  key={preset}
                  onClick={() => setSlippage(preset)}
                  className={`px-3 py-2 text-xs rounded transition-colors touch-target ${
                    slippage === preset
                      ? 'bg-emerald-500 text-white'
                      : 'border border-slate-700 text-slate-400 hover:border-slate-600'
                  }`}
                >
                  {preset}%
                </button>
              ))}
              <input
                type="text"
                inputMode="decimal"
                value={slippage}
                onChange={(e) => setSlippage(e.target.value)}
                placeholder="1.0"
                className="flex-1 min-w-[80px] bg-slate-950 border border-slate-800 rounded px-3 py-2 text-slate-100 focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Trade Button */}
          <MinimalButton
            onClick={handleTrade}
            disabled={isButtonDisabled}
            className="w-full"
          >
            {getButtonText()}
          </MinimalButton>
        </div>

        {/* Pool Stats */}
        <div className="mt-6 pt-6 border-t border-slate-800">
          <div className="grid grid-cols-1 xs:grid-cols-3 gap-4 text-sm text-center xs:text-left">
            <div className="bg-slate-900/50 p-3 rounded xs:bg-transparent xs:p-0">
              <div className="text-slate-500 mb-1">ETH</div>
              <div className="text-slate-300">{formatToken(reserveEth)}</div>
            </div>
            <div className="bg-slate-900/50 p-3 rounded xs:bg-transparent xs:p-0">
              <div className="text-slate-500 mb-1">DEMO</div>
              <div className="text-slate-300">{formatToken(reserveDemo)}</div>
            </div>
            <div className="bg-slate-900/50 p-3 rounded xs:bg-transparent xs:p-0">
              <div className="text-slate-500 mb-1">Price</div>
              <div className="text-emerald-400">{priceEthPerDemo}</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
