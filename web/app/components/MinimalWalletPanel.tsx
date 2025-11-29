'use client';

import { formatToken, shorten } from '../../lib/format';
import { toast } from 'sonner';
import { useState } from 'react';

type MinimalWalletPanelProps = {
  account: string | undefined;
  ethBalance: bigint;
  demoBalance: bigint;
  chainName: string;
  onDisconnect: () => void;
  onSwitchWallet: () => void;
  setShowProviderModal: (show: boolean) => void;
};

export function MinimalWalletPanel({
  account,
  ethBalance,
  demoBalance,
  chainName,
  onDisconnect,
  onSwitchWallet,
  setShowProviderModal,
}: MinimalWalletPanelProps) {
  const [copied, setCopied] = useState(false);

  const copyAddress = async () => {
    if (!account) return;
    try {
      await navigator.clipboard.writeText(account);
      setCopied(true);
      toast.success('Address copied!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  };

  if (!account) {
    return (
      <section className="mx-auto max-w-2xl px-4 py-8">
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-8 text-center">
          <div className="mb-4">
            <span className="text-4xl">👛</span>
          </div>
          <h2 className="text-xl font-semibold text-slate-100 mb-2">No Wallet Connected</h2>
          <p className="text-slate-400 mb-6">
            Connect your wallet to view your balances and account information.
          </p>
          <button
            onClick={() => setShowProviderModal(true)}
            className="rounded-lg bg-emerald-500 px-6 py-3 font-medium text-white transition hover:bg-emerald-600"
          >
            Connect Wallet
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-2xl px-4 py-8">
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6 space-y-6">
        {/* Connection Status */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div>
            <h2 className="text-lg font-semibold text-slate-100 mb-1">Connected Wallet</h2>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
              <span className="text-sm text-slate-400">{chainName}</span>
            </div>
          </div>
        </div>

        {/* Address */}
        <div>
          <label className="block text-sm text-slate-400 mb-2">Address</label>
          <div className="flex items-center gap-2">
            <code className="flex-1 rounded-lg bg-slate-800/50 px-4 py-3 font-mono text-sm text-slate-200 border border-slate-700">
              {account}
            </code>
            <button
              onClick={copyAddress}
              className="rounded-lg border border-slate-700 bg-slate-800/50 px-4 py-3 text-sm text-slate-300 transition hover:bg-slate-700 hover:text-slate-100"
              title="Copy address"
            >
              {copied ? '✓' : '📋'}
            </button>
          </div>
        </div>

        {/* Balances */}
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-lg border border-purple-400/30 bg-purple-400/10 p-4">
            <div className="text-xs text-purple-400 mb-1">ETH Balance</div>
            <div className="text-2xl font-semibold text-purple-300">{formatToken(ethBalance)}</div>
          </div>
          <div className="rounded-lg border border-emerald-400/30 bg-emerald-400/10 p-4">
            <div className="text-xs text-emerald-400 mb-1">DEMO Balance</div>
            <div className="text-2xl font-semibold text-emerald-300">{formatToken(demoBalance)}</div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-4 border-t border-slate-800">
          <button
            onClick={onSwitchWallet}
            className="flex-1 rounded-lg border border-slate-700 bg-slate-800/50 px-4 py-3 text-sm font-medium text-slate-300 transition hover:bg-slate-700 hover:text-slate-100"
          >
            Switch Wallet
          </button>
          <button
            onClick={onDisconnect}
            className="flex-1 rounded-lg border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm font-medium text-red-300 transition hover:bg-red-400/20"
          >
            Disconnect
          </button>
        </div>
      </div>
    </section>
  );
}
