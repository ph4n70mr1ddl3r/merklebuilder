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
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-lg rounded-2xl border border-white/10 bg-slate-900/90 p-6 shadow-2xl backdrop-blur"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-400">Select wallet</p>
            <h3 id={titleId} className="text-xl font-semibold text-slate-50">
              Choose a provider to connect
            </h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-full border border-white/10 px-2 py-1 text-sm text-slate-300 hover:-translate-y-0.5"
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
                  "flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition",
                  selectedId === p.id
                    ? "border-emerald-400/60 bg-emerald-400/10 shadow-[0_0_18px_rgba(52,211,153,0.25)]"
                    : "border-white/10 bg-white/5 hover:-translate-y-0.5"
                )}
              >
                <div className="flex items-center gap-3">
                  <div>
                    <p className="font-semibold text-slate-100">{p.name}</p>
                    <p className="text-xs text-slate-400">{p.ready ? "Ready" : "Unavailable"}</p>
                  </div>
                </div>
                <div className={clsx("h-3 w-3 rounded-full border", selectedId === p.id ? "border-emerald-300 bg-emerald-300" : "border-white/30")} />
              </button>
            ))}
          </div>
        )}

        <div className="mt-5 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-100 hover:-translate-y-0.5"
          >
            Cancel
          </button>
          <button
            onClick={onConnect}
            disabled={connectors.length === 0}
            className="rounded-lg bg-gradient-to-r from-emerald-400 to-emerald-500 px-4 py-2 text-sm font-semibold text-emerald-950 shadow-lg shadow-emerald-500/30 transition hover:-translate-y-0.5 disabled:opacity-50"
          >
            Connect
          </button>
        </div>
      </div>
    </div>
  );
}
