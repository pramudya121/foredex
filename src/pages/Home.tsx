import { memo } from 'react';
import { Spotlight } from '@/components/ui/spotlight';
import { HeroSection } from '@/components/home/HeroSection';
import { StatsSection } from '@/components/home/StatsSection';
import { FeaturesSection } from '@/components/home/FeaturesSection';
import { PartnersSection } from '@/components/home/PartnersSection';
import { CTASection } from '@/components/home/CTASection';
import { MobileFloatingDock } from '@/components/home/MobileFloatingDock';
import { RevealSection } from '@/components/ui/scroll-reveal';

function HomePage() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Ambient background effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div 
          className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-primary/8 rounded-full blur-[120px]" 
          style={{ animation: 'pulse 8s ease-in-out infinite' }} 
        />
        <div 
          className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[150px]" 
          style={{ animation: 'pulse 12s ease-in-out infinite', animationDelay: '2s' }} 
        />
        <div 
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/3 rounded-full blur-[180px]" 
        />
      </div>

      <Spotlight className="min-h-screen relative z-10">
        <main className="relative">
          {/* Hero Section */}
          <HeroSection />

          {/* Stats Section */}
          <StatsSection />

          {/* Features Section */}
          <FeaturesSection />

          {/* Partners Section */}
          <RevealSection>
            <PartnersSection />
          </RevealSection>

          {/* CTA Section */}
          <CTASection />

          {/* Footer spacer for mobile dock */}
          <div className="h-24 md:h-12" />
        </main>
      </Spotlight>
      
      {/* Mobile Floating Dock */}
      <MobileFloatingDock />
    </div>
  );
}

export default memo(HomePage);
