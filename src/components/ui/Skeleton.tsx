import React from 'react';

// ─── Skeleton Block ───────────────────────────────────────────────────
interface SkeletonProps {
  className?: string;
  width?: string;
  height?: string;
  rounded?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className = '',
  width = 'w-full',
  height = 'h-4',
  rounded = 'rounded-lg',
}) => (
  <div className={`skeleton ${width} ${height} ${rounded} ${className}`} />
);

// ─── Skeleton Card ────────────────────────────────────────────────────
export const SkeletonCard: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`glass-card p-5 space-y-4 ${className}`}>
    <div className="flex items-center gap-3">
      <Skeleton width="w-10" height="h-10" rounded="rounded-xl" />
      <div className="flex-1 space-y-2">
        <Skeleton height="h-4" width="w-3/4" />
        <Skeleton height="h-3" width="w-1/2" />
      </div>
    </div>
    <div className="space-y-2">
      <Skeleton height="h-3" />
      <Skeleton height="h-3" width="w-5/6" />
      <Skeleton height="h-3" width="w-4/6" />
    </div>
    <div className="flex gap-2 pt-2">
      <Skeleton height="h-8" width="w-24" rounded="rounded-xl" />
      <Skeleton height="h-8" width="w-20" rounded="rounded-xl" />
    </div>
  </div>
);

// ─── Skeleton Stat Card ───────────────────────────────────────────────
export const SkeletonStatCard: React.FC = () => (
  <div className="glass-card p-5 space-y-4">
    <div className="flex items-start justify-between">
      <Skeleton width="w-10" height="h-10" rounded="rounded-xl" />
      <Skeleton width="w-16" height="h-6" rounded="rounded-lg" />
    </div>
    <div className="space-y-2">
      <Skeleton height="h-8" width="w-2/3" />
      <Skeleton height="h-3" width="w-1/2" />
    </div>
  </div>
);

// ─── Skeleton Table Row ───────────────────────────────────────────────
export const SkeletonTableRow: React.FC = () => (
  <div className="flex items-center gap-4 px-5 py-3.5 border-b border-white/[0.05]">
    <Skeleton width="w-8" height="h-8" rounded="rounded-lg" />
    <Skeleton height="h-4" width="w-1/4" />
    <Skeleton height="h-4" width="w-1/3" className="hidden sm:block" />
    <Skeleton height="h-6" width="w-20" rounded="rounded-full" className="ml-auto" />
  </div>
);

// ─── Skeleton Text Block ──────────────────────────────────────────────
export const SkeletonText: React.FC<{ lines?: number }> = ({ lines = 3 }) => (
  <div className="space-y-2.5">
    {Array.from({ length: lines }).map((_, i) => (
      <Skeleton
        key={i}
        height="h-3.5"
        width={i === lines - 1 ? 'w-3/4' : 'w-full'}
      />
    ))}
  </div>
);
