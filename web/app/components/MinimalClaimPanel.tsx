'use client';

import { shorten } from '../../lib/format';
import type { ProofResponse } from '../../lib/types';
import { MinimalButton } from './MinimalButton';

type MinimalClaimPanelProps = {
  account?: string;
  isEligible: boolean | null;
  hasChecked: boolean;
  hasClaimed: boolean;
  checking: boolean;
  claiming: boolean;
  claimError?: string | null;
  proof: ProofResponse | null;
  invitedBy: string | null;
  invitesRequired: boolean;
  poolFunded: boolean;
  onCheckEligibility: () => void;
  onClaim: () => void;
  onRetryClaim?: () => void;
  setShowProviderModal: (show: boolean) => void;
};

export function MinimalClaimPanel({
  account,
  isEligible,
  hasChecked,
  hasClaimed,
  checking,
  claiming,
  claimError,
  invitedBy,
  invitesRequired,
  poolFunded,
  onCheckEligibility,
  onClaim,
  onRetryClaim,
  setShowProviderModal,
}: MinimalClaimPanelProps) {
  // Not connected
  if (!account) {
    return (
      <section className="mx-auto max-w-2xl px-4 py-12">
        <div className="minimal-card p-8 text-center">
          <h2 className="text-xl font-semibold mb-4">Connect Wallet</h2>
          <p className="text-slate-400 mb-6">Connect your wallet to check eligibility</p>
          <MinimalButton onClick={() => setShowProviderModal(true)}>
            Connect Wallet
          </MinimalButton>
        </div>
      </section>
    );
  }

  // Already claimed
  if (hasClaimed) {
    return (
      <section className="mx-auto max-w-2xl px-4 py-12">
        <div className="minimal-card p-8 text-center">
          <div className="text-emerald-400 text-4xl mb-4">✓</div>
          <h2 className="text-xl font-semibold mb-2">Claimed</h2>
          <p className="text-slate-400">You&apos;ve already claimed your 100 DEMO tokens</p>
          <p className="text-sm text-slate-500 mt-4 font-mono">{shorten(account)}</p>
        </div>
      </section>
    );
  }

  // Pool not funded
  if (!poolFunded) {
    return (
      <section className="mx-auto max-w-2xl px-4 py-12">
        <div className="minimal-card p-8 text-center">
          <h2 className="text-xl font-semibold mb-4">Pool Not Ready</h2>
          <p className="text-slate-400">The AMM pool needs ETH liquidity before claims can begin</p>
        </div>
      </section>
    );
  }

  // Haven't checked yet
  if (!hasChecked) {
    return (
      <section className="mx-auto max-w-2xl px-4 py-12">
        <div className="minimal-card p-8">
          <h2 className="text-xl font-semibold mb-4">Check Eligibility</h2>
          <p className="text-slate-400 mb-2">Connected: <span className="font-mono text-slate-300">{shorten(account)}</span></p>
          <p className="text-sm text-slate-500 mb-6">Check if you paid ≥0.004 ETH gas in blocks 0-23M</p>
          <MinimalButton onClick={onCheckEligibility} disabled={checking} className="w-full">
            {checking ? 'Checking...' : 'Check Eligibility'}
          </MinimalButton>
        </div>
      </section>
    );
  }

  // Not eligible
  if (!isEligible) {
    return (
      <section className="mx-auto max-w-2xl px-4 py-12">
        <div className="minimal-card p-8 text-center">
          <h2 className="text-xl font-semibold mb-4">Not Eligible</h2>
          <p className="text-slate-400 mb-2">{shorten(account)} is not in the Merkle tree</p>
          <p className="text-sm text-slate-500">This address didn&apos;t meet the gas fee threshold</p>
        </div>
      </section>
    );
  }

  // Eligible but needs invite
  if (invitesRequired && !invitedBy) {
    return (
      <section className="mx-auto max-w-2xl px-4 py-12">
        <div className="minimal-card p-8">
          <h2 className="text-xl font-semibold mb-4">Invitation Required</h2>
          <p className="text-slate-400 mb-4">{shorten(account)} is eligible for 100 DEMO</p>
          <p className="text-sm text-slate-500 mb-4">However, the open claim period has ended. You need an invitation.</p>
          <div className="border-t border-slate-800 pt-4 mt-4">
            <p className="text-sm font-medium text-slate-300 mb-2">How to get invited:</p>
            <ol className="text-sm text-slate-400 space-y-1 list-decimal list-inside">
              <li>Ask a friend who has claimed to invite you</li>
              <li>They must enter your address and create the invitation on-chain</li>
              <li>Once invited, return here to claim</li>
            </ol>
          </div>
          <MinimalButton onClick={onCheckEligibility} variant="secondary" className="w-full mt-4">
            Refresh Status
          </MinimalButton>
        </div>
      </section>
    );
  }

  // Ready to claim
  return (
    <section className="mx-auto max-w-2xl px-4 py-12">
      <div className="minimal-card p-8">
        <h2 className="text-xl font-semibold mb-4">Claim Airdrop</h2>
        
        <div className="space-y-3 mb-6">
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Address</span>
            <span className="font-mono text-slate-300">{shorten(account)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Amount</span>
            <span className="text-emerald-400 font-medium">100 DEMO</span>
          </div>
          {invitedBy && (
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Invited by</span>
              <span className="font-mono text-slate-300">{shorten(invitedBy)}</span>
            </div>
          )}
        </div>

        {claimError && (
          <div className="mb-4 p-3 border border-red-900 bg-red-950/50 rounded text-sm text-red-400">
            {claimError}
          </div>
        )}

        <div className="space-y-2">
          <MinimalButton 
            onClick={claimError ? onRetryClaim : onClaim} 
            disabled={claiming}
            className="w-full"
          >
            {claiming ? 'Claiming...' : claimError ? 'Retry' : 'Claim'}
          </MinimalButton>
          
          {claimError && (
            <MinimalButton 
              onClick={onCheckEligibility} 
              variant="secondary"
              className="w-full"
            >
              Refresh Status
            </MinimalButton>
          )}
        </div>
      </div>
    </section>
  );
}
