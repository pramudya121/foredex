import { lazy, Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

const TokenComparison = lazy(() => import('@/components/TokenComparison'));

const TokenComparisonPage = () => {
  return (
    <main className="container py-8 md:py-12 max-w-6xl">
      <Suspense fallback={
        <div className="space-y-6">
          <Skeleton className="h-10 w-64" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-32" />)}
          </div>
          <Skeleton className="h-[400px]" />
        </div>
      }>
        <TokenComparison />
      </Suspense>
    </main>
  );
};

export default TokenComparisonPage;
