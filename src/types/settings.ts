/**
 * Accessibility, educator and branding settings.
 */

export interface AccessibilitySettings {
  highContrast: boolean;
  reducedMotion: boolean;
  colourBlindSafe: boolean;
  /** Root font scale, 0.9–1.4. */
  textScale: number;
  showCaptions: boolean;
  soundEnabled: boolean;
}

export interface EducatorSettings {
  educatorMode: boolean;
  workshopSafeMode: boolean;
  presentationMode: boolean;
  showDebugOverlay: boolean;
  allowAdvancedFeatures: boolean;
  instantTrainingAllowed: boolean;
  /** Overrides the mission time limit when > 0. */
  timeLimitOverrideSeconds: number;
  /** Unlocks every mission regardless of progress. */
  unlockAllMissions: boolean;
  /** Build-and-run window for the Engineer Challenge. */
  engineerSessionMinutes: number;
}

export interface BrandingConfig {
  programmeTitle: string;
  eventTitle: string;
  sponsorMessage: string;
  amdLogo: string | null;
  partnerLogos: { name: string; src: string | null }[];
  schoolLogo: string | null;
  certificateFooter: string;
}

export interface EngineerProfile {
  name: string;
  role: string;
  team: string;
  journey: string;
  currentProject: string;
  advice: string;
  linkLabel: string;
  linkUrl: string;
  avatar: string;
}
