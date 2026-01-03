import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { ethers } from 'ethers';
import { NEXUS_TESTNET } from '@/config/contracts';
import { toast } from 'sonner';
import { rpcProvider } from '@/lib/rpcProvider';

interface Web3ContextType {
  provider: ethers.BrowserProvider | null;
  signer: ethers.Signer | null;
  address: string | null;
  chainId: number | null;
  isConnected: boolean;
  isConnecting: boolean;
  balance: string;
  connect: (walletType?: string) => Promise<void>;
  disconnect: () => void;
  switchToNexus: () => Promise<void>;
  refreshBalance: () => Promise<void>;
}

const Web3Context = createContext<Web3ContextType | undefined>(undefined);

export function Web3Provider({ children }: { children: React.ReactNode }) {
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [signer, setSigner] = useState<ethers.Signer | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [balance, setBalance] = useState('0');
  const balanceFetchRef = useRef<NodeJS.Timeout | null>(null);

  const isConnected = !!address;

  const getProvider = useCallback((walletType?: string) => {
    const ethereum = (window as any).ethereum;
    
    if (!ethereum) {
      throw new Error('No wallet detected');
    }

    // Handle multiple wallet providers
    if (walletType === 'okx' && (window as any).okxwallet) {
      return (window as any).okxwallet;
    }
    if (walletType === 'bitget' && (window as any).bitkeep?.ethereum) {
      return (window as any).bitkeep.ethereum;
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

  const connect = useCallback(async (walletType?: string) => {
    setIsConnecting(true);
    
    try {
      const ethereum = getProvider(walletType);
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
      setBalance('0'); // Default, will update after delay
      
      toast.success('Wallet connected!');
      
      // Fetch balance after a delay to avoid rate limiting
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
      }, 2000); // Wait 2 seconds before fetching balance
      
    } catch (error: any) {
      // Parse user-friendly error message - only show if it's an actionable error
      const errorMsg = rpcProvider.parseError(error, true);
      if (errorMsg) {
        toast.error(errorMsg);
      }
    } finally {
      setIsConnecting(false);
    }
  }, [getProvider, switchToNexus]);

  const disconnect = useCallback(() => {
    if (balanceFetchRef.current) {
      clearTimeout(balanceFetchRef.current);
    }
    setProvider(null);
    setSigner(null);
    setAddress(null);
    setChainId(null);
    setBalance('0');
    toast.info('Wallet disconnected');
  }, []);

  // Listen for account/chain changes
  useEffect(() => {
    const ethereum = (window as any).ethereum;
    if (!ethereum) return;

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
  }, [address, connect, disconnect]);

  // Auto-connect if previously connected (with delay)
  useEffect(() => {
    const ethereum = (window as any).ethereum;
    if (ethereum?.selectedAddress) {
      // Delay auto-connect to prevent immediate rate limiting
      const timeout = setTimeout(() => {
        connect();
      }, 1000);
      return () => clearTimeout(timeout);
    }
  }, []);

  // Refresh balance periodically (every 60 seconds)
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
      connect,
      disconnect,
      switchToNexus,
      refreshBalance,
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