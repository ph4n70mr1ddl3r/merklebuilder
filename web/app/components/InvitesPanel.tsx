'use client';

import { useState } from 'react';
import clsx from "clsx";
import { InfoRow } from "./Primitives";
import { ConfirmDialog } from "./ConfirmDialog";

type InviteSlot = { invitee: string | null; used: boolean };

type InvitesPanelProps = {
  account?: string;
  hasClaimed: boolean;
  invitesOpen: boolean;
  invitedBy: string | null;
  maxInvites: number;
  invitesCreated: number;
  normalizedSlots: InviteSlot[];
  invitee: string;
  setInvitee: (value: string) => void;
  createInvite: () => void;
  refreshOnChain: (addr?: string) => void;
  setShowProviderModal: (value: boolean) => void;
  copyToClipboard: (value: string, key: string) => void;
  copiedKey: string | null;
  revokingSlot: number | null;
  revokeInvite: (slotIndex: number) => void;
  inviting: boolean;
  hasEmptySlot: boolean;
};

export function InvitesPanel({
  account,
  hasClaimed,
  invitesOpen,
  invitedBy,
  maxInvites,
  invitesCreated,
  normalizedSlots,
  invitee,
  setInvitee,
  createInvite,
  refreshOnChain,
  setShowProviderModal,
  copyToClipboard,
  copiedKey,
  revokingSlot,
  revokeInvite,
  inviting,
  hasEmptySlot,
}: InvitesPanelProps) {
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

  return (
    <section
      id="invites"
      role="tabpanel"
      aria-labelledby="tab-invites"
      className="mx-auto max-w-4xl px-3 pt-6 pb-14 md:px-4"
      tabIndex={0}
    >
      

        {!account || !hasClaimed ? (
          <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
            <p className="font-semibold text-slate-200">Invites unlock after claiming</p>
            <p className="mt-2 text-xs text-slate-400">Claim first to view and manage your {maxInvites} invite slots.</p>
          </div>
        ) : !invitesOpen ? (
          <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
            <p className="font-semibold text-slate-200">Invitation phase locked</p>
            <p className="mt-2 text-xs text-slate-400">Invites are not available yet. Check back once the invitation phase begins.</p>
          </div>
        ) : (
          <div className="space-y-4">

            {/* Invitation Slots */}
            <div className="rounded-xl border border-white/10 bg-white/5 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div>
                  <p className="text-sm font-semibold text-slate-200">Invitation slots</p>
                  <p className="text-xs text-slate-400">
                    You have {maxInvites} fixed slots. Create uses the next open slot; revoke frees an unused one.
                  </p>
                </div>
                <button
                  onClick={() => refreshOnChain(account)}
                  className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-100 hover:-translate-y-0.5"
                >
                  Refresh slots
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <InfoRow label="Invites created" value={`${invitesCreated} / ${maxInvites}`} />
                <InfoRow
                  label="Available slots"
                  value={`${maxInvites - normalizedSlots.filter((s) => s.invitee && s.used).length - normalizedSlots.filter((s) => s.invitee && !s.used).length} open`}
                />
              </div>

              <div className="mt-3 grid gap-2 md:grid-cols-2">
                {normalizedSlots.map((slot, idx) => {
                  const isPending = slot.invitee && !slot.used;
                  const isUsed = slot.invitee && slot.used;
                  return (
                    <div key={`slot-${idx}`} className="rounded-lg border border-white/10 bg-slate-900/60 px-3 py-3 text-sm">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex flex-col">
                          <p className="text-xs uppercase tracking-wide text-slate-500">Slot {idx + 1}</p>
                          <p className="font-semibold text-slate-100">{isUsed ? "Claimed by" : isPending ? "Reserved for" : "Unused"}</p>
                        </div>
                        <span
                          className={clsx(
                            "rounded-full border px-3 py-1 text-xs",
                            isUsed && "border-white/10 bg-white/5 text-slate-300",
                            isPending && "border-amber-300/50 bg-amber-300/10 text-amber-100",
                            !slot.invitee && "border-emerald-400/40 bg-emerald-400/10 text-emerald-100"
                          )}
                        >
                          {isUsed ? "Used" : isPending ? "Reserved" : "Open"}
                        </span>
                      </div>

                      {slot.invitee && (
                        <div className="mt-2 flex flex-wrap items-center gap-2 font-mono text-[13px] text-slate-100 break-all">
                          <span className="break-all">{slot.invitee}</span>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => copyToClipboard(slot.invitee!, `slot-${idx}`)}
                              className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[11px] font-semibold text-emerald-100 hover:-translate-y-0.5"
                            >
                              ⧉
                              {copiedKey === `slot-${idx}` && <span className="text-emerald-300">Copied</span>}
                            </button>
                            {isPending && (
                              <button
                                onClick={() => handleRevokeClick(idx, slot.invitee!)}
                                disabled={revokingSlot === idx}
                                className="inline-flex items-center gap-1 rounded-md border border-amber-300/50 bg-amber-300/10 px-2 py-1 text-[11px] font-semibold text-amber-100 hover:-translate-y-0.5 disabled:opacity-50 focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 focus:ring-offset-slate-900"
                                aria-label={`Revoke invitation for ${slot.invitee?.slice(0, 10)}...`}
                              >
                                {revokingSlot === idx ? "Revoking…" : "Revoke"}
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                      {isPending && <p className="text-xs text-slate-400 mt-1">Waiting for invitee to claim.</p>}
                      {isUsed && <p className="text-xs text-slate-400 mt-1">Invite consumed.</p>}
                    </div>
                  );
                })}
              </div>

              <div className="mt-4 space-y-3">
                <div>
                  <label htmlFor="invitee-address" className="block text-xs font-semibold text-slate-200 mb-2">
                    Invitee address
                  </label>
                  <input
                    id="invitee-address"
                    value={invitee}
                    onChange={(e) => setInvitee(e.target.value)}
                    placeholder="0x..."
                    className="w-full rounded-lg border border-white/10 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-400 focus:outline-none"
                  />
                </div>
                <button
                  onClick={createInvite}
                  disabled={!account || !hasClaimed || inviting || !hasEmptySlot || !invitesOpen}
                  className="w-full rounded-lg bg-gradient-to-r from-emerald-400 to-emerald-500 px-4 py-3 text-sm font-semibold text-emerald-950 shadow-lg shadow-emerald-500/30 transition hover:-translate-y-0.5 disabled:opacity-50"
                >
                  {inviting ? "Creating…" : "Create invite"}
                </button>
                <p className="text-xs text-slate-400">
                  Invite tree pays down five levels. You must create invitations on-chain before invitees can claim.
                </p>
              </div>
            </div>
          </div>
        )}
      

      {/* Confirmation Dialog */}
      {confirmRevoke && (
        <ConfirmDialog
          open={confirmRevoke.show}
          title="Revoke Invitation?"
          description={
            <div>
              <p>You are about to revoke the invitation for:</p>
              <p className="font-mono text-amber-300 mt-2">{confirmRevoke.address.slice(0, 10)}...{confirmRevoke.address.slice(-8)}</p>
              <p className="mt-2 text-slate-400 text-xs">
                This will free slot #{confirmRevoke.slotIndex + 1} so you can invite someone else. 
                This action cannot be undone if they haven&apos;t claimed yet.
              </p>
            </div>
          }
          confirmText="Yes, Revoke"
          cancelText="Cancel"
          onConfirm={handleConfirmRevoke}
          onCancel={() => setConfirmRevoke(null)}
          variant="warning"
        />
      )}
    </section>
  );
}
