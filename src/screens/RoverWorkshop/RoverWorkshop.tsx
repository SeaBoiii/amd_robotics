import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Callout, Card, Meter, Stat, Tooltip } from '@/components/ui';
import type { Mission, RoverComponent } from '@/types';
import { COMPONENTS, checkBuild, computeStats, getComponent } from '@/robotics/components';
import { loadAllMissions } from '@/missions/loadMissions';
import { useRoverStore } from '@/store/useRoverStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useTeamStore } from '@/store/useTeamStore';
import { humanise } from '@/utils/format';

const CATEGORY_ORDER: RoverComponent['category'][] = [
  'sensor',
  'wheel',
  'motor',
  'battery',
  'storage',
  'communication',
];

const CATEGORY_HELP: Record<RoverComponent['category'], string> = {
  sensor: 'Sensors are how the rover senses the world. Every rule you write reads a sensor.',
  wheel: 'Wheels decide how fast you go and how well you grip wet or broken ground.',
  motor: 'Motors turn the wheels. More power costs disproportionately more energy.',
  battery: 'Batteries set your energy budget. Run out and the mission ends where you stand.',
  storage: 'Storage sets how many supply packages you can carry per trip.',
  communication: 'A radio link lets the rover ask a human when the AI is unsure.',
};

export default function RoverWorkshop() {
  const navigate = useNavigate();
  const build = useRoverStore((state) => state.build);
  const toggleComponent = useRoverStore((state) => state.toggleComponent);
  const setMotorPower = useRoverStore((state) => state.setMotorPower);
  const resetBuild = useRoverStore((state) => state.resetBuild);
  const safeMode = useSettingsStore((state) => state.workshopSafeMode);
  const addNotebookEntry = useTeamStore((state) => state.addNotebookEntry);

  const [missions, setMissions] = useState<Mission[]>([]);
  const [budgetMissionId, setBudgetMissionId] = useState<string>('');

  useEffect(() => {
    loadAllMissions()
      .then((loaded) => {
        setMissions(loaded);
        setBudgetMissionId((current) => current || (loaded[0]?.id ?? ''));
      })
      .catch(() => setMissions([]));
  }, []);

  const budget = missions.find((mission) => mission.id === budgetMissionId)?.budget ?? 120;
  const stats = useMemo(() => computeStats(build), [build]);
  const problems = useMemo(() => checkBuild(build, budget), [build, budget]);
  const remaining = budget - stats.totalCost;

  const grouped = useMemo(() => {
    const map = new Map<RoverComponent['category'], RoverComponent[]>();
    for (const category of CATEGORY_ORDER) {
      map.set(
        category,
        COMPONENTS.filter((component) => component.category === category),
      );
    }
    return map;
  }, []);

  const canAfford = (component: RoverComponent) =>
    build.componentIds.includes(component.id) || component.cost <= remaining;

  const saveToNotebook = () => {
    addNotebookEntry({
      type: 'rover_config',
      title: 'Rover configuration saved',
      summary: `${build.componentIds.length} parts, ${stats.totalCost} credits, motor power ${build.motorPower}%.`,
      details: {
        Parts: build.componentIds.map((id) => getComponent(id)?.name ?? id).join(', '),
        'Top speed': stats.speed.toFixed(2),
        'Energy drain': stats.energyDrain.toFixed(2),
        'Battery capacity': stats.batteryCapacity,
        'Sensor range': stats.sensorRange,
        Grip: stats.grip.toFixed(2),
        'Cargo capacity': stats.cargoCapacity,
      },
    });
  };

  return (
    <div className="stack">
      <div className="row row--between">
        <div>
          <p className="eyebrow">Rover Workshop</p>
          <h1 style={{ marginBottom: 0 }}>Build your rover</h1>
          <p className="text-muted">
            Every part is a trade-off. There is no perfect rover — only a rover that suits the
            mission in front of you.
          </p>
        </div>
        <Button onClick={() => navigate('/command')}>← Command Centre</Button>
      </div>

      <div className="workshop">
        <div className="stack">
          {CATEGORY_ORDER.map((category) => (
            <Card
              key={category}
              title={
                <>
                  {humanise(category)}s
                  <Tooltip text={CATEGORY_HELP[category]} />
                </>
              }
            >
              <div className="grid grid--3">
                {(grouped.get(category) ?? []).map((component) => {
                  const selected = build.componentIds.includes(component.id);
                  const affordable = canAfford(component);
                  const blocked = safeMode && !affordable;

                  return (
                    <button
                      key={component.id}
                      type="button"
                      className={`card card--interactive component-card${selected ? ' card--selected' : ''}`}
                      aria-pressed={selected}
                      disabled={blocked}
                      onClick={() => toggleComponent(component.id)}
                      title={blocked ? 'Not enough budget left for this part' : component.explanation}
                    >
                      <span className="component-card__head">
                        <span className="component-card__icon" aria-hidden="true">
                          {component.icon}
                        </span>
                        <strong>{component.name}</strong>
                        <span className="component-card__cost">{component.cost}</span>
                      </span>

                      <p className="text-sm text-muted" style={{ margin: 0 }}>
                        {component.explanation}
                      </p>

                      <div className="pros-cons">
                        <div className="pros-cons__pros">
                          <strong>Good at</strong>
                          <ul>
                            {component.advantages.map((item) => (
                              <li key={item}>{item}</li>
                            ))}
                          </ul>
                        </div>
                        <div className="pros-cons__cons">
                          <strong>Watch out</strong>
                          <ul>
                            {component.limitations.map((item) => (
                              <li key={item}>{item}</li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      {selected ? <span className="pill pill--success">✓ Fitted</span> : null}
                      {!selected && !affordable ? (
                        <span className="pill pill--warning">Over budget</span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </Card>
          ))}
        </div>

        <aside className="workshop__sidebar stack">
          <Card title="Budget">
            <div className="field">
              <label className="field__label" htmlFor="budget-mission">
                Budget for
              </label>
              <select
                id="budget-mission"
                className="select"
                value={budgetMissionId}
                onChange={(event) => setBudgetMissionId(event.target.value)}
              >
                {missions.map((mission) => (
                  <option key={mission.id} value={mission.id}>
                    {mission.index}. {mission.title} — {mission.budget} credits
                  </option>
                ))}
              </select>
              <span className="field__hint">
                Each mission has its own budget. Check your build against the one you are about to
                attempt.
              </span>
            </div>

            <div className="row row--between text-sm" style={{ marginTop: 'var(--sp-3)' }}>
              <span>Spent</span>
              <strong className="mono">
                {stats.totalCost} / {budget}
              </strong>
            </div>
            <Meter
              value={stats.totalCost}
              max={budget}
              tone={remaining < 0 ? 'danger' : remaining < budget * 0.15 ? 'warning' : 'success'}
              label="Budget used"
            />
            <p
              className="text-sm"
              style={{ color: remaining < 0 ? 'var(--c-danger)' : 'var(--c-text-muted)' }}
            >
              {remaining >= 0
                ? `${remaining} credits remaining`
                : `${Math.abs(remaining)} credits over budget`}
            </p>
          </Card>

          <Card title="Live performance">
            <div className="rover-preview" style={{ marginBottom: 'var(--sp-3)' }}>
              <div
                className="rover-preview__body"
                style={{ background: build.colour, color: '#04121a' }}
                aria-label="Rover preview"
              >
                🤖
              </div>
            </div>

            <div className="grid grid--2">
              <Stat
                label="Speed"
                value={stats.speed.toFixed(2)}
                sub="tiles per second"
                tooltip="How fast the rover crosses one tile. Rough ground slows it further."
              />
              <Stat
                label="Energy drain"
                value={`${stats.energyDrain.toFixed(2)}×`}
                sub="multiplier"
                tone={stats.energyDrain > 1.3 ? 'warning' : undefined}
                tooltip="Multiplies every energy cost. Motor power affects this the most."
              />
              <Stat label="Battery" value={stats.batteryCapacity} sub="energy units" />
              <Stat label="Sensor range" value={`${stats.sensorRange} tiles`} />
              <Stat
                label="Grip"
                value={stats.grip.toFixed(2)}
                tooltip="Higher grip means fewer slips on wet or damaged tiles."
              />
              <Stat label="Cargo" value={stats.cargoCapacity} sub="packages" />
            </div>

            <div className="field" style={{ marginTop: 'var(--sp-3)' }}>
              <label className="field__label" htmlFor="motor-power">
                Motor power: {build.motorPower}%
                <Tooltip text="Doubling motor power more than doubles energy use. Fast is not always best." />
              </label>
              <input
                id="motor-power"
                className="range"
                type="range"
                min={10}
                max={100}
                step={5}
                value={build.motorPower}
                onChange={(event) => setMotorPower(Number(event.target.value))}
              />
              <span className="field__hint">
                {build.motorPower >= 90
                  ? 'Very fast, but expect to run out of energy on long missions.'
                  : build.motorPower <= 40
                    ? 'Very efficient, but you may run out of time.'
                    : 'A balanced setting.'}
              </span>
            </div>

            <div className="row" style={{ marginTop: 'var(--sp-2)' }}>
              {stats.sensorTypes.length === 0 ? (
                <span className="pill pill--warning">No sensors fitted</span>
              ) : (
                stats.sensorTypes.map((type) => (
                  <span key={type} className="pill pill--info">
                    {humanise(type)}
                  </span>
                ))
              )}
              {stats.hasTelemetry ? <span className="pill pill--success">📶 Radio link</span> : null}
            </div>
          </Card>

          {problems.length > 0 ? (
            <div className="stack stack--tight">
              {problems.map((problem) => (
                <Callout
                  key={problem.message}
                  tone={problem.severity === 'error' ? 'danger' : 'warning'}
                  title={problem.message}
                >
                  {problem.hint}
                </Callout>
              ))}
            </div>
          ) : (
            <Callout tone="success" title="This rover is ready to run">
              All essential systems are fitted and you are within budget.
            </Callout>
          )}

          <div className="row">
            <Button onClick={saveToNotebook}>📓 Save to notebook</Button>
            <Button variant="ghost" onClick={resetBuild}>
              Reset build
            </Button>
          </div>
          <Button variant="primary" block onClick={() => navigate('/programming')}>
            Continue to Programming Lab →
          </Button>
        </aside>
      </div>
    </div>
  );
}
