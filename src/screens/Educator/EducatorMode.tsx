import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Callout, Card, Stat, Switch, Tabs } from '@/components/ui';
import { detectBrowserCapabilities } from '@/robotics/adapters';
import { toSessionCsv, toSessionSummary } from '@/educator/sessionExport';
import { useAIStore } from '@/store/useAIStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useTeamStore } from '@/store/useTeamStore';
import { downloadFile } from '@/utils/format';
import { getStorageUsageKb, isPersistenceAvailable } from '@/utils/storage';

type TabId = 'facilitation' | 'timing' | 'results' | 'troubleshooting';

const TIMINGS = [
  { phase: 'Welcome and story', minutes: 10, note: 'Landing screen and Mission 1 briefing.' },
  { phase: 'Team setup and Rover Workshop', minutes: 20, note: 'Missions 1 and 2.' },
  { phase: 'AI Lab — labelling and training', minutes: 30, note: 'The heart of the session.' },
  { phase: 'Programming Lab and Mission 3', minutes: 25, note: 'Rules plus AI together.' },
  { phase: 'Missions 4 and 5', minutes: 40, note: 'Responsible AI and the rescue challenge.' },
  { phase: 'Reflection and showcase', minutes: 15, note: 'Notebook export and team share-out.' },
];

export default function EducatorMode() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<TabId>('facilitation');

  const settings = useSettingsStore();
  const progress = useTeamStore();
  const model = useAIStore((state) => state.model);

  const capabilities = useMemo(() => detectBrowserCapabilities(), []);
  const totalMinutes = TIMINGS.reduce((sum, item) => sum + item.minutes, 0);

  const exportPayload = () => ({
    progress: {
      profile: progress.profile,
      completedMissionIds: progress.completedMissionIds,
      bestScores: progress.bestScores,
      attempts: progress.attempts,
      results: progress.results,
      badges: progress.badges,
      totalScore: progress.totalScore,
    },
    notebook: progress.notebook,
    exportedAt: Date.now(),
  });

  return (
    <div className="stack">
      <div className="row row--between">
        <div>
          <p className="eyebrow">Educator console</p>
          <h1 style={{ marginBottom: 0 }}>Run the workshop</h1>
          <p className="text-muted">
            Reliability first. If something has to give, give up sophistication, never a working
            session.
          </p>
        </div>
        <Button onClick={() => navigate('/command')}>← Command Centre</Button>
      </div>

      <Card>
        <div className="row row--between">
          <div>
            <strong>Workshop Safe Mode</strong>
            <p className="text-sm text-muted" style={{ margin: 0 }}>
              Turns on reduced motion, guarantees Instant Training is available, hides advanced
              controls and blocks over-budget builds. Use this for large groups and older
              hardware.
            </p>
          </div>
          <Button
            variant={settings.workshopSafeMode ? 'danger' : 'primary'}
            size="lg"
            onClick={() =>
              settings.workshopSafeMode
                ? settings.disableWorkshopSafeMode()
                : settings.enableWorkshopSafeMode()
            }
          >
            {settings.workshopSafeMode ? 'Turn off' : '🛟 Turn on'}
          </Button>
        </div>
      </Card>

      <Tabs
        ariaLabel="Educator sections"
        active={tab}
        onChange={setTab}
        tabs={[
          { id: 'facilitation', label: 'Facilitation controls' },
          { id: 'timing', label: 'Session timing' },
          { id: 'results', label: 'Results & export' },
          { id: 'troubleshooting', label: 'Troubleshooting' },
        ]}
      />

      {tab === 'facilitation' ? (
        <div className="educator-grid">
          <Card title="Controls">
            <div className="stack stack--tight">
              <Switch
                checked={settings.presentationMode}
                onChange={(value) => settings.setEducator('presentationMode', value)}
                label="Presentation mode"
                hint="Larger text and heavier contrast for projecting to a room."
              />
              <Switch
                checked={settings.showDebugOverlay}
                onChange={(value) => settings.setEducator('showDebugOverlay', value)}
                label="Debug overlay in the simulator"
                hint="Shows tick, position, active rule and live prediction. Excellent for demos."
              />
              <Switch
                checked={settings.instantTrainingAllowed}
                onChange={(value) => settings.setEducator('instantTrainingAllowed', value)}
                label="Allow Instant Training Mode"
                hint="A safety net so no team is ever blocked by a bad dataset."
              />
              <Switch
                checked={settings.unlockAllMissions}
                onChange={(value) => settings.setEducator('unlockAllMissions', value)}
                label="Unlock all missions"
                hint="Lets you jump straight to a mission when time is short."
              />
              <Switch
                checked={settings.allowAdvancedFeatures}
                onChange={(value) => settings.setEducator('allowAdvancedFeatures', value)}
                label="Show advanced features"
              />
            </div>

            <div className="field" style={{ marginTop: 'var(--sp-4)' }}>
              <label className="field__label" htmlFor="time-override">
                Time limit override:{' '}
                {settings.timeLimitOverrideSeconds > 0
                  ? `${settings.timeLimitOverrideSeconds}s`
                  : 'Use each mission’s own limit'}
              </label>
              <input
                id="time-override"
                className="range"
                type="range"
                min={0}
                max={300}
                step={15}
                value={settings.timeLimitOverrideSeconds}
                onChange={(event) =>
                  settings.setEducator('timeLimitOverrideSeconds', Number(event.target.value))
                }
              />
              <span className="field__hint">Set to 0 to leave missions as designed.</span>
            </div>
          </Card>

          <Card title="Talking points">
            <ul className="text-sm">
              <li>
                <strong>Before the AI Lab:</strong> ask what the rover would do if it had never
                seen flood water before. Then let them find out.
              </li>
              <li>
                <strong>After the first failure:</strong> point out that the event log shows exactly
                which rule fired. Debugging is reading, not guessing.
              </li>
              <li>
                <strong>Confidence thresholds:</strong> ask what an acceptable error rate would be
                if the rover were searching for a real person.
              </li>
              <li>
                <strong>Bias:</strong> whichever category a team under-labelled will be the one the
                model fails on. Make that link explicit.
              </li>
              <li>
                <strong>Scoring:</strong> speed is worth 10 points out of 100. Ask why the marking
                scheme was designed that way.
              </li>
            </ul>
          </Card>
        </div>
      ) : null}

      {tab === 'timing' ? (
        <Card title={`Suggested 2-hour plan (${totalMinutes} minutes)`}>
          <table className="table">
            <thead>
              <tr>
                <th scope="col">Phase</th>
                <th scope="col">Minutes</th>
                <th scope="col">Notes</th>
              </tr>
            </thead>
            <tbody>
              {TIMINGS.map((item) => (
                <tr key={item.phase}>
                  <td>{item.phase}</td>
                  <td className="mono">{item.minutes}</td>
                  <td className="text-sm text-muted">{item.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <Callout tone="info" title="Running short?">
            Turn on &quot;Unlock all missions&quot;, allow Instant Training, and go straight from
            Mission 2 to Mission 4. Missions 3 and 5 make good extension work.
          </Callout>
        </Card>
      ) : null}

      {tab === 'results' ? (
        <div className="stack">
          <div className="grid grid--4">
            <Stat label="Missions completed" value={progress.completedMissionIds.length} />
            <Stat label="Total attempts" value={progress.results.length} />
            <Stat label="Total score" value={progress.totalScore} />
            <Stat label="Badges" value={progress.badges.length} />
          </div>

          <Card title="Export" subtitle="Everything is generated locally and downloaded directly">
            <div className="row">
              <Button
                onClick={() =>
                  downloadFile('rover-session-summary.txt', toSessionSummary(exportPayload()), 'text/plain')
                }
              >
                ⬇ Session summary (text)
              </Button>
              <Button
                onClick={() =>
                  downloadFile('rover-session-results.csv', toSessionCsv(exportPayload()), 'text/csv')
                }
              >
                ⬇ Results (CSV)
              </Button>
            </div>
            <p className="text-xs text-dim">
              The CSV opens directly in Excel or Google Sheets for marking.
            </p>
          </Card>

          <Card title="Storage on this device">
            <div className="grid grid--2">
              <Stat label="Used" value={`${getStorageUsageKb().toFixed(1)} KB`} />
              <Stat
                label="Persistence"
                value={isPersistenceAvailable() ? 'Working' : 'Blocked'}
                tone={isPersistenceAvailable() ? 'success' : 'warning'}
              />
            </div>
          </Card>
        </div>
      ) : null}

      {tab === 'troubleshooting' ? (
        <div className="educator-grid">
          <Card title="This browser">
            <table className="table">
              <tbody>
                {Object.entries(capabilities).map(([key, value]) => (
                  <tr key={key}>
                    <th scope="row">{key}</th>
                    <td>
                      <span className={`pill ${value ? 'pill--success' : 'pill--warning'}`}>
                        {value ? 'Available' : 'Not available'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-xs text-dim">
              Web Serial and Web Bluetooth are only needed for the future physical-robot phase. The
              simulator does not require either.
            </p>
          </Card>

          <Card title="Common problems">
            <dl className="text-sm">
              <dt>
                <strong>The screen is blank or graphics look broken</strong>
              </dt>
              <dd>
                Toggle &quot;Text map&quot; in the simulator. It works on any machine and the
                simulation is identical.
              </dd>

              <dt>
                <strong>A team&apos;s model refuses to train</strong>
              </dt>
              <dd>
                They need at least five labelled samples across at least two categories. Use
                Instant Training Mode if time is short.
              </dd>

              <dt>
                <strong>Progress disappeared</strong>
              </dt>
              <dd>
                The browser is probably in private mode, or the device is shared and was cleared.
                Ask teams to export their notebook before packing up.
              </dd>

              <dt>
                <strong>The rover keeps running out of energy</strong>
              </dt>
              <dd>
                Motor power is the usual culprit. Dropping it from 100% to 60% roughly halves
                energy use.
              </dd>

              <dt>
                <strong>The rover does nothing</strong>
              </dt>
              <dd>
                Check for a rule above the catch-all that always matches. The Programming Lab
                flags unreachable rules with a warning.
              </dd>
            </dl>
          </Card>

          <Card title="AI status">
            <Stat
              label="Model on this device"
              value={model ? `v${model.version}${model.instant ? ' (instant)' : ''}` : 'None'}
              tone={model ? 'success' : 'warning'}
            />
          </Card>
        </div>
      ) : null}
    </div>
  );
}
