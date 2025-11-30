'use client';

import { useEffect } from "react";
import clsx from "clsx";

type ProviderModalProps = {
  open: boolean;
  onClose: () => void;
  connectors: readonly any[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onConnect: () => void;
};

export function ProviderModal({ open, onClose, connectors, selectedId, onSelect, onConnect }: ProviderModalProps) {
  useEffect(() => {
    if (!open) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  if (!open) return null;
  const titleId = "provider-modal-title";
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/70 px-2 sm:px-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-lg rounded-t-2xl sm:rounded-2xl border border-white/10 bg-slate-900/95 p-4 sm:p-6 shadow-2xl backdrop-blur max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start sm:items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-400">Select wallet</p>
            <h3 id={titleId} className="text-lg sm:text-xl font-semibold text-slate-50">
              Choose a provider
            </h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-full border border-white/10 px-3 py-1.5 text-sm text-slate-300 hover:-translate-y-0.5 min-h-[40px] active:bg-white/10"
          >
            Close
          </button>
        </div>

        {connectors.length === 0 ? (
          <p className="mt-4 text-sm text-slate-400">Waiting for wallets (EIP-6963 broadcast). Open your wallet extension.</p>
        ) : (
          <div className="mt-4 space-y-2">
            {connectors.map((p) => (
              <button
                key={p.id}
                onClick={() => onSelect(p.id)}
                className={clsx(
                  "flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition min-h-[56px]",
                  selectedId === p.id
                    ? "border-emerald-400/60 bg-emerald-400/10 shadow-[0_0_18px_rgba(52,211,153,0.25)]"
                    : "border-white/10 bg-white/5 active:bg-white/10"
                )}
              >
                <div className="flex items-center gap-3">
                  <div>
                    <p className="font-semibold text-slate-100">{p.name}</p>
                    <p className="text-xs text-slate-400">{p.ready ? "Ready" : "Unavailable"}</p>
                  </div>
                </div>
                <div className={clsx("h-4 w-4 rounded-full border-2", selectedId === p.id ? "border-emerald-300 bg-emerald-300" : "border-white/30")} />
              </button>
            ))}
          </div>
        )}

        <div className="mt-5 flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3">
          <button
            onClick={onClose}
            className="rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-slate-100 sm:hover:-translate-y-0.5 min-h-[48px] active:bg-white/10"
          >
            Cancel
          </button>
          <button
            onClick={onConnect}
            disabled={connectors.length === 0}
            className="rounded-lg bg-gradient-to-r from-emerald-400 to-emerald-500 px-4 py-3 text-sm font-semibold text-emerald-950 shadow-lg shadow-emerald-500/30 transition sm:hover:-translate-y-0.5 disabled:opacity-50 min-h-[48px] active:shadow-none"
          >
            Connect Wallet
          </button>
        </div>
      </div>
    </div>
  );
}
