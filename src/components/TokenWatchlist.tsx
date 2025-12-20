import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { Star, Trash2, TrendingUp, TrendingDown, ExternalLink } from 'lucide-react';
import { useWatchlistStore } from '@/stores/watchlistStore';
import { TOKEN_LIST, NEXUS_TESTNET, CONTRACTS } from '@/config/contracts';
import { FACTORY_ABI, PAIR_ABI, ERC20_ABI } from '@/config/abis';
import { TokenLogo } from './TokenLogo';
import { Button } from './ui/button';
import { rpcProvider } from '@/lib/rpcProvider';
import { useWeb3 } from '@/contexts/Web3Context';

interface TokenPriceData {
  address: string;
  price: number;
  change24h: number;
  balance: string;
}

export function TokenWatchlist() {
  const { tokens, removeToken } = useWatchlistStore();
  const { address: userAddress, isConnected } = useWeb3();
  const [priceData, setPriceData] = useState<Map<string, TokenPriceData>>(new Map());
  const [loading, setLoading] = useState(true);

  const fetchPrices = useCallback(async () => {
    if (tokens.length === 0) {
      setLoading(false);
      return;
    }

    const provider = rpcProvider.getProvider();
    if (!provider || !rpcProvider.isAvailable()) {
      setLoading(false);
      return;
    }

    const newPriceData = new Map<string, TokenPriceData>();

    for (const token of tokens) {
      try {
        // Get user balance if connected
        let balance = '0';
        if (isConnected && userAddress && token.address !== '0x0000000000000000000000000000000000000000') {
          const tokenContract = new ethers.Contract(token.address, ERC20_ABI, provider);
          const bal = await rpcProvider.call(
            () => tokenContract.balanceOf(userAddress),
            `watchlist_bal_${token.address}_${userAddress}`
          );
          if (bal) {
            balance = ethers.formatEther(bal);
          }
        }

        // Simulate price and 24h change (would need actual oracle for real data)
        const basePrice = Math.random() * 100 + 1;
        const change = (Math.random() - 0.5) * 20;

        newPriceData.set(token.address.toLowerCase(), {
          address: token.address,
          price: basePrice,
          change24h: change,
          balance,
        });
      } catch {
        // Silent fail
      }
    }

    setPriceData(newPriceData);
    setLoading(false);
  }, [tokens, isConnected, userAddress]);

  useEffect(() => {
    fetchPrices();
    const interval = setInterval(fetchPrices, 60000);
    return () => clearInterval(interval);
  }, [fetchPrices]);

  if (tokens.length === 0) {
    return (
      <div className="glass-card p-8 text-center">
        <Star className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
        <h3 className="font-semibold mb-2">No Watched Tokens</h3>
        <p className="text-sm text-muted-foreground">
          Add tokens to your watchlist to track them here
        </p>
      </div>
    );
  }

  return (
    <div className="glass-card p-4 sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Star className="w-5 h-5 text-primary fill-primary" />
          Watchlist
        </h3>
        <span className="text-sm text-muted-foreground">{tokens.length} tokens</span>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse flex items-center gap-3 p-3 rounded-lg bg-muted/30">
              <div className="w-10 h-10 rounded-full bg-muted/50" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-muted/50 rounded w-1/4" />
                <div className="h-3 bg-muted/50 rounded w-1/3" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {tokens.map((token) => {
            const data = priceData.get(token.address.toLowerCase());
            const isPositive = data ? data.change24h >= 0 : true;

            return (
              <div
                key={token.address}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <TokenLogo symbol={token.symbol} logoURI={token.logoURI} size="md" />
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{token.symbol}</p>
                    <p className="text-xs text-muted-foreground truncate">{token.name}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  {data && (
                    <div className="text-right hidden sm:block">
                      <p className="text-sm font-mono">
                        {parseFloat(data.balance).toFixed(4)}
                      </p>
                      <div className={`flex items-center gap-1 text-xs ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
                        {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        {isPositive ? '+' : ''}{data.change24h.toFixed(2)}%
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-1">
                    <a
                      href={`${NEXUS_TESTNET.blockExplorer}/token/${token.address}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-lg hover:bg-muted transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <ExternalLink className="w-4 h-4 text-muted-foreground" />
                    </a>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 opacity-0 group-hover:opacity-100"
                      onClick={() => removeToken(token.address)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Button to add/remove token from watchlist
export function WatchlistButton({ 
  token 
}: { 
  token: { address: string; symbol: string; name: string; logoURI?: string } 
}) {
  const { addToken, removeToken, isWatched } = useWatchlistStore();
  const watched = isWatched(token.address);

  const toggleWatch = () => {
    if (watched) {
      removeToken(token.address);
    } else {
      addToken(token);
    }
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleWatch}
      className="h-8 w-8"
      title={watched ? 'Remove from watchlist' : 'Add to watchlist'}
    >
      <Star className={`w-4 h-4 ${watched ? 'text-primary fill-primary' : 'text-muted-foreground'}`} />
    </Button>
  );
}