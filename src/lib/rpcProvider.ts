import { ethers } from 'ethers';
import { NEXUS_TESTNET } from '@/config/contracts';

// Batched RPC request interface
interface BatchedRequest {
  method: string;
  params: any[];
  resolve: (value: any) => void;
  reject: (error: any) => void;
}

// Singleton RPC provider with robust error handling, adaptive throttling, and request batching
class RPCProviderService {
  private static instance: RPCProviderService;
  private provider: ethers.JsonRpcProvider | null = null;
  private currentRpcIndex = 0;
  private lastRequestTime = 0;
  private minRequestInterval = 100;
  private cache = new Map<string, { data: any; timestamp: number }>();
  private cacheTTL = 60000; // Cache for 60 seconds
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
  private initPromise: Promise<void> | null = null;
  
  // Batching state
  private batchQueue: BatchedRequest[] = [];
  private batchTimeout: NodeJS.Timeout | null = null;
  private batchMaxSize = 10;
  private batchDelayMs = 50;

  private constructor() {
    this.initPromise = this.initProvider();
  }

  // Get RPC URLs with CORS proxy fallbacks
  private getRpcUrls(): string[] {
    const directUrls = NEXUS_TESTNET.rpcUrls || [NEXUS_TESTNET.rpcUrl];
    const corsProxies = [
      'https://corsproxy.io/?',
      'https://api.allorigins.win/raw?url=',
    ];
    
    const allUrls: string[] = [];
    
    for (const url of directUrls) {
      allUrls.push(url);
    }
    
    for (const proxy of corsProxies) {
      for (const url of directUrls) {
        allUrls.push(`${proxy}${encodeURIComponent(url)}`);
      }
    }
    
    return allUrls;
  }

  private async initProvider(rpcIndex: number = 0): Promise<void> {
    if (this.isInitializing && rpcIndex === 0) return;
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
      
      this.provider = new ethers.JsonRpcProvider(
        rpcUrl,
        network,
        {
          staticNetwork: ethers.Network.from(network),
          batchMaxCount: 1, // We handle batching ourselves
          polling: false,
          cacheTimeout: -1,
        }
      );
      
      this.provider.pollingInterval = 0;

      this.provider.getFeeData = async () => {
        try {
          const gasPrice = await this.provider!.send('eth_gasPrice', []);
          return new ethers.FeeData(BigInt(gasPrice), null, null);
        } catch {
          return new ethers.FeeData(BigInt(1000000000), null, null);
        }
      };
      
      try {
        await Promise.race([
          this.provider.getBlockNumber(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 8000))
        ]);
        this.providerReady = true;
        this.lastSuccessTime = Date.now();
        this.consecutiveErrors = 0;
        console.info(`RPC connected: ${rpcUrl.includes('corsproxy') ? 'via CORS proxy' : rpcUrl}`);
      } catch {
        this.provider = null;
        if (rpcIndex < rpcUrls.length - 1) {
          this.isInitializing = false;
          await this.initProvider(rpcIndex + 1);
          return;
        }
      }
    } catch {
      this.provider = null;
      this.cooldownUntil = Date.now() + 3000;
    } finally {
      this.isInitializing = false;
    }
  }

  private async switchRpc() {
    const rpcUrls = this.getRpcUrls();
    const nextIndex = (this.currentRpcIndex + 1) % rpcUrls.length;
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
    if (now >= this.cooldownUntil && this.cooldownUntil > 0) {
      this.cooldownUntil = 0;
      this.consecutiveErrors = 0;
      this.errorCount = Math.max(0, this.errorCount - 10);
      this.minRequestInterval = 100;
    }
    
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
    
    if (this.consecutiveErrors > 5) {
      this.errorCount++;
    }
    
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
    
    if (errorMessage.includes('429') || errorMessage.includes('Too Many Requests') || errorMessage.includes('rate limit')) {
      this.cooldownUntil = Date.now() + 2000;
      this.minRequestInterval = Math.min(500, this.minRequestInterval * 1.5);
    }
  }

  parseError(error: any, showTransient = false): string | null {
    const msg = error?.message || error?.reason || String(error);
    
    // Network and transient errors - suppress these completely
    if (msg.includes('coalesce') || 
        msg.includes('could not coalesce') ||
        msg.includes('CORS') || 
        msg.includes('ERR_FAILED') || 
        msg.includes('Failed to fetch') ||
        msg.includes('eth_maxPriorityFeePerGas') ||
        msg.includes('rate limit') ||
        msg.includes('NetworkError') ||
        msg.includes('Timeout') ||
        msg.includes('timeout') ||
        msg.includes('ETIMEDOUT') ||
        msg.includes('ECONNREFUSED') ||
        msg.includes('429') ||
        msg.includes('502') ||
        msg.includes('503') ||
        msg.includes('504') ||
        msg.includes('network changed') ||
        msg.includes('underlying network changed')) {
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
    
    if (showTransient) {
      return error?.reason || 'Transaction failed - please try again';
    }
    
    return null;
  }

  // === BATCHING METHODS ===
  
  // Execute batch of RPC calls
  private async executeBatch() {
    if (this.batchQueue.length === 0) return;
    
    const batch = this.batchQueue.splice(0, this.batchMaxSize);
    
    if (!this.provider || !this.providerReady) {
      batch.forEach(req => req.reject(new Error('Provider not available')));
      return;
    }
    
    try {
      // Create JSON-RPC batch request
      const batchRequest = batch.map((req, index) => ({
        jsonrpc: '2.0',
        id: index + 1,
        method: req.method,
        params: req.params
      }));
      
      // Send batch request
      const response = await fetch(this.provider._getConnection().url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(batchRequest)
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`);
      }
      
      const results = await response.json();
      
      // Handle array response (batch)
      if (Array.isArray(results)) {
        results.forEach((result: any) => {
          const req = batch[result.id - 1];
          if (req) {
            if (result.error) {
              req.reject(result.error);
            } else {
              req.resolve(result.result);
            }
          }
        });
      } else if (results.error) {
        // Single error response
        batch.forEach(req => req.reject(results.error));
      } else {
        // Single result (shouldn't happen with batch)
        batch[0]?.resolve(results.result);
      }
      
      // Reset error count on success
      this.consecutiveErrors = 0;
      this.lastSuccessTime = Date.now();
      
    } catch (error) {
      // Fallback to individual calls
      await this.handleError(error);
      
      for (const req of batch) {
        try {
          const result = await this.provider!.send(req.method, req.params);
          req.resolve(result);
        } catch (e) {
          req.reject(e);
        }
      }
    }
    
    // Process remaining queue
    if (this.batchQueue.length > 0) {
      this.scheduleBatch();
    }
  }
  
  private scheduleBatch() {
    if (this.batchTimeout) return;
    
    this.batchTimeout = setTimeout(() => {
      this.batchTimeout = null;
      this.executeBatch();
    }, this.batchDelayMs);
    
    // Execute immediately if batch is full
    if (this.batchQueue.length >= this.batchMaxSize) {
      clearTimeout(this.batchTimeout);
      this.batchTimeout = null;
      this.executeBatch();
    }
  }
  
  // Batch RPC call
  batchCall(method: string, params: any[] = []): Promise<any> {
    return new Promise((resolve, reject) => {
      this.batchQueue.push({ method, params, resolve, reject });
      this.scheduleBatch();
    });
  }
  
  // Batch multiple contract calls together
  async batchContractCalls<T>(
    calls: Array<{ contract: ethers.Contract; method: string; args: any[] }>,
    cacheKeyPrefix?: string
  ): Promise<Array<T | null>> {
    const results: Array<T | null> = [];
    const pendingCalls: Array<{ index: number; call: () => Promise<T> }> = [];
    
    // Check cache first
    for (let i = 0; i < calls.length; i++) {
      const cacheKey = cacheKeyPrefix ? `${cacheKeyPrefix}_${i}` : null;
      if (cacheKey) {
        const cached = this.getFromCache(cacheKey);
        if (cached !== null) {
          results[i] = cached;
          continue;
        }
      }
      results[i] = null;
      pendingCalls.push({
        index: i,
        call: () => calls[i].contract[calls[i].method](...calls[i].args)
      });
    }
    
    if (pendingCalls.length === 0) return results;
    
    // Execute pending calls in parallel batches
    const batchSize = 5;
    for (let i = 0; i < pendingCalls.length; i += batchSize) {
      const batch = pendingCalls.slice(i, i + batchSize);
      const batchResults = await Promise.allSettled(
        batch.map(p => this.call(p.call, cacheKeyPrefix ? `${cacheKeyPrefix}_${p.index}` : undefined))
      );
      
      batchResults.forEach((result, idx) => {
        const originalIndex = batch[idx].index;
        results[originalIndex] = result.status === 'fulfilled' ? result.value : null;
      });
    }
    
    return results;
  }

  private async processQueue() {
    if (this.isProcessingQueue || this.requestQueue.length === 0) return;
    this.isProcessingQueue = true;

    while (this.requestQueue.length > 0) {
      if (!this.isAvailable()) {
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
      
      await new Promise(r => setTimeout(r, 50));
    }

    this.isProcessingQueue = false;
  }

  async call<T>(
    contractCall: () => Promise<T>,
    cacheKey?: string,
    options?: { skipCache?: boolean; timeout?: number; retries?: number }
  ): Promise<T | null> {
    if (cacheKey && !options?.skipCache) {
      const cached = this.getFromCache(cacheKey);
      if (cached !== null) return cached;
    }

    if (cacheKey && this.pendingRequests.has(cacheKey)) {
      try {
        return await this.pendingRequests.get(cacheKey);
      } catch {
        // Fall through to retry
      }
    }

    if (!this.isAvailable()) {
      if (cacheKey) {
        const cached = this.cache.get(cacheKey);
        if (cached) return cached.data;
      }
      return null;
    }

    this.lastRequestTime = Date.now();

    const timeout = options?.timeout || 15000;
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
        
        this.consecutiveErrors = 0;
        this.errorCount = Math.max(0, this.errorCount - 5);
        this.minRequestInterval = 100;
        this.lastSuccessTime = Date.now();
        
        return result as T;
      } catch (error: any) {
        const errorMsg = error?.message || String(error);
        
        const isTransient = errorMsg.includes('coalesce') || 
                           errorMsg.includes('CORS') || 
                           errorMsg.includes('429') ||
                           errorMsg.includes('rate limit') ||
                           errorMsg.includes('Timeout') ||
                           errorMsg.includes('Failed to fetch') ||
                           errorMsg.includes('NetworkError') ||
                           errorMsg.includes('ERR_FAILED') ||
                           errorMsg.includes('eth_maxPriorityFeePerGas');
        
        if (attempt < maxRetries && isTransient) {
          const delay = 800 * (attempt + 1);
          await new Promise(r => setTimeout(r, delay));
          return executeCall(attempt + 1);
        }
        
        await this.handleError(error);
        
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

  reset() {
    this.errorCount = 0;
    this.consecutiveErrors = 0;
    this.cooldownUntil = 0;
    this.minRequestInterval = 100;
    this.pendingRequests.clear();
    this.requestQueue = [];
    this.batchQueue = [];
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
      this.batchTimeout = null;
    }
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
