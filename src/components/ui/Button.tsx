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
    bg-primary-500 hover:bg-primary-600
    text-gray-900 font-extrabold shadow-md shadow-primary-500/20
    border border-primary-600
  `,
  secondary: `
    bg-gray-100 hover:bg-gray-200
    text-gray-900 font-bold border border-gray-200
  `,
  accent: `
    bg-emerald-600 hover:bg-emerald-700
    text-white font-bold shadow-md shadow-emerald-500/20
    border border-emerald-600
  `,
  danger: `
    bg-red-600 hover:bg-red-700
    text-white font-bold shadow-md shadow-red-500/20
    border border-red-600
  `,
  ghost: `
    bg-transparent hover:bg-gray-100
    text-gray-700 hover:text-gray-900 font-bold
    border border-transparent hover:border-gray-200
  `,
  outline: `
    bg-white hover:bg-gray-50
    text-gray-800 font-bold
    border border-gray-300 hover:border-gray-400 shadow-xs
  `,
  glass: `
    bg-white hover:bg-gray-50
    text-gray-900 font-bold border border-gray-200 shadow-xs
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
