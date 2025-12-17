import { useState, memo, lazy, Suspense } from 'react';
import { SwapCard } from '@/components/SwapCard';
import { useLimitOrderMonitor } from '@/hooks/useLimitOrderMonitor';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeftRight, Target } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { ConnectionStatus } from '@/components/LivePriceIndicator';
import { useRealtimePrices } from '@/hooks/useRealtimePrices';

// Lazy load components for better performance
const LimitOrderPanel = lazy(() => 
  import('@/components/LimitOrderPanel').then(m => ({ default: m.LimitOrderPanel }))
);
const RecentTrades = lazy(() => import('@/components/RecentTrades'));

const LimitOrderLoading = () => (
  <div className="glass-card p-6 w-full max-w-md mx-auto">
    <div className="space-y-4">
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-12 w-full" />
    </div>
  </div>
);

const WidgetLoading = () => (
  <div className="glass-card p-4">
    <Skeleton className="h-6 w-32 mb-4" />
    <div className="space-y-2">
      {Array(3).fill(0).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  </div>
);

const Index = () => {
  const [activeTab, setActiveTab] = useState('market');
  const { isConnected } = useRealtimePrices();
  
  // Start monitoring limit orders for price targets
  useLimitOrderMonitor();

  return (
    <main className="container py-6 md:py-10">
      <div className="text-center mb-8">
        <div className="flex items-center justify-center gap-3 mb-3">
          <h1 className="text-3xl md:text-4xl font-bold">
            Trade with the <span className="gradient-text">Pack</span>
          </h1>
          <ConnectionStatus isConnected={isConnected} />
        </div>
        <p className="text-base text-muted-foreground max-w-xl mx-auto">
          Swap tokens instantly on Nexus Testnet. Low fees, fast transactions.
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 max-w-5xl mx-auto justify-center">
        {/* Main Trading Area */}
        <div className="w-full max-w-md">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 glass-card p-1 mb-4">
              <TabsTrigger 
                value="market" 
                className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <ArrowLeftRight className="w-4 h-4" />
                Market
              </TabsTrigger>
              <TabsTrigger 
                value="limit" 
                className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <Target className="w-4 h-4" />
                Limit
              </TabsTrigger>
            </TabsList>

            <TabsContent value="market" className="mt-4">
              <SwapCard />
            </TabsContent>

            <TabsContent value="limit" className="mt-4">
              <Suspense fallback={<LimitOrderLoading />}>
                <LimitOrderPanel />
              </Suspense>
            </TabsContent>
          </Tabs>
        </div>

        {/* Right Sidebar - Recent Trades */}
        <div className="w-full max-w-sm">
          <Suspense fallback={<WidgetLoading />}>
            <RecentTrades />
          </Suspense>
        </div>
      </div>
    </main>
  );
};

export default memo(Index);
