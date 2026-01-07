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

    // Listen to Factory PairCreated events
    const factory = new ethers.Contract(CONTRACTS.FACTORY, FACTORY_ABI, provider);
    
    const pairCreatedHandler = async (token0: string, token1: string, pair: string, _: bigint, event: any) => {
      const log: EventLog = {
        type: 'pairCreated',
        pairAddress: pair,
        token0Symbol: getTokenSymbol(token0),
        token1Symbol: getTokenSymbol(token1),
        timestamp: Date.now(),
        txHash: event.log?.transactionHash || '',
      };
      
      eventCallbacks.forEach(cb => cb(log));
    };

    factory.on('PairCreated', pairCreatedHandler);

    // We can't listen to all pair events without knowing addresses,
    // but we can poll recent blocks for events
    let lastCheckedBlock = 0;
    
    const pollEvents = async () => {
      try {
        const currentBlock = await provider.getBlockNumber();
        if (lastCheckedBlock === 0) {
          lastCheckedBlock = currentBlock - 10; // Start from 10 blocks ago
        }
        
        if (currentBlock <= lastCheckedBlock) return;
        
        // Get all pairs from factory
        const pairCount = await factory.allPairsLength();
        const numPairs = Math.min(Number(pairCount), 20); // Limit to first 20 pairs
        
        for (let i = 0; i < numPairs; i++) {
          try {
            const pairAddress = await factory.allPairs(i);
            const pair = new ethers.Contract(pairAddress, PAIR_ABI, provider);
            
            // Get token info for this pair
            const [token0Addr, token1Addr] = await Promise.all([
              pair.token0(),
              pair.token1(),
            ]);
            
            const token0Symbol = getTokenSymbol(token0Addr);
            const token1Symbol = getTokenSymbol(token1Addr);
            
            // Query events from last checked block
            const swapFilter = pair.filters.Swap();
            const mintFilter = pair.filters.Mint();
            const burnFilter = pair.filters.Burn();
            
            const [swapEvents, mintEvents, burnEvents] = await Promise.all([
              pair.queryFilter(swapFilter, lastCheckedBlock, currentBlock).catch(() => []),
              pair.queryFilter(mintFilter, lastCheckedBlock, currentBlock).catch(() => []),
              pair.queryFilter(burnFilter, lastCheckedBlock, currentBlock).catch(() => []),
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
            // Skip failed pairs
          }
        }
        
        lastCheckedBlock = currentBlock;
      } catch {
        // Silent fail - network errors are expected
      }
    };
    
    // Poll every 15 seconds
    const pollInterval = setInterval(pollEvents, 15000);
    
    // Initial poll
    setTimeout(pollEvents, 2000);

    return () => {
      factory.off('PairCreated', pairCreatedHandler);
      clearInterval(pollInterval);
      isListening = false;
    };
  }, []);

  return null;
}

// Export types
export type { EventLog };
