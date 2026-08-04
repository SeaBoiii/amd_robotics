/**
 * Sensing contracts.
 *
 * A sensor is a *description* (what it costs, what it can do) plus a *reading*
 * (what it observed at a point in time). The simulator and any future physical
 * hardware adapter both produce the same `SensorReading` shape, which is what
 * lets student programs run unchanged on either.
 */

export type SensorType =
  | 'distance'
  | 'line'
  | 'camera'
  | 'colour'
  | 'temperature'
  | 'light'
  | 'sound';

export interface SensorReading {
  sensorId: string;
  type: SensorType;
  value: number | string | boolean;
  /** Simulation time in milliseconds since the mission started. */
  timestamp: number;
  /** Optional human-readable unit, shown in the HUD (e.g. "cm", "°C", "%"). */
  unit?: string;
}

/** A sensor that is currently fitted to the rover and producing readings. */
export interface Sensor {
  id: string;
  type: SensorType;
  label: string;
  /** Maximum useful range in grid tiles. Unused by non-spatial sensors. */
  range: number;
  /** Standard deviation of gaussian noise added to numeric readings. */
  noise: number;
  /** Energy drawn per simulation tick while powered on. */
  energyPerTick: number;
}
