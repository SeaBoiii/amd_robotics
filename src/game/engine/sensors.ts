/**
 * Sensor simulation.
 *
 * Readings are deliberately imperfect. Noise is scaled by the component the
 * student bought and by the mission difficulty, so "my cheap sensor keeps
 * lying to me" is a discovery rather than a bug report.
 */

import type { Heading, RoverStats, SensorReading, SensorType } from '@/types';
import type { Rng } from '@/utils/rng';
import { clamp } from '@/utils/format';
import { HEADING_VECTORS, SLOW_TILES, World, HAZARD_TILES } from './world';

export interface SensorContext {
  world: World;
  x: number;
  y: number;
  heading: Heading;
  stats: RoverStats;
  /** Extra noise multiplier from mission difficulty. */
  difficultyNoise: number;
  rng: Rng;
  timestamp: number;
}

/** Distance in tiles to the first solid tile ahead, capped at sensor range. */
function readDistance(context: SensorContext): number {
  const { world, x, y, heading, stats } = context;
  const { dx, dy } = HEADING_VECTORS[heading];
  const maxRange = Math.max(1, Math.round(stats.sensorRange));

  let distance = maxRange;
  for (let step = 1; step <= maxRange; step++) {
    if (world.isSolid(x + dx * step, y + dy * step)) {
      distance = step - 1;
      break;
    }
  }

  const noise = stats.sensorNoise * context.difficultyNoise * 0.25;
  const noisy = distance + context.rng.gaussian(0, noise);
  return clamp(Math.round(noisy * 10) / 10, 0, maxRange);
}

/**
 * Line sensor: 0 = plain road, 1 = road edge or marking, 2 = off-road surface.
 * Modelled from the tiles beside the rover so it behaves like a real
 * downward-facing reflectance sensor.
 */
function readLine(context: SensorContext): number {
  const { world, x, y } = context;
  const here = world.at(x, y);
  if (SLOW_TILES.has(here) || HAZARD_TILES.has(here)) return 2;

  const neighbours = [
    world.at(x + 1, y),
    world.at(x - 1, y),
    world.at(x, y + 1),
    world.at(x, y - 1),
  ];
  const nearEdge = neighbours.some((char) => char === '#' || char === 'o');
  return nearEdge ? 1 : 0;
}

function readColour(context: SensorContext): string {
  const { world, x, y, heading } = context;
  const { dx, dy } = HEADING_VECTORS[heading];
  const ahead = world.at(x + dx, y + dy);
  switch (ahead) {
    case 'S':
      return 'green';
    case 'T':
      return 'purple';
    case '~':
      return 'blue';
    case '!':
      return 'orange';
    case '#':
    case 'o':
      return 'grey';
    case 'g':
      return 'green';
    case 'B':
      return 'cyan';
    default:
      return 'light-grey';
  }
}

function readTemperature(context: SensorContext): number {
  const { world, x, y, rng, stats } = context;
  const here = world.at(x, y);
  const base = here === '~' ? 24 : here === 'g' ? 28 : 31;
  return Math.round((base + rng.gaussian(0, 0.4 * stats.sensorNoise)) * 10) / 10;
}

function readLight(context: SensorContext): number {
  const { world, x, y, rng } = context;
  // Buildings cast shade: more solid neighbours means a dimmer reading.
  let solid = 0;
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (world.isSolid(x + dx, y + dy)) solid++;
    }
  }
  const value = 100 - solid * 9 + rng.gaussian(0, 3);
  return clamp(Math.round(value), 0, 100);
}

function readSound(context: SensorContext): number {
  const { world, x, y, rng, stats } = context;
  const range = Math.max(2, Math.round(stats.sensorRange));
  let nearest = Infinity;
  for (const target of world.findAll('T')) {
    if (world.isConsumed(target.x, target.y)) continue;
    nearest = Math.min(nearest, Math.abs(target.x - x) + Math.abs(target.y - y));
  }
  if (!Number.isFinite(nearest) || nearest > range) return clamp(Math.round(rng.gaussian(8, 4)), 0, 100);
  const value = 100 - nearest * (70 / range) + rng.gaussian(0, 6 * stats.sensorNoise);
  return clamp(Math.round(value), 0, 100);
}

export function readSensors(context: SensorContext): SensorReading[] {
  const readings: SensorReading[] = [];

  for (const type of context.stats.sensorTypes) {
    const base = { sensorId: `sensor-${type}`, type, timestamp: context.timestamp };
    switch (type) {
      case 'distance':
        readings.push({ ...base, value: readDistance(context), unit: 'tiles' });
        break;
      case 'line':
        readings.push({ ...base, value: readLine(context) });
        break;
      case 'colour':
        readings.push({ ...base, value: readColour(context) });
        break;
      case 'temperature':
        readings.push({ ...base, value: readTemperature(context), unit: '°C' });
        break;
      case 'light':
        readings.push({ ...base, value: readLight(context), unit: '%' });
        break;
      case 'sound':
        readings.push({ ...base, value: readSound(context), unit: '%' });
        break;
      case 'camera':
        // The camera produces a prediction, handled by the simulation engine.
        break;
      default:
        break;
    }
  }

  return readings;
}

/** Tiles currently inside sensor range, used for the sensor-pulse overlay. */
export function sensedTiles(
  x: number,
  y: number,
  heading: Heading,
  range: number,
): { x: number; y: number }[] {
  const { dx, dy } = HEADING_VECTORS[heading];
  const tiles: { x: number; y: number }[] = [];
  for (let step = 1; step <= Math.max(1, Math.round(range)); step++) {
    tiles.push({ x: x + dx * step, y: y + dy * step });
  }
  return tiles;
}

export function hasSensor(types: SensorType[], type: SensorType): boolean {
  return types.includes(type);
}
