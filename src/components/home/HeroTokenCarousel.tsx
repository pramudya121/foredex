import { memo, useState, useEffect } from 'react';
import { TOKEN_LIST } from '@/config/contracts';
import { RotatingLogo } from '@/components/ui/rotating-logo';
import { cn } from '@/lib/utils';

// Filter tokens that have logos (exclude NEX which has no real logo)
const HERO_TOKENS = TOKEN_LIST.filter(t => 
  t.address !== '0x0000000000000000000000000000000000000000' && 
  t.logoURI
).slice(0, 8);

export const HeroTokenCarousel = memo(function HeroTokenCarousel() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setIsTransitioning(true);
      setTimeout(() => {
        setActiveIndex((prev) => (prev + 1) % HERO_TOKENS.length);
        setIsTransitioning(false);
      }, 300);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const activeToken = HERO_TOKENS[activeIndex];

  return (
    <div className="relative flex flex-col items-center">
      {/* Main token display */}
      <div className="relative">
        {/* Outer glow ring */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-72 h-72 sm:w-80 sm:h-80 bg-primary/20 rounded-full blur-[80px] animate-pulse" />
        </div>
        
        {/* Token container with rotating border */}
        <div className="relative p-8 sm:p-10 rounded-full border-2 border-primary/30 bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-xl">
          {/* Rotating border effect */}
          <div 
            className="absolute inset-0 rounded-full border border-primary/50" 
            style={{ 
              animation: 'spin 8s linear infinite',
              background: 'conic-gradient(from 0deg, transparent, hsl(var(--primary) / 0.3), transparent)'
            }} 
          />
          
          {/* Secondary rotating ring */}
          <div 
            className="absolute inset-2 rounded-full border border-primary/20" 
            style={{ animation: 'spin 12s linear infinite reverse' }} 
          />
          
          {/* Token logo */}
          <div className={cn(
            "transition-all duration-300",
            isTransitioning ? "opacity-0 scale-90" : "opacity-100 scale-100"
          )}>
            <RotatingLogo 
              src={activeToken?.logoURI || '/tokens/weth.png'} 
              alt={activeToken?.symbol || 'Token'}
              size="xl"
              enableHover={true}
            />
          </div>
        </div>
        
        {/* Token label */}
        <div className={cn(
          "absolute -bottom-4 left-1/2 -translate-x-1/2",
          "px-4 py-1.5 rounded-full bg-card border border-border/50 backdrop-blur-sm",
          "transition-all duration-300",
          isTransitioning ? "opacity-0 translate-y-2" : "opacity-100 translate-y-0"
        )}>
          <span className="text-sm font-bold text-primary">{activeToken?.symbol}</span>
        </div>
      </div>

      {/* Token indicators */}
      <div className="flex items-center gap-2 mt-8">
        {HERO_TOKENS.map((token, index) => (
          <button
            key={token.address}
            onClick={() => {
              setIsTransitioning(true);
              setTimeout(() => {
                setActiveIndex(index);
                setIsTransitioning(false);
              }, 300);
            }}
            className={cn(
              "w-2 h-2 rounded-full transition-all duration-300",
              index === activeIndex 
                ? "bg-primary w-6" 
                : "bg-muted hover:bg-muted-foreground/50"
            )}
            aria-label={`Show ${token.symbol}`}
          />
        ))}
      </div>

      {/* Orbiting small tokens */}
      <div className="absolute inset-0 pointer-events-none hidden sm:block">
        {HERO_TOKENS.slice(0, 4).map((token, index) => (
          <div
            key={token.address}
            className={cn(
              "absolute top-1/2 left-1/2 w-10 h-10 -ml-5 -mt-5",
              "rounded-full bg-card/90 border border-border/50",
              "flex items-center justify-center",
              "shadow-lg backdrop-blur-sm",
              "animate-orbit",
              index !== activeIndex ? "opacity-70" : "opacity-0"
            )}
            style={{
              animationDuration: `${20 + index * 5}s`,
              animationDelay: `${index * -5}s`,
            }}
          >
            <img 
              src={token.logoURI} 
              alt={token.symbol}
              width={24}
              height={24}
              loading="lazy"
              className="w-6 h-6 rounded-full object-cover"
            />
          </div>
        ))}
      </div>
    </div>
  );
});
