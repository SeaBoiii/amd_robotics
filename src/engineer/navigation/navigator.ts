/**
 * The autonomous navigator: sense → update belief → (re)plan → drive.
 * Plugs into the shared `Simulation` through its `Navigator` hook.
 */

import type { Action, Heading } from '@/types';
import type { Navigator, NavigatorDecision, NavigatorObservation } from '@/game/engine/simulation';
import type { SensorContext } from '@/game/engine/sensors';
import { HEADINGS, HEADING_VECTORS, turn } from '@/game/engine/world';
import type { EngineerStats, NavigationConfig, PlannerId } from '../types';
import { KnownMap } from './knownMap';
import { perceive } from './perception';
import { planPath } from './planner';

export const PLANNER_LABELS: Record<PlannerId, string> = {
  astar: 'A*',
  dijkstra: 'Dijkstra',
  greedy: 'Greedy best-first',
  wall_follower: 'Wall follower',
};

export interface NavigatorOptions {
  stats: EngineerStats;
  config: NavigationConfig;
  goal: { x: number; y: number };
  width: number;
  height: number;
}

function headingTowards(from: { x: number; y: number }, to: { x: number; y: number }): Heading {
  if (to.x > from.x) return 'east';
  if (to.x < from.x) return 'west';
  if (to.y > from.y) return 'south';
  return 'north';
}

function turnTowards(current: Heading, desired: Heading): Action {
  const diff = (HEADINGS.indexOf(desired) - HEADINGS.indexOf(current) + 4) % 4;
  return { type: diff === 3 ? 'turn_left' : 'turn_right' };
}

export function createNavigator({ stats, config, goal, width, height }: NavigatorOptions): Navigator {
  let map = new KnownMap(width, height);
  let path: { x: number; y: number }[] = [];
  let nodesExpanded = 0;
  let totalComputeMs = 0;
  let pendingForward = false;
  const label = PLANNER_LABELS[config.planner];

  const pathBlocked = () =>
    path.some(({ x, y }) => map.get(x, y) === '#' || (map.get(x, y) === '~' && config.hazardPenalty > 1));

  function followWall(observation: NavigatorObservation): NavigatorDecision {
    const { x, y, heading } = observation;
    const open = (h: Heading) => {
      const { dx, dy } = HEADING_VECTORS[h];
      return map.get(x + dx, y + dy) !== '#';
    };
    const computeMs = stats.overheadMs;
    totalComputeMs += computeMs;

    if (pendingForward) {
      pendingForward = false;
      if (open(heading)) return { action: { type: 'forward', speed: 100 }, reason: `${label}: continuing along the wall.`, computeMs };
    }
    const side = turn(heading, config.hand);
    if (open(side)) {
      pendingForward = true;
      return { action: { type: config.hand === 'right' ? 'turn_right' : 'turn_left' }, reason: `${label}: opening on the ${config.hand}.`, computeMs };
    }
    if (open(heading)) return { action: { type: 'forward', speed: 100 }, reason: `${label}: wall on the ${config.hand}, going straight.`, computeMs };
    return {
      action: { type: config.hand === 'right' ? 'turn_left' : 'turn_right' },
      reason: `${label}: dead end, turning away from the wall.`,
      computeMs,
    };
  }

  return {
    reset() {
      map = new KnownMap(width, height);
      path = [];
      nodesExpanded = 0;
      totalComputeMs = 0;
      pendingForward = false;
    },

    perceive(context: SensorContext) {
      return perceive(context, stats);
    },

    decide(observation) {
      const { x, y, heading } = observation;
      let changed = false;

      if (observation.bumped) {
        const { dx, dy } = HEADING_VECTORS[heading];
        map.confirmBlocked(x + dx, y + dy);
        changed = true;
      }
      for (const tile of observation.perceived) {
        if (map.set(tile.x, tile.y, tile.char)) changed = true;
      }

      if (x === goal.x && y === goal.y) {
        return { action: { type: 'stop' }, reason: 'Reached the exit.', computeMs: 0 };
      }

      if (config.planner === 'wall_follower') return followWall(observation);

      if (path.length > 1 && path[1].x === x && path[1].y === y) path.shift();
      const offPath = path.length < 2 || path[0].x !== x || path[0].y !== y;
      const needPlan =
        config.replan === 'every_step' || offPath || (changed && pathBlocked());

      let computeMs = 0;
      let reason: string;
      if (needPlan) {
        const result = planPath({ map, start: { x, y, heading }, goal, config });
        path = result.path;
        nodesExpanded = result.nodesExpanded;
        computeMs = stats.overheadMs + result.nodesExpanded * stats.msPerNode;
        totalComputeMs += computeMs;
        reason = `${label}: planned ${Math.max(0, path.length - 1)} tiles to the exit, expanded ${result.nodesExpanded} nodes in ${computeMs.toFixed(1)} ms.`;
      } else {
        reason = `${label}: following plan, ${path.length - 1} tiles to go.`;
      }

      if (path.length < 2) {
        return { action: { type: 'wait' }, reason: `${label}: no known route to the exit.`, computeMs };
      }

      const desired = headingTowards({ x, y }, path[1]);
      const action: Action = desired === heading ? { type: 'forward', speed: 100 } : turnTowards(heading, desired);
      return { action, reason, computeMs };
    },

    overlay() {
      return {
        known: map.toString(),
        plannedPath: path.slice(),
        goal,
        nodesExpanded,
        totalComputeMs: Math.round(totalComputeMs),
      };
    },
  };
}
