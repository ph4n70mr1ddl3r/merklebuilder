'use client';

import clsx from "clsx";
import { formatToken } from "../../lib/format";

export type TabKey = "airdrop" | "invites" | "market";

type TabNavProps = {
  activeTab: TabKey;
  onChange: (tab: TabKey) => void;
  claimCount: number | null;
  freeClaims: number;
  freeClaimsRemaining: number | null;
  invitesCreated: number;
  maxInvites: number;
  poolFunded: boolean;
  poolHasDemo: boolean;
  priceEthPerDemo: string;
  reserveEth: bigint;
  reserveDemo: bigint;
  hasClaimed: boolean;
};

export function TabNav({
  activeTab,
  onChange,
  claimCount,
  freeClaims,
  freeClaimsRemaining,
  invitesCreated,
  maxInvites,
  poolFunded,
  poolHasDemo,
  priceEthPerDemo,
  reserveEth,
  reserveDemo,
  hasClaimed,
}: TabNavProps) {
  return (
    <section id="tab-root" className="mx-auto max-w-6xl px-3 pt-4 md:px-4">
      <div className="glass w-full p-4 md:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm uppercase tracking-wide text-slate-400">Navigation</p>
            <h3 className="text-lg font-semibold text-slate-50">Choose a track</h3>
          </div>
          <div className="flex flex-wrap gap-2 text-xs text-slate-300">
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
              Claims: {claimCount !== null ? claimCount : "—"} / {freeClaims}
            </span>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
              Invites: {invitesCreated} / {maxInvites}
            </span>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
              Pool: {poolFunded && poolHasDemo ? `${priceEthPerDemo} ETH/DEMO` : "Unseeded"}
            </span>
          </div>
        </div>
        <div className="mt-4 grid gap-2 md:grid-cols-3" role="tablist" aria-label="Experience navigation">
          {[
            {
              key: "airdrop",
              title: "Airdrop",
              subtitle: "Proof + claim",
              badge: freeClaimsRemaining !== null ? `${freeClaimsRemaining} free left` : "Check status",
            },
            { key: "invites", title: "Invites", subtitle: "Referral slots", badge: `${invitesCreated}/${maxInvites} used` },
            { key: "market", title: "Market maker", subtitle: "Donate + swap", badge: poolFunded ? "Live" : "Needs ETH" },
          ].map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                id={`tab-${tab.key}`}
                role="tab"
                aria-selected={isActive}
                aria-controls={tab.key === "market" ? "market-maker" : tab.key}
                tabIndex={isActive ? 0 : -1}
                type="button"
                onClick={() => onChange(tab.key as TabKey)}
                className={clsx(
                  "flex w-full flex-col items-start gap-1 rounded-xl border px-4 py-3 text-left transition",
                  isActive
                    ? "border-emerald-400/60 bg-emerald-400/10 shadow-[0_0_18px_rgba(52,211,153,0.2)]"
                    : "border-white/10 bg-white/5 hover:-translate-y-0.5"
                )}
              >
                <div className="flex w-full items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-100">{tab.title}</p>
                    <p className="text-xs text-slate-400">{tab.subtitle}</p>
                  </div>
                  <span
                    className={clsx(
                      "rounded-full border px-2 py-1 text-[11px]",
                      isActive
                        ? "border-emerald-300 bg-emerald-300/20 text-emerald-100"
                        : "border-white/15 bg-white/10 text-slate-200"
                    )}
                  >
                    {tab.badge}
                  </span>
                </div>
                {isActive && <span className="text-[11px] text-emerald-200">Active</span>}
              </button>
            );
          })}
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {[
            {
              key: "airdrop",
              title: "Step 1 · Claim",
              desc: "Prove eligibility and mint 100 DEMO to your chosen recipient.",
              status: hasClaimed ? "done" : activeTab === "airdrop" ? "active" : "todo",
            },
            {
              key: "invites",
              title: "Step 2 · Invite",
              desc: "Unlock and reserve up to five referral slots after claiming.",
              status: !hasClaimed ? "locked" : invitesCreated > 0 || activeTab === "invites" ? "active" : "todo",
            },
            {
              key: "market",
              title: "Step 3 · Trade",
              desc: "Set slippage, donate ETH, and swap against the contract-owned pool.",
              status: activeTab === "market" ? "active" : poolFunded && poolHasDemo ? "todo" : "locked",
            },
          ].map((step) => (
            <div
              key={step.key}
              className={clsx(
                "rounded-xl border px-4 py-3 text-sm transition",
                step.status === "active" && "border-emerald-400/60 bg-emerald-400/10 shadow-[0_0_18px_rgba(52,211,153,0.2)]",
                step.status === "done" && "border-emerald-300/50 bg-emerald-300/10",
                step.status === "locked" && "border-white/10 bg-white/5 opacity-60",
                step.status === "todo" && "border-white/10 bg-white/5"
              )}
            >
              <div className="flex items-center justify-between">
                <p className="font-semibold text-slate-100">{step.title}</p>
                <span
                  className={clsx(
                    "text-[11px] font-semibold",
                    step.status === "done" && "text-emerald-200",
                    step.status === "active" && "text-emerald-100",
                    step.status === "locked" && "text-slate-500",
                    step.status === "todo" && "text-slate-300"
                  )}
                >
                  {step.status === "done"
                    ? "Done"
                    : step.status === "active"
                      ? "In progress"
                      : step.status === "locked"
                        ? "Locked"
                        : "Pending"}
                </span>
              </div>
              <p className="mt-1 text-slate-300">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
