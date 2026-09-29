import { describe, expect, it } from 'vitest';
import type { Mission } from '@/types';
import { Simulation } from '@/game/engine/simulation';
import { computeEngineerStats, createDefaultEngineerBuild, toRoverStats } from '@/engineer/catalogue';
import { compareEntries, csvCell, rankEntries, toLeaderboardCsv, upsertBest } from '@/engineer/leaderboard';
import { DEFAULT_NAVIGATION } from '@/engineer/maze';
import { KnownMap } from '@/engineer/navigation/knownMap';
import { createNavigator } from '@/engineer/navigation/navigator';
import { generateEngineerName } from '@/engineer/names';
import { planPath } from '@/engineer/navigation/planner';
import type { LeaderboardEntry, NavigationConfig } from '@/engineer/types';
import { remainingMs } from '@/store/useEngineerSessionStore';
import { makeMission } from '../fixtures';

function openMap(width: number, height: number): KnownMap {
  const map = new KnownMap(width, height);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) map.set(x, y, '.');
  return map;
}

function turnsIn(path: { x: number; y: number }[]): number {
  let turns = 0;
  for (let i = 2; i < path.length; i++) {
    const a = { dx: path[i - 1].x - path[i - 2].x, dy: path[i - 1].y - path[i - 2].y };
    const b = { dx: path[i].x - path[i - 1].x, dy: path[i].y - path[i - 1].y };
    if (a.dx !== b.dx || a.dy !== b.dy) turns += 1;
  }
  return turns;
}

describe('planner', () => {
  const start = { x: 0, y: 0, heading: 'east' as const };
  const goal = { x: 5, y: 4 };

  it.each<NavigationConfig['planner']>(['astar', 'dijkstra'])('%s finds a shortest path', (planner) => {
    const { path } = planPath({ map: openMap(8, 8), start, goal, config: { ...DEFAULT_NAVIGATION, planner } });
    expect(path.length - 1).toBe(9);
  });

  it('A* expands fewer nodes than Dijkstra', () => {
    const astar = planPath({ map: openMap(20, 20), start, goal, config: DEFAULT_NAVIGATION });
    const dijkstra = planPath({
      map: openMap(20, 20),
      start,
      goal,
      config: { ...DEFAULT_NAVIGATION, planner: 'dijkstra' },
    });
    expect(astar.nodesExpanded).toBeLessThan(dijkstra.nodesExpanded);
  });

  it('turn-aware planning minimises turns', () => {
    const { path } = planPath({
      map: openMap(8, 8),
      start,
      goal,
      config: { ...DEFAULT_NAVIGATION, turnAware: true },
    });
    expect(path.length - 1).toBe(9);
    expect(turnsIn(path)).toBe(1);
  });

  it('routes around known walls and returns empty when enclosed', () => {
    const map = openMap(5, 5);
    for (let y = 0; y < 4; y++) map.set(2, y, '#');
    const { path } = planPath({ map, start, goal: { x: 4, y: 0 }, config: DEFAULT_NAVIGATION });
    expect(path.some((cell) => cell.y === 4)).toBe(true);

    map.set(2, 4, '#');
    expect(planPath({ map, start, goal: { x: 4, y: 0 }, config: DEFAULT_NAVIGATION }).path).toEqual([]);
  });
});

describe('known map', () => {
  it('needs more evidence than a single noisy reading to flip a cell', () => {
    const map = new KnownMap(3, 3);
    map.set(1, 1, '#');
    map.set(1, 1, '#');
    map.set(1, 1, '.');
    expect(map.get(1, 1)).toBe('#');
  });

  it('never un-blocks a cell the rover bumped into', () => {
    const map = new KnownMap(3, 3);
    map.confirmBlocked(1, 1);
    map.set(1, 1, '.');
    expect(map.get(1, 1)).toBe('#');
  });
});

describe('engineer stats', () => {
  it('adding mass makes the rover slower', () => {
    const base = createDefaultEngineerBuild();
    const heavy = { ...base, partIds: [...base.partIds, 'sensor-lidar-3d'] };
    expect(computeEngineerStats(heavy).speed).toBeLessThan(computeEngineerStats(base).speed);
  });

  it('a bigger motor is faster but drains more energy', () => {
    const base = createDefaultEngineerBuild();
    const racing = { ...base, partIds: base.partIds.map((id) => (id === 'drive-150' ? 'drive-500' : id)) };
    expect(computeEngineerStats(racing).speed).toBeGreaterThan(computeEngineerStats(base).speed);
    expect(computeEngineerStats(racing).energyDrain).toBeGreaterThan(computeEngineerStats(base).energyDrain);
  });
});

describe('navigator in the simulation', () => {
  it('discovers a hidden obstacle and replans around it', () => {
    const mission: Mission = makeMission({
      map: {
        width: 7,
        height: 5,
        tileSize: 40,
        rows: ['#######', '#B..o.#', '#.....#', '#.....#', '#######'],
      },
      start: { x: 1, y: 1, heading: 'east' },
      objectives: [
        { id: 'exit', type: 'reach_tile', description: 'Exit', target: 1, tile: { x: 5, y: 1 }, required: true },
      ],
      failureConditions: [],
    });
    const build = { ...createDefaultEngineerBuild(), partIds: ['chassis-carbon', 'drive-150', 'battery-m', 'sensor-tof', 'compute-npu'] };
    const stats = computeEngineerStats(build);
    const simulation = new Simulation({
      mission,
      program: { missionId: mission.id, rules: [], version: 1, updatedAt: 0 },
      build: { componentIds: [], motorPower: 80, colour: '#fff' },
      model: null,
      confidencePolicy: { actAbove: 0.8, verifyAbove: 0.5 },
      difficulty: 'engineer',
      attemptNumber: 1,
      previouslyFailed: false,
      statsOverride: toRoverStats(stats),
      navigator: createNavigator({ stats, config: DEFAULT_NAVIGATION, goal: { x: 5, y: 1 }, width: 7, height: 5 }),
    });
    simulation.start();
    for (let i = 0; i < 200 && !simulation.isFinished(); i++) simulation.step();
    const snapshot = simulation.getSnapshot();
    expect(snapshot.result?.success).toBe(true);
    expect(snapshot.rover.collisions).toBe(0);
    expect(snapshot.navigation?.known[1 * 7 + 4]).toBe('#');
  });
});

describe('leaderboard', () => {
  const entry = (overrides: Partial<LeaderboardEntry>): LeaderboardEntry => ({
    id: 'e',
    name: 'Ada',
    timeSeconds: 40,
    collisions: 0,
    energyUsed: 100,
    planner: 'astar',
    buildSummary: 'x',
    mapId: 'eng-maze-01',
    submittedAt: 1,
    ...overrides,
  });

  it('ranks by time, then collisions, then energy', () => {
    const ranked = rankEntries([
      entry({ id: 'c', timeSeconds: 40, collisions: 1 }),
      entry({ id: 'd', timeSeconds: 40, collisions: 0, energyUsed: 120 }),
      entry({ id: 'a', timeSeconds: 35 }),
      entry({ id: 'b', timeSeconds: 40, collisions: 0, energyUsed: 90 }),
    ]);
    expect(ranked.map((item) => item.id)).toEqual(['a', 'b', 'd', 'c']);
    expect(compareEntries(ranked[0], ranked[1])).toBeLessThan(0);
  });

  it('keeps only the best entry per name, case-insensitively', () => {
    let entries = upsertBest([], entry({ id: '1', timeSeconds: 50 }));
    entries = upsertBest(entries, entry({ id: '2', name: ' ada ', timeSeconds: 60 }));
    expect(entries.map((item) => item.id)).toEqual(['1']);
    entries = upsertBest(entries, entry({ id: '3', name: 'ADA', timeSeconds: 45 }));
    expect(entries.map((item) => item.id)).toEqual(['3']);
    entries = upsertBest(entries, entry({ id: '4', name: 'Grace', timeSeconds: 70 }));
    expect(entries).toHaveLength(2);
  });

  it('neutralises spreadsheet formulas and quotes CSV cells', () => {
    expect(csvCell('=HYPERLINK("x")')).toBe(`"'=HYPERLINK(""x"")"`);
    expect(csvCell('+1')).toBe("'+1");
    expect(csvCell('a,b')).toBe('"a,b"');
    expect(csvCell(-3)).toBe('-3');
    const csv = toLeaderboardCsv([entry({ name: '@evil' })]);
    expect(csv.split('\r\n')[1]).toContain("'@evil");
  });
});

describe('generated names', () => {
  it('produces "Adjective Noun NN" and avoids names already on the board', () => {
    const name = generateEngineerName();
    expect(name).toMatch(/^[A-Z][a-z]+ [A-Z][a-z]+ \d{2}$/);

    let calls = 0;
    // First candidate collides (case-insensitively), second is fresh.
    const random = () => (calls++ < 3 ? 0 : 0.99);
    expect(generateEngineerName(['turbo falcon 10'], random)).not.toBe('Turbo Falcon 10');
  });
});

describe('session clock', () => {
  it('counts down from the wall-clock start and never goes negative', () => {
    expect(remainingMs(null, 480, 0)).toBe(0);
    expect(remainingMs(1_000, 480, 61_000)).toBe(420_000);
    expect(remainingMs(1_000, 480, 999_999)).toBe(0);
  });
});
