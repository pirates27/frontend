import React from 'react';
import type { PropertyStatus } from '../../models/property.models';
import { Check, X, AlertTriangle } from 'lucide-react';

interface VerificationBadgeProps {
  status: PropertyStatus;
  aiScore?: number;
}

export const VerificationBadge: React.FC<VerificationBadgeProps> = ({ status = 'PENDING_AI', aiScore }) => {
  const getBadgeClasses = () => {
    switch (status) {
      case 'APPROVED': return 'bg-emerald-950/20 border-emerald-500/30 text-emerald-700 dark:text-emerald-400';
      case 'PENDING_GOVT': return 'bg-emerald-500/10 border-emerald-400/20 text-emerald-600 dark:text-emerald-400';
      case 'PENDING_AI': return 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400';
      case 'REJECTED': return 'bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400';
      case 'DISPUTED': return 'bg-red-600/10 border-red-500/30 text-red-600 dark:text-red-400';
      default: return 'bg-slate-100 border-slate-200 text-slate-700';
    }
  };

  const getBadgeText = () => {
    switch (status) {
      case 'APPROVED': return 'Approved Land';
      case 'PENDING_GOVT': return 'Govt Verify Pending';
      case 'PENDING_AI': return 'AI Checking...';
      case 'REJECTED': return 'Rejected';
      case 'DISPUTED': return 'Disputed / Fraud Flag';
      default: return 'Unknown';
    }
  };

  return (
    <div className={`${getBadgeClasses()} inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold shadow-xs border transition-all duration-300`}>
      {(status === 'PENDING_AI' || status === 'PENDING_GOVT') && (
        <span className="flex h-2 w-2 relative">
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${status === 'PENDING_AI' ? 'bg-amber-400' : 'bg-emerald-400'}`}></span>
          <span className={`relative inline-flex rounded-full h-2 w-2 ${status === 'PENDING_AI' ? 'bg-amber-500' : 'bg-emerald-500'}`}></span>
        </span>
      )}

      {status === 'APPROVED' && (
        <span className="text-emerald-100 bg-emerald-700/80 rounded-full p-0.5">
          <Check className="w-3.5 h-3.5" strokeWidth={2.5} />
        </span>
      )}

      {status === 'REJECTED' && (
        <span className="text-rose-100 bg-rose-700/80 rounded-full p-0.5">
          <X className="w-3.5 h-3.5" strokeWidth={2.5} />
        </span>
      )}

      {status === 'DISPUTED' && (
        <span className="text-red-100 bg-red-800 rounded-full p-0.5">
          <AlertTriangle className="w-3.5 h-3.5" strokeWidth={2.5} />
        </span>
      )}

      <span>{getBadgeText()}</span>

      {status === 'APPROVED' && aiScore !== undefined && (
        <span className="ml-1 bg-emerald-950/30 text-emerald-100 px-1.5 py-0.5 rounded-sm font-bold border border-emerald-500/20">
          AI: {aiScore}%
        </span>
      )}
    </div>
  );
};
