/**
 * Engineer Challenge parts catalogue.
 *
 * Budget is unlimited, so mass and power are the trade-off: every part slows
 * the rover down or drains the battery faster.
 */

import type { RoverStats } from '@/types';
import { clamp } from '@/utils/format';
import type { EngineerBuild, EngineerPart, EngineerStats, PartCategory } from './types';

export const ENGINEER_PARTS: EngineerPart[] = [
  // ---------------------------------------------------------------- chassis
  {
    id: 'chassis-carbon',
    name: 'Carbon-fibre frame',
    category: 'chassis',
    massKg: 2,
    powerW: 0,
    grip: 1,
    icon: '🪶',
    summary: 'Lightest frame. Skittish on wet ground.',
  },
  {
    id: 'chassis-aluminium',
    name: 'Aluminium frame',
    category: 'chassis',
    massKg: 3.5,
    powerW: 0,
    grip: 1.5,
    icon: '🔩',
    summary: 'Balanced weight and grip.',
  },
  {
    id: 'chassis-tracked',
    name: 'Tracked rugged chassis',
    category: 'chassis',
    massKg: 6,
    powerW: 0,
    grip: 3,
    icon: '🛞',
    summary: 'Barely slips on water. Heavy.',
  },
  // ------------------------------------------------------------------ drive
  {
    id: 'drive-150',
    name: '150 W brushless drive',
    category: 'drive',
    massKg: 1.5,
    powerW: 0,
    motorW: 150,
    icon: '⚙️',
    summary: 'Efficient, modest top speed.',
  },
  {
    id: 'drive-300',
    name: '300 W brushless drive',
    category: 'drive',
    massKg: 2.4,
    powerW: 0,
    motorW: 300,
    icon: '🔧',
    summary: 'Quick, needs a decent battery.',
  },
  {
    id: 'drive-500',
    name: '500 W racing drive',
    category: 'drive',
    massKg: 3.6,
    powerW: 0,
    motorW: 500,
    icon: '🏎️',
    summary: 'Fastest. Eats batteries.',
  },
  // ---------------------------------------------------------------- battery
  {
    id: 'battery-s',
    name: 'Li-ion pack S',
    category: 'battery',
    massKg: 1,
    powerW: 0,
    capacity: 80,
    icon: '🔋',
    summary: '80 units. Light.',
  },
  {
    id: 'battery-m',
    name: 'Li-ion pack M',
    category: 'battery',
    massKg: 2,
    powerW: 0,
    capacity: 140,
    icon: '🔋',
    summary: '140 units.',
  },
  {
    id: 'battery-l',
    name: 'Li-ion pack L',
    category: 'battery',
    massKg: 3.5,
    powerW: 0,
    capacity: 240,
    icon: '🔋',
    summary: '240 units. Heavy.',
  },
  // ---------------------------------------------------------------- sensors
  {
    id: 'sensor-bumper',
    name: 'Contact bumper',
    category: 'sensor',
    massKg: 0.1,
    powerW: 0,
    sensor: { footprint: { kind: 'bumper' }, noise: 0, seesHazards: false },
    icon: '🛡️',
    summary: 'Only learns about a wall by hitting it.',
  },
  {
    id: 'sensor-tof',
    name: 'Time-of-flight beam (4 tiles)',
    category: 'sensor',
    massKg: 0.2,
    powerW: 2,
    sensor: { footprint: { kind: 'beam', range: 4 }, noise: 0.03, seesHazards: false },
    icon: '📡',
    summary: 'Straight ahead only.',
  },
  {
    id: 'sensor-laser',
    name: 'Laser rangefinder (10 tiles)',
    category: 'sensor',
    massKg: 0.5,
    powerW: 6,
    sensor: { footprint: { kind: 'beam', range: 10 }, noise: 0.01, seesHazards: false },
    icon: '🔭',
    summary: 'Long, precise, narrow.',
  },
  {
    id: 'sensor-stereo',
    name: 'Stereo vision camera',
    category: 'sensor',
    massKg: 0.4,
    powerW: 8,
    sensor: { footprint: { kind: 'cone', range: 5 }, noise: 0.05, seesHazards: true },
    icon: '📷',
    summary: '90° cone. The only sensor that recognises flood water.',
  },
  {
    id: 'sensor-lidar-2d',
    name: '2D LiDAR (radius 3)',
    category: 'sensor',
    massKg: 0.6,
    powerW: 8,
    sensor: { footprint: { kind: 'radial', range: 3 }, noise: 0.02, seesHazards: false },
    icon: '🌀',
    summary: '360° scan, short range.',
  },
  {
    id: 'sensor-lidar-360',
    name: '360° LiDAR (radius 5)',
    category: 'sensor',
    massKg: 1.2,
    powerW: 15,
    sensor: { footprint: { kind: 'radial', range: 5 }, noise: 0.02, seesHazards: false },
    icon: '💫',
    summary: 'Sees round corners early.',
  },
  {
    id: 'sensor-lidar-3d',
    name: '3D LiDAR (radius 8)',
    category: 'sensor',
    massKg: 2.8,
    powerW: 35,
    sensor: { footprint: { kind: 'radial', range: 8 }, noise: 0.01, seesHazards: false },
    icon: '🛰️',
    summary: 'Maps most of a corridor at once. Heavy and hungry.',
  },
  // ---------------------------------------------------------------- compute
  {
    id: 'compute-cpu',
    name: 'Ryzen Embedded CPU',
    category: 'compute',
    massKg: 0.3,
    powerW: 15,
    compute: { msPerNode: 0.5, overheadMs: 1 },
    icon: '🧮',
    summary: 'General purpose. Slow per search node.',
  },
  {
    id: 'compute-gpu',
    name: 'Radeon GPU module',
    category: 'compute',
    massKg: 1.8,
    powerW: 75,
    compute: { msPerNode: 0.06, overheadMs: 12 },
    icon: '🟥',
    summary: 'Massively parallel, but every launch has overhead.',
  },
  {
    id: 'compute-npu',
    name: 'Ryzen AI NPU',
    category: 'compute',
    massKg: 0.3,
    powerW: 8,
    compute: { msPerNode: 0.15, overheadMs: 2 },
    icon: '🧠',
    summary: 'Efficient accelerator. Good all-rounder.',
  },
  {
    id: 'compute-fpga',
    name: 'Versal adaptive SoC (FPGA)',
    category: 'compute',
    massKg: 1,
    powerW: 30,
    compute: { msPerNode: 0.04, overheadMs: 1 },
    icon: '🔲',
    summary: 'Planner baked into hardware. Lowest latency.',
  },
];

export const PARTS_BY_ID = new Map(ENGINEER_PARTS.map((part) => [part.id, part]));

/** Categories where exactly one part must be fitted. */
export const SINGLE_SLOT: PartCategory[] = ['chassis', 'drive', 'battery', 'compute'];

export const CATEGORY_LABELS: Record<PartCategory, string> = {
  chassis: 'Chassis',
  drive: 'Drive',
  battery: 'Battery',
  sensor: 'Sensors',
  compute: 'Compute',
};

export function createDefaultEngineerBuild(colour = '#ed1c24'): EngineerBuild {
  return {
    partIds: ['chassis-aluminium', 'drive-150', 'battery-m', 'sensor-lidar-360', 'compute-npu'],
    throttle: 80,
    colour,
  };
}

function partsOf(build: EngineerBuild): EngineerPart[] {
  return build.partIds
    .map((id) => PARTS_BY_ID.get(id))
    .filter((part): part is EngineerPart => Boolean(part));
}

export function computeEngineerStats(build: EngineerBuild): EngineerStats {
  const parts = partsOf(build);
  const massKg = parts.reduce((sum, part) => sum + part.massKg, 0);
  const auxPowerW = parts.reduce((sum, part) => sum + part.powerW, 0);
  const motorW = parts.find((part) => part.category === 'drive')?.motorW ?? 0;
  const throttle = clamp(build.throttle, 30, 100) / 100;

  // Power-to-weight sets pace; square root keeps big motors from being free wins.
  const speed = motorW > 0 ? 0.6 * Math.sqrt((motorW * throttle) / Math.max(1, massKg)) : 0.25;
  const energyDrain = 0.8 * (motorW / 150) * (0.4 + 0.6 * throttle * throttle) + auxPowerW / 100;

  const sensors = parts.flatMap((part) => (part.sensor ? [part.sensor] : []));
  const compute = parts.find((part) => part.category === 'compute')?.compute;

  return {
    massKg: Math.round(massKg * 10) / 10,
    motorW,
    auxPowerW,
    speed,
    stepMs: clamp(900 / Math.max(0.25, speed), 90, 3000),
    energyDrain: Math.max(0.15, energyDrain),
    batteryCapacity: parts.reduce((sum, part) => sum + (part.capacity ?? 0), 0),
    grip: parts.reduce((best, part) => Math.max(best, part.grip ?? 0), 0) || 1,
    sensors,
    seesHazards: sensors.some((sensor) => sensor.seesHazards),
    maxRange: sensors.reduce(
      (best, sensor) => Math.max(best, sensor.footprint.kind === 'bumper' ? 0 : sensor.footprint.range),
      0,
    ),
    // No compute module means planning on a microcontroller.
    msPerNode: compute?.msPerNode ?? 2,
    overheadMs: compute?.overheadMs ?? 5,
  };
}

/** Adapts engineer stats to the shape the shared simulation expects. */
export function toRoverStats(stats: EngineerStats): RoverStats {
  return {
    totalCost: 0,
    speed: stats.speed,
    energyDrain: stats.energyDrain,
    batteryCapacity: stats.batteryCapacity,
    sensorNoise: 1,
    sensorRange: stats.maxRange,
    grip: stats.grip,
    cargoCapacity: 0,
    hasTelemetry: false,
    sensorTypes: [],
  };
}

export interface EngineerBuildProblem {
  severity: 'error' | 'warning';
  message: string;
}

export function checkEngineerBuild(build: EngineerBuild): EngineerBuildProblem[] {
  const parts = partsOf(build);
  const problems: EngineerBuildProblem[] = [];
  for (const category of SINGLE_SLOT) {
    const count = parts.filter((part) => part.category === category).length;
    if (count === 0) problems.push({ severity: 'error', message: `Fit a ${CATEGORY_LABELS[category].toLowerCase()} part.` });
    if (count > 1) problems.push({ severity: 'error', message: `Only one ${CATEGORY_LABELS[category].toLowerCase()} part allowed.` });
  }
  if (!parts.some((part) => part.category === 'sensor')) {
    problems.push({ severity: 'warning', message: 'No sensors: the rover will drive blind and crash.' });
  }
  return problems;
}

export function summariseBuild(build: EngineerBuild): string {
  const short = (id: string) => PARTS_BY_ID.get(id)?.name.replace(/\s*\(.*\)$/, '') ?? id;
  return [...partsOf(build).map((part) => short(part.id)), `${build.throttle}%`].join(' · ');
}
