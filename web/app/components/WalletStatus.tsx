'use client';

import { useState } from 'react';
import { formatToken, shorten } from '../../lib/format';

type WalletStatusProps = {
  account: string;
  ethBalance: bigint;
  demoBalance: bigint;
  chainName: string;
  onDisconnect: () => void;
  onSwitchWallet: () => void;
};

export function WalletStatus({
  account,
  ethBalance,
  demoBalance,
  chainName,
  onDisconnect,
  onSwitchWallet,
}: WalletStatusProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="fixed top-4 right-4 z-50">
      {/* Desktop View */}
      <div className="hidden md:block rounded-xl border border-white/10 bg-slate-900/95 backdrop-blur-sm shadow-xl p-3">
        <div className="flex items-center gap-3">
          {/* Connection Status */}
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
            <span className="text-xs text-slate-400">{chainName}</span>
          </div>

          {/* Address */}
          <div className="rounded-lg bg-white/5 px-2 py-1">
            <span className="font-mono text-sm text-slate-200">{shorten(account)}</span>
          </div>

          {/* Balances */}
          <div className="flex items-center gap-2 text-sm">
            <div className="flex items-center gap-1 rounded-lg bg-purple-400/10 border border-purple-400/30 px-2 py-1">
              <span className="text-purple-300">{formatToken(ethBalance)}</span>
              <span className="text-purple-400 text-xs">ETH</span>
            </div>
            <div className="flex items-center gap-1 rounded-lg bg-emerald-400/10 border border-emerald-400/30 px-2 py-1">
              <span className="text-emerald-300">{formatToken(demoBalance)}</span>
              <span className="text-emerald-400 text-xs">DEMO</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1">
            <button
              onClick={onSwitchWallet}
              className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs font-medium text-slate-300 transition hover:bg-white/10"
              title="Switch wallet"
            >
              ↔
            </button>
            <button
              onClick={onDisconnect}
              className="rounded-lg border border-red-400/30 bg-red-400/10 px-2 py-1 text-xs font-medium text-red-300 transition hover:bg-red-400/20"
              title="Disconnect"
            >
              ✕
            </button>
          </div>
        </div>
      </div>

      {/* Mobile View */}
      <div className="md:hidden">
        {/* Collapsed: Just show a small pill */}
        {!expanded && (
          <button
            onClick={() => setExpanded(true)}
            className="flex items-center gap-2 rounded-full border border-white/10 bg-slate-900/95 backdrop-blur-sm shadow-xl px-3 py-2"
          >
            <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
            <span className="font-mono text-xs text-slate-200">{shorten(account)}</span>
            <span className="text-xs text-slate-400">▼</span>
          </button>
        )}

        {/* Expanded: Full details */}
        {expanded && (
          <div className="rounded-xl border border-white/10 bg-slate-900/95 backdrop-blur-sm shadow-xl p-4 min-w-[200px]">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                <span className="text-xs text-slate-400">{chainName}</span>
              </div>
              <button
                onClick={() => setExpanded(false)}
                className="text-slate-400 hover:text-slate-200"
              >
                ▲
              </button>
            </div>

            {/* Address */}
            <div className="rounded-lg bg-white/5 px-2 py-1 mb-3">
              <span className="font-mono text-sm text-slate-200">{shorten(account)}</span>
            </div>

            {/* Balances */}
            <div className="space-y-2 mb-3">
              <div className="flex items-center justify-between rounded-lg bg-purple-400/10 border border-purple-400/30 px-3 py-2">
                <span className="text-xs text-purple-400">ETH</span>
                <span className="text-sm font-semibold text-purple-300">{formatToken(ethBalance)}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-emerald-400/10 border border-emerald-400/30 px-3 py-2">
                <span className="text-xs text-emerald-400">DEMO</span>
                <span className="text-sm font-semibold text-emerald-300">{formatToken(demoBalance)}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={onSwitchWallet}
                className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-slate-300 transition hover:bg-white/10"
              >
                Switch Wallet
              </button>
              <button
                onClick={onDisconnect}
                className="flex-1 rounded-lg border border-red-400/30 bg-red-400/10 px-3 py-2 text-xs font-medium text-red-300 transition hover:bg-red-400/20"
              >
                Disconnect
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
