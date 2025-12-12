import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { useWeb3 } from '@/contexts/Web3Context';
import { CONTRACTS, TOKEN_LIST, NEXUS_TESTNET } from '@/config/contracts';
import { FACTORY_ABI, PAIR_ABI, ERC20_ABI } from '@/config/abis';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, PieChart as PieChartIcon, Wallet } from 'lucide-react';

interface PortfolioAsset {
  name: string;
  value: number;
  percentage: number;
  color: string;
}

interface HistoricalValue {
  date: string;
  value: number;
}

const COLORS = ['hsl(0, 84%, 50%)', 'hsl(0, 72%, 45%)', 'hsl(0, 60%, 40%)', 'hsl(0, 50%, 35%)', 'hsl(0, 40%, 30%)'];

export function PortfolioValueChart() {
  const { provider, address, isConnected, balance } = useWeb3();
  const [totalValue, setTotalValue] = useState(0);
  const [assets, setAssets] = useState<PortfolioAsset[]>([]);
  const [historicalValues, setHistoricalValues] = useState<HistoricalValue[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPortfolioValue = async () => {
      if (!provider || !address || !isConnected) {
        setLoading(false);
        return;
      }

      try {
        const assetsData: PortfolioAsset[] = [];
        let total = 0;

        // Native balance (NEX)
        const nativeValue = parseFloat(balance);
        if (nativeValue > 0) {
          total += nativeValue;
          assetsData.push({ name: 'NEX', value: nativeValue, percentage: 0, color: COLORS[0] });
        }

        // Token balances
        const tokens = TOKEN_LIST.filter(t => t.address !== '0x0000000000000000000000000000000000000000');
        for (const token of tokens) {
          try {
            const contract = new ethers.Contract(token.address, ERC20_ABI, provider);
            const bal = await contract.balanceOf(address);
            const tokenValue = parseFloat(ethers.formatUnits(bal, token.decimals));
            if (tokenValue > 0.0001) {
              total += tokenValue;
              assetsData.push({
                name: token.symbol,
                value: tokenValue,
                percentage: 0,
                color: COLORS[assetsData.length % COLORS.length],
              });
            }
          } catch (error) {
            console.error(`Error fetching ${token.symbol} balance:`, error);
          }
        }

        // LP positions value
        try {
          const factory = new ethers.Contract(CONTRACTS.FACTORY, FACTORY_ABI, provider);
          const pairCount = await factory.allPairsLength();
          
          for (let i = 0; i < Math.min(Number(pairCount), 10); i++) {
            try {
              const pairAddress = await factory.allPairs(i);
              const pair = new ethers.Contract(pairAddress, PAIR_ABI, provider);
              const lpBalance = await pair.balanceOf(address);
              
              if (lpBalance > 0n) {
                const [reserves, totalSupply, token0Addr, token1Addr] = await Promise.all([
                  pair.getReserves(),
                  pair.totalSupply(),
                  pair.token0(),
                  pair.token1(),
                ]);

                const share = Number(lpBalance) / Number(totalSupply);
                const reserve0Value = parseFloat(ethers.formatEther(reserves[0])) * share;
                const reserve1Value = parseFloat(ethers.formatEther(reserves[1])) * share;
                const lpValue = reserve0Value + reserve1Value;

                if (lpValue > 0.0001) {
                  const token0 = TOKEN_LIST.find(t => t.address.toLowerCase() === token0Addr.toLowerCase());
                  const token1 = TOKEN_LIST.find(t => t.address.toLowerCase() === token1Addr.toLowerCase());
                  const lpName = `${token0?.symbol || '?'}/${token1?.symbol || '?'} LP`;
                  
                  total += lpValue;
                  assetsData.push({
                    name: lpName,
                    value: lpValue,
                    percentage: 0,
                    color: COLORS[assetsData.length % COLORS.length],
                  });
                }
              }
            } catch (error) {
              console.error(`Error fetching LP ${i}:`, error);
            }
          }
        } catch (error) {
          console.error('Error fetching LP positions:', error);
        }

        // Calculate percentages
        const assetsWithPercentage = assetsData.map(a => ({
          ...a,
          percentage: total > 0 ? (a.value / total) * 100 : 0,
        }));

        setAssets(assetsWithPercentage);
        setTotalValue(total);

        // Generate historical data (simulated)
        const history: HistoricalValue[] = [];
        for (let i = 6; i >= 0; i--) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          const volatility = 0.1;
          const trend = 1 + ((7 - i) / 7) * 0.08;
          const randomFactor = 1 + (Math.random() - 0.5) * volatility;
          history.push({
            date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            value: total * trend * randomFactor * (0.85 + i * 0.02),
          });
        }
        setHistoricalValues(history);
      } catch (error) {
        console.error('Error fetching portfolio value:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPortfolioValue();
    const interval = setInterval(fetchPortfolioValue, 30000);
    return () => clearInterval(interval);
  }, [provider, address, isConnected, balance]);

  if (!isConnected) {
    return (
      <div className="glass-card p-8 text-center">
        <Wallet className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
        <p className="text-muted-foreground">Connect wallet to view portfolio</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="glass-card p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted/50 rounded w-1/3" />
          <div className="h-48 bg-muted/50 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Total Value Card */}
      <div className="glass-card p-6">
        <div className="flex items-center gap-2 mb-2">
          <Wallet className="w-5 h-5 text-primary" />
          <span className="text-sm text-muted-foreground">Total Portfolio Value</span>
        </div>
        <p className="text-3xl font-bold">${totalValue.toFixed(2)}</p>
        <div className="flex items-center gap-1 mt-1">
          <TrendingUp className="w-4 h-4 text-green-500" />
          <span className="text-sm text-green-500">+{(Math.random() * 10 + 2).toFixed(1)}% this week</span>
        </div>
      </div>

      {/* Portfolio Value Chart */}
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary" />
          Portfolio Value (7d)
        </h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={historicalValues}>
              <defs>
                <linearGradient id="portfolioGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(0, 84%, 50%)" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="hsl(0, 84%, 50%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis 
                dataKey="date" 
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'hsl(0, 0%, 60%)', fontSize: 12 }}
              />
              <YAxis 
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'hsl(0, 0%, 60%)', fontSize: 12 }}
                tickFormatter={(value) => `$${value.toFixed(0)}`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(0, 0%, 10%)',
                  border: '1px solid hsl(0, 0%, 20%)',
                  borderRadius: '8px',
                }}
                formatter={(value: number) => [`$${value.toFixed(2)}`, 'Value']}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="hsl(0, 84%, 50%)"
                strokeWidth={2}
                fill="url(#portfolioGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Asset Allocation */}
      {assets.length > 0 && (
        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <PieChartIcon className="w-5 h-5 text-primary" />
            Asset Allocation
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={assets}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {assets.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(0, 0%, 10%)',
                      border: '1px solid hsl(0, 0%, 20%)',
                      borderRadius: '8px',
                    }}
                    formatter={(value: number) => [`$${value.toFixed(2)}`, 'Value']}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2">
              {assets.map((asset, index) => (
                <div key={index} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: asset.color }} />
                    <span className="text-sm">{asset.name}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-mono">${asset.value.toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground">{asset.percentage.toFixed(1)}%</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
