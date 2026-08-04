/** Loads and caches the branding configuration. */

import { useEffect, useState } from 'react';
import type { BrandingConfig } from '@/types';
import { FALLBACK_BRANDING, loadBranding } from '@/content/branding';

export function useBranding(): BrandingConfig {
  const [branding, setBranding] = useState<BrandingConfig>(FALLBACK_BRANDING);

  useEffect(() => {
    let active = true;
    loadBranding().then((config) => {
      if (active) setBranding(config);
    });
    return () => {
      active = false;
    };
  }, []);

  return branding;
}
