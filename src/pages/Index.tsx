import { useState, memo, lazy, Suspense } from 'react';
import { SwapCard } from '@/components/SwapCard';
import { useLimitOrderMonitor } from '@/hooks/useLimitOrderMonitor';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeftRight, Target, Zap, Shield, TrendingUp } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { ConnectionStatus } from '@/components/LivePriceIndicator';
import { useRealtimePrices } from '@/hooks/useRealtimePrices';
import { PriceChart } from '@/components/PriceChart';
import wolfLogo from '@/assets/wolf-logo.png';

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

const FeatureBadge = memo(({ icon: Icon, text }: { icon: React.ElementType; text: string }) => (
  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-xs sm:text-sm">
    <Icon className="w-3.5 h-3.5 text-primary" />
    <span className="text-muted-foreground">{text}</span>
  </div>
));

FeatureBadge.displayName = 'FeatureBadge';

const Index = () => {
  const [activeTab, setActiveTab] = useState('market');
  const { isConnected } = useRealtimePrices();
  
  // Start monitoring limit orders for price targets
  useLimitOrderMonitor();

  return (
    <main className="container py-6 sm:py-8 md:py-12 px-3 sm:px-4">
      {/* Hero Section */}
      <div className="text-center mb-8 sm:mb-12 relative">
        {/* Animated glow behind logo */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 sm:w-48 sm:h-48 bg-primary/20 rounded-full blur-3xl animate-pulse pointer-events-none" />
        
        {/* Wolf Logo Animation */}
        <div className="relative inline-block mb-4 sm:mb-6">
          <img 
            src={wolfLogo} 
            alt="FOREDEX" 
            className="w-16 h-16 sm:w-20 sm:h-20 mx-auto animate-wolf-breathe relative z-10"
          />
          <div className="absolute inset-0 bg-primary/30 blur-xl rounded-full animate-wolf-glow" />
        </div>

        <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-3 sm:mb-4">
          Trade with the <span className="gradient-text">Pack</span>
        </h1>
        
        <p className="text-sm sm:text-base md:text-lg text-muted-foreground max-w-xl mx-auto mb-4 sm:mb-6 px-2">
          Swap tokens instantly on Nexus Testnet with low fees and lightning-fast transactions.
        </p>

        {/* Feature Badges */}
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 mb-4">
          <FeatureBadge icon={Zap} text="Instant Swaps" />
          <FeatureBadge icon={Shield} text="Secure Trading" />
          <FeatureBadge icon={TrendingUp} text="Best Rates" />
          <ConnectionStatus isConnected={isConnected} />
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 sm:gap-8 max-w-6xl mx-auto justify-center">
        {/* Main Trading Area */}
        <div className="w-full max-w-md mx-auto lg:mx-0">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 glass-card p-1.5 mb-4 sm:mb-6 h-12">
              <TabsTrigger 
                value="market" 
                className="flex items-center justify-center gap-2 text-sm font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg transition-all"
              >
                <ArrowLeftRight className="w-4 h-4" />
                <span>Market</span>
              </TabsTrigger>
              <TabsTrigger 
                value="limit" 
                className="flex items-center justify-center gap-2 text-sm font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg transition-all"
              >
                <Target className="w-4 h-4" />
                <span>Limit</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="market" className="mt-0">
              <SwapCard />
            </TabsContent>

            <TabsContent value="limit" className="mt-0">
              <Suspense fallback={<LimitOrderLoading />}>
                <LimitOrderPanel />
              </Suspense>
            </TabsContent>
          </Tabs>
        </div>

        {/* Right Sidebar - Price Chart + Recent Trades */}
        <div className="hidden lg:flex flex-col gap-5 w-full max-w-sm">
          {/* Price Chart */}
          <div className="overflow-hidden rounded-2xl border border-border/40 bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-sm shadow-xl hover:border-primary/30 transition-colors">
            <PriceChart 
              token0Symbol="NEX" 
              token1Symbol="FRDX" 
              currentPrice={0.9976}
              className="border-0 bg-transparent"
            />
          </div>
          
          {/* Recent Trades */}
          <div className="overflow-hidden rounded-2xl border border-border/40 bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-sm shadow-xl hover:border-primary/30 transition-colors">
            <Suspense fallback={<WidgetLoading />}>
              <RecentTrades />
            </Suspense>
          </div>
        </div>
      </div>

      {/* Stats Section - Mobile Only */}
      <div className="lg:hidden mt-8 grid grid-cols-3 gap-3 max-w-md mx-auto">
        <div className="glass-card p-4 text-center">
          <p className="text-xl sm:text-2xl font-bold text-primary">$12M+</p>
          <p className="text-xs text-muted-foreground">TVL</p>
        </div>
        <div className="glass-card p-4 text-center">
          <p className="text-xl sm:text-2xl font-bold text-primary">50K+</p>
          <p className="text-xs text-muted-foreground">Trades</p>
        </div>
        <div className="glass-card p-4 text-center">
          <p className="text-xl sm:text-2xl font-bold text-primary">0.3%</p>
          <p className="text-xs text-muted-foreground">Fees</p>
        </div>
      </div>
    </main>
  );
};

export default memo(Index);
