import React from 'react';
import { motion } from 'framer-motion';
import { Button } from './Button';

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'secondary' | 'ghost';
  };
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  className = '',
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={`
        flex flex-col items-center justify-center text-center
        py-16 px-8 glass-card
        ${className}
      `}
    >
      {/* Icon container with glow */}
      <div className="relative mb-6">
        <div className="absolute inset-0 bg-primary-500/20 rounded-full blur-xl scale-150 opacity-50" />
        <div className="relative w-16 h-16 rounded-2xl bg-white/[0.05] border border-white/10 flex items-center justify-center text-dark-400">
          {icon}
        </div>
      </div>

      <h3 className="text-white font-semibold text-lg mb-2">{title}</h3>
      {description && (
        <p className="text-dark-400 text-sm leading-relaxed max-w-xs mb-6">{description}</p>
      )}
      {action && (
        <Button variant={action.variant || 'primary'} size="sm" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </motion.div>
  );
};
