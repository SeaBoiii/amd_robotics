/** Engineer Challenge leaderboard. Local to this device; export as CSV. */

import { create } from 'zustand';
import type { LeaderboardEntry } from '@/engineer/types';
import { upsertBest } from '@/engineer/leaderboard';
import { loadState } from '@/utils/storage';
import { persisted } from './persisted';

export const LEADERBOARD_STORAGE_KEY = 'engineer-leaderboard';

interface LeaderboardState {
  entries: LeaderboardEntry[];
  submit(entry: LeaderboardEntry): void;
  clear(): void;
  /** Re-reads storage; used when another tab (e.g. the big screen) posts a result. */
  reload(): void;
}

export const useLeaderboardStore = create<LeaderboardState>()(
  persisted(
    (set, get) => ({
      entries: [],
      submit: (entry) => set({ entries: upsertBest(get().entries, entry) }),
      clear: () => set({ entries: [] }),
      reload: () =>
        set({
          entries: loadState<{ entries: LeaderboardEntry[] }>(LEADERBOARD_STORAGE_KEY, { entries: [] })
            .entries,
        }),
    }),
    { key: LEADERBOARD_STORAGE_KEY, partialize: ({ entries }) => ({ entries }) },
  ),
);
