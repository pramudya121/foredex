import { memo } from 'react';
import { LiquidityPanel } from '@/components/LiquidityPanel';
import { Droplets, TrendingUp, Shield, Zap, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Spotlight } from '@/components/ui/spotlight';
import { TextGenerateEffect } from '@/components/ui/text-generate-effect';
import { BorderBeam } from '@/components/ui/border-beam';
import { MovingBorder } from '@/components/ui/moving-border';

const StatCard = memo(({ value, label, delay = 0 }: { value: string; label: string; delay?: number }) => (
  <div 
    className="glass-card p-4 text-center hover-lift card-glow animate-slide-up relative overflow-hidden"
    style={{ animationDelay: `${delay}ms`, animationFillMode: 'forwards' }}
  >
    <BorderBeam size={60} duration={8} delay={delay / 1000} />
    <p className="text-xl sm:text-2xl font-bold text-primary">{value}</p>
    <p className="text-xs sm:text-sm text-muted-foreground mt-1">{label}</p>
  </div>
));

StatCard.displayName = 'StatCard';

const FeatureBadge = memo(({ icon: Icon, text, iconColor, delay = 0 }: { 
  icon: React.ElementType; 
  text: string; 
  iconColor: string;
  delay?: number;
}) => (
  <Badge 
    variant="secondary" 
    className="px-3 py-1.5 text-xs sm:text-sm hover-lift animate-scale-in"
    style={{ animationDelay: `${delay}ms`, animationFillMode: 'forwards' }}
  >
    <Icon className={`w-3.5 h-3.5 mr-1.5 ${iconColor}`} />
    {text}
  </Badge>
));

FeatureBadge.displayName = 'FeatureBadge';

const Liquidity = () => {
  return (
    <Spotlight className="min-h-screen">
      <main className="container py-4 sm:py-6 md:py-10 px-3 sm:px-4 relative">
        {/* Ambient background effects */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-40 left-1/3 w-64 h-64 bg-primary/5 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-40 right-1/3 w-80 h-80 bg-primary/3 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1.5s' }} />
        </div>

        {/* Hero Section */}
        <div className="text-center mb-6 sm:mb-10 max-w-2xl mx-auto relative">
          {/* Icon with enhanced effects */}
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="relative">
              <div className="p-3 sm:p-4 rounded-2xl bg-gradient-wolf animate-bounce-subtle">
                <Droplets className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
              </div>
              {/* Glow effect */}
              <div className="absolute inset-0 bg-primary/30 rounded-2xl blur-xl animate-pulse -z-10" />
            </div>
          </div>
          
          <div className="animate-fade-in">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-primary/70 animate-pulse" />
              <span className="text-xs text-muted-foreground tracking-wider uppercase">Liquidity Provider</span>
              <Sparkles className="w-4 h-4 text-primary/70 animate-pulse" />
            </div>
            
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-3 sm:mb-4">
              Provide <span className="gradient-text">Liquidity</span>
            </h1>
            
            {/* TextGenerateEffect for description */}
            <TextGenerateEffect 
              words="Earn 0.3% trading fees by providing liquidity to FOREDEX pools."
              className="text-sm sm:text-base md:text-lg text-muted-foreground max-w-xl mx-auto mb-4"
            />
          </div>
          
          {/* Feature Badges with staggered animation */}
          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
            <FeatureBadge icon={TrendingUp} text="Earn Fees" iconColor="text-green-500" delay={100} />
            <FeatureBadge icon={Shield} text="Non-Custodial" iconColor="text-primary" delay={200} />
            <FeatureBadge icon={Zap} text="Instant Deposit" iconColor="text-yellow-500" delay={300} />
          </div>
        </div>
        
        {/* Liquidity Panel with Moving Border */}
        <div className="max-w-md mx-auto relative">
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none -z-10">
            <div className="w-72 h-72 bg-primary/5 rounded-full blur-3xl" />
          </div>
          <div className="animate-scale-in">
            <MovingBorder duration={4000} borderRadius="1.5rem" className="p-0">
              <LiquidityPanel />
            </MovingBorder>
          </div>
        </div>
        
        {/* Info Cards with BorderBeam */}
        <div className="max-w-2xl mx-auto mt-8 sm:mt-12 grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          <StatCard value="0.3%" label="Fee per Trade" delay={400} />
          <StatCard value="50/50" label="Token Ratio" delay={500} />
          <StatCard value="24/7" label="Earning Fees" delay={600} />
        </div>
      </main>
    </Spotlight>
  );
};

export default memo(Liquidity);
