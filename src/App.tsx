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
import Index from "./pages/Index";
import Liquidity from "./pages/Liquidity";
import Pools from "./pages/Pools";
import AnalyticsPage from "./pages/AnalyticsPage";
import PortfolioPage from "./pages/PortfolioPage";
import DocsPage from "./pages/DocsPage";
import SettingsPage from "./pages/SettingsPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function AppContent() {
  const { settings } = useSettingsStore();
  
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      {settings.showPriceTicker && <PriceTicker />}
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/liquidity" element={<Liquidity />} />
        <Route path="/pools" element={<Pools />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
        <Route path="/portfolio" element={<PortfolioPage />} />
        <Route path="/docs" element={<DocsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </div>
  );
}

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
