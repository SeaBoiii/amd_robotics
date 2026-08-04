import { useState } from 'react';
import { Callout, Card, Meter, Tabs } from '@/components/ui';
import {
  COMPUTE_CONCEPTS,
  COMPUTE_PROFILES,
  ENGINEER_PROFILES,
  PERFORMANCE_DISCLAIMER,
} from '@/content/amdContent';

type TabId = 'concepts' | 'performance' | 'careers';

const MAX = {
  inferenceSpeed: 5,
  energyPerPrediction: 2,
  modelCapacity: 4,
  reactionTimeMs: 150,
};

export default function TechCorner() {
  const [tab, setTab] = useState<TabId>('concepts');

  return (
    <div className="stack">
      <div>
        <p className="eyebrow">AMD Technology Corner</p>
        <h1 style={{ marginBottom: 0 }}>What actually makes a robot think?</h1>
        <p className="text-muted">
          Your rover&apos;s decisions have to run on real hardware. Different kinds of processor
          are good at very different jobs.
        </p>
      </div>

      <Tabs
        ariaLabel="Technology Corner sections"
        active={tab}
        onChange={setTab}
        tabs={[
          { id: 'concepts', label: 'Compute concepts' },
          { id: 'performance', label: 'Performance Mode' },
          { id: 'careers', label: 'Engineering careers' },
        ]}
      />

      {tab === 'concepts' ? (
        <div className="grid grid--3">
          {COMPUTE_CONCEPTS.map((concept) => (
            <Card key={concept.id} className="concept-card">
              <span className="concept-card__icon" aria-hidden="true">
                {concept.icon}
              </span>
              <div>
                <h3 style={{ margin: 0 }}>{concept.name}</h3>
                <p className="text-xs text-dim" style={{ margin: 0 }}>
                  {concept.fullName}
                </p>
              </div>

              <p className="text-sm">
                <strong>Think of it as:</strong> {concept.analogy}
              </p>
              <p className="text-sm text-muted">{concept.whatItDoes}</p>

              <div className="pros-cons">
                <div className="pros-cons__pros">
                  <strong>Good at</strong>
                  <ul>
                    {concept.goodAt.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
                <div className="pros-cons__cons">
                  <strong>Less good at</strong>
                  <ul>
                    {concept.lessGoodAt.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              </div>

              <Callout tone="info" title="In your rover">
                {concept.roverExample}
              </Callout>
            </Card>
          ))}
        </div>
      ) : null}

      {tab === 'performance' ? (
        <div className="stack">
          <Callout tone="warning" title="Read this first — these are illustrative numbers">
            {PERFORMANCE_DISCLAIMER}
          </Callout>

          <div className="grid grid--2">
            {COMPUTE_PROFILES.map((profile) => (
              <Card key={profile.id} title={profile.name} subtitle={profile.description}>
                <div className="stack stack--tight">
                  <div className="perf-bar">
                    <span>Prediction speed</span>
                    <Meter
                      value={profile.inferenceSpeed}
                      max={MAX.inferenceSpeed}
                      tone="success"
                      label={`${profile.name} prediction speed`}
                    />
                    <span className="mono text-xs">{profile.inferenceSpeed}× (illustrative)</span>
                  </div>

                  <div className="perf-bar">
                    <span>Energy per prediction</span>
                    <Meter
                      value={profile.energyPerPrediction}
                      max={MAX.energyPerPrediction}
                      tone={profile.energyPerPrediction > 1 ? 'danger' : 'success'}
                      label={`${profile.name} energy per prediction`}
                    />
                    <span className="mono text-xs">
                      {profile.energyPerPrediction}× (lower is better)
                    </span>
                  </div>

                  <div className="perf-bar">
                    <span>Model size it fits</span>
                    <Meter
                      value={profile.modelCapacity}
                      max={MAX.modelCapacity}
                      label={`${profile.name} model capacity`}
                    />
                    <span className="mono text-xs">{profile.modelCapacity}× (illustrative)</span>
                  </div>

                  <div className="perf-bar">
                    <span>Rover reaction time</span>
                    <Meter
                      value={MAX.reactionTimeMs - profile.reactionTimeMs}
                      max={MAX.reactionTimeMs}
                      tone={profile.reactionTimeMs < 40 ? 'success' : 'warning'}
                      label={`${profile.name} reaction time`}
                    />
                    <span className="mono text-xs">{profile.reactionTimeMs} ms (simulated)</span>
                  </div>
                </div>

                <p className="text-sm" style={{ marginTop: 'var(--sp-3)' }}>
                  <strong>Best for:</strong> {profile.bestFor}
                </p>
              </Card>
            ))}
          </div>

          <Callout tone="info" title="The engineering lesson">
            Notice that the fastest option is not the most efficient one. On a battery-powered
            rescue rover, energy per prediction often matters more than raw speed — which is
            exactly the trade-off you face in the Rover Workshop.
          </Callout>
        </div>
      ) : null}

      {tab === 'careers' ? (
        <div className="stack">
          <Callout tone="info" title="Placeholder profiles">
            These cards are placeholders. AMD volunteers can replace them with their own stories —
            see <span className="mono">docs/amd-asset-integration.md</span>.
          </Callout>

          <div className="grid grid--2">
            {ENGINEER_PROFILES.map((engineer) => (
              <Card key={engineer.name}>
                <div className="row">
                  <span style={{ fontSize: '2.5rem' }} aria-hidden="true">
                    {engineer.avatar}
                  </span>
                  <div>
                    <strong>{engineer.name}</strong>
                    <div className="text-sm text-muted">
                      {engineer.role} · {engineer.team}
                    </div>
                  </div>
                </div>

                <dl className="stack stack--tight" style={{ marginTop: 'var(--sp-3)' }}>
                  <div>
                    <dt className="text-xs text-dim">How they got here</dt>
                    <dd className="text-sm" style={{ margin: 0 }}>
                      {engineer.journey}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-dim">What they work on now</dt>
                    <dd className="text-sm" style={{ margin: 0 }}>
                      {engineer.currentProject}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-dim">Advice for you</dt>
                    <dd className="text-sm" style={{ margin: 0 }}>
                      {engineer.advice}
                    </dd>
                  </div>
                </dl>

                {engineer.linkUrl ? (
                  <a
                    href={engineer.linkUrl}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="btn btn--sm"
                    style={{ marginTop: 'var(--sp-3)' }}
                  >
                    {engineer.linkLabel || 'Find out more'}
                  </a>
                ) : null}
              </Card>
            ))}
          </div>

          <Card title="Subjects that lead here">
            <div className="grid grid--3">
              <div>
                <strong>Mathematics</strong>
                <p className="text-sm text-muted">
                  Probability and statistics are exactly what a confidence score is.
                </p>
              </div>
              <div>
                <strong>Physics</strong>
                <p className="text-sm text-muted">
                  Sensors, motors, energy and motion — everything in the Rover Workshop.
                </p>
              </div>
              <div>
                <strong>Computing</strong>
                <p className="text-sm text-muted">
                  Rules, loops and debugging. You have been doing this all session.
                </p>
              </div>
              <div>
                <strong>Design &amp; Technology</strong>
                <p className="text-sm text-muted">
                  Trade-offs under constraints — the entire budget mechanic.
                </p>
              </div>
              <div>
                <strong>Geography</strong>
                <p className="text-sm text-muted">
                  Flooding, urban planning and where a rescue rover would actually be sent.
                </p>
              </div>
              <div>
                <strong>English</strong>
                <p className="text-sm text-muted">
                  Explaining a technical decision clearly is a genuine engineering skill.
                </p>
              </div>
            </div>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
