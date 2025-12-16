import { useState } from 'react';
import { SwapCard } from '@/components/SwapCard';
import { LimitOrderPanel } from '@/components/LimitOrderPanel';
import { useLimitOrderMonitor } from '@/hooks/useLimitOrderMonitor';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeftRight, Target } from 'lucide-react';

const Index = () => {
  const [activeTab, setActiveTab] = useState('market');
  
  // Start monitoring limit orders for price targets
  useLimitOrderMonitor();

  return (
    <main className="container py-8 md:py-12">
      <div className="text-center mb-10">
        <h1 className="text-4xl md:text-5xl font-bold mb-4">
          Trade with the <span className="gradient-text">Pack</span>
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Swap tokens instantly on Nexus Testnet. Low fees, fast transactions, powered by FOREDEX.
        </p>
      </div>

      {/* Order Type Tabs */}
      <div className="max-w-md mx-auto mb-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 glass-card p-1">
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

          <TabsContent value="market" className="mt-6">
            <SwapCard />
          </TabsContent>

          <TabsContent value="limit" className="mt-6">
            <LimitOrderPanel />
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
};

export default Index;
