/**
 * Grid path planners over the rover's known map.
 *
 * One best-first search covers Dijkstra, A* and greedy by changing the
 * priority. With `turnAware`, states are (cell, heading) so a 90° turn costs
 * one step — exactly what it costs in the simulation.
 */

import type { Heading } from '@/types';
import { HEADINGS, HEADING_VECTORS } from '@/game/engine/world';
import type { NavigationConfig } from '../types';
import type { KnownCell, KnownMap } from './knownMap';

export interface PlanRequest {
  map: KnownMap;
  start: { x: number; y: number; heading: Heading };
  goal: { x: number; y: number };
  config: NavigationConfig;
}

export interface PlanResult {
  /** Cells from the start (inclusive) to the goal (inclusive). Empty when unreachable. */
  path: { x: number; y: number }[];
  nodesExpanded: number;
}

const MAX_EXPANSIONS = 50_000;

class MinHeap {
  private items: { key: number; priority: number; order: number }[] = [];
  private counter = 0;

  get size(): number {
    return this.items.length;
  }

  push(key: number, priority: number): void {
    this.items.push({ key, priority, order: this.counter++ });
    let index = this.items.length - 1;
    while (index > 0) {
      const parent = (index - 1) >> 1;
      if (this.less(parent, index)) break;
      [this.items[parent], this.items[index]] = [this.items[index], this.items[parent]];
      index = parent;
    }
  }

  pop(): number {
    const top = this.items[0];
    const last = this.items.pop()!;
    if (this.items.length > 0) {
      this.items[0] = last;
      let index = 0;
      for (;;) {
        const left = index * 2 + 1;
        const right = left + 1;
        let smallest = index;
        if (left < this.items.length && this.less(left, smallest)) smallest = left;
        if (right < this.items.length && this.less(right, smallest)) smallest = right;
        if (smallest === index) break;
        [this.items[smallest], this.items[index]] = [this.items[index], this.items[smallest]];
        index = smallest;
      }
    }
    return top.key;
  }

  // FIFO tie-break keeps runs deterministic across engines.
  private less(a: number, b: number): boolean {
    const left = this.items[a];
    const right = this.items[b];
    return left.priority < right.priority || (left.priority === right.priority && left.order < right.order);
  }
}

export function cellCost(cell: KnownCell, config: NavigationConfig): number {
  switch (cell) {
    case '.':
      return 1;
    case '?':
      return config.unknownCost;
    case '~':
      return config.hazardPenalty;
    default:
      return Infinity;
  }
}

export function planPath({ map, start, goal, config }: PlanRequest): PlanResult {
  const turnAware = config.turnAware;
  const dirs = turnAware ? 4 : 1;
  const encode = (x: number, y: number, d: number) => (y * map.width + x) * dirs + d;
  const decode = (key: number) => {
    const d = key % dirs;
    const cell = (key - d) / dirs;
    return { x: cell % map.width, y: Math.floor(cell / map.width), d };
  };

  const heuristic = (x: number, y: number) => Math.abs(goal.x - x) + Math.abs(goal.y - y);
  const priority = (g: number, x: number, y: number) => {
    switch (config.planner) {
      case 'dijkstra':
        return g;
      case 'greedy':
        return heuristic(x, y);
      default:
        return g + config.heuristicWeight * heuristic(x, y);
    }
  };

  const startKey = encode(start.x, start.y, turnAware ? HEADINGS.indexOf(start.heading) : 0);
  const gScore = new Map<number, number>([[startKey, 0]]);
  const parent = new Map<number, number>();
  const closed = new Set<number>();
  const open = new MinHeap();
  open.push(startKey, priority(0, start.x, start.y));

  let nodesExpanded = 0;
  let goalKey: number | null = null;

  while (open.size > 0 && nodesExpanded < MAX_EXPANSIONS) {
    const key = open.pop();
    if (closed.has(key)) continue;
    closed.add(key);
    nodesExpanded += 1;

    const { x, y, d } = decode(key);
    if (x === goal.x && y === goal.y) {
      goalKey = key;
      break;
    }
    const g = gScore.get(key)!;

    const relax = (nx: number, ny: number, nd: number, stepCost: number) => {
      if (!Number.isFinite(stepCost)) return;
      const next = encode(nx, ny, nd);
      if (closed.has(next)) return;
      const tentative = g + stepCost;
      if (tentative < (gScore.get(next) ?? Infinity)) {
        gScore.set(next, tentative);
        parent.set(next, key);
        open.push(next, priority(tentative, nx, ny));
      }
    };

    if (turnAware) {
      const { dx, dy } = HEADING_VECTORS[HEADINGS[d]];
      relax(x + dx, y + dy, d, cellCost(map.get(x + dx, y + dy), config));
      relax(x, y, (d + 1) % 4, 1);
      relax(x, y, (d + 3) % 4, 1);
    } else {
      for (const heading of HEADINGS) {
        const { dx, dy } = HEADING_VECTORS[heading];
        relax(x + dx, y + dy, 0, cellCost(map.get(x + dx, y + dy), config));
      }
    }
  }

  if (goalKey === null) return { path: [], nodesExpanded };

  const path: { x: number; y: number }[] = [];
  for (let key: number | undefined = goalKey; key !== undefined; key = parent.get(key)) {
    const { x, y } = decode(key);
    const last = path[path.length - 1];
    if (!last || last.x !== x || last.y !== y) path.push({ x, y });
  }
  return { path: path.reverse(), nodesExpanded };
}
