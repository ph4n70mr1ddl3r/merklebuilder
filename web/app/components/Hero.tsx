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

      <div className="mt-6 flex flex-wrap items-center justify-center gap-3 text-sm text-slate-300">
        <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2">
          Contract:{" "}
          <Link
            href={`https://sepolia.etherscan.io/address/${contractAddress}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-emerald-300 hover:underline"
          >
            {shorten(contractAddress)}
          </Link>
        </div>
        <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2">
          Proof API: <span className="font-mono text-xs text-emerald-300">{new URL(apiBase).hostname}</span>
        </div>
      </div>

      <div className="mt-8 grid gap-4 text-left text-sm text-slate-200 md:grid-cols-4">
        <div className="rounded-xl border border-emerald-300/40 bg-emerald-400/10 p-5 shadow-lg shadow-emerald-500/20">
          <p className="text-xs uppercase tracking-wide text-emerald-300">Eligible Users</p>
          <p className="mt-2 text-3xl font-bold text-emerald-50">64M+</p>
          <p className="mt-1 text-xs text-emerald-200">Mainnet addresses</p>
        </div>
        <div className="rounded-xl border border-cyan-300/40 bg-cyan-400/10 p-5 shadow-lg shadow-cyan-500/20">
          <p className="text-xs uppercase tracking-wide text-cyan-300">Claim Amount</p>
          <p className="mt-2 text-3xl font-bold text-cyan-50">100</p>
          <p className="mt-1 text-xs text-cyan-200">DEMO tokens</p>
        </div>
        <div className="rounded-xl border border-purple-300/40 bg-purple-400/10 p-5 shadow-lg shadow-purple-500/20">
          <p className="text-xs uppercase tracking-wide text-purple-300">Gas Requirement</p>
          <p className="mt-2 text-3xl font-bold text-purple-50">≥0.004</p>
          <p className="mt-1 text-xs text-purple-200">ETH paid</p>
        </div>
        <div className="rounded-xl border border-white/15 bg-white/10 p-5 shadow-lg shadow-slate-500/10">
          <p className="text-xs uppercase tracking-wide text-slate-300">Block Range</p>
          <p className="mt-2 text-3xl font-bold text-slate-50">0 - 23M</p>
          <p className="mt-1 text-xs text-slate-300">Ethereum mainnet</p>
        </div>
      </div>
    </header>
  );
}
