import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { ethers } from 'ethers';
import { NEXUS_TESTNET } from '@/config/contracts';
import { toast } from 'sonner';
import { rpcProvider } from '@/lib/rpcProvider';

// WalletConnect types
type WalletConnectProvider = any;

interface Web3ContextType {
  provider: ethers.BrowserProvider | null;
  signer: ethers.Signer | null;
  address: string | null;
  chainId: number | null;
  isConnected: boolean;
  isConnecting: boolean;
  balance: string;
  walletType: 'injected' | 'walletconnect' | null;
  connect: (walletType?: string) => Promise<void>;
  connectWalletConnect: () => Promise<string | null>; // Returns QR URI
  disconnect: () => void;
  switchToNexus: () => Promise<void>;
  refreshBalance: () => Promise<void>;
  wcQrUri: string | null;
  isWcConnecting: boolean;
  cancelWcConnection: () => void;
}

const Web3Context = createContext<Web3ContextType | undefined>(undefined);

export function Web3Provider({ children }: { children: React.ReactNode }) {
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [signer, setSigner] = useState<ethers.Signer | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [balance, setBalance] = useState('0');
  const [walletType, setWalletType] = useState<'injected' | 'walletconnect' | null>(null);
  const [wcQrUri, setWcQrUri] = useState<string | null>(null);
  const [isWcConnecting, setIsWcConnecting] = useState(false);
  const balanceFetchRef = useRef<NodeJS.Timeout | null>(null);
  const wcProviderRef = useRef<WalletConnectProvider | null>(null);

  const isConnected = !!address;

  const getProvider = useCallback((walletTypeParam?: string) => {
    const ethereum = (window as any).ethereum;
    
    if (!ethereum) {
      throw new Error('No wallet detected');
    }

    // Handle multiple wallet providers
    if (walletTypeParam === 'rabby' && ((window as any).ethereum?.isRabby || (window as any).rabby)) {
      return (window as any).ethereum?.isRabby ? (window as any).ethereum : (window as any).rabby;
    }
    
    // Default to MetaMask or injected provider
    return ethereum;
  }, []);

  const switchToNexus = useCallback(async () => {
    const ethereum = getProvider();
    
    try {
      await ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: NEXUS_TESTNET.chainIdHex }],
      });
    } catch (switchError: any) {
      // Chain not added, add it
      if (switchError.code === 4902) {
        await ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: NEXUS_TESTNET.chainIdHex,
            chainName: NEXUS_TESTNET.name,
            rpcUrls: [NEXUS_TESTNET.rpcUrl],
            blockExplorerUrls: [NEXUS_TESTNET.blockExplorer],
            nativeCurrency: NEXUS_TESTNET.nativeCurrency,
          }],
        });
      } else {
        throw switchError;
      }
    }
  }, [getProvider]);

  // Separate balance fetch with rate limit protection
  const refreshBalance = useCallback(async () => {
    if (!address) return;
    
    try {
      const rpc = rpcProvider.getProvider();
      if (!rpc || !rpcProvider.isAvailable()) {
        return; // Silently skip if RPC not available
      }

      const bal = await rpcProvider.call(
        () => rpc.getBalance(address),
        `user_balance_${address}`
      );
      
      if (bal !== null) {
        setBalance(ethers.formatEther(bal));
      }
    } catch {
      // Silently fail - balance will update later
    }
  }, [address]);

  // Initialize WalletConnect provider
  const initWalletConnect = useCallback(async () => {
    if (wcProviderRef.current) return wcProviderRef.current;

    try {
      const { default: EthereumProvider } = await import('@walletconnect/ethereum-provider');
      const { WALLETCONNECT_PROJECT_ID, WALLETCONNECT_METADATA } = await import('@/config/walletconnect');
      
      const wcProvider = await EthereumProvider.init({
        projectId: WALLETCONNECT_PROJECT_ID,
        chains: [NEXUS_TESTNET.chainId],
        optionalChains: [1, 137, 56],
        showQrModal: false,
        metadata: WALLETCONNECT_METADATA,
        rpcMap: {
          [NEXUS_TESTNET.chainId]: NEXUS_TESTNET.rpcUrl,
        },
      });

      wcProviderRef.current = wcProvider;
      return wcProvider;
    } catch (error) {
      console.error('[WalletConnect] Init failed:', error);
      return null;
    }
  }, []);

  // Connect via WalletConnect - returns QR URI
  const connectWalletConnect = useCallback(async (): Promise<string | null> => {
    setIsWcConnecting(true);
    setWcQrUri(null);

    try {
      const wcProvider = await initWalletConnect();
      if (!wcProvider) {
        throw new Error('Failed to initialize WalletConnect');
      }

      // If already connected, use existing session
      if (wcProvider.session) {
        const browserProvider = new ethers.BrowserProvider(wcProvider);
        const browserSigner = await browserProvider.getSigner();
        const userAddress = await browserSigner.getAddress();

        setProvider(browserProvider);
        setSigner(browserSigner);
        setAddress(userAddress);
        setChainId(NEXUS_TESTNET.chainId);
        setWalletType('walletconnect');
        setIsWcConnecting(false);
        
        toast.success('Wallet connected via WalletConnect!');
        
        // Fetch balance
        setTimeout(() => refreshBalance(), 2000);
        
        return null;
      }

      // Set up QR URI listener
      return new Promise<string | null>((resolve) => {
        let uriResolved = false;

        const onDisplayUri = (uri: string) => {
          console.log('[WalletConnect] QR URI received');
          setWcQrUri(uri);
          if (!uriResolved) {
            uriResolved = true;
            resolve(uri);
          }
        };

        const onConnect = async () => {
          console.log('[WalletConnect] Connected');
          wcProvider.removeListener('display_uri', onDisplayUri);
          
          try {
            const browserProvider = new ethers.BrowserProvider(wcProvider);
            const browserSigner = await browserProvider.getSigner();
            const userAddress = await browserSigner.getAddress();

            setProvider(browserProvider);
            setSigner(browserSigner);
            setAddress(userAddress);
            setChainId(NEXUS_TESTNET.chainId);
            setWalletType('walletconnect');
            setWcQrUri(null);
            setIsWcConnecting(false);
            
            toast.success('Wallet connected via WalletConnect!');
            
            setTimeout(() => refreshBalance(), 2000);
          } catch (error) {
            console.error('[WalletConnect] Post-connect error:', error);
            setIsWcConnecting(false);
          }
        };

        const onDisconnect = () => {
          console.log('[WalletConnect] Disconnected during connection');
          wcProvider.removeListener('display_uri', onDisplayUri);
          wcProvider.removeListener('connect', onConnect);
          setIsWcConnecting(false);
          setWcQrUri(null);
        };

        wcProvider.on('display_uri', onDisplayUri);
        wcProvider.once('connect', onConnect);
        wcProvider.once('disconnect', onDisconnect);

        // Start connection
        wcProvider.connect().catch((error: any) => {
          console.error('[WalletConnect] Connect error:', error);
          setIsWcConnecting(false);
          setWcQrUri(null);
          if (!uriResolved) {
            resolve(null);
          }
        });
      });
    } catch (error: any) {
      console.error('[WalletConnect] Error:', error);
      setIsWcConnecting(false);
      setWcQrUri(null);
      toast.error('WalletConnect connection failed');
      return null;
    }
  }, [initWalletConnect, refreshBalance]);

  // Cancel WalletConnect connection
  const cancelWcConnection = useCallback(() => {
    setIsWcConnecting(false);
    setWcQrUri(null);
  }, []);

  // Connect via injected wallet
  const connect = useCallback(async (walletTypeParam?: string) => {
    // Handle WalletConnect separately
    if (walletTypeParam === 'walletconnect') {
      connectWalletConnect();
      return;
    }

    setIsConnecting(true);
    
    try {
      const ethereum = getProvider(walletTypeParam);
      const browserProvider = new ethers.BrowserProvider(ethereum);
      
      // Request accounts
      const accounts = await browserProvider.send('eth_requestAccounts', []);
      
      if (!accounts.length) {
        throw new Error('No accounts found');
      }

      // Get network
      const network = await browserProvider.getNetwork();
      const currentChainId = Number(network.chainId);
      
      // Switch to Nexus if needed
      if (currentChainId !== NEXUS_TESTNET.chainId) {
        await switchToNexus();
        // Reinitialize after switch
        const newNetwork = await browserProvider.getNetwork();
        setChainId(Number(newNetwork.chainId));
      } else {
        setChainId(currentChainId);
      }

      const browserSigner = await browserProvider.getSigner();
      const userAddress = await browserSigner.getAddress();
      
      // Set state immediately without balance
      setProvider(browserProvider);
      setSigner(browserSigner);
      setAddress(userAddress);
      setBalance('0');
      setWalletType('injected');
      
      toast.success('Wallet connected!');
      
      // Fetch balance after a delay
      if (balanceFetchRef.current) {
        clearTimeout(balanceFetchRef.current);
      }
      balanceFetchRef.current = setTimeout(async () => {
        try {
          const rpc = rpcProvider.getProvider();
          if (rpc && rpcProvider.isAvailable()) {
            const bal = await rpcProvider.call(
              () => rpc.getBalance(userAddress),
              `user_balance_${userAddress}`
            );
            if (bal !== null) {
              setBalance(ethers.formatEther(bal));
            }
          }
        } catch {
          // Silent fail
        }
      }, 2000);
      
    } catch (error: any) {
      const errorMsg = rpcProvider.parseError(error, true);
      if (errorMsg) {
        toast.error(errorMsg);
      }
    } finally {
      setIsConnecting(false);
    }
  }, [getProvider, switchToNexus, connectWalletConnect]);

  const disconnect = useCallback(async () => {
    if (balanceFetchRef.current) {
      clearTimeout(balanceFetchRef.current);
    }

    // Disconnect WalletConnect if active
    if (walletType === 'walletconnect' && wcProviderRef.current?.session) {
      try {
        await wcProviderRef.current.disconnect();
      } catch (error) {
        console.error('[WalletConnect] Disconnect error:', error);
      }
    }

    setProvider(null);
    setSigner(null);
    setAddress(null);
    setChainId(null);
    setBalance('0');
    setWalletType(null);
    setWcQrUri(null);
    setIsWcConnecting(false);
    toast.info('Wallet disconnected');
  }, [walletType]);

  // Listen for account/chain changes (injected wallets only)
  useEffect(() => {
    const ethereum = (window as any).ethereum;
    if (!ethereum || walletType === 'walletconnect') return;

    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) {
        disconnect();
      } else if (accounts[0] !== address) {
        connect();
      }
    };

    const handleChainChanged = () => {
      window.location.reload();
    };

    ethereum.on('accountsChanged', handleAccountsChanged);
    ethereum.on('chainChanged', handleChainChanged);

    return () => {
      ethereum.removeListener('accountsChanged', handleAccountsChanged);
      ethereum.removeListener('chainChanged', handleChainChanged);
    };
  }, [address, connect, disconnect, walletType]);

  // WalletConnect session events
  useEffect(() => {
    const wcProvider = wcProviderRef.current;
    if (!wcProvider || walletType !== 'walletconnect') return;

    const handleDisconnect = () => {
      console.log('[WalletConnect] Session disconnected');
      disconnect();
    };

    const handleSessionUpdate = () => {
      console.log('[WalletConnect] Session updated');
    };

    wcProvider.on('disconnect', handleDisconnect);
    wcProvider.on('session_update', handleSessionUpdate);

    return () => {
      wcProvider.removeListener('disconnect', handleDisconnect);
      wcProvider.removeListener('session_update', handleSessionUpdate);
    };
  }, [walletType, disconnect]);

  // Auto-connect if previously connected (with delay)
  useEffect(() => {
    const ethereum = (window as any).ethereum;
    if (ethereum?.selectedAddress) {
      const timeout = setTimeout(() => {
        connect();
      }, 1000);
      return () => clearTimeout(timeout);
    }
  }, []);

  // Check for existing WalletConnect session
  useEffect(() => {
    const checkWcSession = async () => {
      try {
        const wcProvider = await initWalletConnect();
        if (wcProvider?.session) {
          console.log('[WalletConnect] Restoring session');
          const browserProvider = new ethers.BrowserProvider(wcProvider);
          const browserSigner = await browserProvider.getSigner();
          const userAddress = await browserSigner.getAddress();

          setProvider(browserProvider);
          setSigner(browserSigner);
          setAddress(userAddress);
          setChainId(NEXUS_TESTNET.chainId);
          setWalletType('walletconnect');
          
          setTimeout(() => refreshBalance(), 2000);
        }
      } catch (error) {
        console.error('[WalletConnect] Session restore failed:', error);
      }
    };

    checkWcSession();
  }, [initWalletConnect, refreshBalance]);

  // Refresh balance periodically
  useEffect(() => {
    if (!address) return;
    
    const interval = setInterval(() => {
      refreshBalance();
    }, 60000);
    
    return () => clearInterval(interval);
  }, [address, refreshBalance]);

  return (
    <Web3Context.Provider value={{
      provider,
      signer,
      address,
      chainId,
      isConnected,
      isConnecting,
      balance,
      walletType,
      connect,
      connectWalletConnect,
      disconnect,
      switchToNexus,
      refreshBalance,
      wcQrUri,
      isWcConnecting,
      cancelWcConnection,
    }}>
      {children}
    </Web3Context.Provider>
  );
}

export function useWeb3() {
  const context = useContext(Web3Context);
  if (!context) {
    throw new Error('useWeb3 must be used within Web3Provider');
  }
  return context;
}
