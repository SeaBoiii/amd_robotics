/**
 * Grid world helpers. Pure functions over a mission map — no rendering, no
 * state — so the whole world model is testable in Node without a canvas.
 */

import type { Heading, LabelId, Mission, WorldTile } from '@/types';

export const TILE_MEANING: Record<string, string> = {
  '.': 'Road',
  '#': 'Building',
  '~': 'Flood water',
  '!': 'Debris hazard',
  S: 'Supply station',
  T: 'Person or target',
  B: 'Command centre',
  o: 'Obstacle',
  g: 'Greenery',
};

/** Tiles the rover physically cannot enter. */
export const SOLID_TILES = new Set(['#', 'o']);
/** Tiles that are unsafe but passable. */
export const HAZARD_TILES = new Set(['~', '!']);
/** Tiles that slow the rover and cost extra energy. */
export const SLOW_TILES = new Set(['g']);

export const HEADINGS: Heading[] = ['north', 'east', 'south', 'west'];

export const HEADING_VECTORS: Record<Heading, { dx: number; dy: number }> = {
  north: { dx: 0, dy: -1 },
  east: { dx: 1, dy: 0 },
  south: { dx: 0, dy: 1 },
  west: { dx: -1, dy: 0 },
};

export function turn(heading: Heading, direction: 'left' | 'right'): Heading {
  const index = HEADINGS.indexOf(heading);
  const next = direction === 'right' ? (index + 1) % 4 : (index + 3) % 4;
  return HEADINGS[next];
}

/** What the AI camera *should* say about a tile — the ground truth for grading. */
export function tileToLabel(char: string): LabelId {
  if (SOLID_TILES.has(char)) return 'obstacle';
  if (HAZARD_TILES.has(char)) return 'hazard_zone';
  if (char === 'S') return 'supply_station';
  if (char === 'T') return 'person_target';
  return 'clear_path';
}

export class World {
  readonly width: number;
  readonly height: number;
  private grid: string[][];
  /** Tiles consumed during the run (delivered supplies, collected targets). */
  private consumed = new Set<string>();

  constructor(mission: Mission) {
    this.width = mission.map.width;
    this.height = mission.map.height;
    this.grid = mission.map.rows.map((row) => row.padEnd(this.width, '.').slice(0, this.width).split(''));
  }

  inBounds(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < this.width && y < this.height;
  }

  /** Returns the tile character, or '#' outside the map so edges act as walls. */
  at(x: number, y: number): string {
    if (!this.inBounds(x, y)) return '#';
    const key = `${x},${y}`;
    const char = this.grid[y][x];
    if (this.consumed.has(key) && (char === 'S' || char === 'T')) return '.';
    return char;
  }

  isSolid(x: number, y: number): boolean {
    return SOLID_TILES.has(this.at(x, y));
  }

  isHazard(x: number, y: number): boolean {
    return HAZARD_TILES.has(this.at(x, y));
  }

  consume(x: number, y: number): void {
    this.consumed.add(`${x},${y}`);
  }

  isConsumed(x: number, y: number): boolean {
    return this.consumed.has(`${x},${y}`);
  }

  findAll(char: string): { x: number; y: number }[] {
    const found: { x: number; y: number }[] = [];
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        if (this.grid[y][x] === char) found.push({ x, y });
      }
    }
    return found;
  }

  countRemaining(char: string): number {
    return this.findAll(char).filter(({ x, y }) => !this.isConsumed(x, y)).length;
  }

  /** Snapshot for the renderer. */
  toTiles(): WorldTile[] {
    const tiles: WorldTile[] = [];
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        tiles.push({ x, y, char: this.grid[y][x], active: !this.isConsumed(x, y) });
      }
    }
    return tiles;
  }

  /**
   * Breadth-first search for the next step towards the nearest tile matching
   * `targetChar`. Used by the "Return to base" action so that a student rule can
   * express intent ("go home") without hand-writing a path.
   */
  nextStepTowards(
    fromX: number,
    fromY: number,
    targetChar: string,
  ): { x: number; y: number } | null {
    const start = `${fromX},${fromY}`;
    const queue: { x: number; y: number; first: { x: number; y: number } | null }[] = [
      { x: fromX, y: fromY, first: null },
    ];
    const seen = new Set([start]);

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (this.at(current.x, current.y) === targetChar && !(current.x === fromX && current.y === fromY)) {
        return current.first;
      }
      for (const heading of HEADINGS) {
        const { dx, dy } = HEADING_VECTORS[heading];
        const nx = current.x + dx;
        const ny = current.y + dy;
        const key = `${nx},${ny}`;
        if (!this.inBounds(nx, ny) || seen.has(key) || this.isSolid(nx, ny)) continue;
        seen.add(key);
        queue.push({ x: nx, y: ny, first: current.first ?? { x: nx, y: ny } });
      }
    }
    return null;
  }
}
