import { memo } from 'react';
import { Zap } from 'lucide-react';
import { HoverEffect } from '@/components/ui/hover-effect';
import { ScrollReveal, RevealSection } from '@/components/ui/scroll-reveal';

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

export const FeaturesSection = memo(function FeaturesSection() {
  return (
    <RevealSection className="container px-4 py-16 sm:py-20">
      <div className="text-center mb-12 space-y-4">
        <ScrollReveal direction="up" delay={0}>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
            <Zap className="w-3.5 h-3.5" />
            Core Features
          </div>
        </ScrollReveal>
        <ScrollReveal direction="up" delay={100}>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold">
            Everything You Need to <span className="text-primary">Trade</span>
          </h2>
        </ScrollReveal>
        <ScrollReveal direction="up" delay={200}>
          <p className="text-muted-foreground max-w-lg mx-auto text-sm sm:text-base">
            A complete DeFi ecosystem with swapping, liquidity provision, and yield farming.
          </p>
        </ScrollReveal>
      </div>
      
      <ScrollReveal direction="up" delay={300}>
        <HoverEffect items={FEATURES} />
      </ScrollReveal>
    </RevealSection>
  );
});
