import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Shield, Plus, Settings, Pause, Play, RefreshCw, Droplets } from 'lucide-react';
import { toast } from 'sonner';
import { CONTRACTS, TOKEN_LIST } from '@/config/contracts';
import { FACTORY_ABI, PAIR_ABI } from '@/config/abis';
import { rpcProvider } from '@/lib/rpcProvider';
import { TokenLogo } from '@/components/TokenLogo';

interface LPToken {
  address: string;
  token0Symbol: string;
  token1Symbol: string;
  token0Address: string;
  token1Address: string;
}

interface AdminPanelProps {
  isPaused: boolean;
  onAddPool: (allocPoint: number, lpTokenAddress: string) => Promise<void>;
  onSetPoolAlloc: (pid: number, allocPoint: number) => Promise<void>;
  onPause: () => Promise<void>;
  onUnpause: () => Promise<void>;
}

export function AdminPanel({ isPaused, onAddPool, onSetPoolAlloc, onPause, onUnpause }: AdminPanelProps) {
  const [newPoolLP, setNewPoolLP] = useState('');
  const [newPoolAlloc, setNewPoolAlloc] = useState('100');
  const [editPid, setEditPid] = useState('');
  const [editAlloc, setEditAlloc] = useState('');
  const [loading, setLoading] = useState<string | null>(null);
  const [lpTokens, setLpTokens] = useState<LPToken[]>([]);
  const [loadingLPs, setLoadingLPs] = useState(true);

  // Fetch existing LP tokens from factory
  useEffect(() => {
    const fetchLPTokens = async () => {
      setLoadingLPs(true);
      try {
        const provider = rpcProvider.getProvider();
        if (!provider || !rpcProvider.isAvailable()) {
          setLoadingLPs(false);
          return;
        }

        const factory = new ethers.Contract(CONTRACTS.FACTORY, FACTORY_ABI, provider);
        const pairCount = await rpcProvider.call(
          () => factory.allPairsLength(),
          'admin_allPairsLength'
        );

        if (!pairCount) {
          setLoadingLPs(false);
          return;
        }

        const lps: LPToken[] = [];
        const count = Number(pairCount);

        for (let i = 0; i < count; i++) {
          try {
            const pairAddress = await rpcProvider.call(
              () => factory.allPairs(i),
              `admin_pair_${i}`
            );

            if (pairAddress) {
              const pair = new ethers.Contract(pairAddress, PAIR_ABI, provider);
              const [token0Addr, token1Addr] = await Promise.all([
                rpcProvider.call(() => pair.token0(), `admin_token0_${pairAddress}`),
                rpcProvider.call(() => pair.token1(), `admin_token1_${pairAddress}`),
              ]);

              const getSymbol = (addr: string) => {
                const token = TOKEN_LIST.find(t => t.address.toLowerCase() === addr?.toLowerCase());
                return token?.symbol || addr?.slice(0, 6) + '...';
              };

              lps.push({
                address: pairAddress,
                token0Symbol: getSymbol(token0Addr),
                token1Symbol: getSymbol(token1Addr),
                token0Address: token0Addr,
                token1Address: token1Addr,
              });
            }
          } catch {
            continue;
          }
        }

        setLpTokens(lps);
      } catch (error) {
        console.warn('Error fetching LP tokens:', error);
      } finally {
        setLoadingLPs(false);
      }
    };

    fetchLPTokens();
  }, []);

  const handleAddPool = async () => {
    if (!newPoolLP || !newPoolAlloc) {
      toast.error('Please select an LP token and set allocation points');
      return;
    }

    setLoading('add');
    try {
      toast.loading('Adding new pool...', { id: 'add-pool' });
      await onAddPool(parseInt(newPoolAlloc), newPoolLP);
      toast.success('Pool added successfully!', { id: 'add-pool' });
      setNewPoolLP('');
      setNewPoolAlloc('100');
    } catch (error: any) {
      console.error('Error adding pool:', error);
      const msg = error?.reason || error?.message || 'Failed to add pool';
      toast.error(msg.includes('user rejected') ? 'Transaction cancelled' : msg, { id: 'add-pool' });
    } finally {
      setLoading(null);
    }
  };

  const handleSetAlloc = async () => {
    if (!editPid || !editAlloc) {
      toast.error('Please fill all fields');
      return;
    }

    setLoading('set');
    try {
      toast.loading('Updating pool allocation...', { id: 'set-alloc' });
      await onSetPoolAlloc(parseInt(editPid), parseInt(editAlloc));
      toast.success('Pool allocation updated!', { id: 'set-alloc' });
      setEditPid('');
      setEditAlloc('');
    } catch (error: any) {
      console.error('Error setting allocation:', error);
      const msg = error?.reason || error?.message || 'Failed to update allocation';
      toast.error(msg.includes('user rejected') ? 'Transaction cancelled' : msg, { id: 'set-alloc' });
    } finally {
      setLoading(null);
    }
  };

  const handleTogglePause = async () => {
    setLoading('pause');
    try {
      if (isPaused) {
        toast.loading('Unpausing farming...', { id: 'pause' });
        await onUnpause();
        toast.success('Farming unpaused!', { id: 'pause' });
      } else {
        toast.loading('Pausing farming...', { id: 'pause' });
        await onPause();
        toast.success('Farming paused!', { id: 'pause' });
      }
    } catch (error: any) {
      console.error('Error toggling pause:', error);
      const msg = error?.reason || error?.message || 'Failed to toggle pause';
      toast.error(msg.includes('user rejected') ? 'Transaction cancelled' : msg, { id: 'pause' });
    } finally {
      setLoading(null);
    }
  };

  return (
    <Card className="border-amber-500/30 bg-gradient-to-br from-amber-500/5 to-transparent">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-amber-400">
            <Shield className="w-5 h-5" />
            Admin Panel
          </CardTitle>
          <Badge variant={isPaused ? "destructive" : "default"} className="text-xs">
            {isPaused ? 'Paused' : 'Active'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <Accordion type="single" collapsible className="w-full">
          {/* Add Pool */}
          <AccordionItem value="add-pool">
            <AccordionTrigger className="text-sm">
              <div className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Add New Pool
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-3 pt-2">
                <div>
                  <Label className="text-xs">Select LP Token</Label>
                  {loadingLPs ? (
                    <div className="flex items-center gap-2 mt-1 p-2 border rounded-md">
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span className="text-sm text-muted-foreground">Loading LP tokens...</span>
                    </div>
                  ) : lpTokens.length > 0 ? (
                    <Select value={newPoolLP} onValueChange={setNewPoolLP}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select an LP token" />
                      </SelectTrigger>
                      <SelectContent>
                        {lpTokens.map((lp) => (
                          <SelectItem key={lp.address} value={lp.address}>
                            <div className="flex items-center gap-2">
                              <div className="flex -space-x-1">
                                <TokenLogo symbol={lp.token0Symbol} size="sm" />
                                <TokenLogo symbol={lp.token1Symbol} size="sm" />
                              </div>
                              <span>{lp.token0Symbol}/{lp.token1Symbol}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="mt-1 p-2 border rounded-md text-sm text-muted-foreground">
                      <Droplets className="w-4 h-4 inline mr-2" />
                      No LP tokens found. Create liquidity pairs first.
                    </div>
                  )}
                  
                  {/* Manual input option */}
                  <div className="mt-2">
                    <Label className="text-xs text-muted-foreground">Or enter address manually:</Label>
                    <Input
                      placeholder="0x..."
                      value={newPoolLP}
                      onChange={(e) => setNewPoolLP(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Allocation Points</Label>
                  <Input
                    type="number"
                    placeholder="100"
                    value={newPoolAlloc}
                    onChange={(e) => setNewPoolAlloc(e.target.value)}
                    className="mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Higher points = more rewards for this pool
                  </p>
                </div>
                <Button 
                  onClick={handleAddPool} 
                  disabled={loading === 'add' || !newPoolLP}
                  className="w-full"
                  size="sm"
                >
                  {loading === 'add' ? (
                    <><RefreshCw className="w-4 h-4 animate-spin mr-2" />Adding...</>
                  ) : (
                    'Add Pool'
                  )}
                </Button>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Set Allocation */}
          <AccordionItem value="set-alloc">
            <AccordionTrigger className="text-sm">
              <div className="flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Set Pool Allocation
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-3 pt-2">
                <div>
                  <Label className="text-xs">Pool ID</Label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={editPid}
                    onChange={(e) => setEditPid(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs">New Allocation Points</Label>
                  <Input
                    type="number"
                    placeholder="100"
                    value={editAlloc}
                    onChange={(e) => setEditAlloc(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <Button 
                  onClick={handleSetAlloc} 
                  disabled={loading === 'set'}
                  className="w-full"
                  size="sm"
                >
                  {loading === 'set' ? (
                    <><RefreshCw className="w-4 h-4 animate-spin mr-2" />Updating...</>
                  ) : (
                    'Update Allocation'
                  )}
                </Button>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Pause/Unpause */}
          <AccordionItem value="pause">
            <AccordionTrigger className="text-sm">
              <div className="flex items-center gap-2">
                {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                {isPaused ? 'Unpause Farming' : 'Pause Farming'}
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="pt-2">
                <p className="text-xs text-muted-foreground mb-3">
                  {isPaused 
                    ? 'Unpause to allow deposits and harvests again.'
                    : 'Pausing will prevent new deposits and harvests.'}
                </p>
                <Button 
                  onClick={handleTogglePause} 
                  disabled={loading === 'pause'}
                  variant={isPaused ? "default" : "destructive"}
                  className="w-full"
                  size="sm"
                >
                  {loading === 'pause' ? (
                    <><RefreshCw className="w-4 h-4 animate-spin mr-2" />Processing...</>
                  ) : isPaused ? (
                    <><Play className="w-4 h-4 mr-2" />Unpause Farming</>
                  ) : (
                    <><Pause className="w-4 h-4 mr-2" />Pause Farming</>
                  )}
                </Button>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  );
}
