/**
 * Rule evaluation.
 *
 * Rules are checked top to bottom and the **first** enabled rule whose
 * condition is true wins. Order therefore matters, which is a deliberate
 * teaching point: students discover priority bugs ("my stop rule never fires
 * because drive-forward is above it") by watching the rover, not by reading a
 * paragraph about it.
 *
 * This module is pure: no React, no Phaser, no randomness. That makes it fully
 * unit-testable and safe to reuse for physical hardware later.
 */

import type {
  Action,
  ComparisonOperator,
  Condition,
  Prediction,
  Rule,
  SensorReading,
  SensorType,
  StudentProgram,
} from '@/types';
import { LABEL_INFO } from '@/ai/labels';
import { humanise } from '@/utils/format';

export interface EvaluationContext {
  readings: SensorReading[];
  prediction: Prediction | null;
  /** Battery remaining as a percentage, 0–100. */
  batteryPercent: number;
  carrying: number;
  /** Seconds since the mission started. */
  elapsedSeconds: number;
}

export interface RuleMatch {
  rule: Rule | null;
  action: Action;
  /** Student-facing explanation of why this action was chosen. */
  reason: string;
}

const DEFAULT_ACTION: Action = { type: 'stop' };

function compare(left: number, operator: ComparisonOperator, right: number): boolean {
  switch (operator) {
    case 'lt':
      return left < right;
    case 'lte':
      return left <= right;
    case 'gt':
      return left > right;
    case 'gte':
      return left >= right;
    case 'eq':
      return Math.abs(left - right) < 1e-6;
    default:
      return false;
  }
}

export function operatorLabel(operator: ComparisonOperator): string {
  switch (operator) {
    case 'lt':
      return 'is less than';
    case 'lte':
      return 'is at most';
    case 'gt':
      return 'is more than';
    case 'gte':
      return 'is at least';
    case 'eq':
      return 'equals';
    default:
      return operator;
  }
}

function readSensor(readings: SensorReading[], type: SensorType): number | null {
  const reading = readings.find((item) => item.type === type);
  if (!reading) return null;
  return typeof reading.value === 'number'
    ? reading.value
    : typeof reading.value === 'boolean'
      ? Number(reading.value)
      : null;
}

/**
 * Evaluates a condition. Returns `false` when required data is missing (for
 * example a sensor the rover was never fitted with) rather than throwing, so a
 * half-finished program still runs and the student can see what happened.
 */
export function evaluateCondition(condition: Condition, context: EvaluationContext): boolean {
  switch (condition.type) {
    case 'always':
      return true;

    case 'sensor': {
      const value = readSensor(context.readings, condition.sensor);
      if (value === null) return false;
      return compare(value, condition.operator, condition.value);
    }

    case 'ai_prediction': {
      if (!context.prediction) return false;
      return (
        context.prediction.label === condition.label &&
        context.prediction.confidence > condition.confidenceAbove
      );
    }

    case 'ai_uncertain': {
      if (!context.prediction) return false;
      return context.prediction.confidence < condition.confidenceBelow;
    }

    case 'battery':
      return compare(context.batteryPercent, condition.operator, condition.value);

    case 'carrying':
      return compare(context.carrying, condition.operator, condition.value);

    case 'timer':
      return compare(context.elapsedSeconds, condition.operator, condition.value);

    case 'and':
      return (
        evaluateCondition(condition.left, context) && evaluateCondition(condition.right, context)
      );

    case 'or':
      return (
        evaluateCondition(condition.left, context) || evaluateCondition(condition.right, context)
      );

    case 'not':
      return !evaluateCondition(condition.inner, context);

    default:
      return false;
  }
}

/** Builds the "why did the rover do that?" sentence used in reports and the HUD. */
export function describeCondition(condition: Condition, context?: EvaluationContext): string {
  switch (condition.type) {
    case 'always':
      return 'no other rule matched';

    case 'sensor': {
      const value = context ? readSensor(context.readings, condition.sensor) : null;
      const actual = value === null ? '' : ` (reading ${value.toFixed(1)})`;
      return `the ${humanise(condition.sensor)} sensor ${operatorLabel(condition.operator)} ${condition.value}${actual}`;
    }

    case 'ai_prediction': {
      const name = LABEL_INFO[condition.label]?.name ?? condition.label;
      const actual = context?.prediction
        ? ` (confidence ${(context.prediction.confidence * 100).toFixed(0)}%)`
        : '';
      return `the AI saw "${name}" with more than ${(condition.confidenceAbove * 100).toFixed(0)}% confidence${actual}`;
    }

    case 'ai_uncertain': {
      const actual = context?.prediction
        ? ` (confidence ${(context.prediction.confidence * 100).toFixed(0)}%)`
        : '';
      return `the AI was unsure — confidence below ${(condition.confidenceBelow * 100).toFixed(0)}%${actual}`;
    }

    case 'battery':
      return `battery ${operatorLabel(condition.operator)} ${condition.value}%`;

    case 'carrying':
      return `the rover is carrying ${operatorLabel(condition.operator)} ${condition.value} package(s)`;

    case 'timer':
      return `the mission timer ${operatorLabel(condition.operator)} ${condition.value}s`;

    case 'and':
      return `${describeCondition(condition.left, context)} AND ${describeCondition(condition.right, context)}`;

    case 'or':
      return `${describeCondition(condition.left, context)} OR ${describeCondition(condition.right, context)}`;

    case 'not':
      return `NOT (${describeCondition(condition.inner, context)})`;

    default:
      return 'an unknown condition';
  }
}

export function describeAction(action: Action): string {
  switch (action.type) {
    case 'forward':
      return `drive forward at ${action.speed ?? 100}% power`;
    case 'reverse':
      return `reverse at ${action.speed ?? 60}% power`;
    case 'turn_left':
      return 'turn left';
    case 'turn_right':
      return 'turn right';
    case 'stop':
      return 'stop';
    case 'wait':
      return 'wait one step';
    case 'deliver_supply':
      return 'deliver a supply package';
    case 'pick_up_target':
      return 'pick up the target';
    case 'scan':
      return 'scan the surroundings';
    case 'request_human_help':
      return 'ask a human for help';
    case 'return_to_base':
      return 'head back to the command centre';
    default:
      return action.type;
  }
}

/** Picks the winning rule for this tick. */
export function evaluateProgram(program: StudentProgram, context: EvaluationContext): RuleMatch {
  for (const rule of program.rules) {
    if (!rule.enabled) continue;
    if (evaluateCondition(rule.condition, context)) {
      return {
        rule,
        action: rule.action,
        reason: `"${rule.name}" fired because ${describeCondition(rule.condition, context)}.`,
      };
    }
  }

  return {
    rule: null,
    action: DEFAULT_ACTION,
    reason: 'No rule matched, so the rover stopped safely. Add a rule to handle this situation.',
  };
}
