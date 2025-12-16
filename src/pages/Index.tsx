import { useState, memo, lazy, Suspense } from 'react';
import { SwapCard } from '@/components/SwapCard';
import { useLimitOrderMonitor } from '@/hooks/useLimitOrderMonitor';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeftRight, Target } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

// Lazy load LimitOrderPanel for better performance
const LimitOrderPanel = lazy(() => 
  import('@/components/LimitOrderPanel').then(m => ({ default: m.LimitOrderPanel }))
);

const LimitOrderLoading = () => (
  <div className="glass-card p-6 w-full max-w-md mx-auto">
    <div className="space-y-4">
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-12 w-full" />
    </div>
  </div>
);

const Index = () => {
  const [activeTab, setActiveTab] = useState('market');
  
  // Start monitoring limit orders for price targets
  useLimitOrderMonitor();

  return (
    <main className="container py-6 md:py-10">
      <div className="text-center mb-8">
        <h1 className="text-3xl md:text-4xl font-bold mb-3">
          Trade with the <span className="gradient-text">Pack</span>
        </h1>
        <p className="text-base text-muted-foreground max-w-xl mx-auto">
          Swap tokens instantly on Nexus Testnet. Low fees, fast transactions.
        </p>
      </div>

      {/* Order Type Tabs */}
      <div className="max-w-md mx-auto">
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
    </main>
  );
};

export default memo(Index);
