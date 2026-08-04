/**
 * Tiny persistence middleware for Zustand.
 *
 * We deliberately do not use `zustand/middleware/persist`: this version routes
 * through our own corruption-tolerant storage helper, writes a versioned
 * envelope, and lets each store choose exactly which slice is saved (so
 * transient UI flags never end up on disk).
 */

import type { StateCreator } from 'zustand';
import { loadState, saveState } from '@/utils/storage';

export interface PersistOptions<T, P> {
  key: string;
  /** Picks the persisted slice. Anything omitted is treated as transient. */
  partialize: (state: T) => P;
  /** Merges the loaded slice back into the initial state. */
  merge?: (persisted: P, current: T) => T;
}

export function persisted<T extends object, P>(
  config: StateCreator<T>,
  options: PersistOptions<T, P>,
): StateCreator<T> {
  return (set, get, api) => {
    const initial = config(set, get, api);
    const stored = loadState<P | null>(options.key, null);

    const merged =
      stored === null
        ? initial
        : options.merge
          ? options.merge(stored, initial)
          : ({ ...initial, ...(stored as object) } as T);

    // Persist after every change, but only the declared slice.
    api.subscribe((state) => {
      saveState(options.key, options.partialize(state));
    });

    return merged;
  };
}
