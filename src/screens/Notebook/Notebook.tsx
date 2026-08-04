import { useMemo, useState } from 'react';
import { Button, Card, EmptyState, Tabs } from '@/components/ui';
import type { NotebookEntryType } from '@/types';
import {
  toJsonExport,
  toMarkdownExport,
  toPrintableHtml,
  type NotebookExport,
} from '@/notebook/exporters';
import { useTeamStore } from '@/store/useTeamStore';
import { downloadFile, formatDateTime, humanise } from '@/utils/format';

const FILTERS: { id: NotebookEntryType | 'all'; label: string }[] = [
  { id: 'all', label: 'Everything' },
  { id: 'mission_attempt', label: 'Mission attempts' },
  { id: 'ai_model', label: 'AI models' },
  { id: 'rover_config', label: 'Rover builds' },
  { id: 'reflection', label: 'Reflections' },
];

export default function Notebook() {
  const [filter, setFilter] = useState<NotebookEntryType | 'all'>('all');

  const notebook = useTeamStore((state) => state.notebook);
  const profile = useTeamStore((state) => state.profile);
  const totalScore = useTeamStore((state) => state.totalScore);
  const badges = useTeamStore((state) => state.badges);
  const updateReflection = useTeamStore((state) => state.updateReflection);
  const deleteNotebookEntry = useTeamStore((state) => state.deleteNotebookEntry);

  const entries = useMemo(
    () => (filter === 'all' ? notebook : notebook.filter((entry) => entry.type === filter)),
    [notebook, filter],
  );

  const exportData = (): NotebookExport => ({
    profile,
    entries: notebook,
    totalScore,
    badges,
    exportedAt: Date.now(),
  });

  const slug = (profile?.teamName ?? 'team').toLowerCase().replace(/[^a-z0-9]+/g, '-');

  return (
    <div className="stack">
      <div className="row row--between">
        <div>
          <p className="eyebrow">Engineering Notebook</p>
          <h1 style={{ marginBottom: 0 }}>Your record of the build</h1>
          <p className="text-muted">
            Every rover change, model and mission attempt is logged automatically. This is the
            evidence of how your thinking developed.
          </p>
        </div>
        <div className="row no-print">
          <Button
            onClick={() => downloadFile(`${slug}-notebook.md`, toMarkdownExport(exportData()), 'text/markdown')}
          >
            ⬇ Markdown
          </Button>
          <Button
            onClick={() =>
              downloadFile(`${slug}-notebook.json`, toJsonExport(exportData()), 'application/json')
            }
          >
            ⬇ JSON
          </Button>
          <Button
            onClick={() =>
              downloadFile(`${slug}-notebook.html`, toPrintableHtml(exportData()), 'text/html')
            }
          >
            🖨 Printable
          </Button>
        </div>
      </div>

      <Tabs ariaLabel="Notebook filter" active={filter} onChange={setFilter} tabs={FILTERS} />

      {entries.length === 0 ? (
        <EmptyState icon="📓" title="Nothing recorded yet">
          Build a rover, train a model or run a mission and entries will appear here.
        </EmptyState>
      ) : (
        <div className="stack">
          {entries.map((entry) => (
            <Card key={entry.id} className={`notebook-entry notebook-entry--${entry.type}`}>
              <div className="row row--between">
                <div>
                  <strong>{entry.title}</strong>
                  <div className="text-xs text-dim">
                    {formatDateTime(entry.timestamp)} · {humanise(entry.type)}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="no-print"
                  aria-label={`Delete entry ${entry.title}`}
                  onClick={() => deleteNotebookEntry(entry.id)}
                >
                  🗑
                </Button>
              </div>

              <p className="text-sm">{entry.summary}</p>

              {Object.keys(entry.details).length > 0 ? (
                <div className="detail-list">
                  {Object.entries(entry.details).map(([key, value]) => (
                    <div key={key} className="detail-list__item">
                      <span className="detail-list__key">{key}</span>
                      <strong className="mono">{String(value)}</strong>
                    </div>
                  ))}
                </div>
              ) : null}

              {entry.reflection ? (
                <details>
                  <summary className="text-sm">Reflection</summary>
                  <div className="grid grid--2" style={{ marginTop: 'var(--sp-2)' }}>
                    {(
                      [
                        ['whatChanged', 'What changed'],
                        ['whyChanged', 'Why'],
                        ['whatHappened', 'What happened'],
                        ['whatNext', 'What next'],
                      ] as const
                    ).map(([key, label]) => (
                      <div className="field" key={key}>
                        <label className="field__label" htmlFor={`${entry.id}-${key}`}>
                          {label}
                        </label>
                        <textarea
                          id={`${entry.id}-${key}`}
                          className="textarea"
                          rows={2}
                          value={entry.reflection?.[key] ?? ''}
                          onChange={(event) =>
                            updateReflection(entry.id, {
                              whatChanged: entry.reflection?.whatChanged ?? '',
                              whyChanged: entry.reflection?.whyChanged ?? '',
                              whatHappened: entry.reflection?.whatHappened ?? '',
                              whatNext: entry.reflection?.whatNext ?? '',
                              [key]: event.target.value,
                            })
                          }
                        />
                      </div>
                    ))}
                  </div>
                </details>
              ) : null}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
