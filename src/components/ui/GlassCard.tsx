import React from 'react';
import { motion } from 'framer-motion';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  glow?: 'primary' | 'cyan' | 'accent' | 'danger' | 'none';
  onClick?: () => void;
  animate?: boolean;
  delay?: number;
  padding?: string;
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  className = '',
  hover = false,
  glow = 'none',
  onClick,
  animate = false,
  delay = 0,
  padding = 'p-6',
}) => {
  const glowClass = {
    primary: 'hover:shadow-[0_0_24px_rgba(37,99,235,0.3)]',
    cyan: 'hover:shadow-[0_0_24px_rgba(6,182,212,0.3)]',
    accent: 'hover:shadow-[0_0_24px_rgba(16,185,129,0.25)]',
    danger: 'hover:shadow-[0_0_24px_rgba(239,68,68,0.25)]',
    none: '',
  }[glow];

  const hoverClass = hover
    ? `cursor-pointer hover:bg-white/[0.07] hover:border-white/[0.15] hover:-translate-y-0.5 ${glowClass}`
    : '';

  const base = (
    <div
      onClick={onClick}
      className={`
        glass-card ${padding}
        ${hoverClass}
        ${className}
      `}
    >
      {children}
    </div>
  );

  if (animate) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay, ease: 'easeOut' }}
      >
        {React.cloneElement(base as React.ReactElement<any>, {})}
      </motion.div>
    );
  }

  return base;
};
