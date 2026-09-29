/** Engineer Challenge contracts: unlimited budget, one maze, fastest time wins. */

export type PartCategory = 'chassis' | 'drive' | 'battery' | 'sensor' | 'compute';

export type SensorFootprint =
  | { kind: 'bumper' }
  | { kind: 'beam'; range: number }
  | { kind: 'cone'; range: number }
  | { kind: 'radial'; range: number };

export interface EngineerSensorSpec {
  footprint: SensorFootprint;
  /** Probability of misreading a cell two or more tiles away. */
  noise: number;
  /** Only vision can tell flood water from dry road. */
  seesHazards: boolean;
}

export interface EngineerPart {
  id: string;
  name: string;
  category: PartCategory;
  massKg: number;
  /** Continuous electrical draw, excluding the drive motor. */
  powerW: number;
  icon: string;
  summary: string;
  motorW?: number;
  capacity?: number;
  grip?: number;
  sensor?: EngineerSensorSpec;
  compute?: { msPerNode: number; overheadMs: number };
}

export interface EngineerBuild {
  partIds: string[];
  /** 30–100. Scales motor output: faster steps, steeper energy cost. */
  throttle: number;
  colour: string;
}

export interface EngineerStats {
  massKg: number;
  motorW: number;
  auxPowerW: number;
  /** Tiles per second, fed straight into the simulation clock. */
  speed: number;
  stepMs: number;
  energyDrain: number;
  batteryCapacity: number;
  grip: number;
  sensors: EngineerSensorSpec[];
  seesHazards: boolean;
  maxRange: number;
  msPerNode: number;
  overheadMs: number;
}

export type PlannerId = 'astar' | 'dijkstra' | 'greedy' | 'wall_follower';

export interface NavigationConfig {
  planner: PlannerId;
  /** A* only: >1 trades optimality for fewer expanded nodes. */
  heuristicWeight: number;
  /** Planning cost of an unexplored cell. 1 = optimistic. */
  unknownCost: number;
  /** Planning cost of a known hazard cell. */
  hazardPenalty: number;
  /** Plan over (cell, heading) so turns are priced in. */
  turnAware: boolean;
  replan: 'every_step' | 'on_change';
  /** Wall follower only. */
  hand: 'left' | 'right';
}

export interface EngineerRun {
  id: string;
  success: boolean;
  failureReason: string | null;
  timeSeconds: number;
  collisions: number;
  energyUsed: number;
  steps: number;
  computeMs: number;
  planner: PlannerId;
  buildSummary: string;
  completedAt: number;
}

export interface LeaderboardEntry {
  id: string;
  name: string;
  timeSeconds: number;
  collisions: number;
  energyUsed: number;
  planner: PlannerId;
  buildSummary: string;
  mapId: string;
  submittedAt: number;
}
