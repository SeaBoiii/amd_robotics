import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button, Callout, Card, EmptyState, Loading, Tabs, Tooltip } from '@/components/ui';
import type { ActionType, Mission } from '@/types';
import { loadAllMissions } from '@/missions/loadMissions';
import { describeAction, describeCondition } from '@/program/ruleEngine';
import { toJavaScript, toJson, toPseudocode } from '@/program/pseudocode';
import { ACTION_PRESETS, CONDITION_PRESETS } from '@/program/templates';
import { validateProgram } from '@/program/validateProgram';
import { computeStats } from '@/robotics/components';
import { useAIStore } from '@/store/useAIStore';
import { useProgramStore } from '@/store/useProgramStore';
import { useRoverStore } from '@/store/useRoverStore';
import { downloadFile } from '@/utils/format';
import { ConditionEditor } from './ConditionEditor';

type CodeView = 'pseudocode' | 'javascript' | 'json';

export default function ProgrammingLab() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [missions, setMissions] = useState<Mission[] | null>(null);
  const [codeView, setCodeView] = useState<CodeView>('pseudocode');

  const build = useRoverStore((state) => state.build);
  const model = useAIStore((state) => state.model);
  const programs = useProgramStore((state) => state.programs);
  const getProgram = useProgramStore((state) => state.getProgram);
  const addRule = useProgramStore((state) => state.addRule);
  const updateRule = useProgramStore((state) => state.updateRule);
  const setCondition = useProgramStore((state) => state.setCondition);
  const setAction = useProgramStore((state) => state.setAction);
  const removeRule = useProgramStore((state) => state.removeRule);
  const moveRule = useProgramStore((state) => state.moveRule);
  const resetProgram = useProgramStore((state) => state.resetProgram);

  useEffect(() => {
    loadAllMissions()
      .then((loaded) => {
        setMissions(loaded);
        if (!params.get('mission') && loaded[0]) {
          setParams({ mission: loaded[0].id }, { replace: true });
        }
      })
      .catch(() => setMissions([]));
    // `params`/`setParams` are stable enough here; we only want this on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const missionId = params.get('mission') ?? missions?.[0]?.id ?? '';
  const mission = missions?.find((item) => item.id === missionId) ?? null;

  // Reading `programs` keeps this reactive; getProgram seeds a starter on first use.
  const program = useMemo(() => {
    if (!missionId) return null;
    return programs[missionId] ?? getProgram(missionId);
  }, [programs, missionId, getProgram]);

  const stats = useMemo(() => computeStats(build), [build]);

  const validation = useMemo(() => {
    if (!program || !mission) return null;
    return validateProgram({
      program,
      mission,
      fittedSensors: stats.sensorTypes,
      hasTrainedModel: Boolean(model),
    });
  }, [program, mission, stats.sensorTypes, model]);

  if (!missions) return <Loading message="Loading missions…" />;
  if (!mission || !program) {
    return (
      <EmptyState icon="🧩" title="No mission selected">
        Pick a mission from the Command Centre first.
      </EmptyState>
    );
  }

  const code =
    codeView === 'pseudocode'
      ? toPseudocode(program)
      : codeView === 'javascript'
        ? toJavaScript(program)
        : toJson(program);

  const errors = validation?.issues.filter((issue) => issue.severity === 'error') ?? [];
  const warnings = validation?.issues.filter((issue) => issue.severity === 'warning') ?? [];

  return (
    <div className="stack">
      <div className="row row--between">
        <div>
          <p className="eyebrow">Programming Lab</p>
          <h1 style={{ marginBottom: 0 }}>Decide how your rover thinks</h1>
          <p className="text-muted">
            The rover checks your rules from the top down, every step, and runs the{' '}
            <strong>first</strong> one that matches. Order matters enormously.
          </p>
        </div>
        <div className="field" style={{ minWidth: '15rem' }}>
          <label className="field__label" htmlFor="mission-picker">
            Editing the program for
          </label>
          <select
            id="mission-picker"
            className="select"
            value={missionId}
            onChange={(event) => setParams({ mission: event.target.value })}
          >
            {missions.map((item) => (
              <option key={item.id} value={item.id}>
                {item.index}. {item.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="program-lab">
        <div className="stack">
          <Card
            title={`Rules (${program.rules.length})`}
            subtitle="Checked from top to bottom. The first match wins."
            actions={
              <>
                <Button
                  size="sm"
                  onClick={() =>
                    addRule(missionId, {
                      name: `Rule ${program.rules.length + 1}`,
                      enabled: true,
                      condition: { type: 'sensor', sensor: 'distance', operator: 'lt', value: 2 },
                      action: { type: 'turn_right' },
                    })
                  }
                >
                  + Add rule
                </Button>
                <Button size="sm" variant="ghost" onClick={() => resetProgram(missionId)}>
                  Reset
                </Button>
              </>
            }
          >
            {program.rules.length === 0 ? (
              <EmptyState icon="🧩" title="No rules yet">
                Without rules the rover just stops. Add one to get moving.
              </EmptyState>
            ) : (
              <ol className="stack stack--tight" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {program.rules.map((rule, index) => {
                  const ruleIssues =
                    validation?.issues.filter((issue) => issue.ruleId === rule.id) ?? [];
                  return (
                    <li key={rule.id}>
                      <div
                        className={`rule-row${rule.enabled ? '' : ' rule-row--disabled'}`}
                      >
                        <span className="rule-row__order" aria-hidden="true">
                          {index + 1}
                        </span>

                        <div className="stack stack--tight" style={{ minWidth: 0 }}>
                          <input
                            className="input"
                            value={rule.name}
                            aria-label={`Name for rule ${index + 1}`}
                            maxLength={40}
                            onChange={(event) =>
                              updateRule(missionId, rule.id, { name: event.target.value })
                            }
                          />

                          <div className="rule-row__sentence">
                            <span className="rule-row__keyword">If</span>
                            <ConditionEditor
                              condition={rule.condition}
                              onChange={(condition) => setCondition(missionId, rule.id, condition)}
                            />
                          </div>

                          <div className="rule-row__sentence">
                            <span className="rule-row__keyword">Then</span>
                            <select
                              className="select"
                              aria-label={`Action for rule ${index + 1}`}
                              value={rule.action.type}
                              onChange={(event) =>
                                setAction(missionId, rule.id, {
                                  ...rule.action,
                                  type: event.target.value as ActionType,
                                })
                              }
                            >
                              {ACTION_PRESETS.map((preset) => (
                                <option key={preset.id} value={preset.id} title={preset.hint}>
                                  {preset.label}
                                </option>
                              ))}
                            </select>

                            {rule.action.type === 'forward' || rule.action.type === 'reverse' ? (
                              <>
                                <span className="text-sm">at</span>
                                <input
                                  className="input"
                                  type="number"
                                  aria-label="Speed percent"
                                  min={10}
                                  max={100}
                                  step={5}
                                  style={{ width: '5rem' }}
                                  value={rule.action.speed ?? 70}
                                  onChange={(event) =>
                                    setAction(missionId, rule.id, {
                                      ...rule.action,
                                      speed: Number(event.target.value),
                                    })
                                  }
                                />
                                <span className="text-sm">% speed</span>
                              </>
                            ) : null}
                          </div>

                          <p className="text-xs text-dim" style={{ margin: 0 }}>
                            In plain English: if {describeCondition(rule.condition)}, then{' '}
                            {describeAction(rule.action)}.
                          </p>

                          {ruleIssues.map((issue) => (
                            <p
                              key={issue.message}
                              className="text-xs"
                              style={{
                                margin: 0,
                                color:
                                  issue.severity === 'error'
                                    ? 'var(--c-danger)'
                                    : 'var(--c-warning)',
                              }}
                            >
                              {issue.severity === 'error' ? '⛔' : '⚠️'} {issue.message} {issue.hint}
                            </p>
                          ))}
                        </div>

                        <div className="rule-row__controls">
                          <Button
                            size="sm"
                            variant="ghost"
                            aria-label={`Move rule ${index + 1} up`}
                            disabled={index === 0}
                            onClick={() => moveRule(missionId, rule.id, -1)}
                          >
                            ↑
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            aria-label={`Move rule ${index + 1} down`}
                            disabled={index === program.rules.length - 1}
                            onClick={() => moveRule(missionId, rule.id, 1)}
                          >
                            ↓
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            aria-label={rule.enabled ? 'Disable rule' : 'Enable rule'}
                            aria-pressed={!rule.enabled}
                            onClick={() =>
                              updateRule(missionId, rule.id, { enabled: !rule.enabled })
                            }
                          >
                            {rule.enabled ? '👁' : '🚫'}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            aria-label={`Delete rule ${index + 1}`}
                            onClick={() => removeRule(missionId, rule.id)}
                          >
                            🗑
                          </Button>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </Card>

          <Card
            title={
              <>
                Your program as code
                <Tooltip text="This is generated from your rules. It shows how the same logic looks in text-based programming." />
              </>
            }
            actions={
              <Button
                size="sm"
                onClick={() =>
                  downloadFile(
                    `${missionId}-program.${codeView === 'json' ? 'json' : codeView === 'javascript' ? 'js' : 'txt'}`,
                    code,
                    codeView === 'json' ? 'application/json' : 'text/plain',
                  )
                }
              >
                ⬇ Download
              </Button>
            }
          >
            <Tabs
              ariaLabel="Code view"
              active={codeView}
              onChange={setCodeView}
              tabs={[
                { id: 'pseudocode', label: 'Pseudocode' },
                { id: 'javascript', label: 'JavaScript' },
                { id: 'json', label: 'JSON' },
              ]}
            />
            <pre className="code-view">{code}</pre>
          </Card>
        </div>

        <aside className="stack">
          <Card title="Checks">
            {errors.length === 0 && warnings.length === 0 ? (
              <Callout tone="success" title="No problems found">
                Your program is ready to run.
              </Callout>
            ) : (
              <div className="stack stack--tight">
                {errors.map((issue) => (
                  <Callout key={issue.message} tone="danger" title={issue.message}>
                    {issue.hint}
                  </Callout>
                ))}
                {warnings.map((issue) => (
                  <Callout key={issue.message} tone="warning" title={issue.message}>
                    {issue.hint}
                  </Callout>
                ))}
              </div>
            )}
          </Card>

          <Card title="Block palette" subtitle="What each condition means">
            <dl className="stack stack--tight" style={{ margin: 0 }}>
              {CONDITION_PRESETS.map((preset) => (
                <div key={preset.id}>
                  <dt className="text-sm" style={{ fontWeight: 700 }}>
                    {preset.label}
                  </dt>
                  <dd className="text-xs text-dim" style={{ margin: 0 }}>
                    {preset.hint}
                  </dd>
                </div>
              ))}
            </dl>
          </Card>

          <Callout tone="info" title="Debugging tip">
            If the rover behaves oddly, disable rules one at a time with the 👁 button and run
            again. Changing one thing at a time is how engineers find bugs.
          </Callout>

          <Button
            variant="primary"
            block
            size="lg"
            disabled={errors.length > 0}
            onClick={() => navigate(`/mission/${missionId}`)}
          >
            🚀 Run in simulator →
          </Button>
        </aside>
      </div>
    </div>
  );
}
