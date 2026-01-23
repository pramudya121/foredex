import { ethers } from 'ethers';
import { rpcProvider } from './rpcProvider';

// Chainlink Aggregator V3 Interface ABI (minimal)
const AGGREGATOR_V3_ABI = [
  'function latestRoundData() external view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)',
  'function decimals() external view returns (uint8)',
  'function description() external view returns (string memory)',
];

// Price Feed Configuration
// Note: Nexus Testnet doesn't have official Chainlink feeds
// We'll simulate feeds with realistic data and cache
interface PriceFeedConfig {
  symbol: string;
  basePriceUSD: number;
  volatility: number;
}

const SIMULATED_FEEDS: Record<string, PriceFeedConfig> = {
  'ETH': { symbol: 'ETH/USD', basePriceUSD: 3200, volatility: 0.02 },
  'WETH': { symbol: 'WETH/USD', basePriceUSD: 3200, volatility: 0.02 },
  'BTC': { symbol: 'BTC/USD', basePriceUSD: 67000, volatility: 0.015 },
  'USDC': { symbol: 'USDC/USD', basePriceUSD: 1.0, volatility: 0.001 },
  'LINK': { symbol: 'LINK/USD', basePriceUSD: 14.5, volatility: 0.03 },
  'XRP': { symbol: 'XRP/USD', basePriceUSD: 0.52, volatility: 0.025 },
  'TRX': { symbol: 'TRX/USD', basePriceUSD: 0.12, volatility: 0.03 },
  'SHIB': { symbol: 'SHIB/USD', basePriceUSD: 0.000024, volatility: 0.05 },
  'DOGE': { symbol: 'DOGE/USD', basePriceUSD: 0.38, volatility: 0.04 },
  'XMR': { symbol: 'XMR/USD', basePriceUSD: 165, volatility: 0.02 },
  'NEX': { symbol: 'NEX/USD', basePriceUSD: 1.25, volatility: 0.03 },
  'WNEX': { symbol: 'WNEX/USD', basePriceUSD: 1.25, volatility: 0.03 },
  'MON': { symbol: 'MON/USD', basePriceUSD: 0.85, volatility: 0.04 },
  'FRDX': { symbol: 'FRDX/USD', basePriceUSD: 2.15, volatility: 0.035 },
  'HYPE': { symbol: 'HYPE/USD', basePriceUSD: 24.5, volatility: 0.05 },
};

// Price cache with timestamps
interface CachedPrice {
  price: number;
  timestamp: number;
  change24h: number;
}

const priceCache: Map<string, CachedPrice> = new Map();
const CACHE_TTL = 10000; // 10 seconds
const HISTORY_INTERVAL = 60000; // 1 minute history points

// Price history for 24h change calculation
const priceHistory: Map<string, { price: number; timestamp: number }[]> = new Map();

function generateRealisticPrice(config: PriceFeedConfig): number {
  const cached = priceCache.get(config.symbol);
  const lastPrice = cached?.price || config.basePriceUSD;
  
  // Random walk with mean reversion
  const randomFactor = (Math.random() - 0.5) * 2 * config.volatility;
  const meanReversion = (config.basePriceUSD - lastPrice) / config.basePriceUSD * 0.1;
  
  const newPrice = lastPrice * (1 + randomFactor + meanReversion);
  
  // Clamp to reasonable range
  const minPrice = config.basePriceUSD * 0.5;
  const maxPrice = config.basePriceUSD * 2;
  
  return Math.max(minPrice, Math.min(maxPrice, newPrice));
}

function calculate24hChange(symbol: string, currentPrice: number): number {
  const history = priceHistory.get(symbol) || [];
  const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
  
  // Find price from ~24h ago
  const oldEntry = history.find(h => h.timestamp <= oneDayAgo);
  
  if (oldEntry) {
    return ((currentPrice - oldEntry.price) / oldEntry.price) * 100;
  }
  
  // If no 24h history, simulate based on volatility
  const config = Object.values(SIMULATED_FEEDS).find(f => f.symbol === symbol);
  if (config) {
    return (Math.random() - 0.5) * config.volatility * 100 * 10;
  }
  
  return 0;
}

function updatePriceHistory(symbol: string, price: number) {
  const now = Date.now();
  const history = priceHistory.get(symbol) || [];
  
  // Add new price point
  history.push({ price, timestamp: now });
  
  // Keep only last 24 hours
  const cutoff = now - 24 * 60 * 60 * 1000;
  const filtered = history.filter(h => h.timestamp > cutoff);
  
  priceHistory.set(symbol, filtered);
}

export interface PriceData {
  symbol: string;
  price: number;
  decimals: number;
  timestamp: number;
  change24h: number;
  source: 'chainlink' | 'simulated';
}

export async function getTokenPrice(tokenSymbol: string): Promise<PriceData | null> {
  const normalizedSymbol = tokenSymbol.toUpperCase();
  const config = SIMULATED_FEEDS[normalizedSymbol];
  
  if (!config) {
    console.warn(`No price feed configured for ${tokenSymbol}`);
    return null;
  }
  
  const cacheKey = config.symbol;
  const cached = priceCache.get(cacheKey);
  const now = Date.now();
  
  // Return cached if still valid
  if (cached && now - cached.timestamp < CACHE_TTL) {
    return {
      symbol: config.symbol,
      price: cached.price,
      decimals: 8,
      timestamp: cached.timestamp,
      change24h: cached.change24h,
      source: 'simulated',
    };
  }
  
  // Generate new price
  const newPrice = generateRealisticPrice(config);
  const change24h = calculate24hChange(cacheKey, newPrice);
  
  // Update cache and history
  priceCache.set(cacheKey, {
    price: newPrice,
    timestamp: now,
    change24h,
  });
  updatePriceHistory(cacheKey, newPrice);
  
  return {
    symbol: config.symbol,
    price: newPrice,
    decimals: 8,
    timestamp: now,
    change24h,
    source: 'simulated',
  };
}

export async function getAllPrices(): Promise<Map<string, PriceData>> {
  const prices = new Map<string, PriceData>();
  
  await Promise.all(
    Object.keys(SIMULATED_FEEDS).map(async (symbol) => {
      const price = await getTokenPrice(symbol);
      if (price) {
        prices.set(symbol, price);
      }
    })
  );
  
  return prices;
}

// Hook-compatible price fetcher
export function usePriceFeed(tokenSymbol: string) {
  const config = SIMULATED_FEEDS[tokenSymbol?.toUpperCase()];
  
  if (!config) {
    return {
      price: null,
      loading: false,
      error: `No feed for ${tokenSymbol}`,
    };
  }
  
  const cached = priceCache.get(config.symbol);
  
  return {
    price: cached?.price || config.basePriceUSD,
    change24h: cached?.change24h || 0,
    loading: false,
    error: null,
    source: 'simulated' as const,
  };
}

// Realtime price subscription (polling-based)
export class PriceFeedSubscription {
  private intervalId: NodeJS.Timeout | null = null;
  private callbacks: Set<(prices: Map<string, PriceData>) => void> = new Set();
  private pollInterval: number;

  constructor(pollIntervalMs = 5000) {
    this.pollInterval = pollIntervalMs;
  }

  subscribe(callback: (prices: Map<string, PriceData>) => void) {
    this.callbacks.add(callback);
    
    // Start polling if this is the first subscriber
    if (this.callbacks.size === 1) {
      this.startPolling();
    }
    
    // Immediately emit current prices
    getAllPrices().then(prices => callback(prices));
    
    return () => {
      this.callbacks.delete(callback);
      if (this.callbacks.size === 0) {
        this.stopPolling();
      }
    };
  }

  private startPolling() {
    this.intervalId = setInterval(async () => {
      const prices = await getAllPrices();
      this.callbacks.forEach(cb => cb(prices));
    }, this.pollInterval);
  }

  private stopPolling() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}

// Singleton subscription instance
export const priceFeedSubscription = new PriceFeedSubscription(5000);
