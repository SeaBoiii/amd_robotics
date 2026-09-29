/**
 * Sensor footprints for the Engineer Challenge. Each sensor reports cells it
 * has line of sight to; far cells are occasionally misread (seeded noise).
 */

import type { PerceivedTile } from '@/game/engine/simulation';
import type { SensorContext } from '@/game/engine/sensors';
import { HAZARD_TILES, HEADING_VECTORS, type World } from '@/game/engine/world';
import type { EngineerStats, SensorFootprint } from '../types';

function hasLineOfSight(world: World, x0: number, y0: number, x1: number, y1: number): boolean {
  let x = x0;
  let y = y0;
  const dx = Math.abs(x1 - x0);
  const dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let error = dx + dy;
  while (!(x === x1 && y === y1)) {
    const doubled = 2 * error;
    if (doubled >= dy) {
      error += dy;
      x += sx;
    }
    if (doubled <= dx) {
      error += dx;
      y += sy;
    }
    if (x === x1 && y === y1) return true;
    if (world.isSolid(x, y)) return false;
  }
  return true;
}

function footprintCells(
  footprint: SensorFootprint,
  context: SensorContext,
): { x: number; y: number }[] {
  const { world, x, y, heading } = context;
  const cells: { x: number; y: number }[] = [];
  if (footprint.kind === 'bumper') return cells;

  const range = footprint.range;
  const { dx: fx, dy: fy } = HEADING_VECTORS[heading];

  if (footprint.kind === 'beam') {
    for (let step = 1; step <= range; step++) {
      const cx = x + fx * step;
      const cy = y + fy * step;
      if (!world.inBounds(cx, cy)) break;
      cells.push({ x: cx, y: cy });
      if (world.isSolid(cx, cy)) break;
    }
    return cells;
  }

  for (let oy = -range; oy <= range; oy++) {
    for (let ox = -range; ox <= range; ox++) {
      if (ox === 0 && oy === 0) continue;
      if (ox * ox + oy * oy > range * range) continue;
      if (footprint.kind === 'cone') {
        const forward = ox * fx + oy * fy;
        const lateral = Math.abs(ox * fy - oy * fx);
        if (forward < 1 || lateral > forward) continue;
      }
      const cx = x + ox;
      const cy = y + oy;
      if (!world.inBounds(cx, cy)) continue;
      if (hasLineOfSight(world, x, y, cx, cy)) cells.push({ x: cx, y: cy });
    }
  }
  return cells;
}

export function perceive(context: SensorContext, stats: EngineerStats): PerceivedTile[] {
  const { world, x, y, rng } = context;
  const seen = new Map<number, { x: number; y: number; noise: number; hazard: boolean }>();

  for (const sensor of stats.sensors) {
    for (const cell of footprintCells(sensor.footprint, context)) {
      const key = cell.y * world.width + cell.x;
      const existing = seen.get(key);
      if (existing) {
        existing.noise = Math.min(existing.noise, sensor.noise);
        existing.hazard ||= sensor.seesHazards;
      } else {
        seen.set(key, { ...cell, noise: sensor.noise, hazard: sensor.seesHazards });
      }
    }
  }

  const tiles: PerceivedTile[] = [{ x, y, char: world.isHazard(x, y) && stats.seesHazards ? '~' : '.' }];
  for (const cell of seen.values()) {
    const solid = world.isSolid(cell.x, cell.y);
    let char: PerceivedTile['char'] = solid
      ? '#'
      : cell.hazard && HAZARD_TILES.has(world.at(cell.x, cell.y))
        ? '~'
        : '.';
    const distance = Math.abs(cell.x - x) + Math.abs(cell.y - y);
    if (distance >= 2 && rng.chance(cell.noise * context.difficultyNoise)) {
      char = solid ? '.' : '#';
    }
    tiles.push({ x: cell.x, y: cell.y, char });
  }
  return tiles;
}
