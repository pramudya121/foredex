import { memo } from 'react';
import { Analytics } from '@/components/Analytics';
import { BarChart3, TrendingUp, Activity, Zap, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Spotlight } from '@/components/ui/spotlight';
import { NumberTicker } from '@/components/ui/number-ticker';
import { BorderBeam } from '@/components/ui/border-beam';
import { GlowingStarsBackgroundCard } from '@/components/ui/glowing-stars';

// Premium stat card with glowing effects
const GlowingStatCard = memo(({ value, label, prefix = "", suffix = "", delay = 0 }: {
  value: number;
  label: string;
  prefix?: string;
  suffix?: string;
  delay?: number;
}) => (
  <div 
    className="glass-card p-5 text-center hover-lift card-glow animate-fade-in-up relative overflow-hidden group"
    style={{ animationDelay: `${delay}ms` }}
  >
    <BorderBeam size={80} duration={10} delay={delay / 1000} />
    <p className="text-2xl sm:text-3xl font-bold text-primary mb-1 transition-transform group-hover:scale-110">
      <NumberTicker value={value} prefix={prefix} suffix={suffix} delay={delay} />
    </p>
    <p className="text-xs text-muted-foreground">{label}</p>
  </div>
));

GlowingStatCard.displayName = 'GlowingStatCard';

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
        <div className="mb-6 sm:mb-8 relative">
          <div className="flex items-center gap-3 mb-3">
            <div className="relative">
              <div className="p-2.5 sm:p-3 rounded-xl bg-gradient-wolf animate-pulse">
                <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <div className="absolute inset-0 bg-primary/30 rounded-xl blur-xl -z-10" />
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
            <Badge variant="secondary" className="ml-2 text-xs animate-pulse">
              <Activity className="w-3 h-3 mr-1 text-green-500" />
              Live Data
            </Badge>
          </div>
          <p className="text-muted-foreground text-xs sm:text-sm md:text-base max-w-xl">
            Real-time insights on TVL, trading volume, and pool performance across FOREDEX.
          </p>
          
          {/* Quick Stats with NumberTicker */}
          <div className="grid grid-cols-3 gap-3 mt-6">
            <GlowingStatCard value={12} prefix="$" suffix="M" label="Total TVL" delay={0} />
            <GlowingStatCard value={850} prefix="$" suffix="K" label="24h Volume" delay={100} />
            <GlowingStatCard value={42} suffix="%" label="Monthly Growth" delay={200} />
          </div>
          
          {/* Quick Features */}
          <div className="flex flex-wrap gap-2 mt-6">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs hover-lift">
              <TrendingUp className="w-3 h-3 text-primary" />
              <span className="text-muted-foreground">Volume Tracking</span>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs hover-lift">
              <Zap className="w-3 h-3 text-primary" />
              <span className="text-muted-foreground">Auto Refresh</span>
            </div>
          </div>
        </div>
        
        <Analytics />
      </main>
    </Spotlight>
  );
};

export default memo(AnalyticsPage);
