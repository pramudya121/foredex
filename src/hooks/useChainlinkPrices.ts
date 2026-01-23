import { useState, useEffect, useCallback } from 'react';
import { PriceData, priceFeedSubscription, getTokenPrice } from '@/lib/chainlinkPriceFeeds';

export interface UseChainlinkPricesResult {
  prices: Map<string, PriceData>;
  loading: boolean;
  error: string | null;
  getPrice: (symbol: string) => PriceData | undefined;
  refresh: () => Promise<void>;
}

export function useChainlinkPrices(): UseChainlinkPricesResult {
  const [prices, setPrices] = useState<Map<string, PriceData>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = priceFeedSubscription.subscribe((newPrices) => {
      setPrices(newPrices);
      setLoading(false);
      setError(null);
    });

    return unsubscribe;
  }, []);

  const getPrice = useCallback((symbol: string): PriceData | undefined => {
    return prices.get(symbol.toUpperCase());
  }, [prices]);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      // Force refresh all prices
      const symbols = Array.from(prices.keys());
      await Promise.all(symbols.map(s => getTokenPrice(s)));
      setError(null);
    } catch (err) {
      setError('Failed to refresh prices');
    } finally {
      setLoading(false);
    }
  }, [prices]);

  return {
    prices,
    loading,
    error,
    getPrice,
    refresh,
  };
}

export function useTokenPrice(symbol: string): {
  price: number | null;
  change24h: number;
  loading: boolean;
  error: string | null;
} {
  const { prices, loading, error, getPrice } = useChainlinkPrices();
  const priceData = getPrice(symbol);

  return {
    price: priceData?.price ?? null,
    change24h: priceData?.change24h ?? 0,
    loading,
    error,
  };
}
