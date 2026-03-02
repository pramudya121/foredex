import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface FarmVisibilityState {
  hiddenPools: number[];
  togglePool: (pid: number) => void;
  isPoolVisible: (pid: number) => boolean;
}

export const useFarmVisibilityStore = create<FarmVisibilityState>()(
  persist(
    (set, get) => ({
      hiddenPools: [],
      togglePool: (pid: number) => {
        set((state) => ({
          hiddenPools: state.hiddenPools.includes(pid)
            ? state.hiddenPools.filter((id) => id !== pid)
            : [...state.hiddenPools, pid],
        }));
      },
      isPoolVisible: (pid: number) => !get().hiddenPools.includes(pid),
    }),
    { name: 'farm-visibility' }
  )
);
