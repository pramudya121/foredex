import { useEffect, useCallback, useRef } from 'react';
import { ethers } from 'ethers';
import { CONTRACTS, TOKEN_LIST } from '@/config/contracts';
import { PAIR_ABI, FACTORY_ABI } from '@/config/abis';
import { rpcProvider } from '@/lib/rpcProvider';
import { toast } from 'sonner';
import { playNotificationSound } from '@/lib/sounds';

interface EventLog {
  type: 'swap' | 'mint' | 'burn' | 'sync' | 'pairCreated';
  pairAddress: string;
  token0Symbol: string;
  token1Symbol: string;
  amount0?: string;
  amount1?: string;
  timestamp: number;
  txHash: string;
}

// Global event listeners to avoid duplicates
let isListening = false;
const eventCallbacks = new Set<(event: EventLog) => void>();

function getTokenSymbol(address: string): string {
  const token = TOKEN_LIST.find(t => t.address.toLowerCase() === address.toLowerCase());
  return token?.symbol || address.slice(0, 6) + '...';
}

export function useContractEvents(
  onEvent?: (event: EventLog) => void,
  options?: { 
    showToasts?: boolean;
    playSounds?: boolean;
  }
) {
  const optionsRef = useRef(options);
  optionsRef.current = options;
  
  const handleEvent = useCallback((event: EventLog) => {
    if (optionsRef.current?.showToasts !== false) {
      const { type, token0Symbol, token1Symbol, amount0, amount1 } = event;
      
      switch (type) {
        case 'swap':
          toast.info(`🔄 Swap: ${token0Symbol}/${token1Symbol}`, {
            description: amount0 && amount1 
              ? `${parseFloat(amount0).toFixed(4)} ${token0Symbol} → ${parseFloat(amount1).toFixed(4)} ${token1Symbol}`
              : 'New swap executed',
          });
          break;
        case 'mint':
          toast.success(`➕ Liquidity Added: ${token0Symbol}/${token1Symbol}`, {
            description: 'New liquidity added to pool',
          });
          break;
        case 'burn':
          toast.info(`➖ Liquidity Removed: ${token0Symbol}/${token1Symbol}`, {
            description: 'Liquidity removed from pool',
          });
          break;
        case 'sync':
          // Sync events are frequent, show less prominently
          break;
        case 'pairCreated':
          toast.success(`🆕 New Pool Created: ${token0Symbol}/${token1Symbol}`, {
            description: 'A new trading pair is now available',
          });
          break;
      }
    }
    
    if (optionsRef.current?.playSounds !== false && event.type !== 'sync') {
      playNotificationSound();
    }
    
    onEvent?.(event);
  }, [onEvent]);

  useEffect(() => {
    if (onEvent) {
      eventCallbacks.add(handleEvent);
    }
    
    return () => {
      eventCallbacks.delete(handleEvent);
    };
  }, [handleEvent, onEvent]);

  useEffect(() => {
    if (isListening) return;
    
    const provider = rpcProvider.getProvider();
    if (!provider) return;

    isListening = true;

    // NOTE: We don't use event listeners (factory.on) because the RPC doesn't support
    // eth_getFilterChanges properly. Instead, we poll for events using queryFilter.
    
    let lastCheckedBlock = 0;
    let isPolling = false;
    
    const pollEvents = async () => {
      if (isPolling) return;
      isPolling = true;
      
      try {
        if (!rpcProvider.isAvailable()) {
          return;
        }
        
        const currentBlock = await rpcProvider.call(
          () => provider.getBlockNumber(),
          'blockNumber',
          { timeout: 5000 }
        );
        
        if (!currentBlock) return;
        
        if (lastCheckedBlock === 0) {
          lastCheckedBlock = currentBlock - 5; // Start from 5 blocks ago
        }
        
        if (currentBlock <= lastCheckedBlock) return;
        
        const factory = new ethers.Contract(CONTRACTS.FACTORY, FACTORY_ABI, provider);
        
        // Get pair count
        const pairCount = await rpcProvider.call(
          () => factory.allPairsLength(),
          'pairCount',
          { timeout: 5000 }
        );
        
        if (!pairCount) return;
        
        const numPairs = Math.min(Number(pairCount), 10); // Limit to first 10 pairs for performance
        
        for (let i = 0; i < numPairs; i++) {
          try {
            const pairAddress = await rpcProvider.call(
              () => factory.allPairs(i),
              `pair_${i}`,
              { timeout: 5000 }
            );
            
            if (!pairAddress) continue;
            
            const pair = new ethers.Contract(pairAddress, PAIR_ABI, provider);
            
            // Get token info for this pair
            const [token0Addr, token1Addr] = await Promise.all([
              rpcProvider.call(() => pair.token0(), `token0_${pairAddress}`),
              rpcProvider.call(() => pair.token1(), `token1_${pairAddress}`),
            ]);
            
            if (!token0Addr || !token1Addr) continue;
            
            const token0Symbol = getTokenSymbol(token0Addr);
            const token1Symbol = getTokenSymbol(token1Addr);
            
            // Query events from last checked block using queryFilter (no filters/subscriptions)
            const [swapEvents, mintEvents, burnEvents] = await Promise.all([
              pair.queryFilter('Swap', lastCheckedBlock, currentBlock).catch(() => []),
              pair.queryFilter('Mint', lastCheckedBlock, currentBlock).catch(() => []),
              pair.queryFilter('Burn', lastCheckedBlock, currentBlock).catch(() => []),
            ]);
            
            // Process swap events
            for (const event of swapEvents) {
              const args = (event as any).args;
              if (args) {
                const log: EventLog = {
                  type: 'swap',
                  pairAddress,
                  token0Symbol,
                  token1Symbol,
                  amount0: ethers.formatEther(args.amount0In > 0n ? args.amount0In : args.amount0Out),
                  amount1: ethers.formatEther(args.amount1In > 0n ? args.amount1In : args.amount1Out),
                  timestamp: Date.now(),
                  txHash: event.transactionHash,
                };
                eventCallbacks.forEach(cb => cb(log));
              }
            }
            
            // Process mint events
            for (const event of mintEvents) {
              const args = (event as any).args;
              if (args) {
                const log: EventLog = {
                  type: 'mint',
                  pairAddress,
                  token0Symbol,
                  token1Symbol,
                  amount0: ethers.formatEther(args.amount0),
                  amount1: ethers.formatEther(args.amount1),
                  timestamp: Date.now(),
                  txHash: event.transactionHash,
                };
                eventCallbacks.forEach(cb => cb(log));
              }
            }
            
            // Process burn events
            for (const event of burnEvents) {
              const args = (event as any).args;
              if (args) {
                const log: EventLog = {
                  type: 'burn',
                  pairAddress,
                  token0Symbol,
                  token1Symbol,
                  amount0: ethers.formatEther(args.amount0),
                  amount1: ethers.formatEther(args.amount1),
                  timestamp: Date.now(),
                  txHash: event.transactionHash,
                };
                eventCallbacks.forEach(cb => cb(log));
              }
            }
          } catch {
            // Skip failed pairs silently
          }
        }
        
        lastCheckedBlock = currentBlock;
      } catch {
        // Silent fail - network errors are expected
      } finally {
        isPolling = false;
      }
    };
    
    // Poll every 30 seconds (less aggressive)
    const pollInterval = setInterval(pollEvents, 30000);
    
    // Initial poll after 3 seconds
    const initialTimeout = setTimeout(pollEvents, 3000);

    return () => {
      clearInterval(pollInterval);
      clearTimeout(initialTimeout);
      isListening = false;
    };
  }, []);

  return null;
}

// Export types
export type { EventLog };
