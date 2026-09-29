/** The single Engineer Challenge maze and the simulation wiring around it. */

import type { Mission } from '@/types';
import type { SimulationConfig } from '@/game/engine/simulation';
import { computeEngineerStats, toRoverStats } from './catalogue';
import { createNavigator } from './navigation/navigator';
import type { EngineerBuild, NavigationConfig } from './types';

export const MAZE_GOAL = { x: 29, y: 19 };

// 'o' are obstacles missing from any floor plan; '~' is flood water (passable, slippery).
export const ENGINEER_MAZE: Mission = {
  id: 'eng-maze-01',
  index: 1,
  title: 'Engineer Challenge: The Maze',
  subtitle: 'Fastest autonomous run to the exit wins.',
  description: 'Reach the exit in the bottom-right corner as fast as possible.',
  story: 'An unmapped facility. Your rover starts blind and must find the fastest way through.',
  learningObjectives: ['Trade mass, power and sensing for speed', 'Choose and tune a path planner'],
  map: {
    width: 31,
    height: 21,
    tileSize: 40,
    rows: [
      '###############################',
      '#B................#.......#...#',
      '###.#.###.###.###.#.#.#o#.#.###',
      '#...#.#...........#.#.#...#...#',
      '#.###.#.###########.#.#.#.###.#',
      '#.#...#......o......#.#...#...#',
      '#.#.###.#############.#.###.#.#',
      '#...#.....#.........#.#.#.....#',
      '#.#.#######.#.###.#.#.#.#.###.#',
      '#.#.....#...#.....#...#...#...#',
      '#.#.#.#.#.#.#####.#.#.###.#.#.#',
      '#.#...#..o........#...........#',
      '#.###.#####.###.#.#.###.###.#.#',
      '#.....#...#.......#...#.#.#.#.#',
      '#####.#.#.#.#.#.###.#.#.#.#.#.#',
      '#.......#.#...#.......#.....#.#',
      '#.###.###.#~#.#.#.###.#.#####.#',
      '#.#.#.....~~#.#.#...#...#.....#',
      '#.#.#.#######.#.###.#.###.###.#',
      '#...#.........#...............#',
      '###############################',
    ],
  },
  start: { x: 1, y: 1, heading: 'east' },
  availableSensors: ['distance'],
  availableComponents: ['engineer-catalogue'],
  budget: 1_000_000,
  objectives: [
    {
      id: 'reach-exit',
      type: 'reach_tile',
      description: 'Reach the exit',
      target: 1,
      tile: MAZE_GOAL,
      required: true,
    },
  ],
  failureConditions: [
    { type: 'out_of_energy', message: 'The battery went flat before the exit.' },
    { type: 'time_limit', message: 'Out of time. The run is void.' },
    { type: 'too_many_collisions', limit: 15, message: 'Too many collisions. The rover was retired.' },
  ],
  timeLimit: 300,
  scoring: {
    completion: 40,
    aiAccuracy: 0,
    reliability: 20,
    energy: 15,
    time: 10,
    safety: 15,
    responsibleAi: 0,
  },
  difficultyModifiers: {
    explorer: { sensorNoise: 1, aiUncertainty: 0, energyMultiplier: 1, timeMultiplier: 1 },
    engineer: { sensorNoise: 1, aiUncertainty: 0, energyMultiplier: 1, timeMultiplier: 1 },
    expert: { sensorNoise: 1, aiUncertainty: 0, energyMultiplier: 1, timeMultiplier: 1 },
  },
  hints: ['Turns cost a full step. Try turn-aware planning.'],
  reflectionQuestions: [],
  requiresAI: false,
  seed: 20260929,
};

export const DEFAULT_NAVIGATION: NavigationConfig = {
  planner: 'astar',
  heuristicWeight: 1,
  unknownCost: 1,
  hazardPenalty: 3,
  turnAware: false,
  replan: 'on_change',
  hand: 'right',
};

export function createEngineerSimulationConfig(
  build: EngineerBuild,
  navigation: NavigationConfig,
): SimulationConfig {
  const stats = computeEngineerStats(build);
  return {
    mission: ENGINEER_MAZE,
    program: { missionId: ENGINEER_MAZE.id, rules: [], version: 1, updatedAt: 0 },
    build: { componentIds: [], motorPower: build.throttle, colour: build.colour },
    model: null,
    confidencePolicy: { actAbove: 0.8, verifyAbove: 0.5 },
    difficulty: 'engineer',
    attemptNumber: 1,
    previouslyFailed: false,
    statsOverride: toRoverStats(stats),
    navigator: createNavigator({
      stats,
      config: navigation,
      goal: MAZE_GOAL,
      width: ENGINEER_MAZE.map.width,
      height: ENGINEER_MAZE.map.height,
    }),
  };
}
