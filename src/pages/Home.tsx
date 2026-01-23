import { memo, lazy, Suspense } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRightLeft, BookOpen, Zap, Shield, TrendingUp, Wallet, Rocket, Globe, Users, LineChart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Spotlight } from '@/components/ui/spotlight';
import { ShimmerButton } from '@/components/ui/shimmer-button';
import { NumberTicker } from '@/components/ui/number-ticker';
import { BorderBeam } from '@/components/ui/border-beam';
import { TextGenerateEffect } from '@/components/ui/text-generate-effect';
import { HoverEffect } from '@/components/ui/hover-effect';
import { GlowingStarsBackgroundCard } from '@/components/ui/glowing-stars';
import { cn } from '@/lib/utils';

// Lazy load heavy components
const HeroTokenCarousel = lazy(() => import('@/components/home/HeroTokenCarousel').then(m => ({ default: m.HeroTokenCarousel })));
const PartnersSection = lazy(() => import('@/components/home/PartnersSection').then(m => ({ default: m.PartnersSection })));
const MobileFloatingDock = lazy(() => import('@/components/home/MobileFloatingDock').then(m => ({ default: m.MobileFloatingDock })));

// Feature cards data
const FEATURES = [
  {
    title: 'Instant Swaps',
    description: 'Trade tokens instantly with minimal slippage and low fees on Nexus Testnet.',
    link: '/swap',
  },
  {
    title: 'Add Liquidity',
    description: 'Provide liquidity to earn trading fees and rewards from every swap.',
    link: '/liquidity',
  },
  {
    title: 'Yield Farming',
    description: 'Stake your LP tokens to earn additional FRDX rewards.',
    link: '/farming',
  },
  {
    title: 'Analytics',
    description: 'Track your portfolio performance and market trends in real-time.',
    link: '/analytics',
  },
];

// Stats data
const STATS = [
  { value: 12, prefix: '$', suffix: 'M+', label: 'Total Value Locked', icon: Globe },
  { value: 50, suffix: 'K+', label: 'Total Trades', icon: ArrowRightLeft },
  { value: 0.3, suffix: '%', label: 'Trading Fee', decimalPlaces: 1, icon: TrendingUp },
  { value: 1000, suffix: '+', label: 'Active Users', icon: Users },
];

// Optimized Stat card with premium glow effect
const StatCard = memo(function StatCard({ 
  value, 
  label, 
  prefix = "", 
  suffix = "", 
  delay = 0, 
  decimalPlaces = 0,
  icon: Icon
}: {
  value: number;
  label: string;
  prefix?: string;
  suffix?: string;
  delay?: number;
  decimalPlaces?: number;
  icon?: React.ElementType;
}) {
  return (
    <div 
      className="relative group"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/50 to-primary/20 rounded-2xl blur opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      <div className="relative glass-card p-6 text-center hover-lift overflow-hidden rounded-2xl">
        <BorderBeam size={100} duration={12} delay={delay / 1000} />
        
        {Icon && (
          <div className="flex justify-center mb-3">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
              <Icon className="w-5 h-5" />
            </div>
          </div>
        )}
        
        <p className="text-2xl sm:text-3xl md:text-4xl font-bold text-primary mb-1 transition-transform group-hover:scale-110">
          <NumberTicker value={value} prefix={prefix} suffix={suffix} delay={delay} decimalPlaces={decimalPlaces} />
        </p>
        <p className="text-xs sm:text-sm text-muted-foreground">{label}</p>
      </div>
    </div>
  );
});

// Feature badge component
const FeatureBadge = memo(function FeatureBadge({ 
  icon: Icon, 
  text 
}: { 
  icon: React.ElementType; 
  text: string;
}) {
  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground group/badge">
      <div className="p-1.5 rounded-lg bg-primary/10 group-hover/badge:bg-primary/20 transition-colors">
        <Icon className="w-4 h-4 text-primary" />
      </div>
      <span className="group-hover/badge:text-foreground transition-colors">{text}</span>
    </div>
  );
});

// Loading placeholder
const CarouselLoader = memo(function CarouselLoader() {
  return (
    <div className="w-64 h-64 sm:w-80 sm:h-80 rounded-full bg-card/50 animate-pulse flex items-center justify-center">
      <div className="w-32 h-32 rounded-full bg-primary/20 animate-pulse" />
    </div>
  );
});

const Home = memo(function Home() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Ambient background effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-primary/3 rounded-full blur-[150px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/2 rounded-full blur-[200px]" />
      </div>

      <Spotlight className="min-h-screen relative z-10">
        <main className="relative">
          {/* Hero Section */}
          <section className="container px-4 py-12 sm:py-16 md:py-24 lg:py-32 relative">
            <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
              {/* Left Content */}
              <div className="space-y-6 sm:space-y-8 animate-fade-in">
                {/* Network Badge */}
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/30 bg-primary/5 backdrop-blur-sm">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary"></span>
                  </span>
                  <span className="text-sm font-medium text-primary">Nexus Network Testnet</span>
                </div>

                {/* Headline */}
                <div className="space-y-4">
                  <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.1] tracking-tight">
                    Trade on{' '}
                    <span className="relative">
                      <span className="gradient-text animate-shimmer">FOREDEX</span>
                      <span className="absolute -bottom-2 left-0 right-0 h-1 bg-gradient-to-r from-primary to-primary/50 rounded-full blur-sm" />
                    </span>
                  </h1>
                  <div className="max-w-xl">
                    <TextGenerateEffect 
                      words="The fastest DEX on Nexus Network. Swap tokens with minimal slippage and low fees."
                      className="text-lg sm:text-xl text-muted-foreground"
                    />
                  </div>
                </div>

                {/* CTA Buttons */}
                <div className="flex flex-wrap gap-4 pt-2">
                  <Link to="/swap">
                    <ShimmerButton className="px-6 sm:px-8 py-3 sm:py-4 text-sm sm:text-base font-semibold">
                      <ArrowRightLeft className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                      Start Trading
                    </ShimmerButton>
                  </Link>
                  <Link to="/docs">
                    <Button 
                      variant="outline" 
                      size="lg"
                      className="px-6 sm:px-8 py-5 sm:py-6 border-border/50 hover:border-primary/50 hover:bg-primary/5 transition-all duration-300"
                    >
                      <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                      Learn More
                    </Button>
                  </Link>
                </div>

                {/* Quick Stats Badges */}
                <div className="flex flex-wrap items-center gap-4 sm:gap-6 pt-4">
                  <FeatureBadge icon={Zap} text="Instant Swaps" />
                  <FeatureBadge icon={Shield} text="Secure Trading" />
                  <FeatureBadge icon={TrendingUp} text="Best Rates" />
                </div>
              </div>

              {/* Right Content - Token Carousel */}
              <div className="flex items-center justify-center lg:justify-end animate-scale-in">
                <Suspense fallback={<CarouselLoader />}>
                  <HeroTokenCarousel />
                </Suspense>
              </div>
            </div>
          </section>

          {/* Stats Section */}
          <section className="container px-4 py-12 sm:py-16">
            <div className="text-center mb-10 sm:mb-12">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3">
                Trusted by <span className="text-primary">Thousands</span>
              </h2>
              <p className="text-muted-foreground max-w-xl mx-auto text-sm sm:text-base">
                Join the growing community of traders and liquidity providers on FOREDEX.
              </p>
            </div>
            
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
              {STATS.map((stat, index) => (
                <StatCard 
                  key={stat.label}
                  {...stat}
                  delay={index * 100}
                />
              ))}
            </div>
          </section>

          {/* Features Section */}
          <section className="container px-4 py-12 sm:py-16">
            <div className="text-center mb-10 sm:mb-12">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3">
                Everything You Need to <span className="text-primary">Trade</span>
              </h2>
              <p className="text-muted-foreground max-w-xl mx-auto text-sm sm:text-base">
                A complete DeFi ecosystem with swapping, liquidity provision, and yield farming.
              </p>
            </div>
            
            <HoverEffect items={FEATURES} />
          </section>

          {/* Partners Section */}
          <Suspense fallback={<div className="h-40" />}>
            <PartnersSection />
          </Suspense>

          {/* CTA Section */}
          <section className="container px-4 py-12 sm:py-16 md:py-20">
            <GlowingStarsBackgroundCard className="p-0">
              <div className="relative p-6 sm:p-10 md:p-14 text-center overflow-hidden rounded-2xl">
                <BorderBeam size={200} duration={15} />
                
                <div className="relative z-10 space-y-5 sm:space-y-6">
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/30 mb-4">
                    <Rocket className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium text-primary">Ready to Launch?</span>
                  </div>
                  
                  <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold">
                    Start <span className="gradient-text">Trading</span> Now
                  </h2>
                  <p className="text-muted-foreground max-w-xl mx-auto text-sm sm:text-base">
                    Connect your wallet and start swapping tokens in seconds.
                  </p>
                  
                  <div className="flex flex-wrap justify-center gap-3 sm:gap-4 pt-4">
                    <Link to="/swap">
                      <ShimmerButton className="px-6 sm:px-8 py-3 sm:py-4 text-sm sm:text-base font-semibold">
                        <ArrowRightLeft className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                        Launch App
                      </ShimmerButton>
                    </Link>
                    <Link to="/portfolio">
                      <Button 
                        variant="outline" 
                        size="lg"
                        className="px-6 sm:px-8 py-5 sm:py-6 border-border/50 hover:border-primary/50 hover:bg-primary/5 transition-all"
                      >
                        <Wallet className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                        View Portfolio
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </GlowingStarsBackgroundCard>
          </section>

          {/* Footer spacer for mobile dock */}
          <div className="h-20 md:h-8" />
        </main>
      </Spotlight>
      
      {/* Mobile Floating Dock */}
      <Suspense fallback={null}>
        <MobileFloatingDock />
      </Suspense>
    </div>
  );
});

export default Home;
