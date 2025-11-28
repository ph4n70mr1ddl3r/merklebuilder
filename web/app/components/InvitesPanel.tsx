'use client';

import clsx from "clsx";
import { InfoRow } from "./Primitives";

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
  return (
    <section
      id="invites"
      role="tabpanel"
      aria-labelledby="tab-invites"
      className="mx-auto max-w-6xl px-3 pt-6 pb-14 md:px-4"
      tabIndex={0}
    >
      <div className="glass w-full space-y-5 p-5 md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm uppercase tracking-wide text-slate-400">Referrals & invites</p>
            <h3 className="text-xl font-semibold text-slate-50">Share access once you’ve claimed</h3>
            <p className="text-sm text-slate-300">Create up to {maxInvites} fixed slots. Slots lock once claimed; revoke unused ones anytime.</p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs text-slate-300">
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
              Invites created: {invitesCreated} / {maxInvites}
            </span>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">Phase: {invitesOpen ? "Open" : "Locked"}</span>
          </div>
        </div>
        <div className="rounded-lg border border-white/10 bg-white/5 p-3 text-xs text-slate-200">
          <p className="font-semibold text-slate-100">How slots work</p>
          <p className="mt-1 text-slate-300">
            You have a fixed set of slots. Creating an invite reserves the next open one; once the invitee claims, that slot is permanently marked used. Revoke only unused slots.
          </p>
        </div>

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
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <p className="text-sm font-semibold text-slate-200">Your status</p>
              <div className="mt-3 grid gap-2 text-sm">
                <InfoRow
                  label="Invited by"
                  value={invitedBy ?? "No inviter"}
                  copyValue={invitedBy ?? undefined}
                  monospace
                  onCopy={invitedBy ? () => copyToClipboard(invitedBy, "invitedBy") : undefined}
                  copied={copiedKey === "invitedBy"}
                />
                <InfoRow label="Invites created" value={`${invitesCreated} / ${maxInvites}`} />
                <InfoRow
                  label="Available slots"
                  value={`${maxInvites - normalizedSlots.filter((s) => s.invitee && s.used).length - normalizedSlots.filter((s) => s.invitee && !s.used).length} open`}
                />
              </div>
              <p className="mt-3 text-xs text-slate-400">Invite tree pays down five levels; make sure you share with trusted wallets.</p>
            </div>

            <div className="lg:col-span-2 rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-200">Invitation slots</p>
                  <p className="text-xs text-slate-400">
                    You have {maxInvites} fixed slots. Create uses the next open slot; revoke frees an unused one.
                  </p>
                  <p className="mt-1 text-xs text-slate-300">
                    Summary: {normalizedSlots.filter((s) => s.invitee && s.used).length} used · {normalizedSlots.filter((s) => s.invitee && !s.used).length} reserved ·{" "}
                    {maxInvites - normalizedSlots.filter((s) => s.invitee && s.used).length - normalizedSlots.filter((s) => s.invitee && !s.used).length} open
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => refreshOnChain(account)}
                    className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-100 hover:-translate-y-0.5"
                  >
                    Refresh slots
                  </button>
                  <button
                    onClick={() => setShowProviderModal(true)}
                    className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-100 hover:-translate-y-0.5"
                  >
                    Switch wallet
                  </button>
                </div>
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
                                onClick={() => revokeInvite(idx)}
                                disabled={revokingSlot === idx}
                                className="inline-flex items-center gap-1 rounded-md border border-amber-300/50 bg-amber-300/10 px-2 py-1 text-[11px] font-semibold text-amber-100 hover:-translate-y-0.5 disabled:opacity-50"
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

              <div className="mt-4 space-y-2">
                <p className="text-xs text-slate-400">Enter an address to assign to the next open slot.</p>
                <div className="flex flex-col gap-2">
                  <label htmlFor="invitee-address" className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Invitee address
                  </label>
                  <input
                    id="invitee-address"
                    value={invitee}
                    onChange={(e) => setInvitee(e.target.value)}
                    placeholder="0x… invitee"
                    className="w-full flex-1 rounded-lg border border-white/10 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-400 focus:outline-none"
                  />
                  <button
                    onClick={createInvite}
                    disabled={!account || !hasClaimed || inviting || !hasEmptySlot || !invitesOpen}
                    className="w-full rounded-lg bg-gradient-to-r from-emerald-400 to-emerald-500 px-3 py-2 text-sm font-semibold text-emerald-950 shadow-lg shadow-emerald-500/30 transition hover:-translate-y-0.5 sm:w-auto disabled:opacity-50"
                  >
                    {inviting ? "Creating…" : "Create invite"}
                  </button>
                </div>
                <p className="text-xs text-slate-400">
                  Requires that you have already claimed. Revoke before a claim to free a slot; claimed invites stay locked.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
