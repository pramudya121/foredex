import { memo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Star, TrendingUp, TrendingDown, Plus, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TokenLogo } from '@/components/TokenLogo';
import { TOKEN_LIST } from '@/config/contracts';
import { useRealtimePrices } from '@/hooks/useRealtimePrices';
import LivePriceIndicator from '@/components/LivePriceIndicator';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

function WatchlistWidget() {
  const navigate = useNavigate();
  const { getAllPrices, isConnected } = useRealtimePrices();
  const [favorites, setFavorites] = useState<string[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('foredex_favorite_tokens');
    if (saved) {
      setFavorites(JSON.parse(saved));
    }
  }, []);

  const prices = getAllPrices();
  const watchlistPrices = prices.filter(p => 
    favorites.includes(p.address) || favorites.includes(p.address.toLowerCase())
  );

  if (!isConnected) {
    return (
      <div className="glass-card p-4">
        <div className="flex items-center gap-2 mb-4">
          <Eye className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">Watchlist</h3>
        </div>
        <div className="space-y-3">
          {Array(3).fill(0).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (watchlistPrices.length === 0) {
    return (
      <div className="glass-card p-4">
        <div className="flex items-center gap-2 mb-4">
          <Eye className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">Watchlist</h3>
        </div>
        <div className="text-center py-6">
          <Star className="w-10 h-10 mx-auto mb-2 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground mb-3">
            No tokens in watchlist
          </p>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => navigate('/tokens')}
          >
            <Plus className="w-4 h-4 mr-1" />
            Add Tokens
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Eye className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">Watchlist</h3>
        </div>
        <span className="text-xs text-muted-foreground flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
          Live
        </span>
      </div>
      <div className="space-y-2">
        {watchlistPrices.map(price => {
          const token = TOKEN_LIST.find(t => 
            t.address.toLowerCase() === price.address.toLowerCase()
          );
          
          return (
            <div 
              key={price.address}
              className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/30 cursor-pointer transition-colors"
              onClick={() => navigate(`/tokens/${price.address}`)}
            >
              <div className="flex items-center gap-2">
                <TokenLogo 
                  symbol={price.symbol} 
                  logoURI={token?.logoURI} 
                  size="sm" 
                />
                <div>
                  <p className="font-medium text-sm">{price.symbol}</p>
                  <p className="text-xs text-muted-foreground">{price.name}</p>
                </div>
              </div>
              <LivePriceIndicator price={price} size="sm" />
            </div>
          );
        })}
      </div>
      <Button 
        variant="ghost" 
        size="sm" 
        className="w-full mt-3"
        onClick={() => navigate('/tokens')}
      >
        View All Tokens
      </Button>
    </div>
  );
}

export default memo(WatchlistWidget);
