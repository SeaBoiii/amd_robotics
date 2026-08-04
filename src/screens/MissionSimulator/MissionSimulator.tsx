import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Button,
  Callout,
  Card,
  EmptyState,
  LabelChip,
  Loading,
  Meter,
  Modal,
  Stat,
  Switch,
} from '@/components/ui';
import type { Mission, SimulationSnapshot } from '@/types';
import { PhaserStage } from '@/game/phaser/PhaserStage';
import { SimulationRunner } from '@/game/engine/runner';
import { loadMission } from '@/missions/loadMissions';
import { validateProgram } from '@/program/validateProgram';
import { computeStats } from '@/robotics/components';
import { useAIStore } from '@/store/useAIStore';
import { useProgramStore } from '@/store/useProgramStore';
import { useRoverStore } from '@/store/useRoverStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useTeamStore } from '@/store/useTeamStore';
import { formatPercent, formatSeconds } from '@/utils/format';
import { TextGrid } from './TextGrid';

const SPEEDS = [0.5, 1, 2, 4];

export default function MissionSimulator() {
  const { missionId = '' } = useParams();
  const navigate = useNavigate();

  const [mission, setMission] = useState<Mission | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<SimulationSnapshot | null>(null);
  const [speed, setSpeed] = useState(1);
  const [briefingOpen, setBriefingOpen] = useState(true);
  const [hintIndex, setHintIndex] = useState(0);
  const [phaserFailed, setPhaserFailed] = useState(false);
  const [useTextView, setUseTextView] = useState(false);

  const runnerRef = useRef<SimulationRunner | null>(null);
  const pushToPhaser = useRef<((snapshot: SimulationSnapshot) => void) | null>(null);
  const recordedRef = useRef<string | null>(null);

  const build = useRoverStore((state) => state.build);
  const model = useAIStore((state) => state.model);
  const confidencePolicy = useAIStore((state) => state.confidencePolicy);
  const getProgram = useProgramStore((state) => state.getProgram);
  const profile = useTeamStore((state) => state.profile);
  const attemptsFor = useTeamStore((state) => state.attemptsFor);
  const recordResult = useTeamStore((state) => state.recordResult);

  const reducedMotion = useSettingsStore((state) => state.reducedMotion);
  const showDebugOverlay = useSettingsStore((state) => state.showDebugOverlay);
  const timeLimitOverride = useSettingsStore((state) => state.timeLimitOverrideSeconds);

  const stats = useMemo(() => computeStats(build), [build]);

  useEffect(() => {
    let active = true;
    setMission(null);
    setLoadError(null);
    loadMission(missionId)
      .then((loaded) => active && setMission(loaded))
      .catch((cause: unknown) =>
        active ? setLoadError(cause instanceof Error ? cause.message : String(cause)) : undefined,
      );
    return () => {
      active = false;
    };
  }, [missionId]);

  // Build the runner once per mission + configuration.
  useEffect(() => {
    if (!mission || !profile) return;

    const runner = new SimulationRunner({
      mission,
      program: getProgram(mission.id),
      build,
      model,
      confidencePolicy,
      difficulty: profile.difficulty,
      attemptNumber: attemptsFor(mission.id) + 1,
      previouslyFailed: attemptsFor(mission.id) > 0,
      timeLimitOverride: timeLimitOverride,
    });

    runnerRef.current = runner;
    recordedRef.current = null;

    const unsubscribe = runner.subscribe((next) => {
      setSnapshot(next);
      pushToPhaser.current?.(next);
    });

    return () => {
      unsubscribe();
      runner.destroy();
      runnerRef.current = null;
    };
    // Deliberately excludes `snapshot`; the runner owns its own lifecycle.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mission, profile?.difficulty, build, model, confidencePolicy, timeLimitOverride]);

  // Record the result exactly once when a run finishes.
  useEffect(() => {
    if (!snapshot?.result) return;
    const key = `${snapshot.result.missionId}:${snapshot.result.completedAt}`;
    if (recordedRef.current === key) return;
    recordedRef.current = key;
    recordResult(snapshot.result);
  }, [snapshot?.result, recordResult]);

  const handlePhaserReady = useCallback((push: (next: SimulationSnapshot) => void) => {
    pushToPhaser.current = push;
    const current = runnerRef.current?.simulation.getSnapshot();
    if (current) push(current);
  }, []);

  const handlePhaserFailure = useCallback((message: string) => {
    console.warn('[AMD Rover] Falling back to the text view:', message);
    setPhaserFailed(true);
  }, []);

  const validation = useMemo(() => {
    if (!mission || !profile) return null;
    return validateProgram({
      program: getProgram(mission.id),
      mission,
      fittedSensors: stats.sensorTypes,
      hasTrainedModel: Boolean(model),
    });
  }, [mission, profile, getProgram, stats.sensorTypes, model]);

  if (loadError) {
    return (
      <Callout tone="danger" title="This mission could not be loaded">
        <p>{loadError}</p>
        <Button onClick={() => navigate('/command')}>← Back to Command Centre</Button>
      </Callout>
    );
  }

  if (!mission || !snapshot) return <Loading message="Preparing the mission area…" />;

  const blockingIssues = validation?.issues.filter((issue) => issue.severity === 'error') ?? [];
  const finished = snapshot.phase === 'succeeded' || snapshot.phase === 'failed';
  const energyPercent =
    snapshot.rover.maxEnergy === 0 ? 0 : (snapshot.rover.energy / snapshot.rover.maxEnergy) * 100;
  const timeLimit = timeLimitOverride > 0 ? timeLimitOverride : mission.timeLimit;
  const showTextView = useTextView || phaserFailed;

  return (
    <div className="stack">
      <div className="row row--between">
        <div>
          <p className="eyebrow">
            Mission {mission.index} · attempt {attemptsFor(mission.id) + 1}
          </p>
          <h1 style={{ marginBottom: 0 }}>{mission.title}</h1>
          <p className="text-muted">{mission.subtitle}</p>
        </div>
        <div className="row">
          <Button onClick={() => setBriefingOpen(true)}>📋 Briefing</Button>
          <Button onClick={() => navigate(`/programming?mission=${mission.id}`)}>
            🧩 Edit program
          </Button>
          <Button onClick={() => navigate('/command')}>← Command Centre</Button>
        </div>
      </div>

      {blockingIssues.length > 0 ? (
        <Callout tone="danger" title="Your program has problems that must be fixed first">
          <ul>
            {blockingIssues.map((issue) => (
              <li key={issue.message}>
                {issue.message} — {issue.hint}
              </li>
            ))}
          </ul>
        </Callout>
      ) : null}

      {mission.requiresAI && !model ? (
        <Callout tone="warning" title="This mission needs a trained AI model">
          Without one the camera returns nothing and every AI rule will be skipped.{' '}
          <Button size="sm" onClick={() => navigate('/ai-lab')}>
            Go to the AI Lab
          </Button>
        </Callout>
      ) : null}

      <div className="simulator">
        <div className="stack">
          <div className="sim-stage">
            {showTextView ? (
              <TextGrid snapshot={snapshot} width={mission.map.width} height={mission.map.height} />
            ) : (
              <PhaserStage
                mapWidth={mission.map.width}
                mapHeight={mission.map.height}
                roverColour={build.colour}
                reducedMotion={reducedMotion}
                showSensorOverlay
                showDebug={showDebugOverlay}
                onReady={handlePhaserReady}
                onFailure={handlePhaserFailure}
              />
            )}

            {showDebugOverlay ? (
              <div className="debug-overlay">
                <div>tick {snapshot.tick}</div>
                <div>
                  pos {snapshot.rover.x},{snapshot.rover.y} {snapshot.rover.heading}
                </div>
                <div>energy {snapshot.rover.energy.toFixed(1)}</div>
                <div>rule {snapshot.activeRule?.name ?? '—'}</div>
                {snapshot.prediction ? (
                  <div>
                    ai {snapshot.prediction.label} {formatPercent(snapshot.prediction.confidence)}
                    {snapshot.predictionCorrect === false ? ' ✗' : ''}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>

          {phaserFailed ? (
            <Callout tone="warning" title="Graphics could not start on this computer">
              The game has switched to the text map, which works everywhere. Everything else
              behaves exactly the same.
            </Callout>
          ) : null}

          <div className="sim-controls">
            <Button
              variant="primary"
              size="lg"
              disabled={blockingIssues.length > 0 || finished}
              onClick={() =>
                snapshot.phase === 'running'
                  ? runnerRef.current?.pause()
                  : runnerRef.current?.play()
              }
            >
              {snapshot.phase === 'running' ? '⏸ Pause' : '▶ Run'}
            </Button>
            <Button disabled={finished} onClick={() => runnerRef.current?.step()}>
              ⏭ Step once
            </Button>
            <Button
              onClick={() => {
                runnerRef.current?.reset();
                recordedRef.current = null;
              }}
            >
              ↺ Reset
            </Button>

            <div className="row" style={{ gap: 'var(--sp-1)' }} role="group" aria-label="Speed">
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
            <Switch
              checked={showTextView}
              onChange={setUseTextView}
              label="Text map"
              hint="Screen-reader friendly"
            />
          </div>

          <div className="sim-hud">
            <Stat
              label="Energy"
              value={`${snapshot.rover.energy.toFixed(0)}`}
              sub={`of ${snapshot.rover.maxEnergy.toFixed(0)}`}
              tone={energyPercent < 20 ? 'danger' : energyPercent < 40 ? 'warning' : undefined}
            />
            <Stat
              label="Time"
              value={formatSeconds(snapshot.elapsedMs / 1000)}
              sub={`limit ${formatSeconds(timeLimit)}`}
            />
            <Stat label="Carrying" value={snapshot.rover.carrying} sub="packages" />
            <Stat
              label="Collisions"
              value={snapshot.rover.collisions}
              tone={snapshot.rover.collisions > 0 ? 'warning' : undefined}
            />
            <Stat label="Steps" value={snapshot.tick} />
          </div>

          <Meter
            value={energyPercent}
            tone={energyPercent < 20 ? 'danger' : energyPercent < 40 ? 'warning' : 'success'}
            label="Battery remaining"
          />
        </div>

        <aside className="stack">
          <Card title="What the rover is thinking">
            <p className="text-sm" aria-live="polite">
              {snapshot.decisionReason}
            </p>

            {snapshot.activeRule ? (
              <div className="pill pill--info">🧩 {snapshot.activeRule.name}</div>
            ) : null}

            {snapshot.prediction ? (
              <div style={{ marginTop: 'var(--sp-3)' }}>
                <div className="row row--between text-sm">
                  <LabelChip label={snapshot.prediction.label} />
                  <span className="mono">{formatPercent(snapshot.prediction.confidence)}</span>
                </div>
                <Meter
                  value={snapshot.prediction.confidence * 100}
                  tone={
                    snapshot.prediction.confidence >= confidencePolicy.actAbove
                      ? 'success'
                      : snapshot.prediction.confidence >= confidencePolicy.verifyAbove
                        ? 'warning'
                        : 'danger'
                  }
                  label="Prediction confidence"
                />
                <p className="text-xs text-dim">
                  {snapshot.prediction.confidence >= confidencePolicy.actAbove
                    ? 'Confident enough to act on its own.'
                    : snapshot.prediction.confidence >= confidencePolicy.verifyAbove
                      ? 'Not fully sure — slowing down to double-check.'
                      : 'Too unsure to act. This is when a human should be asked.'}
                </p>
              </div>
            ) : (
              <p className="text-xs text-dim">No camera reading this step.</p>
            )}
          </Card>

          <Card title="Objectives">
            <ul className="stack stack--tight" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {snapshot.objectives.map((objective) => (
                <li key={objective.objectiveId} className="row" style={{ gap: 'var(--sp-2)' }}>
                  <span aria-hidden="true">{objective.achieved ? '✅' : '⬜'}</span>
                  <span className="text-sm" style={{ flex: 1 }}>
                    {objective.description}
                  </span>
                  <span className="mono text-xs text-dim">
                    {objective.progress}/{objective.target}
                  </span>
                </li>
              ))}
            </ul>
          </Card>

          <Card title="Sensor readings">
            {snapshot.readings.length === 0 && stats.sensorTypes.length === 0 ? (
              <EmptyState icon="📡" title="No sensors fitted">
                Add a sensor in the Rover Workshop so the rover can see.
              </EmptyState>
            ) : snapshot.readings.length === 0 ? (
              <EmptyState icon="📡" title="Waiting for the first reading">
                {stats.sensorTypes.join(', ')} fitted. Press Run or Step once to take a reading.
              </EmptyState>
            ) : (
              <table className="table">
                <tbody>
                  {snapshot.readings.map((reading) => (
                    <tr key={reading.type}>
                      <th scope="row">{reading.type}</th>
                      <td className="mono">
                        {typeof reading.value === 'number'
                          ? reading.value.toFixed(2)
                          : String(reading.value)}
                      </td>
                      <td className="text-xs text-dim">{reading.unit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>

          <Card
            title="Event log"
            actions={
              <Button size="sm" variant="ghost" onClick={() => setHintIndex((i) => i + 1)}>
                💡 Hint
              </Button>
            }
          >
            {hintIndex > 0 ? (
              <Callout tone="info" title={`Hint ${Math.min(hintIndex, mission.hints.length)}`}>
                {mission.hints[Math.min(hintIndex, mission.hints.length) - 1] ??
                  'No more hints — try changing one rule at a time and re-running.'}
              </Callout>
            ) : null}

            <div className="event-log" role="log" aria-live="off">
              {snapshot.events
                .slice(-60)
                .reverse()
                .map((event, index) => (
                  <div
                    key={`${event.tick}-${index}`}
                    className={`event-log__row event-log__row--${event.kind}`}
                  >
                    <span className="event-log__tick">{event.tick}</span>
                    <span>{event.message}</span>
                  </div>
                ))}
            </div>
          </Card>
        </aside>
      </div>

      <Modal
        open={finished}
        onClose={() => undefined}
        title={snapshot.phase === 'succeeded' ? '🎉 Mission complete' : '🔧 Mission failed'}
        footer={
          <>
            <Button
              onClick={() => {
                runnerRef.current?.reset();
                recordedRef.current = null;
              }}
            >
              ↺ Try again
            </Button>
            <Button variant="primary" onClick={() => navigate(`/report/${mission.id}`)}>
              View mission report →
            </Button>
          </>
        }
      >
        {snapshot.result ? (
          <div className="stack stack--tight">
            <p>
              {snapshot.result.success
                ? `You scored ${snapshot.result.score.total} out of 100.`
                : (snapshot.result.failureReason ?? 'The rover did not finish the mission.')}
            </p>
            {!snapshot.result.success ? (
              <Callout tone="info" title="Failing is part of engineering">
                Real robotics teams fail dozens of times before a mission works. Read the
                suggestions in the report and change one thing.
              </Callout>
            ) : null}
          </div>
        ) : null}
      </Modal>

      <Modal
        open={briefingOpen}
        onClose={() => setBriefingOpen(false)}
        title={`Mission ${mission.index}: ${mission.title}`}
        footer={
          <Button variant="primary" onClick={() => setBriefingOpen(false)}>
            Understood — let&apos;s go
          </Button>
        }
      >
        <div className="stack stack--tight">
          <p>{mission.story}</p>
          <h3>What you must do</h3>
          <ul>
            {mission.objectives.map((objective) => (
              <li key={objective.id}>
                {objective.description}
                {objective.required ? '' : ' (bonus)'}
              </li>
            ))}
          </ul>
          <h3>What you will learn</h3>
          <ul>
            {mission.learningObjectives.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <p className="text-sm text-dim">
            Budget {mission.budget} credits · Time limit {formatSeconds(timeLimit)} · Seed{' '}
            {mission.seed} (runs are repeatable)
          </p>
        </div>
      </Modal>
    </div>
  );
}
