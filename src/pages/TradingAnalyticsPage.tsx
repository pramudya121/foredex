import { lazy, Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

const TradingAnalytics = lazy(() => import('@/components/TradingAnalytics'));

const TradingAnalyticsPage = () => {
  return (
    <main className="container py-8 md:py-12 max-w-6xl">
      <Suspense fallback={
        <div className="space-y-6">
          <Skeleton className="h-10 w-64" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-24" />)}
          </div>
          <Skeleton className="h-[400px]" />
        </div>
      }>
        <TradingAnalytics />
      </Suspense>
    </main>
  );
};

export default TradingAnalyticsPage;
