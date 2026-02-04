import { memo, Suspense, lazy } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRightLeft, BookOpen, Zap, Shield, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ShimmerButton } from '@/components/ui/shimmer-button';
import { TextGenerateEffect } from '@/components/ui/text-generate-effect';
import { ScrollReveal } from '@/components/ui/scroll-reveal';
import { cn } from '@/lib/utils';

// Lazy load 3D Token Globe for performance
const TokenGlobe = lazy(() => import('@/components/3d/TokenGlobe'));

// Feature badge component
const FeatureBadge = memo(function FeatureBadge({ 
  icon: Icon, 
  text,
  delay = 0,
}: { 
  icon: React.ElementType; 
  text: string;
  delay?: number;
}) {
  return (
    <ScrollReveal direction="up" delay={delay} distance={15}>
      <div className="flex items-center gap-2 text-sm text-muted-foreground group/badge cursor-default">
        <div className="p-1.5 rounded-lg bg-primary/10 group-hover/badge:bg-primary/20 transition-colors duration-300">
          <Icon className="w-4 h-4 text-primary" />
        </div>
        <span className="group-hover/badge:text-foreground transition-colors duration-300">{text}</span>
      </div>
    </ScrollReveal>
  );
});

export const HeroSection = memo(function HeroSection() {
  return (
    <section className="container px-4 py-16 sm:py-20 md:py-24 lg:py-32 relative overflow-visible">
      <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center overflow-visible">
        {/* Left Content */}
        <div className="space-y-8">
          {/* Network Badge */}
          <ScrollReveal direction="up" delay={0}>
            <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full border border-primary/30 bg-primary/5 backdrop-blur-sm hover:bg-primary/10 transition-colors duration-300">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary"></span>
              </span>
              <span className="text-sm font-medium text-primary">Nexus Network Testnet</span>
            </div>
          </ScrollReveal>

          {/* Headline */}
          <ScrollReveal direction="up" delay={100}>
            <div className="space-y-5">
              <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.05] tracking-tight">
                Trade on{' '}
                <span className="relative inline-block">
                  <span className="gradient-text">FOREDEX</span>
                  <span className="absolute -bottom-1 left-0 right-0 h-1 bg-gradient-to-r from-primary via-primary/80 to-transparent rounded-full" />
                </span>
              </h1>
              <div className="max-w-lg">
                <TextGenerateEffect 
                  words="The fastest DEX on Nexus Network. Swap tokens with minimal slippage and low fees."
                  className="text-lg sm:text-xl text-muted-foreground/90 leading-relaxed"
                />
              </div>
            </div>
          </ScrollReveal>

          {/* CTA Buttons */}
          <ScrollReveal direction="up" delay={200}>
            <div className="flex flex-wrap gap-4">
              <Link to="/swap">
                <ShimmerButton className="px-7 sm:px-8 py-3.5 sm:py-4 text-sm sm:text-base font-semibold group">
                  <ArrowRightLeft className="w-4 h-4 sm:w-5 sm:h-5 mr-2 group-hover:rotate-180 transition-transform duration-500" />
                  Start Trading
                </ShimmerButton>
              </Link>
              <Link to="/docs">
                <Button 
                  variant="outline" 
                  size="lg"
                  className="px-7 sm:px-8 h-12 sm:h-14 border-border/50 hover:border-primary/50 hover:bg-primary/5 transition-all duration-300 group"
                >
                  <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 mr-2 group-hover:scale-110 transition-transform duration-300" />
                  Learn More
                </Button>
              </Link>
            </div>
          </ScrollReveal>

          {/* Quick Stats Badges */}
          <div className="flex flex-wrap items-center gap-5 sm:gap-6 pt-2">
            <FeatureBadge icon={Zap} text="Instant Swaps" delay={300} />
            <FeatureBadge icon={Shield} text="Secure Trading" delay={400} />
            <FeatureBadge icon={TrendingUp} text="Best Rates" delay={500} />
          </div>
        </div>

        {/* Right Content - 3D Token Globe */}
        <ScrollReveal direction="scale" delay={200} duration={800}>
          <div className="flex items-center justify-center lg:justify-center">
            <div className="relative w-full max-w-[380px] aspect-square">
              {/* 3D Token Globe */}
              <Suspense fallback={
                <div className="w-full h-full flex items-center justify-center">
                  <div className="relative">
                    <div className="w-36 h-36 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 animate-pulse" />
                    <div className="absolute inset-4 rounded-full border-2 border-primary/20 animate-spin-slow" />
                    <div className="absolute inset-8 rounded-full border border-primary/10 animate-spin-slow" style={{ animationDirection: 'reverse' }} />
                  </div>
                </div>
              }>
                <TokenGlobe className="w-full h-full" />
              </Suspense>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
});
