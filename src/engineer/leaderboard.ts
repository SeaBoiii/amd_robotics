/** Pure leaderboard rules, kept out of the store so they are trivially testable. */

import type { LeaderboardEntry } from './types';
import { PLANNER_LABELS } from './navigation/navigator';

export function nameKey(name: string): string {
  return name.trim().toLowerCase();
}

/** Faster wins; ties go to fewer collisions, then less energy, then who got there first. */
export function compareEntries(a: LeaderboardEntry, b: LeaderboardEntry): number {
  return (
    a.timeSeconds - b.timeSeconds ||
    a.collisions - b.collisions ||
    a.energyUsed - b.energyUsed ||
    a.submittedAt - b.submittedAt
  );
}

export function rankEntries(entries: LeaderboardEntry[]): LeaderboardEntry[] {
  return [...entries].sort(compareEntries);
}

/** Keeps one entry per engineer: their best. */
export function upsertBest(entries: LeaderboardEntry[], candidate: LeaderboardEntry): LeaderboardEntry[] {
  const key = nameKey(candidate.name);
  const existing = entries.find((entry) => nameKey(entry.name) === key);
  if (!existing) return [...entries, candidate];
  if (compareEntries(candidate, existing) >= 0) return entries;
  return entries.map((entry) => (entry === existing ? candidate : entry));
}

// Spreadsheet apps execute cells starting with these characters as formulas.
const FORMULA_PREFIX = /^[=+\-@\t\r]/;

export function csvCell(value: string | number): string {
  let text = String(value);
  if (typeof value === 'string' && FORMULA_PREFIX.test(text)) text = `'${text}`;
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toLeaderboardCsv(entries: LeaderboardEntry[]): string {
  const header = ['Rank', 'Name', 'Time (s)', 'Collisions', 'Energy used', 'Planner', 'Build', 'Submitted'];
  const rows = rankEntries(entries).map((entry, index) =>
    [
      index + 1,
      entry.name,
      entry.timeSeconds,
      entry.collisions,
      entry.energyUsed,
      PLANNER_LABELS[entry.planner] ?? entry.planner,
      entry.buildSummary,
      new Date(entry.submittedAt).toISOString(),
    ]
      .map(csvCell)
      .join(','),
  );
  return [header.join(','), ...rows].join('\r\n');
}
