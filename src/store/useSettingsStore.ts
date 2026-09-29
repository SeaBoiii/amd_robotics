/**
 * Accessibility, educator and branding settings.
 *
 * Workshop Safe Mode is the important one here: switching it on trades
 * flexibility for reliability, which is the right call in front of 30 students
 * and a projector.
 */

import { create } from 'zustand';
import type { AccessibilitySettings, EducatorSettings } from '@/types';
import { persisted } from './persisted';

interface SettingsState extends AccessibilitySettings, EducatorSettings {
  setAccessibility<K extends keyof AccessibilitySettings>(
    key: K,
    value: AccessibilitySettings[K],
  ): void;
  setEducator<K extends keyof EducatorSettings>(key: K, value: EducatorSettings[K]): void;
  enableWorkshopSafeMode(): void;
  disableWorkshopSafeMode(): void;
  resetSettings(): void;
}

const DEFAULT_ACCESSIBILITY: AccessibilitySettings = {
  highContrast: false,
  reducedMotion: false,
  colourBlindSafe: false,
  textScale: 1,
  showCaptions: true,
  soundEnabled: true,
};

const DEFAULT_EDUCATOR: EducatorSettings = {
  educatorMode: false,
  workshopSafeMode: false,
  presentationMode: false,
  showDebugOverlay: false,
  allowAdvancedFeatures: true,
  instantTrainingAllowed: true,
  timeLimitOverrideSeconds: 0,
  unlockAllMissions: false,
  engineerSessionMinutes: 4,
};

export const useSettingsStore = create<SettingsState>()(
  persisted(
    (set) => ({
      ...DEFAULT_ACCESSIBILITY,
      ...DEFAULT_EDUCATOR,

      setAccessibility: (key, value) => set({ [key]: value } as Partial<SettingsState>),
      setEducator: (key, value) => set({ [key]: value } as Partial<SettingsState>),

      enableWorkshopSafeMode: () =>
        set({
          workshopSafeMode: true,
          reducedMotion: true,
          instantTrainingAllowed: true,
          allowAdvancedFeatures: false,
          showDebugOverlay: false,
        }),

      disableWorkshopSafeMode: () =>
        set({ workshopSafeMode: false, allowAdvancedFeatures: true }),

      resetSettings: () => set({ ...DEFAULT_ACCESSIBILITY, ...DEFAULT_EDUCATOR }),
    }),
    {
      key: 'settings',
      partialize: ({
        highContrast,
        reducedMotion,
        colourBlindSafe,
        textScale,
        showCaptions,
        soundEnabled,
        educatorMode,
        workshopSafeMode,
        presentationMode,
        showDebugOverlay,
        allowAdvancedFeatures,
        instantTrainingAllowed,
        timeLimitOverrideSeconds,
        unlockAllMissions,
        engineerSessionMinutes,
      }) => ({
        highContrast,
        reducedMotion,
        colourBlindSafe,
        textScale,
        showCaptions,
        soundEnabled,
        educatorMode,
        workshopSafeMode,
        presentationMode,
        showDebugOverlay,
        allowAdvancedFeatures,
        instantTrainingAllowed,
        timeLimitOverrideSeconds,
        unlockAllMissions,
        engineerSessionMinutes,
      }),
    },
  ),
);
