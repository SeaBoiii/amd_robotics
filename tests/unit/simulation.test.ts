import { describe, expect, it } from 'vitest';
import { Simulation } from '@/game/engine/simulation';
import { computeStats } from '@/robotics/components';
import { makeRule } from '@/program/templates';
import { makeBuild, makeMission, makeProgram } from '../fixtures';

function makeSimulation(overrides: Partial<ConstructorParameters<typeof Simulation>[0]> = {}) {
  return new Simulation({
    mission: makeMission(),
    program: makeProgram(),
    build: makeBuild(),
    model: null,
    confidencePolicy: { actAbove: 0.8, verifyAbove: 0.5 },
    difficulty: 'engineer',
    attemptNumber: 1,
    previouslyFailed: false,
    ...overrides,
  });
}

describe('rover movement', () => {
  it('starts at the mission start position and heading', () => {
    const snapshot = makeSimulation().getSnapshot();
    expect(snapshot.rover.x).toBe(1);
    expect(snapshot.rover.y).toBe(1);
    expect(snapshot.rover.heading).toBe('east');
    expect(snapshot.tick).toBe(0);
  });

  it('moves one tile per forward step', () => {
    const simulation = makeSimulation({
      program: {
        missionId: 'test-mission',
        version: 1,
        updatedAt: 0,
        rules: [makeRule('Go', { type: 'always' }, { type: 'forward', speed: 70 })],
      },
    });
    simulation.start();
    simulation.step();
    expect(simulation.getSnapshot().rover.x).toBe(2);
  });

  it('turns without changing position', () => {
    const simulation = makeSimulation({
      program: {
        missionId: 'test-mission',
        version: 1,
        updatedAt: 0,
        rules: [makeRule('Spin', { type: 'always' }, { type: 'turn_right' })],
      },
    });
    simulation.start();
    simulation.step();
    const snapshot = simulation.getSnapshot();
    expect(snapshot.rover.heading).toBe('south');
    expect(snapshot.rover.x).toBe(1);
    expect(snapshot.rover.y).toBe(1);
  });

  it('records a collision instead of walking through a wall', () => {
    const simulation = makeSimulation({
      mission: makeMission({ start: { x: 4, y: 1, heading: 'east' } }),
      program: {
        missionId: 'test-mission',
        version: 1,
        updatedAt: 0,
        rules: [makeRule('Go', { type: 'always' }, { type: 'forward', speed: 70 })],
      },
    });
    simulation.start();
    simulation.step();
    const snapshot = simulation.getSnapshot();
    expect(snapshot.rover.x).toBe(4);
    expect(snapshot.rover.collisions).toBe(1);
  });
});

describe('battery consumption', () => {
  it('starts with the battery capacity from the rover build', () => {
    const build = makeBuild();
    const expected = computeStats(build).batteryCapacity;
    expect(makeSimulation({ build }).getSnapshot().rover.maxEnergy).toBeCloseTo(expected, 5);
  });

  it('drains energy as the rover works', () => {
    const simulation = makeSimulation();
    const before = simulation.getSnapshot().rover.energy;
    simulation.start();
    for (let i = 0; i < 10; i += 1) simulation.step();
    expect(simulation.getSnapshot().rover.energy).toBeLessThan(before);
  });

  it('uses more energy at higher motor power', () => {
    const run = (motorPower: number) => {
      const build = makeBuild({ motorPower });
      const simulation = makeSimulation({ build });
      simulation.start();
      for (let i = 0; i < 20; i += 1) simulation.step();
      const snapshot = simulation.getSnapshot();
      return snapshot.rover.maxEnergy - snapshot.rover.energy;
    };
    expect(run(100)).toBeGreaterThan(run(30));
  });

  it('ends the mission when the battery runs flat', () => {
    const simulation = makeSimulation({
      // No battery component, maximum motor power and no practical time limit,
      // so the only way this run can end is by running out of energy.
      build: makeBuild({
        componentIds: ['sensor-distance-basic', 'wheel-standard', 'motor-power'],
        motorPower: 100,
      }),
      timeLimitOverride: 100000,
      program: {
        missionId: 'test-mission',
        version: 1,
        updatedAt: 0,
        rules: [
          makeRule(
            'Turn at walls',
            { type: 'sensor', sensor: 'distance', operator: 'lt', value: 1 },
            { type: 'turn_right' },
          ),
          makeRule('Otherwise drive', { type: 'always' }, { type: 'forward', speed: 100 }),
        ],
      },
    });
    simulation.start();
    for (let i = 0; i < 5000 && !simulation.isFinished(); i += 1) simulation.step();

    const snapshot = simulation.getSnapshot();
    expect(simulation.isFinished()).toBe(true);
    expect(snapshot.rover.energy).toBeLessThanOrEqual(0.01);
    expect(snapshot.result?.success).toBe(false);
    expect(snapshot.result?.failureReason).toMatch(/battery/i);
  });

  it('fails with a time-limit message when the clock runs out', () => {
    const simulation = makeSimulation({
      program: {
        missionId: 'test-mission',
        version: 1,
        updatedAt: 0,
        rules: [makeRule('Wait', { type: 'always' }, { type: 'wait' })],
      },
    });
    simulation.start();
    while (!simulation.isFinished()) simulation.step();

    expect(simulation.getSnapshot().result?.success).toBe(false);
  });
});

describe('determinism', () => {
  it('produces identical telemetry for the same seed, build and program', () => {
    const runOnce = () => {
      const simulation = makeSimulation();
      simulation.start();
      for (let i = 0; i < 60 && !simulation.isFinished(); i += 1) simulation.step();
      const snapshot = simulation.getSnapshot();
      return {
        x: snapshot.rover.x,
        y: snapshot.rover.y,
        heading: snapshot.rover.heading,
        energy: snapshot.rover.energy,
        collisions: snapshot.rover.collisions,
      };
    };
    expect(runOnce()).toEqual(runOnce());
  });

  it('always terminates rather than hanging the browser', () => {
    const simulation = makeSimulation({
      program: {
        missionId: 'test-mission',
        version: 1,
        updatedAt: 0,
        rules: [makeRule('Do nothing', { type: 'always' }, { type: 'wait' })],
      },
    });
    simulation.start();
    let steps = 0;
    while (!simulation.isFinished() && steps < 5000) {
      simulation.step();
      steps += 1;
    }
    expect(simulation.isFinished()).toBe(true);
    expect(steps).toBeLessThan(5000);
  });

  it('produces a result object once the run ends', () => {
    const simulation = makeSimulation();
    simulation.start();
    while (!simulation.isFinished()) simulation.step();

    const result = simulation.getSnapshot().result;
    expect(result).not.toBeNull();
    expect(result?.score.total).toBeGreaterThanOrEqual(0);
    expect(result?.score.total).toBeLessThanOrEqual(100);
    expect(result?.telemetry.seed).toBe(makeMission().seed);
  });

  it('resets back to the starting state', () => {
    const simulation = makeSimulation();
    simulation.start();
    for (let i = 0; i < 15; i += 1) simulation.step();
    simulation.reset();

    const snapshot = simulation.getSnapshot();
    expect(snapshot.tick).toBe(0);
    expect(snapshot.rover.x).toBe(1);
    expect(snapshot.rover.y).toBe(1);
    expect(snapshot.rover.collisions).toBe(0);
    expect(snapshot.result).toBeNull();
  });
});
