import { PoolsList } from '@/components/PoolsList';
import { CreatePair } from '@/components/CreatePair';

const Pools = () => {
  return (
    <main className="container py-8 md:py-12 max-w-4xl">
      <div className="space-y-8">
        <CreatePair />
        <PoolsList />
      </div>
    </main>
  );
};

export default Pools;
