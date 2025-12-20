import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface WatchlistToken {
  address: string;
  symbol: string;
  name: string;
  logoURI?: string;
  addedAt: number;
}

interface WatchlistStore {
  tokens: WatchlistToken[];
  addToken: (token: Omit<WatchlistToken, 'addedAt'>) => void;
  removeToken: (address: string) => void;
  isWatched: (address: string) => boolean;
  clearWatchlist: () => void;
}

export const useWatchlistStore = create<WatchlistStore>()(
  persist(
    (set, get) => ({
      tokens: [],
      
      addToken: (token) => {
        const exists = get().tokens.some(
          t => t.address.toLowerCase() === token.address.toLowerCase()
        );
        if (!exists) {
          set((state) => ({
            tokens: [...state.tokens, { ...token, addedAt: Date.now() }],
          }));
        }
      },
      
      removeToken: (address) => {
        set((state) => ({
          tokens: state.tokens.filter(
            t => t.address.toLowerCase() !== address.toLowerCase()
          ),
        }));
      },
      
      isWatched: (address) => {
        return get().tokens.some(
          t => t.address.toLowerCase() === address.toLowerCase()
        );
      },
      
      clearWatchlist: () => set({ tokens: [] }),
    }),
    {
      name: 'foredex-watchlist',
    }
  )
);

export function useWatchlist() {
  return useWatchlistStore();
}