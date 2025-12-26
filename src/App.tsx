import { lazy, Suspense, memo } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Web3Provider } from "@/contexts/Web3Context";
import { Header } from "@/components/Header";
import { WaveBackground } from "@/components/WaveBackground";
import { PriceTicker } from "@/components/PriceTicker";
import { useSettingsStore } from "@/stores/settingsStore";
import { WolfSpinner } from "@/components/WolfSpinner";
import { PageTransition } from "@/components/PageTransition";

// Lazy load pages for better performance
const Index = lazy(() => import("./pages/Index"));
const Liquidity = lazy(() => import("./pages/Liquidity"));
const Pools = lazy(() => import("./pages/Pools"));
const FarmingPage = lazy(() => import("./pages/FarmingPage"));
const PoolDetailPage = lazy(() => import("./pages/PoolDetailPage"));
const TokensPage = lazy(() => import("./pages/TokensPage"));
const TokenDetailPage = lazy(() => import("./pages/TokenDetailPage"));
const AnalyticsPage = lazy(() => import("./pages/AnalyticsPage"));
const PortfolioPage = lazy(() => import("./pages/PortfolioPage"));
const TradingAnalyticsPage = lazy(() => import("./pages/TradingAnalyticsPage"));
const TokenComparisonPage = lazy(() => import("./pages/TokenComparisonPage"));
const TransactionHistoryPage = lazy(() => import("./pages/TransactionHistoryPage"));
const DocsPage = lazy(() => import("./pages/DocsPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const NotFound = lazy(() => import("./pages/NotFound"));

// Loading component for lazy pages
const PageLoader = memo(() => (
  <div className="flex-1 flex items-center justify-center py-20">
    <WolfSpinner size="lg" text="Loading..." />
  </div>
));

PageLoader.displayName = 'PageLoader';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30000,
      gcTime: 60000,
      refetchOnWindowFocus: false,
    },
  },
});

const AppContent = memo(function AppContent() {
  const { settings } = useSettingsStore();
  
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      {settings.showPriceTicker && <PriceTicker />}
      <Suspense fallback={<PageLoader />}>
        <PageTransition>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/liquidity" element={<Liquidity />} />
            <Route path="/pools" element={<Pools />} />
            <Route path="/farming" element={<FarmingPage />} />
            <Route path="/tokens" element={<TokensPage />} />
            <Route path="/tokens/:address" element={<TokenDetailPage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/trading-analytics" element={<TradingAnalyticsPage />} />
            <Route path="/compare" element={<TokenComparisonPage />} />
            <Route path="/portfolio" element={<PortfolioPage />} />
            <Route path="/history" element={<TransactionHistoryPage />} />
            <Route path="/docs" element={<DocsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </PageTransition>
      </Suspense>
    </div>
  );
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <Web3Provider>
      <TooltipProvider>
        <Toaster />
        <Sonner position="top-right" richColors />
        <BrowserRouter>
          <WaveBackground />
          <AppContent />
        </BrowserRouter>
      </TooltipProvider>
    </Web3Provider>
  </QueryClientProvider>
);

export default App;
