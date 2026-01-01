import { memo } from 'react';
import { Analytics } from '@/components/Analytics';
import { BarChart3, TrendingUp, Activity, Zap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const AnalyticsPage = () => {
  return (
    <main className="container py-4 sm:py-6 md:py-10 max-w-6xl px-3 sm:px-4">
      {/* Hero Section */}
      <div className="mb-6 sm:mb-8">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2.5 sm:p-3 rounded-xl bg-gradient-wolf">
            <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">
              Protocol <span className="text-primary">Analytics</span>
            </h1>
            <Badge variant="secondary" className="mt-1 text-xs">
              <Activity className="w-3 h-3 mr-1 text-green-500 animate-pulse" />
              Live Data
            </Badge>
          </div>
        </div>
        <p className="text-muted-foreground text-xs sm:text-sm md:text-base max-w-xl">
          Real-time insights on TVL, trading volume, and pool performance across FOREDEX.
        </p>
        
        {/* Quick Features */}
        <div className="flex flex-wrap gap-2 mt-4">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs">
            <TrendingUp className="w-3 h-3 text-primary" />
            <span className="text-muted-foreground">Volume Tracking</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs">
            <Zap className="w-3 h-3 text-primary" />
            <span className="text-muted-foreground">Auto Refresh</span>
          </div>
        </div>
      </div>
      
      <Analytics />
    </main>
  );
};

export default memo(AnalyticsPage);