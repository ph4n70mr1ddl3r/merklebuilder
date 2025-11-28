'use client';

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
  return (
    <div className="fixed top-4 right-4 z-50">
      <div className="rounded-xl border border-white/10 bg-slate-900/95 backdrop-blur-sm shadow-xl p-3">
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
    </div>
  );
}
