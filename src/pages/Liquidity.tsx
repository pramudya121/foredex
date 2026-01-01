import { memo } from 'react';
import { LiquidityPanel } from '@/components/LiquidityPanel';
import { Droplets, TrendingUp, Shield, Zap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const Liquidity = () => {
  return (
    <main className="container py-4 sm:py-6 md:py-10 px-3 sm:px-4">
      {/* Hero Section */}
      <div className="text-center mb-6 sm:mb-10 max-w-2xl mx-auto">
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="p-3 sm:p-4 rounded-2xl bg-gradient-wolf">
            <Droplets className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
          </div>
        </div>
        
        <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-3 sm:mb-4">
          Provide <span className="gradient-text">Liquidity</span>
        </h1>
        
        <p className="text-sm sm:text-base md:text-lg text-muted-foreground max-w-xl mx-auto mb-4">
          Earn 0.3% trading fees by providing liquidity to FOREDEX pools.
        </p>
        
        {/* Feature Badges */}
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
          <Badge variant="secondary" className="px-3 py-1.5 text-xs sm:text-sm">
            <TrendingUp className="w-3.5 h-3.5 mr-1.5 text-green-500" />
            Earn Fees
          </Badge>
          <Badge variant="secondary" className="px-3 py-1.5 text-xs sm:text-sm">
            <Shield className="w-3.5 h-3.5 mr-1.5 text-primary" />
            Non-Custodial
          </Badge>
          <Badge variant="secondary" className="px-3 py-1.5 text-xs sm:text-sm">
            <Zap className="w-3.5 h-3.5 mr-1.5 text-yellow-500" />
            Instant Deposit
          </Badge>
        </div>
      </div>
      
      {/* Liquidity Panel */}
      <div className="max-w-md mx-auto">
        <LiquidityPanel />
      </div>
      
      {/* Info Cards */}
      <div className="max-w-2xl mx-auto mt-8 sm:mt-12 grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <div className="glass-card p-4 text-center">
          <p className="text-xl sm:text-2xl font-bold text-primary">0.3%</p>
          <p className="text-xs sm:text-sm text-muted-foreground">Fee per Trade</p>
        </div>
        <div className="glass-card p-4 text-center">
          <p className="text-xl sm:text-2xl font-bold text-primary">50/50</p>
          <p className="text-xs sm:text-sm text-muted-foreground">Token Ratio</p>
        </div>
        <div className="glass-card p-4 text-center">
          <p className="text-xl sm:text-2xl font-bold text-primary">24/7</p>
          <p className="text-xs sm:text-sm text-muted-foreground">Earning Fees</p>
        </div>
      </div>
    </main>
  );
};

export default memo(Liquidity);