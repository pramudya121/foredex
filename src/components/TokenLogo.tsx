import { useState } from 'react';
import { cn } from '@/lib/utils';

interface TokenLogoProps {
  symbol: string;
  logoURI?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  sm: 'w-6 h-6 text-xs',
  md: 'w-8 h-8 text-sm',
  lg: 'w-10 h-10 text-base',
};

export function TokenLogo({ symbol, logoURI, size = 'md', className }: TokenLogoProps) {
  const [imageError, setImageError] = useState(false);

  if (logoURI && !imageError) {
    return (
      <img
        src={logoURI}
        alt={symbol}
        className={cn(
          'rounded-full object-cover',
          sizeClasses[size],
          className
        )}
        onError={() => setImageError(true)}
      />
    );
  }

  // Fallback to letter avatar
  return (
    <div
      className={cn(
        'rounded-full bg-primary/20 flex items-center justify-center font-bold',
        sizeClasses[size],
        className
      )}
    >
      {symbol[0]}
    </div>
  );
}
