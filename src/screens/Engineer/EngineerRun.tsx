import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Callout, Card, Stat, Switch } from '@/components/ui';
import type { SimulationSnapshot } from '@/types';
import { PhaserStage } from '@/game/phaser/PhaserStage';
import { SimulationRunner } from '@/game/engine/runner';
import { checkEngineerBuild, summariseBuild } from '@/engineer/catalogue';
import { nameKey, rankEntries } from '@/engineer/leaderboard';
import { ENGINEER_MAZE, createEngineerSimulationConfig } from '@/engineer/maze';
import { PLANNER_LABELS } from '@/engineer/navigation/navigator';
import { useEngineerSessionStore } from '@/store/useEngineerSessionStore';
import { useLeaderboardStore } from '@/store/useLeaderboardStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { createId, formatSeconds } from '@/utils/format';
import { TextGrid } from '@/screens/MissionSimulator/TextGrid';
import { useSessionClock } from './EngineerShell';

const SPEEDS = [1, 2, 4, 8];

export default function EngineerRun() {
  const navigate = useNavigate();
  const build = useEngineerSessionStore((state) => state.build);
  const navigation = useEngineerSessionStore((state) => state.navigation);
  const engineerName = useEngineerSessionStore((state) => state.engineerName);
  const runs = useEngineerSessionStore((state) => state.runs);
  const recordRun = useEngineerSessionStore((state) => state.recordRun);
  const entries = useLeaderboardStore((state) => state.entries);
  const submit = useLeaderboardStore((state) => state.submit);
  const reducedMotion = useSettingsStore((state) => state.reducedMotion);
  const { expired } = useSessionClock();

  const [snapshot, setSnapshot] = useState<SimulationSnapshot | null>(null);
  const [speed, setSpeed] = useState(4);
  const [phaserFailed, setPhaserFailed] = useState(false);
  const [useTextView, setUseTextView] = useState(false);
  const [posted, setPosted] = useState<boolean | null>(null);

  const runnerRef = useRef<SimulationRunner | null>(null);
  const pushToPhaser = useRef<((snapshot: SimulationSnapshot) => void) | null>(null);
  const recordedRef = useRef<number | null>(null);
  const expiredRef = useRef(expired);
  expiredRef.current = expired;
  const speedRef = useRef(speed);
  speedRef.current = speed;

  const buildErrors = useMemo(
    () => checkEngineerBuild(build).filter((problem) => problem.severity === 'error'),
    [build],
  );

  useEffect(() => {
    const runner = new SimulationRunner(createEngineerSimulationConfig(build, navigation));
    runner.setSpeed(speedRef.current);
    runnerRef.current = runner;
    recordedRef.current = null;
    setPosted(null);
    const unsubscribe = runner.subscribe((next) => {
      setSnapshot(next);
      pushToPhaser.current?.(next);
    });
    return () => {
      unsubscribe();
      runner.destroy();
      runnerRef.current = null;
    };
  }, [build, navigation]);

  // Record each finished run exactly once; only successful runs inside the window are posted.
  useEffect(() => {
    const result = snapshot?.result;
    if (!result || recordedRef.current === result.completedAt) return;
    recordedRef.current = result.completedAt;

    const summary = summariseBuild(build);
    recordRun({
      id: createId('run'),
      success: result.success,
      failureReason: result.failureReason,
      timeSeconds: result.telemetry.elapsedSeconds,
      collisions: result.telemetry.collisions,
      energyUsed: result.telemetry.energyUsed,
      steps: result.telemetry.ticks,
      computeMs: snapshot.navigation?.totalComputeMs ?? 0,
      planner: navigation.planner,
      buildSummary: summary,
      completedAt: result.completedAt,
    });

    const eligible = result.success && !expiredRef.current;
    setPosted(eligible);
    if (eligible) {
      submit({
        id: createId('entry'),
        name: engineerName,
        timeSeconds: result.telemetry.elapsedSeconds,
        collisions: result.telemetry.collisions,
        energyUsed: result.telemetry.energyUsed,
        planner: navigation.planner,
        buildSummary: summary,
        mapId: ENGINEER_MAZE.id,
        submittedAt: result.completedAt,
      });
    }
  }, [snapshot, build, navigation.planner, engineerName, recordRun, submit]);

  const handlePhaserReady = useCallback((push: (next: SimulationSnapshot) => void) => {
    pushToPhaser.current = push;
    const current = runnerRef.current?.simulation.getSnapshot();
    if (current) push(current);
  }, []);

  const handlePhaserFailure = useCallback((message: string) => {
    console.warn('[AMD Rover] Falling back to the text view:', message);
    setPhaserFailed(true);
  }, []);

  const rank = useMemo(() => {
    const index = rankEntries(entries).findIndex((entry) => nameKey(entry.name) === nameKey(engineerName));
    return index < 0 ? null : index + 1;
  }, [entries, engineerName]);

  if (!snapshot) return null;

  const finished = snapshot.phase === 'succeeded' || snapshot.phase === 'failed';
  const result = snapshot.result;
  const showTextView = useTextView || phaserFailed;
  const bestRun = runs.filter((run) => run.success).sort((a, b) => a.timeSeconds - b.timeSeconds)[0];

  return (
    <div className="stack">
      <div className="row row--between">
        <div>
          <p className="eyebrow">Step 2</p>
          <h1 style={{ marginBottom: 0 }}>{ENGINEER_MAZE.title}</h1>
          <p className="text-muted">
            {PLANNER_LABELS[navigation.planner]} · {summariseBuild(build)}
          </p>
        </div>
        <Button onClick={() => navigate('/engineer/build')}>🔧 Change build</Button>
      </div>

      {expired ? (
        <Callout tone="warning" title="Time is up">
          You can keep experimenting, but new runs no longer count for the leaderboard.
        </Callout>
      ) : null}
      {buildErrors.length > 0 ? (
        <Callout tone="danger" title="This build cannot run">
          {buildErrors.map((problem) => problem.message).join(' ')}
        </Callout>
      ) : null}

      {result ? (
        <Callout
          tone={result.success ? 'success' : 'danger'}
          title={result.success ? `Exit reached in ${result.telemetry.elapsedSeconds.toFixed(1)} s` : 'Run failed'}
        >
          {result.success ? (
            <p>
              {result.telemetry.collisions} collisions · {result.telemetry.energyUsed} energy used ·{' '}
              {result.telemetry.ticks} steps.{' '}
              {posted ? `Posted. Your best is ranked #${rank ?? '?'}.` : 'Not posted (session over).'}
            </p>
          ) : (
            <p>{result.failureReason}</p>
          )}
        </Callout>
      ) : null}

      <div className="simulator">
        <div className="stack">
          <div className="sim-stage">
            {showTextView ? (
              <TextGrid snapshot={snapshot} width={ENGINEER_MAZE.map.width} height={ENGINEER_MAZE.map.height} />
            ) : (
              <PhaserStage
                mapWidth={ENGINEER_MAZE.map.width}
                mapHeight={ENGINEER_MAZE.map.height}
                roverColour={build.colour}
                reducedMotion={reducedMotion}
                showSensorOverlay
                showDebug={false}
                onReady={handlePhaserReady}
                onFailure={handlePhaserFailure}
              />
            )}
          </div>

          <div className="sim-controls">
            <Button
              variant="primary"
              size="lg"
              disabled={finished || buildErrors.length > 0}
              onClick={() =>
                snapshot.phase === 'running' ? runnerRef.current?.pause() : runnerRef.current?.play()
              }
            >
              {snapshot.phase === 'running' ? '⏸ Pause' : '▶ Run'}
            </Button>
            <Button
              onClick={() => {
                runnerRef.current?.reset();
                recordedRef.current = null;
                setPosted(null);
              }}
            >
              ↺ Reset
            </Button>
            <div className="row" style={{ gap: 'var(--sp-1)' }} role="group" aria-label="Playback speed">
              {SPEEDS.map((option) => (
                <Button
                  key={option}
                  size="sm"
                  variant={speed === option ? 'primary' : 'default'}
                  onClick={() => {
                    setSpeed(option);
                    runnerRef.current?.setSpeed(option);
                  }}
                >
                  {option}×
                </Button>
              ))}
            </div>
            <div className="spacer" />
            <Switch checked={showTextView} onChange={setUseTextView} label="Text map" hint="Screen-reader friendly" />
          </div>

          <div className="sim-hud">
            <Stat label="Sim time" value={`${(snapshot.elapsedMs / 1000).toFixed(1)} s`} sub={`limit ${formatSeconds(ENGINEER_MAZE.timeLimit)}`} />
            <Stat label="Steps" value={snapshot.tick} />
            <Stat
              label="Collisions"
              value={snapshot.rover.collisions}
              tone={snapshot.rover.collisions > 0 ? 'warning' : undefined}
            />
            <Stat
              label="Energy"
              value={snapshot.rover.energy.toFixed(0)}
              sub={`of ${snapshot.rover.maxEnergy.toFixed(0)}`}
            />
            <Stat label="Compute" value={`${snapshot.navigation?.totalComputeMs ?? 0} ms`} />
          </div>
        </div>

        <aside className="stack">
          <Card title="Navigator">
            <p className="text-sm" aria-live="polite">
              {snapshot.decisionReason}
            </p>
            <p className="text-xs text-dim">
              Grey fog = unexplored. Yellow = current plan. Green = exit.
            </p>
          </Card>

          <Card title="Your runs" subtitle={bestRun ? `Best: ${bestRun.timeSeconds.toFixed(1)} s` : 'No finishes yet'}>
            {runs.length === 0 ? (
              <p className="text-sm text-dim">Press Run to start your first attempt.</p>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th scope="col">Result</th>
                    <th scope="col">Time</th>
                    <th scope="col">Planner</th>
                  </tr>
                </thead>
                <tbody>
                  {runs.slice(0, 10).map((run) => (
                    <tr key={run.id} title={run.buildSummary}>
                      <td>{run.success ? '✅' : '❌'}</td>
                      <td className="mono">{run.success ? `${run.timeSeconds.toFixed(1)} s` : '—'}</td>
                      <td className="text-xs">{PLANNER_LABELS[run.planner]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </aside>
      </div>
    </div>
  );
}
