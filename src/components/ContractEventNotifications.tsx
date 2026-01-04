import { useState } from 'react';
import { useContractEvents, EventLog } from '@/hooks/useContractEvents';
import { Bell, BellOff, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export function ContractEventNotifications() {
  const [events, setEvents] = useState<EventLog[]>([]);
  const [enabled, setEnabled] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  useContractEvents(
    (event) => {
      if (!enabled) return;
      
      setEvents((prev) => {
        const newEvents = [event, ...prev].slice(0, 50); // Keep last 50 events
        return newEvents;
      });
      
      if (!isOpen && event.type !== 'sync') {
        setUnreadCount((prev) => prev + 1);
      }
    },
    { showToasts: enabled, playSounds: enabled }
  );

  const clearEvents = () => {
    setEvents([]);
    setUnreadCount(0);
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open) {
      setUnreadCount(0);
    }
  };

  const getEventIcon = (type: EventLog['type']) => {
    switch (type) {
      case 'swap':
        return '🔄';
      case 'mint':
        return '➕';
      case 'burn':
        return '➖';
      case 'sync':
        return '🔁';
      case 'pairCreated':
        return '🆕';
      default:
        return '📋';
    }
  };

  const getEventColor = (type: EventLog['type']) => {
    switch (type) {
      case 'swap':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/30';
      case 'mint':
        return 'bg-green-500/10 text-green-500 border-green-500/30';
      case 'burn':
        return 'bg-orange-500/10 text-orange-500 border-orange-500/30';
      case 'sync':
        return 'bg-gray-500/10 text-gray-500 border-gray-500/30';
      case 'pairCreated':
        return 'bg-purple-500/10 text-purple-500 border-purple-500/30';
      default:
        return 'bg-muted';
    }
  };

  const formatTime = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    return `${Math.floor(diff / 3600000)}h ago`;
  };

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          {enabled ? (
            <Bell className="w-5 h-5" />
          ) : (
            <BellOff className="w-5 h-5 text-muted-foreground" />
          )}
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-3 border-b">
          <h4 className="font-semibold">Contract Events</h4>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => setEnabled(!enabled)}
            >
              {enabled ? 'Pause' : 'Resume'}
            </Button>
            {events.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={clearEvents}
              >
                Clear
              </Button>
            )}
          </div>
        </div>
        
        <ScrollArea className="h-[300px]">
          {events.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[200px] text-muted-foreground">
              <Bell className="w-8 h-8 mb-2 opacity-50" />
              <p className="text-sm">No events yet</p>
              <p className="text-xs">Contract events will appear here</p>
            </div>
          ) : (
            <div className="divide-y">
              {events.filter(e => e.type !== 'sync').map((event, index) => (
                <div
                  key={`${event.txHash}-${index}`}
                  className="p-3 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <span className="text-lg">{getEventIcon(event.type)}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant="outline" 
                          className={cn('text-[10px] px-1.5 py-0', getEventColor(event.type))}
                        >
                          {event.type.toUpperCase()}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatTime(event.timestamp)}
                        </span>
                      </div>
                      <p className="text-sm font-medium mt-1">
                        {event.token0Symbol}/{event.token1Symbol}
                      </p>
                      {event.amount0 && event.amount1 && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {parseFloat(event.amount0).toFixed(4)} / {parseFloat(event.amount1).toFixed(4)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
