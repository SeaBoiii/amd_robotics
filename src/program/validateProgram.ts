/**
 * Student-program validation.
 *
 * Every message is written for a 13-year-old: say what is wrong, then say what
 * to do about it. Errors block the run; warnings do not, because letting a
 * flawed program fail visibly in the simulator is often the better lesson.
 */

import type {
  Condition,
  Mission,
  ProgramIssue,
  ProgramValidation,
  SensorType,
  StudentProgram,
} from '@/types';
import { humanise } from '@/utils/format';

function collectSensorTypes(condition: Condition, found: Set<SensorType>): void {
  switch (condition.type) {
    case 'sensor':
      found.add(condition.sensor);
      break;
    case 'and':
    case 'or':
      collectSensorTypes(condition.left, found);
      collectSensorTypes(condition.right, found);
      break;
    case 'not':
      collectSensorTypes(condition.inner, found);
      break;
    default:
      break;
  }
}

function usesAI(condition: Condition): boolean {
  switch (condition.type) {
    case 'ai_prediction':
    case 'ai_uncertain':
      return true;
    case 'and':
    case 'or':
      return usesAI(condition.left) || usesAI(condition.right);
    case 'not':
      return usesAI(condition.inner);
    default:
      return false;
  }
}

export interface ValidationInput {
  program: StudentProgram;
  mission: Mission;
  /** Sensor types actually fitted to the rover. */
  fittedSensors: SensorType[];
  hasTrainedModel: boolean;
}

export function validateProgram(input: ValidationInput): ProgramValidation {
  const { program, mission, fittedSensors, hasTrainedModel } = input;
  const issues: ProgramIssue[] = [];
  const enabled = program.rules.filter((rule) => rule.enabled);

  if (enabled.length === 0) {
    issues.push({
      severity: 'error',
      ruleId: null,
      message: 'Your program has no active rules, so the rover will not move.',
      hint: 'Add at least one rule, for example: Always → Drive forward.',
    });
  }

  const movesForward = enabled.some(
    (rule) => rule.action.type === 'forward' || rule.action.type === 'return_to_base',
  );
  if (enabled.length > 0 && !movesForward) {
    issues.push({
      severity: 'error',
      ruleId: null,
      message: 'None of your rules make the rover drive forward.',
      hint: 'Add a rule such as: Always → Drive forward, and keep it at the bottom of the list.',
    });
  }

  enabled.forEach((rule, index) => {
    // A catch-all above other rules makes everything below it unreachable.
    if (rule.condition.type === 'always' && index < enabled.length - 1) {
      const unreachable = enabled.slice(index + 1).map((item) => item.name);
      issues.push({
        severity: 'warning',
        ruleId: rule.id,
        message: `"${rule.name}" always matches, so ${unreachable.length} rule(s) below it will never run: ${unreachable.join(', ')}.`,
        hint: 'Move the "Always" rule to the bottom. Rules are checked from the top down.',
      });
    }

    const sensors = new Set<SensorType>();
    collectSensorTypes(rule.condition, sensors);
    for (const sensor of sensors) {
      if (!fittedSensors.includes(sensor)) {
        issues.push({
          severity: 'error',
          ruleId: rule.id,
          message: `"${rule.name}" uses the ${humanise(sensor)} sensor, but your rover does not have one fitted.`,
          hint: `Go to the Rover Workshop and add a ${humanise(sensor)} sensor, or change this rule.`,
        });
      }
      if (!mission.availableSensors.includes(sensor)) {
        issues.push({
          severity: 'warning',
          ruleId: rule.id,
          message: `The ${humanise(sensor)} sensor is not available in this mission.`,
          hint: 'This rule will never fire here. Try a different condition.',
        });
      }
    }

    if (usesAI(rule.condition) && !hasTrainedModel) {
      issues.push({
        severity: 'error',
        ruleId: rule.id,
        message: `"${rule.name}" needs the AI model, but you have not trained one yet.`,
        hint: 'Open the AI Lab and train a model — or use Instant Training Mode if you are short on time.',
      });
    }

    if (
      (rule.action.type === 'forward' || rule.action.type === 'reverse') &&
      rule.action.speed !== undefined &&
      (rule.action.speed < 0 || rule.action.speed > 100)
    ) {
      issues.push({
        severity: 'error',
        ruleId: rule.id,
        message: `"${rule.name}" has a speed of ${rule.action.speed}, which is outside 0–100.`,
        hint: 'Set the speed slider between 0 and 100.',
      });
    }
  });

  // Duplicate condition/action pairs are harmless but confusing.
  const seen = new Map<string, string>();
  for (const rule of enabled) {
    const key = JSON.stringify(rule.condition);
    const existing = seen.get(key);
    if (existing) {
      issues.push({
        severity: 'warning',
        ruleId: rule.id,
        message: `"${rule.name}" checks exactly the same thing as "${existing}".`,
        hint: 'The lower rule will never run. Delete it or change its condition.',
      });
    } else {
      seen.set(key, rule.name);
    }
  }

  if (mission.requiresAI && !enabled.some((rule) => usesAI(rule.condition))) {
    issues.push({
      severity: 'warning',
      ruleId: null,
      message: 'This mission is designed around the AI model, but no rule uses an AI prediction.',
      hint: 'Add a rule such as: AI sees "Hazard Zone" above 70% → Stop.',
    });
  }

  return {
    valid: !issues.some((issue) => issue.severity === 'error'),
    issues,
  };
}
