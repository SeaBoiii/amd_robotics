/**
 * Simulation contracts: the snapshot the UI and the Phaser renderer consume.
 *
 * The simulation is authoritative and runs as plain TypeScript. React and
 * Phaser are both *subscribers*. Neither can mutate the world.
 */

import type { Prediction } from './ai';
import type { RoverState } from './rover';
import type { SensorReading } from './sensor';
import type { MissionResult, ObjectiveResult } from './mission';
import type { Rule } from './program';

export type SimulationPhase = 'idle' | 'running' | 'paused' | 'succeeded' | 'failed';

export interface WorldTile {
  x: number;
  y: number;
  char: string;
  /** Set to false once a supply is delivered / target collected. */
  active: boolean;
}

export type EventKind =
  | 'start'
  | 'move'
  | 'turn'
  | 'collision'
  | 'hazard'
  | 'delivery'
  | 'target'
  | 'prediction'
  | 'rule'
  | 'human'
  | 'energy'
  | 'objective'
  | 'end';

export interface SimulationEvent {
  tick: number;
  timeMs: number;
  kind: EventKind;
  message: string;
  /** Optional structured payload for the debug overlay. */
  data?: Record<string, unknown>;
}

export interface SimulationSnapshot {
  phase: SimulationPhase;
  tick: number;
  elapsedMs: number;
  rover: RoverState;
  tiles: WorldTile[];
  readings: SensorReading[];
  prediction: Prediction | null;
  /** Whether the last prediction was actually correct — debug/report only. */
  predictionCorrect: boolean | null;
  activeRule: Rule | null;
  /** Human-readable description of why the active rule fired. */
  decisionReason: string;
  objectives: ObjectiveResult[];
  events: SimulationEvent[];
  result: MissionResult | null;
  /** Tiles currently inside sensor range, for the sensor-pulse overlay. */
  sensedTiles: { x: number; y: number }[];
}

export interface SimulationControls {
  play(): void;
  pause(): void;
  step(): void;
  reset(): void;
  setSpeed(multiplier: number): void;
  destroy(): void;
}
