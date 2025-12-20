import { ethers } from 'ethers';
import { NEXUS_TESTNET } from '@/config/contracts';

// Singleton RPC provider with request throttling and caching
class RPCProviderService {
  private static instance: RPCProviderService;
  private provider: ethers.JsonRpcProvider | null = null;
  private lastRequestTime = 0;
  private minRequestInterval = 500; // 500ms between requests (more conservative)
  private cache = new Map<string, { data: any; timestamp: number }>();
  private cacheTTL = 30000; // Cache for 30 seconds
  private errorCount = 0;
  private maxErrors = 5; // More strict error tolerance
  private cooldownUntil = 0;
  private isInitializing = false;
  private requestQueue: Array<() => void> = [];
  private isProcessingQueue = false;

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
      this.cooldownUntil = Date.now() + 10000;
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
    if (Date.now() >= this.cooldownUntil && this.cooldownUntil > 0) {
      this.cooldownUntil = 0;
      this.errorCount = Math.max(0, this.errorCount - 2); // Gradually reduce error count
    }
    return this.provider !== null && this.errorCount < this.maxErrors && Date.now() >= this.cooldownUntil;
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
        if (now - v.timestamp > this.cacheTTL * 2) {
          this.cache.delete(k);
        }
      }
    }
  }

  private handleError(error: any): string {
    const errorMessage = error?.message || String(error);
    this.errorCount++;
    
    // Longer cooldowns to prevent rate limiting
    if (errorMessage.includes('429') || errorMessage.includes('Too Many Requests')) {
      this.cooldownUntil = Date.now() + 30000; // 30s cooldown for 429
      return 'RPC rate limited. Retrying soon...';
    } else if (errorMessage.includes('CORS') || errorMessage.includes('ERR_FAILED')) {
      this.cooldownUntil = Date.now() + 15000; // 15s for network errors
      return 'Network connection issue. Retrying...';
    } else if (errorMessage.includes('coalesce') || errorMessage.includes('Timeout')) {
      this.cooldownUntil = Date.now() + 10000; // 10s for timeout/coalesce
      return 'Connection timeout. Please try again.';
    } else if (errorMessage.includes('missing revert data')) {
      // This is a contract-level error, not RPC
      return 'Transaction would fail. Check your inputs.';
    } else {
      this.cooldownUntil = Date.now() + 5000; // 5s for general errors
      return 'Connection error. Retrying...';
    }
  }

  // Parse user-friendly error messages
  parseError(error: any): string {
    const msg = error?.message || error?.reason || String(error);
    
    if (msg.includes('coalesce')) {
      return 'Network temporarily unavailable';
    }
    if (msg.includes('missing revert data')) {
      return 'Transaction would fail - check inputs or try a smaller amount';
    }
    if (msg.includes('429') || msg.includes('Too Many')) {
      return 'Too many requests - please wait a moment';
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
      return 'Transaction deadline expired';
    }
    if (msg.includes('INSUFFICIENT_OUTPUT_AMOUNT')) {
      return 'Price moved too much - try increasing slippage';
    }
    if (msg.includes('INSUFFICIENT_LIQUIDITY')) {
      return 'Not enough liquidity in pool';
    }
    
    // Return cleaned message
    return error?.reason || 'Transaction failed';
  }

  async call<T>(
    contractCall: () => Promise<T>,
    cacheKey?: string
  ): Promise<T | null> {
    // Check cache first - always return cached value if available
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
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
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
      
      return result as T;
    } catch (error) {
      // Silently handle and return cached data if available
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
    this.cooldownUntil = 0;
  }

  // Clear cache
  clearCache() {
    this.cache.clear();
  }

  // Get cooldown remaining time
  getCooldownRemaining(): number {
    return Math.max(0, this.cooldownUntil - Date.now());
  }
}

export const rpcProvider = RPCProviderService.getInstance();
export default rpcProvider;
