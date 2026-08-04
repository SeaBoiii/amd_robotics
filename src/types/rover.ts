/**
 * Rover contracts: what a rover is made of and how it can be commanded.
 */

import type { SensorType } from './sensor';

export type ComponentCategory =
  | 'sensor'
  | 'wheel'
  | 'motor'
  | 'battery'
  | 'storage'
  | 'communication';

/**
 * A catalogue entry in the Rover Workshop. Components are pure data so that
 * educators can rebalance the game without touching TypeScript.
 */
export interface RoverComponent {
  id: string;
  name: string;
  category: ComponentCategory;
  /** Sensor type provided, when `category === 'sensor'`. */
  sensorType?: SensorType;
  /** Engineering-budget cost in credits. */
  cost: number;
  /** Short student-facing explanation of what this part does. */
  explanation: string;
  advantages: string[];
  limitations: string[];
  /** How the part changes rover performance. All fields are optional deltas. */
  effects: RoverComponentEffects;
  icon: string;
}

export interface RoverComponentEffects {
  /** Tiles per second added to base speed. */
  speed?: number;
  /** Multiplier on energy drawn while driving. Lower is more efficient. */
  energyDrain?: number;
  /** Extra battery capacity. */
  capacity?: number;
  /** Multiplier on sensor noise. Lower is a cleaner signal. */
  noise?: number;
  /** Detection range in tiles. */
  range?: number;
  /** Grip: reduces the chance of slipping on wet or damaged road tiles. */
  grip?: number;
  /** Number of supply packages the rover can carry. */
  cargo?: number;
  /** Enables "request human help" actions. */
  telemetry?: boolean;
}

/** The rover a team has actually built. */
export interface RoverBuild {
  /** Component ids selected from the catalogue. */
  componentIds: string[];
  /** 0–100. Higher is faster but drains more energy. */
  motorPower: number;
  /** Hex colour chosen in Team Setup. */
  colour: string;
}

/** Derived, read-only performance figures computed from a `RoverBuild`. */
export interface RoverStats {
  totalCost: number;
  speed: number;
  energyDrain: number;
  batteryCapacity: number;
  sensorNoise: number;
  sensorRange: number;
  grip: number;
  cargoCapacity: number;
  hasTelemetry: boolean;
  sensorTypes: SensorType[];
}

export type Heading = 'north' | 'east' | 'south' | 'west';

/**
 * The complete command vocabulary understood by every rover controller,
 * simulated or physical. Keep this list small and explicit — it is the
 * contract that lets a student program drive real hardware later.
 */
export type RoverCommand =
  | { type: 'forward'; speed: number }
  | { type: 'reverse'; speed: number }
  | { type: 'turnLeft' }
  | { type: 'turnRight' }
  | { type: 'stop' }
  | { type: 'wait' }
  | { type: 'deliverSupply' }
  | { type: 'pickUpTarget' }
  | { type: 'scan' }
  | { type: 'requestHumanHelp'; reason: string }
  | { type: 'returnToBase' };

/** Live state of the rover during a run. */
export interface RoverState {
  x: number;
  y: number;
  heading: Heading;
  energy: number;
  maxEnergy: number;
  carrying: number;
  distanceTravelled: number;
  collisions: number;
  lastCommand: RoverCommand | null;
  status: 'idle' | 'driving' | 'turning' | 'stopped' | 'waiting-for-human' | 'disabled';
}
