'use client';

import { useState, useMemo } from 'react';
import { formatEther, parseEther } from 'viem';
import { formatToken } from '../../lib/format';
import { Tooltip } from './Tooltip';

type SimplifiedMarketPanelProps = {
  account?: string;
  contractAddress: string;
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

export function SimplifiedMarketPanel({
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
}: SimplifiedMarketPanelProps) {
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
        // User edited input, calculate output
        if (isBuying) {
          // ETH -> DEMO: amountOut = (amountIn * reserveDemo) / (reserveEth + amountIn)
          calculated = (amount * reserveDemo) / (reserveEth + amount);
        } else {
          // DEMO -> ETH: amountOut = (amountIn * reserveEth) / (reserveDemo + amountIn)
          if (amount > demoBalance) {
            error = 'Insufficient DEMO balance';
          } else {
            calculated = (amount * reserveEth) / (reserveDemo + amount);
          }
        }
      } else {
        // User edited output, calculate required input
        if (isBuying) {
          // Want exact DEMO output → calculate ETH needed
          // Solving: amountOut = (amountIn * reserveDemo) / (reserveEth + amountIn)
          // For amountIn: amountIn = (amountOut * reserveEth) / (reserveDemo - amountOut)
          if (amount >= reserveDemo) {
            error = 'Cannot buy more DEMO than pool reserve';
          } else {
            calculated = (amount * reserveEth) / (reserveDemo - amount);
          }
        } else {
          // Want exact ETH output → calculate DEMO to sell
          // Solving: amountOut = (amountIn * reserveEth) / (reserveDemo + amountIn)
          // For amountIn: amountIn = (amountOut * reserveDemo) / (reserveEth - amountOut)
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
      // Both empty, reset
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

  // Calculate price impact
  const priceImpact = useMemo(() => {
    if (!poolFunded || !poolHasDemo || !inputAmount || !outputAmount) return null;
    
    try {
      const input = parseEther(inputAmount);
      const output = parseEther(outputAmount);
      if (input <= 0n || output <= 0n) return null;

      // Current spot price (ETH per DEMO)
      const spotPrice = Number(formatEther(reserveEth)) / Number(formatEther(reserveDemo));
      
      // Effective price for this trade
      let effectivePrice: number;
      if (isBuying) {
        // ETH spent / DEMO received
        effectivePrice = Number(formatEther(input)) / Number(formatEther(output));
      } else {
        // ETH received / DEMO spent
        effectivePrice = Number(formatEther(output)) / Number(formatEther(input));
      }

      // Price impact = (effective - spot) / spot * 100
      const impact = ((effectivePrice - spotPrice) / spotPrice) * 100;
      return Math.abs(impact);
    } catch {
      return null;
    }
  }, [inputAmount, outputAmount, poolFunded, poolHasDemo, reserveEth, reserveDemo, isBuying]);

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
        // Spending ETH to get DEMO
        if (lastEdited === 'input') {
          // User specified ETH amount, calculated DEMO
          const minDemoOut = output - (output * slippageBps) / 10000n;
          await handleSpendEth(input, minDemoOut > 0n ? minDemoOut : 1n);
        } else {
          // User specified DEMO amount, calculated ETH needed
          const maxEthIn = input + (input * slippageBps) / 10000n;
          await handleBuyDemo(output, maxEthIn);
        }
      } else {
        // Selling DEMO to get ETH
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
    return isBuying ? 'Swap ETH for DEMO' : 'Swap DEMO for ETH';
  };

  const isButtonDisabled = trading || !poolFunded || !!calculationError || !inputAmount || inputAmount === '0' || !outputAmount || outputAmount === '0';

  return (
    <section className="mx-auto max-w-4xl px-3 pt-6 pb-14 md:px-4">
      <div className="glass-card w-full space-y-6 p-5 md:p-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm uppercase tracking-wide text-slate-400">Trade DEMO</p>
            <h3 className="text-xl font-semibold text-slate-50">Constant-Product AMM</h3>
            <p className="text-sm text-slate-300">
              Enter amount, we&apos;ll calculate the output
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs text-slate-300">
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
              Your DEMO: {formatToken(demoBalance)}
            </span>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
              Price: {priceEthPerDemo} ETH/DEMO
            </span>
          </div>
        </div>

        {/* Pool Warning */}
        {!poolFunded && (
          <div className="rounded-lg border border-amber-400/40 bg-amber-500/10 p-4 text-sm text-amber-100">
            <div className="flex items-start gap-3">
              <span className="text-xl">⚠️</span>
              <div>
                <p className="font-semibold mb-1">Pool not funded yet</p>
                <p className="text-amber-200/80">
                  The market maker needs ETH liquidity before trading can begin.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Trading Interface */}
        <div className="grid gap-4 lg:grid-cols-3">
          {/* Main Trade Form */}
          <div className="lg:col-span-2 rounded-xl border border-white/10 bg-slate-900/70 p-5">
            <div className="space-y-4">
              {/* Input */}
              <div>
                <label htmlFor="trade-input" className="block text-sm font-semibold text-slate-200 mb-2">
                  You pay
                </label>
                <div className="relative">
                  <input
                    id="trade-input"
                    type="text"
                    value={inputAmount}
                    onChange={(e) => handleInputChange(e.target.value)}
                    placeholder="0.0"
                    className="w-full rounded-lg border border-white/10 bg-slate-950/60 px-4 py-3 pr-32 text-lg text-slate-100 placeholder:text-slate-500 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                    aria-label="Trade amount input"
                  />
                  {!isBuying && demoBalance > 0n && (
                    <button
                      type="button"
                      onClick={() => handleInputChange(formatEther(demoBalance))}
                      className="absolute right-16 top-1/2 -translate-y-1/2 text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition px-2 py-1 rounded hover:bg-emerald-400/10"
                      aria-label="Set to maximum DEMO balance"
                    >
                      MAX
                    </button>
                  )}
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md bg-white/10 px-2 py-1 text-xs font-semibold text-slate-300">
                    {isBuying ? 'ETH' : 'DEMO'}
                  </div>
                </div>
                {!isBuying && (
                  <p className="mt-1 text-xs text-slate-300">Balance: {formatToken(demoBalance)} DEMO</p>
                )}
              </div>

              {/* Swap Direction Button */}
              <div className="flex justify-center">
                <button
                  onClick={() => {
                    setDirection(isBuying ? 'demo-to-eth' : 'eth-to-demo');
                    setInputAmount('');
                    setOutputAmount('');
                  }}
                  className="rounded-full border border-white/20 bg-white/5 p-3 transition hover:bg-white/10 hover:border-white/30 hover:rotate-180"
                  aria-label="Swap direction"
                >
                  <svg className="w-5 h-5 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                  </svg>
                </button>
              </div>

              {/* Output Display - Now Editable */}
              <div>
                <label htmlFor="trade-output" className="block text-sm font-semibold text-slate-200 mb-2">
                  You receive
                </label>
                <div className="relative">
                  <input
                    id="trade-output"
                    type="text"
                    value={outputAmount}
                    onChange={(e) => handleOutputChange(e.target.value)}
                    placeholder="0.0"
                    className="w-full rounded-lg border border-white/10 bg-slate-950/60 px-4 py-3 pr-20 text-lg text-slate-100 placeholder:text-slate-500 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                    aria-label="Trade amount output"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md bg-white/10 px-2 py-1 text-xs font-semibold text-slate-300">
                    {isBuying ? 'DEMO' : 'ETH'}
                  </div>
                </div>
                {calculationError && (
                  <p className="mt-2 text-xs text-red-400">{calculationError}</p>
                )}
                {!calculationError && outputAmount && outputAmount !== '0' && slippageBps !== null && (
                  <p className="mt-2 text-xs text-slate-400">
                    Minimum received with {(Number(slippageBps) / 100).toFixed(2)}% slippage:{' '}
                    {(() => {
                      try {
                        const out = parseEther(outputAmount);
                        const minOut = out - (out * slippageBps) / 10000n;
                        return formatToken(minOut);
                      } catch {
                        return '0.0';
                      }
                    })()}
                  </p>
                )}
                
                {/* Price Impact Warning */}
                {priceImpact !== null && priceImpact > 1 && (
                  <div className={`mt-3 rounded-lg p-2 text-xs ${
                    priceImpact > 10 
                      ? 'bg-red-400/20 border border-red-400/40 text-red-300' 
                      : priceImpact > 5 
                        ? 'bg-amber-400/20 border border-amber-400/40 text-amber-300'
                        : 'bg-slate-400/10 border border-slate-400/20 text-slate-300'
                  }`}>
                    <div className="flex items-center gap-2">
                      <span>{priceImpact > 10 ? '⚠️' : priceImpact > 5 ? '⚡' : 'ℹ️'}</span>
                      <span>
                        Price Impact: <strong>{priceImpact.toFixed(2)}%</strong>
                        {priceImpact > 10 && ' — High impact! Consider a smaller trade.'}
                        {priceImpact > 5 && priceImpact <= 10 && ' — Moderate impact'}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Slippage */}
              <div>
                <label htmlFor="slippage" className="block text-sm font-semibold text-slate-200 mb-2">
                  <Tooltip content="Maximum acceptable price change between submission and execution. Higher slippage = more likely to execute, but potentially worse price.">
                    <span className="border-b border-dotted border-slate-400">Slippage Tolerance</span>
                  </Tooltip> (%)
                </label>
                <div className="flex gap-2">
                  {['0.5', '1.0', '2.0'].map((preset) => (
                    <button
                      key={preset}
                      onClick={() => setSlippage(preset)}
                      className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${
                        slippage === preset
                          ? 'bg-emerald-400/20 text-emerald-300 border border-emerald-400/50'
                          : 'bg-white/5 text-slate-300 border border-white/10 hover:bg-white/10'
                      }`}
                    >
                      {preset}%
                    </button>
                  ))}
                  <input
                    id="slippage"
                    type="text"
                    value={slippage}
                    onChange={(e) => setSlippage(e.target.value)}
                    placeholder="1.0"
                    className="flex-1 rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-400 focus:outline-none"
                  />
                </div>
              </div>

              {/* Trade Button */}
              <button
                onClick={handleTrade}
                disabled={isButtonDisabled}
                className={`w-full rounded-lg px-6 py-4 text-base font-bold shadow-lg transition-all ${
                  isButtonDisabled
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-emerald-400 to-emerald-500 text-emerald-950 shadow-emerald-500/30 hover:-translate-y-0.5'
                }`}
              >
                {getButtonText()}
              </button>
            </div>
          </div>

          {/* Pool Stats */}
          <div className="rounded-xl border border-white/10 bg-slate-900/70 p-5">
            <p className="text-sm font-semibold text-slate-200 mb-4">Liquidity Pool</p>
            <div className="space-y-3">
              <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                <p className="text-xs text-slate-400 mb-1">ETH Reserve</p>
                <p className="text-lg font-bold text-slate-50">{formatToken(reserveEth)} ETH</p>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                <p className="text-xs text-slate-400 mb-1">DEMO Reserve</p>
                <p className="text-lg font-bold text-slate-50">{formatToken(reserveDemo)} DEMO</p>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                <p className="text-xs text-slate-400 mb-1">Current Price</p>
                <p className="text-lg font-bold text-emerald-400">{priceEthPerDemo} ETH/DEMO</p>
              </div>
            </div>

            <div className="mt-4 rounded-lg border border-cyan-400/30 bg-cyan-400/5 p-3 text-xs text-slate-300">
              <p className="font-semibold text-cyan-300 mb-1">💡 How it works</p>
              <p>
                Constant-product AMM (x &times; y = k). Prices adjust automatically based on pool reserves. Larger trades cause higher price impact.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
