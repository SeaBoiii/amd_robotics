import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, Callout, Card, EmptyState, Loading, Meter, Stat } from '@/components/ui';
import type { Mission, MissionResult } from '@/types';
import { BADGES_BY_ID } from '@/game/engine/scoring';
import { loadAllMissions } from '@/missions/loadMissions';
import { useTeamStore } from '@/store/useTeamStore';
import { formatDateTime, formatPercent, formatSeconds, humanise } from '@/utils/format';

const CATEGORY_LABELS: Record<string, { name: string; max: number; help: string }> = {
  completion: { name: 'Mission completion', max: 30, help: 'Did you achieve the objectives?' },
  aiAccuracy: { name: 'AI accuracy', max: 20, help: 'How often the model was right during the run.' },
  reliability: { name: 'Reliability', max: 15, help: 'Few collisions, no getting stuck.' },
  energy: { name: 'Energy efficiency', max: 10, help: 'Battery left at the end.' },
  time: { name: 'Time', max: 10, help: 'Speed matters, but only a little.' },
  safety: { name: 'Safety', max: 10, help: 'Avoiding hazards and protecting people.' },
  responsibleAi: {
    name: 'Responsible AI',
    max: 5,
    help: 'Asking a human instead of acting on a low-confidence guess.',
  },
};

export default function MissionReport() {
  const { missionId = '' } = useParams();
  const navigate = useNavigate();

  const results = useTeamStore((state) => state.results);
  const bestScores = useTeamStore((state) => state.bestScores);
  const addNotebookEntry = useTeamStore((state) => state.addNotebookEntry);
  const profile = useTeamStore((state) => state.profile);

  const [missions, setMissions] = useState<Mission[]>([]);
  const [reflection, setReflection] = useState({
    whatChanged: '',
    whyChanged: '',
    whatHappened: '',
    whatNext: '',
  });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    loadAllMissions()
      .then(setMissions)
      .catch(() => setMissions([]));
  }, []);

  const result: MissionResult | undefined = useMemo(
    () => results.find((item) => item.missionId === missionId),
    [results, missionId],
  );

  const mission = missions.find((item) => item.id === missionId) ?? null;
  const nextMission = mission ? missions.find((item) => item.index === mission.index + 1) : null;

  if (!result) {
    return (
      <EmptyState icon="📄" title="No report for this mission yet">
        <Button onClick={() => navigate(`/mission/${missionId}`)}>Run the mission</Button>
      </EmptyState>
    );
  }

  if (missions.length === 0) return <Loading message="Loading mission details…" />;

  const aiUsed = result.telemetry.predictionsMade > 0;
  const inRunAccuracy = aiUsed
    ? result.telemetry.correctPredictions / result.telemetry.predictionsMade
    : 0;

  const saveReflection = () => {
    addNotebookEntry({
      type: 'reflection',
      title: `Reflection — ${mission?.title ?? missionId}`,
      summary: reflection.whatChanged || 'Reflection recorded.',
      missionId,
      details: { Score: result.score.total, Attempt: result.attemptNumber },
      reflection,
    });
    setSaved(true);
  };

  return (
    <div className="stack">
      <div className="row row--between">
        <div>
          <p className="eyebrow">Mission report · attempt {result.attemptNumber}</p>
          <h1 style={{ marginBottom: 0 }}>{mission?.title ?? missionId}</h1>
          <p className="text-muted">
            {result.success ? 'Mission accomplished' : 'Mission not completed'} ·{' '}
            {formatDateTime(result.completedAt)} · {humanise(result.difficulty)} difficulty
          </p>
        </div>
        <Button className="no-print" onClick={() => window.print()}>
          🖨 Print
        </Button>
      </div>

      <Card>
        <div className="score-hero">
          <div
            className="score-ring"
            style={{ ['--pct' as string]: String(result.score.total) }}
            role="img"
            aria-label={`Score ${result.score.total} out of 100`}
          >
            <div className="score-ring__inner">
              <div>
                <div className="score-ring__value">{result.score.total}</div>
                <div className="text-xs text-dim">out of 100</div>
              </div>
            </div>
          </div>

          <div className="stack stack--tight" style={{ flex: 1, minWidth: '18rem' }}>
            <h2 style={{ margin: 0 }}>
              {result.success ? '🎉 Objectives achieved' : '🔧 Not there yet'}
            </h2>
            {!result.success && result.failureReason ? (
              <Callout tone="warning" title="What went wrong">
                {result.failureReason}
              </Callout>
            ) : null}
            <p className="text-sm text-muted">
              Best score for this mission so far: {bestScores[missionId] ?? result.score.total}/100.
              Speed is worth only 10 points — a careful, reliable rover always beats a fast,
              reckless one.
            </p>
          </div>
        </div>
      </Card>

      <div className="grid grid--2">
        <Card title="Score breakdown">
          <div className="score-breakdown">
            {Object.entries(CATEGORY_LABELS).map(([key, meta]) => {
              const value = result.score[key as keyof typeof result.score] as number;
              return (
                <div key={key} className="score-breakdown__row" title={meta.help}>
                  <span className="text-sm">{meta.name}</span>
                  <Meter
                    value={value}
                    max={meta.max}
                    tone={
                      value >= meta.max * 0.8
                        ? 'success'
                        : value >= meta.max * 0.4
                          ? 'warning'
                          : 'danger'
                    }
                    label={meta.name}
                  />
                  <span className="mono text-sm">
                    {value}/{meta.max}
                  </span>
                </div>
              );
            })}
          </div>
        </Card>

        <Card title="Run data">
          <div className="grid grid--2">
            <Stat label="Time taken" value={formatSeconds(result.telemetry.elapsedSeconds)} />
            <Stat label="Energy used" value={result.telemetry.energyUsed.toFixed(1)} />
            <Stat label="Energy left" value={result.telemetry.energyRemaining.toFixed(1)} />
            <Stat label="Distance" value={`${result.telemetry.distanceTravelled} tiles`} />
            <Stat
              label="Collisions"
              value={result.telemetry.collisions}
              tone={result.telemetry.collisions > 0 ? 'warning' : 'success'}
            />
            <Stat
              label="Hazards entered"
              value={result.telemetry.hazardsEntered}
              tone={result.telemetry.hazardsEntered > 0 ? 'danger' : 'success'}
            />
            <Stat label="Supplies delivered" value={result.telemetry.suppliesDelivered} />
            <Stat label="Targets found" value={result.telemetry.targetsFound} />
            <Stat
              label="AI accuracy in this run"
              value={aiUsed ? formatPercent(inRunAccuracy) : '—'}
              sub={aiUsed ? `${result.telemetry.correctPredictions}/${result.telemetry.predictionsMade}` : 'No AI used'}
            />
            <Stat
              label="Human checks"
              value={result.telemetry.humanInterventions}
              sub="Asking is good practice"
            />
          </div>
          <p className="text-xs text-dim">
            Seed {result.telemetry.seed} — running this mission again with the same rover, program
            and model will produce exactly the same result.
          </p>
        </Card>
      </div>

      <div className="grid grid--2">
        <Card title="Objectives">
          <ul className="stack stack--tight" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {result.objectives.map((objective) => (
              <li key={objective.objectiveId} className="row">
                <span aria-hidden="true">{objective.achieved ? '✅' : '❌'}</span>
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

        <Card title="Why the rover did what it did">
          {result.explanations.length === 0 ? (
            <p className="text-sm text-dim">No notable decisions were recorded.</p>
          ) : (
            <ol className="text-sm">
              {result.explanations.map((line, index) => (
                <li key={index}>{line}</li>
              ))}
            </ol>
          )}
        </Card>
      </div>

      {result.badgesEarned.length > 0 ? (
        <Card title="Badges earned">
          <div className="badge-grid">
            {result.badgesEarned.map((badgeId) => {
              const badge = BADGES_BY_ID.get(badgeId);
              if (!badge) return null;
              return (
                <div key={badgeId} className="badge-tile badge-tile--earned">
                  <span className="badge-tile__icon" aria-hidden="true">
                    {badge.icon}
                  </span>
                  <strong className="text-xs">{badge.name}</strong>
                  <p className="text-xs text-dim" style={{ margin: 0 }}>
                    {badge.description}
                  </p>
                </div>
              );
            })}
          </div>
        </Card>
      ) : null}

      <Card title="How to improve next time">
        {result.suggestions.length === 0 ? (
          <p className="text-sm">
            Excellent run — try a harder difficulty, or see whether you can score the same with a
            cheaper rover.
          </p>
        ) : (
          <ul>
            {result.suggestions.map((suggestion) => (
              <li key={suggestion}>{suggestion}</li>
            ))}
          </ul>
        )}
      </Card>

      <Card
        title="Engineering reflection"
        subtitle="Write this down while it is fresh. This is the part real engineers keep."
      >
        {mission?.reflectionQuestions.length ? (
          <ul className="text-sm text-muted">
            {mission.reflectionQuestions.map((question) => (
              <li key={question}>{question}</li>
            ))}
          </ul>
        ) : null}

        <div className="grid grid--2">
          {(
            [
              ['whatChanged', 'What did you change this time?'],
              ['whyChanged', 'Why did you think that would help?'],
              ['whatHappened', 'What actually happened?'],
              ['whatNext', 'What will you try next?'],
            ] as const
          ).map(([key, label]) => (
            <div className="field" key={key}>
              <label className="field__label" htmlFor={`reflect-${key}`}>
                {label}
              </label>
              <textarea
                id={`reflect-${key}`}
                className="textarea"
                rows={3}
                value={reflection[key]}
                onChange={(event) => {
                  setSaved(false);
                  setReflection((current) => ({ ...current, [key]: event.target.value }));
                }}
              />
            </div>
          ))}
        </div>

        <div className="row">
          <Button variant="primary" onClick={saveReflection}>
            📓 Save to Engineering Notebook
          </Button>
          {saved ? <span className="pill pill--success">Saved</span> : null}
        </div>
      </Card>

      <div className="row no-print">
        <Button onClick={() => navigate(`/mission/${missionId}`)}>↺ Try this mission again</Button>
        <Button onClick={() => navigate(`/programming?mission=${missionId}`)}>
          🧩 Improve the program
        </Button>
        <Button onClick={() => navigate('/workshop')}>🔧 Rebuild the rover</Button>
        <div className="spacer" />
        {nextMission && result.success ? (
          <Button variant="primary" onClick={() => navigate(`/mission/${nextMission.id}`)}>
            Next: {nextMission.title} →
          </Button>
        ) : (
          <Button variant="primary" onClick={() => navigate('/command')}>
            Back to Command Centre
          </Button>
        )}
      </div>

      <p className="text-xs text-dim">
        Report for {profile?.teamName}
        {profile?.schoolOrClass ? ` · ${profile.schoolOrClass}` : ''}. Generated on this device
        only.
      </p>
    </div>
  );
}
