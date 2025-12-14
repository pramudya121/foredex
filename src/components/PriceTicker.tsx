import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { TOKEN_LIST, CONTRACTS, NEXUS_TESTNET } from '@/config/contracts';
import { PAIR_ABI, FACTORY_ABI } from '@/config/abis';
import { TokenLogo } from './TokenLogo';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TokenPrice {
  symbol: string;
  logoURI?: string;
  price: number;
  change24h: number;
}

export function PriceTicker() {
  const [prices, setPrices] = useState<TokenPrice[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchPrices = async () => {
      try {
        const provider = new ethers.JsonRpcProvider(NEXUS_TESTNET.rpcUrl);
        const factory = new ethers.Contract(CONTRACTS.FACTORY, FACTORY_ABI, provider);
        
        // Get tokens (excluding native NEX)
        const tokens = TOKEN_LIST.filter(t => t.address !== '0x0000000000000000000000000000000000000000');
        
        const pricePromises = tokens.map(async (token): Promise<TokenPrice | null> => {
          try {
            // Try to get price relative to WNEX
            if (token.symbol === 'WNEX') {
              return {
                symbol: token.symbol,
                logoURI: token.logoURI,
                price: 1, // 1 WNEX = 1 NEX
                change24h: 0,
              };
            }

            // Get pair with WNEX
            const wnexAddress = TOKEN_LIST.find(t => t.symbol === 'WNEX')?.address;
            if (!wnexAddress) return null;

            const pairAddress = await factory.getPair(token.address, wnexAddress);
            if (pairAddress === ethers.ZeroAddress) {
              return {
                symbol: token.symbol,
                logoURI: token.logoURI,
                price: 0,
                change24h: 0,
              };
            }

            const pair = new ethers.Contract(pairAddress, PAIR_ABI, provider);
            const [reserves, token0] = await Promise.all([
              pair.getReserves(),
              pair.token0(),
            ]);

            const isToken0 = token.address.toLowerCase() === token0.toLowerCase();
            const tokenReserve = isToken0 ? reserves[0] : reserves[1];
            const wnexReserve = isToken0 ? reserves[1] : reserves[0];

            // Price in WNEX (which equals NEX)
            const price = tokenReserve > 0n 
              ? Number(wnexReserve) / Number(tokenReserve)
              : 0;

            // Simulate 24h change (random for demo, would come from historical data)
            const change24h = (Math.random() - 0.5) * 10;

            return {
              symbol: token.symbol,
              logoURI: token.logoURI,
              price,
              change24h,
            };
          } catch (error) {
            return {
              symbol: token.symbol,
              logoURI: token.logoURI,
              price: 0,
              change24h: 0,
            };
          }
        });

        const results = await Promise.all(pricePromises);
        setPrices(results.filter((p): p is TokenPrice => p !== null));
      } catch (error) {
        console.error('Failed to fetch prices:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPrices();
    const interval = setInterval(fetchPrices, 30000); // Update every 30s
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
