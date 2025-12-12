import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { CONTRACTS, NEXUS_TESTNET, TOKEN_LIST } from '@/config/contracts';
import { FACTORY_ABI, PAIR_ABI, ERC20_ABI } from '@/config/abis';

export interface PoolData {
  pairAddress: string;
  token0: { symbol: string; address: string; logoURI?: string };
  token1: { symbol: string; address: string; logoURI?: string };
  reserve0: string;
  reserve1: string;
  totalSupply: string;
  tvl: number;
  volume24h: number;
  priceToken0: number;
  priceToken1: number;
  apr: number;
}

export interface HistoricalDataPoint {
  timestamp: number;
  date: string;
  tvl: number;
  volume: number;
  price: number;
}

export interface AnalyticsData {
  totalTVL: number;
  totalVolume24h: number;
  totalPools: number;
  totalTrades: number;
  tvlChange: number;
  volumeChange: number;
}

// Generate simulated historical data based on current on-chain data
const generateHistoricalData = (currentValue: number, days: number = 7): HistoricalDataPoint[] => {
  const data: HistoricalDataPoint[] = [];
  const now = Date.now();
  
  for (let i = days - 1; i >= 0; i--) {
    const timestamp = now - (i * 24 * 60 * 60 * 1000);
    const date = new Date(timestamp);
    const volatility = 0.15;
    const trend = 1 + ((days - i) / days) * 0.1;
    const randomFactor = 1 + (Math.random() - 0.5) * volatility;
    
    data.push({
      timestamp,
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      tvl: currentValue * trend * randomFactor * (0.7 + i * 0.04),
      volume: currentValue * 0.1 * randomFactor * (0.5 + Math.random() * 0.5),
      price: randomFactor,
    });
  }
  
  return data;
};

export function usePoolData(refreshInterval: number = 15000) {
  const [pools, setPools] = useState<PoolData[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    totalTVL: 0,
    totalVolume24h: 0,
    totalPools: 0,
    totalTrades: 0,
    tvlChange: 0,
    volumeChange: 0,
  });
  const [historicalData, setHistoricalData] = useState<HistoricalDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const fetchPoolData = useCallback(async () => {
    try {
      const provider = new ethers.JsonRpcProvider(NEXUS_TESTNET.rpcUrl);
      const factory = new ethers.Contract(CONTRACTS.FACTORY, FACTORY_ABI, provider);
      
      const pairCount = await factory.allPairsLength();
      const poolsData: PoolData[] = [];
      
      for (let i = 0; i < Math.min(Number(pairCount), 20); i++) {
        try {
          const pairAddress = await factory.allPairs(i);
          const pair = new ethers.Contract(pairAddress, PAIR_ABI, provider);
          
          const [token0Addr, token1Addr, reserves, totalSupply] = await Promise.all([
            pair.token0(),
            pair.token1(),
            pair.getReserves(),
            pair.totalSupply(),
          ]);

          const getTokenInfo = (addr: string) => {
            const known = TOKEN_LIST.find(t => t.address.toLowerCase() === addr.toLowerCase());
            return known || { symbol: 'UNKNOWN', address: addr, logoURI: undefined };
          };

          const token0Info = getTokenInfo(token0Addr);
          const token1Info = getTokenInfo(token1Addr);

          const reserve0 = parseFloat(ethers.formatEther(reserves[0]));
          const reserve1 = parseFloat(ethers.formatEther(reserves[1]));
          
          // Calculate TVL (simplified - assuming $1 per token for testnet)
          const tvl = reserve0 + reserve1;
          
          // Simulated 24h volume (based on reserves)
          const volume24h = tvl * 0.05 * (0.5 + Math.random() * 0.5);
          
          // Calculate prices
          const priceToken0 = reserve1 > 0 ? reserve1 / reserve0 : 0;
          const priceToken1 = reserve0 > 0 ? reserve0 / reserve1 : 0;
          
          // Simulated APR based on volume/TVL ratio
          const apr = tvl > 0 ? (volume24h * 365 * 0.003 / tvl) * 100 : 0;

          poolsData.push({
            pairAddress,
            token0: { symbol: token0Info.symbol, address: token0Addr, logoURI: token0Info.logoURI },
            token1: { symbol: token1Info.symbol, address: token1Addr, logoURI: token1Info.logoURI },
            reserve0: reserve0.toFixed(4),
            reserve1: reserve1.toFixed(4),
            totalSupply: ethers.formatEther(totalSupply),
            tvl,
            volume24h,
            priceToken0,
            priceToken1,
            apr,
          });
        } catch (error) {
          console.error(`Error fetching pool ${i}:`, error);
        }
      }

      setPools(poolsData);

      // Calculate totals
      const totalTVL = poolsData.reduce((sum, p) => sum + p.tvl, 0);
      const totalVolume24h = poolsData.reduce((sum, p) => sum + p.volume24h, 0);
      
      // Generate historical data
      const historical = generateHistoricalData(totalTVL, 7);
      setHistoricalData(historical);

      // Calculate changes (simulated)
      const tvlChange = 8.5 + Math.random() * 5;
      const volumeChange = 12.3 + Math.random() * 10;

      setAnalytics({
        totalTVL,
        totalVolume24h,
        totalPools: poolsData.length,
        totalTrades: Math.floor(150 + Math.random() * 50),
        tvlChange,
        volumeChange,
      });

      setLastUpdate(new Date());
    } catch (error) {
      console.error('Error fetching pool data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPoolData();
    
    const interval = setInterval(fetchPoolData, refreshInterval);
    return () => clearInterval(interval);
  }, [fetchPoolData, refreshInterval]);

  return {
    pools,
    analytics,
    historicalData,
    loading,
    lastUpdate,
    refetch: fetchPoolData,
  };
}
