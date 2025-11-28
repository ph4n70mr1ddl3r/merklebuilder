'use client';

import { useState } from 'react';
import { formatToken, shorten } from '../../lib/format';

type SimplifiedBuyPanelProps = {
  account?: string;
  contractAddress: string;
  reserveEth: bigint;
  reserveDemo: bigint;
  priceEthPerDemo: string;
  priceDemoPerEth: string;
  poolFunded: boolean;
  buyQuote: bigint | null;
  buyEthAmount: string;
  setBuyEthAmount: (value: string) => void;
  slippage: string;
  setSlippage: (value: string) => void;
  handleBuy: () => void;
  buyDisabledReason: string | null;
  trading: boolean;
  setShowProviderModal: (show: boolean) => void;
};

export function SimplifiedBuyPanel({
  account,
  contractAddress,
  reserveEth,
  reserveDemo,
  priceEthPerDemo,
  priceDemoPerEth,
  poolFunded,
  buyQuote,
  buyEthAmount,
  setBuyEthAmount,
  slippage,
  setSlippage,
  handleBuy,
  buyDisabledReason,
  trading,
  setShowProviderModal,
}: SimplifiedBuyPanelProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const setPresetAmount = (eth: string) => {
    setBuyEthAmount(eth);
  };

  const setPresetSlippage = (percent: string) => {
    setSlippage(percent);
  };

  return (
    <div className="mx-auto max-w-3xl px-4 pt-6">
      <div className="glass p-6 md:p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-slate-50 mb-3">Buy DEMO Tokens</h2>
          <p className="text-slate-300">
            Not eligible for the airdrop? No problem. Buy DEMO tokens directly with ETH.
          </p>
        </div>

        {/* Pool Stats */}
        <div className="mb-6 rounded-xl border border-purple-400/30 bg-purple-400/5 p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-xs text-slate-400 mb-1">ETH Reserve</p>
              <p className="text-lg font-semibold text-slate-50">{formatToken(reserveEth)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 mb-1">DEMO Reserve</p>
              <p className="text-lg font-semibold text-slate-50">{formatToken(reserveDemo)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 mb-1">Price</p>
              <p className="text-lg font-semibold text-purple-400">{priceEthPerDemo}</p>
              <p className="text-xs text-slate-500">ETH per DEMO</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 mb-1">1 ETH gets</p>
              <p className="text-lg font-semibold text-purple-400">{priceDemoPerEth}</p>
              <p className="text-xs text-slate-500">DEMO</p>
            </div>
          </div>
        </div>

        {!poolFunded && (
          <div className="mb-6 rounded-lg border border-amber-400/40 bg-amber-500/10 p-4 text-sm text-amber-100">
            <div className="flex items-start gap-3">
              <span className="text-xl">⚠️</span>
              <div>
                <p className="font-semibold mb-1">Pool not funded yet</p>
                <p className="text-amber-200/80">The market maker needs ETH liquidity before trading can begin. Please check back soon.</p>
              </div>
            </div>
          </div>
        )}

        {/* Connect Wallet */}
        {!account && (
          <div className="rounded-xl border border-purple-400/30 bg-purple-400/5 p-6 mb-6">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-purple-400/20">
                <span className="text-2xl">👛</span>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-slate-50 mb-2">Connect Your Wallet</h3>
                <p className="text-sm text-slate-300 mb-4">
                  Connect your wallet to start buying DEMO tokens with ETH
                </p>
                <button
                  onClick={() => setShowProviderModal(true)}
                  className="rounded-lg bg-gradient-to-r from-purple-400 to-purple-500 px-6 py-3 font-semibold text-purple-950 shadow-lg shadow-purple-500/30 transition hover:-translate-y-0.5"
                >
                  Connect Wallet
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Buy Interface */}
        {account && (
          <div className="space-y-6">
            {/* Amount Input */}
            <div className="rounded-xl border border-white/10 bg-white/5 p-6">
              <label className="block text-sm font-semibold text-slate-200 mb-3">
                How much ETH do you want to spend?
              </label>
              
              {/* Preset amounts */}
              <div className="flex flex-wrap gap-2 mb-4">
                {['0.001', '0.01', '0.1', '1'].map((amount) => (
                  <button
                    key={amount}
                    onClick={() => setPresetAmount(amount)}
                    className={`rounded-lg border px-4 py-2 text-sm font-semibold transition hover:-translate-y-0.5 ${
                      buyEthAmount === amount
                        ? 'border-purple-400 bg-purple-400/20 text-purple-300'
                        : 'border-white/10 bg-white/5 text-slate-300'
                    }`}
                  >
                    {amount} ETH
                  </button>
                ))}
              </div>

              {/* Custom input */}
              <div className="relative">
                <input
                  type="text"
                  value={buyEthAmount}
                  onChange={(e) => setBuyEthAmount(e.target.value)}
                  placeholder="0.0"
                  className="w-full rounded-lg border border-white/10 bg-slate-900/70 px-4 py-4 text-2xl text-slate-50 placeholder:text-slate-600 focus:border-purple-400 focus:outline-none"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xl font-semibold text-slate-400">
                  ETH
                </span>
              </div>

              {/* Quote display */}
              {buyQuote !== null && buyEthAmount && (
                <div className="mt-4 rounded-lg border border-purple-400/30 bg-purple-400/5 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-400 mb-1">You will receive</p>
                      <p className="text-2xl font-bold text-purple-400">
                        {formatToken(buyQuote)} DEMO
                      </p>
                    </div>
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-400/20">
                      <span className="text-2xl">⇄</span>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-white/10 grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-slate-400">Rate</p>
                      <p className="font-semibold text-slate-200">{priceEthPerDemo} ETH/DEMO</p>
                    </div>
                    <div>
                      <p className="text-slate-400">Slippage</p>
                      <p className="font-semibold text-slate-200">{slippage}%</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Advanced Settings */}
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex w-full items-center justify-between text-sm font-semibold text-slate-200"
              >
                <span>Advanced Settings</span>
                <span className={`transform transition-transform ${showAdvanced ? 'rotate-180' : ''}`}>
                  ▼
                </span>
              </button>
              
              {showAdvanced && (
                <div className="mt-4 space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-300 mb-2">
                      Slippage Tolerance
                    </label>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {['0.5', '1.0', '2.0', '5.0'].map((percent) => (
                        <button
                          key={percent}
                          onClick={() => setPresetSlippage(percent)}
                          className={`rounded-lg border px-3 py-1.5 text-sm font-semibold transition ${
                            slippage === percent
                              ? 'border-purple-400 bg-purple-400/20 text-purple-300'
                              : 'border-white/10 bg-white/5 text-slate-300'
                          }`}
                        >
                          {percent}%
                        </button>
                      ))}
                    </div>
                    <input
                      type="text"
                      value={slippage}
                      onChange={(e) => setSlippage(e.target.value)}
                      placeholder="1.0"
                      className="w-full rounded-lg border border-white/10 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-purple-400 focus:outline-none"
                    />
                    <p className="mt-1 text-xs text-slate-400">
                      Your transaction will revert if price changes unfavorably by more than this percentage
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Buy Button */}
            <button
              onClick={handleBuy}
              disabled={!poolFunded || !!buyDisabledReason || trading || !buyEthAmount}
              className="w-full rounded-xl bg-gradient-to-r from-purple-400 to-purple-500 px-8 py-4 text-lg font-semibold text-purple-950 shadow-lg shadow-purple-500/30 transition hover:-translate-y-0.5 disabled:opacity-50"
            >
              {trading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="h-5 w-5 animate-spin rounded-full border-2 border-purple-950 border-t-transparent" />
                  Processing swap...
                </span>
              ) : !account ? (
                'Connect Wallet'
              ) : !buyEthAmount ? (
                'Enter ETH Amount'
              ) : (
                `Buy ${buyQuote ? formatToken(buyQuote) : '...'} DEMO`
              )}
            </button>

            {buyDisabledReason && (
              <p className="text-center text-sm text-amber-300">{buyDisabledReason}</p>
            )}

            {/* Info */}
            <div className="rounded-lg border border-white/10 bg-white/5 p-4">
              <div className="flex items-start gap-3">
                <span className="text-lg">💡</span>
                <div className="text-sm text-slate-300">
                  <p className="font-semibold text-slate-200 mb-1">About the Market Maker:</p>
                  <p>
                    This is a constant-product AMM (x * y = k) with contract-owned liquidity. 
                    Every claim adds 10 DEMO to the pool. No LP tokens - the contract owns all liquidity.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
