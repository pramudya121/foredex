import { cn } from '@/lib/utils';

interface WolfSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  className?: string;
}

export function WolfSpinner({ size = 'md', text, className }: WolfSpinnerProps) {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-16 h-16',
    lg: 'w-24 h-24',
  };

  const ringSize = {
    sm: 'w-10 h-10',
    md: 'w-20 h-20',
    lg: 'w-28 h-28',
  };

  return (
    <div className={cn('flex flex-col items-center justify-center gap-4', className)}>
      <div className="relative">
        {/* Outer rotating ring */}
        <div className={cn(
          'absolute inset-0 flex items-center justify-center',
          ringSize[size]
        )}>
          <div className={cn(
            'absolute inset-0 rounded-full',
            'border-2 border-transparent border-t-primary border-r-primary/50',
            'animate-spin'
          )} style={{ animationDuration: '1s' }} />
        </div>

        {/* Middle pulsing ring */}
        <div className={cn(
          'absolute inset-0 flex items-center justify-center',
          ringSize[size]
        )}>
          <div className={cn(
            'absolute inset-1 rounded-full',
            'border border-primary/30',
            'animate-pulse'
          )} />
        </div>

        {/* Glow effect */}
        <div className={cn(
          'absolute inset-0 flex items-center justify-center',
          ringSize[size]
        )}>
          <div className={cn(
            'absolute inset-2 rounded-full',
            'bg-gradient-to-br from-primary/20 to-transparent',
            'blur-md animate-pulse'
          )} />
        </div>

        {/* Wolf logo container */}
        <div className={cn(
          'relative flex items-center justify-center',
          ringSize[size]
        )}>
          <div className={cn(
            'relative rounded-full overflow-hidden',
            'bg-gradient-to-br from-card to-background',
            'shadow-lg shadow-primary/20',
            'animate-wolf-breathe',
            sizeClasses[size]
          )}>
            <img 
              src="/wolf-logo.png" 
              alt="Loading..."
              width={96}
              height={96}
              loading="lazy"
              className={cn(
                'w-full h-full object-cover',
                'animate-wolf-glow'
              )}
            />
          </div>
        </div>

        {/* Orbiting particles */}
        <div className={cn(
          'absolute inset-0 flex items-center justify-center',
          ringSize[size]
        )}>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="absolute w-1.5 h-1.5 rounded-full bg-primary animate-orbit"
              style={{
                animationDelay: `${i * 0.3}s`,
                animationDuration: '2s',
              }}
            />
          ))}
        </div>
      </div>

      {text && (
        <p className={cn(
          'text-muted-foreground animate-pulse',
          size === 'sm' && 'text-xs',
          size === 'md' && 'text-sm',
          size === 'lg' && 'text-base'
        )}>
          {text}
        </p>
      )}
    </div>
  );
}

// Full page loading component
export function PageLoader({ text = 'Loading...' }: { text?: string }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <WolfSpinner size="lg" text={text} />
    </div>
  );
}

// Inline loading for components
export function InlineLoader({ text }: { text?: string }) {
  return (
    <div className="flex items-center justify-center py-12">
      <WolfSpinner size="md" text={text} />
    </div>
  );
}
