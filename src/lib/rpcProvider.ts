import { ethers } from 'ethers';
import { NEXUS_TESTNET } from '@/config/contracts';

// Singleton RPC provider with robust error handling and adaptive throttling
class RPCProviderService {
  private static instance: RPCProviderService;
  private provider: ethers.JsonRpcProvider | null = null;
  private lastRequestTime = 0;
  private minRequestInterval = 50; // Very fast - 50ms
  private cache = new Map<string, { data: any; timestamp: number }>();
  private cacheTTL = 60000; // Cache for 60 seconds (increased)
  private errorCount = 0;
  private maxErrors = 200; // Very lenient
  private cooldownUntil = 0;
  private isInitializing = false;
  private consecutiveErrors = 0;
  private pendingRequests = new Map<string, Promise<any>>();
  private requestQueue: Array<() => void> = [];
  private isProcessingQueue = false;
  private lastSuccessTime = Date.now();

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
      
      // Create provider with EIP-1559 disabled (network doesn't support it)
      this.provider = new ethers.JsonRpcProvider(
        NEXUS_TESTNET.rpcUrl,
        network,
        {
          staticNetwork: ethers.Network.from(network),
          batchMaxCount: 1,
          polling: false,
        }
      );

      // Override getFeeData to avoid eth_maxPriorityFeePerGas calls
      const originalGetFeeData = this.provider.getFeeData.bind(this.provider);
      this.provider.getFeeData = async () => {
        try {
          // Only fetch gas price, skip EIP-1559 fields
          const gasPrice = await this.provider!.send('eth_gasPrice', []);
          return new ethers.FeeData(
            BigInt(gasPrice), // gasPrice
            null, // maxFeePerGas - null means not EIP-1559
            null  // maxPriorityFeePerGas - null means not EIP-1559
          );
        } catch {
          // Return default gas price if RPC fails
          return new ethers.FeeData(
            BigInt(1000000000), // 1 gwei default
            null,
            null
          );
        }
      };
      
      this.lastSuccessTime = Date.now();
    } catch {
      this.provider = null;
      this.cooldownUntil = Date.now() + 2000;
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
      this.errorCount = Math.max(0, this.errorCount - 20);
      this.minRequestInterval = 50;
    }
    
    // Always return true if provider exists - let individual calls handle errors
    return this.provider !== null;
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
    if (this.cache.size > 200) {
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
    
    // Only count as error for severe repeated failures
    if (this.consecutiveErrors > 10) {
      this.errorCount++;
    }
    
    // Minimal throttling - only for rate limits
    if (errorMessage.includes('429') || errorMessage.includes('Too Many Requests') || errorMessage.includes('rate limit')) {
      this.cooldownUntil = Date.now() + 1000; // 1s cooldown for rate limit
      this.minRequestInterval = Math.min(500, this.minRequestInterval * 1.2);
    }
    // Don't set cooldown for network errors - just use cache
  }

  // Parse user-friendly error messages - returns null for transient errors that should be silent
  parseError(error: any, showTransient = false): string | null {
    const msg = error?.message || error?.reason || String(error);
    
    // Transient network errors - return null to suppress toast
    if (msg.includes('coalesce') || 
        msg.includes('CORS') || 
        msg.includes('ERR_FAILED') || 
        msg.includes('Failed to fetch') ||
        msg.includes('eth_maxPriorityFeePerGas') ||
        msg.includes('rate limit') ||
        msg.includes('429')) {
      return showTransient ? 'Network busy - please try again in a moment' : null;
    }
    
    if (msg.includes('missing revert data')) {
      return 'Transaction would fail - check your inputs or try a smaller amount';
    }
    if (msg.includes('user rejected') || msg.includes('User denied') || msg.includes('ACTION_REJECTED')) {
      return 'Transaction cancelled by user';
    }
    if (msg.includes('insufficient funds') || msg.includes('INSUFFICIENT_FUNDS')) {
      return 'Insufficient balance for this transaction';
    }
    if (msg.includes('TRANSFER_FAILED')) {
      return 'Token transfer failed - please check approval and balance';
    }
    if (msg.includes('EXPIRED') || msg.includes('Transaction too old')) {
      return 'Transaction deadline expired - please try again';
    }
    if (msg.includes('INSUFFICIENT_OUTPUT_AMOUNT') || msg.includes('too little received')) {
      return 'Price moved too much - try increasing slippage tolerance';
    }
    if (msg.includes('INSUFFICIENT_LIQUIDITY') || msg.includes('INSUFFICIENT_A_AMOUNT') || msg.includes('INSUFFICIENT_B_AMOUNT')) {
      return 'Not enough liquidity in pool for this trade';
    }
    if (msg.includes('IDENTICAL_ADDRESSES')) {
      return 'Cannot swap token to itself';
    }
    if (msg.includes('ZERO_ADDRESS')) {
      return 'Invalid token address';
    }
    if (msg.includes('PAIR_EXISTS')) {
      return 'This pool already exists';
    }
    if (msg.includes('K') && msg.includes('INVARIANT')) {
      return 'Pool invariant error - try a different amount';
    }
    if (msg.includes('OVERFLOW')) {
      return 'Amount too large - try a smaller value';
    }
    if (msg.includes('execution reverted')) {
      // Try to extract reason from reverted message
      const reasonMatch = msg.match(/reason="([^"]+)"/);
      if (reasonMatch) {
        return `Transaction failed: ${reasonMatch[1]}`;
      }
      return 'Transaction would fail - please check amounts and approvals';
    }
    if (msg.includes('nonce') && msg.includes('too low')) {
      return 'Transaction nonce conflict - please wait and try again';
    }
    if (msg.includes('replacement fee too low') || msg.includes('underpriced')) {
      return 'Gas price too low - please wait for pending transaction';
    }
    
    // For user-initiated actions, show generic error only when showTransient is true
    if (showTransient) {
      return error?.reason || 'Transaction failed - please try again';
    }
    
    return null;
  }

  // Process request queue with rate limiting
  private async processQueue() {
    if (this.isProcessingQueue || this.requestQueue.length === 0) return;
    this.isProcessingQueue = true;

    while (this.requestQueue.length > 0) {
      if (!this.isAvailable()) {
        // Wait for cooldown to end
        const wait = Math.max(1000, this.getCooldownRemaining());
        await new Promise(r => setTimeout(r, wait));
        continue;
      }

      const now = Date.now();
      const timeSinceLastRequest = now - this.lastRequestTime;
      if (timeSinceLastRequest < this.minRequestInterval) {
        await new Promise(r => setTimeout(r, this.minRequestInterval - timeSinceLastRequest));
      }
      
      this.lastRequestTime = Date.now();
      const nextRequest = this.requestQueue.shift();
      if (nextRequest) nextRequest();
      
      // Small delay between queue items
      await new Promise(r => setTimeout(r, 100));
    }

    this.isProcessingQueue = false;
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

    // If in cooldown, return cached value or null silently
    if (!this.isAvailable()) {
      if (cacheKey) {
        const cached = this.cache.get(cacheKey);
        if (cached) return cached.data;
      }
      return null;
    }

    // Don't throttle - let requests go through faster
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
        this.errorCount = Math.max(0, this.errorCount - 5);
        this.minRequestInterval = 50;
        this.lastSuccessTime = Date.now();
        
        return result as T;
      } catch (error: any) {
        const errorMsg = error?.message || String(error);
        
        // Don't log transient errors
        const isTransient = errorMsg.includes('coalesce') || 
                           errorMsg.includes('CORS') || 
                           errorMsg.includes('429') ||
                           errorMsg.includes('rate limit') ||
                           errorMsg.includes('Timeout') ||
                           errorMsg.includes('Failed to fetch') ||
                           errorMsg.includes('eth_maxPriorityFeePerGas');
        
        // Retry once on transient errors
        if (attempt < maxRetries && isTransient) {
          const delay = 500 * (attempt + 1);
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
    this.minRequestInterval = 100;
    this.pendingRequests.clear();
    this.requestQueue = [];
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

  getErrorCount(): number {
    return this.errorCount;
  }
}

export const rpcProvider = RPCProviderService.getInstance();
export default rpcProvider;
