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
import { Segmented, Stepper } from './TouchControls';

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
    <div className="engineer-screen">
      <div className="engineer-screen__header">
        <div>
          <h1>Build and configure</h1>
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

      <div className="engineer-cols engineer-cols--build">
        <Card title="Parts" subtitle="Tap to fit. One of each, except sensors.">
          {CATEGORIES.map((category) => (
            <div key={category}>
              <h2 className="engineer-section-label">
                {CATEGORY_LABELS[category]}
                {category === 'sensor' ? ' · any combination' : ''}
              </h2>
              <div className="engineer-parts">
                {ENGINEER_PARTS.filter((part) => part.category === category).map((part) => {
                  const selected = build.partIds.includes(part.id);
                  return (
                    <button
                      key={part.id}
                      type="button"
                      className={cx('card', 'card--interactive', 'engineer-part', selected && 'card--selected')}
                      aria-pressed={selected}
                      title={part.summary}
                      onClick={() => togglePart(part.id)}
                    >
                      <span className="engineer-part__name">
                        <span aria-hidden="true">{part.icon}</span> {part.name}
                      </span>
                      <span className="text-xs text-muted engineer-part__summary">{part.summary}</span>
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
            </div>
          ))}
        </Card>

        <div className="engineer-col">
          <Card title="Performance">
            <div className="engineer-stats">
              <Stat label="Mass" value={`${stats.massKg} kg`} />
              <Stat label="Step time" value={`${Math.round(stats.stepMs)} ms`} sub={`${stats.speed.toFixed(2)} tiles/s`} />
              <Stat label="Battery" value={stats.batteryCapacity} sub={`≈ ${Math.floor(stats.batteryCapacity / energyPerTile)} tiles`} />
              <Stat label="Energy / tile" value={energyPerTile.toFixed(2)} />
              <Stat label="Sensor reach" value={`${stats.maxRange} tiles`} sub={stats.seesHazards ? 'sees water' : 'blind to water'} />
              <Stat label="Planning" value={`${stats.msPerNode} ms/node`} sub={`+${stats.overheadMs} ms per plan`} />
            </div>
            <div style={{ marginTop: 'var(--sp-3)' }}>
              <Stepper
                label="Throttle"
                value={build.throttle}
                min={30}
                max={100}
                step={5}
                format={(value) => `${value}%`}
                onChange={setThrottle}
              />
            </div>
            {problems.map((problem) => (
              <Callout key={problem.message} tone={problem.severity === 'error' ? 'danger' : 'warning'}>
                {problem.message}
              </Callout>
            ))}
          </Card>
        </div>

          <Card title="Navigation">
            <div className="stack">
              <Segmented
                label="Planner"
                value={navigation.planner}
                options={(Object.keys(PLANNER_LABELS) as PlannerId[]).map((id) => ({
                  value: id,
                  label: PLANNER_LABELS[id],
                }))}
                onChange={(planner) => setNavigation({ planner })}
                hint={PLANNER_HELP[navigation.planner]}
              />

              {navigation.planner === 'astar' ? (
                <Stepper
                  label="Heuristic weight"
                  value={navigation.heuristicWeight}
                  min={1}
                  max={3}
                  step={0.25}
                  format={(value) => value.toFixed(2)}
                  onChange={(heuristicWeight) => setNavigation({ heuristicWeight })}
                  hint="Above 1 searches fewer nodes but may miss the best route."
                />
              ) : null}

              {isSearch ? (
                <>
                  <Stepper
                    label="Unexplored cell cost"
                    value={navigation.unknownCost}
                    min={1}
                    max={5}
                    step={0.5}
                    format={(value) => value.toFixed(1)}
                    onChange={(unknownCost) => setNavigation({ unknownCost })}
                    hint="1 = assume open. Higher prefers corridors already seen."
                  />
                  <Stepper
                    label="Flood water cost"
                    value={navigation.hazardPenalty}
                    min={1}
                    max={10}
                    step={1}
                    onChange={(hazardPenalty) => setNavigation({ hazardPenalty })}
                    hint="Water is passable but slippery. Only a camera can see it."
                  />
                  <Segmented
                    label="Replanning"
                    value={navigation.replan}
                    options={[
                      { value: 'on_change', label: 'When blocked' },
                      { value: 'every_step', label: 'Every step' },
                    ]}
                    onChange={(replan) => setNavigation({ replan })}
                  />
                  <Switch
                    checked={navigation.turnAware}
                    onChange={(value) => setNavigation({ turnAware: value })}
                    label="Turn-aware planning"
                    hint="Each 90° turn costs a full step. ~4× more nodes."
                  />
                </>
              ) : (
                <Segmented
                  label="Follow the wall on the"
                  value={navigation.hand}
                  options={[
                    { value: 'left', label: 'Left' },
                    { value: 'right', label: 'Right' },
                  ]}
                  onChange={(hand) => setNavigation({ hand })}
                />
              )}
            </div>
          </Card>
      </div>
    </div>
  );
}
