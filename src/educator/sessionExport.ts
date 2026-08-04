/** Session summary export for facilitators. Local-only, like everything else. */

import type { EngineeringNotebookEntry, TeamProgress } from '@/types';
import { formatDateTime } from '@/utils/format';

export interface SessionExport {
  progress: TeamProgress;
  notebook: EngineeringNotebookEntry[];
  exportedAt: number;
}

export function toSessionCsv(data: SessionExport): string {
  const rows: string[][] = [
    ['Mission', 'Attempt', 'Result', 'Score', 'Time (s)', 'Collisions', 'Energy used', 'When'],
  ];

  for (const result of [...data.progress.results].reverse()) {
    rows.push([
      result.missionId,
      String(result.attemptNumber),
      result.success ? 'Passed' : 'Failed',
      String(result.score.total),
      result.telemetry.elapsedSeconds.toFixed(1),
      String(result.telemetry.collisions),
      result.telemetry.energyUsed.toFixed(1),
      formatDateTime(result.completedAt),
    ]);
  }

  // Quote every field so commas in mission names cannot break the columns.
  return rows
    .map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(','))
    .join('\n');
}

export function toSessionSummary(data: SessionExport): string {
  const { profile, results, badges, totalScore, completedMissionIds } = data.progress;
  const passed = results.filter((result) => result.success).length;
  const averageScore =
    results.length === 0
      ? 0
      : results.reduce((sum, result) => sum + result.score.total, 0) / results.length;

  return [
    `AMD AI Rover Challenge — session summary`,
    `Exported ${formatDateTime(data.exportedAt)}`,
    '',
    `Team: ${profile?.teamName ?? 'Unnamed'}`,
    `Class or school: ${profile?.schoolOrClass || 'Not given'}`,
    `Team size: ${profile?.memberCount ?? '—'}`,
    `Difficulty: ${profile?.difficulty ?? '—'}`,
    '',
    `Missions completed: ${completedMissionIds.length}`,
    `Total attempts: ${results.length} (${passed} passed)`,
    `Average score per attempt: ${averageScore.toFixed(1)}/100`,
    `Total score: ${totalScore}`,
    `Badges earned: ${badges.length > 0 ? badges.join(', ') : 'None'}`,
    `Notebook entries: ${data.notebook.length}`,
    '',
    'Reflections written by the team:',
    ...data.notebook
      .filter((entry) => entry.reflection)
      .map(
        (entry) =>
          `  • ${entry.title}: ${entry.reflection?.whatChanged || '—'} → ${entry.reflection?.whatHappened || '—'}`,
      ),
  ].join('\n');
}
