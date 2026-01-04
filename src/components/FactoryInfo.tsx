import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { CONTRACTS, NEXUS_TESTNET } from '@/config/contracts';
import { FACTORY_ABI } from '@/config/abis';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import {
  Factory,
  User,
  Hash,
  Copy,
  Check,
  ExternalLink,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';

interface FactoryData {
  feeTo: string;
  feeToSetter: string;
  initCodeHash: string;
}

export function FactoryInfo() {
  const [data, setData] = useState<FactoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const fetchFactoryInfo = async () => {
    setLoading(true);
    try {
      const provider = new ethers.JsonRpcProvider(NEXUS_TESTNET.rpcUrl);
      const factory = new ethers.Contract(CONTRACTS.FACTORY, FACTORY_ABI, provider);

      const [feeTo, feeToSetter, initCodeHash] = await Promise.all([
        factory.feeTo(),
        factory.feeToSetter(),
        factory.INIT_CODE_PAIR_HASH(),
      ]);

      setData({
        feeTo,
        feeToSetter,
        initCodeHash,
      });
    } catch (error) {
      console.error('Error fetching factory info:', error);
      toast.error('Failed to fetch factory info');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFactoryInfo();
  }, []);

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopiedField(null), 2000);
  };

  const truncateAddress = (addr: string) => {
    if (addr === ethers.ZeroAddress) return 'Not Set (0x0...)';
    return `${addr.slice(0, 10)}...${addr.slice(-8)}`;
  };

  const isZeroAddress = (addr: string) => addr === ethers.ZeroAddress;

  return (
    <Card className="border-border/40 bg-gradient-to-br from-card via-card to-primary/5">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Factory className="w-5 h-5 text-primary" />
            Factory Contract Info
          </CardTitle>
          <Button
            variant="ghost"
            size="icon"
            onClick={fetchFactoryInfo}
            disabled={loading}
            className="h-8 w-8"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Fee Recipient */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <User className="w-4 h-4" />
            Fee Recipient (feeTo)
          </div>
          {loading ? (
            <Skeleton className="h-9 w-full" />
          ) : (
            <div className="flex items-center gap-2 bg-muted/30 rounded-lg px-3 py-2">
              <code className="text-sm flex-1 font-mono">
                {data ? truncateAddress(data.feeTo) : 'Error'}
              </code>
              {data && !isZeroAddress(data.feeTo) && (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => copyToClipboard(data.feeTo, 'feeTo')}
                  >
                    {copiedField === 'feeTo' ? (
                      <Check className="w-3.5 h-3.5 text-green-500" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </Button>
                  <a
                    href={`${NEXUS_TESTNET.blockExplorer}/address/${data.feeTo}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button variant="ghost" size="icon" className="h-7 w-7">
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Button>
                  </a>
                </>
              )}
              {data && isZeroAddress(data.feeTo) && (
                <Badge variant="secondary" className="text-xs">No Fee</Badge>
              )}
            </div>
          )}
        </div>

        {/* Fee Setter */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <User className="w-4 h-4" />
            Fee Setter (feeToSetter)
          </div>
          {loading ? (
            <Skeleton className="h-9 w-full" />
          ) : (
            <div className="flex items-center gap-2 bg-muted/30 rounded-lg px-3 py-2">
              <code className="text-sm flex-1 font-mono">
                {data ? truncateAddress(data.feeToSetter) : 'Error'}
              </code>
              {data && !isZeroAddress(data.feeToSetter) && (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => copyToClipboard(data.feeToSetter, 'feeToSetter')}
                  >
                    {copiedField === 'feeToSetter' ? (
                      <Check className="w-3.5 h-3.5 text-green-500" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </Button>
                  <a
                    href={`${NEXUS_TESTNET.blockExplorer}/address/${data.feeToSetter}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button variant="ghost" size="icon" className="h-7 w-7">
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Button>
                  </a>
                </>
              )}
            </div>
          )}
        </div>

        {/* Init Code Hash */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Hash className="w-4 h-4" />
            Init Code Pair Hash
          </div>
          {loading ? (
            <Skeleton className="h-9 w-full" />
          ) : (
            <div className="flex items-center gap-2 bg-muted/30 rounded-lg px-3 py-2">
              <code className="text-xs flex-1 font-mono break-all">
                {data ? `${data.initCodeHash.slice(0, 20)}...${data.initCodeHash.slice(-20)}` : 'Error'}
              </code>
              {data && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0"
                  onClick={() => copyToClipboard(data.initCodeHash, 'initCodeHash')}
                >
                  {copiedField === 'initCodeHash' ? (
                    <Check className="w-3.5 h-3.5 text-green-500" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </Button>
              )}
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            Used for computing pair addresses off-chain
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
