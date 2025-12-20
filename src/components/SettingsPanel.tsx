import { useState, useEffect } from 'react';
import { useSettingsStore } from '@/stores/settingsStore';
import { 
  isNotificationSupported, 
  isNotificationEnabled, 
  requestNotificationPermission,
  getUserNotificationPreference,
  setUserNotificationPreference 
} from '@/lib/notifications';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SoundSettings } from './SoundSettings';
import { 
  Settings, 
  Sliders, 
  Bell, 
  Monitor, 
  Zap,
  RotateCcw,
  Check,
  Sun,
  Moon,
  Info,
  Volume2
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export function SettingsPanel() {
  const { settings, updateSettings, resetSettings } = useSettingsStore();
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    if (isNotificationSupported()) {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  const handleRequestNotifications = async () => {
    const permission = await requestNotificationPermission();
    setNotificationPermission(permission);
    if (permission === 'granted') {
      toast.success('Notifications enabled!');
    } else if (permission === 'denied') {
      toast.error('Notification permission denied');
    }
  };

  const handleThemeChange = (theme: 'dark' | 'light') => {
    updateSettings({ theme });
    document.documentElement.classList.toggle('light', theme === 'light');
    localStorage.setItem('foredex-theme', theme);
  };

  const handleReset = () => {
    resetSettings();
    toast.success('Settings reset to defaults');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
            <Settings className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Settings</h1>
            <p className="text-sm text-muted-foreground">Configure your FOREDEX preferences</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={handleReset}>
          <RotateCcw className="w-4 h-4 mr-2" />
          Reset
        </Button>
      </div>

      <Tabs defaultValue="trading" className="space-y-6">
        <TabsList className="glass-card p-1">
          <TabsTrigger value="trading" className="gap-2">
            <Sliders className="w-4 h-4" />
            Trading
          </TabsTrigger>
          <TabsTrigger value="display" className="gap-2">
            <Monitor className="w-4 h-4" />
            Display
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2">
            <Bell className="w-4 h-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="advanced" className="gap-2">
            <Zap className="w-4 h-4" />
            Advanced
          </TabsTrigger>
        </TabsList>

        {/* Trading Settings */}
        <TabsContent value="trading" className="space-y-6">
          <div className="glass-card p-6 space-y-6">
            <h3 className="text-lg font-semibold">Slippage Tolerance</h3>
            
            {/* Auto Slippage */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="flex items-center gap-2">
                  Auto Slippage
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="w-3.5 h-3.5 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">Automatically adjusts slippage based on pool conditions and trade size</p>
                    </TooltipContent>
                  </Tooltip>
                </Label>
                <p className="text-sm text-muted-foreground">
                  Recommended for optimal trade execution
                </p>
              </div>
              <Switch
                checked={settings.autoSlippage}
                onCheckedChange={(checked) => updateSettings({ autoSlippage: checked })}
              />
            </div>

            {/* Default Slippage */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Default Slippage</Label>
                <span className="text-sm font-medium">{settings.defaultSlippage}%</span>
              </div>
              <div className="flex gap-2">
                {[0.1, 0.5, 1.0, 3.0].map((value) => (
                  <Button
                    key={value}
                    size="sm"
                    variant={settings.defaultSlippage === value ? 'default' : 'outline'}
                    onClick={() => updateSettings({ defaultSlippage: value })}
                  >
                    {value}%
                  </Button>
                ))}
                <Input
                  type="number"
                  placeholder="Custom"
                  className="w-24"
                  value={![0.1, 0.5, 1.0, 3.0].includes(settings.defaultSlippage) ? settings.defaultSlippage : ''}
                  onChange={(e) => {
                    const value = parseFloat(e.target.value);
                    if (!isNaN(value) && value > 0 && value <= 50) {
                      updateSettings({ defaultSlippage: value });
                    }
                  }}
                />
              </div>
            </div>

            {/* Transaction Deadline */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  Transaction Deadline
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="w-3.5 h-3.5 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">Transaction will revert if pending for longer than this</p>
                    </TooltipContent>
                  </Tooltip>
                </Label>
                <span className="text-sm font-medium">{settings.transactionDeadline} minutes</span>
              </div>
              <Slider
                value={[settings.transactionDeadline]}
                onValueChange={([value]) => updateSettings({ transactionDeadline: value })}
                min={1}
                max={60}
                step={1}
              />
            </div>
          </div>
        </TabsContent>

        {/* Display Settings */}
        <TabsContent value="display" className="space-y-6">
          <div className="glass-card p-6 space-y-6">
            <h3 className="text-lg font-semibold">Appearance</h3>
            
            {/* Theme */}
            <div className="space-y-4">
              <Label>Theme</Label>
              <div className="flex gap-3">
                <Button
                  variant={settings.theme === 'dark' ? 'default' : 'outline'}
                  className="flex-1 gap-2"
                  onClick={() => handleThemeChange('dark')}
                >
                  <Moon className="w-4 h-4" />
                  Dark
                  {settings.theme === 'dark' && <Check className="w-4 h-4" />}
                </Button>
                <Button
                  variant={settings.theme === 'light' ? 'default' : 'outline'}
                  className="flex-1 gap-2"
                  onClick={() => handleThemeChange('light')}
                >
                  <Sun className="w-4 h-4" />
                  Light
                  {settings.theme === 'light' && <Check className="w-4 h-4" />}
                </Button>
              </div>
            </div>

            {/* Price Ticker */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Show Price Ticker</Label>
                <p className="text-sm text-muted-foreground">
                  Display scrolling token prices below header
                </p>
              </div>
              <Switch
                checked={settings.showPriceTicker}
                onCheckedChange={(checked) => updateSettings({ showPriceTicker: checked })}
              />
            </div>

            {/* Compact Mode */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Compact Mode</Label>
                <p className="text-sm text-muted-foreground">
                  Use smaller spacing and fonts
                </p>
              </div>
              <Switch
                checked={settings.compactMode}
                onCheckedChange={(checked) => updateSettings({ compactMode: checked })}
              />
            </div>
          </div>
        </TabsContent>

        {/* Notification Settings */}
        <TabsContent value="notifications" className="space-y-6">
          <div className="glass-card p-6 space-y-6">
            <h3 className="text-lg font-semibold">Browser Notifications</h3>
            
            {!isNotificationSupported() ? (
              <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-yellow-500">
                Your browser doesn't support notifications
              </div>
            ) : notificationPermission !== 'granted' ? (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Enable notifications to get alerts when your transactions complete
                </p>
                <Button onClick={handleRequestNotifications}>
                  <Bell className="w-4 h-4 mr-2" />
                  Enable Notifications
                </Button>
              </div>
            ) : (
              <>
                {/* Enable Notifications */}
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Enable Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive browser push notifications
                    </p>
                  </div>
                  <Switch
                    checked={settings.enableNotifications}
                    onCheckedChange={(checked) => updateSettings({ enableNotifications: checked })}
                  />
                </div>

                {/* Transaction Confirmation */}
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Transaction Confirmations</Label>
                    <p className="text-sm text-muted-foreground">
                      Notify when transactions are confirmed
                    </p>
                  </div>
                  <Switch
                    checked={settings.notifyOnConfirmation}
                    onCheckedChange={(checked) => updateSettings({ notifyOnConfirmation: checked })}
                    disabled={!settings.enableNotifications}
                  />
                </div>

                {/* Transaction Failure */}
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Transaction Failures</Label>
                    <p className="text-sm text-muted-foreground">
                      Notify when transactions fail
                    </p>
                  </div>
                  <Switch
                    checked={settings.notifyOnFailure}
                    onCheckedChange={(checked) => updateSettings({ notifyOnFailure: checked })}
                    disabled={!settings.enableNotifications}
                  />
                </div>
              </>
            )}
          </div>

          {/* Sound Effects Section */}
          <div className="glass-card p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Volume2 className="w-5 h-5 text-primary" />
              Sound Effects
            </h3>
            <SoundSettings />
          </div>
        </TabsContent>

        {/* Advanced Settings */}
        <TabsContent value="advanced" className="space-y-6">
          <div className="glass-card p-6 space-y-6">
            <h3 className="text-lg font-semibold">Advanced Options</h3>
            
            {/* Expert Mode */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="flex items-center gap-2 text-orange-500">
                  Expert Mode
                  <span className="px-2 py-0.5 text-xs bg-orange-500/20 rounded">RISKY</span>
                </Label>
                <p className="text-sm text-muted-foreground">
                  Disable safety warnings and confirmations
                </p>
              </div>
              <Switch
                checked={settings.expertMode}
                onCheckedChange={(checked) => {
                  if (checked) {
                    toast.warning('Expert mode enabled - trade carefully!');
                  }
                  updateSettings({ expertMode: checked });
                }}
              />
            </div>

            {/* Gas Price */}
            <div className="space-y-4">
              <Label>Gas Price Preference</Label>
              <div className="grid grid-cols-3 gap-2">
                {(['low', 'medium', 'high'] as const).map((speed) => (
                  <Button
                    key={speed}
                    variant={settings.gasPrice === speed ? 'default' : 'outline'}
                    className="capitalize"
                    onClick={() => updateSettings({ gasPrice: speed })}
                  >
                    {speed}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="glass-card p-6 border-destructive/50">
            <h3 className="text-lg font-semibold text-destructive mb-4">Danger Zone</h3>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Reset All Settings</Label>
                <p className="text-sm text-muted-foreground">
                  Restore all settings to their default values
                </p>
              </div>
              <Button variant="destructive" size="sm" onClick={handleReset}>
                Reset All
              </Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
