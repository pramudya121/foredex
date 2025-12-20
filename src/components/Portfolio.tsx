import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { useWeb3 } from '@/contexts/Web3Context';
import { CONTRACTS, TOKEN_LIST, NEXUS_TESTNET } from '@/config/contracts';
import { FACTORY_ABI, PAIR_ABI, ERC20_ABI } from '@/config/abis';
import { Wallet, Droplets, History, ExternalLink, RefreshCw } from 'lucide-react';
import { TokenLogo } from './TokenLogo';
import { TransactionHistory } from './TransactionHistory';
import { PortfolioValueChart } from './PortfolioValueChart';
import { rpcProvider } from '@/lib/rpcProvider';
import { Button } from './ui/button';

interface TokenBalance {
  symbol: string;
  name: string;
  balance: string;
  address: string;
  logoURI?: string;
}

interface LPPosition {
  pairAddress: string;
  token0Symbol: string;
  token1Symbol: string;
  token0Logo?: string;
  token1Logo?: string;
  lpBalance: string;
  share: string;
}

export function Portfolio() {
  const { address, isConnected, balance } = useWeb3();
  const [tokenBalances, setTokenBalances] = useState<TokenBalance[]>([]);
  const [lpPositions, setLpPositions] = useState<LPPosition[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchPortfolio = useCallback(async () => {
    if (!address) {
      setLoading(false);
      return;
    }

    const provider = rpcProvider.getProvider();
    if (!provider || !rpcProvider.isAvailable()) {
      setLoading(false);
      return;
    }

    try {
      // Fetch token balances sequentially with delays to avoid rate limiting
      const balances: TokenBalance[] = [];
      const tokens = TOKEN_LIST.filter(t => t.address !== '0x0000000000000000000000000000000000000000');
      
      for (const token of tokens) {
        try {
          const contract = new ethers.Contract(token.address, ERC20_ABI, provider);
          const bal = await rpcProvider.call(
            () => contract.balanceOf(address),
            `token_balance_${token.address}_${address}`
          );
          
          if (bal !== null && bal > 0n) {
            balances.push({
              symbol: token.symbol,
              name: token.name,
              balance: ethers.formatUnits(bal, token.decimals),
              address: token.address,
              logoURI: token.logoURI,
            });
          }
        } catch {
          // Silent fail for individual token
        }
      }
      
      setTokenBalances(balances);

      // Fetch LP positions with delays
      const factory = new ethers.Contract(CONTRACTS.FACTORY, FACTORY_ABI, provider);
      const pairCount = await rpcProvider.call(
        () => factory.allPairsLength(),
        'factory_pair_count'
      );
      
      if (!pairCount) {
        setLpPositions([]);
        return;
      }

      const positions: LPPosition[] = [];
      const maxPairs = Math.min(Number(pairCount), 10); // Limit to 10 pairs
      
      for (let i = 0; i < maxPairs; i++) {
        try {
          const pairAddress = await rpcProvider.call(
            () => factory.allPairs(i),
            `pair_address_${i}`
          );
          
          if (!pairAddress) continue;
          
          const pair = new ethers.Contract(pairAddress, PAIR_ABI, provider);
          const lpBalance = await rpcProvider.call(
            () => pair.balanceOf(address),
            `lp_balance_${pairAddress}_${address}`
          );
          
          if (lpBalance && lpBalance > 0n) {
            const [token0Addr, token1Addr, totalSupply] = await Promise.all([
              rpcProvider.call(() => pair.token0(), `pair_token0_${pairAddress}`),
              rpcProvider.call(() => pair.token1(), `pair_token1_${pairAddress}`),
              rpcProvider.call(() => pair.totalSupply(), `pair_supply_${pairAddress}`),
            ]);

            if (!token0Addr || !token1Addr || !totalSupply) continue;

            const getTokenInfo = (addr: string) => {
              const known = TOKEN_LIST.find(t => t.address.toLowerCase() === addr.toLowerCase());
              return { symbol: known?.symbol || '?', logoURI: known?.logoURI };
            };

            const token0Info = getTokenInfo(token0Addr);
            const token1Info = getTokenInfo(token1Addr);
            const share = (Number(lpBalance) / Number(totalSupply)) * 100;

            positions.push({
              pairAddress,
              token0Symbol: token0Info.symbol,
              token1Symbol: token1Info.symbol,
              token0Logo: token0Info.logoURI,
              token1Logo: token1Info.logoURI,
              lpBalance: ethers.formatEther(lpBalance),
              share: share.toFixed(2),
            });
          }
        } catch {
          // Silent fail for individual pair
        }
      }

      setLpPositions(positions);
    } catch (error) {
      console.error('Error fetching portfolio:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [address]);

  useEffect(() => {
    fetchPortfolio();
    
    // Refresh every 2 minutes
    const interval = setInterval(fetchPortfolio, 120000);
    return () => clearInterval(interval);
  }, [fetchPortfolio]);

  const handleRefresh = () => {
    setRefreshing(true);
    rpcProvider.clearCache();
    fetchPortfolio();
  };

  if (!isConnected) {
    return (
      <div className="glass-card p-12 text-center animate-fade-in">
        <Wallet className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
        <h3 className="text-xl font-semibold mb-2">Connect Your Wallet</h3>
        <p className="text-muted-foreground">
          Connect your wallet to view your portfolio
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="glass-card p-12 text-center animate-fade-in">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-muted-foreground">Loading portfolio...</p>
      </div>
    );
  }

  // Calculate total portfolio value
  const totalTokenValue = tokenBalances.reduce((acc, t) => acc + parseFloat(t.balance), 0);
  const totalLPValue = lpPositions.reduce((acc, p) => acc + parseFloat(p.lpBalance), 0);

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4">
        <div className="flex items-center gap-3">
          <h2 className="text-xl sm:text-2xl font-bold">Portfolio</h2>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={handleRefresh}
            disabled={refreshing}
            className="h-8 w-8"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
        <div className="text-xs sm:text-sm text-muted-foreground font-mono">
          {address?.slice(0, 6)}...{address?.slice(-4)}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
        <div className="glass-card p-3 sm:p-4">
          <p className="text-[10px] sm:text-xs text-muted-foreground">NEX Balance</p>
          <p className="text-base sm:text-xl font-bold">{parseFloat(balance).toFixed(4)}</p>
        </div>
        <div className="glass-card p-3 sm:p-4">
          <p className="text-[10px] sm:text-xs text-muted-foreground">Token Holdings</p>
          <p className="text-base sm:text-xl font-bold">{tokenBalances.length}</p>
        </div>
        <div className="glass-card p-3 sm:p-4">
          <p className="text-[10px] sm:text-xs text-muted-foreground">LP Positions</p>
          <p className="text-base sm:text-xl font-bold">{lpPositions.length}</p>
        </div>
        <div className="glass-card p-3 sm:p-4">
          <p className="text-[10px] sm:text-xs text-muted-foreground">Total LP Value</p>
          <p className="text-base sm:text-xl font-bold">{totalLPValue.toFixed(4)}</p>
        </div>
      </div>

      {/* Portfolio Value Charts */}
      <PortfolioValueChart />

      {/* Native Balance */}
      <div className="glass-card p-4 sm:p-6">
        <div className="flex items-center gap-3 sm:gap-4">
          <TokenLogo symbol="NEX" logoURI="/tokens/nex.jpg" size="lg" />
          <div>
            <p className="text-xs sm:text-sm text-muted-foreground">NEX Balance</p>
            <p className="text-lg sm:text-2xl font-bold">{parseFloat(balance).toFixed(4)} NEX</p>
          </div>
        </div>
      </div>

      {/* Token Holdings */}
      <div className="glass-card p-4 sm:p-6">
        <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 flex items-center gap-2">
          <Wallet className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
          Token Holdings
        </h3>
        
        {tokenBalances.length === 0 ? (
          <p className="text-center text-muted-foreground py-4 text-sm">No tokens found</p>
        ) : (
          <div className="space-y-2 sm:space-y-3">
            {tokenBalances.map((token) => (
              <div
                key={token.address}
                className="flex items-center justify-between p-2.5 sm:p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                  <TokenLogo symbol={token.symbol} logoURI={token.logoURI} size="md" />
                  <div className="min-w-0">
                    <p className="font-medium text-sm sm:text-base truncate">{token.symbol}</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground truncate">{token.name}</p>
                  </div>
                </div>
                <p className="font-mono text-sm sm:text-base shrink-0">{parseFloat(token.balance).toFixed(4)}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* LP Positions */}
      <div className="glass-card p-4 sm:p-6">
        <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 flex items-center gap-2">
          <Droplets className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
          Liquidity Positions
        </h3>
        
        {lpPositions.length === 0 ? (
          <p className="text-center text-muted-foreground py-4 text-sm">No liquidity positions</p>
        ) : (
          <div className="space-y-2 sm:space-y-3">
            {lpPositions.map((position) => (
              <div
                key={position.pairAddress}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4 p-3 sm:p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="flex -space-x-2">
                    <TokenLogo 
                      symbol={position.token0Symbol} 
                      logoURI={position.token0Logo} 
                      size="md"
                      className="border-2 border-background z-10" 
                    />
                    <TokenLogo 
                      symbol={position.token1Symbol} 
                      logoURI={position.token1Logo} 
                      size="md"
                      className="border-2 border-background" 
                    />
                  </div>
                  <div>
                    <p className="font-medium text-sm sm:text-base">{position.token0Symbol}/{position.token1Symbol}</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">Pool share: {position.share}%</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 sm:gap-4 self-end sm:self-auto">
                  <div className="text-right">
                    <p className="font-mono text-sm sm:text-base">{parseFloat(position.lpBalance).toFixed(6)}</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">LP Tokens</p>
                  </div>
                  <a
                    href={`${NEXUS_TESTNET.blockExplorer}/address/${position.pairAddress}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 sm:p-2 rounded-lg hover:bg-muted transition-colors touch-manipulation"
                  >
                    <ExternalLink className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Activity */}
      <div className="glass-card p-4 sm:p-6">
        <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 flex items-center gap-2">
          <History className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
          Recent Activity
        </h3>
        <TransactionHistory />
      </div>
    </div>
  );
}
