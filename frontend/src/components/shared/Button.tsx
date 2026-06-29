'use client';

import { cn } from '@/lib/utils';

type ButtonVariant = 'primary' | 'success' | 'outline' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

type ButtonProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  block?: boolean;
  loading?: boolean;
  children: React.ReactNode;
} & React.ButtonHTMLAttributes<HTMLButtonElement>;

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-gradient-to-br from-[#6c5ce7] to-[#a855f7] text-white shadow-[0_4px_16px_rgba(108,92,231,0.3)] hover:shadow-[0_6px_24px_rgba(108,92,231,0.5)] hover:brightness-110',
  success:
    'bg-gradient-to-br from-[#10b981] to-[#06b6d4] text-white hover:brightness-110 shadow-sm hover:shadow-md',
  outline:
    'bg-transparent border border-[var(--border)] text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)]',
  danger:
    'bg-transparent border border-[var(--danger)] text-[var(--danger)] hover:bg-[rgba(239,68,68,0.1)]',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-xs min-h-[34px]',
  md: 'px-4 py-2.5 text-sm min-h-[42px]',
  lg: 'px-6 py-3 text-base min-h-[48px]',
};

export function Button({
  variant = 'primary',
  size = 'md',
  block = false,
  loading = false,
  className,
  disabled,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-1.5 rounded-lg font-semibold cursor-pointer border-none transition-all duration-200 select-none touch-manipulation whitespace-nowrap active:scale-[0.96] disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none',
        variantClasses[variant],
        sizeClasses[size],
        block && 'w-full',
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin inline-block" />}
      {children}
    </button>
  );
}
