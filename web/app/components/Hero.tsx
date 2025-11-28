'use client';

import Link from "next/link";
import { shorten } from "../../lib/format";

type HeroStats = {
  claimCountText: string;
  freeClaimsText: string;
  invitesText: string;
  invitesHint: string;
  marketText: string;
  reserveText: string;
};

type HeroProps = {
  chainName: string;
  contractAddress: string;
  apiBase: string;
  onPrimary: () => void;
  stats: HeroStats;
};

export function Hero({
  chainName,
  contractAddress,
  apiBase,
  onPrimary,
  stats,
}: HeroProps) {
  return (
    <header className="relative mx-auto max-w-6xl px-6 pt-12 text-center">
      <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200">
        <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_14px_rgba(52,211,153,0.8)]" />
        DEMO on {chainName} · 64M+ users · Real mainnet airdrop
      </div>
      <h1 className="mt-6 text-4xl font-bold tracking-tight md:text-5xl bg-gradient-to-r from-emerald-400 via-cyan-400 to-purple-400 bg-clip-text text-transparent">
        64 Million Ethereum Users Eligible
      </h1>
      <p className="mt-4 text-lg text-slate-300 md:text-xl">
        Paid ≥0.004 ETH in gas fees (blocks 0-23M)? Claim your <span className="font-semibold text-emerald-400">100 DEMO tokens</span> now.
      </p>
      <p className="mt-2 text-base text-slate-400">
        Not eligible? Trade tokens with ETH. Already claimed? Invite friends and earn rewards.
      </p>
            <div className="mt-6 flex items-center justify-center">
        <button
          onClick={onPrimary}
          className="rounded-full border border-emerald-400/70 bg-gradient-to-r from-emerald-400 to-emerald-500 px-8 py-3 text-lg font-bold text-emerald-950 shadow-lg shadow-emerald-500/40 transition hover:scale-105 hover:-translate-y-1"
        >
          🎁 Get Started
        </button>
      </div>

      {/* Live Stats Ticker */}
      <div className="mt-12 grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="glass rounded-xl p-4">
          <p className="text-xs uppercase tracking-wider text-slate-400">Total Claims</p>
          <p className="mt-1 text-2xl font-bold text-white">{stats.claimCountText}</p>
        </div>
        <div className="glass rounded-xl p-4">
          <p className="text-xs uppercase tracking-wider text-slate-400">Free Claims Left</p>
          <p className="mt-1 text-2xl font-bold text-emerald-400">{stats.freeClaimsText.split(' ')[0]}</p>
        </div>
        <div className="glass rounded-xl p-4">
          <p className="text-xs uppercase tracking-wider text-slate-400">Current Price</p>
          <p className="mt-1 text-2xl font-bold text-cyan-400">{stats.marketText.split(' ')[0]}</p>
        </div>
        <div className="glass rounded-xl p-4">
          <p className="text-xs uppercase tracking-wider text-slate-400">Liquidity</p>
          <p className="mt-1 text-sm font-mono text-slate-300">{stats.reserveText.split('·')[0]}</p>
        </div>
      </div>
    </header>
  );
}
