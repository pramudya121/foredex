import { ethers } from 'ethers';
import { NEXUS_TESTNET } from '@/config/contracts';

// Singleton RPC provider with robust error handling and adaptive throttling
class RPCProviderService {
  private static instance: RPCProviderService;
  private provider: ethers.JsonRpcProvider | null = null;
  private lastRequestTime = 0;
  private minRequestInterval = 300; // Start with 300ms between requests (faster)
  private cache = new Map<string, { data: any; timestamp: number }>();
  private cacheTTL = 45000; // Cache for 45 seconds
  private errorCount = 0;
  private maxErrors = 20; // More lenient
  private cooldownUntil = 0;
  private isInitializing = false;
  private consecutiveErrors = 0;
  private pendingRequests = new Map<string, Promise<any>>();

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
      this.cooldownUntil = Date.now() + 10000; // Shorter cooldown on init fail
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
    const now = Date.now();
    // Auto-reset cooldown after it expires
    if (now >= this.cooldownUntil && this.cooldownUntil > 0) {
      this.cooldownUntil = 0;
      this.consecutiveErrors = 0;
      this.errorCount = Math.max(0, this.errorCount - 5); // Reduce error count faster
      this.minRequestInterval = Math.max(200, this.minRequestInterval * 0.5); // Faster recovery
    }
    return this.provider !== null && this.errorCount < this.maxErrors && now >= this.cooldownUntil;
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
    if (this.cache.size > 150) {
      const now = Date.now();
      for (const [k, v] of this.cache.entries()) {
        if (now - v.timestamp > this.cacheTTL * 2) {
          this.cache.delete(k);
        }
      }
    }
  }

  private handleError(error: any): void {
    const errorMessage = error?.message || String(error);
    this.consecutiveErrors++;
    
    // Only increment global error count for severe errors
    if (this.consecutiveErrors > 2) {
      this.errorCount++;
    }
    
    // Gentler adaptive throttling
    this.minRequestInterval = Math.min(3000, this.minRequestInterval * 1.3);
    
    // Set shorter cooldowns
    if (errorMessage.includes('429') || errorMessage.includes('Too Many Requests')) {
      this.cooldownUntil = Date.now() + 15000; // 15s cooldown (was 60s)
    } else if (errorMessage.includes('CORS') || errorMessage.includes('ERR_FAILED') || errorMessage.includes('Failed to fetch')) {
      this.cooldownUntil = Date.now() + 5000; // 5s (was 30s)
    } else if (errorMessage.includes('coalesce') || errorMessage.includes('Timeout')) {
      this.cooldownUntil = Date.now() + 3000; // 3s (was 20s)
    } else {
      // Shorter exponential backoff
      const backoff = Math.min(10000, 1000 * Math.pow(1.3, Math.min(this.consecutiveErrors, 5)));
      this.cooldownUntil = Date.now() + backoff;
    }
  }

  // Parse user-friendly error messages
  parseError(error: any): string {
    const msg = error?.message || error?.reason || String(error);
    
    if (msg.includes('coalesce')) {
      return 'Network busy - retrying automatically...';
    }
    if (msg.includes('missing revert data')) {
      return 'Transaction would fail - check inputs or try a smaller amount';
    }
    if (msg.includes('429') || msg.includes('Too Many')) {
      return 'Network busy - please wait a moment and try again';
    }
    if (msg.includes('user rejected') || msg.includes('User denied')) {
      return 'Transaction cancelled';
    }
    if (msg.includes('insufficient funds')) {
      return 'Insufficient balance for transaction';
    }
    if (msg.includes('TRANSFER_FAILED')) {
      return 'Token transfer failed - check approval';
    }
    if (msg.includes('EXPIRED')) {
      return 'Transaction deadline expired - try again';
    }
    if (msg.includes('INSUFFICIENT_OUTPUT_AMOUNT')) {
      return 'Price moved too much - try increasing slippage';
    }
    if (msg.includes('INSUFFICIENT_LIQUIDITY')) {
      return 'Not enough liquidity in pool';
    }
    if (msg.includes('CORS') || msg.includes('ERR_FAILED') || msg.includes('Failed to fetch')) {
      return 'Network busy - retrying...';
    }
    
    return error?.reason || 'Transaction failed - please try again';
  }

  async call<T>(
    contractCall: () => Promise<T>,
    cacheKey?: string,
    options?: { skipCache?: boolean; timeout?: number; retries?: number }
  ): Promise<T | null> {
    // Check cache first
    if (cacheKey && !options?.skipCache) {
      const cached = this.getFromCache(cacheKey);
      if (cached !== null) return cached;
    }

    // Dedupe identical pending requests
    if (cacheKey && this.pendingRequests.has(cacheKey)) {
      try {
        return await this.pendingRequests.get(cacheKey);
      } catch {
        // Fall through to retry
      }
    }

    // If in cooldown, return cached value or null (don't throw error)
    if (!this.isAvailable()) {
      if (cacheKey) {
        const cached = this.cache.get(cacheKey);
        if (cached) return cached.data;
      }
      // Return null silently instead of showing error
      return null;
    }

    // Throttle requests
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    if (timeSinceLastRequest < this.minRequestInterval) {
      await new Promise(r => setTimeout(r, this.minRequestInterval - timeSinceLastRequest));
    }
    this.lastRequestTime = Date.now();

    const timeout = options?.timeout || 15000; // 15s default timeout
    const maxRetries = options?.retries ?? 2;

    const executeCall = async (attempt: number): Promise<T | null> => {
      try {
        const result = await Promise.race([
          contractCall(),
          new Promise<null>((_, reject) => 
            setTimeout(() => reject(new Error('Timeout')), timeout)
          )
        ]);
        
        if (cacheKey && result !== null) {
          this.setCache(cacheKey, result);
        }
        
        // Reset on success
        this.consecutiveErrors = 0;
        this.errorCount = Math.max(0, this.errorCount - 2);
        this.minRequestInterval = Math.max(200, this.minRequestInterval * 0.8);
        
        return result as T;
      } catch (error) {
        // Retry on transient errors
        if (attempt < maxRetries) {
          const delay = 500 * Math.pow(1.5, attempt);
          await new Promise(r => setTimeout(r, delay));
          return executeCall(attempt + 1);
        }
        
        this.handleError(error);
        
        // Return cached data if available
        if (cacheKey) {
          const cached = this.cache.get(cacheKey);
          if (cached) return cached.data;
        }
        return null;
      }
    };

    const promise = executeCall(0);
    
    if (cacheKey) {
      this.pendingRequests.set(cacheKey, promise);
      promise.finally(() => this.pendingRequests.delete(cacheKey));
    }

    return promise;
  }

  // Force reset all state
  reset() {
    this.errorCount = 0;
    this.consecutiveErrors = 0;
    this.cooldownUntil = 0;
    this.minRequestInterval = 300;
    this.pendingRequests.clear();
  }

  clearCache() {
    this.cache.clear();
  }

  getCooldownRemaining(): number {
    return Math.max(0, this.cooldownUntil - Date.now());
  }

  getRequestInterval(): number {
    return this.minRequestInterval;
  }
}

export const rpcProvider = RPCProviderService.getInstance();
export default rpcProvider;
