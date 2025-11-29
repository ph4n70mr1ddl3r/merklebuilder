type MinimalButtonProps = {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
  type?: 'button' | 'submit';
  className?: string;
};

export function MinimalButton({
  children,
  onClick,
  disabled = false,
  variant = 'primary',
  type = 'button',
  className = '',
}: MinimalButtonProps) {
  const baseStyles = 'px-4 py-2 text-sm font-medium rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
  
  const variantStyles = {
    primary: 'bg-emerald-500 text-white hover:bg-emerald-600 disabled:hover:bg-emerald-500',
    secondary: 'border border-slate-700 text-slate-300 hover:border-slate-600 hover:bg-slate-900',
    danger: 'bg-red-600 text-white hover:bg-red-700 disabled:hover:bg-red-600',
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${baseStyles} ${variantStyles[variant]} ${className}`}
    >
      {children}
    </button>
  );
}
