import { ethers } from 'ethers';
import { NEXUS_TESTNET } from '@/config/contracts';

// Singleton RPC provider with request throttling and caching
class RPCProviderService {
  private static instance: RPCProviderService;
  private provider: ethers.JsonRpcProvider | null = null;
  private lastRequestTime = 0;
  private minRequestInterval = 500; // 500ms between requests (faster for better UX)
  private cache = new Map<string, { data: any; timestamp: number }>();
  private cacheTTL = 30000; // Cache for 30 seconds
  private errorCount = 0;
  private maxErrors = 5; // More tolerant of errors
  private cooldownUntil = 0;
  private isInitializing = false;

  private constructor() {
    this.initProvider();
  }

  private async initProvider() {
    if (this.isInitializing || this.provider) return;
    this.isInitializing = true;
    
    try {
      const network = {
        chainId: NEXUS_TESTNET.chainId,
        name: NEXUS_TESTNET.name,
      };
      
      this.provider = new ethers.JsonRpcProvider(
        NEXUS_TESTNET.rpcUrl,
        network,
        {
          staticNetwork: ethers.Network.from(network),
          batchMaxCount: 1,
          polling: false,
        }
      );
    } catch {
      this.provider = null;
      this.cooldownUntil = Date.now() + 10000; // 10s cooldown on init failure
    } finally {
      this.isInitializing = false;
    }
  }

  static getInstance(): RPCProviderService {
    if (!RPCProviderService.instance) {
      RPCProviderService.instance = new RPCProviderService();
    }
    return RPCProviderService.instance;
  }

  getProvider(): ethers.JsonRpcProvider | null {
    if (!this.provider && !this.isInitializing) {
      this.initProvider();
    }
    return this.provider;
  }

  isAvailable(): boolean {
    // Auto-reset cooldown after it expires
    if (Date.now() >= this.cooldownUntil) {
      this.cooldownUntil = 0;
      // Gradually reduce error count after cooldown
      if (this.errorCount > 0) {
        this.errorCount = Math.max(0, this.errorCount - 1);
      }
    }
    return this.provider !== null && this.errorCount < this.maxErrors;
  }

  private getFromCache(key: string): any | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.data;
    }
    return null;
  }

  private setCache(key: string, data: any) {
    this.cache.set(key, { data, timestamp: Date.now() });
    
    // Clean old cache entries periodically
    if (this.cache.size > 100) {
      const now = Date.now();
      for (const [k, v] of this.cache.entries()) {
        if (now - v.timestamp > this.cacheTTL * 2) {
          this.cache.delete(k);
        }
      }
    }
  }

  private handleError(error: any) {
    const errorMessage = error?.message || String(error);
    this.errorCount++;
    
    // Check for rate limiting (429) - shorter cooldown
    if (errorMessage.includes('429') || errorMessage.includes('Too Many Requests')) {
      this.cooldownUntil = Date.now() + 15000; // 15s cooldown for 429 (reduced from 60s)
    } else if (errorMessage.includes('CORS') || errorMessage.includes('ERR_FAILED')) {
      this.cooldownUntil = Date.now() + 10000; // 10s for CORS errors
    } else if (errorMessage.includes('Timeout') || errorMessage.includes('coalesce')) {
      this.cooldownUntil = Date.now() + 5000; // 5s for timeout
    } else {
      this.cooldownUntil = Date.now() + 3000; // 3s for general errors
    }
  }

  async call<T>(
    contractCall: () => Promise<T>,
    cacheKey?: string
  ): Promise<T | null> {
    // Check cache first
    if (cacheKey) {
      const cached = this.getFromCache(cacheKey);
      if (cached !== null) return cached;
    }

    // Check cooldown but still allow cached values
    if (!this.isAvailable()) {
      if (cacheKey) {
        const cached = this.cache.get(cacheKey);
        if (cached) return cached.data;
      }
      return null;
    }

    // Throttle requests
    const timeSinceLastRequest = Date.now() - this.lastRequestTime;
    if (timeSinceLastRequest < this.minRequestInterval) {
      await new Promise(r => setTimeout(r, this.minRequestInterval - timeSinceLastRequest));
    }
    this.lastRequestTime = Date.now();

    try {
      const result = await Promise.race([
        contractCall(),
        new Promise<null>((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 15000) // 15s timeout
        )
      ]);
      
      if (cacheKey && result !== null) {
        this.setCache(cacheKey, result);
      }
      
      // Reset error count on successful call
      this.errorCount = 0;
      this.cooldownUntil = 0;
      
      return result as T;
    } catch (error) {
      this.handleError(error);
      
      // Return cached value on error
      if (cacheKey) {
        const cached = this.cache.get(cacheKey);
        if (cached) return cached.data;
      }
      return null;
    }
  }

  // Reset error state
  reset() {
    this.errorCount = 0;
    this.cooldownUntil = 0;
    this.cache.clear();
  }

  // Clear cache
  clearCache() {
    this.cache.clear();
  }
}

export const rpcProvider = RPCProviderService.getInstance();
export default rpcProvider;
