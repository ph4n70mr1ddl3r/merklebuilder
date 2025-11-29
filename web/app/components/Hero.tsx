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
            <div className="mt-6 flex items-center justify-center">
        <button
          onClick={onPrimary}
          className="rounded-full border border-emerald-400/70 bg-gradient-to-r from-emerald-400 to-emerald-500 px-8 py-3 text-lg font-bold text-emerald-950 shadow-lg shadow-emerald-500/40 transition hover:scale-105 hover:-translate-y-1 focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 focus:ring-offset-slate-900 min-h-[44px]"
          aria-label="Home"
        >
          Home
        </button>
      </div>

    </header>
  );
}
