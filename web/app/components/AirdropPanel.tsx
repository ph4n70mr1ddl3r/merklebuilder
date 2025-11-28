'use client';

import clsx from "clsx";
import { InfoRow, Stat } from "./Primitives";
import { shorten } from "../../lib/format";
import { ProofResponse } from "../../lib/airdrop";

type Tone = "info" | "good" | "bad";

type ProofRow = { label: string; value: string };

type AirdropPanelProps = {
  account?: string;
  connectors: readonly any[];
  checkingProof: boolean;
  claimCount: number | null;
  freeClaims: number;
  freeClaimsRemaining: number | null;
  invitesRequired: boolean;
  poolFunded: boolean;
  invitesOpen: boolean;
  invitedBy: string | null;
  hasClaimed: boolean;
  proof: ProofResponse | null;
  proofRows: ProofRow[];
  status: { tone: Tone; message: string };
  nextStep: string;
  claimDisabledReason: string | null;
  recipient: string;
  setRecipient: (value: string) => void;
  refreshProof: () => void;
  disconnectWallet: () => void;
  claim: () => void;
  claiming: boolean;
  inviting: boolean;
  networkLabel: string;
  copyToClipboard: (value: string, key: string) => void;
  copiedKey: string | null;
  setShowProviderModal: (value: boolean) => void;
  refreshOnChain: (addr?: string) => void;
};

export function AirdropPanel({
  account,
  connectors,
  checkingProof,
  claimCount,
  freeClaims,
  freeClaimsRemaining,
  invitesRequired,
  poolFunded,
  invitesOpen,
  invitedBy,
  hasClaimed,
  proof,
  proofRows,
  status,
  nextStep,
  claimDisabledReason,
  recipient,
  setRecipient,
  refreshProof,
  disconnectWallet,
  claim,
  claiming,
  inviting,
  networkLabel,
  copyToClipboard,
  copiedKey,
  setShowProviderModal,
  refreshOnChain,
}: AirdropPanelProps) {
  const statusToneClasses = {
    info: "border-slate-600/60 bg-slate-800/40 text-slate-200",
    good: "border-emerald-500/50 bg-emerald-500/10 text-emerald-100",
    bad: "border-red-500/50 bg-red-500/10 text-red-100",
  } as const;

  return (
    <section
      id="airdrop"
      role="tabpanel"
      aria-labelledby="tab-airdrop"
      className="mx-auto max-w-6xl px-3 pt-6 md:px-4"
      tabIndex={0}
    >
      <div className="glass w-full space-y-5 p-5 md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm uppercase tracking-wide text-slate-400">Merkle airdrop</p>
            <h3 className="text-xl font-semibold text-slate-50">Verify, claim, and route your DEMO</h3>
            <p className="text-sm text-slate-300">
              Proof-backed claims unlock invites. Pick a recipient before minting your 100 DEMO.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs text-slate-300">
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
              Free claims left: {freeClaimsRemaining !== null ? freeClaimsRemaining : "—"}
            </span>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">Invite phase after: {freeClaims}</span>
          </div>
        </div>
        <div className="rounded-lg border border-white/10 bg-white/5 p-3 text-xs text-slate-200">
          <p className="font-semibold text-slate-100">What’s a Merkle proof?</p>
          <p className="mt-1 text-slate-300">
            Your address is a leaf in the Merkle tree. The proof lists sibling hashes so the contract can recompute the root and
            verify eligibility without storing the full list.
          </p>
        </div>

        {!account ? (
          <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-lg font-semibold text-slate-50">Connect to start your claim</p>
                <p className="text-sm text-slate-300">We’ll fetch your proof, show eligibility, and guide you to the next step.</p>
              </div>
              <button
                onClick={() => setShowProviderModal(true)}
                disabled={connectors.length === 0}
                className="rounded-xl bg-gradient-to-r from-emerald-400 to-emerald-500 px-4 py-2 font-semibold text-emerald-950 shadow-lg shadow-emerald-500/30 transition hover:-translate-y-0.5 disabled:opacity-60"
              >
                Connect wallet
              </button>
            </div>
            <div className={clsx("mt-4 flex items-start gap-3 rounded-xl border px-4 py-3 text-sm", statusToneClasses[status.tone])}>
              <span
                className={clsx(
                  "mt-1 h-2.5 w-2.5 rounded-full",
                  status.tone === "good" && "bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.8)]",
                  status.tone === "bad" && "bg-red-400 shadow-[0_0_12px_rgba(248,113,113,0.8)]",
                  status.tone === "info" && "bg-amber-300 shadow-[0_0_12px_rgba(252,211,77,0.7)]"
                )}
              />
              <span className="leading-relaxed break-words">{status.message}</span>
            </div>
            <div className="mt-4 grid gap-2 text-xs text-slate-300 sm:grid-cols-3">
              <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">1) Connect</div>
              <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">2) Fetch proof</div>
              <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">3) Claim + route tokens</div>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2 rounded-2xl border border-white/10 bg-slate-900/70 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm uppercase tracking-wide text-slate-400">Eligibility & claim</p>
                  <h4 className="text-lg font-semibold text-slate-50">Proof-driven mint</h4>
                  <p className="text-xs text-slate-400">
                    {invitesRequired
                      ? "Invites required after free-claim window. Check proof and inviter first."
                      : "Free-claim window open. Proof + claim mints instantly."}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={refreshProof}
                    disabled={!account || checkingProof}
                    className="rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-sm font-semibold text-slate-100 transition hover:-translate-y-0.5 disabled:opacity-50"
                  >
                    {checkingProof ? "Checking…" : "Refresh proof"}
                  </button>
                  <button
                    onClick={disconnectWallet}
                    className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-slate-100 transition hover:-translate-y-0.5"
                  >
                    Disconnect
                  </button>
                </div>
              </div>

              <div className={clsx("mt-4 flex items-start gap-3 rounded-xl border px-4 py-3 text-sm", statusToneClasses[status.tone])}>
                <span
                  className={clsx(
                    "mt-1 h-2.5 w-2.5 rounded-full",
                    status.tone === "good" && "bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.8)]",
                    status.tone === "bad" && "bg-red-400 shadow-[0_0_12px_rgba(248,113,113,0.8)]",
                    status.tone === "info" && "bg-amber-300 shadow-[0_0_12px_rgba(252,211,77,0.7)]"
                  )}
                />
                <span className="leading-relaxed break-words">{status.message}</span>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2 rounded-xl border border-white/10 bg-slate-900/60 px-4 py-2 text-xs text-slate-200">
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-300">→</span>
                <span className="font-medium">Next step:</span>
                <span className="text-slate-100 break-words">{nextStep}</span>
                {(checkingProof || claiming || inviting) && (
                  <span className="ml-2 h-3 w-3 animate-spin rounded-full border border-emerald-400 border-t-transparent" />
                )}
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <Stat label="Claimed" value={hasClaimed ? "Yes" : "No"} />
                <Stat label="Invitation" value={invitesRequired ? (invitedBy ? `Invited by ${shorten(invitedBy)}` : "Required") : "Not required"} />
                <Stat label="Total claims" value={claimCount !== null ? claimCount.toString() : "—"} />
              </div>

              <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-200">Claim output</p>
                    <p className="text-xs text-slate-400">Check your proof and inviter state before minting.</p>
                  </div>
                  <button
                    onClick={claim}
                    disabled={!account || !!claimDisabledReason || claiming}
                    className="rounded-xl bg-gradient-to-r from-emerald-400 to-emerald-500 px-4 py-2 text-sm font-semibold text-emerald-950 shadow-lg shadow-emerald-500/30 transition hover:-translate-y-0.5 disabled:opacity-50"
                  >
                    {claiming ? "Sending…" : "Send claim"}
                  </button>
                </div>
                <div className="mt-3 text-sm text-slate-300">
                  {account && hasClaimed && "You already claimed with this wallet."}
                  {account && !hasClaimed && proof && !invitesRequired && "You can claim with this wallet."}
                  {account && !hasClaimed && proof && invitesRequired && invitedBy && "You are invited and can claim."}
                  {account && !hasClaimed && invitesRequired && !invitedBy && "You are qualified, but you need an invitation to claim right now."}
                  {account && !proof && !checkingProof && !hasClaimed && "Refresh to check your eligibility."}
                </div>
                <div className="mt-3 flex w-full flex-wrap items-center gap-2 text-sm text-slate-300">
                  <label htmlFor="recipient-address" className="text-xs uppercase tracking-wide text-slate-400">
                    Send tokens to
                  </label>
                  <input
                    id="recipient-address"
                    value={recipient}
                    onChange={(e) => setRecipient(e.target.value)}
                    placeholder={account ?? "0x..."}
                    className="w-full rounded-lg border border-white/10 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-400 focus:outline-none"
                  />
                  <p className="text-xs text-slate-500">Default is your connected wallet. You can redirect the 100 DEMO to another address.</p>
                </div>
                {claimDisabledReason && <p className="mt-2 text-xs text-amber-200">{claimDisabledReason}</p>}
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-slate-200">Wallet + network</p>
                    <p className="text-xs text-slate-400">Stay on chain to transact.</p>
                  </div>
                  <button
                    onClick={() => copyToClipboard(account!, "account")}
                    className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[11px] font-semibold text-emerald-100 hover:-translate-y-0.5"
                  >
                    ⧉
                    {copiedKey === "account" && <span className="text-emerald-300">Copied</span>}
                  </button>
                </div>
                <p className="mt-2 break-all font-mono text-sm text-slate-100">{account}</p>
                <p className="text-xs text-slate-400">{networkLabel}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    onClick={() => setShowProviderModal(true)}
                    className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-100 hover:-translate-y-0.5"
                  >
                    Switch wallet
                  </button>
                  <button
                    onClick={() => refreshOnChain(account)}
                    className="rounded-lg border border-emerald-400/50 bg-emerald-400/10 px-3 py-2 text-xs font-semibold text-emerald-100 hover:-translate-y-0.5"
                  >
                    Refresh on-chain
                  </button>
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
                <p className="text-sm font-semibold text-slate-200">Proof details</p>
                {proofRows.length === 0 ? (
                  <p className="mt-2 text-xs text-slate-400">No proof loaded yet. Use “Refresh proof” to pull from the API.</p>
                ) : (
                  <dl className="mt-3 space-y-2 text-xs text-slate-200">
                    {proofRows.map((row) => (
                      <div key={row.label} className="flex items-center justify-between gap-2 rounded-lg border border-white/5 bg-white/5 px-3 py-2">
                        <dt className="text-slate-400">{row.label}</dt>
                        <dd className="break-all font-mono text-[11px] text-slate-100">{row.value}</dd>
                      </div>
                    ))}
                  </dl>
                )}
              </div>

              <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4 text-sm text-slate-200">
                <p className="text-sm font-semibold text-slate-200">Claim checkpoints</p>
                <ul className="mt-2 space-y-2 text-xs text-slate-300">
                  <li className="flex items-start gap-2">
                    <span className="mt-0.5 h-2 w-2 rounded-full bg-emerald-400" />
                    <span>{poolFunded ? "ETH liquidity present; claims are unlocked." : "Seed the pool with ETH before claiming."}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-0.5 h-2 w-2 rounded-full bg-cyan-400" />
                    <span>
                      {invitesRequired
                        ? invitedBy
                          ? `Invited by ${shorten(invitedBy)}`
                          : "Invitation required to proceed."
                        : "You are free to claim during the open window."}
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-0.5 h-2 w-2 rounded-full bg-white/80" />
                    <span>Each claim mints 10 DEMO into the AMM for future swaps.</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
