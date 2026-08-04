import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Callout, Card, Tooltip } from '@/components/ui';
import type { Difficulty } from '@/types';
import { useTeamStore } from '@/store/useTeamStore';
import { useRoverStore } from '@/store/useRoverStore';
import { useSettingsStore } from '@/store/useSettingsStore';

const COLOURS = [
  { value: '#22d3ee', name: 'Cyan' },
  { value: '#f97316', name: 'Orange' },
  { value: '#a855f7', name: 'Purple' },
  { value: '#22c55e', name: 'Green' },
  { value: '#facc15', name: 'Yellow' },
  { value: '#f472b6', name: 'Pink' },
];

const AVATARS = ['🤖', '🛰️', '🚀', '⚙️', '🦾', '🧭', '🔭', '🛞'];

const DIFFICULTIES: { id: Difficulty; name: string; description: string }[] = [
  {
    id: 'explorer',
    name: 'Explorer',
    description: 'Clean sensors, generous time and energy. Best for a first workshop.',
  },
  {
    id: 'engineer',
    name: 'Engineer',
    description: 'Realistic sensor noise and energy use. The standard challenge.',
  },
  {
    id: 'expert',
    name: 'Expert',
    description: 'Noisy sensors, uncertain AI, tight budget. For competition rounds.',
  },
];

export default function TeamSetup() {
  const navigate = useNavigate();
  const createTeam = useTeamStore((state) => state.createTeam);
  const existingProfile = useTeamStore((state) => state.profile);
  const setColour = useRoverStore((state) => state.setColour);
  const educatorMode = useSettingsStore((state) => state.educatorMode);

  const [teamName, setTeamName] = useState('');
  const [schoolOrClass, setSchoolOrClass] = useState('');
  const [memberCount, setMemberCount] = useState(3);
  const [colour, setColourValue] = useState(COLOURS[0].value);
  const [avatar, setAvatar] = useState(AVATARS[0]);
  const [difficulty, setDifficulty] = useState<Difficulty>('engineer');
  const [error, setError] = useState<string | null>(null);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = teamName.trim();
    if (trimmed.length < 2) {
      setError('Please give your team a name of at least 2 characters.');
      return;
    }
    if (trimmed.length > 32) {
      setError('Team names can be at most 32 characters.');
      return;
    }
    createTeam({ teamName: trimmed, schoolOrClass: schoolOrClass.trim(), memberCount, colour, avatar, difficulty });
    setColour(colour);
    navigate('/command');
  };

  return (
    <div className="page" style={{ maxWidth: '56rem' }}>
      <p className="eyebrow">Step 1 of 4</p>
      <h1>Register your engineering team</h1>
      <p className="text-muted">
        Everything is saved only on this computer. You do not need an account, and we never ask for
        your real name.
      </p>

      {existingProfile ? (
        <Callout tone="warning" title="There is already a team saved on this device">
          Creating a new team will replace <strong>{existingProfile.teamName}</strong> and clear
          their mission progress.{' '}
          <Button size="sm" onClick={() => navigate('/command')}>
            Continue as {existingProfile.teamName} instead
          </Button>
        </Callout>
      ) : null}

      <form onSubmit={submit} className="stack" style={{ marginTop: 'var(--sp-4)' }}>
        <Card title="Team identity">
          <div className="grid grid--2">
            <div className="field">
              <label className="field__label" htmlFor="team-name">
                Team name
              </label>
              <input
                id="team-name"
                className="input"
                value={teamName}
                onChange={(event) => setTeamName(event.target.value)}
                placeholder="e.g. Circuit Breakers"
                maxLength={32}
                required
                autoFocus
              />
              <span className="field__hint">
                Choose a nickname, not anyone&apos;s real name.
              </span>
            </div>

            <div className="field">
              <label className="field__label" htmlFor="team-school">
                School or class (optional)
              </label>
              <input
                id="team-school"
                className="input"
                value={schoolOrClass}
                onChange={(event) => setSchoolOrClass(event.target.value)}
                placeholder="e.g. Sec 2E"
                maxLength={40}
              />
              <span className="field__hint">Used only on your printed certificate.</span>
            </div>

            <div className="field">
              <label className="field__label" htmlFor="team-size">
                Number of team members: {memberCount}
              </label>
              <input
                id="team-size"
                className="range"
                type="range"
                min={1}
                max={6}
                value={memberCount}
                onChange={(event) => setMemberCount(Number(event.target.value))}
              />
            </div>

            <fieldset className="field" style={{ border: 'none', padding: 0, margin: 0 }}>
              <legend className="field__label">Rover badge</legend>
              <div className="row" style={{ gap: 'var(--sp-2)' }}>
                {AVATARS.map((option) => (
                  <button
                    key={option}
                    type="button"
                    className={`btn${avatar === option ? ' btn--primary' : ''}`}
                    aria-pressed={avatar === option}
                    aria-label={`Rover badge ${option}`}
                    onClick={() => setAvatar(option)}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </fieldset>
          </div>

          <fieldset style={{ border: 'none', padding: 0, margin: 'var(--sp-4) 0 0' }}>
            <legend className="field__label">Rover colour</legend>
            <div className="row" style={{ gap: 'var(--sp-2)' }}>
              {COLOURS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className="btn"
                  aria-pressed={colour === option.value}
                  onClick={() => setColourValue(option.value)}
                  style={{
                    borderColor: colour === option.value ? option.value : undefined,
                    boxShadow: colour === option.value ? `0 0 0 2px ${option.value}` : undefined,
                  }}
                >
                  <span
                    aria-hidden="true"
                    style={{
                      width: '0.9rem',
                      height: '0.9rem',
                      borderRadius: 3,
                      background: option.value,
                      display: 'inline-block',
                    }}
                  />
                  {option.name}
                </button>
              ))}
            </div>
          </fieldset>
        </Card>

        <Card
          title={
            <>
              Difficulty
              <Tooltip text="Difficulty changes sensor noise, AI uncertainty, energy use and the time limit. You can change it later in the Command Centre." />
            </>
          }
        >
          <div className="grid grid--3">
            {DIFFICULTIES.map((option) => (
              <button
                key={option.id}
                type="button"
                className={`card card--interactive${difficulty === option.id ? ' card--selected' : ''}`}
                aria-pressed={difficulty === option.id}
                onClick={() => setDifficulty(option.id)}
              >
                <strong>{option.name}</strong>
                <p className="text-sm text-muted" style={{ margin: 'var(--sp-1) 0 0' }}>
                  {option.description}
                </p>
              </button>
            ))}
          </div>
        </Card>

        {educatorMode ? (
          <Callout tone="info" title="Educator Mode is on">
            Student results stay on this device. Use the Educator console to export a session
            summary at the end of the workshop.
          </Callout>
        ) : null}

        {error ? <p className="field__error">{error}</p> : null}

        <div className="row row--end">
          <Button variant="ghost" onClick={() => navigate('/')}>
            Back
          </Button>
          <Button type="submit" variant="primary" size="lg">
            Create team and enter Command Centre →
          </Button>
        </div>
      </form>
    </div>
  );
}
