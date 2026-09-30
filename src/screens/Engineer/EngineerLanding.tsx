import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button, Callout, Card } from '@/components/ui';
import { nameKey } from '@/engineer/leaderboard';
import { generateEngineerName } from '@/engineer/names';
import { useEngineerSessionStore } from '@/store/useEngineerSessionStore';
import { useLeaderboardStore } from '@/store/useLeaderboardStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { formatSeconds } from '@/utils/format';
import { useSessionClock } from './EngineerShell';
import { OnScreenKeyboard } from './TouchControls';

const MAX_NAME = 24;

export default function EngineerLanding() {
  const navigate = useNavigate();
  const minutes = useSettingsStore((state) => state.engineerSessionMinutes);
  const engineerName = useEngineerSessionStore((state) => state.engineerName);
  const startSession = useEngineerSessionStore((state) => state.startSession);
  const endSession = useEngineerSessionStore((state) => state.endSession);
  const entries = useLeaderboardStore((state) => state.entries);
  const { active, remaining, expired } = useSessionClock();
  const justExpired = useEngineerSessionStore((state) => state.endedByTimeout);
  const acknowledgeTimeout = useEngineerSessionStore((state) => state.acknowledgeTimeout);
  const [name, setName] = useState(() =>
    generateEngineerName(useLeaderboardStore.getState().entries.map((entry) => entry.name)),
  );
  const [keyboardOpen, setKeyboardOpen] = useState(false);

  const trimmed = name.trim();
  const nameTaken = useMemo(
    () => trimmed.length > 0 && entries.some((entry) => nameKey(entry.name) === nameKey(trimmed)),
    [entries, trimmed],
  );

  return (
    <div className="engineer-landing">
      <div className="stack">
        <div>
          <p className="eyebrow">Engineer Challenge</p>
          <h1 className="landing__title">Build it. Tune it. Beat the maze.</h1>
          <p className="landing__lede">
            Unlimited budget, one unmapped maze, {minutes} minutes. Your rover starts blind: it must
            detect walls and hidden obstacles with its sensors, plan a route, and replan as it
            learns. The fastest simulated time to the exit tops the leaderboard.
          </p>
        </div>

        <Card title="Rules">
          <ul style={{ margin: 0 }}>
            <li>Every part adds mass. Heavier rovers are slower; bigger motors drain batteries.</li>
            <li>Planning is not free: search time on your compute module is added to the clock.</li>
            <li>Run as often as you like. Your best successful run is posted automatically.</li>
            <li>Ranking: time, then fewest collisions, then least energy.</li>
            <li>When the timer runs out the session ends, wherever you are.</li>
          </ul>
        </Card>

        <p className="text-sm text-dim" style={{ margin: 0 }}>
          <Link to="/">← Back to the student challenge</Link>
        </p>
      </div>

      <div className="stack">
      {active && !expired ? (
        <Callout tone="info" title={`Session in progress: ${engineerName}`}>
          <p>{formatSeconds(remaining / 1000)} left.</p>
          <div className="row">
            <Button variant="primary" onClick={() => navigate('/engineer/build')}>
              Continue
            </Button>
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
              acknowledgeTimeout();
              startSession(trimmed, minutes * 60);
              navigate('/engineer/build');
            }}
          >
            {justExpired ? (
              <Callout tone="warning" title="Time is up">
                That session has ended. Any run you finished in time is on the leaderboard.
              </Callout>
            ) : null}
            <div className="field">
              <label className="field__label" htmlFor="engineer-name">
                Engineer name
              </label>
              <input
                id="engineer-name"
                className="input engineer-name"
                value={name}
                maxLength={MAX_NAME}
                autoComplete="off"
                // Suppress the OS keyboard on touch screens; a physical keyboard still works.
                inputMode="none"
                onChange={(event) => setName(event.target.value)}
              />
              {nameTaken ? (
                <span className="field__hint">
                  This name is already on the leaderboard. It will only be updated by a faster run.
                </span>
              ) : null}
            </div>
            <div className="row">
              <Button
                onClick={() => setName(generateEngineerName(entries.map((entry) => entry.name)))}
              >
                🎲 New name
              </Button>
              <Button aria-pressed={keyboardOpen} onClick={() => setKeyboardOpen((open) => !open)}>
                ⌨ {keyboardOpen ? 'Hide keyboard' : 'Type my own'}
              </Button>
            </div>
            {keyboardOpen ? (
              <OnScreenKeyboard value={name} onChange={setName} maxLength={MAX_NAME} />
            ) : null}
            <div className="row">
              <Button type="submit" variant="primary" size="lg" disabled={!trimmed}>
                ⏱ Start {minutes}-minute session
              </Button>
              <Link to="/engineer/leaderboard">View leaderboard</Link>
            </div>
          </form>
        </Card>
      )}
      </div>
    </div>
  );
}
