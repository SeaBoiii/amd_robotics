/**
 * Engineering Notebook exporters.
 *
 * Exports are generated entirely in the browser and downloaded straight to the
 * student's machine — nothing is uploaded, which keeps the whole game usable in
 * schools with strict data policies.
 */

import type { EngineeringNotebookEntry, TeamProfile } from '@/types';
import { escapeHtml, formatDateTime } from '@/utils/format';

export interface NotebookExport {
  profile: TeamProfile | null;
  entries: EngineeringNotebookEntry[];
  totalScore: number;
  badges: string[];
  exportedAt: number;
}

export function toJsonExport(data: NotebookExport): string {
  return JSON.stringify({ format: 'amd-rover-notebook', version: 1, ...data }, null, 2);
}

export function toMarkdownExport(data: NotebookExport): string {
  const lines: string[] = [];
  lines.push(`# Engineering Notebook — ${data.profile?.teamName ?? 'Unnamed team'}`);
  lines.push('');
  if (data.profile) {
    lines.push(`- Class or school: ${data.profile.schoolOrClass || 'Not given'}`);
    lines.push(`- Team size: ${data.profile.memberCount}`);
    lines.push(`- Difficulty: ${data.profile.difficulty}`);
  }
  lines.push(`- Total score: ${data.totalScore}`);
  lines.push(`- Badges: ${data.badges.length > 0 ? data.badges.join(', ') : 'None yet'}`);
  lines.push(`- Exported: ${formatDateTime(data.exportedAt)}`);
  lines.push('');

  for (const entry of data.entries) {
    lines.push(`## ${entry.title}`);
    lines.push('');
    lines.push(`*${formatDateTime(entry.timestamp)} — ${entry.type.replace(/_/g, ' ')}*`);
    lines.push('');
    lines.push(entry.summary);
    lines.push('');

    const details = Object.entries(entry.details);
    if (details.length > 0) {
      lines.push('| Item | Value |');
      lines.push('| --- | --- |');
      for (const [key, value] of details) lines.push(`| ${key} | ${String(value)} |`);
      lines.push('');
    }

    if (entry.reflection) {
      lines.push('**Reflection**');
      lines.push('');
      lines.push(`- What changed: ${entry.reflection.whatChanged || '—'}`);
      lines.push(`- Why: ${entry.reflection.whyChanged || '—'}`);
      lines.push(`- What happened: ${entry.reflection.whatHappened || '—'}`);
      lines.push(`- What next: ${entry.reflection.whatNext || '—'}`);
      lines.push('');
    }
  }

  return lines.join('\n');
}

/** Self-contained printable page. All values are escaped before interpolation. */
export function toPrintableHtml(data: NotebookExport): string {
  const entries = data.entries
    .map((entry) => {
      const details = Object.entries(entry.details)
        .map(
          ([key, value]) =>
            `<tr><th scope="row">${escapeHtml(key)}</th><td>${escapeHtml(String(value))}</td></tr>`,
        )
        .join('');

      const reflection = entry.reflection
        ? `<div class="reflection">
             <p><strong>What changed:</strong> ${escapeHtml(entry.reflection.whatChanged || '—')}</p>
             <p><strong>Why:</strong> ${escapeHtml(entry.reflection.whyChanged || '—')}</p>
             <p><strong>What happened:</strong> ${escapeHtml(entry.reflection.whatHappened || '—')}</p>
             <p><strong>What next:</strong> ${escapeHtml(entry.reflection.whatNext || '—')}</p>
           </div>`
        : '';

      return `<article>
          <h2>${escapeHtml(entry.title)}</h2>
          <p class="meta">${escapeHtml(formatDateTime(entry.timestamp))} — ${escapeHtml(entry.type.replace(/_/g, ' '))}</p>
          <p>${escapeHtml(entry.summary)}</p>
          ${details ? `<table>${details}</table>` : ''}
          ${reflection}
        </article>`;
    })
    .join('');

  return `<!doctype html>
<html lang="en-SG">
<head>
<meta charset="utf-8">
<title>Engineering Notebook — ${escapeHtml(data.profile?.teamName ?? 'Team')}</title>
<style>
  body { font-family: Georgia, 'Times New Roman', serif; max-width: 46rem; margin: 2rem auto; padding: 0 1rem; color: #111; }
  h1 { border-bottom: 3px solid #111; padding-bottom: .4rem; }
  h2 { margin-bottom: .2rem; }
  .meta { color: #666; font-size: .85rem; margin-top: 0; }
  article { page-break-inside: avoid; border-left: 3px solid #ccc; padding-left: 1rem; margin-bottom: 2rem; }
  table { border-collapse: collapse; font-size: .85rem; margin: .5rem 0; }
  th, td { border: 1px solid #ccc; padding: .3rem .6rem; text-align: left; }
  .reflection { background: #f5f5f5; padding: .6rem 1rem; }
  .reflection p { margin: .3rem 0; font-size: .9rem; }
</style>
</head>
<body>
  <h1>Engineering Notebook</h1>
  <p>
    <strong>${escapeHtml(data.profile?.teamName ?? 'Unnamed team')}</strong><br>
    ${escapeHtml(data.profile?.schoolOrClass ?? '')}<br>
    Total score: ${escapeHtml(String(data.totalScore))} ·
    Badges: ${escapeHtml(data.badges.join(', ') || 'None yet')}<br>
    Exported ${escapeHtml(formatDateTime(data.exportedAt))}
  </p>
  ${entries}
  <footer><p style="font-size:.75rem;color:#666">AMD AI Rover Challenge — an educational simulation. Performance figures shown in the game are simplified teaching values, not product benchmarks.</p></footer>
</body>
</html>`;
}
