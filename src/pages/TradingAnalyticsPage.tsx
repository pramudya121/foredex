import { lazy, Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

const TradingAnalytics = lazy(() => import('@/components/TradingAnalytics'));

const TradingAnalyticsPage = () => {
  return (
    <main className="container py-6 px-4 sm:py-8 md:py-12 max-w-6xl sm:px-6">
      <Suspense fallback={
        <div className="space-y-4 sm:space-y-6">
          <Skeleton className="h-8 sm:h-10 w-48 sm:w-64" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4">
            {Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-20 sm:h-24" />)}
          </div>
          <Skeleton className="h-72 sm:h-[400px]" />
        </div>
      }>
        <TradingAnalytics />
      </Suspense>
    </main>
  );
};

export default TradingAnalyticsPage;
