import { memo } from 'react';
import { Globe, ArrowRightLeft, TrendingUp, Users, Sparkles } from 'lucide-react';
import { NumberTicker } from '@/components/ui/number-ticker';
import { BorderBeam } from '@/components/ui/border-beam';
import { ScrollReveal, RevealSection } from '@/components/ui/scroll-reveal';
import { cn } from '@/lib/utils';

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
  icon: Icon,
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
    <ScrollReveal direction="up" delay={delay}>
      <div className="relative group">
        {/* Hover glow effect */}
        <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/40 to-primary/20 rounded-2xl blur opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        
        <div className="relative glass-card p-5 sm:p-6 text-center overflow-hidden rounded-2xl border border-border/30 group-hover:border-primary/30 transition-all duration-300 hover:-translate-y-1">
          <BorderBeam size={80} duration={12} delay={delay / 1000} />
          
          {/* Icon */}
          {Icon && (
            <div className="flex justify-center mb-3">
              <div className="p-2.5 rounded-xl bg-primary/10 text-primary group-hover:bg-primary/20 group-hover:scale-110 transition-all duration-300">
                <Icon className="w-5 h-5" />
              </div>
            </div>
          )}
          
          {/* Value */}
          <p className="text-2xl sm:text-3xl md:text-4xl font-bold text-primary mb-1.5">
            <NumberTicker value={value} prefix={prefix} suffix={suffix} delay={delay + 300} decimalPlaces={decimalPlaces} />
          </p>
          
          {/* Label */}
          <p className="text-xs sm:text-sm text-muted-foreground font-medium">{label}</p>
        </div>
      </div>
    </ScrollReveal>
  );
});

export const StatsSection = memo(function StatsSection() {
  return (
    <RevealSection className="container px-4 py-16 sm:py-20">
      <div className="text-center mb-12 space-y-4">
        <ScrollReveal direction="up" delay={0}>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
            <Sparkles className="w-3.5 h-3.5" />
            Platform Statistics
          </div>
        </ScrollReveal>
        <ScrollReveal direction="up" delay={100}>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold">
            Trusted by <span className="text-primary">Thousands</span>
          </h2>
        </ScrollReveal>
        <ScrollReveal direction="up" delay={200}>
          <p className="text-muted-foreground max-w-lg mx-auto text-sm sm:text-base">
            Join the growing community of traders and liquidity providers on FOREDEX.
          </p>
        </ScrollReveal>
      </div>
      
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 md:gap-6">
        {STATS.map((stat, index) => (
          <StatCard 
            key={stat.label}
            {...stat}
            delay={index * 100 + 300}
          />
        ))}
      </div>
    </RevealSection>
  );
});
