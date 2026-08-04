/**
 * Full-mission integration tests.
 *
 * These run the real shipped mission files through the real simulation engine
 * with no browser involved. If a mission ships that a student cannot actually
 * solve, this suite fails before a workshop does.
 */

import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { Mission, RoverBuild, StudentProgram } from '@/types';
import { Simulation } from '@/game/engine/simulation';
import { validateMission, asMission } from '@/missions/validateMission';
import { createDefaultBuild } from '@/robotics/components';
import { createStarterProgram, makeRule } from '@/program/templates';
import { instantTrain } from '@/ai/training/trainer';

const MISSIONS_DIR = resolve(__dirname, '../../public/missions');

function readMissionFile(fileName: string): unknown {
  return JSON.parse(readFileSync(resolve(MISSIONS_DIR, fileName), 'utf8'));
}

const INDEX = (readMissionFile('index.json') as { missions: { id: string; file: string; index: number }[] })
  .missions;

function loadMission(id: string): Mission {
  const entry = INDEX.find((item) => item.id === id);
  if (!entry) throw new Error(`No mission indexed as ${id}`);
  return asMission(readMissionFile(entry.file));
}

interface RunOptions {
  program: StudentProgram;
  model?: Awaited<ReturnType<typeof instantTrain>>['model'];
  build?: RoverBuild;
  maxSteps?: number;
}

function run(mission: Mission, options: RunOptions) {
  const simulation = new Simulation({
    mission,
    program: options.program,
    build: options.build ?? createDefaultBuild('#22d3ee'),
    model: options.model ?? null,
    confidencePolicy: { actAbove: 0.8, verifyAbove: 0.5 },
    difficulty: 'engineer',
    attemptNumber: 1,
    previouslyFailed: false,
  });

  simulation.start();
  const limit = options.maxSteps ?? 4000;
  for (let step = 0; step < limit && !simulation.isFinished(); step += 1) simulation.step();
  return simulation.getSnapshot();
}

describe('shipped mission files', () => {
  const files = readdirSync(MISSIONS_DIR).filter(
    (file) => file.endsWith('.json') && file !== 'index.json',
  );

  it('indexes every mission file exactly once', () => {
    expect(files.sort()).toEqual(INDEX.map((entry) => entry.file).sort());
  });

  it.each(files)('%s passes schema validation', (file) => {
    const result = validateMission(readMissionFile(file), file);
    expect(result.errors).toEqual([]);
    expect(result.valid).toBe(true);
  });

  it.each(files)('%s has scoring weights that add up to 100', (file) => {
    const mission = asMission(readMissionFile(file));
    const weights = mission.scoring;
    const total =
      weights.completion +
      weights.aiAccuracy +
      weights.reliability +
      weights.energy +
      weights.time +
      weights.safety +
      weights.responsibleAi;
    expect(total).toBe(100);
    expect(weights.time).toBeLessThanOrEqual(10);
  });

  it.each(files)('%s loads and starts without throwing', (file) => {
    const mission = asMission(readMissionFile(file));
    const snapshot = run(mission, {
      program: createStarterProgram(mission.id),
      maxSteps: 200,
    });
    expect(snapshot.tick).toBeGreaterThan(0);
  });
});

describe('mission 1: First Movement', () => {
  const mission = loadMission('m1-first-movement');

  it('cannot be completed by the starter program alone', () => {
    // The starter program is "Always → drive forward". It must fail, otherwise
    // the mission teaches nothing about sensing and deciding.
    const snapshot = run(mission, { program: createStarterProgram(mission.id) });
    expect(snapshot.result?.success).toBe(false);
  });

  it('can be completed once the student adds a turn rule', () => {
    const program: StudentProgram = {
      missionId: mission.id,
      version: 1,
      updatedAt: Date.now(),
      rules: [
        makeRule(
          'Turn at the corner',
          { type: 'sensor', sensor: 'distance', operator: 'lt', value: 1 },
          { type: 'turn_left' },
        ),
        makeRule('Drive forward', { type: 'always' }, { type: 'forward', speed: 70 }),
      ],
    };

    const snapshot = run(mission, { program });
    expect(snapshot.result?.success).toBe(true);
    expect(snapshot.result?.score.total).toBeGreaterThan(0);
    expect(snapshot.result?.score.total).toBeLessThanOrEqual(100);
  });

  it('produces the same result when run twice with the same seed', () => {
    const program = createStarterProgram(mission.id);
    const first = run(mission, { program });
    const second = run(mission, { program });

    expect(second.result?.telemetry).toEqual(first.result?.telemetry);
    expect(second.result?.score).toEqual(first.result?.score);
  });
});

describe('an AI mission end to end', () => {
  it('runs with a trained model and records predictions', async () => {
    const aiMission = INDEX.map((entry) => asMission(readMissionFile(entry.file))).find(
      (mission) => mission.requiresAI,
    );
    expect(aiMission).toBeDefined();

    const { model } = await instantTrain();
    expect(model).not.toBeNull();

    const snapshot = run(aiMission!, {
      program: createStarterProgram(aiMission!.id),
      model,
      // An AI mission is pointless without the camera that feeds the model.
      build: {
        componentIds: [
          'sensor-distance-basic',
          'sensor-camera',
          'wheel-standard',
          'motor-standard',
          'battery-standard',
        ],
        motorPower: 70,
        colour: '#22d3ee',
      },
    });

    expect(snapshot.result).not.toBeNull();
    expect(snapshot.result!.telemetry.predictionsMade).toBeGreaterThan(0);
    expect(snapshot.result!.telemetry.correctPredictions).toBeLessThanOrEqual(
      snapshot.result!.telemetry.predictionsMade,
    );
  });
});
