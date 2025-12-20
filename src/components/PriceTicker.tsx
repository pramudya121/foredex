import { useState, useEffect, useRef } from 'react';
import { ethers } from 'ethers';
import { TOKEN_LIST, CONTRACTS } from '@/config/contracts';
import { PAIR_ABI, FACTORY_ABI } from '@/config/abis';
import { TokenLogo } from './TokenLogo';
import { TrendingUp, TrendingDown } from 'lucide-react';
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

export function PriceTicker() {
  const [prices, setPrices] = useState<TokenPrice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (fetchedRef.current) return;
    
    const fetchPrices = async () => {
      const provider = rpcProvider.getProvider();
      if (!provider || !rpcProvider.isAvailable()) {
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

  if (isLoading || prices.length === 0) return null;

  return (
    <div className="w-full bg-muted/30 border-t border-b border-border/30 overflow-hidden">
      <div className="animate-marquee flex items-center gap-8 py-2 px-4">
        {[...prices, ...prices].map((token, index) => (
          <div
            key={`${token.symbol}-${index}`}
            className="flex items-center gap-2 flex-shrink-0"
          >
            <TokenLogo symbol={token.symbol} logoURI={token.logoURI} size="sm" />
            <span className="font-medium text-sm">{token.symbol}</span>
            <span className="text-sm text-muted-foreground">
              {token.price > 0 ? token.price.toFixed(4) : '-'} NEX
            </span>
            <span
              className={cn(
                'flex items-center gap-0.5 text-xs',
                token.change24h >= 0 ? 'text-green-500' : 'text-red-500'
              )}
            >
              {token.change24h >= 0 ? (
                <TrendingUp className="w-3 h-3" />
              ) : (
                <TrendingDown className="w-3 h-3" />
              )}
              {Math.abs(token.change24h).toFixed(2)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}