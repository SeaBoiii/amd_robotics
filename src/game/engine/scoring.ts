/**
 * Scoring and badges.
 *
 * The weighting is deliberate: a careful rover that finishes slowly, avoids
 * hazards and asks for help when its model is unsure will beat a reckless one
 * that sprints through flood water. Speed is worth only 10 of 100 points.
 */

import type {
  Mission,
  MissionResult,
  MissionScore,
  ObjectiveResult,
  RunTelemetry,
  StudentProgram,
  Badge,
} from '@/types';
import { clamp, round } from '@/utils/format';

export const BADGES: Badge[] = [
  {
    id: 'data-detective',
    name: 'Data Detective',
    description: 'Spotted and fixed imbalanced training data.',
    icon: '🔍',
    howToEarn: 'Train a model where every label has at least 8 examples.',
  },
  {
    id: 'sensor-specialist',
    name: 'Sensor Specialist',
    description: 'Completed a mission using three or more sensor types.',
    icon: '📡',
    howToEarn: 'Fit at least three different sensors and finish the mission.',
  },
  {
    id: 'debugging-hero',
    name: 'Debugging Hero',
    description: 'Turned a failed mission into a success.',
    icon: '🛠️',
    howToEarn: 'Fail a mission, change something, then pass it.',
  },
  {
    id: 'energy-saver',
    name: 'Energy Saver',
    description: 'Finished with more than half the battery left.',
    icon: '🔋',
    howToEarn: 'Complete a mission with over 50% energy remaining.',
  },
  {
    id: 'responsible-ai',
    name: 'Responsible AI Engineer',
    description: 'Used confidence thresholds and asked for help when unsure.',
    icon: '🤝',
    howToEarn: 'Include a low-confidence rule and let it fire during a mission.',
  },
  {
    id: 'reliable-rover',
    name: 'Reliable Rover',
    description: 'Completed a mission without a single collision.',
    icon: '🛡️',
    howToEarn: 'Finish a mission with zero collisions.',
  },
  {
    id: 'creative-solution',
    name: 'Creative Solution',
    description: 'Solved a mission with a program of six or more rules.',
    icon: '💡',
    howToEarn: 'Pass a mission using six or more active rules.',
  },
  {
    id: 'mission-master',
    name: 'Mission Master',
    description: 'Scored 90 or above on a mission.',
    icon: '🏆',
    howToEarn: 'Reach a total score of 90+.',
  },
];

export const BADGES_BY_ID = new Map(BADGES.map((badge) => [badge.id, badge]));

export interface ScoreInput {
  mission: Mission;
  telemetry: RunTelemetry;
  objectives: ObjectiveResult[];
  success: boolean;
  program: StudentProgram;
  sensorCount: number;
  /** Held-out accuracy of the trained model, or null when no model was used. */
  modelAccuracy: number | null;
  /** Whether the student's program includes an explicit low-confidence rule. */
  hasUncertaintyRule: boolean;
  perClassCounts: number[];
  previouslyFailed: boolean;
}

function scaleTo(value: number, weight: number): number {
  return round(clamp(value, 0, 1) * weight, 1);
}

export function computeScore(input: ScoreInput): MissionScore {
  const { mission, telemetry, objectives, success, modelAccuracy } = input;
  const weights = mission.scoring;

  const requiredObjectives = objectives.filter((objective) =>
    mission.objectives.find((item) => item.id === objective.objectiveId)?.required,
  );
  const achievedRatio =
    requiredObjectives.length === 0
      ? success
        ? 1
        : 0
      : requiredObjectives.filter((objective) => objective.achieved).length /
        requiredObjectives.length;

  const completion = scaleTo(achievedRatio, weights.completion);

  // AI accuracy: in-mission prediction accuracy, backed up by held-out accuracy
  // so a student cannot score well by simply never using the camera.
  let aiAccuracy: number;
  if (mission.requiresAI) {
    const inMission =
      telemetry.predictionsMade === 0
        ? 0
        : telemetry.correctPredictions / telemetry.predictionsMade;
    const blended = modelAccuracy === null ? inMission : inMission * 0.6 + modelAccuracy * 0.4;
    aiAccuracy = scaleTo(blended, weights.aiAccuracy);
  } else {
    aiAccuracy = weights.aiAccuracy;
  }

  // Reliability: did the rover behave predictably? Collisions and slips hurt.
  const reliabilityRatio = clamp(1 - telemetry.collisions * 0.12 - telemetry.hazardsEntered * 0.08, 0, 1);
  const reliability = scaleTo(reliabilityRatio, weights.reliability);

  const energyRatio =
    telemetry.energyRemaining + telemetry.energyUsed === 0
      ? 0
      : telemetry.energyRemaining / (telemetry.energyRemaining + telemetry.energyUsed);
  const energy = scaleTo(energyRatio, weights.energy);

  const timeRatio = clamp(1 - telemetry.elapsedSeconds / Math.max(1, mission.timeLimit), 0, 1);
  const time = scaleTo(success ? timeRatio : timeRatio * 0.4, weights.time);

  const safetyRatio = clamp(1 - telemetry.collisions * 0.2 - telemetry.hazardsEntered * 0.25, 0, 1);
  const safety = scaleTo(safetyRatio, weights.safety);

  // Responsible AI: having an uncertainty rule is worth most of it; actually
  // using it, and not barrelling through hazards, earns the rest.
  let responsibleRatio = 0;
  if (!mission.requiresAI) {
    responsibleRatio = 1;
  } else {
    if (input.hasUncertaintyRule) responsibleRatio += 0.55;
    if (telemetry.humanInterventions > 0 || telemetry.lowConfidenceStops > 0) responsibleRatio += 0.3;
    if (telemetry.hazardsEntered === 0) responsibleRatio += 0.15;
    // Excessive help requests are not "responsible", they are avoidance.
    if (telemetry.humanInterventions > 8) responsibleRatio -= 0.3;
  }
  const responsibleAi = scaleTo(responsibleRatio, weights.responsibleAi);

  const total = round(
    completion + aiAccuracy + reliability + energy + time + safety + responsibleAi,
    0,
  );

  return { total, completion, aiAccuracy, reliability, energy, time, safety, responsibleAi };
}

export function awardBadges(input: ScoreInput, score: MissionScore): string[] {
  const earned: string[] = [];
  const { telemetry, success, program } = input;
  const activeRules = program.rules.filter((rule) => rule.enabled).length;

  if (input.perClassCounts.length > 0 && input.perClassCounts.every((count) => count >= 8)) {
    earned.push('data-detective');
  }
  if (success && input.sensorCount >= 3) earned.push('sensor-specialist');
  if (success && input.previouslyFailed) earned.push('debugging-hero');
  if (
    success &&
    telemetry.energyRemaining / Math.max(1, telemetry.energyRemaining + telemetry.energyUsed) > 0.5
  ) {
    earned.push('energy-saver');
  }
  if (input.hasUncertaintyRule && (telemetry.humanInterventions > 0 || telemetry.lowConfidenceStops > 0)) {
    earned.push('responsible-ai');
  }
  if (success && telemetry.collisions === 0) earned.push('reliable-rover');
  if (success && activeRules >= 6) earned.push('creative-solution');
  if (score.total >= 90) earned.push('mission-master');

  return earned;
}

/**
 * Turns raw telemetry into the plain-English "why" statements that make the
 * mission report a debugging tool rather than a scoreboard.
 */
export function buildSuggestions(input: ScoreInput, score: MissionScore): string[] {
  const suggestions: string[] = [];
  const { telemetry, mission } = input;

  if (telemetry.collisions > 0) {
    suggestions.push(
      `Your rover hit something ${telemetry.collisions} time(s). Try turning earlier — raise the distance threshold so the rule fires before the rover is right up against the wall.`,
    );
  }
  if (telemetry.hazardsEntered > 0) {
    suggestions.push(
      `The rover drove into ${telemetry.hazardsEntered} hazard tile(s). Add or lower a hazard rule, for example: AI sees "Hazard Zone" above 60% → Turn left.`,
    );
  }
  if (telemetry.energyRemaining <= 0) {
    suggestions.push(
      'The battery ran flat. Lower the motor power slider, fit an efficient motor, or add a bigger battery.',
    );
  } else if (score.energy < mission.scoring.energy * 0.5) {
    suggestions.push(
      'A lot of energy was used. Motor power costs energy faster than it gains speed — try 60% instead of 100%.',
    );
  }
  if (mission.requiresAI && telemetry.predictionsMade > 0) {
    const accuracy = telemetry.correctPredictions / telemetry.predictionsMade;
    if (accuracy < 0.7) {
      suggestions.push(
        `The AI was right only ${(accuracy * 100).toFixed(0)}% of the time during the mission. Go back to the AI Lab and add more examples of the labels it keeps getting wrong.`,
      );
    }
  }
  if (mission.requiresAI && !input.hasUncertaintyRule) {
    suggestions.push(
      'You have no rule for when the AI is unsure. Add: AI confidence below 50% → Ask a human. This protects your Responsible AI score.',
    );
  }
  if (telemetry.humanInterventions > 8) {
    suggestions.push(
      'The rover asked for help very often, which costs time. Raise your confidence threshold slightly, or improve the model so it is more certain.',
    );
  }
  if (!input.success && telemetry.elapsedSeconds >= mission.timeLimit) {
    suggestions.push(
      'Time ran out. Check whether the rover was stuck in a loop — use Step mode to watch one decision at a time.',
    );
  }
  if (suggestions.length === 0) {
    suggestions.push(
      'Strong run. Try raising the difficulty, or see whether you can score the same with a cheaper rover.',
    );
  }

  return suggestions;
}

export function summariseResult(result: MissionResult): string {
  return result.success
    ? `Mission complete with ${result.score.total}/100.`
    : `Mission failed: ${result.failureReason ?? 'objectives not met'}.`;
}
