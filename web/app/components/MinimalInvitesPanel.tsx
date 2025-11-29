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
}: MinimalInvitesPanelProps) {
  if (!account || !hasClaimed) {
    return (
      <section className="mx-auto max-w-2xl px-4 py-12">
        <div className="minimal-card p-8 text-center">
          <h2 className="text-xl font-semibold mb-4">Invites Locked</h2>
          <p className="text-slate-400">Claim first to view and manage your {maxInvites} invite slots</p>
        </div>
      </section>
    );
  }

  if (!invitesOpen) {
    return (
      <section className="mx-auto max-w-2xl px-4 py-12">
        <div className="minimal-card p-8 text-center">
          <h2 className="text-xl font-semibold mb-4">Invites Not Available</h2>
          <p className="text-slate-400">The invitation phase hasn&apos;t started yet</p>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-2xl px-4 py-12">
      <div className="minimal-card p-8">
        <h2 className="text-xl font-semibold mb-6">Manage Invites</h2>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 mb-6 pb-6 border-b border-slate-800">
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
        <div className="space-y-2 mb-6">
          {normalizedSlots.map((slot, idx) => {
            const isPending = slot.invitee && !slot.used;
            const isUsed = slot.invitee && slot.used;
            
            return (
              <div key={idx} className="flex items-center justify-between p-3 border border-slate-800 rounded text-sm">
                <div className="flex items-center gap-3">
                  <span className="text-slate-500 w-12">#{idx + 1}</span>
                  {slot.invitee ? (
                    <span className="font-mono text-slate-300">{slot.invitee.slice(0, 10)}...{slot.invitee.slice(-8)}</span>
                  ) : (
                    <span className="text-slate-600">Empty</span>
                  )}
                </div>
                <span className="text-xs text-slate-500">
                  {isUsed ? 'Claimed' : isPending ? 'Pending' : 'Open'}
                </span>
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
            className="w-full bg-slate-950 border border-slate-800 rounded px-4 py-3 text-slate-100 font-mono text-sm focus:border-emerald-500 focus:outline-none"
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
    </section>
  );
}
