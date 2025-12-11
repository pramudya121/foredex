import { useState } from 'react';
import { Settings, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface SlippageSettingsProps {
  slippage: number;
  onSlippageChange: (value: number) => void;
  deadline: number;
  onDeadlineChange: (value: number) => void;
}

const SLIPPAGE_OPTIONS = [0.1, 0.5, 1.0, 3.0];

export function SlippageSettings({
  slippage,
  onSlippageChange,
  deadline,
  onDeadlineChange,
}: SlippageSettingsProps) {
  const [customSlippage, setCustomSlippage] = useState('');
  const [isCustom, setIsCustom] = useState(false);

  const handleCustomSlippageChange = (value: string) => {
    setCustomSlippage(value);
    const num = parseFloat(value);
    if (!isNaN(num) && num > 0 && num <= 50) {
      onSlippageChange(num);
      setIsCustom(true);
    }
  };

  const handlePresetClick = (value: number) => {
    onSlippageChange(value);
    setIsCustom(false);
    setCustomSlippage('');
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Settings className="w-4 h-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-4" align="end">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold">Transaction Settings</h4>
          </div>

          {/* Slippage Tolerance */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Slippage Tolerance</span>
              <div className="group relative">
                <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-popover border rounded-lg text-xs w-48 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                  Your transaction will revert if the price changes unfavorably by more than this percentage.
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              {SLIPPAGE_OPTIONS.map((option) => (
                <Button
                  key={option}
                  variant="outline"
                  size="sm"
                  className={cn(
                    'flex-1',
                    slippage === option && !isCustom && 'bg-primary text-primary-foreground hover:bg-primary/90'
                  )}
                  onClick={() => handlePresetClick(option)}
                >
                  {option}%
                </Button>
              ))}
            </div>

            <div className="relative">
              <input
                type="number"
                placeholder="Custom"
                value={customSlippage}
                onChange={(e) => handleCustomSlippageChange(e.target.value)}
                className={cn(
                  'w-full px-3 py-2 pr-8 rounded-lg bg-muted/50 border border-border text-sm',
                  'focus:outline-none focus:ring-2 focus:ring-primary/50',
                  isCustom && 'border-primary'
                )}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                %
              </span>
            </div>

            {slippage > 5 && (
              <p className="text-xs text-yellow-500">
                High slippage may result in unfavorable trades
              </p>
            )}
          </div>

          {/* Transaction Deadline */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Transaction Deadline</span>
              <div className="group relative">
                <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-popover border rounded-lg text-xs w-48 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                  Your transaction will revert if it is pending for more than this period of time.
                </div>
              </div>
            </div>

            <div className="relative">
              <input
                type="number"
                value={deadline}
                onChange={(e) => onDeadlineChange(Math.max(1, parseInt(e.target.value) || 20))}
                className="w-full px-3 py-2 pr-16 rounded-lg bg-muted/50 border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                minutes
              </span>
            </div>
          </div>

          {/* Current Settings Display */}
          <div className="pt-2 border-t border-border">
            <p className="text-xs text-muted-foreground">
              Current: {slippage}% slippage, {deadline}min deadline
            </p>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
