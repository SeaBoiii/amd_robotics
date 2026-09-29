import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Callout, Card, Stat, Switch } from '@/components/ui';
import {
  CATEGORY_LABELS,
  ENGINEER_PARTS,
  checkEngineerBuild,
  computeEngineerStats,
  createDefaultEngineerBuild,
} from '@/engineer/catalogue';
import { DEFAULT_NAVIGATION } from '@/engineer/maze';
import { PLANNER_LABELS } from '@/engineer/navigation/navigator';
import type { PartCategory, PlannerId } from '@/engineer/types';
import { useEngineerSessionStore } from '@/store/useEngineerSessionStore';
import { cx } from '@/utils/format';

const CATEGORIES: PartCategory[] = ['chassis', 'drive', 'battery', 'sensor', 'compute'];

const PLANNER_HELP: Record<PlannerId, string> = {
  astar: 'Heuristic-guided search. Usually optimal with few nodes expanded.',
  dijkstra: 'Explores uniformly. Optimal but expands many nodes.',
  greedy: 'Heads straight for the exit. Very cheap, can take detours.',
  wall_follower: 'No map, no search. Keeps one hand on the wall.',
};

export default function EngineerBuild() {
  const navigate = useNavigate();
  const build = useEngineerSessionStore((state) => state.build);
  const navigation = useEngineerSessionStore((state) => state.navigation);
  const togglePart = useEngineerSessionStore((state) => state.togglePart);
  const setThrottle = useEngineerSessionStore((state) => state.setThrottle);
  const setNavigation = useEngineerSessionStore((state) => state.setNavigation);
  const applyPreset = useEngineerSessionStore((state) => state.applyPreset);

  const stats = useMemo(() => computeEngineerStats(build), [build]);
  const problems = useMemo(() => checkEngineerBuild(build), [build]);
  const errors = problems.filter((problem) => problem.severity === 'error');
  const energyPerTile = 0.75 * stats.energyDrain;
  const isSearch = navigation.planner !== 'wall_follower';

  return (
    <div className="stack">
      <div className="row row--between">
        <div>
          <p className="eyebrow">Step 1</p>
          <h1 style={{ marginBottom: 0 }}>Build and configure</h1>
          <p className="text-muted">Budget is unlimited. Mass and power are not.</p>
        </div>
        <div className="row">
          <Button onClick={() => applyPreset(createDefaultEngineerBuild(), DEFAULT_NAVIGATION)}>
            ↺ Baseline
          </Button>
          <Button
            variant="primary"
            size="lg"
            disabled={errors.length > 0}
            onClick={() => navigate('/engineer/run')}
          >
            🏁 Go to the maze
          </Button>
        </div>
      </div>

      <div className="engineer-build">
        <div className="stack">
          {CATEGORIES.map((category) => (
            <Card
              key={category}
              title={CATEGORY_LABELS[category]}
              subtitle={category === 'sensor' ? 'Fit any combination.' : 'Pick one.'}
            >
              <div className="engineer-parts">
                {ENGINEER_PARTS.filter((part) => part.category === category).map((part) => {
                  const selected = build.partIds.includes(part.id);
                  return (
                    <button
                      key={part.id}
                      type="button"
                      className={cx('card', 'card--interactive', 'engineer-part', selected && 'card--selected')}
                      aria-pressed={selected}
                      onClick={() => togglePart(part.id)}
                    >
                      <span className="engineer-part__name">
                        <span aria-hidden="true">{part.icon}</span> {part.name}
                      </span>
                      <span className="text-xs text-muted">{part.summary}</span>
                      <span className="mono text-xs text-dim">
                        {part.massKg} kg
                        {part.powerW ? ` · ${part.powerW} W` : ''}
                        {part.motorW ? ` · ${part.motorW} W motor` : ''}
                        {part.capacity ? ` · ${part.capacity} energy` : ''}
                        {part.compute ? ` · ${part.compute.msPerNode} ms/node` : ''}
                      </span>
                    </button>
                  );
                })}
              </div>
            </Card>
          ))}
        </div>

        <aside className="stack">
          <Card title="Performance">
            <div className="grid grid--2">
              <Stat label="Mass" value={`${stats.massKg} kg`} />
              <Stat label="Step time" value={`${Math.round(stats.stepMs)} ms`} sub={`${stats.speed.toFixed(2)} tiles/s`} />
              <Stat label="Battery" value={stats.batteryCapacity} sub={`≈ ${Math.floor(stats.batteryCapacity / energyPerTile)} tiles`} />
              <Stat label="Energy / tile" value={energyPerTile.toFixed(2)} />
              <Stat label="Sensor reach" value={`${stats.maxRange} tiles`} sub={stats.seesHazards ? 'sees water' : 'blind to water'} />
              <Stat label="Planning" value={`${stats.msPerNode} ms/node`} sub={`+${stats.overheadMs} ms per plan`} />
            </div>
            <div className="field" style={{ marginTop: 'var(--sp-3)' }}>
              <label className="field__label" htmlFor="throttle">
                Throttle: {build.throttle}%
              </label>
              <input
                id="throttle"
                className="range"
                type="range"
                min={30}
                max={100}
                step={5}
                value={build.throttle}
                onChange={(event) => setThrottle(Number(event.target.value))}
              />
            </div>
            {problems.map((problem) => (
              <Callout key={problem.message} tone={problem.severity === 'error' ? 'danger' : 'warning'}>
                {problem.message}
              </Callout>
            ))}
          </Card>

          <Card title="Navigation">
            <div className="stack">
              <div className="field">
                <label className="field__label" htmlFor="planner">
                  Planner
                </label>
                <select
                  id="planner"
                  className="select"
                  value={navigation.planner}
                  onChange={(event) => setNavigation({ planner: event.target.value as PlannerId })}
                >
                  {(Object.keys(PLANNER_LABELS) as PlannerId[]).map((id) => (
                    <option key={id} value={id}>
                      {PLANNER_LABELS[id]}
                    </option>
                  ))}
                </select>
                <span className="field__hint">{PLANNER_HELP[navigation.planner]}</span>
              </div>

              {navigation.planner === 'astar' ? (
                <div className="field">
                  <label className="field__label" htmlFor="heuristic-weight">
                    Heuristic weight: {navigation.heuristicWeight.toFixed(2)}
                  </label>
                  <input
                    id="heuristic-weight"
                    className="range"
                    type="range"
                    min={1}
                    max={3}
                    step={0.25}
                    value={navigation.heuristicWeight}
                    onChange={(event) => setNavigation({ heuristicWeight: Number(event.target.value) })}
                  />
                  <span className="field__hint">Above 1 searches fewer nodes but may miss the best route.</span>
                </div>
              ) : null}

              {isSearch ? (
                <>
                  <div className="field">
                    <label className="field__label" htmlFor="unknown-cost">
                      Unexplored cell cost: {navigation.unknownCost.toFixed(1)}
                    </label>
                    <input
                      id="unknown-cost"
                      className="range"
                      type="range"
                      min={1}
                      max={5}
                      step={0.5}
                      value={navigation.unknownCost}
                      onChange={(event) => setNavigation({ unknownCost: Number(event.target.value) })}
                    />
                    <span className="field__hint">1 = assume open. Higher prefers corridors already seen.</span>
                  </div>
                  <div className="field">
                    <label className="field__label" htmlFor="hazard-penalty">
                      Flood water cost: {navigation.hazardPenalty}
                    </label>
                    <input
                      id="hazard-penalty"
                      className="range"
                      type="range"
                      min={1}
                      max={10}
                      step={1}
                      value={navigation.hazardPenalty}
                      onChange={(event) => setNavigation({ hazardPenalty: Number(event.target.value) })}
                    />
                    <span className="field__hint">Water is passable but slippery. Only a camera can see it.</span>
                  </div>
                  <div className="field">
                    <label className="field__label" htmlFor="replan">
                      Replanning
                    </label>
                    <select
                      id="replan"
                      className="select"
                      value={navigation.replan}
                      onChange={(event) =>
                        setNavigation({ replan: event.target.value as 'every_step' | 'on_change' })
                      }
                    >
                      <option value="on_change">When the route is blocked</option>
                      <option value="every_step">Every step</option>
                    </select>
                  </div>
                  <Switch
                    checked={navigation.turnAware}
                    onChange={(value) => setNavigation({ turnAware: value })}
                    label="Turn-aware planning"
                    hint="Each 90° turn costs a full step. ~4× more nodes."
                  />
                </>
              ) : (
                <div className="field">
                  <label className="field__label" htmlFor="hand">
                    Follow the wall on the
                  </label>
                  <select
                    id="hand"
                    className="select"
                    value={navigation.hand}
                    onChange={(event) => setNavigation({ hand: event.target.value as 'left' | 'right' })}
                  >
                    <option value="right">Right</option>
                    <option value="left">Left</option>
                  </select>
                </div>
              )}
            </div>
          </Card>
        </aside>
      </div>
    </div>
  );
}
