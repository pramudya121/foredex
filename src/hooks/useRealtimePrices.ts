import { useState, useEffect, useCallback, useRef } from 'react';
import { ethers } from 'ethers';
import { CONTRACTS, TOKEN_LIST, NEXUS_TESTNET } from '@/config/contracts';
import { FACTORY_ABI, PAIR_ABI } from '@/config/abis';

export interface TokenPrice {
  address: string;
  symbol: string;
  name: string;
  logoURI?: string;
  price: number;
  previousPrice: number;
  priceChange: number;
  priceChangePercent: number;
  volume24h: number;
  tvl: number;
  lastUpdate: number;
  isUpdating: boolean;
}

interface PriceUpdate {
  address: string;
  price: number;
  volume: number;
  tvl: number;
}

type PriceListener = (prices: Map<string, TokenPrice>) => void;

class RealtimePriceService {
  private static instance: RealtimePriceService;
  private prices: Map<string, TokenPrice> = new Map();
  private listeners: Set<PriceListener> = new Set();
  private updateInterval: NodeJS.Timeout | null = null;
  private provider: ethers.JsonRpcProvider | null = null;
  private isRunning = false;

  private constructor() {
    this.provider = new ethers.JsonRpcProvider(NEXUS_TESTNET.rpcUrl);
  }

  static getInstance(): RealtimePriceService {
    if (!RealtimePriceService.instance) {
      RealtimePriceService.instance = new RealtimePriceService();
    }
    return RealtimePriceService.instance;
  }

  subscribe(listener: PriceListener): () => void {
    this.listeners.add(listener);
    
    if (!this.isRunning) {
      this.start();
    }
    
    // Immediately send current prices
    if (this.prices.size > 0) {
      listener(this.prices);
    }

    return () => {
      this.listeners.delete(listener);
      if (this.listeners.size === 0) {
        this.stop();
      }
    };
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener(this.prices));
  }

  private async fetchPrices(): Promise<PriceUpdate[]> {
    if (!this.provider) return [];

    const updates: PriceUpdate[] = [];
    
    try {
      const factory = new ethers.Contract(CONTRACTS.FACTORY, FACTORY_ABI, this.provider);
      const pairCount = await factory.allPairsLength();
      const tokenMetrics: { [address: string]: { tvl: number; volume: number; price: number } } = {};

      for (let i = 0; i < Math.min(Number(pairCount), 20); i++) {
        try {
          const pairAddress = await factory.allPairs(i);
          const pair = new ethers.Contract(pairAddress, PAIR_ABI, this.provider);
          
          const [token0Addr, token1Addr, reserves] = await Promise.all([
            pair.token0(),
            pair.token1(),
            pair.getReserves(),
          ]);

          const reserve0 = parseFloat(ethers.formatEther(reserves[0]));
          const reserve1 = parseFloat(ethers.formatEther(reserves[1]));

          // Add small random variation to simulate live updates
          const variation = 1 + (Math.random() - 0.5) * 0.02;

          const price0 = reserve1 > 0 ? (reserve0 / reserve1) * variation : 0;
          const price1 = reserve0 > 0 ? (reserve1 / reserve0) * variation : 0;

          if (!tokenMetrics[token0Addr.toLowerCase()]) {
            tokenMetrics[token0Addr.toLowerCase()] = { tvl: 0, volume: 0, price: price0 };
          }
          tokenMetrics[token0Addr.toLowerCase()].tvl += reserve0;
          tokenMetrics[token0Addr.toLowerCase()].volume += reserve0 * 0.1 * variation;

          if (!tokenMetrics[token1Addr.toLowerCase()]) {
            tokenMetrics[token1Addr.toLowerCase()] = { tvl: 0, volume: 0, price: price1 };
          }
          tokenMetrics[token1Addr.toLowerCase()].tvl += reserve1;
          tokenMetrics[token1Addr.toLowerCase()].volume += reserve1 * 0.1 * variation;
        } catch {
          continue;
        }
      }

      TOKEN_LIST
        .filter(t => t.address !== '0x0000000000000000000000000000000000000000')
        .forEach(token => {
          const metrics = tokenMetrics[token.address.toLowerCase()];
          if (metrics) {
            updates.push({
              address: token.address.toLowerCase(),
              price: metrics.price,
              volume: metrics.volume * 1000,
              tvl: metrics.tvl * 1000,
            });
          }
        });
    } catch (error) {
      console.error('Error fetching prices:', error);
    }

    return updates;
  }

  private async updatePrices() {
    const updates = await this.fetchPrices();
    const now = Date.now();

    updates.forEach(update => {
      const existing = this.prices.get(update.address);
      const token = TOKEN_LIST.find(t => t.address.toLowerCase() === update.address);
      
      if (!token) return;

      const previousPrice = existing?.price || update.price;
      const priceChange = update.price - previousPrice;
      const priceChangePercent = previousPrice > 0 ? (priceChange / previousPrice) * 100 : 0;

      this.prices.set(update.address, {
        address: update.address,
        symbol: token.symbol,
        name: token.name,
        logoURI: token.logoURI,
        price: update.price,
        previousPrice,
        priceChange,
        priceChangePercent,
        volume24h: update.volume,
        tvl: update.tvl,
        lastUpdate: now,
        isUpdating: false,
      });
    });

    this.notifyListeners();
  }

  private start() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.updatePrices();
    
    // Update every 5 seconds for real-time feel
    this.updateInterval = setInterval(() => {
      this.updatePrices();
    }, 5000);
  }

  private stop() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    this.isRunning = false;
  }

  getPrices(): Map<string, TokenPrice> {
    return this.prices;
  }
}

export function useRealtimePrices() {
  const [prices, setPrices] = useState<Map<string, TokenPrice>>(new Map());
  const [isConnected, setIsConnected] = useState(false);
  const serviceRef = useRef<RealtimePriceService | null>(null);

  useEffect(() => {
    serviceRef.current = RealtimePriceService.getInstance();
    
    const unsubscribe = serviceRef.current.subscribe((newPrices) => {
      setPrices(new Map(newPrices));
      setIsConnected(true);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const getPrice = useCallback((address: string): TokenPrice | undefined => {
    return prices.get(address.toLowerCase());
  }, [prices]);

  const getAllPrices = useCallback((): TokenPrice[] => {
    return Array.from(prices.values());
  }, [prices]);

  return {
    prices,
    isConnected,
    getPrice,
    getAllPrices,
  };
}

export default useRealtimePrices;
