import { LiquidityPanel } from '@/components/LiquidityPanel';

const Liquidity = () => {
  return (
    <main className="container py-8 md:py-12">
      <div className="text-center mb-10">
        <h1 className="text-4xl md:text-5xl font-bold mb-4">
          Provide <span className="gradient-text">Liquidity</span>
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Earn fees by providing liquidity to FOREDEX pools.
        </p>
      </div>
      <LiquidityPanel />
    </main>
  );
};

export default Liquidity;
