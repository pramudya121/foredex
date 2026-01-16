import { memo } from 'react';
import { Portfolio } from '@/components/Portfolio';
import { Wallet, TrendingUp, Shield, Zap, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Spotlight } from '@/components/ui/spotlight';
import { BorderBeam } from '@/components/ui/border-beam';
import { NumberTicker } from '@/components/ui/number-ticker';

// Premium stat card with BorderBeam
const PortfolioStatCard = memo(({ value, label, prefix = "", suffix = "", delay = 0 }: {
  value: number;
  label: string;
  prefix?: string;
  suffix?: string;
  delay?: number;
}) => (
  <div 
    className="glass-card p-4 text-center hover-lift card-glow animate-fade-in-up relative overflow-hidden"
    style={{ animationDelay: `${delay}ms` }}
  >
    <BorderBeam size={60} duration={8} delay={delay / 1000} />
    <p className="text-lg sm:text-xl font-bold text-primary mb-0.5">
      <NumberTicker value={value} prefix={prefix} suffix={suffix} delay={delay} />
    </p>
    <p className="text-[10px] sm:text-xs text-muted-foreground">{label}</p>
  </div>
));

PortfolioStatCard.displayName = 'PortfolioStatCard';

const PortfolioPage = () => {
  return (
    <Spotlight className="min-h-screen">
      <main className="container py-4 sm:py-6 md:py-10 max-w-5xl px-3 sm:px-4 relative">
        {/* Ambient background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 right-1/4 w-72 h-72 bg-primary/5 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-40 left-1/4 w-80 h-80 bg-primary/3 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1.5s' }} />
        </div>

        {/* Hero Section */}
        <div className="mb-6 sm:mb-8 relative">
          <div className="flex items-center gap-3 mb-3">
            <div className="relative">
              <div className="p-2.5 sm:p-3 rounded-xl bg-gradient-wolf">
                <Wallet className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <div className="absolute inset-0 bg-primary/30 rounded-xl blur-xl animate-pulse -z-10" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <Sparkles className="w-3 h-3 text-primary/70 animate-pulse" />
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Your</span>
              </div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">
                <span className="gradient-text">Portfolio</span>
              </h1>
            </div>
            <Badge variant="secondary" className="ml-2 text-xs">
              <Shield className="w-3 h-3 mr-1 text-green-500" />
              Secure & Private
            </Badge>
          </div>
          <p className="text-muted-foreground text-xs sm:text-sm md:text-base max-w-xl">
            Track your token holdings, LP positions, and trading history in one place.
          </p>
          
          {/* Quick Stats with BorderBeam */}
          <div className="grid grid-cols-4 gap-2 sm:gap-3 mt-6">
            <PortfolioStatCard value={5} label="Tokens" delay={0} />
            <PortfolioStatCard value={3} label="LP Positions" delay={100} />
            <PortfolioStatCard value={1250} prefix="$" label="Total Value" delay={200} />
            <PortfolioStatCard value={12} suffix="%" label="24h Change" delay={300} />
          </div>
          
          {/* Quick Features */}
          <div className="flex flex-wrap gap-2 mt-6">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs hover-lift">
              <TrendingUp className="w-3 h-3 text-primary" />
              <span className="text-muted-foreground">Real-time Values</span>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs hover-lift">
              <Zap className="w-3 h-3 text-primary" />
              <span className="text-muted-foreground">Auto Refresh</span>
            </div>
          </div>
        </div>
        
        <Portfolio />
      </main>
    </Spotlight>
  );
};

export default memo(PortfolioPage);
