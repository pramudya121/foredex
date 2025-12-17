import { ethers } from 'ethers';
import { NEXUS_TESTNET } from '@/config/contracts';

// Singleton RPC provider with request throttling and caching
class RPCProviderService {
  private static instance: RPCProviderService;
  private provider: ethers.JsonRpcProvider | null = null;
  private requestQueue: Array<() => Promise<any>> = [];
  private isProcessing = false;
  private lastRequestTime = 0;
  private minRequestInterval = 500; // Minimum 500ms between requests
  private cache = new Map<string, { data: any; timestamp: number }>();
  private cacheTTL = 10000; // Cache for 10 seconds
  private errorCount = 0;
  private maxErrors = 5;
  private cooldownUntil = 0;

  private constructor() {
    this.initProvider();
  }

  private initProvider() {
    try {
      this.provider = new ethers.JsonRpcProvider(NEXUS_TESTNET.rpcUrl, undefined, {
        staticNetwork: true,
        batchMaxCount: 1,
      });
    } catch {
      this.provider = null;
    }
  }

  static getInstance(): RPCProviderService {
    if (!RPCProviderService.instance) {
      RPCProviderService.instance = new RPCProviderService();
    }
    return RPCProviderService.instance;
  }

  getProvider(): ethers.JsonRpcProvider | null {
    return this.provider;
  }

  isAvailable(): boolean {
    if (Date.now() < this.cooldownUntil) return false;
    return this.provider !== null && this.errorCount < this.maxErrors;
  }

  private getCacheKey(method: string, params: any[]): string {
    return `${method}:${JSON.stringify(params)}`;
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
    
    // Clean old cache entries
    if (this.cache.size > 100) {
      const now = Date.now();
      for (const [k, v] of this.cache.entries()) {
        if (now - v.timestamp > this.cacheTTL) {
          this.cache.delete(k);
        }
      }
    }
  }

  private async processQueue() {
    if (this.isProcessing || this.requestQueue.length === 0) return;
    
    this.isProcessing = true;
    
    while (this.requestQueue.length > 0) {
      // Check cooldown
      if (Date.now() < this.cooldownUntil) {
        await new Promise(r => setTimeout(r, this.cooldownUntil - Date.now()));
      }

      // Throttle requests
      const timeSinceLastRequest = Date.now() - this.lastRequestTime;
      if (timeSinceLastRequest < this.minRequestInterval) {
        await new Promise(r => setTimeout(r, this.minRequestInterval - timeSinceLastRequest));
      }

      const request = this.requestQueue.shift();
      if (request) {
        this.lastRequestTime = Date.now();
        try {
          await request();
          // Reset error count on success
          if (this.errorCount > 0) this.errorCount--;
        } catch (error: any) {
          this.handleError(error);
        }
      }
    }
    
    this.isProcessing = false;
  }

  private handleError(error: any) {
    const errorMessage = error?.message || String(error);
    this.errorCount++;
    
    // Check for rate limiting
    if (errorMessage.includes('429') || errorMessage.includes('Too Many Requests')) {
      this.cooldownUntil = Date.now() + 30000; // 30 second cooldown
      console.warn('RPC rate limited, cooling down for 30s');
    } else if (errorMessage.includes('CORS') || errorMessage.includes('coalesce')) {
      this.cooldownUntil = Date.now() + 10000; // 10 second cooldown
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
      return null;
    }

    return new Promise((resolve) => {
      this.requestQueue.push(async () => {
        try {
          const result = await Promise.race([
            contractCall(),
            new Promise<null>((_, reject) => 
              setTimeout(() => reject(new Error('Timeout')), 8000)
            )
          ]);
          
          if (cacheKey && result !== null) {
            this.setCache(cacheKey, result);
          }
          
          resolve(result as T);
        } catch (error) {
          this.handleError(error);
          resolve(null);
        }
      });
      
      this.processQueue();
    });
  }

  // Reset error state
  reset() {
    this.errorCount = 0;
    this.cooldownUntil = 0;
  }
}

export const rpcProvider = RPCProviderService.getInstance();
export default rpcProvider;
