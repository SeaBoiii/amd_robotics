import { describe, expect, it } from 'vitest';
import type { Heading } from '@/types';
import { readSensors, sensedTiles } from '@/game/engine/sensors';
import { World } from '@/game/engine/world';
import { computeStats } from '@/robotics/components';
import { createRng } from '@/utils/rng';
import { makeBuild, makeMission } from '../fixtures';

const MISSION = makeMission();

function read(
  overrides: { x?: number; y?: number; heading?: Heading; difficultyNoise?: number; seed?: number } = {},
) {
  return readSensors({
    world: new World(MISSION),
    x: overrides.x ?? 1,
    y: overrides.y ?? 1,
    heading: overrides.heading ?? 'east',
    stats: computeStats(makeBuild()),
    difficultyNoise: overrides.difficultyNoise ?? 0,
    rng: createRng(overrides.seed ?? 99),
    timestamp: 0,
  });
}

const distanceOf = (readings: ReturnType<typeof read>) =>
  Number(readings.find((reading) => reading.type === 'distance')?.value ?? -1);

describe('sensor readings', () => {
  it('produces one reading per fitted sensor that measures a value', () => {
    // The camera is fitted but produces a prediction, not a reading.
    const measuring = computeStats(makeBuild()).sensorTypes.filter((type) => type !== 'camera');
    expect(read()).toHaveLength(measuring.length);
  });

  it('gives every reading an id, a type and a timestamp', () => {
    for (const reading of read()) {
      expect(reading.sensorId).toBeTruthy();
      expect(reading.type).toBeTruthy();
      expect(reading.timestamp).toBe(0);
    }
  });

  it('reports a shorter distance when a wall is closer', () => {
    expect(distanceOf(read({ x: 3, y: 1, heading: 'east' }))).toBeLessThan(
      distanceOf(read({ x: 1, y: 1, heading: 'east' })),
    );
  });

  it('reports zero distance when the rover is nose-to-nose with a wall', () => {
    expect(distanceOf(read({ x: 4, y: 1, heading: 'east' }))).toBe(0);
  });

  it('never reports a negative distance or one beyond sensor range', () => {
    const range = Math.round(computeStats(makeBuild()).sensorRange);
    for (const heading of ['north', 'east', 'south', 'west'] as Heading[]) {
      const distance = distanceOf(read({ heading, difficultyNoise: 3 }));
      expect(distance).toBeGreaterThanOrEqual(0);
      expect(distance).toBeLessThanOrEqual(range);
    }
  });

  it('is noise-free when the difficulty multiplier is zero', () => {
    expect(distanceOf(read({ seed: 1 }))).toBe(distanceOf(read({ seed: 2 })));
  });

  it('is deterministic for the same seed even with noise switched on', () => {
    expect(read({ difficultyNoise: 2, seed: 7 })).toEqual(read({ difficultyNoise: 2, seed: 7 }));
  });

  it('lists the tiles ahead of the rover for the sensor overlay', () => {
    const tiles = sensedTiles(1, 1, 'east', 3);
    expect(tiles).toEqual([
      { x: 2, y: 1 },
      { x: 3, y: 1 },
      { x: 4, y: 1 },
    ]);
  });
});

describe('world model', () => {
  it('treats out-of-bounds tiles as walls so the rover cannot escape', () => {
    const world = new World(MISSION);
    expect(world.isSolid(-1, 0)).toBe(true);
    expect(world.isSolid(999, 999)).toBe(true);
  });

  it('reads the map exactly as authored', () => {
    const world = new World(MISSION);
    expect(world.at(1, 1)).toBe('B');
    expect(world.at(0, 0)).toBe('#');
    expect(world.at(4, 3)).toBe('S');
  });
});
