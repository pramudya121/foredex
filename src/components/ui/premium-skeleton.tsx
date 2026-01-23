import { memo, CSSProperties } from 'react';
import { cn } from '@/lib/utils';

interface SkeletonProps {
  className?: string;
  style?: CSSProperties;
}

// Base shimmer skeleton
export const ShimmerSkeleton = memo(function ShimmerSkeleton({ className, style }: SkeletonProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-lg bg-muted/40",
        "before:absolute before:inset-0 before:-translate-x-full",
        "before:animate-[shimmer_2s_infinite]",
        "before:bg-gradient-to-r before:from-transparent before:via-white/10 before:to-transparent",
        className
      )}
      style={style}
    />
  );
});

// Card skeleton with premium effects
export const CardSkeleton = memo(function CardSkeleton({ className }: SkeletonProps) {
  return (
    <div className={cn("glass-card p-4 space-y-3 animate-pulse", className)}>
      <div className="flex items-center gap-3">
        <ShimmerSkeleton className="w-10 h-10 rounded-full" />
        <div className="flex-1 space-y-2">
          <ShimmerSkeleton className="h-4 w-24" />
          <ShimmerSkeleton className="h-3 w-16" />
        </div>
      </div>
      <ShimmerSkeleton className="h-8 w-full" />
    </div>
  );
});

// Stats grid skeleton
export const StatsGridSkeleton = memo(function StatsGridSkeleton({ 
  count = 4,
  className 
}: { 
  count?: number;
  className?: string;
}) {
  return (
    <div className={cn("grid grid-cols-2 sm:grid-cols-4 gap-3", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="glass-card p-4 text-center animate-pulse">
          <ShimmerSkeleton className="h-6 w-16 mx-auto mb-2" />
          <ShimmerSkeleton className="h-3 w-20 mx-auto" />
        </div>
      ))}
    </div>
  );
});

// Table row skeleton
export const TableRowSkeleton = memo(function TableRowSkeleton({ 
  columns = 5,
  className 
}: { 
  columns?: number;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center justify-between p-4 border-b border-border/30 animate-pulse", className)}>
      <div className="flex items-center gap-3">
        <ShimmerSkeleton className="w-8 h-8 rounded-full" />
        <div className="space-y-1">
          <ShimmerSkeleton className="h-4 w-20" />
          <ShimmerSkeleton className="h-3 w-14" />
        </div>
      </div>
      <div className="flex items-center gap-4">
        {Array.from({ length: columns - 1 }).map((_, i) => (
          <ShimmerSkeleton key={i} className="h-4 w-16" />
        ))}
      </div>
    </div>
  );
});

// Table skeleton
export const TableSkeleton = memo(function TableSkeleton({ 
  rows = 5,
  columns = 5,
  className 
}: { 
  rows?: number;
  columns?: number;
  className?: string;
}) {
  return (
    <div className={cn("glass-card overflow-hidden", className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border/50 bg-muted/20">
        {Array.from({ length: columns }).map((_, i) => (
          <ShimmerSkeleton key={i} className="h-4 w-20" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <TableRowSkeleton key={i} columns={columns} />
      ))}
    </div>
  );
});

// Chart skeleton
export const ChartSkeleton = memo(function ChartSkeleton({ className }: SkeletonProps) {
  return (
    <div className={cn("glass-card p-6 animate-pulse", className)}>
      <div className="flex items-center justify-between mb-4">
        <ShimmerSkeleton className="h-5 w-32" />
        <ShimmerSkeleton className="h-4 w-20" />
      </div>
      <div className="h-64 flex items-end justify-between gap-2">
        {Array.from({ length: 7 }).map((_, i) => (
          <ShimmerSkeleton 
            key={i} 
            className="flex-1 rounded-t-lg"
            style={{ height: `${30 + Math.random() * 60}%` }}
          />
        ))}
      </div>
    </div>
  );
});

// Pool/Farm card skeleton
export const PoolCardSkeleton = memo(function PoolCardSkeleton({ className }: SkeletonProps) {
  return (
    <div className={cn("glass-card p-5 animate-pulse", className)}>
      <div className="flex items-center gap-3 mb-4">
        <div className="flex -space-x-2">
          <ShimmerSkeleton className="w-10 h-10 rounded-full border-2 border-background" />
          <ShimmerSkeleton className="w-10 h-10 rounded-full border-2 border-background" />
        </div>
        <div className="space-y-1">
          <ShimmerSkeleton className="h-5 w-24" />
          <ShimmerSkeleton className="h-3 w-16" />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="text-center">
            <ShimmerSkeleton className="h-5 w-14 mx-auto mb-1" />
            <ShimmerSkeleton className="h-3 w-10 mx-auto" />
          </div>
        ))}
      </div>
      <ShimmerSkeleton className="h-10 w-full mt-4 rounded-lg" />
    </div>
  );
});

// Token balance skeleton
export const TokenBalanceSkeleton = memo(function TokenBalanceSkeleton({ className }: SkeletonProps) {
  return (
    <div className={cn("flex items-center justify-between p-3 rounded-lg bg-muted/20 animate-pulse", className)}>
      <div className="flex items-center gap-3">
        <ShimmerSkeleton className="w-10 h-10 rounded-full" />
        <div className="space-y-1">
          <ShimmerSkeleton className="h-4 w-16" />
          <ShimmerSkeleton className="h-3 w-24" />
        </div>
      </div>
      <div className="text-right space-y-1">
        <ShimmerSkeleton className="h-5 w-20 ml-auto" />
        <ShimmerSkeleton className="h-3 w-12 ml-auto" />
      </div>
    </div>
  );
});

// Portfolio section skeleton
export const PortfolioSectionSkeleton = memo(function PortfolioSectionSkeleton({ 
  title,
  count = 3,
  className 
}: { 
  title?: string;
  count?: number;
  className?: string;
}) {
  return (
    <div className={cn("glass-card p-4 sm:p-6", className)}>
      <div className="flex items-center gap-2 mb-4">
        <ShimmerSkeleton className="w-5 h-5 rounded" />
        {title ? (
          <span className="font-semibold">{title}</span>
        ) : (
          <ShimmerSkeleton className="h-5 w-32" />
        )}
      </div>
      <div className="space-y-3">
        {Array.from({ length: count }).map((_, i) => (
          <TokenBalanceSkeleton key={i} />
        ))}
      </div>
    </div>
  );
});

// Swap card skeleton
export const SwapCardSkeleton = memo(function SwapCardSkeleton({ className }: SkeletonProps) {
  return (
    <div className={cn("glass-card p-6 max-w-md mx-auto animate-pulse", className)}>
      {/* From section */}
      <div className="p-4 rounded-xl bg-muted/20 mb-2">
        <div className="flex justify-between mb-2">
          <ShimmerSkeleton className="h-3 w-12" />
          <ShimmerSkeleton className="h-3 w-20" />
        </div>
        <div className="flex items-center gap-3">
          <ShimmerSkeleton className="h-12 flex-1 rounded-lg" />
          <ShimmerSkeleton className="h-10 w-24 rounded-lg" />
        </div>
      </div>
      
      {/* Swap button */}
      <div className="flex justify-center -my-3 relative z-10">
        <ShimmerSkeleton className="w-10 h-10 rounded-full" />
      </div>
      
      {/* To section */}
      <div className="p-4 rounded-xl bg-muted/20 mt-2">
        <div className="flex justify-between mb-2">
          <ShimmerSkeleton className="h-3 w-12" />
          <ShimmerSkeleton className="h-3 w-20" />
        </div>
        <div className="flex items-center gap-3">
          <ShimmerSkeleton className="h-12 flex-1 rounded-lg" />
          <ShimmerSkeleton className="h-10 w-24 rounded-lg" />
        </div>
      </div>
      
      {/* Details */}
      <div className="mt-4 space-y-2">
        <div className="flex justify-between">
          <ShimmerSkeleton className="h-3 w-20" />
          <ShimmerSkeleton className="h-3 w-16" />
        </div>
        <div className="flex justify-between">
          <ShimmerSkeleton className="h-3 w-24" />
          <ShimmerSkeleton className="h-3 w-12" />
        </div>
      </div>
      
      {/* Action button */}
      <ShimmerSkeleton className="h-12 w-full mt-4 rounded-xl" />
    </div>
  );
});
