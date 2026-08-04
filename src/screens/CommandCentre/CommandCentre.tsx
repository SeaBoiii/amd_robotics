import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Callout, Card, EmptyState, Loading, Meter, Stat, Tooltip } from '@/components/ui';
import type { Mission } from '@/types';
import { BADGES } from '@/game/engine/scoring';
import { loadAllMissions, MissionLoadError } from '@/missions/loadMissions';
import { useAIStore } from '@/store/useAIStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useTeamStore } from '@/store/useTeamStore';
import { formatDateTime } from '@/utils/format';

export default function CommandCentre() {
  const navigate = useNavigate();
  const [missions, setMissions] = useState<Mission[] | null>(null);
  const [error, setError] = useState<{ message: string; details: string[] } | null>(null);

  const profile = useTeamStore((state) => state.profile);
  const completed = useTeamStore((state) => state.completedMissionIds);
  const bestScores = useTeamStore((state) => state.bestScores);
  const attempts = useTeamStore((state) => state.attempts);
  const badges = useTeamStore((state) => state.badges);
  const results = useTeamStore((state) => state.results);
  const totalScore = useTeamStore((state) => state.totalScore);
  const setDifficulty = useTeamStore((state) => state.setDifficulty);

  const model = useAIStore((state) => state.model);
  const unlockAll = useSettingsStore((state) => state.unlockAllMissions);

  useEffect(() => {
    let active = true;
    loadAllMissions()
      .then((loaded) => active && setMissions(loaded))
      .catch((cause: unknown) => {
        if (!active) return;
        const missionError = cause instanceof MissionLoadError ? cause : null;
        setError({
          message: missionError?.message ?? 'The mission list could not be loaded.',
          details: missionError?.details ?? [String(cause)],
        });
      });
    return () => {
      active = false;
    };
  }, []);

  const progressPercent = useMemo(() => {
    if (!missions || missions.length === 0) return 0;
    return (completed.length / missions.length) * 100;
  }, [missions, completed.length]);

  const isUnlocked = (index: number): boolean => {
    if (unlockAll || index === 0) return true;
    const previous = missions?.[index - 1];
    return previous ? completed.includes(previous.id) : false;
  };

  if (error) {
    return (
      <Callout tone="danger" title="Missions could not be loaded">
        <p>{error.message}</p>
        {error.details.length > 0 ? (
          <ul className="text-xs mono">
            {error.details.map((detail) => (
              <li key={detail}>{detail}</li>
            ))}
          </ul>
        ) : null}
        <Button size="sm" onClick={() => window.location.reload()}>
          Try again
        </Button>
      </Callout>
    );
  }

  if (!missions) return <Loading message="Loading mission briefings…" />;

  return (
    <div className="stack">
      <div className="row row--between">
        <div>
          <p className="eyebrow">Command Centre</p>
          <h1 style={{ marginBottom: 0 }}>
            <span aria-hidden="true">{profile?.avatar} </span>
            {profile?.teamName}
          </h1>
          <p className="text-muted">
            {completed.length} of {missions.length} missions complete
            {profile?.schoolOrClass ? ` · ${profile.schoolOrClass}` : ''}
          </p>
        </div>
        <div className="row">
          <div className="field" style={{ minWidth: '12rem' }}>
            <label className="field__label" htmlFor="difficulty">
              Difficulty
            </label>
            <select
              id="difficulty"
              className="select"
              value={profile?.difficulty ?? 'engineer'}
              onChange={(event) =>
                setDifficulty(event.target.value as NonNullable<typeof profile>['difficulty'])
              }
            >
              <option value="explorer">Explorer — gentler</option>
              <option value="engineer">Engineer — standard</option>
              <option value="expert">Expert — competition</option>
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid--4">
        <Stat label="Total score" value={totalScore} sub="Best score per mission, added up" />
        <Stat label="Badges earned" value={`${badges.length}/${BADGES.length}`} />
        <Stat
          label="AI model"
          value={model ? `v${model.version}` : 'None'}
          sub={
            model
              ? `${(model.metrics.accuracy * 100).toFixed(0)}% accurate${model.instant ? ' · instant' : ''}`
              : 'Train one in the AI Lab'
          }
          tone={model ? undefined : 'warning'}
        />
        <Stat
          label="Attempts made"
          value={Object.values(attempts).reduce((sum, value) => sum + value, 0)}
          sub="Failing and retrying is how engineering works"
        />
      </div>

      <div>
        <div className="row row--between" style={{ marginBottom: 'var(--sp-2)' }}>
          <strong className="text-sm">Campaign progress</strong>
          <span className="text-sm text-muted">{progressPercent.toFixed(0)}%</span>
        </div>
        <Meter value={progressPercent} tone="success" label="Campaign progress" />
      </div>

      <section>
        <h2>Missions</h2>
        <div className="mission-grid">
          {missions.map((mission, index) => {
            const unlocked = isUnlocked(index);
            const done = completed.includes(mission.id);
            const best = bestScores[mission.id];
            const needsModel = mission.requiresAI && !model;

            return (
              <button
                key={mission.id}
                type="button"
                disabled={!unlocked}
                onClick={() => navigate(`/mission/${mission.id}`)}
                className={`card card--interactive mission-card${done ? ' mission-card--done' : ''}${
                  unlocked ? '' : ' mission-card--locked'
                }`}
              >
                <div className="row" style={{ alignItems: 'flex-start' }}>
                  <span className="mission-card__index" aria-hidden="true">
                    {done ? '✓' : unlocked ? mission.index : '🔒'}
                  </span>
                  <div style={{ flex: 1 }}>
                    <strong>{mission.title}</strong>
                    <div className="text-sm text-muted">{mission.subtitle}</div>
                  </div>
                </div>

                <p className="text-sm" style={{ margin: 0 }}>
                  {mission.description}
                </p>

                <div className="row" style={{ gap: 'var(--sp-2)' }}>
                  {mission.requiresAI ? (
                    <span className={`pill ${needsModel ? 'pill--warning' : 'pill--info'}`}>
                      🧠 {needsModel ? 'Needs a trained model' : 'Uses AI'}
                    </span>
                  ) : null}
                  <span className="pill pill--muted">💰 {mission.budget} credits</span>
                  <span className="pill pill--muted">⏱ {mission.timeLimit}s</span>
                  {best !== undefined ? (
                    <span className="pill pill--success">🏅 Best {best}/100</span>
                  ) : null}
                  {attempts[mission.id] ? (
                    <span className="pill pill--muted">{attempts[mission.id]} attempt(s)</span>
                  ) : null}
                </div>

                {!unlocked ? (
                  <p className="text-xs text-dim" style={{ margin: 0 }}>
                    Complete mission {mission.index - 1} to unlock this one.
                  </p>
                ) : null}
              </button>
            );
          })}
        </div>
      </section>

      <div className="grid grid--2">
        <Card
          title={
            <>
              Badges
              <Tooltip text="Badges reward good engineering habits, not just high scores." />
            </>
          }
        >
          <div className="badge-grid">
            {BADGES.map((badge) => {
              const earned = badges.includes(badge.id);
              return (
                <div
                  key={badge.id}
                  className={`badge-tile${earned ? ' badge-tile--earned' : ''}`}
                  title={earned ? badge.description : badge.howToEarn}
                >
                  <span className="badge-tile__icon" aria-hidden="true">
                    {badge.icon}
                  </span>
                  <strong className="text-xs">{badge.name}</strong>
                  <p className="text-xs text-dim" style={{ margin: 0 }}>
                    {earned ? badge.description : badge.howToEarn}
                  </p>
                </div>
              );
            })}
          </div>
        </Card>

        <Card title="Recent attempts" subtitle="Your local score history for this device">
          {results.length === 0 ? (
            <EmptyState icon="📊" title="No attempts yet">
              Run a mission and your results will appear here.
            </EmptyState>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">Mission</th>
                  <th scope="col">Result</th>
                  <th scope="col">Score</th>
                  <th scope="col">When</th>
                </tr>
              </thead>
              <tbody>
                {results.slice(0, 8).map((result, index) => (
                  <tr key={`${result.missionId}-${result.completedAt}-${index}`}>
                    <td>{missions.find((m) => m.id === result.missionId)?.title ?? result.missionId}</td>
                    <td>
                      <span className={`pill ${result.success ? 'pill--success' : 'pill--danger'}`}>
                        {result.success ? '✓ Passed' : '✕ Failed'}
                      </span>
                    </td>
                    <td className="mono">{result.score.total}</td>
                    <td className="text-xs text-dim">{formatDateTime(result.completedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>

      <div className="row">
        <Button onClick={() => navigate('/workshop')}>🔧 Rover Workshop</Button>
        <Button onClick={() => navigate('/ai-lab')}>🧠 AI Lab</Button>
        <Button onClick={() => navigate('/notebook')}>📓 Engineering Notebook</Button>
        <Button variant="ghost" onClick={() => navigate('/amd')}>
          ⚡ AMD Technology Corner
        </Button>
      </div>
    </div>
  );
}
