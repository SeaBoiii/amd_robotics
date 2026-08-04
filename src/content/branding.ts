/**
 * Branding configuration.
 *
 * No official AMD artwork ships with this repository. Every logo is a *slot*
 * that an organiser fills in by dropping a file into `public/branding/` and
 * editing `branding.json`. Until then the UI shows a clearly-labelled
 * placeholder, which is honest and avoids any asset-licensing problem.
 *
 * See docs/amd-asset-integration.md.
 */

import type { BrandingConfig } from '@/types';

export const FALLBACK_BRANDING: BrandingConfig = {
  programmeTitle: 'AMD AI Rover Challenge',
  eventTitle: 'Sense · Think · Move',
  sponsorMessage: 'A STEM outreach programme supported by AMD.',
  amdLogo: null,
  partnerLogos: [
    { name: 'Programme Partner', src: null },
    { name: 'Host School', src: null },
  ],
  schoolLogo: null,
  certificateFooter:
    'Presented in recognition of outstanding work in robotics, AI and engineering problem-solving.',
};

let cached: BrandingConfig | null = null;

export async function loadBranding(): Promise<BrandingConfig> {
  if (cached) return cached;
  try {
    const base = import.meta.env.BASE_URL ?? '/';
    const response = await fetch(`${base.endsWith('/') ? base : `${base}/`}branding/branding.json`);
    if (!response.ok) throw new Error(String(response.status));
    const raw = (await response.json()) as Partial<BrandingConfig>;
    cached = { ...FALLBACK_BRANDING, ...raw };
  } catch (error) {
    console.warn('[branding] Using placeholder branding.', error);
    cached = FALLBACK_BRANDING;
  }
  return cached;
}
