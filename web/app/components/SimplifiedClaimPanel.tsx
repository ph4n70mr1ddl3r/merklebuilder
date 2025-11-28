'use client';

import clsx from 'clsx';
import { shorten } from '../../lib/format';
import type { ProofResponse } from '../../lib/types';

type SimplifiedClaimPanelProps = {
  account?: string;
  isEligible: boolean | null;
  hasChecked: boolean;
  hasClaimed: boolean;
  checking: boolean;
  claiming: boolean;
  proof: ProofResponse | null;
  invitedBy: string | null;
  inviteFromUrl: string | null;
  invitesRequired: boolean;
  poolFunded: boolean;
  onCheckEligibility: () => void;
  onClaim: () => void;
  onSwitchToInvite: () => void;
  onSwitchToTrade: () => void;
  setShowProviderModal: (show: boolean) => void;
};

export function SimplifiedClaimPanel({
  account,
  isEligible,
  hasChecked,
  hasClaimed,
  checking,
  claiming,
  proof,
  invitedBy,
  inviteFromUrl,
  invitesRequired,
  poolFunded,
  onCheckEligibility,
  onClaim,
  onSwitchToInvite,
  onSwitchToTrade,
  setShowProviderModal,
}: SimplifiedClaimPanelProps) {
  // Determine current step
  const getStep = () => {
    if (!account) return 1;
    if (!hasChecked) return 2;
    if (hasClaimed) return 4;
    if (isEligible && (!invitesRequired || invitedBy)) return 3;
    return 2;
  };

  const currentStep = getStep();

  const canCheckEligibility = account && !checking;
  const canClaim = account && isEligible && !hasClaimed && poolFunded && (!invitesRequired || invitedBy);

  return (
    <div className="mx-auto max-w-3xl px-4 pt-6">
      <div className="glass-card p-6 md:p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-slate-50 mb-3">Claim Your Free DEMO Tokens</h2>
          <p className="text-slate-300">
            If you paid ≥0.004 ETH in gas fees on Ethereum mainnet (blocks 0-23M), you qualify for 100 DEMO tokens
          </p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            {[
              { num: 1, label: 'Connect' },
              { num: 2, label: 'Check' },
              { num: 3, label: 'Claim' },
              { num: 4, label: 'Done' },
            ].map((step, idx) => (
              <div key={step.num} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <div
                    className={clsx(
                      'flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold transition-all',
                      currentStep >= step.num
                        ? 'bg-emerald-400 text-emerald-950 shadow-lg shadow-emerald-500/30'
                        : 'bg-slate-800 text-slate-400 border border-white/10'
                    )}
                  >
                    {currentStep > step.num ? '✓' : step.num}
                  </div>
                  <span className="mt-2 text-xs text-slate-400">{step.label}</span>
                </div>
                {idx < 3 && (
                  <div
                    className={clsx(
                      'h-0.5 flex-1 transition-all -mt-6',
                      currentStep > step.num ? 'bg-emerald-400' : 'bg-slate-700'
                    )}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step 1: Connect Wallet */}
        {!account && (
          <div className="rounded-xl border border-emerald-400/30 bg-emerald-400/5 p-6">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-400/20">
                <span className="text-2xl">👛</span>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-slate-50 mb-2">Step 1: Connect Your Wallet</h3>
                <p className="text-sm text-slate-300 mb-4">
                  Connect the wallet you used on Ethereum mainnet to check your eligibility
                </p>
                <button
                  onClick={() => setShowProviderModal(true)}
                  className="rounded-lg bg-gradient-to-r from-emerald-400 to-emerald-500 px-6 py-3 font-semibold text-emerald-950 shadow-lg shadow-emerald-500/30 transition hover:-translate-y-0.5"
                >
                  Connect Wallet
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Check Eligibility */}
        {account && !hasChecked && (
          <div className="rounded-xl border border-cyan-400/30 bg-cyan-400/5 p-6">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-cyan-400/20">
                <span className="text-2xl">🔍</span>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-slate-50 mb-2">Step 2: Check Your Eligibility</h3>
                <p className="text-sm text-slate-300 mb-2">
                  Connected: <span className="font-mono text-emerald-400">{shorten(account)}</span>
                </p>
                <p className="text-sm text-slate-300 mb-4">
                  We&apos;ll verify if this address paid ≥0.004 ETH in gas fees from blocks 0 to 23M
                </p>
                <button
                  onClick={onCheckEligibility}
                  disabled={!canCheckEligibility || checking}
                  className="rounded-lg bg-gradient-to-r from-cyan-400 to-cyan-500 px-6 py-3 font-semibold text-cyan-950 shadow-lg shadow-cyan-500/30 transition hover:-translate-y-0.5 disabled:opacity-50"
                >
                  {checking ? (
                    <span className="flex items-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-cyan-950 border-t-transparent" />
                      Checking eligibility...
                    </span>
                  ) : (
                    'Check Eligibility'
                  )}
                </button>
                <button
                  onClick={() => setShowProviderModal(true)}
                  className="ml-3 rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-slate-100 transition hover:-translate-y-0.5"
                >
                  Switch Wallet
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 2.5: Not Eligible */}
        {account && hasChecked && !isEligible && !hasClaimed && (
          <div className="rounded-xl border border-amber-400/30 bg-amber-400/5 p-6">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-amber-400/20">
                <span className="text-2xl">ℹ️</span>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-slate-50 mb-2">Not Eligible</h3>
                <p className="text-sm text-slate-300 mb-2">
                  <span className="font-mono text-amber-400">{shorten(account)}</span> didn&apos;t meet the gas fee requirement
                </p>
                <p className="text-sm text-slate-300 mb-4">
                  Don&apos;t worry! You can still participate:
                </p>
                <div className="space-y-2 mb-4">
                  <div className="flex items-start gap-2 text-sm text-slate-300">
                    <span className="text-purple-400">→</span>
                    <span>Buy DEMO tokens directly with ETH through our market maker</span>
                  </div>
                  <div className="flex items-start gap-2 text-sm text-slate-300">
                    <span className="text-cyan-400">→</span>
                    <span>Get invited by someone who already claimed (ask friends!)</span>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={onSwitchToTrade}
                    className="rounded-lg bg-gradient-to-r from-purple-400 to-purple-500 px-6 py-3 font-semibold text-purple-950 shadow-lg shadow-purple-500/30 transition hover:-translate-y-0.5"
                  >
                    Buy DEMO Tokens
                  </button>
                  <button
                    onClick={() => setShowProviderModal(true)}
                    className="rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-slate-100 transition hover:-translate-y-0.5"
                  >
                    Try Another Wallet
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Eligible - Need Invite */}
        {account && hasChecked && isEligible && invitesRequired && !invitedBy && !hasClaimed && (
          <div className="rounded-xl border border-amber-400/30 bg-amber-400/5 p-6">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-amber-400/20">
                <span className="text-2xl">🎫</span>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-slate-50 mb-2">You&apos;re Eligible! 🎉</h3>
                <p className="text-sm text-slate-300 mb-2">
                  Great news! <span className="font-mono text-emerald-400">{shorten(account)}</span> qualifies for the airdrop.
                </p>
                <p className="text-sm text-slate-300 mb-4">
                  <span className="font-semibold text-amber-400">However</span>, the free claim period has ended. You now need an invitation from someone who already claimed.
                </p>
                
                {inviteFromUrl && (
                  <div className="rounded-lg border border-cyan-400/30 bg-cyan-400/5 p-4 mb-4">
                    <p className="text-sm font-semibold text-cyan-300 mb-1">🔗 Invite link detected!</p>
                    <p className="text-sm text-slate-300">
                      You came from <span className="font-mono text-cyan-400">{shorten(inviteFromUrl)}</span>&apos;s invite link.
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      They need to create an invitation for your specific address before you can claim.
                    </p>
                  </div>
                )}
                
                <div className="rounded-lg border border-white/10 bg-white/5 p-4 mb-4">
                  <p className="text-sm font-semibold text-slate-200 mb-2">How to get invited:</p>
                  <ol className="space-y-1 text-sm text-slate-300 list-decimal list-inside">
                    <li>Ask a friend who has already claimed to create an invitation for you</li>
                    <li>They can create up to 5 invitations in the &quot;Invite & Trade&quot; section</li>
                    <li>Once invited, return here to claim your tokens</li>
                  </ol>
                </div>
                <button
                  onClick={onCheckEligibility}
                  disabled={checking}
                  className="rounded-lg border border-emerald-400/50 bg-emerald-400/10 px-6 py-3 font-semibold text-emerald-100 shadow-lg shadow-emerald-500/20 transition hover:-translate-y-0.5"
                >
                  Refresh Invitation Status
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Ready to Claim */}
        {account && hasChecked && isEligible && (!invitesRequired || invitedBy) && !hasClaimed && (
          <div className="rounded-xl border border-emerald-400/30 bg-emerald-400/5 p-6">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-400/20">
                <span className="text-2xl">🎁</span>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-slate-50 mb-2">Step 3: Claim Your Tokens! 🎉</h3>
                <p className="text-sm text-slate-300 mb-4">
                  Congratulations! You&apos;re ready to claim <span className="font-semibold text-emerald-400">100 DEMO tokens</span>
                </p>
                {invitedBy && (
                  <div className="rounded-lg border border-cyan-400/30 bg-cyan-400/5 p-3 mb-4">
                    <p className="text-sm text-slate-300">
                      Invited by: <span className="font-mono text-cyan-400">{shorten(invitedBy)}</span>
                      <br />
                      <span className="text-xs text-slate-400">They&apos;ll earn 1 DEMO when you claim</span>
                    </p>
                  </div>
                )}
                {!poolFunded && (
                  <div className="rounded-lg border border-amber-400/30 bg-amber-400/5 p-3 mb-4">
                    <p className="text-sm text-amber-200">
                      ⚠️ The market maker needs ETH to enable claims. Please wait or seed the pool in the Market Maker tab.
                    </p>
                  </div>
                )}
                <button
                  onClick={onClaim}
                  disabled={!canClaim || claiming}
                  className="rounded-lg bg-gradient-to-r from-emerald-400 to-emerald-500 px-8 py-4 text-lg font-semibold text-emerald-950 shadow-lg shadow-emerald-500/30 transition hover:-translate-y-0.5 disabled:opacity-50"
                >
                  {claiming ? (
                    <span className="flex items-center gap-2">
                      <span className="h-5 w-5 animate-spin rounded-full border-2 border-emerald-950 border-t-transparent" />
                      Claiming tokens...
                    </span>
                  ) : (
                    'Claim 100 DEMO Tokens'
                  )}
                </button>
                <p className="mt-3 text-xs text-slate-400">
                  Note: This also mints 10 DEMO to the market maker pool for liquidity
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Already Claimed */}
        {account && hasClaimed && (
          <div className="rounded-xl border border-emerald-400/30 bg-emerald-400/5 p-6">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-400/20">
                <span className="text-2xl">✅</span>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-slate-50 mb-2">Already Claimed!</h3>
                <p className="text-sm text-slate-300 mb-4">
                  You&apos;ve already claimed your 100 DEMO tokens with this wallet.
                </p>
                <div className="rounded-lg border border-white/10 bg-white/5 p-4 mb-4">
                  <p className="text-sm font-semibold text-slate-200 mb-2">What&apos;s next?</p>
                  <div className="space-y-2">
                    <div className="flex items-start gap-2 text-sm text-slate-300">
                      <span className="text-cyan-400">→</span>
                      <span>Create up to 5 invitations for friends to earn referral rewards</span>
                    </div>
                    <div className="flex items-start gap-2 text-sm text-slate-300">
                      <span className="text-orange-400">→</span>
                      <span>Trade your DEMO tokens on the market maker (buy more or sell)</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={onSwitchToInvite}
                    className="flex-1 rounded-lg bg-gradient-to-r from-cyan-400 to-cyan-500 px-6 py-3 font-semibold text-cyan-950 shadow-lg shadow-cyan-500/30 transition hover:-translate-y-0.5"
                  >
                    👥 Invite Friends
                  </button>
                  <button
                    onClick={onSwitchToTrade}
                    className="flex-1 rounded-lg bg-gradient-to-r from-orange-400 to-orange-500 px-6 py-3 font-semibold text-orange-950 shadow-lg shadow-orange-500/30 transition hover:-translate-y-0.5"
                  >
                    📈 Trade Tokens
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Info Box */}
        {account && (
          <div className="mt-6 rounded-lg border border-white/10 bg-white/5 p-4">
            <div className="flex items-start gap-3">
              <span className="text-lg">💡</span>
              <div className="text-sm text-slate-300">
                <p className="font-semibold text-slate-200 mb-1">About the eligibility:</p>
                <p>
                  This airdrop rewards active Ethereum users who contributed to network security through gas fees. 
                  If you paid at least 0.004 ETH in total gas fees between blocks 0 and 23M on mainnet, you qualify.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
