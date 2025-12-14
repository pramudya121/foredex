import { useState, useEffect } from 'react';
import { useWeb3 } from '@/contexts/Web3Context';
import { getStoredTransactions, Transaction } from './TransactionHistory';
import { NEXUS_TESTNET } from '@/config/contracts';
import { Loader2, ExternalLink, CheckCircle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

export function PendingTransactions() {
  const { address, provider } = useWeb3();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    if (!address) return;

    const loadTransactions = () => {
      const txs = getStoredTransactions(address);
      setTransactions(txs.slice(0, 5)); // Show last 5
      setPendingCount(txs.filter(tx => tx.status === 'pending').length);
    };

    loadTransactions();

    // Listen for updates
    window.addEventListener('foredex_tx_update', loadTransactions);
    return () => window.removeEventListener('foredex_tx_update', loadTransactions);
  }, [address]);

  // Check pending transaction status
  useEffect(() => {
    if (!provider || !address || pendingCount === 0) return;

    const checkPending = async () => {
      const txs = getStoredTransactions(address);
      const pending = txs.filter(tx => tx.status === 'pending');
      
      for (const tx of pending) {
        try {
          const receipt = await provider.getTransactionReceipt(tx.hash);
          if (receipt) {
            const { updateTransactionStatus } = await import('./TransactionHistory');
            updateTransactionStatus(
              address, 
              tx.hash, 
              receipt.status === 1 ? 'confirmed' : 'failed'
            );
          }
        } catch (error) {
          console.error('Error checking tx status:', error);
        }
      }
    };

    const interval = setInterval(checkPending, 5000);
    checkPending();

    return () => clearInterval(interval);
  }, [provider, address, pendingCount]);

  if (!address || transactions.length === 0) return null;

  const getStatusIcon = (status: Transaction['status']) => {
    switch (status) {
      case 'pending':
        return <Loader2 className="w-3.5 h-3.5 animate-spin text-yellow-500" />;
      case 'confirmed':
        return <CheckCircle className="w-3.5 h-3.5 text-green-500" />;
      case 'failed':
        return <XCircle className="w-3.5 h-3.5 text-red-500" />;
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className={cn(
            'relative flex items-center gap-2 px-3 py-1.5 rounded-full',
            'bg-muted/50 border border-border/50 hover:border-primary/30 transition-colors',
            pendingCount > 0 && 'border-yellow-500/50'
          )}
        >
          {pendingCount > 0 ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin text-yellow-500" />
              <span className="text-xs font-medium">{pendingCount} Pending</span>
            </>
          ) : (
            <>
              <CheckCircle className="w-3.5 h-3.5 text-green-500" />
              <span className="text-xs font-medium text-muted-foreground">Recent</span>
            </>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-2">
        <div className="text-sm font-medium mb-2 px-2">Recent Transactions</div>
        <div className="space-y-1">
          {transactions.map((tx) => (
            <a
              key={tx.hash}
              href={`${NEXUS_TESTNET.blockExplorer}/tx/${tx.hash}`}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                'flex items-center justify-between p-2 rounded-lg',
                'hover:bg-muted/50 transition-colors group'
              )}
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                {getStatusIcon(tx.status)}
                <span className="text-sm truncate">{tx.description}</span>
              </div>
              <ExternalLink className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </a>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
