/**
 * Mission loading.
 *
 * Missions live in `public/missions/` as plain JSON, fetched relative to the
 * app base so the build works on GitHub Pages, Netlify, Vercel or from a local
 * folder. Results are cached, so a mission is fetched at most once per session
 * and the game keeps working if the network drops mid-workshop.
 */

import type { Mission, MissionSummary } from '@/types';
import { asMission, validateMission } from './validateMission';

export class MissionLoadError extends Error {
  readonly details: string[];
  constructor(message: string, details: string[] = []) {
    super(message);
    this.details = details;
  }
}

const missionCache = new Map<string, Mission>();
let indexCache: MissionSummary[] | null = null;

function missionUrl(file: string): string {
  // import.meta.env.BASE_URL respects Vite's `base`, which is './' here.
  const base = import.meta.env.BASE_URL ?? '/';
  const normalised = base.endsWith('/') ? base : `${base}/`;
  return `${normalised}missions/${file}`;
}

async function fetchJson(url: string): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(url);
  } catch (error) {
    throw new MissionLoadError(
      'Could not load the mission files. If you are running this locally, make sure the dev server is started.',
      [String(error)],
    );
  }
  if (!response.ok) {
    throw new MissionLoadError(`Mission file not found (${response.status}).`, [url]);
  }
  try {
    return await response.json();
  } catch (error) {
    throw new MissionLoadError('A mission file contains invalid JSON.', [url, String(error)]);
  }
}

export async function loadMissionIndex(): Promise<MissionSummary[]> {
  if (indexCache) return indexCache;

  const raw = (await fetchJson(missionUrl('index.json'))) as { missions?: MissionSummary[] };
  if (!raw || !Array.isArray(raw.missions) || raw.missions.length === 0) {
    throw new MissionLoadError('The mission index is empty or malformed.');
  }

  indexCache = [...raw.missions].sort((a, b) => a.index - b.index);
  return indexCache;
}

export async function loadMission(missionId: string): Promise<Mission> {
  const cached = missionCache.get(missionId);
  if (cached) return cached;

  const index = await loadMissionIndex();
  const summary = index.find((item) => item.id === missionId);
  if (!summary) {
    throw new MissionLoadError(`There is no mission with the id "${missionId}".`);
  }

  const raw = await fetchJson(missionUrl(summary.file));
  const validation = validateMission(raw, summary.file);

  if (!validation.valid) {
    throw new MissionLoadError(
      'This mission file has a problem and cannot be loaded.',
      validation.errors,
    );
  }
  validation.warnings.forEach((warning) => console.warn('[missions]', warning));

  const mission = asMission(raw);
  missionCache.set(missionId, mission);
  return mission;
}

/** Loads every mission. Used by the Command Centre and Educator Mode. */
export async function loadAllMissions(): Promise<Mission[]> {
  const index = await loadMissionIndex();
  const missions = await Promise.all(index.map((summary) => loadMission(summary.id)));
  return missions.sort((a, b) => a.index - b.index);
}

/** Test hook — clears caches so fixtures do not leak between tests. */
export function clearMissionCache(): void {
  missionCache.clear();
  indexCache = null;
}
