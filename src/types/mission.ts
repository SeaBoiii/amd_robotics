/**
 * Mission contracts. Missions are authored as JSON and validated at load time,
 * so new missions can be added without changing any TypeScript.
 */

import type { SensorType } from './sensor';

export type Difficulty = 'explorer' | 'engineer' | 'expert';

/** Single-character map legend. See docs/mission-authoring.md. */
export type TileChar = '.' | '#' | '~' | '!' | 'S' | 'T' | 'B' | 'o' | 'g';

export interface MissionMap {
  width: number;
  height: number;
  /** One string per row, each `width` characters long. */
  rows: string[];
  /** Tile size in pixels used by the Phaser renderer. */
  tileSize: number;
}

export type ObjectiveType =
  | 'reach_base'
  | 'reach_tile'
  | 'deliver_supplies'
  | 'find_targets'
  | 'avoid_hazards'
  | 'no_collisions'
  | 'classify_correctly'
  | 'energy_remaining';

export interface MissionObjective {
  id: string;
  type: ObjectiveType;
  description: string;
  /** Numeric goal: how many supplies, targets, tiles, percent energy, etc. */
  target: number;
  /** Optional tile coordinate for `reach_tile`. */
  tile?: { x: number; y: number };
  required: boolean;
}

export interface FailureCondition {
  type: 'out_of_energy' | 'time_limit' | 'too_many_collisions' | 'entered_hazard';
  /** Threshold; e.g. max collisions allowed. */
  limit?: number;
  message: string;
}

export interface ScoringWeights {
  completion: number;
  aiAccuracy: number;
  reliability: number;
  energy: number;
  time: number;
  safety: number;
  responsibleAi: number;
}

export interface DifficultyModifiers {
  sensorNoise: number;
  aiUncertainty: number;
  energyMultiplier: number;
  timeMultiplier: number;
}

export interface Mission {
  id: string;
  index: number;
  title: string;
  subtitle: string;
  description: string;
  story: string;
  learningObjectives: string[];
  map: MissionMap;
  start: { x: number; y: number; heading: 'north' | 'east' | 'south' | 'west' };
  availableSensors: SensorType[];
  availableComponents: string[];
  budget: number;
  objectives: MissionObjective[];
  failureConditions: FailureCondition[];
  /** Seconds. */
  timeLimit: number;
  scoring: ScoringWeights;
  difficultyModifiers: Record<Difficulty, DifficultyModifiers>;
  hints: string[];
  reflectionQuestions: string[];
  /** Whether this mission needs a trained AI model before it can be run. */
  requiresAI: boolean;
  /** Deterministic seed for repeatable classroom runs. */
  seed: number;
}

export interface MissionSummary {
  id: string;
  index: number;
  title: string;
  subtitle: string;
  requiresAI: boolean;
  file: string;
}

export interface MissionScore {
  total: number;
  completion: number;
  aiAccuracy: number;
  reliability: number;
  energy: number;
  time: number;
  safety: number;
  responsibleAi: number;
}

export interface ObjectiveResult {
  objectiveId: string;
  description: string;
  achieved: boolean;
  progress: number;
  target: number;
}

export interface RunTelemetry {
  ticks: number;
  elapsedSeconds: number;
  distanceTravelled: number;
  energyUsed: number;
  energyRemaining: number;
  collisions: number;
  hazardsEntered: number;
  suppliesDelivered: number;
  targetsFound: number;
  predictionsMade: number;
  correctPredictions: number;
  humanInterventions: number;
  lowConfidenceStops: number;
  seed: number;
}

export interface MissionResult {
  missionId: string;
  attemptNumber: number;
  success: boolean;
  failureReason: string | null;
  score: MissionScore;
  telemetry: RunTelemetry;
  objectives: ObjectiveResult[];
  /** Plain-English "why did the rover do that?" statements. */
  explanations: string[];
  suggestions: string[];
  badgesEarned: string[];
  completedAt: number;
  difficulty: Difficulty;
}
