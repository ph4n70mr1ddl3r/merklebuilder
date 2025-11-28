'use client';

import clsx from "clsx";

export function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/5 bg-white/5 px-3 py-3">
      <p className="text-xs uppercase tracking-wide text-slate-400">{label}</p>
      <p className="text-lg font-semibold text-slate-50">{value}</p>
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={clsx("animate-shimmer rounded bg-white/5", className)} />
  );
}

export function InfoRow({
  label,
  value,
  copyValue,
  monospace,
  onCopy,
  copied,
}: {
  label: string;
  value: string;
  copyValue?: string;
  monospace?: boolean;
  onCopy?: () => void;
  copied?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-white/5 bg-slate-900/60 px-3 py-2">
      <span className="text-slate-400">{label}</span>
      <div className="flex items-center gap-2">
        <span className={clsx("font-semibold text-slate-100", monospace && "font-mono break-all")}>
          {value}
        </span>
        {copyValue && (
          <button
            onClick={onCopy ?? (() => navigator.clipboard?.writeText(copyValue))}
            className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[11px] font-semibold text-emerald-100 hover:-translate-y-0.5"
          >
            ⧉
            {copied && <span className="text-emerald-300">Copied</span>}
          </button>
        )}
      </div>
    </div>
  );
}
