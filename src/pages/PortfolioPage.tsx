import { memo } from 'react';
import { Portfolio } from '@/components/Portfolio';
import { Wallet, TrendingUp, Shield, Zap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const PortfolioPage = () => {
  return (
    <main className="container py-4 sm:py-6 md:py-10 max-w-5xl px-3 sm:px-4">
      {/* Hero Section */}
      <div className="mb-6 sm:mb-8">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2.5 sm:p-3 rounded-xl bg-gradient-wolf">
            <Wallet className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">
              Your <span className="text-primary">Portfolio</span>
            </h1>
            <Badge variant="secondary" className="mt-1 text-xs">
              <Shield className="w-3 h-3 mr-1 text-green-500" />
              Secure & Private
            </Badge>
          </div>
        </div>
        <p className="text-muted-foreground text-xs sm:text-sm md:text-base max-w-xl">
          Track your token holdings, LP positions, and trading history in one place.
        </p>
        
        {/* Quick Features */}
        <div className="flex flex-wrap gap-2 mt-4">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs">
            <TrendingUp className="w-3 h-3 text-primary" />
            <span className="text-muted-foreground">Real-time Values</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs">
            <Zap className="w-3 h-3 text-primary" />
            <span className="text-muted-foreground">Auto Refresh</span>
          </div>
        </div>
      </div>
      
      <Portfolio />
    </main>
  );
};

export default memo(PortfolioPage);