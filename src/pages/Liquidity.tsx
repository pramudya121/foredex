import { LiquidityPanel } from '@/components/LiquidityPanel';

const Liquidity = () => {
  return (
    <main className="container py-6 px-4 sm:py-8 md:py-12 sm:px-6">
      <div className="text-center mb-6 sm:mb-10">
        <h1 className="text-2xl sm:text-4xl md:text-5xl font-bold mb-2 sm:mb-4">
          Provide <span className="gradient-text">Liquidity</span>
        </h1>
        <p className="text-sm sm:text-lg text-muted-foreground max-w-2xl mx-auto px-2">
          Earn 0.3% fees by providing liquidity to FOREDEX pools.
        </p>
      </div>
      
      <div className="max-w-md mx-auto">
        <LiquidityPanel />
      </div>
    </main>
  );
};

export default Liquidity;
