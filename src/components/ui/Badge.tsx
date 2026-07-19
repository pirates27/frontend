import React from 'react';
import { Check, X, AlertTriangle, Clock, Shield, Activity } from 'lucide-react';
import type { PropertyStatus } from '../../models/property.models';

// ─── Status Badge ─────────────────────────────────────────────────────
interface StatusBadgeProps {
  status: PropertyStatus;
  aiScore?: number;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, aiScore, size = 'sm' }) => {
  const config: Record<PropertyStatus, { label: string; color: string; icon: React.ReactNode; dot: string }> = {
    APPROVED: {
      label: 'Verified',
      color: 'bg-accent-500/15 border-accent-500/30 text-accent-400',
      icon: <Check className="w-3 h-3" strokeWidth={2.5} />,
      dot: 'bg-accent-400',
    },
    PENDING_GOVT: {
      label: 'Govt Review',
      color: 'bg-primary-500/15 border-primary-500/30 text-primary-400',
      icon: <Clock className="w-3 h-3" />,
      dot: 'bg-primary-400',
    },
    PENDING_AI: {
      label: 'AI Scanning',
      color: 'bg-warning-500/15 border-warning-500/30 text-warning-400',
      icon: <Activity className="w-3 h-3" />,
      dot: 'bg-warning-400',
    },
    REJECTED: {
      label: 'Rejected',
      color: 'bg-danger-500/15 border-danger-500/30 text-danger-400',
      icon: <X className="w-3 h-3" strokeWidth={2.5} />,
      dot: 'bg-danger-400',
    },
    DISPUTED: {
      label: 'Disputed',
      color: 'bg-orange-500/15 border-orange-500/30 text-orange-400',
      icon: <AlertTriangle className="w-3 h-3" />,
      dot: 'bg-orange-400',
    },
  };

  const c = config[status] || config.PENDING_AI;
  const isPinging = status === 'PENDING_AI' || status === 'PENDING_GOVT';

  return (
    <span className={`
      inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full
      border font-semibold transition-all duration-200
      ${c.color}
      ${size === 'sm' ? 'text-[10px]' : 'text-xs'}
    `}>
      <span className="relative flex items-center justify-center w-2 h-2">
        {isPinging && (
          <span className={`absolute inline-flex w-full h-full rounded-full opacity-60 animate-ping ${c.dot}`} />
        )}
        <span className={`relative flex w-2 h-2 rounded-full ${c.dot}`} />
      </span>
      {c.icon}
      {c.label}
      {status === 'APPROVED' && aiScore !== undefined && (
        <span className="ml-0.5 px-1.5 py-0.5 bg-accent-500/20 text-accent-300 rounded text-[9px] font-bold border border-accent-500/20">
          {aiScore}%
        </span>
      )}
    </span>
  );
};

// ─── Role Badge ───────────────────────────────────────────────────────
interface RoleBadgeProps {
  role: string;
}

export const RoleBadge: React.FC<RoleBadgeProps> = ({ role }) => {
  const config: Record<string, { label: string; color: string }> = {
    ADMIN: { label: 'Admin', color: 'bg-danger-500/15 border-danger-500/30 text-danger-400' },
    GOVERNMENT_OFFICER: { label: 'Govt Officer', color: 'bg-primary-500/15 border-primary-500/30 text-primary-400' },
    PROVIDER: { label: 'Provider', color: 'bg-accent-500/15 border-accent-500/30 text-accent-400' },
    BUYER: { label: 'Buyer', color: 'bg-cyan-500/15 border-cyan-500/30 text-cyan-400' },
  };

  const c = config[role] || { label: role, color: 'bg-white/10 border-white/20 text-dark-300' };

  return (
    <span className={`
      inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full
      border text-[10px] font-bold uppercase tracking-wider
      ${c.color}
    `}>
      <Shield className="w-2.5 h-2.5" />
      {c.label}
    </span>
  );
};

// ─── Generic Chip ─────────────────────────────────────────────────────
interface ChipProps {
  label: string;
  color?: 'primary' | 'cyan' | 'accent' | 'danger' | 'warning' | 'neutral';
  size?: 'xs' | 'sm';
  dot?: boolean;
}

export const Chip: React.FC<ChipProps> = ({ label, color = 'neutral', size = 'sm', dot = false }) => {
  const colorStyles = {
    primary: 'bg-primary-500/15 border-primary-500/30 text-primary-400',
    cyan: 'bg-cyan-500/15 border-cyan-500/30 text-cyan-400',
    accent: 'bg-accent-500/15 border-accent-500/30 text-accent-400',
    danger: 'bg-danger-500/15 border-danger-500/30 text-danger-400',
    warning: 'bg-warning-500/15 border-warning-500/30 text-warning-400',
    neutral: 'bg-white/[0.06] border-white/10 text-dark-400',
  };

  const dotColors = {
    primary: 'bg-primary-400',
    cyan: 'bg-cyan-400',
    accent: 'bg-accent-400',
    danger: 'bg-danger-400',
    warning: 'bg-warning-400',
    neutral: 'bg-dark-400',
  };

  return (
    <span className={`
      inline-flex items-center gap-1.5 border rounded-full font-semibold
      ${colorStyles[color]}
      ${size === 'xs' ? 'px-2 py-0.5 text-[9px]' : 'px-2.5 py-1 text-[10px]'}
    `}>
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${dotColors[color]}`} />}
      {label}
    </span>
  );
};
