import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  trend?: number; // percentage change, positive = up, negative = down
  color?: 'primary' | 'cyan' | 'accent' | 'danger' | 'warning';
  prefix?: string;
  suffix?: string;
  delay?: number;
  format?: 'number' | 'currency' | 'plain';
}

const colorConfig = {
  primary: {
    icon: 'bg-primary-500/20 text-primary-400 border border-primary-500/20',
    value: 'text-primary-300',
    glow: 'hover:shadow-[0_4px_24px_rgba(37,99,235,0.2)]',
  },
  cyan: {
    icon: 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/20',
    value: 'text-cyan-300',
    glow: 'hover:shadow-[0_4px_24px_rgba(6,182,212,0.2)]',
  },
  accent: {
    icon: 'bg-accent-500/20 text-accent-400 border border-accent-500/20',
    value: 'text-accent-300',
    glow: 'hover:shadow-[0_4px_24px_rgba(16,185,129,0.2)]',
  },
  danger: {
    icon: 'bg-danger-500/20 text-danger-400 border border-danger-500/20',
    value: 'text-danger-300',
    glow: 'hover:shadow-[0_4px_24px_rgba(239,68,68,0.2)]',
  },
  warning: {
    icon: 'bg-warning-500/20 text-warning-400 border border-warning-500/20',
    value: 'text-warning-300',
    glow: 'hover:shadow-[0_4px_24px_rgba(245,158,11,0.2)]',
  },
};

function useCountUp(target: number, duration = 1200) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let start = 0;
    const increment = target / (duration / 16);
    const timer = setInterval(() => {
      start += increment;
      if (start >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, 16);
    return () => clearInterval(timer);
  }, [target, duration]);

  return count;
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  icon,
  trend,
  color = 'primary',
  prefix = '',
  suffix = '',
  delay = 0,
  format = 'number',
}) => {
  const numValue = typeof value === 'number' ? value : parseInt(String(value)) || 0;
  const animated = useCountUp(numValue, 1200);
  const cfg = colorConfig[color];

  const formatValue = (v: number) => {
    if (format === 'currency') return `₹${v.toLocaleString('en-IN')}`;
    if (format === 'number') return v.toLocaleString('en-IN');
    return String(v);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: 'easeOut' }}
      className={`
        glass-card p-5 group
        hover:-translate-y-1 hover:bg-white/[0.07] hover:border-white/[0.15]
        transition-all duration-300 cursor-default
        ${cfg.glow}
      `}
    >
      <div className="flex items-start justify-between mb-4">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${cfg.icon}`}>
          {icon}
        </div>
        {trend !== undefined && (
          <div className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-lg ${
            trend >= 0
              ? 'text-accent-400 bg-accent-500/10'
              : 'text-danger-400 bg-danger-500/10'
          }`}>
            {trend >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
            {Math.abs(trend)}%
          </div>
        )}
      </div>

      <div>
        <p className={`text-3xl font-bold tracking-tight ${cfg.value}`}>
          {prefix}{typeof value === 'number' ? formatValue(animated) : value}{suffix}
        </p>
        <p className="text-dark-400 text-xs font-medium mt-1.5 uppercase tracking-wider">{label}</p>
      </div>
    </motion.div>
  );
};
