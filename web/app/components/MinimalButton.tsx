type MinimalButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger';
};

export function MinimalButton({
  children,
  disabled = false,
  variant = 'primary',
  className = '',
  ...rest
}: MinimalButtonProps) {
  const baseStyles = 'px-4 py-3 text-sm font-medium rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed touch-target';
  
  const variantStyles = {
    primary: 'bg-emerald-500 text-white hover:bg-emerald-600 disabled:hover:bg-emerald-500',
    secondary: 'border border-slate-700 text-slate-300 hover:border-slate-600 hover:bg-slate-900',
    danger: 'bg-red-600 text-white hover:bg-red-700 disabled:hover:bg-red-600',
  };

  return (
    <button
      type="button"
      disabled={disabled}
      className={`${baseStyles} ${variantStyles[variant]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
