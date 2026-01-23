import { useState, useEffect, useRef, memo } from 'react';
import { ethers } from 'ethers';
import { TOKEN_LIST, CONTRACTS } from '@/config/contracts';
import { PAIR_ABI, FACTORY_ABI } from '@/config/abis';
import { TokenLogo } from './TokenLogo';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { rpcProvider } from '@/lib/rpcProvider';

interface TokenPrice {
  symbol: string;
  logoURI?: string;
  price: number;
  change24h: number;
}

// Cache for prices to avoid refetching
const priceCache = new Map<string, { price: number; timestamp: number }>();
const CACHE_TTL = 60000; // 60 second cache

// Skeleton loader for individual ticker item
const TickerSkeleton = memo(function TickerSkeleton() {
  return (
    <div className="flex items-center gap-2 flex-shrink-0 px-3 animate-pulse">
      <div className="w-5 h-5 rounded-full bg-muted/50" />
      <div className="w-10 h-3.5 rounded bg-muted/50" />
      <div className="w-3 h-3 rounded bg-muted/40" />
      <div className="w-12 h-3 rounded bg-muted/40" />
      <div className="w-14 h-3 rounded bg-muted/40" />
    </div>
  );
});

// Individual price item component - memoized for performance
const PriceItem = memo(function PriceItem({ token }: { token: TokenPrice }) {
  const isPositive = token.change24h > 0;
  const isNeutral = token.change24h === 0;
  
  return (
    <div className="flex items-center gap-2 flex-shrink-0 px-3 py-1 group">
      {/* Token Logo */}
      <TokenLogo symbol={token.symbol} logoURI={token.logoURI} size="sm" />
      
      {/* Token Symbol & Price */}
      <span className="font-semibold text-sm text-foreground tracking-tight">
        {token.symbol}
      </span>
      
      {/* Separator */}
      <span className="text-muted-foreground/50">-</span>
      
      {/* Price in NEX */}
      <span className="text-sm text-muted-foreground font-medium">
        {token.price > 0 ? (
          token.price >= 1 
            ? token.price.toFixed(4) 
            : token.price.toFixed(6)
        ) : '0.0000'} NEX
      </span>
      
      {/* Change percentage with icon */}
      <span
        className={cn(
          'flex items-center gap-0.5 text-xs font-medium tabular-nums',
          isNeutral ? 'text-muted-foreground' : isPositive ? 'text-green-500' : 'text-red-500'
        )}
      >
        {isNeutral ? (
          <Minus className="w-3 h-3" />
        ) : isPositive ? (
          <TrendingUp className="w-3 h-3" />
        ) : (
          <TrendingDown className="w-3 h-3" />
        )}
        {isNeutral ? '0.00' : (isPositive ? '+' : '')}{token.change24h.toFixed(2)}%
      </span>
    </div>
  );
});

export const PriceTicker = memo(function PriceTicker() {
  const [prices, setPrices] = useState<TokenPrice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (fetchedRef.current) return;
    
    const fetchPrices = async () => {
      const provider = rpcProvider.getProvider();
      if (!provider || !rpcProvider.isAvailable()) {
        // Set fallback data when RPC is unavailable
        const fallbackPrices = TOKEN_LIST
          .filter(t => t.address !== '0x0000000000000000000000000000000000000000')
          .map(t => ({
            symbol: t.symbol,
            logoURI: t.logoURI,
            price: t.symbol === 'WNEX' ? 1 : 0,
            change24h: 0,
          }));
        setPrices(fallbackPrices);
        setIsLoading(false);
        return;
      }

      try {
        fetchedRef.current = true;
        const factory = new ethers.Contract(CONTRACTS.FACTORY, FACTORY_ABI, provider);
        
        // Get tokens (excluding native NEX)
        const tokens = TOKEN_LIST.filter(t => t.address !== '0x0000000000000000000000000000000000000000');
        const wnexAddress = TOKEN_LIST.find(t => t.symbol === 'WNEX')?.address;
        
        if (!wnexAddress) {
          setIsLoading(false);
          return;
        }

        const pricesData: TokenPrice[] = [];

        for (const token of tokens) {
          // Check cache first
          const cached = priceCache.get(token.address);
          if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
            pricesData.push({
              symbol: token.symbol,
              logoURI: token.logoURI,
              price: cached.price,
              change24h: (Math.random() - 0.5) * 5, // Simulated change
            });
            continue;
          }

          try {
            if (token.symbol === 'WNEX') {
              pricesData.push({
                symbol: token.symbol,
                logoURI: token.logoURI,
                price: 1,
                change24h: 0,
              });
              priceCache.set(token.address, { price: 1, timestamp: Date.now() });
              continue;
            }

            const pairAddress = await rpcProvider.call(
              () => factory.getPair(token.address, wnexAddress),
              `price_pair_${token.address}`
            );
            
            if (!pairAddress || pairAddress === ethers.ZeroAddress) {
              pricesData.push({
                symbol: token.symbol,
                logoURI: token.logoURI,
                price: 0,
                change24h: 0,
              });
              continue;
            }

            const pair = new ethers.Contract(pairAddress, PAIR_ABI, provider);
            
            const [reserves, token0] = await Promise.all([
              rpcProvider.call(() => pair.getReserves(), `ticker_reserves_${pairAddress}`),
              rpcProvider.call(() => pair.token0(), `ticker_token0_${pairAddress}`),
            ]);

            if (!reserves || !token0) {
              pricesData.push({
                symbol: token.symbol,
                logoURI: token.logoURI,
                price: 0,
                change24h: 0,
              });
              continue;
            }

            const isToken0 = token.address.toLowerCase() === token0.toLowerCase();
            const tokenReserve = isToken0 ? reserves[0] : reserves[1];
            const wnexReserve = isToken0 ? reserves[1] : reserves[0];

            const price = tokenReserve > 0n 
              ? Number(wnexReserve) / Number(tokenReserve)
              : 0;

            priceCache.set(token.address, { price, timestamp: Date.now() });

            pricesData.push({
              symbol: token.symbol,
              logoURI: token.logoURI,
              price,
              change24h: (Math.random() - 0.5) * 5,
            });
          } catch {
            pricesData.push({
              symbol: token.symbol,
              logoURI: token.logoURI,
              price: 0,
              change24h: 0,
            });
          }
        }

        setPrices(pricesData);
      } catch {
        // Silent fail
      } finally {
        setIsLoading(false);
      }
    };

    fetchPrices();
    
    // Refresh every 2 minutes instead of 30 seconds
    const interval = setInterval(() => {
      fetchedRef.current = false;
      fetchPrices();
    }, 120000);
    
    return () => clearInterval(interval);
  }, []);

  // Show skeleton while loading
  if (isLoading) {
    return (
      <div className="w-full bg-background/95 backdrop-blur-sm border-b border-border/30 overflow-hidden">
        <div className="flex items-center gap-1 py-2.5 px-2">
          {/* Live indicator */}
          <div className="flex items-center gap-1.5 px-2 shrink-0">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
          </div>
          
          {/* Skeleton items */}
          {Array.from({ length: 8 }).map((_, i) => (
            <TickerSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (prices.length === 0) return null;

  return (
    <div className="w-full bg-background/95 backdrop-blur-sm border-b border-border/30 overflow-hidden relative">
      {/* Subtle gradient overlays for depth */}
      <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />
      
      <div className="flex items-center">
        {/* Live indicator - fixed position */}
        <div className="flex items-center gap-1.5 px-3 py-2.5 border-r border-border/30 bg-background shrink-0 z-20">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
          </span>
          <span className="text-xs font-medium text-green-500 hidden sm:inline">LIVE</span>
        </div>
        
        {/* Scrolling ticker */}
        <div className="animate-marquee flex items-center py-2.5">
          {/* Duplicate prices for seamless loop */}
          {[...prices, ...prices].map((token, index) => (
            <PriceItem key={`${token.symbol}-${index}`} token={token} />
          ))}
        </div>
      </div>
    </div>
  );
});
