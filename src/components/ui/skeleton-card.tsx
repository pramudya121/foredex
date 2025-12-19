import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

interface SkeletonCardProps {
  className?: string;
  rows?: number;
  showHeader?: boolean;
  showFooter?: boolean;
}

export function SkeletonCard({ 
  className, 
  rows = 3, 
  showHeader = true,
  showFooter = false 
}: SkeletonCardProps) {
  return (
    <div className={cn('glass-card p-4 sm:p-6 space-y-4', className)}>
      {showHeader && (
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>
      )}
      
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-full shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </div>

      {showFooter && (
        <div className="pt-2 border-t border-border/50">
          <Skeleton className="h-10 w-full" />
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
          <Skeleton 
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
          className="flex items-center gap-4 px-4 py-3 rounded-lg bg-muted/20"
        >
          <div className="flex items-center gap-2 w-32">
            <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className="h-4 w-16" />
          </div>
          {Array.from({ length: columns - 1 }).map((_, colIndex) => (
            <Skeleton key={colIndex} className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function SkeletonSwapCard({ className }: { className?: string }) {
  return (
    <div className={cn('glass-card p-4 sm:p-6 space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-6 w-16" />
        <Skeleton className="h-8 w-8 rounded-full" />
      </div>

      {/* Token Input 1 */}
      <div className="p-4 rounded-xl bg-muted/30 space-y-2">
        <div className="flex justify-between">
          <Skeleton className="h-3 w-12" />
          <Skeleton className="h-3 w-24" />
        </div>
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 flex-1" />
          <Skeleton className="h-10 w-24 rounded-lg" />
        </div>
      </div>

      {/* Switch Button */}
      <div className="flex justify-center">
        <Skeleton className="h-10 w-10 rounded-full" />
      </div>

      {/* Token Input 2 */}
      <div className="p-4 rounded-xl bg-muted/30 space-y-2">
        <div className="flex justify-between">
          <Skeleton className="h-3 w-12" />
          <Skeleton className="h-3 w-24" />
        </div>
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 flex-1" />
          <Skeleton className="h-10 w-24 rounded-lg" />
        </div>
      </div>

      {/* Swap Button */}
      <Skeleton className="h-14 w-full rounded-lg" />
    </div>
  );
}

export function SkeletonPoolRow() {
  return (
    <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/20 animate-pulse">
      <div className="flex -space-x-2">
        <Skeleton className="h-8 w-8 rounded-full" />
        <Skeleton className="h-8 w-8 rounded-full" />
      </div>
      <Skeleton className="h-4 w-20" />
      <Skeleton className="h-4 flex-1" />
      <Skeleton className="h-4 w-16" />
      <Skeleton className="h-4 w-16" />
    </div>
  );
}