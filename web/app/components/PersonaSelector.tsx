'use client';

import { useState } from 'react';

export type UserIntent = 'claim' | 'buy' | 'manage';

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
          className={`relative group rounded-2xl border p-6 text-left transition-all ${
            currentIntent === 'claim'
              ? 'border-emerald-400 bg-emerald-400/10 shadow-lg shadow-emerald-500/20'
              : 'border-white/10 bg-white/5 hover:border-emerald-400/50 hover:bg-white/10'
          } ${hasClaimed && hasChecked ? 'opacity-50 cursor-not-allowed' : 'hover:-translate-y-1'}`}
        >
          <div className="flex items-start justify-between mb-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-400/20">
              <span className="text-2xl">🎁</span>
            </div>
            {hasClaimed && hasChecked && (
              <span className="rounded-full bg-emerald-400/20 px-2 py-1 text-xs text-emerald-300">✓ Claimed</span>
            )}
            {!hasClaimed && isEligible && hasChecked && (
              <span className="rounded-full bg-amber-400/20 px-2 py-1 text-xs text-amber-300">Eligible</span>
            )}
          </div>
          <h3 className="text-lg font-semibold text-slate-50 mb-2">Claim Free Tokens</h3>
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
              Earn referral rewards
            </span>
          </div>
        </button>

        {/* Buy Tokens */}
        <button
          onClick={() => onSelectIntent('buy')}
          className={`relative group rounded-2xl border p-6 text-left transition-all ${
            currentIntent === 'buy'
              ? 'border-purple-400 bg-purple-400/10 shadow-lg shadow-purple-500/20'
              : 'border-white/10 bg-white/5 hover:border-purple-400/50 hover:bg-white/10'
          } hover:-translate-y-1`}
        >
          <div className="flex items-start justify-between mb-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-400/20">
              <span className="text-2xl">💰</span>
            </div>
          </div>
          <h3 className="text-lg font-semibold text-slate-50 mb-2">Buy DEMO Tokens</h3>
          <p className="text-sm text-slate-300 mb-3">
            Not eligible? No problem. Buy DEMO directly with ETH through our AMM
          </p>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-purple-400"></span>
              Instant swap
            </span>
            <span className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-purple-300"></span>
              No KYC needed
            </span>
          </div>
        </button>

        {/* Manage & Trade */}
        <button
          onClick={() => onSelectIntent('manage')}
          disabled={!hasClaimed}
          className={`relative group rounded-2xl border p-6 text-left transition-all ${
            currentIntent === 'manage'
              ? 'border-cyan-400 bg-cyan-400/10 shadow-lg shadow-cyan-500/20'
              : 'border-white/10 bg-white/5 hover:border-cyan-400/50 hover:bg-white/10'
          } ${!hasClaimed ? 'opacity-50 cursor-not-allowed' : 'hover:-translate-y-1'}`}
        >
          <div className="flex items-start justify-between mb-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-cyan-400/20">
              <span className="text-2xl">🎯</span>
            </div>
            {!hasClaimed && (
              <span className="rounded-full bg-slate-400/20 px-2 py-1 text-xs text-slate-400">Claim first</span>
            )}
          </div>
          <h3 className="text-lg font-semibold text-slate-50 mb-2">Invite & Trade</h3>
          <p className="text-sm text-slate-300 mb-3">
            Create invites for friends and sell your DEMO tokens on the market
          </p>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-400"></span>
              5 invite slots
            </span>
            <span className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-300"></span>
              Sell anytime
            </span>
          </div>
        </button>
      </div>

      {/* Quick Stats Bar */}
      <div className="mt-6 rounded-xl border border-white/10 bg-white/5 p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center text-sm">
          <div>
            <p className="text-slate-400 text-xs mb-1">Eligible Users</p>
            <p className="text-slate-50 font-semibold">64M+</p>
          </div>
          <div>
            <p className="text-slate-400 text-xs mb-1">Claim Amount</p>
            <p className="text-emerald-400 font-semibold">100 DEMO</p>
          </div>
          <div>
            <p className="text-slate-400 text-xs mb-1">Gas Requirement</p>
            <p className="text-slate-50 font-semibold">≥0.004 ETH</p>
          </div>
          <div>
            <p className="text-slate-400 text-xs mb-1">Block Range</p>
            <p className="text-slate-50 font-semibold">0 - 23M</p>
          </div>
        </div>
      </div>
    </div>
  );
}
