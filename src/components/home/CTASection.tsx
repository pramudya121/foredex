import { memo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRightLeft, Wallet, Rocket } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ShimmerButton } from '@/components/ui/shimmer-button';
import { BorderBeam } from '@/components/ui/border-beam';
import { GlowingStarsBackgroundCard } from '@/components/ui/glowing-stars';
import { ScrollReveal, RevealSection } from '@/components/ui/scroll-reveal';

export const CTASection = memo(function CTASection() {
  return (
    <RevealSection className="container px-4 py-16 sm:py-20 md:py-24">
      <GlowingStarsBackgroundCard className="p-0">
        <div className="relative p-8 sm:p-12 md:p-16 text-center overflow-hidden rounded-2xl">
          <BorderBeam size={200} duration={15} />
          
          <div className="relative z-10 space-y-6">
            <ScrollReveal direction="scale" delay={0}>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/30">
                <Rocket className="w-4 h-4 text-primary animate-bounce" />
                <span className="text-sm font-medium text-primary">Ready to Launch?</span>
              </div>
            </ScrollReveal>
            
            <ScrollReveal direction="up" delay={100}>
              <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold">
                Start <span className="gradient-text">Trading</span> Now
              </h2>
            </ScrollReveal>
            
            <ScrollReveal direction="up" delay={200}>
              <p className="text-muted-foreground max-w-lg mx-auto text-sm sm:text-base">
                Connect your wallet and start swapping tokens in seconds.
              </p>
            </ScrollReveal>
            
            <ScrollReveal direction="up" delay={300}>
              <div className="flex flex-wrap justify-center gap-4 pt-4">
                <Link to="/swap">
                  <ShimmerButton className="px-7 sm:px-8 py-3.5 sm:py-4 text-sm sm:text-base font-semibold group">
                    <ArrowRightLeft className="w-4 h-4 sm:w-5 sm:h-5 mr-2 group-hover:rotate-180 transition-transform duration-500" />
                    Launch App
                  </ShimmerButton>
                </Link>
                <Link to="/portfolio">
                  <Button 
                    variant="outline" 
                    size="lg"
                    className="px-7 sm:px-8 h-12 sm:h-14 border-border/50 hover:border-primary/50 hover:bg-primary/5 transition-all duration-300 group"
                  >
                    <Wallet className="w-4 h-4 sm:w-5 sm:h-5 mr-2 group-hover:scale-110 transition-transform duration-300" />
                    View Portfolio
                  </Button>
                </Link>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </GlowingStarsBackgroundCard>
    </RevealSection>
  );
});
