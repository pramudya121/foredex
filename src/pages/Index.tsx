import { useState, memo, lazy, Suspense } from 'react';
import { SwapCard } from '@/components/SwapCard';
import { useLimitOrderMonitor } from '@/hooks/useLimitOrderMonitor';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeftRight, Target } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { ConnectionStatus } from '@/components/LivePriceIndicator';
import { useRealtimePrices } from '@/hooks/useRealtimePrices';
import { PriceChart } from '@/components/PriceChart';
import { TOKEN_LIST } from '@/config/contracts';

// Lazy load components for better performance
const LimitOrderPanel = lazy(() => 
  import('@/components/LimitOrderPanel').then(m => ({ default: m.LimitOrderPanel }))
);
const RecentTrades = lazy(() => import('@/components/RecentTrades'));

const LimitOrderLoading = memo(() => (
  <div className="glass-card p-4 sm:p-6 w-full max-w-md mx-auto">
    <div className="space-y-4">
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-12 w-full" />
    </div>
  </div>
));

LimitOrderLoading.displayName = 'LimitOrderLoading';

const WidgetLoading = memo(() => (
  <div className="glass-card p-4">
    <Skeleton className="h-6 w-32 mb-4" />
    <div className="space-y-2">
      {Array(3).fill(0).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  </div>
));

WidgetLoading.displayName = 'WidgetLoading';

const Index = () => {
  const [activeTab, setActiveTab] = useState('market');
  const { isConnected } = useRealtimePrices();
  
  // Start monitoring limit orders for price targets
  useLimitOrderMonitor();

  return (
    <main className="container py-4 sm:py-6 md:py-10 px-3 sm:px-4">
      <div className="text-center mb-6 sm:mb-8">
        <div className="flex items-center justify-center gap-2 sm:gap-3 mb-2 sm:mb-3 flex-wrap">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold">
            Trade with the <span className="gradient-text">Pack</span>
          </h1>
          <ConnectionStatus isConnected={isConnected} />
        </div>
        <p className="text-sm sm:text-base text-muted-foreground max-w-xl mx-auto px-2">
          Swap tokens instantly on Nexus Testnet. Low fees, fast transactions.
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 sm:gap-6 max-w-5xl mx-auto justify-center">
        {/* Main Trading Area */}
        <div className="w-full max-w-md mx-auto lg:mx-0">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 glass-card p-1 mb-3 sm:mb-4">
              <TabsTrigger 
                value="market" 
                className="flex items-center justify-center gap-1.5 sm:gap-2 text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <ArrowLeftRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span>Market</span>
              </TabsTrigger>
              <TabsTrigger 
                value="limit" 
                className="flex items-center justify-center gap-1.5 sm:gap-2 text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <Target className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span>Limit</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="market" className="mt-3 sm:mt-4">
              <SwapCard />
            </TabsContent>

            <TabsContent value="limit" className="mt-3 sm:mt-4">
              <Suspense fallback={<LimitOrderLoading />}>
                <LimitOrderPanel />
              </Suspense>
            </TabsContent>
          </Tabs>
        </div>

        {/* Right Sidebar - Price Chart + Recent Trades (More Compact) */}
        <div className="hidden lg:flex flex-col gap-4 w-full max-w-sm">
          {/* Price Chart - Compact */}
          <div className="overflow-hidden rounded-2xl border border-border/30 bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-sm shadow-xl">
            <PriceChart 
              token0Symbol="NEX" 
              token1Symbol="FRDX" 
              currentPrice={0.9976}
              className="border-0 bg-transparent"
            />
          </div>
          
          {/* Recent Trades - Compact */}
          <div className="overflow-hidden rounded-2xl border border-border/30 bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-sm shadow-xl">
            <Suspense fallback={<WidgetLoading />}>
              <RecentTrades />
            </Suspense>
          </div>
        </div>
      </div>
    </main>
  );
};

export default memo(Index);
