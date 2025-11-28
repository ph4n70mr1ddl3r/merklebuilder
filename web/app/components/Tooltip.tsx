'use client';

import { useState, useRef, useEffect, ReactNode } from 'react';

type TooltipProps = {
  content: string;
  children: ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
};

export function Tooltip({ content, children, position = 'top' }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const triggerRef = useRef<HTMLSpanElement>(null);

  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  const arrowClasses = {
    top: 'top-full left-1/2 -translate-x-1/2 border-t-slate-800 border-x-transparent border-b-transparent',
    bottom: 'bottom-full left-1/2 -translate-x-1/2 border-b-slate-800 border-x-transparent border-t-transparent',
    left: 'left-full top-1/2 -translate-y-1/2 border-l-slate-800 border-y-transparent border-r-transparent',
    right: 'right-full top-1/2 -translate-y-1/2 border-r-slate-800 border-y-transparent border-l-transparent',
  };

  return (
    <span
      ref={triggerRef}
      className="relative inline-flex cursor-help"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
      onFocus={() => setIsVisible(true)}
      onBlur={() => setIsVisible(false)}
    >
      {children}
      {isVisible && (
        <span
          className={`absolute z-50 ${positionClasses[position]} pointer-events-none`}
          role="tooltip"
        >
          <span className="block max-w-xs rounded-lg bg-slate-800 px-3 py-2 text-xs text-slate-100 shadow-xl border border-white/10">
            {content}
          </span>
          <span
            className={`absolute border-4 ${arrowClasses[position]}`}
          />
        </span>
      )}
    </span>
  );
}

// Info icon with tooltip
export function InfoTooltip({ content }: { content: string }) {
  return (
    <Tooltip content={content}>
      <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-slate-700 text-slate-400 text-[10px] font-bold hover:bg-slate-600 transition">
        ?
      </span>
    </Tooltip>
  );
}
