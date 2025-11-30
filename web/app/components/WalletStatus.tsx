'use client';

import { useState } from 'react';
import { toast } from 'sonner';
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
  const [copied, setCopied] = useState(false);

  const copyAddress = async () => {
    try {
      await navigator.clipboard.writeText(account);
      setCopied(true);
      toast.success('Address copied!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  };

  return (
    <div className="fixed top-2 sm:top-4 right-2 sm:right-4 z-50 max-w-[calc(100vw-1rem)]">
      {/* Desktop View */}
      <div className="hidden md:block rounded-xl border border-white/10 bg-slate-900/95 backdrop-blur-sm shadow-xl p-3">
        <div className="flex items-center gap-3">
          {/* Connection Status */}
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
            <span className="text-xs text-slate-400">{chainName}</span>
          </div>

          {/* Address with copy */}
          <button
            onClick={copyAddress}
            className="group flex items-center gap-1 rounded-lg bg-white/5 px-2 py-1 hover:bg-white/10 transition focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 focus:ring-offset-slate-900"
            title="Click to copy address"
            aria-label="Copy wallet address to clipboard"
          >
            <span className="font-mono text-sm text-slate-200">{shorten(account)}</span>
            <span className="text-slate-400 group-hover:text-slate-200 transition" aria-hidden="true">
              {copied ? '✓' : '⧉'}
            </span>
          </button>
          {copied && <span className="sr-only" role="status">Address copied to clipboard</span>}

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
              className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs font-medium text-slate-300 transition hover:bg-white/10 focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-slate-900"
              title="Switch wallet"
              aria-label="Switch to a different wallet"
            >
              <span aria-hidden="true">↔</span>
            </button>
            <button
              onClick={onDisconnect}
              className="rounded-lg border border-red-400/30 bg-red-400/10 px-2 py-1 text-xs font-medium text-red-300 transition hover:bg-red-400/20 focus:ring-2 focus:ring-red-400 focus:ring-offset-2 focus:ring-offset-slate-900"
              title="Disconnect"
              aria-label="Disconnect wallet"
            >
              <span aria-hidden="true">✕</span>
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
            className="flex items-center gap-2 rounded-full border border-white/10 bg-slate-900/95 backdrop-blur-sm shadow-xl px-3 py-2 min-h-[44px] focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 focus:ring-offset-slate-900 active:bg-slate-800"
            aria-label="Expand wallet status"
            aria-expanded="false"
          >
            <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" aria-hidden="true" />
            <span className="font-mono text-xs text-slate-200">{shorten(account)}</span>
            <span className="text-xs text-slate-400" aria-hidden="true">▼</span>
          </button>
        )}

        {/* Expanded: Full details */}
        {expanded && (
          <div className="rounded-xl border border-white/10 bg-slate-900/95 backdrop-blur-sm shadow-xl p-4 min-w-[220px] max-w-[280px]">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                <span className="text-xs text-slate-400">{chainName}</span>
              </div>
              <button
                onClick={() => setExpanded(false)}
                className="text-slate-400 hover:text-slate-200 focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 focus:ring-offset-slate-900 rounded p-2 min-h-[40px] min-w-[40px] flex items-center justify-center active:bg-white/10"
                aria-label="Collapse wallet status"
                aria-expanded="true"
              >
                <span aria-hidden="true">▲</span>
              </button>
            </div>

            {/* Address */}
            <div className="flex items-center gap-2 rounded-lg bg-white/5 px-2 py-1 mb-3">
              <span className="font-mono text-sm text-slate-200 flex-1">{shorten(account)}</span>
              <button
                onClick={copyAddress}
                className="text-slate-400 hover:text-slate-200 transition text-xs focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 focus:ring-offset-slate-900 rounded p-1"
                title="Copy address"
                aria-label="Copy wallet address to clipboard"
              >
                <span aria-hidden="true">📋</span>
              </button>
              {copied && <span className="sr-only" role="status">Address copied to clipboard</span>}
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
                className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-xs font-medium text-slate-300 transition hover:bg-white/10 focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-slate-900 min-h-[44px] active:bg-white/15"
                aria-label="Switch to a different wallet"
              >
                Switch
              </button>
              <button
                onClick={onDisconnect}
                className="flex-1 rounded-lg border border-red-400/30 bg-red-400/10 px-3 py-2.5 text-xs font-medium text-red-300 transition hover:bg-red-400/20 focus:ring-2 focus:ring-red-400 focus:ring-offset-2 focus:ring-offset-slate-900 min-h-[44px] active:bg-red-400/25"
                aria-label="Disconnect wallet"
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
