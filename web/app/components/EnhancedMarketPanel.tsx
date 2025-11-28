'use client';

import { useState, useMemo } from 'react';
import { formatEther, parseEther } from 'viem';
import { formatToken } from '../../lib/format';
import { Tooltip } from './Tooltip';

type TradeMode = 'buy-exact-demo' | 'sell-exact-demo' | 'spend-exact-eth' | 'receive-exact-eth';

type EnhancedMarketPanelProps = {
  account?: string;
  contractAddress: string;
  reserveEth: bigint;
  reserveDemo: bigint;
  priceEthPerDemo: string;
  priceDemoPerEth: string;
  poolFunded: boolean;
  poolHasDemo: boolean;
  slippage: string;
  setSlippage: (value: string) => void;
  slippageBps: bigint | null;
  handleBuyDemo: (demoAmount: bigint, maxEthIn: bigint) => Promise<void>;
  handleSellDemo: (demoAmount: bigint, minEthOut: bigint) => Promise<void>;
  handleSpendEth: (ethAmount: bigint, minDemoOut: bigint) => Promise<void>;
  handleReceiveEth: (demoAmount: bigint, exactEthOut: bigint) => Promise<void>;
  demoBalance: bigint;
  trading: boolean;
  setShowProviderModal: (show: boolean) => void;
};

export function EnhancedMarketPanel({
  account,
  contractAddress,
  reserveEth,
  reserveDemo,
  priceEthPerDemo,
  priceDemoPerEth,
  poolFunded,
  poolHasDemo,
  slippage,
  setSlippage,
  slippageBps,
  handleBuyDemo,
  handleSellDemo,
  handleSpendEth,
  handleReceiveEth,
  demoBalance,
  trading,
  setShowProviderModal,
}: EnhancedMarketPanelProps) {
  const [tradeMode, setTradeMode] = useState<TradeMode>('spend-exact-eth');
  const [inputAmount, setInputAmount] = useState('');

  // Calculate output based on trade mode
  const { outputAmount, outputLabel, inputLabel, calculationError } = useMemo(() => {
    if (!poolFunded || !poolHasDemo || !inputAmount || inputAmount === '0') {
      return { outputAmount: null, outputLabel: '', inputLabel: '', calculationError: null };
    }

    try {
      const input = parseEther(inputAmount);
      if (input <= 0n) return { outputAmount: null, outputLabel: '', inputLabel: '', calculationError: null };

      let output: bigint | null = null;
      let error: string | null = null;

      switch (tradeMode) {
        case 'buy-exact-demo': {
          // Want exact DEMO output → calculate ETH needed
          // amountOut = (amountIn * reserveDemo) / (reserveEth + amountIn)
          // Solving for amountIn: amountIn = (amountOut * reserveEth) / (reserveDemo - amountOut)
          if (input >= reserveDemo) {
            error = 'Cannot buy more DEMO than pool reserve';
            break;
          }
          const ethNeeded = (input * reserveEth) / (reserveDemo - input);
          output = ethNeeded;
          break;
        }

        case 'sell-exact-demo': {
          // Selling exact DEMO → calculate ETH received
          // amountOut = (amountIn * reserveEth) / (reserveDemo + amountIn)
          if (input > demoBalance) {
            error = 'Insufficient DEMO balance';
            break;
          }
          const ethReceived = (input * reserveEth) / (reserveDemo + input);
          output = ethReceived;
          break;
        }

        case 'spend-exact-eth': {
          // Spending exact ETH → calculate DEMO received
          // amountOut = (amountIn * reserveDemo) / (reserveEth + amountIn)
          const demoReceived = (input * reserveDemo) / (reserveEth + input);
          output = demoReceived;
          break;
        }

        case 'receive-exact-eth': {
          // Want exact ETH output → calculate DEMO to sell
          // amountOut = (amountIn * reserveEth) / (reserveDemo + amountIn)
          // Solving for amountIn: amountIn = (amountOut * reserveDemo) / (reserveEth - amountOut)
          if (input >= reserveEth) {
            error = 'Cannot receive more ETH than pool reserve';
            break;
          }
          const demoNeeded = (input * reserveDemo) / (reserveEth - input);
          if (demoNeeded > demoBalance) {
            error = 'Insufficient DEMO balance';
            break;
          }
          output = demoNeeded;
          break;
        }
      }

      const isBuying = tradeMode === 'buy-exact-demo' || tradeMode === 'spend-exact-eth';
      const inputToken = isBuying ? 'ETH' : 'DEMO';
      const outputToken = isBuying ? 'DEMO' : 'ETH';

      return {
        outputAmount: output,
        outputLabel: `${outputToken} ${tradeMode.includes('exact-demo') && !isBuying ? 'to sell' : tradeMode === 'receive-exact-eth' ? 'to sell' : isBuying ? 'received' : 'received'}`,
        inputLabel: `${inputToken} ${tradeMode.includes('exact') && (tradeMode === 'buy-exact-demo' || tradeMode === 'receive-exact-eth') ? 'amount' : 'to spend'}`,
        calculationError: error,
      };
    } catch (err) {
      return { outputAmount: null, outputLabel: '', inputLabel: '', calculationError: 'Invalid amount' };
    }
  }, [tradeMode, inputAmount, poolFunded, poolHasDemo, reserveEth, reserveDemo, demoBalance]);

  // Calculate price impact
  const priceImpact = useMemo(() => {
    if (!outputAmount || !poolFunded || !poolHasDemo || !inputAmount) return null;
    
    try {
      const input = parseEther(inputAmount);
      if (input <= 0n) return null;

      const isBuying = tradeMode === 'buy-exact-demo' || tradeMode === 'spend-exact-eth';
      
      // Current spot price (ETH per DEMO)
      const spotPrice = Number(formatEther(reserveEth)) / Number(formatEther(reserveDemo));
      
      let effectivePrice: number;
      if (isBuying) {
        // Buying DEMO: ETH spent / DEMO received
        if (tradeMode === 'spend-exact-eth') {
          effectivePrice = Number(formatEther(input)) / Number(formatEther(outputAmount));
        } else {
          // buy-exact-demo: ETH needed (output) / DEMO wanted (input)
          effectivePrice = Number(formatEther(outputAmount)) / Number(formatEther(input));
        }
      } else {
        // Selling DEMO: DEMO spent / ETH received
        if (tradeMode === 'sell-exact-demo') {
          effectivePrice = Number(formatEther(outputAmount)) / Number(formatEther(input));
        } else {
          // receive-exact-eth: ETH wanted (input) / DEMO to sell (output)
          effectivePrice = Number(formatEther(input)) / Number(formatEther(outputAmount));
        }
      }

      // Price impact = (effective - spot) / spot * 100
      const impact = ((effectivePrice - spotPrice) / spotPrice) * 100;
      return Math.abs(impact);
    } catch {
      return null;
    }
  }, [tradeMode, inputAmount, outputAmount, poolFunded, poolHasDemo, reserveEth, reserveDemo]);

  const handleTrade = async () => {
    if (!account) {
      setShowProviderModal(true);
      return;
    }

    if (!poolFunded || !poolHasDemo) return;
    if (calculationError) return;
    if (!outputAmount) return;
    if (!slippageBps) return;

    try {
      const input = parseEther(inputAmount);

      switch (tradeMode) {
        case 'buy-exact-demo': {
          // Want exact DEMO, calculated ETH needed
          const maxEthIn = outputAmount + (outputAmount * slippageBps) / 10000n;
          await handleBuyDemo(input, maxEthIn);
          break;
        }

        case 'sell-exact-demo': {
          // Selling exact DEMO, calculated ETH received
          const minEthOut = outputAmount - (outputAmount * slippageBps) / 10000n;
          await handleSellDemo(input, minEthOut > 0n ? minEthOut : 1n);
          break;
        }

        case 'spend-exact-eth': {
          // Spending exact ETH, calculated DEMO received
          const minDemoOut = outputAmount - (outputAmount * slippageBps) / 10000n;
          await handleSpendEth(input, minDemoOut > 0n ? minDemoOut : 1n);
          break;
        }

        case 'receive-exact-eth': {
          // Want exact ETH, calculated DEMO to sell
          const exactEthOut = input;
          await handleReceiveEth(outputAmount, exactEthOut);
          break;
        }
      }

      setInputAmount('');
    } catch (err) {
      console.error(err);
    }
  };

  const tradeModesConfig = [
    {
      id: 'spend-exact-eth' as TradeMode,
      icon: '💸',
      title: 'Spend ETH',
      description: 'Spend exact ETH amount to buy DEMO',
      color: 'purple',
    },
    {
      id: 'buy-exact-demo' as TradeMode,
      icon: '🎯',
      title: 'Buy DEMO',
      description: 'Buy exact DEMO amount (calculate ETH needed)',
      color: 'emerald',
    },
    {
      id: 'sell-exact-demo' as TradeMode,
      icon: '📤',
      title: 'Sell DEMO',
      description: 'Sell exact DEMO amount (calculate ETH received)',
      color: 'amber',
    },
    {
      id: 'receive-exact-eth' as TradeMode,
      icon: '💰',
      title: 'Receive ETH',
      description: 'Receive exact ETH amount (calculate DEMO to sell)',
      color: 'cyan',
    },
  ];

  const currentModeConfig = tradeModesConfig.find((m) => m.id === tradeMode)!;
  const isBuying = tradeMode === 'buy-exact-demo' || tradeMode === 'spend-exact-eth';

  const getButtonText = () => {
    if (!account) return 'Connect Wallet';
    if (trading) return 'Processing...';
    if (!poolFunded) return 'Pool Not Funded';
    if (calculationError) return calculationError;
    if (!inputAmount || inputAmount === '0') return 'Enter Amount';
    if (isBuying) return 'Buy DEMO';
    return 'Sell DEMO';
  };

  const isButtonDisabled = trading || !poolFunded || !!calculationError || !inputAmount || inputAmount === '0' || !outputAmount;

  return (
    <section className="mx-auto max-w-6xl px-3 pt-6 pb-14 md:px-4">
      <div className="glass-card w-full space-y-6 p-5 md:p-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm uppercase tracking-wide text-slate-400">Trade DEMO</p>
            <h3 className="text-xl font-semibold text-slate-50">Four Ways to Swap</h3>
            <p className="text-sm text-slate-300">
              Choose your trade type: specify exact input or exact output amounts
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

        {/* Trade Mode Selection */}
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          {tradeModesConfig.map((mode) => {
            const isSelected = tradeMode === mode.id;
            const borderColor = isSelected
              ? mode.color === 'purple' ? 'border-purple-400'
              : mode.color === 'emerald' ? 'border-emerald-400'
              : mode.color === 'amber' ? 'border-amber-400'
              : 'border-cyan-400'
              : 'border-white/10';
            const bgColor = isSelected
              ? mode.color === 'purple' ? 'bg-purple-400/10'
              : mode.color === 'emerald' ? 'bg-emerald-400/10'
              : mode.color === 'amber' ? 'bg-amber-400/10'
              : 'bg-cyan-400/10'
              : 'bg-white/5';
            const shadowColor = isSelected
              ? mode.color === 'purple' ? 'shadow-purple-500/20'
              : mode.color === 'emerald' ? 'shadow-emerald-500/20'
              : mode.color === 'amber' ? 'shadow-amber-500/20'
              : 'shadow-cyan-500/20'
              : '';
            const iconBg = mode.color === 'purple' ? 'bg-purple-400/20'
              : mode.color === 'emerald' ? 'bg-emerald-400/20'
              : mode.color === 'amber' ? 'bg-amber-400/20'
              : 'bg-cyan-400/20';
            const dotBg = mode.color === 'purple' ? 'bg-purple-400'
              : mode.color === 'emerald' ? 'bg-emerald-400'
              : mode.color === 'amber' ? 'bg-amber-400'
              : 'bg-cyan-400';

            return (
              <button
                key={mode.id}
                onClick={() => {
                  setTradeMode(mode.id);
                  setInputAmount('');
                }}
                className={`relative rounded-xl border p-4 text-left transition-all ${borderColor} ${bgColor} ${isSelected ? `shadow-lg ${shadowColor}` : 'hover:border-white/20 hover:bg-white/10'}`}
              >
                <div className="flex items-start gap-3">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${iconBg}`}>
                    <span className="text-xl">{mode.icon}</span>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-slate-50 mb-1">{mode.title}</h4>
                    <p className="text-xs text-slate-400">{mode.description}</p>
                  </div>
                </div>
                {isSelected && (
                  <div className={`absolute top-2 right-2 h-2 w-2 rounded-full ${dotBg}`} />
                )}
              </button>
            );
          })}
        </div>

        {/* Trading Interface */}
        <div className="grid gap-4 lg:grid-cols-3">
          {/* Main Trade Form */}
          <div className="lg:col-span-2 rounded-xl border border-white/10 bg-slate-900/70 p-5">
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">{currentModeConfig.icon}</span>
                <h4 className="text-lg font-semibold text-slate-50">{currentModeConfig.title}</h4>
              </div>
              <p className="text-sm text-slate-300">{currentModeConfig.description}</p>
            </div>

            {/* Input */}
            <div className="space-y-4">
              <div>
                <label htmlFor="trade-input" className="block text-sm font-semibold text-slate-200 mb-2">
                  {tradeMode === 'buy-exact-demo' && 'DEMO Amount (exact)'}
                  {tradeMode === 'sell-exact-demo' && 'DEMO Amount (exact)'}
                  {tradeMode === 'spend-exact-eth' && 'ETH Amount (exact)'}
                  {tradeMode === 'receive-exact-eth' && 'ETH Amount (exact to receive)'}
                </label>
                <div className="relative">
                  <input
                    id="trade-input"
                    type="text"
                    value={inputAmount}
                    onChange={(e) => setInputAmount(e.target.value)}
                    placeholder="0.0"
                    className="w-full rounded-lg border border-white/10 bg-slate-950/60 px-4 py-3 pr-32 text-lg text-slate-100 placeholder:text-slate-500 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                    aria-label="Trade amount input"
                  />
                  {(tradeMode === 'sell-exact-demo' || tradeMode === 'receive-exact-eth') && demoBalance > 0n && (
                    <button
                      type="button"
                      onClick={() => setInputAmount(formatEther(demoBalance))}
                      className="absolute right-16 top-1/2 -translate-y-1/2 text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition px-2 py-1 rounded hover:bg-emerald-400/10"
                      aria-label="Set to maximum DEMO balance"
                    >
                      MAX
                    </button>
                  )}
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md bg-white/10 px-2 py-1 text-xs font-semibold text-slate-300">
                    {tradeMode.includes('demo') && tradeMode !== 'spend-exact-eth' ? 'DEMO' : 'ETH'}
                  </div>
                </div>
                {tradeMode === 'sell-exact-demo' || tradeMode === 'receive-exact-eth' ? (
                  <p className="mt-1 text-xs text-slate-300">Balance: {formatToken(demoBalance)} DEMO</p>
                ) : null}
              </div>

              {/* Output Display */}
              <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                <p className="text-xs text-slate-400 mb-2">You will {isBuying ? 'receive' : 'pay'}</p>
                <div className="flex items-baseline justify-between">
                  <span className="text-2xl font-bold text-slate-50">
                    {outputAmount ? formatToken(outputAmount) : '0.0'}
                  </span>
                  <span className="text-sm font-semibold text-slate-300">
                    {tradeMode === 'buy-exact-demo' || tradeMode === 'receive-exact-eth' ? 'ETH' : tradeMode === 'sell-exact-demo' ? 'ETH' : 'DEMO'}
                  </span>
                </div>
                {calculationError && (
                  <p className="mt-2 text-xs text-red-400">{calculationError}</p>
                )}
                {!calculationError && outputAmount && slippageBps !== null && (
                  <p className="mt-2 text-xs text-slate-400">
                    {isBuying ? 'Minimum received' : 'Maximum spent'} with {(Number(slippageBps) / 100).toFixed(2)}% slippage:{' '}
                    {isBuying
                      ? formatToken(outputAmount - (outputAmount * slippageBps) / 10000n)
                      : formatToken(outputAmount + (outputAmount * slippageBps) / 10000n)}
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
                        <Tooltip content="Price impact shows how much your trade will move the market price. Large trades relative to pool size cause higher impact and worse execution prices." position="bottom">
                          <span className="border-b border-dotted border-current">Price Impact</span>
                        </Tooltip>: <strong>{priceImpact.toFixed(2)}%</strong>
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
                    : isBuying
                    ? 'bg-gradient-to-r from-emerald-400 to-emerald-500 text-emerald-950 shadow-emerald-500/30 hover:-translate-y-0.5'
                    : 'bg-gradient-to-r from-amber-400 to-amber-500 text-amber-950 shadow-amber-500/30 hover:-translate-y-0.5'
                }`}
              >
                {getButtonText()}
              </button>
            </div>
          </div>

          {/* Pool Stats */}
          <div className="rounded-xl border border-white/10 bg-slate-900/70 p-5">
            <p className="text-sm font-semibold text-slate-200 mb-4">
              <Tooltip content="Liquidity pool reserves that back all trades. Larger reserves = less price impact per trade." position="bottom">
                <span className="border-b border-dotted border-slate-400">Pool Statistics</span>
              </Tooltip>
            </p>
            <div className="space-y-3">
              <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                <p className="text-xs text-slate-400 mb-1">ETH Reserve</p>
                <p className="text-lg font-bold text-slate-50">{formatToken(reserveEth)}</p>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                <p className="text-xs text-slate-400 mb-1">DEMO Reserve</p>
                <p className="text-lg font-bold text-slate-50">{formatToken(reserveDemo)}</p>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                <p className="text-xs text-slate-400 mb-1">ETH per DEMO</p>
                <p className="text-lg font-bold text-emerald-400">{priceEthPerDemo}</p>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                <p className="text-xs text-slate-400 mb-1">DEMO per ETH</p>
                <p className="text-lg font-bold text-purple-400">{priceDemoPerEth}</p>
              </div>
            </div>

            <div className="mt-4 rounded-lg border border-cyan-400/30 bg-cyan-400/5 p-3 text-xs text-slate-300">
              <p className="font-semibold text-cyan-300 mb-1">💡 How it works</p>
              <p>
                This{' '}
                <Tooltip content="Automated Market Maker that uses the formula x × y = k, where x and y are the token reserves and k is a constant. Prices are determined automatically by the ratio of reserves." position="top">
                  <span className="border-b border-dotted border-cyan-400 text-cyan-300 cursor-help">constant-product AMM</span>
                </Tooltip>{' '}
                automatically calculates prices based on pool reserves. Choose your preferred trade type above.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
