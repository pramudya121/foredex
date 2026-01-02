import { ethers } from 'ethers';
import { NEXUS_TESTNET } from '@/config/contracts';

// Singleton RPC provider with robust error handling and adaptive throttling
class RPCProviderService {
  private static instance: RPCProviderService;
  private provider: ethers.JsonRpcProvider | null = null;
  private lastRequestTime = 0;
  private minRequestInterval = 1000; // Start with 1s between requests
  private cache = new Map<string, { data: any; timestamp: number }>();
  private cacheTTL = 60000; // Cache for 60 seconds (longer cache)
  private errorCount = 0;
  private maxErrors = 10; // More lenient
  private cooldownUntil = 0;
  private isInitializing = false;
  private consecutiveErrors = 0;

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
      this.cooldownUntil = Date.now() + 30000;
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
      this.minRequestInterval = Math.max(500, this.minRequestInterval * 0.8); // Gradually reduce delay
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
    if (this.cache.size > 100) {
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
    this.errorCount++;
    this.consecutiveErrors++;
    
    // Adaptive throttling - increase delay on errors
    this.minRequestInterval = Math.min(5000, this.minRequestInterval * 1.5);
    
    // Set cooldown based on error type
    if (errorMessage.includes('429') || errorMessage.includes('Too Many Requests')) {
      // Long cooldown for rate limiting
      this.cooldownUntil = Date.now() + 60000; // 60s cooldown
    } else if (errorMessage.includes('CORS') || errorMessage.includes('ERR_FAILED')) {
      // Medium cooldown for network/CORS errors
      this.cooldownUntil = Date.now() + 30000; // 30s
    } else if (errorMessage.includes('coalesce') || errorMessage.includes('Timeout')) {
      // Connection issue cooldown
      this.cooldownUntil = Date.now() + 20000; // 20s
    } else {
      // Exponential backoff for other errors
      const backoff = Math.min(60000, 5000 * Math.pow(1.5, this.consecutiveErrors));
      this.cooldownUntil = Date.now() + backoff;
    }
  }

  // Parse user-friendly error messages
  parseError(error: any): string {
    const msg = error?.message || error?.reason || String(error);
    
    if (msg.includes('coalesce')) {
      return 'Network temporarily unavailable. Please try again in a moment.';
    }
    if (msg.includes('missing revert data')) {
      return 'Transaction would fail - check inputs or try a smaller amount';
    }
    if (msg.includes('429') || msg.includes('Too Many')) {
      return 'Too many requests - please wait 30 seconds and try again';
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
    if (msg.includes('CORS') || msg.includes('ERR_FAILED')) {
      return 'Network connection issue - please wait and try again';
    }
    
    // Return cleaned message
    return error?.reason || 'Transaction failed - please try again';
  }

  async call<T>(
    contractCall: () => Promise<T>,
    cacheKey?: string,
    options?: { skipCache?: boolean; timeout?: number }
  ): Promise<T | null> {
    // Check cache first - always return cached value if available
    if (cacheKey && !options?.skipCache) {
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

    // Throttle requests with adaptive delay
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    if (timeSinceLastRequest < this.minRequestInterval) {
      await new Promise(r => setTimeout(r, this.minRequestInterval - timeSinceLastRequest));
    }
    this.lastRequestTime = Date.now();

    const timeout = options?.timeout || 20000; // 20s default timeout

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
      
      // Reset consecutive errors on success
      this.consecutiveErrors = 0;
      // Gradually reduce error count
      this.errorCount = Math.max(0, this.errorCount - 1);
      // Gradually reduce delay on success
      this.minRequestInterval = Math.max(500, this.minRequestInterval * 0.9);
      
      return result as T;
    } catch (error) {
      // Handle error and return cached data if available
      this.handleError(error);
      
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
    this.consecutiveErrors = 0;
    this.cooldownUntil = 0;
    this.minRequestInterval = 1000;
  }

  // Clear cache
  clearCache() {
    this.cache.clear();
  }

  // Get cooldown remaining time
  getCooldownRemaining(): number {
    return Math.max(0, this.cooldownUntil - Date.now());
  }

  // Get current request interval
  getRequestInterval(): number {
    return this.minRequestInterval;
  }
}

export const rpcProvider = RPCProviderService.getInstance();
export default rpcProvider;
