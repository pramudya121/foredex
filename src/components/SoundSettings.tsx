import { useState, useEffect } from 'react';
import { Volume2, VolumeX, Bell } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { soundManager, playSuccessSound, playSwapSound, playCoinSound } from '@/lib/sounds';
import { cn } from '@/lib/utils';

interface SoundSettingsProps {
  className?: string;
}

export function SoundSettings({ className }: SoundSettingsProps) {
  const [enabled, setEnabled] = useState(soundManager.isEnabled());
  const [volume, setVolume] = useState([soundManager.getVolume() * 100]);

  useEffect(() => {
    soundManager.setEnabled(enabled);
  }, [enabled]);

  useEffect(() => {
    soundManager.setVolume(volume[0] / 100);
  }, [volume]);

  const testSound = (type: 'success' | 'swap' | 'coin') => {
    switch (type) {
      case 'success':
        playSuccessSound();
        break;
      case 'swap':
        playSwapSound();
        break;
      case 'coin':
        playCoinSound();
        break;
    }
  };

  return (
    <div className={cn('space-y-6', className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
            {enabled ? (
              <Volume2 className="w-5 h-5 text-primary" />
            ) : (
              <VolumeX className="w-5 h-5 text-muted-foreground" />
            )}
          </div>
          <div>
            <Label htmlFor="sound-toggle" className="font-medium">Sound Effects</Label>
            <p className="text-sm text-muted-foreground">Play sounds for transactions</p>
          </div>
        </div>
        <Switch
          id="sound-toggle"
          checked={enabled}
          onCheckedChange={setEnabled}
        />
      </div>

      {enabled && (
        <>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Volume</Label>
              <span className="text-sm text-muted-foreground">{volume[0]}%</span>
            </div>
            <Slider
              value={volume}
              onValueChange={setVolume}
              max={100}
              step={10}
              className="w-full"
            />
          </div>

          <div className="space-y-3">
            <Label className="text-sm">Test Sounds</Label>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => testSound('success')}
                className="gap-2"
              >
                <Bell className="w-3 h-3" />
                Success
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => testSound('swap')}
                className="gap-2"
              >
                <Bell className="w-3 h-3" />
                Swap
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => testSound('coin')}
                className="gap-2"
              >
                <Bell className="w-3 h-3" />
                Coin
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
