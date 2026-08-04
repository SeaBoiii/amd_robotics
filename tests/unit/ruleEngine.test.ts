import { describe, expect, it } from 'vitest';
import type { EvaluationContext } from '@/program/ruleEngine';
import { evaluateCondition, evaluateProgram } from '@/program/ruleEngine';
import { makeRule } from '@/program/templates';
import { makeProgram } from '../fixtures';

function context(overrides: Partial<EvaluationContext> = {}): EvaluationContext {
  return {
    readings: [
      { sensorId: 's1', type: 'distance', value: 4, unit: 'tiles', timestamp: 0 },
      { sensorId: 's2', type: 'line', value: 0, unit: 'boolean', timestamp: 0 },
    ],
    prediction: null,
    batteryPercent: 100,
    carrying: 0,
    elapsedSeconds: 0,
    ...overrides,
  };
}

describe('rule evaluation', () => {
  it('always matches the "always" condition', () => {
    expect(evaluateCondition({ type: 'always' }, context())).toBe(true);
  });

  it('compares sensor readings with each operator', () => {
    const ctx = context();
    expect(evaluateCondition({ type: 'sensor', sensor: 'distance', operator: 'lt', value: 5 }, ctx)).toBe(true);
    expect(evaluateCondition({ type: 'sensor', sensor: 'distance', operator: 'gt', value: 5 }, ctx)).toBe(false);
    expect(evaluateCondition({ type: 'sensor', sensor: 'distance', operator: 'gte', value: 4 }, ctx)).toBe(true);
    expect(evaluateCondition({ type: 'sensor', sensor: 'distance', operator: 'eq', value: 4 }, ctx)).toBe(true);
  });

  it('returns false rather than throwing when a sensor is missing', () => {
    const ctx = context({ readings: [] });
    expect(evaluateCondition({ type: 'sensor', sensor: 'sound', operator: 'lt', value: 3 }, ctx)).toBe(false);
  });

  it('honours the confidence threshold on AI conditions', () => {
    const ctx = context({
      prediction: {
        label: 'hazard_zone',
        confidence: 0.62,
        scores: {
          clear_path: 0.1,
          obstacle: 0.1,
          person_target: 0.08,
          hazard_zone: 0.62,
          supply_station: 0.1,
        },
        timestamp: 0,
      },
    });

    expect(
      evaluateCondition({ type: 'ai_prediction', label: 'hazard_zone', confidenceAbove: 0.5 }, ctx),
    ).toBe(true);
    expect(
      evaluateCondition({ type: 'ai_prediction', label: 'hazard_zone', confidenceAbove: 0.8 }, ctx),
    ).toBe(false);
    expect(
      evaluateCondition({ type: 'ai_prediction', label: 'clear_path', confidenceAbove: 0.5 }, ctx),
    ).toBe(false);
  });

  it('detects uncertainty, and stays quiet when there is no prediction at all', () => {
    // No camera fitted means no prediction, so an uncertainty rule must not
    // fire constantly and hijack every other rule.
    expect(evaluateCondition({ type: 'ai_uncertain', confidenceBelow: 0.5 }, context())).toBe(false);

    const unsure = context({
      prediction: {
        label: 'clear_path',
        confidence: 0.31,
        scores: {
          clear_path: 0.31,
          obstacle: 0.3,
          person_target: 0.15,
          hazard_zone: 0.14,
          supply_station: 0.1,
        },
        timestamp: 0,
      },
    });
    expect(evaluateCondition({ type: 'ai_uncertain', confidenceBelow: 0.5 }, unsure)).toBe(true);

    const confident = context({
      prediction: {
        label: 'clear_path',
        confidence: 0.9,
        scores: {
          clear_path: 0.9,
          obstacle: 0.03,
          person_target: 0.03,
          hazard_zone: 0.02,
          supply_station: 0.02,
        },
        timestamp: 0,
      },
    });
    expect(evaluateCondition({ type: 'ai_uncertain', confidenceBelow: 0.5 }, confident)).toBe(false);
  });

  it('combines conditions with and / or / not', () => {
    const ctx = context();
    const near = { type: 'sensor', sensor: 'distance', operator: 'lt', value: 5 } as const;
    const far = { type: 'sensor', sensor: 'distance', operator: 'gt', value: 5 } as const;

    expect(evaluateCondition({ type: 'and', left: near, right: far }, ctx)).toBe(false);
    expect(evaluateCondition({ type: 'or', left: near, right: far }, ctx)).toBe(true);
    expect(evaluateCondition({ type: 'not', inner: far }, ctx)).toBe(true);
  });

  it('runs the first matching rule from the top', () => {
    const program = makeProgram();
    const blocked = context({
      readings: [{ sensorId: 's1', type: 'distance', value: 1, unit: 'tiles', timestamp: 0 }],
    });

    expect(evaluateProgram(program, blocked).rule?.name).toBe('Turn when blocked');
    expect(evaluateProgram(program, context()).rule?.name).toBe('Drive forward');
  });

  it('skips disabled rules', () => {
    const program = makeProgram();
    program.rules[0].enabled = false;
    const blocked = context({
      readings: [{ sensorId: 's1', type: 'distance', value: 1, unit: 'tiles', timestamp: 0 }],
    });
    expect(evaluateProgram(program, blocked).rule?.name).toBe('Drive forward');
  });

  it('falls back to stopping when no rule matches', () => {
    const program = {
      ...makeProgram(),
      rules: [
        makeRule(
          'Never true',
          { type: 'sensor', sensor: 'distance', operator: 'lt', value: -1 },
          { type: 'forward', speed: 50 },
        ),
      ],
    };
    const match = evaluateProgram(program, context());
    expect(match.rule).toBeNull();
    expect(match.action.type).toBe('stop');
  });
});
