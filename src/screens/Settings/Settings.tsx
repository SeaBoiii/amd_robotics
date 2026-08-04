import { useNavigate } from 'react-router-dom';
import { Button, Callout, Card, Stat, Switch } from '@/components/ui';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useTeamStore } from '@/store/useTeamStore';
import { clearAllState, getStorageUsageKb, isPersistenceAvailable } from '@/utils/storage';

export default function Settings() {
  const navigate = useNavigate();
  const settings = useSettingsStore();
  const resetProgress = useTeamStore((state) => state.resetProgress);

  return (
    <div className="stack" style={{ maxWidth: '52rem' }}>
      <div>
        <p className="eyebrow">Settings</p>
        <h1 style={{ marginBottom: 0 }}>Make the game work for you</h1>
      </div>

      <Card title="Accessibility">
        <div className="stack stack--tight">
          <Switch
            checked={settings.highContrast}
            onChange={(value) => settings.setAccessibility('highContrast', value)}
            label="High contrast"
            hint="Stronger borders and brighter text, for projectors and bright rooms."
          />
          <Switch
            checked={settings.colourBlindSafe}
            onChange={(value) => settings.setAccessibility('colourBlindSafe', value)}
            label="Colour-blind friendly palette"
            hint="Uses the Okabe–Ito palette. Shapes and icons always accompany colour anyway."
          />
          <Switch
            checked={settings.reducedMotion}
            onChange={(value) => settings.setAccessibility('reducedMotion', value)}
            label="Reduce motion"
            hint="Removes animation and makes the rover jump between tiles."
          />
          <Switch
            checked={settings.showCaptions}
            onChange={(value) => settings.setAccessibility('showCaptions', value)}
            label="Always show captions"
            hint="Keeps written explanations visible alongside every visual cue."
          />
          <Switch
            checked={settings.soundEnabled}
            onChange={(value) => settings.setAccessibility('soundEnabled', value)}
            label="Sound effects"
          />
        </div>

        <div className="field" style={{ marginTop: 'var(--sp-4)' }}>
          <label className="field__label" htmlFor="text-scale">
            Text size: {Math.round(settings.textScale * 100)}%
          </label>
          <input
            id="text-scale"
            className="range"
            type="range"
            min={0.85}
            max={1.5}
            step={0.05}
            value={settings.textScale}
            onChange={(event) =>
              settings.setAccessibility('textScale', Number(event.target.value))
            }
          />
        </div>
      </Card>

      <Card title="Your data" subtitle="Everything is stored on this device only">
        <div className="grid grid--2">
          <Stat
            label="Local storage used"
            value={`${getStorageUsageKb().toFixed(1)} KB`}
            sub="Roughly the size of a short email"
          />
          <Stat
            label="Saving to this device"
            value={isPersistenceAvailable() ? 'Working' : 'Unavailable'}
            tone={isPersistenceAvailable() ? 'success' : 'warning'}
            sub={
              isPersistenceAvailable()
                ? 'Your progress will be here next time'
                : 'Private browsing — progress is lost when you close the tab'
            }
          />
        </div>

        {!isPersistenceAvailable() ? (
          <Callout tone="warning" title="Progress will not be saved">
            This browser is blocking local storage, probably because of private browsing mode. The
            game still works, but export your notebook before you close the tab.
          </Callout>
        ) : null}

        <div className="row" style={{ marginTop: 'var(--sp-4)' }}>
          <Button
            variant="danger"
            onClick={() => {
              if (window.confirm('Clear mission progress for this team? Your team profile stays.')) {
                resetProgress();
              }
            }}
          >
            Clear mission progress
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              if (
                window.confirm(
                  'Delete absolutely everything saved on this device, including your team? This cannot be undone.',
                )
              ) {
                clearAllState();
                window.location.reload();
              }
            }}
          >
            Delete all saved data
          </Button>
        </div>
      </Card>

      <Card title="Educator mode">
        <Switch
          checked={settings.educatorMode}
          onChange={(value) => settings.setEducator('educatorMode', value)}
          label="Enable educator controls"
          hint="Adds the Educator console with facilitation tools and session export."
        />
        {settings.educatorMode ? (
          <Button style={{ marginTop: 'var(--sp-3)' }} onClick={() => navigate('/educator')}>
            Open Educator console →
          </Button>
        ) : null}
      </Card>

      <div className="row">
        <Button onClick={() => navigate(-1)}>← Back</Button>
        <Button variant="ghost" onClick={() => settings.resetSettings()}>
          Reset settings to defaults
        </Button>
      </div>
    </div>
  );
}
