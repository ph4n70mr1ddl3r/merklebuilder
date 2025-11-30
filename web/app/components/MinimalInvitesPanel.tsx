'use client';

import { useState } from 'react';
import { MinimalButton } from './MinimalButton';

type InviteSlot = { invitee: string | null; used: boolean };

type MinimalInvitesPanelProps = {
  account?: string;
  hasClaimed: boolean;
  invitesOpen: boolean;
  maxInvites: number;
  invitesCreated: number;
  normalizedSlots: InviteSlot[];
  invitee: string;
  setInvitee: (value: string) => void;
  createInvite: () => void;
  inviting: boolean;
  hasEmptySlot: boolean;
  setShowProviderModal: (show: boolean) => void;
  revokeInvite: (slotIndex: number) => void;
  revokingSlot: number | null;
};

export function MinimalInvitesPanel({
  account,
  hasClaimed,
  invitesOpen,
  maxInvites,
  invitesCreated,
  normalizedSlots,
  invitee,
  setInvitee,
  createInvite,
  inviting,
  hasEmptySlot,
  setShowProviderModal,
  revokeInvite,
  revokingSlot,
}: MinimalInvitesPanelProps) {
  const [confirmRevoke, setConfirmRevoke] = useState<{ show: boolean; slotIndex: number; address: string } | null>(null);

  const handleRevokeClick = (slotIndex: number, address: string) => {
    setConfirmRevoke({ show: true, slotIndex, address });
  };

  const handleConfirmRevoke = () => {
    if (confirmRevoke) {
      revokeInvite(confirmRevoke.slotIndex);
      setConfirmRevoke(null);
    }
  };

  if (!account || !hasClaimed) {
    return (
      <section className="mx-auto max-w-2xl px-4 py-8">
        <div className="minimal-card p-6 text-center">
          <h2 className="text-xl font-semibold mb-4">Invites Locked</h2>
          <p className="text-slate-400">Claim first to view and manage your {maxInvites} invite slots</p>
        </div>
      </section>
    );
  }

  if (!invitesOpen) {
    return (
      <section className="mx-auto max-w-2xl px-4 py-8">
        <div className="minimal-card p-6 text-center">
          <h2 className="text-xl font-semibold mb-4">Invites Not Available</h2>
          <p className="text-slate-400">The invitation phase hasn&apos;t started yet</p>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-2xl px-4 py-8 relative">
      <div className="minimal-card p-6">
        <h2 className="text-xl font-semibold mb-4">Manage Invites</h2>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 mb-4 pb-4 border-b border-slate-800">
          <div>
            <div className="text-sm text-slate-500 mb-1">Created</div>
            <div className="text-slate-100">{invitesCreated} / {maxInvites}</div>
          </div>
          <div>
            <div className="text-sm text-slate-500 mb-1">Available</div>
            <div className="text-emerald-400">
              {maxInvites - normalizedSlots.filter((s) => s.invitee && s.used).length - normalizedSlots.filter((s) => s.invitee && !s.used).length}
            </div>
          </div>
        </div>

        {/* Slots List */}
        <div className="space-y-2 mb-4">
          {normalizedSlots.map((slot, idx) => {
            const isPending = slot.invitee && !slot.used;
            const isUsed = slot.invitee && slot.used;
            
            return (
              <div key={idx} className="flex items-center justify-between p-3 border border-slate-800 rounded text-sm">
                <div className="flex items-center gap-3 overflow-hidden">
                  <span className="text-slate-500 w-12 shrink-0">#{idx + 1}</span>
                  {slot.invitee ? (
                    <>
                      <span className="font-mono text-slate-300 hidden sm:inline">{slot.invitee.slice(0, 10)}...{slot.invitee.slice(-8)}</span>
                      <span className="font-mono text-slate-300 sm:hidden">{slot.invitee.slice(0, 6)}...{slot.invitee.slice(-4)}</span>
                    </>
                  ) : (
                    <span className="text-slate-600">Empty</span>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-2">
                  <span className="text-xs text-slate-500">
                    {isUsed ? 'Claimed' : isPending ? 'Pending' : 'Open'}
                  </span>
                  {isPending && slot.invitee && (
                    <button
                      onClick={() => handleRevokeClick(idx, slot.invitee!)}
                      disabled={revokingSlot === idx}
                      className="text-xs text-amber-400 hover:text-amber-300 disabled:opacity-50 underline decoration-amber-400/30 hover:decoration-amber-300"
                    >
                      {revokingSlot === idx ? 'Revoking...' : 'Revoke'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Create Invite */}
        <div className="space-y-3">
          <label className="block text-sm text-slate-400">Invitee Address</label>
          <input
            value={invitee}
            onChange={(e) => setInvitee(e.target.value)}
            placeholder="0x..."
            className="w-full bg-slate-950 border border-slate-800 rounded px-4 py-2 text-slate-100 font-mono text-sm focus:border-emerald-500 focus:outline-none"
          />
          <MinimalButton
            onClick={createInvite}
            disabled={!account || !hasClaimed || inviting || !hasEmptySlot || !invitesOpen}
            className="w-full"
          >
            {inviting ? 'Creating...' : 'Create Invitation'}
          </MinimalButton>
          <p className="text-xs text-slate-500">
            Create invitation on-chain before invitee can claim. Pays down 5 referral levels.
          </p>
        </div>
      </div>

      {/* Confirmation Dialog */}
      {confirmRevoke && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm rounded-xl">
          <div className="bg-slate-900 border border-slate-700 p-6 rounded-xl max-w-sm w-full mx-4 shadow-2xl">
            <h3 className="text-lg font-semibold text-slate-100 mb-2">Revoke Invitation?</h3>
            <p className="text-sm text-slate-400 mb-4">
              Are you sure you want to revoke the invitation for <span className="font-mono text-slate-300">{confirmRevoke.address.slice(0, 6)}...{confirmRevoke.address.slice(-4)}</span>?
              This will free up the slot.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmRevoke(null)}
                className="flex-1 px-4 py-2 rounded bg-slate-800 text-slate-300 text-sm font-medium hover:bg-slate-700 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmRevoke}
                className="flex-1 px-4 py-2 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 text-sm font-medium hover:bg-amber-500/20 transition"
              >
                Revoke
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
