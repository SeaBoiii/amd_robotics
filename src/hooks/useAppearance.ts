/**
 * Applies accessibility settings to the document root.
 *
 * Everything is driven by data attributes plus CSS custom properties, so a
 * setting change costs one attribute write rather than a React re-render of
 * the whole tree.
 */

import { useEffect } from 'react';
import { useSettingsStore } from '@/store/useSettingsStore';

export function useAppearance(): void {
  const highContrast = useSettingsStore((state) => state.highContrast);
  const reducedMotion = useSettingsStore((state) => state.reducedMotion);
  const colourBlindSafe = useSettingsStore((state) => state.colourBlindSafe);
  const textScale = useSettingsStore((state) => state.textScale);
  const presentationMode = useSettingsStore((state) => state.presentationMode);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.highContrast = String(highContrast);
    root.dataset.reducedMotion = String(reducedMotion);
    root.dataset.colourblind = String(colourBlindSafe);
    root.dataset.presentation = String(presentationMode);
    root.style.setProperty('--text-scale', String(textScale));
  }, [highContrast, reducedMotion, colourBlindSafe, textScale, presentationMode]);
}
