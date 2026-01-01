import { memo } from 'react';
import { SettingsPanel } from '@/components/SettingsPanel';
import { Settings, Shield, Sliders } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const SettingsPage = () => {
  return (
    <main className="container py-4 sm:py-6 md:py-10 max-w-2xl px-3 sm:px-4">
      {/* Hero Section */}
      <div className="mb-6 sm:mb-8">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2.5 sm:p-3 rounded-xl bg-gradient-wolf">
            <Settings className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">
              App <span className="text-primary">Settings</span>
            </h1>
            <Badge variant="secondary" className="mt-1 text-xs">
              <Shield className="w-3 h-3 mr-1 text-green-500" />
              Stored Locally
            </Badge>
          </div>
        </div>
        <p className="text-muted-foreground text-xs sm:text-sm md:text-base max-w-xl">
          Customize your trading experience with slippage, themes, and notifications.
        </p>
        
        {/* Quick Features */}
        <div className="flex flex-wrap gap-2 mt-4">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs">
            <Sliders className="w-3 h-3 text-primary" />
            <span className="text-muted-foreground">Slippage Control</span>
          </div>
        </div>
      </div>
      
      <SettingsPanel />
    </main>
  );
};

export default memo(SettingsPage);