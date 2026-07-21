import React from 'react';
import { motion } from 'framer-motion';

interface ProgressBarProps {
  value: number; // 0-100
  color?: 'primary' | 'cyan' | 'accent' | 'danger' | 'warning';
  label?: string;
  showValue?: boolean;
  size?: 'sm' | 'md' | 'lg';
  animated?: boolean;
  className?: string;
}

const colorGradients = {
  primary: 'from-primary-600 to-primary-400',
  cyan: 'from-cyan-600 to-cyan-400',
  accent: 'from-accent-600 to-accent-400',
  danger: 'from-danger-600 to-danger-400',
  warning: 'from-warning-600 to-warning-400',
};

const heights = {
  sm: 'h-1.5',
  md: 'h-2.5',
  lg: 'h-4',
};

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  color = 'primary',
  label,
  showValue = false,
  size = 'md',
  animated = true,
  className = '',
}) => {
  const clampedValue = Math.max(0, Math.min(100, value));

  return (
    <div className={`w-full ${className}`}>
      {(label || showValue) && (
        <div className="flex justify-between items-center mb-1.5">
          {label && <span className="text-xs text-dark-400 font-medium">{label}</span>}
          {showValue && <span className={`text-xs font-bold text-${color}-400`}>{clampedValue}%</span>}
        </div>
      )}
      <div className={`w-full bg-white/[0.06] rounded-full overflow-hidden ${heights[size]}`}>
        <motion.div
          initial={animated ? { width: '0%' } : { width: `${clampedValue}%` }}
          animate={{ width: `${clampedValue}%` }}
          transition={{ duration: 1.2, ease: [0.4, 0, 0.2, 1], delay: 0.2 }}
          className={`h-full bg-gradient-to-r ${colorGradients[color]} rounded-full relative`}
        >
          {size === 'lg' && (
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent rounded-full" />
          )}
        </motion.div>
      </div>
    </div>
  );
};

// ─── Circular Progress ────────────────────────────────────────────────
interface CircularProgressProps {
  value: number; // 0-100
  size?: number;
  strokeWidth?: number;
  color?: 'primary' | 'cyan' | 'accent' | 'danger' | 'warning';
  label?: string;
  sublabel?: string;
  className?: string;
}

const circleColors = {
  primary: '#2563eb',
  cyan: '#06b6d4',
  accent: '#10b981',
  danger: '#ef4444',
  warning: '#f59e0b',
};

export const CircularProgress: React.FC<CircularProgressProps> = ({
  value,
  size = 120,
  strokeWidth = 10,
  color = 'primary',
  label,
  sublabel,
  className = '',
}) => {
  const clampedValue = Math.max(0, Math.min(100, value));
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (clampedValue / 100) * circumference;
  const stroke = circleColors[color];

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <div className="relative" style={{ width: size, height: size }}>
        {/* Glow effect */}
        <div
          className="absolute inset-0 rounded-full opacity-20 blur-md"
          style={{ background: stroke }}
        />
        <svg width={size} height={size} className="rotate-[-90deg]">
          {/* Background track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth={strokeWidth}
          />
          {/* Progress arc */}
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={stroke}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 1.5, ease: [0.4, 0, 0.2, 1], delay: 0.3 }}
            strokeLinecap="round"
          />
        </svg>
        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="text-2xl font-bold text-gray-900"
          >
            {clampedValue}
          </motion.span>
          {sublabel && <span className="text-[10px] text-gray-700 font-medium">{sublabel}</span>}
        </div>
      </div>
      {label && <p className="text-gray-700 text-xs font-medium mt-2 text-center">{label}</p>}
    </div>
  );
};
