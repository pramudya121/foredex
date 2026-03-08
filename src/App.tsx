import { lazy, Suspense, memo, useEffect } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Web3Provider } from "@/contexts/Web3Context";
import { Header } from "@/components/Header";
import { WaveBackground } from "@/components/WaveBackground";
import { WolfSpinner } from "@/components/WolfSpinner";
import { PageTransition } from "@/components/PageTransition";
import { SkipLink } from "@/components/ui/accessibility-skip-link";
import { ParticleField } from "@/components/3d/ParticleField";
import RpcStatusBanner from "@/components/RpcStatusBanner";
import { toast } from "sonner";

// Lazy load pages for better performance
const Home = lazy(() => import("./pages/Home"));
const Index = lazy(() => import("./pages/Index"));
const Liquidity = lazy(() => import("./pages/Liquidity"));
const Pools = lazy(() => import("./pages/Pools"));
const FarmingPage = lazy(() => import("./pages/FarmingPage"));
const FarmingAdminPage = lazy(() => import("./pages/FarmingAdminPage"));
const FarmingPoolDetailPage = lazy(() => import("./pages/FarmingPoolDetailPage"));
const LiquidityPoolDetailPage = lazy(() => import("./pages/LiquidityPoolDetailPage"));
const TokensPage = lazy(() => import("./pages/TokensPage"));
const TokenDetailPage = lazy(() => import("./pages/TokenDetailPage"));
const AnalyticsPage = lazy(() => import("./pages/AnalyticsPage"));
const PortfolioPage = lazy(() => import("./pages/PortfolioPage"));
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
      staleTime: 60000, // 1 minute
      gcTime: 300000, // 5 minutes
      refetchOnWindowFocus: false,
      retry: 2,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
  },
});

const AppContent = memo(function AppContent() {
  // Global unhandled promise rejection handler
  useEffect(() => {
    const handleRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      const message = reason?.message || String(reason);
      
      // Suppress network/RPC errors - these are handled elsewhere
      if (message.includes('429') || 
          message.includes('CORS') || 
          message.includes('Failed to fetch') ||
          message.includes('NetworkError') ||
          message.includes('Timeout') ||
          message.includes('coalesce') ||
          message.includes('WS Timeout') ||
          message.includes('rate limit')) {
        event.preventDefault();
        return;
      }
      
      // Handle user rejection silently
      if (message.includes('user rejected') || message.includes('ACTION_REJECTED')) {
        event.preventDefault();
        return;
      }
      
      // Log unexpected errors for debugging
      console.error('Unhandled promise rejection:', reason);
      event.preventDefault();
    };

    window.addEventListener('unhandledrejection', handleRejection);
    return () => window.removeEventListener('unhandledrejection', handleRejection);
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Accessibility: Skip to main content link */}
      <SkipLink />
      
      {/* 3D Particle background effect */}
      <ParticleField />
      
      <Header />
      <main id="main-content" role="main" tabIndex={-1} className="flex-1 outline-none">
        <Suspense fallback={<PageLoader />}>
          <PageTransition>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/swap" element={<Index />} />
              <Route path="/liquidity" element={<Liquidity />} />
              <Route path="/pools" element={<Pools />} />
              <Route path="/pools/:address" element={<LiquidityPoolDetailPage />} />
              <Route path="/farming" element={<FarmingPage />} />
              <Route path="/farming/admin" element={<FarmingAdminPage />} />
              <Route path="/farming/:pid" element={<FarmingPoolDetailPage />} />
              <Route path="/tokens" element={<TokensPage />} />
              <Route path="/tokens/:address" element={<TokenDetailPage />} />
              <Route path="/analytics" element={<AnalyticsPage />} />
              <Route path="/portfolio" element={<PortfolioPage />} />
              <Route path="/docs" element={<DocsPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </PageTransition>
        </Suspense>
      </main>
      <RpcStatusBanner />
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
