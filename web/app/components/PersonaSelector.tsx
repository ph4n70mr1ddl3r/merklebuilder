'use client';

import { useState } from 'react';

export type UserIntent = 'claim' | 'invite' | 'trade';

type PersonaSelectorProps = {
  onSelectIntent: (intent: UserIntent) => void;
  currentIntent: UserIntent;
  hasClaimed: boolean;
  isEligible: boolean | null;
  hasChecked: boolean;
};

export function PersonaSelector({
  onSelectIntent,
  currentIntent,
  hasClaimed,
  isEligible,
  hasChecked,
}: PersonaSelectorProps) {
  return (
    <div className="mx-auto max-w-4xl px-4 pt-8">

      <div className="grid gap-4 md:grid-cols-3">
        {/* Claim Free Tokens */}
        <button
          onClick={() => onSelectIntent('claim')}
          disabled={hasClaimed && hasChecked}
          className={`glass-card relative group p-6 text-left transition-all duration-300 ${
            currentIntent === 'claim'
              ? 'border-emerald-400 bg-emerald-400/10 shadow-[0_0_30px_rgba(52,211,153,0.2)]'
              : 'hover:border-emerald-400/50 hover:bg-white/10'
          } ${hasClaimed && hasChecked ? 'opacity-50 cursor-not-allowed' : 'hover:-translate-y-2'}`}
        >
          <div className="flex items-start justify-between mb-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-400/20 group-hover:scale-110 transition-transform">
              <span className="text-2xl">🎁</span>
            </div>
            {hasClaimed && hasChecked && (
              <span className="rounded-full bg-emerald-400/20 px-2 py-1 text-xs text-emerald-300">✓ Claimed</span>
            )}
            {!hasClaimed && isEligible && hasChecked && (
              <span className="rounded-full bg-amber-400/20 px-2 py-1 text-xs text-amber-300">Eligible</span>
            )}
          </div>
          <h3 className="text-lg font-bold text-slate-50 mb-2 group-hover:text-emerald-400 transition-colors">Claim</h3>
          <p className="text-sm text-slate-300 mb-3">
            Check if you&apos;re eligible and claim your 100 DEMO tokens for free
          </p>
        </button>

        {/* Invite Friends */}
        <button
          onClick={() => onSelectIntent('invite')}
          disabled={!hasClaimed}
          className={`glass-card relative group p-6 text-left transition-all duration-300 ${
            currentIntent === 'invite'
              ? 'border-cyan-400 bg-cyan-400/10 shadow-[0_0_30px_rgba(34,211,238,0.2)]'
              : 'hover:border-cyan-400/50 hover:bg-white/10'
          } ${!hasClaimed ? 'opacity-50 cursor-not-allowed' : 'hover:-translate-y-2'}`}
        >
          <div className="flex items-start justify-between mb-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-cyan-400/20 group-hover:scale-110 transition-transform">
              <span className="text-2xl">👥</span>
            </div>
            {!hasClaimed && (
              <span className="rounded-full bg-slate-400/20 px-2 py-1 text-xs text-slate-400">Claim first</span>
            )}
          </div>
          <h3 className="text-lg font-bold text-slate-50 mb-2 group-hover:text-cyan-400 transition-colors">Invite</h3>
          <p className="text-sm text-slate-300 mb-3">
            Earn referral rewards up to 5 levels deep
          </p>
        </button>

        {/* Trade Tokens */}
        <button
          onClick={() => onSelectIntent('trade')}
          className={`glass-card relative group p-6 text-left transition-all duration-300 ${
            currentIntent === 'trade'
              ? 'border-purple-400 bg-purple-400/10 shadow-[0_0_30px_rgba(192,132,252,0.2)]'
              : 'hover:border-purple-400/50 hover:bg-white/10'
          } hover:-translate-y-2`}
        >
          <div className="flex items-start justify-between mb-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-400/20 group-hover:scale-110 transition-transform">
              <span className="text-2xl">💱</span>
            </div>
          </div>
          <h3 className="text-lg font-bold text-slate-50 mb-2 group-hover:text-purple-400 transition-colors">Trade</h3>
          <p className="text-sm text-slate-300 mb-3">
            Trade DEMO vs ETH using our decentralized exchange
          </p>
        </button>
      </div>
    </div>
  );
}
