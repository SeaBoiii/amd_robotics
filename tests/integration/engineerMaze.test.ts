import { describe, expect, it } from 'vitest';
import { Simulation } from '@/game/engine/simulation';
import { World } from '@/game/engine/world';
import { validateMission } from '@/missions/validateMission';
import { createDefaultEngineerBuild } from '@/engineer/catalogue';
import { KnownMap } from '@/engineer/navigation/knownMap';
import { planPath } from '@/engineer/navigation/planner';
import {
  DEFAULT_NAVIGATION,
  ENGINEER_MAZE,
  MAZE_GOAL,
  createEngineerSimulationConfig,
} from '@/engineer/maze';
import type { EngineerBuild, NavigationConfig, PlannerId } from '@/engineer/types';

function runMaze(build: EngineerBuild, navigation: NavigationConfig) {
  const simulation = new Simulation(createEngineerSimulationConfig(build, navigation));
  simulation.start();
  for (let i = 0; i < 4000 && !simulation.isFinished(); i++) simulation.step();
  return simulation.getSnapshot();
}

function fullyKnownMap(): KnownMap {
  const world = new World(ENGINEER_MAZE);
  const map = new KnownMap(world.width, world.height);
  for (let y = 0; y < world.height; y++) {
    for (let x = 0; x < world.width; x++) {
      map.set(x, y, world.isSolid(x, y) ? '#' : world.isHazard(x, y) ? '~' : '.');
    }
  }
  return map;
}

describe('engineer maze', () => {
  it('passes mission schema validation', () => {
    const result = validateMission(ENGINEER_MAZE, 'eng-maze-01');
    expect(result.errors).toEqual([]);
  });

  it('has a reachable exit', () => {
    const { path } = planPath({
      map: fullyKnownMap(),
      start: ENGINEER_MAZE.start,
      goal: MAZE_GOAL,
      config: { ...DEFAULT_NAVIGATION, planner: 'dijkstra', hazardPenalty: 1 },
    });
    expect(path.length).toBeGreaterThan(1);
  });

  it.each<PlannerId>(['astar', 'dijkstra', 'greedy', 'wall_follower'])(
    'the default build completes the maze with %s',
    (planner) => {
      const snapshot = runMaze(createDefaultEngineerBuild(), { ...DEFAULT_NAVIGATION, planner });
      expect(snapshot.result?.failureReason ?? null).toBeNull();
      expect(snapshot.result?.success).toBe(true);
    },
  );

  it('is deterministic', () => {
    const first = runMaze(createDefaultEngineerBuild(), DEFAULT_NAVIGATION);
    const second = runMaze(createDefaultEngineerBuild(), DEFAULT_NAVIGATION);
    expect(second.result?.telemetry).toEqual(first.result?.telemetry);
  });

  it('only reveals cells the sensors have seen', () => {
    const simulation = new Simulation(
      createEngineerSimulationConfig(createDefaultEngineerBuild(), DEFAULT_NAVIGATION),
    );
    simulation.step();
    const known = simulation.getSnapshot().navigation!.known;
    expect(known.includes('?')).toBe(true);
    expect(known[MAZE_GOAL.y * ENGINEER_MAZE.map.width + MAZE_GOAL.x]).toBe('?');
  });
});
