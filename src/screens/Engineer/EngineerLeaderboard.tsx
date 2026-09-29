import { useEffect, useMemo, useState } from 'react';
import { Button, Card, EmptyState, Modal } from '@/components/ui';
import { nameKey, rankEntries, toLeaderboardCsv } from '@/engineer/leaderboard';
import { PLANNER_LABELS } from '@/engineer/navigation/navigator';
import { useEngineerSessionStore } from '@/store/useEngineerSessionStore';
import { LEADERBOARD_STORAGE_KEY, useLeaderboardStore } from '@/store/useLeaderboardStore';
import { downloadFile, formatDateTime } from '@/utils/format';

// Rows that fit a 16:9 wall display without scrolling; the full list is in the CSV.
const VISIBLE_ROWS = 10;

export default function EngineerLeaderboard() {
  const entries = useLeaderboardStore((state) => state.entries);
  const clear = useLeaderboardStore((state) => state.clear);
  const reload = useLeaderboardStore((state) => state.reload);
  const engineerName = useEngineerSessionStore((state) => state.engineerName);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const ranked = useMemo(() => rankEntries(entries), [entries]);
  const me = nameKey(engineerName);
  const visible = useMemo(() => {
    const rows = ranked.map((entry, index) => ({ entry, rank: index + 1 }));
    const top = rows.slice(0, VISIBLE_ROWS);
    const mine = rows.find((row) => row.rank > VISIBLE_ROWS && nameKey(row.entry.name) === me);
    return mine ? [...top.slice(0, VISIBLE_ROWS - 1), mine] : top;
  }, [ranked, me]);

  // A big-screen tab picks up results posted from the build laptops' tabs.
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key?.endsWith(LEADERBOARD_STORAGE_KEY)) reload();
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [reload]);

  return (
    <div className="engineer-screen">
      <div className="engineer-screen__header">
        <div>
          <h1>Leaderboard</h1>
          <p className="text-muted">
            Fastest time to the exit. Ties: fewer collisions, then less energy.
            {ranked.length > VISIBLE_ROWS ? ` Showing top ${VISIBLE_ROWS} of ${ranked.length}.` : ''}
          </p>
        </div>
        <div className="row">
          <Button
            disabled={ranked.length === 0}
            onClick={() => downloadFile('engineer-leaderboard.csv', toLeaderboardCsv(entries), 'text/csv')}
          >
            ⬇ Export CSV
          </Button>
          <Button variant="danger" disabled={ranked.length === 0} onClick={() => setConfirmOpen(true)}>
            Clear
          </Button>
        </div>
      </div>

      <Card>
        {ranked.length === 0 ? (
          <EmptyState icon="🏁" title="No finishes yet">
            The first engineer to reach the exit takes the top spot.
          </EmptyState>
        ) : (
          <table className="table engineer-leaderboard">
            <thead>
              <tr>
                <th scope="col">#</th>
                <th scope="col">Engineer</th>
                <th scope="col">Time</th>
                <th scope="col">Collisions</th>
                <th scope="col">Energy</th>
                <th scope="col">Planner</th>
                <th scope="col">Build</th>
                <th scope="col">When</th>
              </tr>
            </thead>
            <tbody>
              {visible.map(({ entry, rank }) => (
                <tr
                  key={entry.id}
                  className={nameKey(entry.name) === me ? 'engineer-leaderboard__me' : undefined}
                >
                  <td className="mono">{rank}</td>
                  <th scope="row">{entry.name}</th>
                  <td className="mono">{entry.timeSeconds.toFixed(1)} s</td>
                  <td className="mono">{entry.collisions}</td>
                  <td className="mono">{entry.energyUsed}</td>
                  <td>{PLANNER_LABELS[entry.planner] ?? entry.planner}</td>
                  <td className="text-xs">{entry.buildSummary}</td>
                  <td className="text-xs text-dim">{formatDateTime(entry.submittedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Clear the leaderboard?"
        footer={
          <>
            <Button onClick={() => setConfirmOpen(false)}>Cancel</Button>
            <Button
              variant="danger"
              onClick={() => {
                clear();
                setConfirmOpen(false);
              }}
            >
              Clear all entries
            </Button>
          </>
        }
      >
        <p>This permanently removes every entry on this device. Export a CSV first if you need it.</p>
      </Modal>
    </div>
  );
}
