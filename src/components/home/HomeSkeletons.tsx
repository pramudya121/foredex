import { memo } from 'react';
import { cn } from '@/lib/utils';

// Premium shimmer effect skeleton
const ShimmerSkeleton = memo(function ShimmerSkeleton({ className }: { className?: string }) {
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
});

// Stat card skeleton
export const StatCardSkeleton = memo(function StatCardSkeleton({ delay = 0 }: { delay?: number }) {
  return (
    <div 
      className="glass-card p-6 text-center relative overflow-hidden rounded-2xl"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/5 to-transparent animate-[shimmer_2s_infinite] pointer-events-none" />
      
      {/* Icon placeholder */}
      <div className="flex justify-center mb-3">
        <ShimmerSkeleton className="w-10 h-10 rounded-xl" />
      </div>
      
      {/* Value placeholder */}
      <ShimmerSkeleton className="h-9 w-20 mx-auto mb-2" />
      
      {/* Label placeholder */}
      <ShimmerSkeleton className="h-4 w-24 mx-auto" />
    </div>
  );
});

// Feature card skeleton
export const FeatureCardSkeleton = memo(function FeatureCardSkeleton({ delay = 0 }: { delay?: number }) {
  return (
    <div 
      className="glass-card p-6 rounded-xl relative overflow-hidden"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/5 to-transparent animate-[shimmer_2s_infinite] pointer-events-none" style={{ animationDelay: `${delay}ms` }} />
      
      {/* Title */}
      <ShimmerSkeleton className="h-6 w-32 mb-3" />
      
      {/* Description lines */}
      <ShimmerSkeleton className="h-4 w-full mb-2" />
      <ShimmerSkeleton className="h-4 w-3/4" />
    </div>
  );
});

// Hero section skeleton
export const HeroSkeleton = memo(function HeroSkeleton() {
  return (
    <div className="space-y-6 sm:space-y-8 animate-pulse">
      {/* Badge */}
      <ShimmerSkeleton className="h-10 w-48 rounded-full" />
      
      {/* Headline */}
      <div className="space-y-4">
        <ShimmerSkeleton className="h-14 w-64 sm:h-20 sm:w-80" />
        <ShimmerSkeleton className="h-6 w-full max-w-xl" />
        <ShimmerSkeleton className="h-6 w-3/4 max-w-md" />
      </div>
      
      {/* CTA Buttons */}
      <div className="flex flex-wrap gap-4 pt-2">
        <ShimmerSkeleton className="h-14 w-40 rounded-xl" />
        <ShimmerSkeleton className="h-14 w-36 rounded-xl" />
      </div>
      
      {/* Feature badges */}
      <div className="flex flex-wrap items-center gap-4 sm:gap-6 pt-4">
        <ShimmerSkeleton className="h-8 w-28" />
        <ShimmerSkeleton className="h-8 w-32" />
        <ShimmerSkeleton className="h-8 w-24" />
      </div>
    </div>
  );
});

// Token carousel skeleton
export const CarouselSkeleton = memo(function CarouselSkeleton() {
  return (
    <div className="relative w-full max-w-md aspect-square">
      {/* Central token */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
        <div className="relative">
          <ShimmerSkeleton className="w-24 h-24 sm:w-32 sm:h-32 rounded-full" />
          <div className="absolute inset-0 rounded-full bg-primary/10 animate-pulse" />
        </div>
      </div>
      
      {/* Orbiting tokens */}
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
          style={{
            transform: `translate(-50%, -50%) rotate(${i * 60}deg) translateX(140px)`,
          }}
        >
          <ShimmerSkeleton className="w-12 h-12 sm:w-16 sm:h-16 rounded-full" />
        </div>
      ))}
    </div>
  );
});

// Stats section skeleton
export const StatsSectionSkeleton = memo(function StatsSectionSkeleton() {
  return (
    <section className="container px-4 py-12 sm:py-16">
      <div className="text-center mb-10 sm:mb-12">
        <ShimmerSkeleton className="h-10 w-64 mx-auto mb-3" />
        <ShimmerSkeleton className="h-5 w-80 mx-auto" />
      </div>
      
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
        {[0, 1, 2, 3].map((i) => (
          <StatCardSkeleton key={i} delay={i * 100} />
        ))}
      </div>
    </section>
  );
});

// Features section skeleton
export const FeaturesSectionSkeleton = memo(function FeaturesSectionSkeleton() {
  return (
    <section className="container px-4 py-12 sm:py-16">
      <div className="text-center mb-10 sm:mb-12">
        <ShimmerSkeleton className="h-10 w-72 mx-auto mb-3" />
        <ShimmerSkeleton className="h-5 w-96 mx-auto" />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[0, 1, 2, 3].map((i) => (
          <FeatureCardSkeleton key={i} delay={i * 100} />
        ))}
      </div>
    </section>
  );
});
