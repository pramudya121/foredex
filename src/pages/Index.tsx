import { memo, forwardRef } from 'react';
import { SwapCard } from '@/components/SwapCard';
import { LimitOrderPanel } from '@/components/LimitOrderPanel';
import { OnboardingTutorial } from '@/components/OnboardingTutorial';
import { Zap, Shield, TrendingUp, Sparkles, ArrowRightLeft, Target, BarChart3, Clock, Coins } from 'lucide-react';
import { ConnectionStatus } from '@/components/LivePriceIndicator';
import { useRealtimePrices } from '@/hooks/useRealtimePrices';

import wolfLogo from '@/assets/wolf-logo.png';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Premium UI Components
import { Spotlight } from '@/components/ui/spotlight';
import { ShimmerButton } from '@/components/ui/shimmer-button';
import { RotatingLogo } from '@/components/ui/rotating-logo';
import { NumberTicker } from '@/components/ui/number-ticker';
import { BorderBeam } from '@/components/ui/border-beam';
import { MovingBorder } from '@/components/ui/moving-border';
import { ScrollReveal, RevealSection } from '@/components/ui/scroll-reveal';
import { cn } from '@/lib/utils';

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
        className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-xs sm:text-sm hover-lift transition-all duration-300 hover:bg-primary/15 hover:border-primary/30"
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
  icon?: React.ElementType;
}

const StatCard = memo(forwardRef<HTMLDivElement, StatCardProps>(
  function StatCard({ value, label, prefix = "", suffix = "", delay = 0, decimalPlaces = 0, icon: Icon }, ref) {
    return (
      <div 
        ref={ref}
        className="glass-card p-4 text-center hover-lift card-glow relative overflow-hidden group transition-all duration-300 hover:border-primary/30"
      >
        <BorderBeam size={80} duration={10} delay={delay / 1000} />
        
        {Icon && (
          <div className="flex justify-center mb-2">
            <div className="p-2 rounded-lg bg-primary/10 text-primary group-hover:bg-primary/20 transition-colors">
              <Icon className="w-4 h-4" />
            </div>
          </div>
        )}
        
        <p className="text-xl sm:text-2xl font-bold text-primary">
          <NumberTicker value={value} prefix={prefix} suffix={suffix} delay={delay} decimalPlaces={decimalPlaces} />
        </p>
        <p className="text-xs text-muted-foreground mt-1">{label}</p>
      </div>
    );
  }
));

StatCard.displayName = 'StatCard';

// Trading info card
const TradingInfoCard = memo(function TradingInfoCard({ 
  icon: Icon, 
  title, 
  description 
}: { 
  icon: React.ElementType; 
  title: string; 
  description: string;
}) {
  return (
    <div className="glass-card p-4 rounded-xl hover:border-primary/30 transition-all duration-300 group">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-primary/10 text-primary group-hover:bg-primary/20 transition-colors shrink-0">
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <h4 className="font-semibold text-sm mb-1 group-hover:text-primary transition-colors">{title}</h4>
          <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
        </div>
      </div>
    </div>
  );
});

const Index = () => {
  const { isConnected } = useRealtimePrices();

  return (
    <Spotlight className="min-h-screen">
      <main className="container py-6 sm:py-8 md:py-12 px-3 sm:px-4 relative">
        {/* Ambient background effects */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-1/4 w-72 h-72 bg-primary/5 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-20 right-1/4 w-96 h-96 bg-primary/3 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        </div>

        {/* Hero Section */}
        <div className="text-center mb-8 sm:mb-10 relative">
          {/* 3D Rotating Wolf Logo */}
          <ScrollReveal direction="scale" duration={800}>
            <div className="relative inline-block mb-6">
              <RotatingLogo 
                src={wolfLogo} 
                alt="FOREDEX" 
                size="lg"
                enableHover={true}
              />
            </div>
          </ScrollReveal>

          <ScrollReveal direction="up" delay={100}>
            <div className="flex items-center justify-center gap-2 mb-3">
              <Sparkles className="w-5 h-5 text-primary animate-pulse" />
              <span className="text-xs text-primary font-medium tracking-wider uppercase">Decentralized Exchange</span>
              <Sparkles className="w-5 h-5 text-primary animate-pulse" />
            </div>
          </ScrollReveal>
          
          <ScrollReveal direction="up" delay={200}>
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-4">
              Trade with the <span className="gradient-text animate-shimmer">Pack</span>
            </h1>
          </ScrollReveal>
          
          <ScrollReveal direction="up" delay={300}>
            <p className="text-sm sm:text-base md:text-lg text-muted-foreground max-w-xl mx-auto mb-6 px-2">
              Swap tokens instantly on Nexus Testnet with low fees and lightning-fast transactions.
            </p>
          </ScrollReveal>

          {/* Feature Badges */}
          <ScrollReveal direction="up" delay={400}>
            <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 mb-6">
              <FeatureBadge icon={Zap} text="Instant Swaps" delay={100} />
              <FeatureBadge icon={Shield} text="Secure Trading" delay={200} />
              <FeatureBadge icon={TrendingUp} text="Best Rates" delay={300} />
              <ConnectionStatus isConnected={isConnected} />
            </div>
          </ScrollReveal>
        </div>

        {/* Main Trading Area */}
        <div className="grid lg:grid-cols-3 gap-6 items-start">
          {/* Left sidebar - Trading Info */}
          <div className="hidden lg:block space-y-4">
            <RevealSection>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-primary" />
                Why Trade Here
              </h3>
              <div className="space-y-3">
                <TradingInfoCard 
                  icon={Zap} 
                  title="Lightning Fast" 
                  description="Execute trades in seconds with minimal confirmation times on Nexus Network."
                />
                <TradingInfoCard 
                  icon={Shield} 
                  title="Secure & Audited" 
                  description="Battle-tested smart contracts with comprehensive security measures."
                />
                <TradingInfoCard 
                  icon={Coins} 
                  title="Low Fees" 
                  description="Only 0.3% trading fee with no hidden costs or withdrawal fees."
                />
                <TradingInfoCard 
                  icon={Clock} 
                  title="24/7 Trading" 
                  description="Trade anytime, anywhere with our fully decentralized platform."
                />
              </div>
            </RevealSection>
          </div>

          {/* Center - Main Swap Card */}
          <div className="lg:col-span-1 flex justify-center relative">
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-80 h-80 bg-primary/10 rounded-full blur-3xl animate-pulse" />
            </div>
            
            <ScrollReveal direction="scale" duration={600}>
              <div className="w-full max-w-md relative">
                <div className="glass-card p-1 rounded-2xl">
                  <Tabs defaultValue="swap" className="w-full">
                    <TabsList className="w-full grid grid-cols-2 mb-1">
                      <TabsTrigger value="swap" className="gap-2 data-[state=active]:bg-primary/20">
                        <ArrowRightLeft className="w-4 h-4" />
                        Market
                      </TabsTrigger>
                      <TabsTrigger value="limit" className="gap-2 data-[state=active]:bg-primary/20">
                        <Target className="w-4 h-4" />
                        Limit
                      </TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="swap" className="mt-2">
                      <MovingBorder 
                        duration={4000} 
                        borderRadius="1rem"
                        className="p-0"
                      >
                        <SwapCard />
                      </MovingBorder>
                    </TabsContent>
                    
                    <TabsContent value="limit" className="mt-2">
                      <div className="glass-card p-4 rounded-xl border border-border/50">
                        <LimitOrderPanel />
                      </div>
                    </TabsContent>
                  </Tabs>
                </div>
              </div>
            </ScrollReveal>
          </div>

          {/* Right sidebar - Stats */}
          <div className="hidden lg:block space-y-4">
            <RevealSection>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                Platform Stats
              </h3>
              <div className="grid grid-cols-1 gap-3">
                <StatCard value={12} prefix="$" suffix="M+" label="Total Value Locked" icon={Coins} delay={0} />
                <StatCard value={50} suffix="K+" label="Total Trades" icon={ArrowRightLeft} delay={100} />
                <StatCard value={0.3} suffix="%" label="Trading Fee" decimalPlaces={1} icon={TrendingUp} delay={200} />
                <StatCard value={1000} suffix="+" label="Active Traders" icon={Shield} delay={300} />
              </div>
            </RevealSection>
          </div>
        </div>

        {/* Mobile Stats Section */}
        <RevealSection className="mt-10 lg:hidden">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard value={12} prefix="$" suffix="M+" label="TVL" icon={Coins} delay={0} />
            <StatCard value={50} suffix="K+" label="Trades" icon={ArrowRightLeft} delay={100} />
            <StatCard value={0.3} suffix="%" label="Fees" decimalPlaces={1} icon={TrendingUp} delay={200} />
            <StatCard value={1000} suffix="+" label="Users" icon={Shield} delay={300} />
          </div>
        </RevealSection>

        {/* CTA Section */}
        <RevealSection className="mt-12 text-center">
          <div className="glass-card p-6 sm:p-8 rounded-2xl max-w-2xl mx-auto relative overflow-hidden">
            <BorderBeam size={150} duration={12} />
            
            <h3 className="text-xl sm:text-2xl font-bold mb-3">
              Ready to <span className="text-primary">Start Trading</span>?
            </h3>
            <p className="text-sm text-muted-foreground mb-5 max-w-md mx-auto">
              Connect your wallet and start swapping tokens with the best rates on Nexus Network.
            </p>
            <ShimmerButton className="px-8 py-3 text-base font-semibold group">
              <ArrowRightLeft className="w-5 h-5 mr-2 group-hover:rotate-180 transition-transform duration-500" />
              Connect & Trade
            </ShimmerButton>
          </div>
        </RevealSection>

        {/* Onboarding Tutorial */}
        <OnboardingTutorial />
      </main>
    </Spotlight>
  );
};

export default memo(Index);
