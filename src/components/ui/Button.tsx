import React from 'react';
import { Loader2 } from 'lucide-react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'accent' | 'outline' | 'glass';
type ButtonSize = 'xs' | 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
  fullWidth?: boolean;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: `
    bg-gradient-to-r from-primary-600 to-primary-700
    hover:from-primary-500 hover:to-primary-600
    text-white shadow-lg shadow-primary-900/30
    hover:shadow-primary-800/40 hover:shadow-xl
    border border-primary-500/40
  `,
  secondary: `
    bg-gradient-to-r from-cyan-500/20 to-primary-600/20
    hover:from-cyan-500/30 hover:to-primary-600/30
    text-cyan-400 border border-cyan-500/30
    hover:border-cyan-400/50
  `,
  accent: `
    bg-gradient-to-r from-accent-500 to-accent-600
    hover:from-accent-400 hover:to-accent-500
    text-white shadow-lg shadow-accent-900/30
    border border-accent-500/40
  `,
  danger: `
    bg-gradient-to-r from-danger-600 to-danger-700
    hover:from-danger-500 hover:to-danger-600
    text-white shadow-lg shadow-danger-900/30
    border border-danger-500/40
  `,
  ghost: `
    bg-transparent hover:bg-white/[0.06]
    text-dark-300 hover:text-white
    border border-transparent hover:border-white/10
  `,
  outline: `
    bg-transparent hover:bg-white/[0.05]
    text-dark-300 hover:text-white
    border border-white/15 hover:border-white/25
  `,
  glass: `
    bg-white/[0.05] hover:bg-white/[0.09]
    text-white border border-white/10
    hover:border-white/20 backdrop-blur-sm
  `,
};

const sizeStyles: Record<ButtonSize, string> = {
  xs: 'px-3 py-1.5 text-xs gap-1.5 rounded-lg',
  sm: 'px-4 py-2 text-sm gap-2 rounded-xl',
  md: 'px-5 py-2.5 text-sm gap-2 rounded-xl',
  lg: 'px-6 py-3 text-base gap-2.5 rounded-2xl',
};

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  iconRight,
  fullWidth = false,
  children,
  className = '',
  disabled,
  ...rest
}) => {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={`
        inline-flex items-center justify-center font-semibold
        transition-all duration-200 ease-out
        active:scale-[0.97] focus:outline-none
        focus-visible:ring-2 focus-visible:ring-primary-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-transparent
        disabled:opacity-50 disabled:pointer-events-none disabled:cursor-not-allowed
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : icon ? (
        <span className="shrink-0">{icon}</span>
      ) : null}
      {children && <span>{children}</span>}
      {!loading && iconRight && <span className="shrink-0">{iconRight}</span>}
    </button>
  );
};
