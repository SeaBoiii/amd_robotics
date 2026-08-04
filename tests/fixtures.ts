/**
 * Shared fixtures.
 *
 * Missions are normally fetched from `public/missions`, which is not available
 * in Node, so tests build missions in memory instead. That keeps unit tests
 * fast and independent of the asset pipeline.
 */

import type { Mission, RoverBuild, StudentProgram } from '@/types';
import { makeRule } from '@/program/templates';

export function makeMission(overrides: Partial<Mission> = {}): Mission {
  return {
    id: 'test-mission',
    index: 1,
    title: 'Test Mission',
    subtitle: 'For tests',
    description: 'A small map used by the unit tests.',
    story: 'Once upon a time.',
    learningObjectives: ['Test things'],
    map: {
      width: 6,
      height: 5,
      tileSize: 40,
      rows: ['######', '#B...#', '#.##.#', '#...S#', '######'],
    },
    start: { x: 1, y: 1, heading: 'east' },
    availableSensors: ['distance', 'camera'],
    availableComponents: [
      'sensor-distance-basic',
      'sensor-camera',
      'wheel-standard',
      'motor-standard',
      'battery-standard',
      'storage-small',
      'comms-radio',
    ],
    budget: 150,
    objectives: [
      {
        id: 'deliver',
        type: 'deliver_supplies',
        description: 'Deliver one supply package.',
        target: 1,
        required: true,
      },
    ],
    failureConditions: [
      { type: 'out_of_energy', message: 'The battery ran flat.' },
      { type: 'time_limit', message: 'You ran out of time.' },
    ],
    timeLimit: 60,
    scoring: {
      completion: 30,
      aiAccuracy: 20,
      reliability: 15,
      energy: 10,
      time: 10,
      safety: 10,
      responsibleAi: 5,
    },
    difficultyModifiers: {
      explorer: { sensorNoise: 0.4, aiUncertainty: 0.4, energyMultiplier: 0.8, timeMultiplier: 1.4 },
      engineer: { sensorNoise: 1, aiUncertainty: 1, energyMultiplier: 1, timeMultiplier: 1 },
      expert: { sensorNoise: 1.6, aiUncertainty: 1.5, energyMultiplier: 1.2, timeMultiplier: 0.8 },
    },
    hints: ['Try turning.'],
    reflectionQuestions: ['What changed?'],
    requiresAI: false,
    seed: 4242,
    ...overrides,
  };
}

export function makeBuild(overrides: Partial<RoverBuild> = {}): RoverBuild {
  return {
    componentIds: [
      'sensor-distance-basic',
      'sensor-camera',
      'wheel-standard',
      'motor-standard',
      'battery-standard',
      'storage-small',
      'comms-radio',
    ],
    motorPower: 70,
    colour: '#22d3ee',
    ...overrides,
  };
}

export function makeProgram(missionId = 'test-mission'): StudentProgram {
  return {
    missionId,
    rules: [
      makeRule(
        'Turn when blocked',
        { type: 'sensor', sensor: 'distance', operator: 'lt', value: 2 },
        { type: 'turn_right' },
      ),
      makeRule('Drive forward', { type: 'always' }, { type: 'forward', speed: 70 }),
    ],
    version: 1,
    updatedAt: 0,
  };
}
