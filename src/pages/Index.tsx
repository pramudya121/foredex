import { memo, forwardRef } from 'react';
import { SwapCard } from '@/components/SwapCard';
import { Zap, Shield, TrendingUp, Sparkles } from 'lucide-react';
import { ConnectionStatus } from '@/components/LivePriceIndicator';
import { useRealtimePrices } from '@/hooks/useRealtimePrices';
import wolfLogo from '@/assets/wolf-logo.png';

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
        className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-xs sm:text-sm hover-lift animate-slide-up opacity-0"
        style={{ animationDelay: `${delay}ms`, animationFillMode: 'forwards' }}
      >
        <Icon className="w-3.5 h-3.5 text-primary" />
        <span className="text-muted-foreground">{text}</span>
      </div>
    );
  }
));

FeatureBadge.displayName = 'FeatureBadge';

interface StatCardProps {
  value: string;
  label: string;
  delay?: number;
}

const StatCard = memo(forwardRef<HTMLDivElement, StatCardProps>(
  function StatCard({ value, label, delay = 0 }, ref) {
    return (
      <div 
        ref={ref}
        className="glass-card p-4 text-center hover-lift card-glow animate-scale-in opacity-0"
        style={{ animationDelay: `${delay}ms`, animationFillMode: 'forwards' }}
      >
        <p className="text-xl sm:text-2xl font-bold text-primary animate-pulse-ring inline-block">{value}</p>
        <p className="text-xs text-muted-foreground mt-1">{label}</p>
      </div>
    );
  }
));

StatCard.displayName = 'StatCard';

const Index = () => {
  const { isConnected } = useRealtimePrices();

  return (
    <main className="container py-6 sm:py-8 md:py-12 px-3 sm:px-4 relative">
      {/* Ambient background effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-1/4 w-72 h-72 bg-primary/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-1/4 w-96 h-96 bg-primary/3 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      {/* Hero Section */}
      <div className="text-center mb-8 sm:mb-12 relative">
        {/* Animated glow rings behind logo */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 sm:w-48 sm:h-48">
          <div className="absolute inset-0 bg-primary/20 rounded-full blur-3xl animate-pulse" />
          <div className="absolute inset-4 bg-primary/10 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '0.5s' }} />
          <div className="absolute inset-8 bg-primary/5 rounded-full blur-xl animate-pulse" style={{ animationDelay: '1s' }} />
        </div>
        
        {/* Wolf Logo Animation */}
        <div className="relative inline-block mb-4 sm:mb-6">
          <div className="relative">
            <img 
              src={wolfLogo} 
              alt="FOREDEX" 
              className="w-16 h-16 sm:w-24 sm:h-24 mx-auto animate-wolf-breathe relative z-10 drop-shadow-2xl"
            />
            {/* Multiple glow layers */}
            <div className="absolute inset-0 bg-primary/40 blur-xl rounded-full animate-wolf-glow scale-110" />
            <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full animate-pulse scale-125" />
          </div>
          
          {/* Orbiting particles */}
          <div className="absolute inset-0 w-full h-full">
            <div className="absolute top-1/2 left-1/2 w-2 h-2 bg-primary rounded-full animate-orbit" style={{ animationDuration: '3s' }} />
            <div className="absolute top-1/2 left-1/2 w-1.5 h-1.5 bg-primary/70 rounded-full animate-orbit" style={{ animationDuration: '4s', animationDelay: '1s' }} />
            <div className="absolute top-1/2 left-1/2 w-1 h-1 bg-primary/50 rounded-full animate-orbit" style={{ animationDuration: '5s', animationDelay: '2s' }} />
          </div>
        </div>

        <div className="animate-fade-in">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Sparkles className="w-5 h-5 text-primary animate-pulse" />
            <span className="text-xs text-primary font-medium tracking-wider uppercase">Decentralized Exchange</span>
            <Sparkles className="w-5 h-5 text-primary animate-pulse" />
          </div>
          
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-3 sm:mb-4">
            Trade with the <span className="gradient-text animate-shimmer">Pack</span>
          </h1>
          
          <p className="text-sm sm:text-base md:text-lg text-muted-foreground max-w-xl mx-auto mb-4 sm:mb-6 px-2">
            Swap tokens instantly on Nexus Testnet with low fees and lightning-fast transactions.
          </p>
        </div>

        {/* Feature Badges with staggered animation */}
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 mb-4">
          <FeatureBadge icon={Zap} text="Instant Swaps" delay={100} />
          <FeatureBadge icon={Shield} text="Secure Trading" delay={200} />
          <FeatureBadge icon={TrendingUp} text="Best Rates" delay={300} />
          <div className="animate-slide-up opacity-0" style={{ animationDelay: '400ms', animationFillMode: 'forwards' }}>
            <ConnectionStatus isConnected={isConnected} />
          </div>
        </div>
      </div>

      {/* Main Trading Area - Centered with enhanced styling */}
      <div className="flex justify-center relative">
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-80 h-80 bg-primary/10 rounded-full blur-3xl animate-pulse" />
        </div>
        <div className="w-full max-w-md relative animate-scale-in">
          <SwapCard />
        </div>
      </div>

      {/* Stats Section with staggered animation */}
      <div className="mt-8 grid grid-cols-3 gap-3 max-w-md mx-auto">
        <StatCard value="$12M+" label="TVL" delay={500} />
        <StatCard value="50K+" label="Trades" delay={600} />
        <StatCard value="0.3%" label="Fees" delay={700} />
      </div>
    </main>
  );
};

export default memo(Index);
