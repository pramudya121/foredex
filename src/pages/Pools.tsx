import { PoolsList } from '@/components/PoolsList';
import { CreatePair } from '@/components/CreatePair';
import { TokenFaucet } from '@/components/TokenFaucet';

const Pools = () => {
  return (
    <main className="container py-8 md:py-12 max-w-4xl">
      <div className="space-y-8">
        <div className="grid md:grid-cols-2 gap-6">
          <CreatePair />
          <TokenFaucet />
        </div>
        <PoolsList />
      </div>
    </main>
  );
};

export default Pools;
