import { memo } from 'react';
import { SwapCard } from '@/components/SwapCard';
import { OnboardingTutorial } from '@/components/OnboardingTutorial';
import { Zap, Shield, TrendingUp, Sparkles, ArrowRightLeft } from 'lucide-react';
import { ConnectionStatus } from '@/components/LivePriceIndicator';
import { useRealtimePrices } from '@/hooks/useRealtimePrices';

import wolfLogo from '@/assets/wolf-logo.png';

// Premium UI Components
import { Spotlight } from '@/components/ui/spotlight';
import { ShimmerButton } from '@/components/ui/shimmer-button';
import { RotatingLogo } from '@/components/ui/rotating-logo';
import { NumberTicker } from '@/components/ui/number-ticker';
import { BorderBeam } from '@/components/ui/border-beam';
import { MovingBorder } from '@/components/ui/moving-border';
import { ScrollReveal, RevealSection } from '@/components/ui/scroll-reveal';

const FeatureBadge = memo(function FeatureBadge({ 
  icon: Icon, 
  text 
}: { 
  icon: React.ElementType; 
  text: string;
}) {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-xs sm:text-sm hover-lift transition-all duration-300 hover:bg-primary/15 hover:border-primary/30">
      <Icon className="w-3.5 h-3.5 text-primary" />
      <span className="text-muted-foreground">{text}</span>
    </div>
  );
});

const StatCard = memo(function StatCard({ 
  value, 
  label, 
  prefix = "", 
  suffix = "", 
  delay = 0, 
  decimalPlaces = 0,
}: { 
  value: number; 
  label: string; 
  prefix?: string; 
  suffix?: string; 
  delay?: number; 
  decimalPlaces?: number;
}) {
  return (
    <div className="glass-card p-4 text-center hover-lift relative overflow-hidden group transition-all duration-300 hover:border-primary/30">
      <BorderBeam size={80} duration={10} delay={delay / 1000} />
      <p className="text-xl sm:text-2xl font-bold text-primary">
        <NumberTicker value={value} prefix={prefix} suffix={suffix} delay={delay} decimalPlaces={decimalPlaces} />
      </p>
      <p className="text-xs text-muted-foreground mt-1">{label}</p>
    </div>
  );
});

const Index = () => {
  const { isConnected, isWsConnected } = useRealtimePrices();

  return (
    <Spotlight className="min-h-screen">
      <main className="container py-6 sm:py-8 md:py-12 px-3 sm:px-4 relative">
        {/* Ambient background effects */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-1/4 w-72 h-72 bg-primary/5 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-20 right-1/4 w-96 h-96 bg-primary/3 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        </div>

        {/* Hero Section */}
        <div className="text-center mb-8 relative">
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
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4">
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
              <FeatureBadge icon={Zap} text="Instant Swaps" />
              <FeatureBadge icon={Shield} text="Secure Trading" />
              <FeatureBadge icon={TrendingUp} text="Best Rates" />
              <ConnectionStatus isConnected={isConnected} isWsConnected={isWsConnected} />
            </div>
          </ScrollReveal>
        </div>

        {/* Main Trading Area - Centered */}
        <div className="flex justify-center relative">
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-80 h-80 bg-primary/10 rounded-full blur-3xl animate-pulse" />
          </div>
          
          <ScrollReveal direction="scale" duration={600}>
            <div className="w-full max-w-md relative">
              <MovingBorder 
                duration={4000} 
                borderRadius="1rem"
                className="p-0"
              >
                <SwapCard />
              </MovingBorder>
            </div>
          </ScrollReveal>
        </div>

        {/* Stats Section */}
        <RevealSection className="mt-10">
          <div className="grid grid-cols-3 gap-3 max-w-md mx-auto">
            <StatCard value={12} prefix="$" suffix="M+" label="TVL" delay={0} />
            <StatCard value={50} suffix="K+" label="Trades" delay={100} />
            <StatCard value={0.3} suffix="%" label="Fees" decimalPlaces={1} delay={200} />
          </div>
        </RevealSection>

        {/* CTA Section */}
        <RevealSection className="mt-10 text-center">
          <div className="glass-card p-6 rounded-2xl max-w-md mx-auto relative overflow-hidden">
            <BorderBeam size={120} duration={12} />
            <h3 className="text-lg font-bold mb-2">
              Ready to <span className="text-primary">Trade</span>?
            </h3>
            <p className="text-xs text-muted-foreground mb-4">
              Connect your wallet to start swapping tokens.
            </p>
            <ShimmerButton className="px-6 py-2.5 text-sm font-semibold group">
              <ArrowRightLeft className="w-4 h-4 mr-2 group-hover:rotate-180 transition-transform duration-500" />
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
