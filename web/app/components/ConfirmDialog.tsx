'use client';

import { ReactNode } from 'react';

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description: string | ReactNode;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: 'danger' | 'warning' | 'info';
};

export function ConfirmDialog({
  open,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  variant = 'warning',
}: ConfirmDialogProps) {
  if (!open) return null;

  const variantColors = {
    danger: {
      border: 'border-red-400/30',
      bg: 'bg-red-400/5',
      icon: '⚠️',
      iconBg: 'bg-red-400/20',
      button: 'from-red-400 to-red-500 text-red-950 shadow-red-500/30',
    },
    warning: {
      border: 'border-amber-400/30',
      bg: 'bg-amber-400/5',
      icon: '⚡',
      iconBg: 'bg-amber-400/20',
      button: 'from-amber-400 to-amber-500 text-amber-950 shadow-amber-500/30',
    },
    info: {
      border: 'border-cyan-400/30',
      bg: 'bg-cyan-400/5',
      icon: 'ℹ️',
      iconBg: 'bg-cyan-400/20',
      button: 'from-cyan-400 to-cyan-500 text-cyan-950 shadow-cyan-500/30',
    },
  };

  const colors = variantColors[variant];

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
      aria-labelledby="dialog-title"
      aria-describedby="dialog-description"
    >
      <div
        className={`glass-card max-w-md w-full p-6 border ${colors.border} ${colors.bg}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-4 mb-4">
          <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${colors.iconBg}`}>
            <span className="text-2xl" aria-hidden="true">{colors.icon}</span>
          </div>
          <div className="flex-1">
            <h3 id="dialog-title" className="text-lg font-bold text-slate-50 mb-2">
              {title}
            </h3>
            <div id="dialog-description" className="text-sm text-slate-300">
              {description}
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onCancel}
            className="flex-1 rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-slate-100 transition hover:bg-white/10 focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 focus:ring-offset-slate-900 min-h-[44px]"
            aria-label={cancelText}
          >
            {cancelText}
          </button>
          <button
            onClick={() => {
              onConfirm();
              onCancel();
            }}
            className={`flex-1 rounded-lg bg-gradient-to-r ${colors.button} px-4 py-3 text-sm font-semibold shadow-lg transition hover:-translate-y-0.5 focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 min-h-[44px]`}
            aria-label={confirmText}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
