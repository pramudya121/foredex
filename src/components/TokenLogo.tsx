import { useState, forwardRef } from 'react';
import { cn } from '@/lib/utils';
import { TOKEN_LIST } from '@/config/contracts';

interface TokenLogoProps {
  symbol: string;
  logoURI?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeClasses = {
  sm: 'w-6 h-6 text-xs',
  md: 'w-8 h-8 text-sm',
  lg: 'w-10 h-10 text-base',
  xl: 'w-12 h-12 text-lg',
};

// Get logo URI from TOKEN_LIST based on symbol
const getLogoFromSymbol = (symbol: string): string | undefined => {
  const token = TOKEN_LIST.find(
    t => t.symbol.toLowerCase() === symbol.toLowerCase()
  );
  return token?.logoURI;
};

export const TokenLogo = forwardRef<HTMLImageElement | HTMLDivElement, TokenLogoProps>(
  ({ symbol, logoURI, size = 'md', className }, ref) => {
    const [imageError, setImageError] = useState(false);

    // Try to get logo from TOKEN_LIST if not provided
    const finalLogoURI = logoURI || getLogoFromSymbol(symbol);

    if (finalLogoURI && !imageError) {
      return (
        <img
          ref={ref as React.Ref<HTMLImageElement>}
          src={finalLogoURI}
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
        ref={ref as React.Ref<HTMLDivElement>}
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
);

TokenLogo.displayName = 'TokenLogo';
