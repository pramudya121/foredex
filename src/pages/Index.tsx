import { memo, forwardRef, useMemo } from 'react';
import { SwapCard } from '@/components/SwapCard';
import { Zap, Shield, TrendingUp, Sparkles, ArrowRightLeft } from 'lucide-react';
import { ConnectionStatus } from '@/components/LivePriceIndicator';
import { useRealtimePrices } from '@/hooks/useRealtimePrices';
import { TOKEN_LIST } from '@/config/contracts';
import { TokenLogo } from '@/components/TokenLogo';
import wolfLogo from '@/assets/wolf-logo.png';

// Premium UI Components
import { Spotlight } from '@/components/ui/spotlight';
import { ShimmerButton } from '@/components/ui/shimmer-button';
import { RotatingLogo } from '@/components/ui/rotating-logo';
import { Marquee } from '@/components/ui/marquee';
import { NumberTicker } from '@/components/ui/number-ticker';
import { BorderBeam } from '@/components/ui/border-beam';
import { MovingBorder } from '@/components/ui/moving-border';

interface FeatureBadgeProps {
  icon: React.ElementType;
  text: string;
  delay?: number;
}

const FeatureBadge = memo(forwardRef<HTMLDivElement, FeatureBadgeProps>(
  function FeatureBadge({ icon: Icon, text, delay = 0 }, ref) {
    return (
      <div 
        ref={ref}
        className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-xs sm:text-sm hover-lift animate-fade-in-up"
        style={{ animationDelay: `${delay}ms` }}
      >
        <Icon className="w-3.5 h-3.5 text-primary" />
        <span className="text-muted-foreground">{text}</span>
      </div>
    );
  }
));

FeatureBadge.displayName = 'FeatureBadge';

interface StatCardProps {
  value: number;
  label: string;
  prefix?: string;
  suffix?: string;
  delay?: number;
  decimalPlaces?: number;
}

const StatCard = memo(forwardRef<HTMLDivElement, StatCardProps>(
  function StatCard({ value, label, prefix = "", suffix = "", delay = 0, decimalPlaces = 0 }, ref) {
    return (
      <div 
        ref={ref}
        className="glass-card p-4 text-center hover-lift card-glow animate-fade-in-up relative overflow-hidden"
        style={{ animationDelay: `${delay}ms` }}
      >
        <BorderBeam size={80} duration={10} delay={delay / 1000} />
        <p className="text-xl sm:text-2xl font-bold text-primary">
          <NumberTicker value={value} prefix={prefix} suffix={suffix} delay={delay} decimalPlaces={decimalPlaces} />
        </p>
        <p className="text-xs text-muted-foreground mt-1">{label}</p>
      </div>
    );
  }
));

StatCard.displayName = 'StatCard';

// Token Price Ticker Item
const TokenTickerItem = memo(({ symbol, logoURI, price, change }: { 
  symbol: string; 
  logoURI?: string; 
  price: number; 
  change: number;
}) => (
  <div className="flex items-center gap-3 px-4 py-2 rounded-full bg-card/50 border border-border/30 mx-2">
    <TokenLogo symbol={symbol} logoURI={logoURI} size="sm" />
    <span className="font-medium text-sm">{symbol}</span>
    <span className="text-sm text-muted-foreground">${price.toFixed(4)}</span>
    <span className={`text-xs font-medium ${change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
      {change >= 0 ? '+' : ''}{change.toFixed(2)}%
    </span>
  </div>
));

TokenTickerItem.displayName = 'TokenTickerItem';

const Index = () => {
  const { isConnected } = useRealtimePrices();

  // Generate mock token prices for marquee
  const tokenPrices = useMemo(() => {
    return TOKEN_LIST
      .filter(t => t.address !== '0x0000000000000000000000000000000000000000')
      .map((token, i) => ({
        ...token,
        price: 1 + Math.random() * 10,
        change: (Math.random() - 0.5) * 20,
      }));
  }, []);

  return (
    <Spotlight className="min-h-screen">
      <main className="container py-6 sm:py-8 md:py-12 px-3 sm:px-4 relative">
        {/* Ambient background effects */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-1/4 w-72 h-72 bg-primary/5 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-20 right-1/4 w-96 h-96 bg-primary/3 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        </div>

        {/* Hero Section */}
        <div className="text-center mb-8 sm:mb-12 relative">
          {/* 3D Rotating Wolf Logo */}
          <div className="relative inline-block mb-6 sm:mb-8">
            <RotatingLogo 
              src={wolfLogo} 
              alt="FOREDEX" 
              size="xl"
              enableHover={true}
            />
          </div>

          <div className="animate-fade-in">
            <div className="flex items-center justify-center gap-2 mb-3">
              <Sparkles className="w-5 h-5 text-primary animate-pulse" />
              <span className="text-xs text-primary font-medium tracking-wider uppercase">Decentralized Exchange</span>
              <Sparkles className="w-5 h-5 text-primary animate-pulse" />
            </div>
            
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-4 sm:mb-5">
              Trade with the <span className="gradient-text animate-shimmer">Pack</span>
            </h1>
            
            <p className="text-sm sm:text-base md:text-lg text-muted-foreground max-w-xl mx-auto mb-6 px-2">
              Swap tokens instantly on Nexus Testnet with low fees and lightning-fast transactions.
            </p>
          </div>

          {/* Feature Badges */}
          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 mb-6">
            <FeatureBadge icon={Zap} text="Instant Swaps" delay={100} />
            <FeatureBadge icon={Shield} text="Secure Trading" delay={200} />
            <FeatureBadge icon={TrendingUp} text="Best Rates" delay={300} />
            <div className="animate-fade-in-up" style={{ animationDelay: '400ms' }}>
              <ConnectionStatus isConnected={isConnected} />
            </div>
          </div>

          {/* CTA Shimmer Button */}
          <div className="flex justify-center mb-8">
            <ShimmerButton className="px-8 py-3 text-base font-semibold">
              <ArrowRightLeft className="w-5 h-5 mr-2" />
              Start Trading Now
            </ShimmerButton>
          </div>
        </div>

        {/* Live Price Ticker Marquee */}
        <div className="mb-8 -mx-4 overflow-hidden">
          <div className="glass-card py-3 border-y border-x-0 rounded-none">
            <Marquee pauseOnHover speed={40}>
              {tokenPrices.map((token) => (
                <TokenTickerItem 
                  key={token.address}
                  symbol={token.symbol}
                  logoURI={token.logoURI}
                  price={token.price}
                  change={token.change}
                />
              ))}
            </Marquee>
          </div>
        </div>

        {/* Main Trading Area with Moving Border */}
        <div className="flex justify-center relative">
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-80 h-80 bg-primary/10 rounded-full blur-3xl animate-pulse" />
          </div>
          <div className="w-full max-w-md relative animate-scale-in">
            <MovingBorder 
              duration={4000} 
              borderRadius="1.5rem"
              className="p-0"
            >
              <SwapCard />
            </MovingBorder>
          </div>
        </div>

        {/* Stats Section with NumberTicker and BorderBeam */}
        <div className="mt-10 grid grid-cols-3 gap-3 max-w-md mx-auto">
          <StatCard value={12} prefix="$" suffix="M+" label="TVL" delay={500} />
          <StatCard value={50} suffix="K+" label="Trades" delay={600} />
          <StatCard value={0.3} suffix="%" label="Fees" delay={700} decimalPlaces={1} />
        </div>
      </main>
    </Spotlight>
  );
};

export default memo(Index);
