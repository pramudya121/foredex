import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

interface SkeletonCardProps {
  className?: string;
  rows?: number;
  showHeader?: boolean;
  showFooter?: boolean;
}

// Premium shimmer effect skeleton
export function ShimmerSkeleton({ className }: { className?: string }) {
  return (
    <div 
      className={cn(
        'relative overflow-hidden rounded-md bg-muted/40',
        'before:absolute before:inset-0',
        'before:bg-gradient-to-r before:from-transparent before:via-white/10 before:to-transparent',
        'before:animate-[shimmer_2s_infinite]',
        className
      )} 
    />
  );
}

export function SkeletonCard({ 
  className, 
  rows = 3, 
  showHeader = true,
  showFooter = false 
}: SkeletonCardProps) {
  return (
    <div className={cn('glass-card p-4 sm:p-6 space-y-4 relative overflow-hidden', className)}>
      {/* Shimmer overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/5 to-transparent animate-[shimmer_2s_infinite] pointer-events-none" />
      
      {showHeader && (
        <div className="flex items-center justify-between">
          <ShimmerSkeleton className="h-6 w-32" />
          <ShimmerSkeleton className="h-8 w-8 rounded-full" />
        </div>
      )}
      
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <ShimmerSkeleton className="h-10 w-10 rounded-full shrink-0" />
            <div className="flex-1 space-y-2">
              <ShimmerSkeleton className="h-4 w-3/4" />
              <ShimmerSkeleton className="h-3 w-1/2" />
            </div>
            <ShimmerSkeleton className="h-4 w-16" />
          </div>
        ))}
      </div>

      {showFooter && (
        <div className="pt-2 border-t border-border/50">
          <ShimmerSkeleton className="h-10 w-full" />
        </div>
      )}
    </div>
  );
}

export function SkeletonTable({ 
  rows = 5,
  columns = 4,
  className 
}: { 
  rows?: number; 
  columns?: number;
  className?: string;
}) {
  return (
    <div className={cn('space-y-3', className)}>
      {/* Header */}
      <div className="flex gap-4 px-4 py-2">
        {Array.from({ length: columns }).map((_, i) => (
          <ShimmerSkeleton 
            key={i} 
            className={cn(
              'h-4',
              i === 0 ? 'w-32' : 'flex-1'
            )} 
          />
        ))}
      </div>
      
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div 
          key={rowIndex} 
          className="flex items-center gap-4 px-4 py-3 rounded-lg bg-muted/20 relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/5 to-transparent animate-[shimmer_2s_infinite] pointer-events-none" style={{ animationDelay: `${rowIndex * 100}ms` }} />
          <div className="flex items-center gap-2 w-32">
            <ShimmerSkeleton className="h-8 w-8 rounded-full" />
            <ShimmerSkeleton className="h-4 w-16" />
          </div>
          {Array.from({ length: columns - 1 }).map((_, colIndex) => (
            <ShimmerSkeleton key={colIndex} className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function SkeletonSwapCard({ className }: { className?: string }) {
  return (
    <div className={cn('glass-card p-4 sm:p-6 space-y-4 relative overflow-hidden', className)}>
      {/* Shimmer overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/5 to-transparent animate-[shimmer_2s_infinite] pointer-events-none" />
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <ShimmerSkeleton className="h-6 w-16" />
        <ShimmerSkeleton className="h-8 w-8 rounded-full" />
      </div>

      {/* Token Input 1 */}
      <div className="p-4 rounded-xl bg-muted/30 space-y-2">
        <div className="flex justify-between">
          <ShimmerSkeleton className="h-3 w-12" />
          <ShimmerSkeleton className="h-3 w-24" />
        </div>
        <div className="flex items-center gap-3">
          <ShimmerSkeleton className="h-8 flex-1" />
          <ShimmerSkeleton className="h-10 w-24 rounded-lg" />
        </div>
      </div>

      {/* Switch Button */}
      <div className="flex justify-center">
        <ShimmerSkeleton className="h-10 w-10 rounded-full" />
      </div>

      {/* Token Input 2 */}
      <div className="p-4 rounded-xl bg-muted/30 space-y-2">
        <div className="flex justify-between">
          <ShimmerSkeleton className="h-3 w-12" />
          <ShimmerSkeleton className="h-3 w-24" />
        </div>
        <div className="flex items-center gap-3">
          <ShimmerSkeleton className="h-8 flex-1" />
          <ShimmerSkeleton className="h-10 w-24 rounded-lg" />
        </div>
      </div>

      {/* Swap Button */}
      <ShimmerSkeleton className="h-14 w-full rounded-lg" />
    </div>
  );
}

export function SkeletonPoolRow() {
  return (
    <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/20 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/5 to-transparent animate-[shimmer_2s_infinite] pointer-events-none" />
      <div className="flex -space-x-2">
        <ShimmerSkeleton className="h-8 w-8 rounded-full" />
        <ShimmerSkeleton className="h-8 w-8 rounded-full" />
      </div>
      <ShimmerSkeleton className="h-4 w-20" />
      <ShimmerSkeleton className="h-4 flex-1" />
      <ShimmerSkeleton className="h-4 w-16" />
      <ShimmerSkeleton className="h-4 w-16" />
    </div>
  );
}

// Farm card skeleton
export function SkeletonFarmCard({ className }: { className?: string }) {
  return (
    <div className={cn('glass-card p-5 space-y-4 relative overflow-hidden', className)}>
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/5 to-transparent animate-[shimmer_2s_infinite] pointer-events-none" />
      
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex -space-x-3">
            <ShimmerSkeleton className="w-11 h-11 rounded-full" />
            <ShimmerSkeleton className="w-11 h-11 rounded-full" />
          </div>
          <div className="space-y-2">
            <ShimmerSkeleton className="h-5 w-24" />
            <ShimmerSkeleton className="h-4 w-16" />
          </div>
        </div>
        <ShimmerSkeleton className="h-7 w-14 rounded-md" />
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-muted/30 rounded-xl p-3 space-y-2">
          <ShimmerSkeleton className="h-3 w-20" />
          <ShimmerSkeleton className="h-5 w-16" />
        </div>
        <div className="bg-muted/30 rounded-xl p-3 space-y-2">
          <ShimmerSkeleton className="h-3 w-12" />
          <ShimmerSkeleton className="h-5 w-14" />
        </div>
      </div>

      {/* User Stats */}
      <div className="bg-primary/10 rounded-xl p-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <ShimmerSkeleton className="h-3 w-16" />
            <ShimmerSkeleton className="h-4 w-20" />
          </div>
          <div className="space-y-2">
            <ShimmerSkeleton className="h-3 w-12" />
            <ShimmerSkeleton className="h-4 w-24" />
          </div>
        </div>
      </div>

      {/* Button */}
      <ShimmerSkeleton className="h-10 w-full rounded-md" />
    </div>
  );
}

// Stats card skeleton
export function SkeletonStatCard({ className }: { className?: string }) {
  return (
    <div className={cn('glass-card p-4 text-center relative overflow-hidden', className)}>
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/5 to-transparent animate-[shimmer_2s_infinite] pointer-events-none" />
      <ShimmerSkeleton className="h-8 w-20 mx-auto mb-2" />
      <ShimmerSkeleton className="h-4 w-24 mx-auto" />
    </div>
  );
}