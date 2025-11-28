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
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-slate-50 mb-2">What would you like to do?</h2>
        <p className="text-sm text-slate-300">
          64M+ Ethereum users who paid ≥0.004 ETH in gas fees (blocks 0-23M) can claim 100 DEMO
        </p>
      </div>

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
          <h3 className="text-lg font-bold text-slate-50 mb-2 group-hover:text-emerald-400 transition-colors">Claim Free Tokens</h3>
          <p className="text-sm text-slate-300 mb-3">
            Check if you&apos;re eligible and claim your 100 DEMO tokens for free
          </p>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
              Free claim
            </span>
            <span className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-400"></span>
              100 DEMO
            </span>
          </div>
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
          <h3 className="text-lg font-bold text-slate-50 mb-2 group-hover:text-cyan-400 transition-colors">Invite Friends</h3>
          <p className="text-sm text-slate-300 mb-3">
            Share invite slots and earn referral rewards up to 5 levels deep
          </p>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-400"></span>
              5 slots max
            </span>
            <span className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-300"></span>
              1 DEMO/level
            </span>
          </div>
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
          <h3 className="text-lg font-bold text-slate-50 mb-2 group-hover:text-purple-400 transition-colors">Trade Tokens</h3>
          <p className="text-sm text-slate-300 mb-3">
            Buy and sell DEMO tokens instantly using the automated market maker
          </p>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-purple-400"></span>
              Instant swap
            </span>
            <span className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-pink-400"></span>
              Low fees
            </span>
          </div>
        </button>
      </div>
    </div>
  );
}
