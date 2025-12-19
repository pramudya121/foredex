import { useState, useEffect, useMemo } from 'react';
import { useWeb3 } from '@/contexts/Web3Context';
import { getStoredTransactions, Transaction } from '@/components/TransactionHistory';
import { TokenLogo } from '@/components/TokenLogo';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { NEXUS_TESTNET } from '@/config/contracts';
import { 
  History, 
  ExternalLink, 
  ArrowRightLeft, 
  Droplets, 
  Check, 
  Clock, 
  X,
  Wallet,
  Filter,
  Trash2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

type FilterType = 'all' | 'swap' | 'liquidity' | 'pending';

const TransactionHistoryPage = () => {
  const { address, isConnected } = useWeb3();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filter, setFilter] = useState<FilterType>('all');

  useEffect(() => {
    if (!address) return;

    const loadTransactions = () => {
      setTransactions(getStoredTransactions(address));
    };

    loadTransactions();
    window.addEventListener('foredex_tx_update', loadTransactions);
    return () => window.removeEventListener('foredex_tx_update', loadTransactions);
  }, [address]);

  const filteredTransactions = useMemo(() => {
    switch (filter) {
      case 'swap':
        return transactions.filter(tx => tx.type === 'swap');
      case 'liquidity':
        return transactions.filter(tx => tx.type === 'add_liquidity' || tx.type === 'remove_liquidity');
      case 'pending':
        return transactions.filter(tx => tx.status === 'pending');
      default:
        return transactions;
    }
  }, [transactions, filter]);

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

  const getStatusLabel = (status: Transaction['status']) => {
    switch (status) {
      case 'pending':
        return 'Pending';
      case 'confirmed':
        return 'Confirmed';
      case 'failed':
        return 'Failed';
    }
  };

  const getTypeLabel = (type: Transaction['type']) => {
    switch (type) {
      case 'swap':
        return 'Swap';
      case 'add_liquidity':
        return 'Add Liquidity';
      case 'remove_liquidity':
        return 'Remove Liquidity';
      case 'approve':
        return 'Approve';
    }
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  const formatTimeAgo = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  const clearHistory = () => {
    if (!address) return;
    localStorage.removeItem(`foredex_transactions_${address.toLowerCase()}`);
    setTransactions([]);
    toast.success('Transaction history cleared');
  };

  const pendingCount = transactions.filter(tx => tx.status === 'pending').length;

  if (!isConnected) {
    return (
      <main className="container py-6 px-4 sm:py-8 md:py-12">
        <div className="glass-card p-8 sm:p-12 text-center animate-fade-in max-w-md mx-auto">
          <Wallet className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg sm:text-xl font-semibold mb-2">Connect Your Wallet</h3>
          <p className="text-sm sm:text-base text-muted-foreground">
            Connect your wallet to view transaction history
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="container py-6 px-4 sm:py-8 md:py-12">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-1 sm:mb-2">
              Transaction <span className="gradient-text">History</span>
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              {transactions.length} transactions • {pendingCount} pending
            </p>
          </div>
          
          {transactions.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={clearHistory}
              className="gap-2 self-start sm:self-auto"
            >
              <Trash2 className="w-4 h-4" />
              Clear History
            </Button>
          )}
        </div>

        {/* Filters */}
        <Tabs value={filter} onValueChange={(v) => setFilter(v as FilterType)} className="mb-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="all" className="text-xs sm:text-sm">All</TabsTrigger>
            <TabsTrigger value="swap" className="text-xs sm:text-sm">Swaps</TabsTrigger>
            <TabsTrigger value="liquidity" className="text-xs sm:text-sm">Liquidity</TabsTrigger>
            <TabsTrigger value="pending" className="text-xs sm:text-sm relative">
              Pending
              {pendingCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-500 rounded-full text-[10px] flex items-center justify-center text-black font-bold">
                  {pendingCount}
                </span>
              )}
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Transaction List */}
        <div className="glass-card p-4 sm:p-6">
          {filteredTransactions.length === 0 ? (
            <div className="text-center py-8 sm:py-12">
              <History className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 text-muted-foreground/50" />
              <p className="text-muted-foreground font-medium">No transactions found</p>
              <p className="text-sm text-muted-foreground/70 mt-1">
                {filter === 'all' 
                  ? 'Your transactions will appear here' 
                  : `No ${filter} transactions`}
              </p>
            </div>
          ) : (
            <div className="space-y-2 sm:space-y-3">
              {filteredTransactions.map((tx) => (
                <div
                  key={tx.hash}
                  className={cn(
                    'flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 sm:p-4 rounded-lg',
                    'bg-muted/30 hover:bg-muted/50 transition-colors'
                  )}
                >
                  {/* Left side */}
                  <div className="flex items-start sm:items-center gap-3">
                    <div className={cn(
                      'p-2 sm:p-2.5 rounded-lg shrink-0',
                      tx.status === 'confirmed' && 'bg-green-500/10 text-green-500',
                      tx.status === 'pending' && 'bg-yellow-500/10 text-yellow-500',
                      tx.status === 'failed' && 'bg-red-500/10 text-red-500'
                    )}>
                      {getIcon(tx.type)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground">
                          {getTypeLabel(tx.type)}
                        </span>
                        <div className="flex items-center gap-1">
                          {getStatusIcon(tx.status)}
                          <span className="text-xs text-muted-foreground">
                            {getStatusLabel(tx.status)}
                          </span>
                        </div>
                      </div>
                      <p className="font-medium text-sm mt-1 truncate">{tx.description}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formatTimeAgo(tx.timestamp)} • {formatTime(tx.timestamp)}
                      </p>
                    </div>
                  </div>

                  {/* Right side */}
                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <a
                      href={`${NEXUS_TESTNET.blockExplorer}/tx/${tx.hash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted hover:bg-muted/80 transition-colors text-sm touch-manipulation"
                    >
                      <span className="hidden sm:inline font-mono text-xs">
                        {tx.hash.slice(0, 8)}...
                      </span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
};

export default TransactionHistoryPage;