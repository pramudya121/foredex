import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { useWeb3 } from '@/contexts/Web3Context';
import { CONTRACTS, TOKEN_LIST, NEXUS_TESTNET } from '@/config/contracts';
import { FACTORY_ABI, PAIR_ABI, ERC20_ABI } from '@/config/abis';
import { Wallet, Droplets, History, ExternalLink } from 'lucide-react';
import { TokenLogo } from './TokenLogo';
import { TransactionHistory } from './TransactionHistory';
import { PortfolioValueChart } from './PortfolioValueChart';

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
  const { provider, address, isConnected, balance } = useWeb3();
  const [tokenBalances, setTokenBalances] = useState<TokenBalance[]>([]);
  const [lpPositions, setLpPositions] = useState<LPPosition[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPortfolio = async () => {
      if (!provider || !address) {
        setLoading(false);
        return;
      }

      try {
        // Fetch token balances
        const balancePromises = TOKEN_LIST.filter(t => t.address !== '0x0000000000000000000000000000000000000000').map(async (token): Promise<TokenBalance | null> => {
          try {
            const contract = new ethers.Contract(token.address, ERC20_ABI, provider);
            const bal = await contract.balanceOf(address);
            return {
              symbol: token.symbol,
              name: token.name,
              balance: ethers.formatUnits(bal, token.decimals),
              address: token.address,
              logoURI: token.logoURI,
            };
          } catch {
            return null;
          }
        });

        const balanceResults = await Promise.all(balancePromises);
        const balances = balanceResults.filter((b): b is TokenBalance => b !== null && parseFloat(b.balance) > 0);
        setTokenBalances(balances);

        // Fetch LP positions
        const factory = new ethers.Contract(CONTRACTS.FACTORY, FACTORY_ABI, provider);
        const pairCount = await factory.allPairsLength();
        
        const lpPromises = [];
        for (let i = 0; i < Math.min(Number(pairCount), 20); i++) {
          lpPromises.push(
            (async () => {
              try {
                const pairAddress = await factory.allPairs(i);
                const pair = new ethers.Contract(pairAddress, PAIR_ABI, provider);
                const lpBalance = await pair.balanceOf(address);
                
                if (lpBalance > 0n) {
                  const [token0Addr, token1Addr, totalSupply] = await Promise.all([
                    pair.token0(),
                    pair.token1(),
                    pair.totalSupply(),
                  ]);

                  const getSymbol = async (addr: string) => {
                    const known = TOKEN_LIST.find(t => t.address.toLowerCase() === addr.toLowerCase());
                    if (known) return { symbol: known.symbol, logoURI: known.logoURI };
                    try {
                      const token = new ethers.Contract(addr, ERC20_ABI, provider);
                      return { symbol: await token.symbol(), logoURI: undefined };
                    } catch {
                      return { symbol: 'UNKNOWN', logoURI: undefined };
                    }
                  };

                  const [token0Info, token1Info] = await Promise.all([
                    getSymbol(token0Addr),
                    getSymbol(token1Addr),
                  ]);

                  const share = (Number(lpBalance) / Number(totalSupply)) * 100;

                  return {
                    pairAddress,
                    token0Symbol: token0Info.symbol,
                    token1Symbol: token1Info.symbol,
                    token0Logo: token0Info.logoURI,
                    token1Logo: token1Info.logoURI,
                    lpBalance: ethers.formatEther(lpBalance),
                    share: share.toFixed(2),
                  };
                }
                return null;
              } catch {
                return null;
              }
            })()
          );
        }

        const positions = (await Promise.all(lpPromises)).filter((p): p is LPPosition => p !== null);
        setLpPositions(positions);
      } catch (error) {
        console.error('Error fetching portfolio:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPortfolio();
  }, [provider, address]);

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

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Portfolio</h2>
        <div className="text-sm text-muted-foreground">
          {address?.slice(0, 6)}...{address?.slice(-4)}
        </div>
      </div>

      {/* Portfolio Value Charts */}
      <PortfolioValueChart />

      {/* Native Balance */}
      <div className="glass-card p-6">
        <div className="flex items-center gap-4">
          <TokenLogo symbol="NEX" logoURI="/tokens/nex.jpg" size="lg" />
          <div>
            <p className="text-sm text-muted-foreground">NEX Balance</p>
            <p className="text-2xl font-bold">{parseFloat(balance).toFixed(4)} NEX</p>
          </div>
        </div>
      </div>

      {/* Token Holdings */}
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Wallet className="w-5 h-5 text-primary" />
          Token Holdings
        </h3>
        
        {tokenBalances.length === 0 ? (
          <p className="text-center text-muted-foreground py-4">No tokens found</p>
        ) : (
          <div className="space-y-3">
            {tokenBalances.map((token) => (
              <div
                key={token.address}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <TokenLogo symbol={token.symbol} logoURI={token.logoURI} size="md" />
                  <div>
                    <p className="font-medium">{token.symbol}</p>
                    <p className="text-xs text-muted-foreground">{token.name}</p>
                  </div>
                </div>
                <p className="font-mono">{parseFloat(token.balance).toFixed(4)}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* LP Positions */}
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Droplets className="w-5 h-5 text-primary" />
          Liquidity Positions
        </h3>
        
        {lpPositions.length === 0 ? (
          <p className="text-center text-muted-foreground py-4">No liquidity positions</p>
        ) : (
          <div className="space-y-3">
            {lpPositions.map((position) => (
              <div
                key={position.pairAddress}
                className="flex items-center justify-between p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
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
                    <p className="font-medium">{position.token0Symbol}/{position.token1Symbol}</p>
                    <p className="text-xs text-muted-foreground">Pool share: {position.share}%</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="font-mono">{parseFloat(position.lpBalance).toFixed(6)}</p>
                    <p className="text-xs text-muted-foreground">LP Tokens</p>
                  </div>
                  <a
                    href={`${NEXUS_TESTNET.blockExplorer}/address/${position.pairAddress}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-lg hover:bg-muted transition-colors"
                  >
                    <ExternalLink className="w-4 h-4 text-muted-foreground" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Activity */}
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <History className="w-5 h-5 text-primary" />
          Recent Activity
        </h3>
        <TransactionHistory />
      </div>
    </div>
  );
}
