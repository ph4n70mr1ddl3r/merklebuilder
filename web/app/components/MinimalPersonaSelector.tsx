'use client';

export type UserIntent = 'claim' | 'invite' | 'trade' | 'wallet' | 'info';

type MinimalPersonaSelectorProps = {
  onSelectIntent: (intent: UserIntent) => void;
  currentIntent: UserIntent;
};

export function MinimalPersonaSelector({
  onSelectIntent,
  currentIntent,
}: MinimalPersonaSelectorProps) {
  const options: { id: UserIntent; label: string }[] = [
    { id: 'claim', label: 'Claim' },
    { id: 'invite', label: 'Invite' },
    { id: 'trade', label: 'Trade' },
    { id: 'wallet', label: 'Wallet' },
    { id: 'info', label: 'Info' },
  ];

  return (
    <section className="mx-auto max-w-2xl px-4 py-8 sm:py-12">
      <nav 
        className="flex gap-4 sm:gap-8 overflow-x-auto pb-4 sm:pb-0 justify-start sm:justify-center -mx-4 px-4 sm:mx-0 sm:px-0 border-b border-slate-800 scrollbar-hide" 
        role="navigation" 
        aria-label="Main navigation"
      >
        {options.map((option) => (
          <button
            key={option.id}
            onClick={() => onSelectIntent(option.id)}
            className={`pb-3 px-2 text-sm font-medium transition-colors relative whitespace-nowrap focus:outline-none focus-visible:text-emerald-300 shrink-0 ${
              currentIntent === option.id
                ? 'text-emerald-400'
                : 'text-slate-500 hover:text-slate-300'
            }`}
            aria-current={currentIntent === option.id ? 'page' : undefined}
          >
            {option.label}
            {currentIntent === option.id && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-400" aria-hidden="true" />
            )}
          </button>
        ))}
      </nav>
    </section>
  );
}
