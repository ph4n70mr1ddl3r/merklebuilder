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
  onSecondary: () => void;
  stats: HeroStats;
};

export function Hero({
  chainName,
  contractAddress,
  apiBase,
  onPrimary,
  onSecondary,
  stats,
}: HeroProps) {
  return (
    <header className="relative mx-auto max-w-6xl px-6 pt-12 text-center">
      <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200">
        <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_14px_rgba(52,211,153,0.8)]" />
        DEMO on {chainName} · Merkle drop + referrals + AMM
      </div>
      <h1 className="mt-6 text-4xl font-semibold tracking-tight md:text-5xl">
        Claim the drop, invite friends, and trade inside one hub
      </h1>
      <p className="mt-4 text-base text-slate-300 md:text-lg">
        Three tracks, one flow: prove eligibility, branch invites, and swap against the contract-owned pool.
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3 text-sm text-slate-200">
        <button
          onClick={onPrimary}
          className="rounded-full border border-emerald-400/70 bg-emerald-400/10 px-5 py-2 font-semibold text-emerald-100 shadow-lg shadow-emerald-500/20 transition hover:-translate-y-0.5"
        >
          Start claim flow
        </button>
        <button
          onClick={onSecondary}
          className="rounded-full border border-white/15 bg-white/5 px-4 py-2 font-semibold text-slate-100 transition hover:-translate-y-0.5"
        >
          Skip to trading
        </button>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-center gap-3 text-sm text-slate-300">
        <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2">
          Contract:{" "}
          <Link
            href={`https://sepolia.etherscan.io/address/${contractAddress}`}
            target="_blank"
            className="text-emerald-300 hover:underline"
          >
            {shorten(contractAddress)}
          </Link>
        </div>
        <div className="w-full rounded-full border border-white/10 bg-white/5 px-4 py-2 sm:w-auto">
          Proof API: <span className="break-all font-mono text-emerald-300">{apiBase}</span>
        </div>
      </div>

      <div className="mt-6 grid gap-3 text-left text-sm text-slate-200 md:grid-cols-3">
        <div className="rounded-xl border border-emerald-300/40 bg-emerald-400/10 p-4 shadow-lg shadow-emerald-500/15">
          <p className="text-xs uppercase tracking-wide text-emerald-200">Merkle Airdrop</p>
          <p className="mt-1 text-lg font-semibold text-emerald-50">{stats.claimCountText}</p>
          <p className="text-xs text-emerald-100">{stats.freeClaimsText}</p>
        </div>
        <div className="rounded-xl border border-cyan-300/40 bg-cyan-400/10 p-4 shadow-lg shadow-cyan-500/15">
          <p className="text-xs uppercase tracking-wide text-cyan-200">Referral invites</p>
          <p className="mt-1 text-lg font-semibold text-cyan-50">{stats.invitesText}</p>
          <p className="text-xs text-cyan-100">{stats.invitesHint}</p>
        </div>
        <div className="rounded-xl border border-white/15 bg-white/10 p-4 shadow-lg shadow-emerald-500/10">
          <p className="text-xs uppercase tracking-wide text-slate-200">Market maker</p>
          <p className="mt-1 text-lg font-semibold text-slate-50">{stats.marketText}</p>
          <p className="text-xs text-slate-200">{stats.reserveText}</p>
        </div>
      </div>
    </header>
  );
}
