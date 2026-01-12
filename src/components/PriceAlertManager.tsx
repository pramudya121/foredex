import { useState, useEffect, memo, forwardRef } from 'react';
import { Bell, BellRing, Plus, Trash2, TrendingUp, TrendingDown, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TokenLogo } from '@/components/TokenLogo';
import { TOKEN_LIST } from '@/config/contracts';
import { usePriceAlertStore, PriceAlert } from '@/stores/priceAlertStore';
import { useRealtimePrices } from '@/hooks/useRealtimePrices';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const AlertItem = memo(({ alert, onRemove }: { alert: PriceAlert; onRemove: (id: string) => void }) => {
  const token = TOKEN_LIST.find(t => t.address.toLowerCase() === alert.tokenAddress.toLowerCase());
  
  return (
    <div className={cn(
      'flex items-center justify-between p-3 rounded-lg border',
      alert.triggered 
        ? 'bg-green-500/10 border-green-500/30' 
        : 'bg-muted/30 border-border/50'
    )}>
      <div className="flex items-center gap-3">
        <TokenLogo symbol={alert.tokenSymbol} logoURI={token?.logoURI} size="sm" />
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium">{alert.tokenSymbol}</span>
            {alert.condition === 'above' ? (
              <TrendingUp className="w-4 h-4 text-green-500" />
            ) : (
              <TrendingDown className="w-4 h-4 text-red-500" />
            )}
            <span className="text-sm text-muted-foreground">
              ${alert.targetPrice.toFixed(4)}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            {alert.triggered ? 'Triggered!' : `Alert when ${alert.condition} target`}
          </p>
        </div>
      </div>
      <Button
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
        onClick={() => onRemove(alert.id)}
      >
        <Trash2 className="w-4 h-4" />
      </Button>
    </div>
  );
});

AlertItem.displayName = 'AlertItem';

const PriceAlertManager = forwardRef<HTMLDivElement>(function PriceAlertManager(_, ref) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedToken, setSelectedToken] = useState('');
  const [targetPrice, setTargetPrice] = useState('');
  const [condition, setCondition] = useState<'above' | 'below'>('above');
  
  const { alerts, addAlert, removeAlert, triggerAlert, getActiveAlerts, getTriggeredAlerts } = usePriceAlertStore();
  const { getPrice } = useRealtimePrices();

  // Check alerts against current prices
  useEffect(() => {
    const activeAlerts = getActiveAlerts();
    
    activeAlerts.forEach(alert => {
      const price = getPrice(alert.tokenAddress);
      if (!price) return;

      const shouldTrigger = 
        (alert.condition === 'above' && price.price >= alert.targetPrice) ||
        (alert.condition === 'below' && price.price <= alert.targetPrice);

      if (shouldTrigger) {
        triggerAlert(alert.id);
        toast.success(`Price Alert: ${alert.tokenSymbol} is now ${alert.condition} $${alert.targetPrice.toFixed(4)}!`, {
          duration: 10000,
        });
        
        // Browser notification
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification(`FOREDEX Price Alert`, {
            body: `${alert.tokenSymbol} is now ${alert.condition} $${alert.targetPrice.toFixed(4)}!`,
            icon: '/wolf-logo.png',
          });
        }
      }
    });
  }, [getPrice, getActiveAlerts, triggerAlert]);

  const handleAddAlert = () => {
    if (!selectedToken || !targetPrice) {
      toast.error('Please select a token and enter a target price');
      return;
    }

    const token = TOKEN_LIST.find(t => t.address === selectedToken);
    if (!token) return;

    addAlert({
      tokenAddress: selectedToken,
      tokenSymbol: token.symbol,
      targetPrice: parseFloat(targetPrice),
      condition,
    });

    setSelectedToken('');
    setTargetPrice('');
    toast.success(`Alert created for ${token.symbol}`);
  };

  const activeAlerts = getActiveAlerts();
  const triggeredAlerts = getTriggeredAlerts();

  return (
    <div ref={ref}>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="icon" className="relative">
            {triggeredAlerts.length > 0 ? (
              <BellRing className="w-4 h-4 text-primary animate-pulse" />
            ) : (
              <Bell className="w-4 h-4" />
            )}
            {(activeAlerts.length + triggeredAlerts.length) > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary text-primary-foreground text-xs rounded-full flex items-center justify-center">
                {activeAlerts.length + triggeredAlerts.length}
              </span>
            )}
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Price Alerts
            </DialogTitle>
          </DialogHeader>

          {/* Create Alert Form */}
          <div className="space-y-4 p-4 bg-muted/30 rounded-lg">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Token</Label>
                <Select value={selectedToken} onValueChange={setSelectedToken}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select token" />
                  </SelectTrigger>
                  <SelectContent>
                    {TOKEN_LIST
                      .filter(t => t.address !== '0x0000000000000000000000000000000000000000')
                      .map(token => (
                        <SelectItem key={token.address} value={token.address}>
                          <div className="flex items-center gap-2">
                            <TokenLogo symbol={token.symbol} logoURI={token.logoURI} size="sm" />
                            {token.symbol}
                          </div>
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Condition</Label>
                <Select value={condition} onValueChange={(v) => setCondition(v as 'above' | 'below')}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="above">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-green-500" />
                        Above
                      </div>
                    </SelectItem>
                    <SelectItem value="below">
                      <div className="flex items-center gap-2">
                        <TrendingDown className="w-4 h-4 text-red-500" />
                        Below
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Target Price (USD)</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  step="0.0001"
                  placeholder="0.00"
                  value={targetPrice}
                  onChange={(e) => setTargetPrice(e.target.value)}
                  className="flex-1"
                />
                <Button onClick={handleAddAlert} size="icon">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Active Alerts */}
          {activeAlerts.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Active Alerts</h4>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {activeAlerts.map(alert => (
                  <AlertItem key={alert.id} alert={alert} onRemove={removeAlert} />
                ))}
              </div>
            </div>
          )}

          {/* Triggered Alerts */}
          {triggeredAlerts.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-green-500">Triggered Alerts</h4>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {triggeredAlerts.map(alert => (
                  <AlertItem key={alert.id} alert={alert} onRemove={removeAlert} />
                ))}
              </div>
            </div>
          )}

          {alerts.length === 0 && (
            <p className="text-center text-muted-foreground py-4">
              No alerts set. Create one above!
            </p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
});

PriceAlertManager.displayName = 'PriceAlertManager';

export default memo(PriceAlertManager);
