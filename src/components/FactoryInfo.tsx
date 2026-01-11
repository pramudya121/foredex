import { useState, useEffect, useCallback, useRef } from 'react';
import { ethers } from 'ethers';
import { CONTRACTS, NEXUS_TESTNET } from '@/config/contracts';
import { FACTORY_ABI } from '@/config/abis';
import { rpcProvider } from '@/lib/rpcProvider';
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
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';

interface FactoryData {
  feeTo: string;
  feeToSetter: string;
  initCodeHash: string;
}

// Cache for factory data
let factoryCache: { data: FactoryData | null; timestamp: number } | null = null;
const CACHE_TTL = 120000; // 2 minutes

export function FactoryInfo() {
  const [data, setData] = useState<FactoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const mountedRef = useRef(true);
  const retryCountRef = useRef(0);

  const fetchFactoryInfo = useCallback(async (forceRefresh = false) => {
    // Check cache first
    if (!forceRefresh && factoryCache && Date.now() - factoryCache.timestamp < CACHE_TTL) {
      setData(factoryCache.data);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const provider = rpcProvider.getProvider();
        
        if (!provider) {
          // Wait for provider to initialize
          await new Promise(resolve => setTimeout(resolve, 1000));
          continue;
        }

        const factory = new ethers.Contract(CONTRACTS.FACTORY, FACTORY_ABI, provider);

        // Fetch with timeout and retry logic
        const fetchWithTimeout = async <T,>(
          contractCall: () => Promise<T>,
          timeout = 10000
        ): Promise<T> => {
          return Promise.race([
            contractCall(),
            new Promise<T>((_, reject) =>
              setTimeout(() => reject(new Error('Timeout')), timeout)
            ),
          ]);
        };

        // Fetch all data with individual error handling
        const [feeTo, feeToSetter, initCodeHash] = await Promise.all([
          fetchWithTimeout(() => factory.feeTo()).catch(() => null),
          fetchWithTimeout(() => factory.feeToSetter()).catch(() => null),
          fetchWithTimeout(() => factory.INIT_CODE_PAIR_HASH()).catch(() => null),
        ]);

        // If all failed, throw
        if (!feeTo && !feeToSetter && !initCodeHash) {
          throw new Error('Failed to fetch any factory data');
        }

        const factoryData: FactoryData = {
          feeTo: feeTo || ethers.ZeroAddress,
          feeToSetter: feeToSetter || ethers.ZeroAddress,
          initCodeHash: initCodeHash || '0x',
        };

        // Update cache
        factoryCache = { data: factoryData, timestamp: Date.now() };

        if (mountedRef.current) {
          setData(factoryData);
          setError(null);
          retryCountRef.current = 0;
        }
        return;
      } catch (err) {
        lastError = err instanceof Error ? err : new Error('Unknown error');
        console.warn(`Factory fetch attempt ${attempt + 1} failed:`, lastError.message);
        
        // Wait before retry
        if (attempt < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
        }
      }
    }

    // All retries failed
    if (mountedRef.current) {
      // Use cached data if available
      if (factoryCache?.data) {
        setData(factoryCache.data);
        setError('Using cached data');
      } else {
        setError('Failed to load factory info');
      }
      retryCountRef.current++;
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    fetchFactoryInfo();

    // Auto-retry every 30 seconds if there was an error
    const retryInterval = setInterval(() => {
      if (retryCountRef.current > 0 && retryCountRef.current < 3) {
        fetchFactoryInfo();
      }
    }, 30000);

    return () => {
      mountedRef.current = false;
      clearInterval(retryInterval);
    };
  }, [fetchFactoryInfo]);

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
            onClick={() => fetchFactoryInfo(true)}
            disabled={loading}
            className="h-8 w-8"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Error State */}
        {error && !data && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm">{error}</span>
            <Button
              variant="ghost"
              size="sm"
              className="ml-auto h-7"
              onClick={() => fetchFactoryInfo(true)}
            >
              Retry
            </Button>
          </div>
        )}

        {/* Fee Recipient */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <User className="w-4 h-4" />
            Fee Recipient (feeTo)
          </div>
          {loading ? (
            <Skeleton className="h-9 w-full" />
          ) : data ? (
            <div className="flex items-center gap-2 bg-muted/30 rounded-lg px-3 py-2">
              <code className="text-sm flex-1 font-mono">
                {truncateAddress(data.feeTo)}
              </code>
              {!isZeroAddress(data.feeTo) && (
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
              {isZeroAddress(data.feeTo) && (
                <Badge variant="secondary" className="text-xs">No Fee</Badge>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2 bg-muted/30 rounded-lg px-3 py-2">
              <code className="text-sm flex-1 font-mono text-muted-foreground">
                Waiting for connection...
              </code>
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
          ) : data ? (
            <div className="flex items-center gap-2 bg-muted/30 rounded-lg px-3 py-2">
              <code className="text-sm flex-1 font-mono">
                {truncateAddress(data.feeToSetter)}
              </code>
              {!isZeroAddress(data.feeToSetter) && (
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
          ) : (
            <div className="flex items-center gap-2 bg-muted/30 rounded-lg px-3 py-2">
              <code className="text-sm flex-1 font-mono text-muted-foreground">
                Waiting for connection...
              </code>
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
          ) : data ? (
            <div className="flex items-center gap-2 bg-muted/30 rounded-lg px-3 py-2">
              <code className="text-xs flex-1 font-mono break-all">
                {data.initCodeHash.length > 40 
                  ? `${data.initCodeHash.slice(0, 20)}...${data.initCodeHash.slice(-20)}`
                  : data.initCodeHash}
              </code>
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
            </div>
          ) : (
            <div className="flex items-center gap-2 bg-muted/30 rounded-lg px-3 py-2">
              <code className="text-xs flex-1 font-mono text-muted-foreground">
                Waiting for connection...
              </code>
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
