import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface FavoritePoolsStore {
  favorites: string[]; // Pool addresses
  addFavorite: (address: string) => void;
  removeFavorite: (address: string) => void;
  toggleFavorite: (address: string) => void;
  isFavorite: (address: string) => boolean;
}

export const useFavoritePoolsStore = create<FavoritePoolsStore>()(
  persist(
    (set, get) => ({
      favorites: [],
      
      addFavorite: (address) => {
        set((state) => ({
          favorites: [...new Set([...state.favorites, address.toLowerCase()])],
        }));
      },
      
      removeFavorite: (address) => {
        set((state) => ({
          favorites: state.favorites.filter(
            (a) => a.toLowerCase() !== address.toLowerCase()
          ),
        }));
      },
      
      toggleFavorite: (address) => {
        const isFav = get().isFavorite(address);
        if (isFav) {
          get().removeFavorite(address);
        } else {
          get().addFavorite(address);
        }
      },
      
      isFavorite: (address) => {
        return get().favorites.some(
          (a) => a.toLowerCase() === address.toLowerCase()
        );
      },
    }),
    {
      name: 'foredex-favorite-pools',
    }
  )
);
