import { useState, useEffect } from 'react';
import { useWeb3 } from '@/contexts/Web3Context';
import { NEXUS_TESTNET } from '@/config/contracts';
import { History, ExternalLink, ArrowRightLeft, Droplets, Check, Clock, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface Transaction {
  hash: string;
  type: 'swap' | 'add_liquidity' | 'remove_liquidity' | 'approve';
  description: string;
  timestamp: number;
  status: 'pending' | 'confirmed' | 'failed';
}

// Global transaction storage
const STORAGE_KEY = 'foredex_transactions';

export function getStoredTransactions(address: string): Transaction[] {
  try {
    const stored = localStorage.getItem(`${STORAGE_KEY}_${address.toLowerCase()}`);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function addTransaction(address: string, tx: Transaction) {
  const existing = getStoredTransactions(address);
  const updated = [tx, ...existing].slice(0, 50); // Keep last 50
  localStorage.setItem(`${STORAGE_KEY}_${address.toLowerCase()}`, JSON.stringify(updated));
  window.dispatchEvent(new CustomEvent('foredex_tx_update'));
}

export function updateTransactionStatus(address: string, hash: string, status: 'confirmed' | 'failed') {
  const existing = getStoredTransactions(address);
  const updated = existing.map(tx => 
    tx.hash.toLowerCase() === hash.toLowerCase() ? { ...tx, status } : tx
  );
  localStorage.setItem(`${STORAGE_KEY}_${address.toLowerCase()}`, JSON.stringify(updated));
  window.dispatchEvent(new CustomEvent('foredex_tx_update'));
}

export function TransactionHistory() {
  const { address, isConnected } = useWeb3();
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  useEffect(() => {
    if (!address) return;

    const loadTransactions = () => {
      setTransactions(getStoredTransactions(address));
    };

    loadTransactions();

    // Listen for updates
    window.addEventListener('foredex_tx_update', loadTransactions);
    return () => window.removeEventListener('foredex_tx_update', loadTransactions);
  }, [address]);

  const getIcon = (type: Transaction['type']) => {
    switch (type) {
      case 'swap':
        return <ArrowRightLeft className="w-4 h-4" />;
      case 'add_liquidity':
      case 'remove_liquidity':
        return <Droplets className="w-4 h-4" />;
      default:
        return <Check className="w-4 h-4" />;
    }
  };

  const getStatusIcon = (status: Transaction['status']) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4 animate-pulse text-yellow-500" />;
      case 'confirmed':
        return <Check className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <X className="w-4 h-4 text-red-500" />;
    }
  };

  const formatTime = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  if (!isConnected) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Connect wallet to view history
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="text-center py-8">
        <History className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
        <p className="text-muted-foreground">No transactions yet</p>
        <p className="text-sm text-muted-foreground/70">
          Your transactions will appear here
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {transactions.map((tx) => (
        <div
          key={tx.hash}
          className={cn(
            'flex items-center justify-between p-3 rounded-lg',
            'bg-muted/30 hover:bg-muted/50 transition-colors'
          )}
        >
          <div className="flex items-center gap-3">
            <div className={cn(
              'p-2 rounded-lg',
              tx.status === 'confirmed' && 'bg-green-500/10 text-green-500',
              tx.status === 'pending' && 'bg-yellow-500/10 text-yellow-500',
              tx.status === 'failed' && 'bg-red-500/10 text-red-500'
            )}>
              {getIcon(tx.type)}
            </div>
            <div>
              <p className="font-medium text-sm">{tx.description}</p>
              <p className="text-xs text-muted-foreground">{formatTime(tx.timestamp)}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {getStatusIcon(tx.status)}
            <a
              href={`${NEXUS_TESTNET.blockExplorer}/tx/${tx.hash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 rounded hover:bg-muted transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
            </a>
          </div>
        </div>
      ))}
    </div>
  );
}
