import { useState } from 'react';
import { LiquidityPanel } from '@/components/LiquidityPanel';
import { WrapUnwrap } from '@/components/WrapUnwrap';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Droplets, ArrowDownUp } from 'lucide-react';

const Liquidity = () => {
  const [activeTab, setActiveTab] = useState('liquidity');

  return (
    <main className="container py-8 md:py-12">
      <div className="text-center mb-10">
        <h1 className="text-4xl md:text-5xl font-bold mb-4">
          Provide <span className="gradient-text">Liquidity</span>
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Earn fees by providing liquidity to FOREDEX pools or wrap/unwrap your NEX tokens.
        </p>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="max-w-md mx-auto">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="liquidity" className="gap-2">
            <Droplets className="w-4 h-4" />
            Liquidity
          </TabsTrigger>
          <TabsTrigger value="wrap" className="gap-2">
            <ArrowDownUp className="w-4 h-4" />
            Wrap/Unwrap
          </TabsTrigger>
        </TabsList>

        <TabsContent value="liquidity">
          <LiquidityPanel />
        </TabsContent>

        <TabsContent value="wrap">
          <WrapUnwrap />
        </TabsContent>
      </Tabs>
    </main>
  );
};

export default Liquidity;
