import { useState, useCallback } from 'react';
import { ethers } from 'ethers';
import { CONTRACTS, TOKEN_LIST } from '@/config/contracts';
import { FACTORY_ABI, PAIR_ABI } from '@/config/abis';
import { rpcProvider } from '@/lib/rpcProvider';
import { Transaction } from '@/components/TransactionHistory';

const getTokenSymbol = (address: string) => {
  const token = TOKEN_LIST.find(t => t.address.toLowerCase() === address?.toLowerCase());
  return token?.symbol || address?.slice(0, 6) + '...';
};

export function useOnChainHistory(userAddress: string | null) {
  const [onChainTxs, setOnChainTxs] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);

  const fetchOnChainHistory = useCallback(async () => {
    if (!userAddress) return;

    const provider = rpcProvider.getProvider();
    if (!provider) return;

    setLoading(true);
    try {
      const factory = new ethers.Contract(CONTRACTS.FACTORY, FACTORY_ABI, provider);
      const pairCount = await rpcProvider.call(() => factory.allPairsLength(), 'history_pairCount');
      const count = Number(pairCount || 0);

      // Get current block
      const currentBlock = await provider.getBlockNumber();
      // Look back ~5000 blocks (roughly a few hours on most chains)
      const fromBlock = Math.max(0, currentBlock - 5000);

      const txs: Transaction[] = [];

      // Swap event signature
      const swapTopic = ethers.id('Swap(address,uint256,uint256,uint256,uint256,address)');
      const mintTopic = ethers.id('Mint(address,uint256,uint256)');
      const burnTopic = ethers.id('Burn(address,uint256,uint256,address)');

      for (let i = 0; i < count && i < 15; i++) {
        try {
          const pairAddr = await rpcProvider.call(() => factory.allPairs(i), `history_pair_${i}`);
          if (!pairAddr) continue;

          const pair = new ethers.Contract(pairAddr, PAIR_ABI, provider);
          const [token0Addr, token1Addr] = await Promise.all([
            rpcProvider.call(() => pair.token0(), `history_t0_${pairAddr}`),
            rpcProvider.call(() => pair.token1(), `history_t1_${pairAddr}`),
          ]);

          const token0Symbol = getTokenSymbol(token0Addr);
          const token1Symbol = getTokenSymbol(token1Addr);

          // Query Swap events where user is sender or recipient
          const userTopic = ethers.zeroPadValue(userAddress, 32);

          // Fetch swap logs (sender = user OR to = user)
          const [swapLogsSender, swapLogsTo] = await Promise.all([
            provider.getLogs({
              address: pairAddr,
              topics: [swapTopic, userTopic],
              fromBlock,
              toBlock: currentBlock,
            }).catch(() => []),
            provider.getLogs({
              address: pairAddr,
              topics: [swapTopic, null, userTopic],
              fromBlock,
              toBlock: currentBlock,
            }).catch(() => []),
          ]);

          const allSwapLogs = [...swapLogsSender, ...swapLogsTo];
          const uniqueSwaps = new Map<string, typeof allSwapLogs[0]>();
          allSwapLogs.forEach(log => uniqueSwaps.set(log.transactionHash, log));

          for (const log of uniqueSwaps.values()) {
            const block = await provider.getBlock(log.blockNumber);
            txs.push({
              hash: log.transactionHash,
              type: 'swap',
              description: `Swap ${token0Symbol} ↔ ${token1Symbol}`,
              timestamp: (block?.timestamp || 0) * 1000,
              status: 'confirmed',
            });
          }

          // Fetch Mint events (add liquidity)
          const mintLogs = await provider.getLogs({
            address: pairAddr,
            topics: [mintTopic, userTopic],
            fromBlock,
            toBlock: currentBlock,
          }).catch(() => []);

          for (const log of mintLogs) {
            const block = await provider.getBlock(log.blockNumber);
            txs.push({
              hash: log.transactionHash,
              type: 'add_liquidity',
              description: `Add Liquidity ${token0Symbol}/${token1Symbol}`,
              timestamp: (block?.timestamp || 0) * 1000,
              status: 'confirmed',
            });
          }

          // Fetch Burn events (remove liquidity)
          const burnLogs = await provider.getLogs({
            address: pairAddr,
            topics: [burnTopic, userTopic],
            fromBlock,
            toBlock: currentBlock,
          }).catch(() => []);

          for (const log of burnLogs) {
            const block = await provider.getBlock(log.blockNumber);
            txs.push({
              hash: log.transactionHash,
              type: 'remove_liquidity',
              description: `Remove Liquidity ${token0Symbol}/${token1Symbol}`,
              timestamp: (block?.timestamp || 0) * 1000,
              status: 'confirmed',
            });
          }

          // Rate limit between pairs
          await new Promise(r => setTimeout(r, 300));
        } catch {
          continue;
        }
      }

      // Sort by timestamp desc
      txs.sort((a, b) => b.timestamp - a.timestamp);
      setOnChainTxs(txs);
      setFetched(true);
    } catch (error) {
      console.warn('Error fetching on-chain history:', error);
    } finally {
      setLoading(false);
    }
  }, [userAddress]);

  return { onChainTxs, loading, fetched, fetchOnChainHistory };
}
