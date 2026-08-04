import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Button,
  Callout,
  Card,
  EmptyState,
  LabelChip,
  Meter,
  Stat,
  Tabs,
  Tooltip,
} from '@/components/ui';
import type { TrainingSample } from '@/types';
import { LABELS } from '@/types';
import { FEATURE_DESCRIPTIONS, FEATURE_NAMES, LABEL_INFO, LABEL_LIST } from '@/ai/labels';
import {
  balanceWarnings,
  misclassifications,
  perClassCounts,
  unlabelledCount,
  useAIStore,
} from '@/store/useAIStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useTeamStore } from '@/store/useTeamStore';
import { formatPercent } from '@/utils/format';

/** Renders the 8x8 preview grid for one simulated camera snapshot. */
function Pattern({ sample }: { sample: TrainingSample }) {
  const hue = LABEL_INFO[sample.trueLabel].colour;
  return (
    <div className="pattern" aria-hidden="true">
      {sample.pattern.map((value, index) => (
        <span
          key={index}
          className="pattern__cell"
          style={{ background: hue, opacity: 0.15 + value * 0.85 }}
        />
      ))}
    </div>
  );
}

type TabId = 'collect' | 'train' | 'review' | 'policy';

export default function AILab() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<TabId>('collect');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const samples = useAIStore((state) => state.samples);
  const model = useAIStore((state) => state.model);
  const training = useAIStore((state) => state.training);
  const progress = useAIStore((state) => state.progress);
  const error = useAIStore((state) => state.error);
  const policy = useAIStore((state) => state.confidencePolicy);
  const labelSample = useAIStore((state) => state.labelSample);
  const collect = useAIStore((state) => state.collect);
  const removeSample = useAIStore((state) => state.removeSample);
  const resetDataset = useAIStore((state) => state.resetDataset);
  const train = useAIStore((state) => state.train);
  const runInstantTraining = useAIStore((state) => state.runInstantTraining);
  const setConfidencePolicy = useAIStore((state) => state.setConfidencePolicy);

  const counts = useMemo(() => perClassCounts(samples), [samples]);
  const warnings = useMemo(() => balanceWarnings(samples), [samples]);
  const unlabelled = useMemo(() => unlabelledCount(samples), [samples]);
  const mistakes = useMemo(() => misclassifications(model), [model]);

  const instantAllowed = useSettingsStore((state) => state.instantTrainingAllowed);
  const addNotebookEntry = useTeamStore((state) => state.addNotebookEntry);

  const labelledCount = samples.length - unlabelled;
  const selected = useMemo(
    () => samples.find((sample) => sample.id === selectedId) ?? null,
    [samples, selectedId],
  );

  const handleTrain = async () => {
    const ok = await train();
    const trained = useAIStore.getState().model;
    if (ok && trained) {
      setTab('review');
      addNotebookEntry({
        type: 'ai_model',
        title: `Model v${trained.version} trained`,
        summary: `Accuracy ${formatPercent(trained.metrics.accuracy)} on unseen test data, from ${trained.trainingSampleCount} labelled samples.`,
        details: {
          'Test accuracy': formatPercent(trained.metrics.accuracy),
          'Training accuracy': formatPercent(trained.metrics.trainAccuracy),
          'Average confidence': formatPercent(trained.metrics.averageConfidence),
          Imbalance: trained.metrics.imbalance.toFixed(2),
          'Samples used': trained.trainingSampleCount,
        },
      });
    }
  };

  return (
    <div className="stack">
      <div className="row row--between">
        <div>
          <p className="eyebrow">AI Lab</p>
          <h1 style={{ marginBottom: 0 }}>Teach your rover to see</h1>
          <p className="text-muted">
            The rover is not clever on its own. It only knows what your labelled examples taught
            it — including your mistakes.
          </p>
        </div>
        <Button onClick={() => navigate('/command')}>← Command Centre</Button>
      </div>

      <Tabs
        ariaLabel="AI Lab sections"
        active={tab}
        onChange={setTab}
        tabs={[
          { id: 'collect', label: '1 · Label data' },
          { id: 'train', label: '2 · Train' },
          { id: 'review', label: '3 · Review mistakes' },
          { id: 'policy', label: '4 · Responsible AI' },
        ]}
      />

      {error ? (
        <Callout tone="danger" title="Training could not start">
          {error}
        </Callout>
      ) : null}

      {/* ------------------------------------------------------- collect */}
      {tab === 'collect' ? (
        <div className="ai-lab">
          <Card
            title="Your dataset"
            subtitle={`${labelledCount} of ${samples.length} snapshots labelled`}
            actions={
              <Button size="sm" variant="ghost" onClick={resetDataset}>
                Reset dataset
              </Button>
            }
          >
            {samples.length === 0 ? (
              <EmptyState icon="📷" title="No snapshots yet">
                Use the collector on the right to gather camera snapshots.
              </EmptyState>
            ) : (
              <div className="sample-grid">
                {samples.map((sample) => (
                  <button
                    key={sample.id}
                    type="button"
                    className={`sample-tile${sample.id === selectedId ? ' sample-tile--selected' : ''}${
                      sample.label === null ? ' sample-tile--unlabelled' : ''
                    }`}
                    onClick={() => setSelectedId(sample.id)}
                    aria-pressed={sample.id === selectedId}
                    aria-label={`Snapshot, ${sample.label ? LABEL_INFO[sample.label].name : 'not labelled'}, ${sample.lighting} lighting`}
                  >
                    <Pattern sample={sample} />
                    <span className="sample-tile__caption">
                      {sample.label ? LABEL_INFO[sample.label].name : 'Unlabelled'}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </Card>

          <aside className="stack">
            <Card title="Label the selected snapshot">
              {selected ? (
                <div className="stack stack--tight">
                  <div style={{ width: '8rem', margin: '0 auto' }}>
                    <Pattern sample={selected} />
                  </div>
                  <p className="text-xs text-dim text-center">
                    Lighting: {selected.lighting} · Source: {selected.source}
                  </p>

                  <div className="stack stack--tight">
                    {LABEL_LIST.map((info) => (
                      <button
                        key={info.id}
                        type="button"
                        className={`btn btn--block${selected.label === info.id ? ' btn--primary' : ''}`}
                        onClick={() => labelSample(selected.id, info.id)}
                        style={{ justifyContent: 'flex-start' }}
                      >
                        <LabelChip label={info.id} />
                      </button>
                    ))}
                  </div>

                  <details>
                    <summary className="text-sm">What the camera measured</summary>
                    <table className="table">
                      <tbody>
                        {FEATURE_NAMES.map((name, index) => (
                          <tr key={name}>
                            <th scope="row" title={FEATURE_DESCRIPTIONS[name]}>
                              {name}
                            </th>
                            <td className="mono">{selected.features[index]?.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </details>

                  <div className="row">
                    <Button size="sm" variant="ghost" onClick={() => labelSample(selected.id, null)}>
                      Clear label
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => {
                        removeSample(selected.id);
                        setSelectedId(null);
                      }}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              ) : (
                <EmptyState icon="👈" title="Pick a snapshot">
                  Select any tile on the left to label it.
                </EmptyState>
              )}
            </Card>

            <Card title="Collect more snapshots">
              <p className="text-sm text-muted">
                Drive the camera around and gather more examples of whichever category is thin.
              </p>
              <div className="stack stack--tight">
                {LABELS.map((label) => (
                  <div key={label} className="row row--between">
                    <LabelChip label={label} />
                    <span className="row" style={{ gap: 'var(--sp-1)' }}>
                      <span className="pill pill--muted mono">{counts[label] ?? 0}</span>
                      <Button size="sm" onClick={() => collect(label, 3)}>
                        +3
                      </Button>
                    </span>
                  </div>
                ))}
              </div>
            </Card>

            <Card
              title={
                <>
                  Data balance
                  <Tooltip text="If one category has far more examples than another, the model gets lazy and simply guesses the common one." />
                </>
              }
            >
              {warnings.length === 0 ? (
                <Callout tone="success" title="Your dataset looks reasonably balanced">
                  Good work — the model will get a fair chance to learn every category.
                </Callout>
              ) : (
                <div className="stack stack--tight">
                  {warnings.map((warning) => (
                    <Callout key={warning.message} tone="warning">
                      {warning.message}
                    </Callout>
                  ))}
                </div>
              )}
            </Card>
          </aside>
        </div>
      ) : null}

      {/* --------------------------------------------------------- train */}
      {tab === 'train' ? (
        <div className="ai-lab">
          <Card title="Train the model">
            <p className="text-muted">
              Training adjusts the model&apos;s internal numbers so that its guesses match your
              labels more often. It runs entirely on this computer.
            </p>

            <div className="grid grid--3">
              <Stat label="Labelled samples" value={labelledCount} />
              <Stat
                label="Unlabelled"
                value={unlabelled}
                tone={unlabelled > 0 ? 'warning' : undefined}
                sub="These are ignored during training"
              />
              <Stat label="Categories covered" value={`${LABELS.filter((l) => (counts[l] ?? 0) > 0).length}/5`} />
            </div>

            {training && progress ? (
              <div style={{ marginTop: 'var(--sp-4)' }}>
                <div className="row row--between text-sm">
                  <span>
                    Epoch {progress.epoch} of {progress.totalEpochs}
                  </span>
                  <span className="mono">
                    loss {progress.loss.toFixed(3)} · accuracy {formatPercent(progress.accuracy)}
                  </span>
                </div>
                <Meter
                  value={progress.epoch}
                  max={progress.totalEpochs}
                  label="Training progress"
                />
              </div>
            ) : null}

            <div className="row" style={{ marginTop: 'var(--sp-4)' }}>
              <Button variant="primary" size="lg" onClick={handleTrain} disabled={training}>
                {training ? 'Training…' : '🧠 Train model'}
              </Button>
              {instantAllowed ? (
                <Button
                  onClick={async () => {
                    const ok = await runInstantTraining();
                    if (ok) setTab('review');
                  }}
                  disabled={training}
                  title="Gives every team a working model immediately so nobody is stuck"
                >
                  ⚡ Instant Training Mode
                </Button>
              ) : null}
            </div>
            <p className="text-xs text-dim">
              Instant Training Mode uses a pre-balanced dataset. It is a safety net for workshops
              that are running short of time — the model it produces is clearly marked.
            </p>
          </Card>

          <aside className="stack">
            <Card title="Current model">
              {model ? (
                <div className="grid grid--2">
                  <Stat label="Version" value={`v${model.version}`} />
                  <Stat
                    label="Test accuracy"
                    value={formatPercent(model.metrics.accuracy)}
                    tone={model.metrics.accuracy < 0.6 ? 'warning' : 'success'}
                    tooltip="Measured on data the model has never seen. This is the honest number."
                  />
                  <Stat
                    label="Training accuracy"
                    value={formatPercent(model.metrics.trainAccuracy)}
                    tooltip="Accuracy on the data it learned from. Always flattering."
                  />
                  <Stat
                    label="Average confidence"
                    value={formatPercent(model.metrics.averageConfidence)}
                  />
                  {model.instant ? (
                    <div style={{ gridColumn: '1 / -1' }}>
                      <span className="pill pill--warning">⚡ Instant training model</span>
                    </div>
                  ) : null}
                </div>
              ) : (
                <EmptyState icon="🧠" title="No model yet">
                  Label some snapshots, then press Train.
                </EmptyState>
              )}
            </Card>
          </aside>
        </div>
      ) : null}

      {/* -------------------------------------------------------- review */}
      {tab === 'review' ? (
        !model ? (
          <EmptyState icon="🧠" title="Train a model first">
            Once the model exists you can inspect exactly where it gets confused.
          </EmptyState>
        ) : (
          <div className="ai-lab">
            <Card
              title={
                <>
                  Confusion matrix
                  <Tooltip text="Rows are what the object really was. Columns are what the model guessed. Green on the diagonal means correct." />
                </>
              }
            >
              <div style={{ overflowX: 'auto' }}>
                <table className="confusion">
                  <thead>
                    <tr>
                      <th scope="col">Actual ↓ / Guessed →</th>
                      {model.metrics.confusion.labels.map((label) => (
                        <th key={label} scope="col">
                          {LABEL_INFO[label].name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {model.metrics.confusion.counts.map((row, actualIndex) => (
                      <tr key={model.metrics.confusion.labels[actualIndex]}>
                        <th scope="row">
                          {LABEL_INFO[model.metrics.confusion.labels[actualIndex]].name}
                        </th>
                        {row.map((count, predictedIndex) => (
                          <td
                            key={predictedIndex}
                            className={
                              actualIndex === predictedIndex
                                ? 'diag'
                                : count > 0
                                  ? 'err'
                                  : undefined
                            }
                          >
                            {count}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <h3 style={{ marginTop: 'var(--sp-5)' }}>Accuracy for each category</h3>
              <div className="stack stack--tight">
                {LABELS.map((label) => {
                  const accuracy = model.metrics.perClassAccuracy[label] ?? 0;
                  return (
                    <div key={label} className="score-breakdown__row">
                      <LabelChip label={label} />
                      <Meter
                        value={accuracy * 100}
                        tone={accuracy < 0.5 ? 'danger' : accuracy < 0.75 ? 'warning' : 'success'}
                        label={`${LABEL_INFO[label].name} accuracy`}
                      />
                      <span className="mono text-sm">{formatPercent(accuracy)}</span>
                    </div>
                  );
                })}
              </div>
            </Card>

            <aside className="stack">
              <Card title="Mistakes on unseen data" subtitle="Look for a pattern in what it got wrong">
                {mistakes.length === 0 ? (
                  <Callout tone="success" title="No mistakes in the sample reviewed">
                    Impressive. Try adding harder, dimmer examples to test it properly.
                  </Callout>
                ) : (
                  <div className="stack stack--tight">
                    {mistakes.map((mistake) => (
                      <div key={mistake.sample.id} className="row" style={{ alignItems: 'center' }}>
                        <div style={{ width: '3rem', flexShrink: 0 }}>
                          <Pattern sample={mistake.sample} />
                        </div>
                        <div className="text-xs">
                          <div>
                            Really: <LabelChip label={mistake.sample.trueLabel} compact />{' '}
                            {LABEL_INFO[mistake.sample.trueLabel].name}
                          </div>
                          <div>
                            Guessed: <LabelChip label={mistake.predicted} compact />{' '}
                            {LABEL_INFO[mistake.predicted].name} at{' '}
                            {formatPercent(mistake.confidence)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              <Callout tone="info" title="How to improve the model">
                Add more examples of the categories it confuses, especially in dim lighting. More
                data of the *right kind* beats more data in general.
              </Callout>
            </aside>
          </div>
        )
      ) : null}

      {/* -------------------------------------------------------- policy */}
      {tab === 'policy' ? (
        <div className="ai-lab">
          <Card title="Confidence policy">
            <p className="text-muted">
              A prediction always comes with a confidence number. You decide how sure the rover has
              to be before it acts on its own.
            </p>

            <div
              className="confidence-bands"
              role="img"
              aria-label={`Ask a human below ${formatPercent(policy.verifyAbove)}, verify carefully up to ${formatPercent(policy.actAbove)}, act freely above that.`}
            >
              <span
                className="confidence-bands__band"
                style={{ width: `${policy.verifyAbove * 100}%`, background: 'var(--c-danger)' }}
              >
                Ask a human
              </span>
              <span
                className="confidence-bands__band"
                style={{
                  width: `${(policy.actAbove - policy.verifyAbove) * 100}%`,
                  background: 'var(--c-warning)',
                }}
              >
                Slow down &amp; verify
              </span>
              <span
                className="confidence-bands__band"
                style={{ width: `${(1 - policy.actAbove) * 100}%`, background: 'var(--c-success)' }}
              >
                Act
              </span>
            </div>

            <div className="grid grid--2" style={{ marginTop: 'var(--sp-4)' }}>
              <div className="field">
                <label className="field__label" htmlFor="act-above">
                  Act on its own above {formatPercent(policy.actAbove)}
                </label>
                <input
                  id="act-above"
                  className="range"
                  type="range"
                  min={0.4}
                  max={0.98}
                  step={0.01}
                  value={policy.actAbove}
                  onChange={(event) =>
                    setConfidencePolicy({ actAbove: Number(event.target.value) })
                  }
                />
                <span className="field__hint">
                  Higher is more cautious: fewer wrong actions, but slower missions.
                </span>
              </div>

              <div className="field">
                <label className="field__label" htmlFor="verify-above">
                  Ask a human below {formatPercent(policy.verifyAbove)}
                </label>
                <input
                  id="verify-above"
                  className="range"
                  type="range"
                  min={0.05}
                  max={0.9}
                  step={0.01}
                  value={policy.verifyAbove}
                  onChange={(event) =>
                    setConfidencePolicy({ verifyAbove: Number(event.target.value) })
                  }
                />
                <span className="field__hint">
                  Asking a human costs a little mission time but protects people.
                </span>
              </div>
            </div>
          </Card>

          <aside className="stack">
            <Callout tone="info" title="Why this matters">
              A real rescue robot that acts on a 30%-confident guess can drive into flood water or
              past someone who needs help. Knowing when <em>not</em> to trust the model is part of
              the engineering.
            </Callout>
            <Callout tone="warning" title="Bias comes from data">
              If you only labelled bright, easy snapshots, the rover will be over-confident in the
              dark. That is not a bug in the AI — it is a gap in the dataset.
            </Callout>
            <Button variant="primary" block onClick={() => navigate('/programming')}>
              Continue to Programming Lab →
            </Button>
          </aside>
        </div>
      ) : null}
    </div>
  );
}
