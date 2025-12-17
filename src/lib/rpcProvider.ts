import { ethers } from 'ethers';
import { NEXUS_TESTNET } from '@/config/contracts';

// Singleton RPC provider with request throttling and caching
class RPCProviderService {
  private static instance: RPCProviderService;
  private provider: ethers.JsonRpcProvider | null = null;
  private lastRequestTime = 0;
  private minRequestInterval = 800; // 800ms between requests (reduced rate)
  private cache = new Map<string, { data: any; timestamp: number }>();
  private cacheTTL = 15000; // Cache for 15 seconds
  private errorCount = 0;
  private maxErrors = 3;
  private cooldownUntil = 0;
  private isInitializing = false;

  private constructor() {
    this.initProvider();
  }

  private initProvider() {
    if (this.isInitializing) return;
    this.isInitializing = true;
    
    try {
      this.provider = new ethers.JsonRpcProvider(NEXUS_TESTNET.rpcUrl, {
        chainId: NEXUS_TESTNET.chainId,
        name: NEXUS_TESTNET.name,
      }, {
        staticNetwork: true,
        batchMaxCount: 1,
        polling: false,
      });
    } catch {
      this.provider = null;
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
    if (Date.now() < this.cooldownUntil) return false;
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
    if (this.cache.size > 50) {
      const now = Date.now();
      for (const [k, v] of this.cache.entries()) {
        if (now - v.timestamp > this.cacheTTL) {
          this.cache.delete(k);
        }
      }
    }
  }

  private handleError(error: any) {
    const errorMessage = error?.message || String(error);
    this.errorCount++;
    
    // Check for rate limiting (429)
    if (errorMessage.includes('429') || errorMessage.includes('Too Many Requests')) {
      this.cooldownUntil = Date.now() + 60000; // 60 second cooldown for 429
      console.warn('RPC rate limited, cooling down for 60s');
    } else if (errorMessage.includes('CORS') || errorMessage.includes('coalesce') || errorMessage.includes('ERR_FAILED')) {
      this.cooldownUntil = Date.now() + 30000; // 30 second cooldown for CORS/network errors
      console.warn('RPC network error, cooling down for 30s');
    } else {
      // General error - shorter cooldown
      this.cooldownUntil = Date.now() + 10000;
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

    if (!this.isAvailable()) {
      // Return cached value if available during cooldown
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
          setTimeout(() => reject(new Error('Timeout')), 10000)
        )
      ]);
      
      if (cacheKey && result !== null) {
        this.setCache(cacheKey, result);
      }
      
      // Decrease error count on success
      if (this.errorCount > 0) this.errorCount--;
      
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
  }

  // Clear cache
  clearCache() {
    this.cache.clear();
  }
}

export const rpcProvider = RPCProviderService.getInstance();
export default rpcProvider;
