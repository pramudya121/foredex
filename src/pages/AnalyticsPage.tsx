import { memo } from 'react';
import { Analytics } from '@/components/Analytics';
import { BarChart3, TrendingUp, Activity, Zap, Sparkles, Layers, ArrowUpRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Spotlight } from '@/components/ui/spotlight';
import { NumberTicker } from '@/components/ui/number-ticker';
import { BorderBeam } from '@/components/ui/border-beam';
import { ScrollReveal, RevealSection, StaggeredReveal } from '@/components/ui/scroll-reveal';

// Premium stat card with glowing effects
const GlowingStatCard = memo(({ 
  value, 
  label, 
  prefix = "", 
  suffix = "",
  icon: Icon,
}: {
  value: number;
  label: string;
  prefix?: string;
  suffix?: string;
  icon?: React.ElementType;
}) => (
  <div className="glass-card p-5 text-center hover-lift relative overflow-hidden group transition-all duration-300 hover:border-primary/30">
    <BorderBeam size={80} duration={10} />
    {Icon && (
      <div className="absolute top-3 right-3 p-1.5 rounded-lg bg-primary/10 opacity-50 group-hover:opacity-100 transition-opacity">
        <Icon className="w-3.5 h-3.5 text-primary" />
      </div>
    )}
    <p className="text-2xl sm:text-3xl font-bold text-primary mb-1 transition-transform group-hover:scale-110">
      <NumberTicker value={value} prefix={prefix} suffix={suffix} />
    </p>
    <p className="text-xs text-muted-foreground">{label}</p>
  </div>
));

GlowingStatCard.displayName = 'GlowingStatCard';

// Feature badge component
const FeatureBadge = memo(({ icon: Icon, text }: { icon: React.ElementType; text: string }) => (
  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs hover-lift transition-all duration-300 hover:bg-primary/15 hover:border-primary/30">
    <Icon className="w-3 h-3 text-primary" />
    <span className="text-muted-foreground">{text}</span>
  </div>
));

FeatureBadge.displayName = 'FeatureBadge';

const AnalyticsPage = () => {
  return (
    <Spotlight className="min-h-screen">
      <main className="container py-4 sm:py-6 md:py-10 max-w-6xl px-3 sm:px-4 relative">
        {/* Ambient background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-1/4 w-72 h-72 bg-primary/5 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-20 right-1/4 w-96 h-96 bg-primary/3 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        </div>

        {/* Hero Section */}
        <ScrollReveal direction="up" duration={600}>
          <div className="mb-6 sm:mb-8 relative">
            <div className="flex items-center gap-3 mb-3">
              <div className="relative">
                <div className="p-2.5 sm:p-3 rounded-xl bg-gradient-wolf">
                  <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <div className="absolute inset-0 bg-primary/30 rounded-xl blur-xl animate-pulse -z-10" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary/70 animate-pulse" />
                  <span className="text-xs text-muted-foreground uppercase tracking-wider">Protocol</span>
                </div>
                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">
                  <span className="gradient-text">Analytics</span>
                </h1>
              </div>
              <Badge variant="secondary" className="ml-2 text-xs">
                <Activity className="w-3 h-3 mr-1 text-green-500 animate-pulse" />
                Live Data
              </Badge>
            </div>
            <p className="text-muted-foreground text-xs sm:text-sm md:text-base max-w-xl">
              Real-time insights on TVL, trading volume, and pool performance across FOREDEX.
            </p>
          </div>
        </ScrollReveal>
        
        {/* Quick Stats with NumberTicker */}
        <StaggeredReveal staggerDelay={100} className="grid grid-cols-3 gap-3 mb-6">
          <GlowingStatCard value={12} prefix="$" suffix="M" label="Total TVL" icon={Layers} />
          <GlowingStatCard value={850} prefix="$" suffix="K" label="24h Volume" icon={ArrowUpRight} />
          <GlowingStatCard value={42} suffix="%" label="Monthly Growth" icon={TrendingUp} />
        </StaggeredReveal>
        
        {/* Quick Features */}
        <ScrollReveal direction="up" delay={200}>
          <div className="flex flex-wrap gap-2 mb-8">
            <FeatureBadge icon={TrendingUp} text="Volume Tracking" />
            <FeatureBadge icon={Zap} text="Auto Refresh" />
            <FeatureBadge icon={Activity} text="Live Updates" />
          </div>
        </ScrollReveal>
        
        {/* Analytics Content */}
        <RevealSection>
          <Analytics />
        </RevealSection>
      </main>
    </Spotlight>
  );
};

export default memo(AnalyticsPage);
