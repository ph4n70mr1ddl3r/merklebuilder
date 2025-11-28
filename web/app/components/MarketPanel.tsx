'use client';

import { shorten, formatToken } from "../../lib/format";

type MarketPanelProps = {
  contractAddress: string;
  reserveEth: bigint;
  reserveDemo: bigint;
  priceEthPerDemo: string;
  priceDemoPerEth: string;
  poolFunded: boolean;
  poolHasDemo: boolean;
  buyQuote: bigint | null;
  sellQuote: bigint | null;
  buyMinOut: bigint | null;
  sellMinOut: bigint | null;
  buyEthAmount: string;
  setBuyEthAmount: (value: string) => void;
  sellDemoAmount: string;
  setSellDemoAmount: (value: string) => void;
  donateAmount: string;
  setDonateAmount: (value: string) => void;
  slippage: string;
  setSlippage: (value: string) => void;
  slippageBps: bigint | null;
  handleDonate: () => void;
  handleBuy: () => void;
  handleSell: () => void;
  donateDisabledReason: string | null;
  buyDisabledReason: string | null;
  sellDisabledReason: string | null;
  account?: string;
  trading: boolean;
  donating: boolean;
  demoBalance: bigint;
};

export function MarketPanel({
  contractAddress,
  reserveEth,
  reserveDemo,
  priceEthPerDemo,
  priceDemoPerEth,
  poolFunded,
  poolHasDemo,
  buyQuote,
  sellQuote,
  buyMinOut,
  sellMinOut,
  buyEthAmount,
  setBuyEthAmount,
  sellDemoAmount,
  setSellDemoAmount,
  donateAmount,
  setDonateAmount,
  slippage,
  setSlippage,
  slippageBps,
  handleDonate,
  handleBuy,
  handleSell,
  donateDisabledReason,
  buyDisabledReason,
  sellDisabledReason,
  account,
  trading,
  donating,
  demoBalance,
}: MarketPanelProps) {
  return (
    <section
      id="market-maker"
      role="tabpanel"
      aria-labelledby="tab-market"
      className="mx-auto max-w-6xl px-3 pt-4 md:px-4"
      tabIndex={0}
    >
      <div className="glass w-full space-y-4 p-4 md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm uppercase tracking-wide text-slate-400">Market maker</p>
            <h3 className="text-xl font-semibold text-slate-50">Seed and swap against the DEMO pool</h3>
            <p className="text-sm text-slate-300">
              Contract-owned constant-product AMM with no LP tokens. Set slippage, donate ETH, and swap both ways.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs text-slate-100">
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">ETH reserve: {formatToken(reserveEth)} </span>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">DEMO reserve: {formatToken(reserveDemo)} </span>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">Price: {priceEthPerDemo} ETH/DEMO</span>
          </div>
        </div>

        {!poolFunded && (
          <div className="rounded-lg border border-amber-400/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
            The pool has no ETH yet. Send a small amount of ETH to the contract to unlock claiming and trading.
          </div>
        )}

        <div className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-xl border border-white/10 bg-slate-900/70 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-100">Donate ETH to seed the pool</p>
                <p className="text-xs text-slate-400">
                  Anyone can boost reserves. A simple ETH transfer increases liquidity and unlocks claiming.
                </p>
              </div>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-200">
                Contract: {shorten(contractAddress)}
              </span>
            </div>
            <div className="mt-3 flex flex-col gap-2">
              <label htmlFor="donate-amount" className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Donate amount (ETH)
              </label>
              <input
                id="donate-amount"
                value={donateAmount}
                onChange={(e) => setDonateAmount(e.target.value)}
                placeholder="0.0001"
                className="w-full flex-1 rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-400 focus:outline-none"
              />
              <button
                onClick={handleDonate}
                disabled={donating || !!donateDisabledReason}
                className="w-full rounded-lg border border-emerald-400/50 bg-emerald-400/10 px-3 py-2 text-sm font-semibold text-emerald-100 shadow-lg shadow-emerald-500/20 transition hover:-translate-y-0.5 disabled:opacity-50 sm:w-auto"
              >
                {donating ? "Sending…" : account ? "Donate ETH" : "Connect to donate"}
              </button>
            </div>
            {donateDisabledReason && <p className="mt-2 text-xs text-amber-200">{donateDisabledReason}</p>}
          </div>

          <div className="rounded-xl border border-white/10 bg-slate-900/70 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-100">Slippage tolerance</p>
                <p className="text-xs text-slate-400">Applied to both buys and sells; swap reverts if output is lower.</p>
              </div>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-200">
                {slippageBps !== null ? `${(Number(slippageBps) / 100).toFixed(2)}%` : "Invalid"}
              </span>
            </div>
            <div className="mt-3 flex flex-col gap-2">
              <label htmlFor="slippage-input" className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Slippage tolerance (%)
              </label>
              <input
                id="slippage-input"
                value={slippage}
                onChange={(e) => setSlippage(e.target.value)}
                placeholder="1.0"
                className="w-full flex-1 rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-400 focus:outline-none"
              />
              <div className="space-y-1 text-xs text-slate-300">
                <p>Min buy out: {buyMinOut ? `${formatToken(buyMinOut)} DEMO` : "—"}</p>
                <p>Min sell out: {sellMinOut ? `${formatToken(sellMinOut)} ETH` : "—"}</p>
              </div>
            </div>
            {slippageBps === null && (
              <p className="mt-2 text-xs text-amber-200">
                Enter a percentage between 0 and 100 with up to two decimals.
              </p>
            )}
            <div className="mt-3 rounded-lg border border-white/10 bg-white/5 p-3 text-xs text-slate-200">
              <p className="font-semibold text-slate-100">Why slippage?</p>
              <p className="mt-1 text-slate-300">
                Constant-product pricing moves with trade size. Slippage sets the minimum you’re willing to accept so your
                transaction reverts if the price shifts mid-block.
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-slate-900/70 p-4">
            <p className="text-sm font-semibold text-slate-100">Pool snapshot</p>
            <div className="mt-3 space-y-2 text-sm text-slate-200">
              <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                <span className="text-xs text-slate-400">ETH reserve</span>
                <span className="font-semibold">{formatToken(reserveEth)} ETH</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                <span className="text-xs text-slate-400">DEMO reserve</span>
                <span className="font-semibold">{formatToken(reserveDemo)} DEMO</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                <span className="text-xs text-slate-400">Price (ETH per DEMO)</span>
                <span className="font-semibold">{priceEthPerDemo}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                <span className="text-xs text-slate-400">Price (DEMO per ETH)</span>
                <span className="font-semibold">{priceDemoPerEth}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-white/10 bg-slate-900/70 p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-100">Buy DEMO with ETH</p>
              <span className="text-xs text-slate-400">
                You get {buyQuote ? `${formatToken(buyQuote)} DEMO` : "—"} {buyMinOut ? `(min ${formatToken(buyMinOut)} DEMO)` : ""}
              </span>
            </div>
            <div className="mt-3 space-y-2">
              <label htmlFor="buy-eth" className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Spend (ETH)
              </label>
              <input
                id="buy-eth"
                value={buyEthAmount}
                onChange={(e) => setBuyEthAmount(e.target.value)}
                placeholder="0.01"
                className="w-full rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-400 focus:outline-none"
              />
              <p className="text-xs text-slate-400">
                Enter ETH to spend. Constant-product curve (no fee); min received uses your slippage tolerance.
              </p>
              <button
                onClick={handleBuy}
                disabled={trading || !!buyDisabledReason}
                className="w-full rounded-lg bg-gradient-to-r from-emerald-400 to-emerald-500 px-3 py-2 text-sm font-semibold text-emerald-950 shadow-lg shadow-emerald-500/30 transition hover:-translate-y-0.5 disabled:opacity-50"
              >
                {trading ? "Submitting…" : account ? "Buy DEMO" : "Connect to trade"}
              </button>
              {buyDisabledReason && <p className="text-xs text-amber-200">{buyDisabledReason}</p>}
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-slate-900/70 p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-100">Sell DEMO for ETH</p>
              <span className="text-xs text-slate-400">
                You get {sellQuote ? `${formatToken(sellQuote)} ETH` : "—"} {sellMinOut ? `(min ${formatToken(sellMinOut)} ETH)` : ""}
              </span>
            </div>
            <div className="mt-3 space-y-2">
              <label htmlFor="sell-demo" className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Sell (DEMO)
              </label>
              <input
                id="sell-demo"
                value={sellDemoAmount}
                onChange={(e) => setSellDemoAmount(e.target.value)}
                placeholder="10"
                className="w-full rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-400 focus:outline-none"
              />
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Available: {formatToken(demoBalance)} DEMO</span>
                <span>Needs pool ETH: {poolFunded ? "Ready" : "Seeded when ETH arrives"}</span>
              </div>
              <button
                onClick={handleSell}
                disabled={trading || !!sellDisabledReason}
                className="w-full rounded-lg border border-emerald-400/50 bg-emerald-400/10 px-3 py-2 text-sm font-semibold text-emerald-100 shadow-lg shadow-emerald-500/20 transition hover:-translate-y-0.5 disabled:opacity-50"
              >
                {trading ? "Submitting…" : account ? "Sell DEMO" : "Connect to trade"}
              </button>
              {sellDisabledReason && <p className="text-xs text-amber-200">{sellDisabledReason}</p>}
            </div>
          </div>
        </div>
        <p className="text-xs text-slate-400">
          Pool ownership has no LP tokens. ETH donations to the contract grow the reserves; each claim mints 10 DEMO into the pool.
        </p>
      </div>
    </section>
  );
}
