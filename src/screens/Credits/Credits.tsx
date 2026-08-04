import { Link } from 'react-router-dom';
import { Card } from '@/components/ui';
import { useBranding } from '@/hooks/useBranding';
import { PERFORMANCE_DISCLAIMER } from '@/content/amdContent';

export default function Credits() {
  const branding = useBranding();

  return (
    <div className="page" style={{ maxWidth: '46rem' }}>
      <p className="eyebrow">Credits &amp; privacy</p>
      <h1>About this game</h1>

      <div className="stack">
        <Card title="Privacy — the short version">
          <ul>
            <li>No account is needed and no login exists.</li>
            <li>
              Nothing you type or do is sent to any server. There is no analytics, no tracking and
              no telemetry.
            </li>
            <li>
              Your team name, rover build, AI model and notebook are stored in this browser&apos;s
              local storage on this computer only.
            </li>
            <li>
              Clearing your browser data, or using the &quot;Delete all saved data&quot; button in{' '}
              <Link to="/settings">Settings</Link>, removes everything permanently.
            </li>
            <li>
              We ask for a team nickname rather than real names, and the school or class field is
              optional.
            </li>
          </ul>
        </Card>

        <Card title="About the AI">
          <p>
            The classifier in the AI Lab is a real multinomial logistic-regression model trained by
            gradient descent in your browser. It genuinely learns from the examples you label, and
            it genuinely gets things wrong when your data is unbalanced.
          </p>
          <p className="text-sm text-muted">
            Where the game uses simple rules rather than machine learning — the rule engine, sensor
            simulation and movement — it says so. We do not describe ordinary logic as
            &quot;AI&quot;.
          </p>
        </Card>

        <Card title="About the performance figures">
          <p>{PERFORMANCE_DISCLAIMER}</p>
        </Card>

        <Card title="Assets and attribution">
          <ul>
            <li>All artwork is drawn procedurally in code. No third-party images are bundled.</li>
            <li>
              Logo areas are placeholder slots. Official AMD and partner assets are supplied
              separately by the programme organisers and are not included in this repository.
            </li>
            <li>
              Missions, characters and the flooded-district scenario are fictional and were written
              for this game.
            </li>
          </ul>
        </Card>

        <Card title="Built with">
          <p className="text-sm text-muted">
            React, TypeScript, Vite, Phaser, Zustand and Vitest — all open-source. The game runs
            entirely offline once loaded.
          </p>
        </Card>

        <p className="text-sm text-dim">
          {branding.programmeTitle} · {branding.eventTitle}
        </p>

        <Link to="/">← Back to the start screen</Link>
      </div>
    </div>
  );
}
