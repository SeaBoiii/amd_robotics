import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button, Callout, Card } from '@/components/ui';
import { nameKey } from '@/engineer/leaderboard';
import { useEngineerSessionStore } from '@/store/useEngineerSessionStore';
import { useLeaderboardStore } from '@/store/useLeaderboardStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { formatSeconds } from '@/utils/format';
import { useSessionClock } from './EngineerShell';

export default function EngineerLanding() {
  const navigate = useNavigate();
  const minutes = useSettingsStore((state) => state.engineerSessionMinutes);
  const engineerName = useEngineerSessionStore((state) => state.engineerName);
  const startSession = useEngineerSessionStore((state) => state.startSession);
  const endSession = useEngineerSessionStore((state) => state.endSession);
  const entries = useLeaderboardStore((state) => state.entries);
  const { active, remaining, expired } = useSessionClock();
  const [name, setName] = useState('');

  const trimmed = name.trim();
  const nameTaken = useMemo(
    () => trimmed.length > 0 && entries.some((entry) => nameKey(entry.name) === nameKey(trimmed)),
    [entries, trimmed],
  );

  return (
    <div className="stack" style={{ maxWidth: '48rem' }}>
      <div>
        <p className="eyebrow">Engineer Challenge</p>
        <h1>Build it. Tune it. Beat the maze.</h1>
        <p className="text-muted">
          Unlimited budget, one unmapped maze, {minutes} minutes. Your rover starts blind: it must
          detect walls and hidden obstacles with its sensors, plan a route, and replan as it
          learns. The fastest simulated time to the exit tops the leaderboard.
        </p>
      </div>

      <Card title="Rules">
        <ul className="text-sm">
          <li>Every part adds mass. Heavier rovers are slower; bigger motors drain batteries.</li>
          <li>Planning is not free: search time on your compute module is added to the clock.</li>
          <li>Run as often as you like. Your best successful run is posted automatically.</li>
          <li>Ranking: time, then fewest collisions, then least energy.</li>
          <li>When the timer ends, new runs no longer count.</li>
        </ul>
      </Card>

      {active ? (
        <Callout tone={expired ? 'warning' : 'info'} title={`Session in progress: ${engineerName}`}>
          <p>{expired ? 'Time is up for this session.' : `${formatSeconds(remaining / 1000)} left.`}</p>
          <div className="row">
            {!expired ? (
              <Button variant="primary" onClick={() => navigate('/engineer/build')}>
                Continue
              </Button>
            ) : null}
            <Button onClick={endSession}>End session</Button>
          </div>
        </Callout>
      ) : (
        <Card title="Start a session">
          <form
            className="stack"
            onSubmit={(event) => {
              event.preventDefault();
              if (!trimmed) return;
              startSession(trimmed, minutes * 60);
              navigate('/engineer/build');
            }}
          >
            <div className="field">
              <label className="field__label" htmlFor="engineer-name">
                Engineer name
              </label>
              <input
                id="engineer-name"
                className="input"
                value={name}
                maxLength={40}
                autoComplete="off"
                onChange={(event) => setName(event.target.value)}
              />
              {nameTaken ? (
                <span className="field__hint">
                  This name is already on the leaderboard. It will only be updated by a faster run.
                </span>
              ) : null}
            </div>
            <div className="row">
              <Button type="submit" variant="primary" size="lg" disabled={!trimmed}>
                ⏱ Start {minutes}-minute session
              </Button>
              <Link to="/engineer/leaderboard">View leaderboard</Link>
            </div>
          </form>
        </Card>
      )}

      <p className="text-sm text-dim">
        <Link to="/">← Back to the student challenge</Link>
      </p>
    </div>
  );
}
