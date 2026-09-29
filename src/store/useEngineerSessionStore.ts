/** One engineer's timed session: build, navigation config and run history. */

import { create } from 'zustand';
import type { EngineerBuild, EngineerRun, NavigationConfig } from '@/engineer/types';
import { PARTS_BY_ID, SINGLE_SLOT, createDefaultEngineerBuild } from '@/engineer/catalogue';
import { DEFAULT_NAVIGATION } from '@/engineer/maze';
import { persisted } from './persisted';

const MAX_RUNS = 50;

interface EngineerSessionState {
  engineerName: string;
  /** Wall-clock start, so a page refresh does not reset the countdown. */
  startedAt: number | null;
  durationSec: number;
  build: EngineerBuild;
  navigation: NavigationConfig;
  runs: EngineerRun[];
  startSession(name: string, durationSec: number): void;
  endSession(): void;
  togglePart(partId: string): void;
  setThrottle(throttle: number): void;
  setNavigation(patch: Partial<NavigationConfig>): void;
  applyPreset(build: Omit<EngineerBuild, 'colour'>, navigation: NavigationConfig): void;
  recordRun(run: EngineerRun): void;
}

export function remainingMs(startedAt: number | null, durationSec: number, now: number): number {
  if (startedAt === null) return 0;
  return Math.max(0, startedAt + durationSec * 1000 - now);
}

export const useEngineerSessionStore = create<EngineerSessionState>()(
  persisted(
    (set, get) => ({
      engineerName: '',
      startedAt: null,
      durationSec: 480,
      build: createDefaultEngineerBuild(),
      navigation: DEFAULT_NAVIGATION,
      runs: [],

      startSession: (name, durationSec) =>
        set({
          engineerName: name.trim().slice(0, 40),
          startedAt: Date.now(),
          durationSec,
          build: createDefaultEngineerBuild(),
          navigation: DEFAULT_NAVIGATION,
          runs: [],
        }),

      endSession: () => set({ engineerName: '', startedAt: null, runs: [] }),

      togglePart: (partId) => {
        const part = PARTS_BY_ID.get(partId);
        if (!part) return;
        const { build } = get();
        let partIds: string[];
        if (SINGLE_SLOT.includes(part.category)) {
          partIds = [
            ...build.partIds.filter((id) => PARTS_BY_ID.get(id)?.category !== part.category),
            partId,
          ];
        } else {
          partIds = build.partIds.includes(partId)
            ? build.partIds.filter((id) => id !== partId)
            : [...build.partIds, partId];
        }
        set({ build: { ...build, partIds } });
      },

      setThrottle: (throttle) =>
        set({ build: { ...get().build, throttle: Math.round(Math.min(100, Math.max(30, throttle))) } }),

      setNavigation: (patch) => set({ navigation: { ...get().navigation, ...patch } }),

      applyPreset: (build, navigation) =>
        set({ build: { ...build, colour: get().build.colour }, navigation }),

      recordRun: (run) => set({ runs: [run, ...get().runs].slice(0, MAX_RUNS) }),
    }),
    {
      key: 'engineer-session',
      partialize: ({ engineerName, startedAt, durationSec, build, navigation, runs }) => ({
        engineerName,
        startedAt,
        durationSec,
        build,
        navigation,
        runs,
      }),
    },
  ),
);
