import { ethers } from 'ethers';
import { NEXUS_TESTNET } from '@/config/contracts';

// Singleton RPC provider with robust error handling and adaptive throttling
class RPCProviderService {
  private static instance: RPCProviderService;
  private provider: ethers.JsonRpcProvider | null = null;
  private currentRpcIndex = 0;
  private lastRequestTime = 0;
  private minRequestInterval = 100; // Slightly slower for stability
  private cache = new Map<string, { data: any; timestamp: number }>();
  private cacheTTL = 30000; // Cache for 30 seconds
  private errorCount = 0;
  private maxErrors = 50;
  private cooldownUntil = 0;
  private isInitializing = false;
  private consecutiveErrors = 0;
  private pendingRequests = new Map<string, Promise<any>>();
  private requestQueue: Array<() => void> = [];
  private isProcessingQueue = false;
  private lastSuccessTime = Date.now();
  private providerReady = false;

  private constructor() {
    this.initProvider();
  }

  private getRpcUrls(): readonly string[] {
    return NEXUS_TESTNET.rpcUrls || [NEXUS_TESTNET.rpcUrl];
  }

  private async initProvider(rpcIndex: number = 0) {
    if (this.isInitializing) return;
    this.isInitializing = true;
    this.providerReady = false;
    
    const rpcUrls = this.getRpcUrls();
    this.currentRpcIndex = rpcIndex % rpcUrls.length;
    const rpcUrl = rpcUrls[this.currentRpcIndex];
    
    try {
      const network = {
        chainId: NEXUS_TESTNET.chainId,
        name: NEXUS_TESTNET.name,
      };
      
      // Create provider with EIP-1559 disabled (network doesn't support it)
      this.provider = new ethers.JsonRpcProvider(
        rpcUrl,
        network,
        {
          staticNetwork: ethers.Network.from(network),
          batchMaxCount: 1,
          polling: false,
        }
      );

      // Override getFeeData to avoid eth_maxPriorityFeePerGas calls
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
      
      // Test connection before marking as ready
      try {
        await Promise.race([
          this.provider.getBlockNumber(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))
        ]);
        this.providerReady = true;
        this.lastSuccessTime = Date.now();
        this.consecutiveErrors = 0;
        console.log(`RPC connected: ${rpcUrl}`);
      } catch (testError) {
        console.warn(`RPC test failed for ${rpcUrl}, trying next...`);
        this.provider = null;
        // Try next RPC URL
        if (rpcIndex < rpcUrls.length - 1) {
          this.isInitializing = false;
          await this.initProvider(rpcIndex + 1);
          return;
        }
      }
    } catch {
      this.provider = null;
      this.cooldownUntil = Date.now() + 2000;
    } finally {
      this.isInitializing = false;
    }
  }

  // Switch to next RPC URL on persistent errors
  private async switchRpc() {
    const rpcUrls = this.getRpcUrls();
    const nextIndex = (this.currentRpcIndex + 1) % rpcUrls.length;
    console.log(`Switching RPC from index ${this.currentRpcIndex} to ${nextIndex}`);
    this.provider = null;
    this.providerReady = false;
    await this.initProvider(nextIndex);
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
      this.errorCount = Math.max(0, this.errorCount - 10);
      this.minRequestInterval = 100;
    }
    
    // Check if we're in cooldown
    if (now < this.cooldownUntil) {
      return false;
    }
    
    return this.provider !== null && this.providerReady;
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

  private async handleError(error: any): Promise<void> {
    const errorMessage = error?.message || String(error);
    this.consecutiveErrors++;
    
    // Count errors
    if (this.consecutiveErrors > 5) {
      this.errorCount++;
    }
    
    // Handle CORS and fetch errors - switch RPC
    if (errorMessage.includes('CORS') || 
        errorMessage.includes('Failed to fetch') ||
        errorMessage.includes('ERR_FAILED') ||
        errorMessage.includes('NetworkError')) {
      if (this.consecutiveErrors >= 3) {
        await this.switchRpc();
        this.consecutiveErrors = 0;
      }
      return;
    }
    
    // Rate limit handling
    if (errorMessage.includes('429') || errorMessage.includes('Too Many Requests') || errorMessage.includes('rate limit')) {
      this.cooldownUntil = Date.now() + 2000;
      this.minRequestInterval = Math.min(500, this.minRequestInterval * 1.5);
    }
  }

  // Parse user-friendly error messages - returns null for transient errors that should be silent
  parseError(error: any, showTransient = false): string | null {
    const msg = error?.message || error?.reason || String(error);
    
    // Transient network errors - ALWAYS suppress these, never show toast
    if (msg.includes('coalesce') || 
        msg.includes('CORS') || 
        msg.includes('ERR_FAILED') || 
        msg.includes('Failed to fetch') ||
        msg.includes('eth_maxPriorityFeePerGas') ||
        msg.includes('rate limit') ||
        msg.includes('NetworkError') ||
        msg.includes('Timeout') ||
        msg.includes('429')) {
      // Never show network busy message - just return null to suppress
      return null;
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
        this.minRequestInterval = 100;
        this.lastSuccessTime = Date.now();
        
        return result as T;
      } catch (error: any) {
        const errorMsg = error?.message || String(error);
        
        // Identify transient/network errors
        const isTransient = errorMsg.includes('coalesce') || 
                           errorMsg.includes('CORS') || 
                           errorMsg.includes('429') ||
                           errorMsg.includes('rate limit') ||
                           errorMsg.includes('Timeout') ||
                           errorMsg.includes('Failed to fetch') ||
                           errorMsg.includes('NetworkError') ||
                           errorMsg.includes('ERR_FAILED') ||
                           errorMsg.includes('eth_maxPriorityFeePerGas');
        
        // Retry on transient errors with backoff
        if (attempt < maxRetries && isTransient) {
          const delay = 800 * (attempt + 1);
          await new Promise(r => setTimeout(r, delay));
          return executeCall(attempt + 1);
        }
        
        // Handle error (may switch RPC)
        await this.handleError(error);
        
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
