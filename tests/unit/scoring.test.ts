import { describe, expect, it } from 'vitest';
import type { ScoreInput } from '@/game/engine/scoring';
import { BADGES, awardBadges, buildSuggestions, computeScore } from '@/game/engine/scoring';
import { makeMission, makeProgram } from '../fixtures';

const BASE_TELEMETRY = {
  ticks: 40,
  elapsedSeconds: 20,
  distanceTravelled: 30,
  energyUsed: 40,
  energyRemaining: 100,
  collisions: 0,
  hazardsEntered: 0,
  suppliesDelivered: 1,
  targetsFound: 0,
  predictionsMade: 20,
  correctPredictions: 18,
  humanInterventions: 2,
  lowConfidenceStops: 2,
  seed: 1,
};

function makeInput(overrides: Partial<ScoreInput> = {}): ScoreInput {
  const mission = overrides.mission ?? makeMission();
  return {
    mission,
    telemetry: { ...BASE_TELEMETRY },
    objectives: mission.objectives.map((objective) => ({
      objectiveId: objective.id,
      description: objective.description,
      achieved: true,
      progress: objective.target,
      target: objective.target,
    })),
    success: true,
    program: makeProgram(),
    sensorCount: 3,
    modelAccuracy: 0.85,
    hasUncertaintyRule: true,
    perClassCounts: [10, 10, 10, 10, 10],
    previouslyFailed: false,
    ...overrides,
  };
}

describe('scoring', () => {
  it('stays within 0 and 100', () => {
    expect(computeScore(makeInput()).total).toBeLessThanOrEqual(100);

    const disaster = computeScore(
      makeInput({
        success: false,
        objectives: [
          {
            objectiveId: 'deliver',
            description: 'Deliver one supply package.',
            achieved: false,
            progress: 0,
            target: 1,
          },
        ],
        telemetry: {
          ...BASE_TELEMETRY,
          collisions: 50,
          hazardsEntered: 50,
          energyRemaining: 0,
          elapsedSeconds: 999,
        },
      }),
    );
    expect(disaster.total).toBeGreaterThanOrEqual(0);
  });

  it('keeps every category within its declared weight', () => {
    const mission = makeMission();
    const score = computeScore(makeInput({ mission }));
    expect(score.completion).toBeLessThanOrEqual(mission.scoring.completion);
    expect(score.aiAccuracy).toBeLessThanOrEqual(mission.scoring.aiAccuracy);
    expect(score.reliability).toBeLessThanOrEqual(mission.scoring.reliability);
    expect(score.energy).toBeLessThanOrEqual(mission.scoring.energy);
    expect(score.time).toBeLessThanOrEqual(mission.scoring.time);
    expect(score.safety).toBeLessThanOrEqual(mission.scoring.safety);
    expect(score.responsibleAi).toBeLessThanOrEqual(mission.scoring.responsibleAi);
  });

  it('does not reward speed alone: a fast, reckless failure scores worse', () => {
    const fastAndReckless = computeScore(
      makeInput({
        success: false,
        objectives: [
          {
            objectiveId: 'deliver',
            description: 'Deliver one supply package.',
            achieved: false,
            progress: 0,
            target: 1,
          },
        ],
        telemetry: {
          ...BASE_TELEMETRY,
          elapsedSeconds: 1,
          collisions: 8,
          hazardsEntered: 5,
          energyRemaining: 5,
        },
      }),
    );
    const slowAndCareful = computeScore(
      makeInput({ telemetry: { ...BASE_TELEMETRY, elapsedSeconds: 55 } }),
    );
    expect(slowAndCareful.total).toBeGreaterThan(fastAndReckless.total);
  });

  it('caps time at only 10 of the 100 available points', () => {
    const instant = computeScore(makeInput({ telemetry: { ...BASE_TELEMETRY, elapsedSeconds: 0 } }));
    const slow = computeScore(makeInput({ telemetry: { ...BASE_TELEMETRY, elapsedSeconds: 59 } }));
    expect(instant.total - slow.total).toBeLessThanOrEqual(10);
  });

  it('penalises collisions and hazards', () => {
    const clean = computeScore(makeInput());
    const crashed = computeScore(makeInput({ telemetry: { ...BASE_TELEMETRY, collisions: 6 } }));
    const unsafe = computeScore(makeInput({ telemetry: { ...BASE_TELEMETRY, hazardsEntered: 4 } }));

    expect(crashed.reliability).toBeLessThan(clean.reliability);
    expect(unsafe.safety).toBeLessThan(clean.safety);
  });

  it('rewards energy left in the battery', () => {
    const efficient = computeScore(makeInput());
    const wasteful = computeScore(
      makeInput({ telemetry: { ...BASE_TELEMETRY, energyRemaining: 2, energyUsed: 138 } }),
    );
    expect(wasteful.energy).toBeLessThan(efficient.energy);
  });

  it('gives full AI marks on missions that do not use AI', () => {
    const mission = makeMission({ requiresAI: false });
    expect(computeScore(makeInput({ mission })).aiAccuracy).toBe(mission.scoring.aiAccuracy);
  });

  it('does not treat excessive help requests as responsible behaviour', () => {
    const mission = makeMission({ requiresAI: true, availableSensors: ['distance', 'camera'] });
    const sensible = computeScore(makeInput({ mission }));
    const avoidant = computeScore(
      makeInput({ mission, telemetry: { ...BASE_TELEMETRY, humanInterventions: 20 } }),
    );
    expect(avoidant.responsibleAi).toBeLessThan(sensible.responsibleAi);
  });

  it('awards only badges that exist in the catalogue', () => {
    const input = makeInput();
    const badgeIds = new Set(BADGES.map((badge) => badge.id));
    const earned = awardBadges(input, computeScore(input));
    expect(earned.length).toBeGreaterThan(0);
    for (const id of earned) expect(badgeIds.has(id)).toBe(true);
  });

  it('awards Debugging Hero only after a previous failure', () => {
    expect(awardBadges(makeInput(), computeScore(makeInput()))).not.toContain('debugging-hero');
    const retried = makeInput({ previouslyFailed: true });
    expect(awardBadges(retried, computeScore(retried))).toContain('debugging-hero');
  });

  it('gives specific advice after a failed run', () => {
    const input = makeInput({
      success: false,
      objectives: [
        {
          objectiveId: 'deliver',
          description: 'Deliver one supply package.',
          achieved: false,
          progress: 0,
          target: 1,
        },
      ],
      telemetry: { ...BASE_TELEMETRY, collisions: 5, energyRemaining: 0 },
    });
    const suggestions = buildSuggestions(input, computeScore(input));
    expect(suggestions.length).toBeGreaterThan(0);
    expect(suggestions.every((line) => line.length > 10)).toBe(true);
  });
});
