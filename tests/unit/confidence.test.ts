import { describe, expect, it } from 'vitest';
import type { Condition, Prediction } from '@/types';
import { evaluateProgram } from '@/program/ruleEngine';
import { makeRule } from '@/program/templates';
import { makeProgram } from '../fixtures';

function prediction(confidence: number, label: Prediction['label'] = 'person_target'): Prediction {
  const rest = (1 - confidence) / 4;
  return {
    label,
    confidence,
    scores: {
      clear_path: rest,
      obstacle: rest,
      person_target: rest,
      hazard_zone: rest,
      supply_station: rest,
      [label]: confidence,
    } as Prediction['scores'],
    timestamp: 0,
  };
}

function programWith(condition: Condition) {
  return {
    ...makeProgram(),
    rules: [makeRule('Act on AI', condition, { type: 'deliver_supply' })],
  };
}

function context(prediction: Prediction | null) {
  return {
    readings: [],
    prediction,
    batteryPercent: 100,
    carrying: 0,
    elapsedSeconds: 0,
  };
}

describe('confidence thresholds', () => {
  it('fires only when the AI is confident enough', () => {
    const program = programWith({
      type: 'ai_prediction',
      label: 'person_target',
      confidenceAbove: 0.8,
    });

    expect(evaluateProgram(program, context(prediction(0.95))).action.type).toBe('deliver_supply');
    expect(evaluateProgram(program, context(prediction(0.79))).action.type).toBe('stop');
  });

  it('requires the confidence to be strictly above the threshold', () => {
    const program = programWith({
      type: 'ai_prediction',
      label: 'person_target',
      confidenceAbove: 0.8,
    });
    expect(evaluateProgram(program, context(prediction(0.8))).action.type).toBe('stop');
    expect(evaluateProgram(program, context(prediction(0.801))).action.type).toBe('deliver_supply');
  });

  it('does not fire when the AI predicted a different label, however confident', () => {
    const program = programWith({
      type: 'ai_prediction',
      label: 'person_target',
      confidenceAbove: 0.5,
    });
    expect(evaluateProgram(program, context(prediction(0.99, 'hazard_zone'))).action.type).toBe('stop');
  });

  it('does nothing dangerous when there is no prediction at all', () => {
    const program = programWith({
      type: 'ai_prediction',
      label: 'person_target',
      confidenceAbove: 0.5,
    });
    expect(evaluateProgram(program, context(null)).action.type).toBe('stop');
  });

  it('detects uncertainty below a threshold', () => {
    const program = programWith({ type: 'ai_uncertain', confidenceBelow: 0.6 });
    expect(evaluateProgram(program, context(prediction(0.4))).action.type).toBe('deliver_supply');
    expect(evaluateProgram(program, context(prediction(0.9))).action.type).toBe('stop');
  });

  it('lets an uncertainty rule placed first override a confident-action rule', () => {
    const program = {
      ...makeProgram(),
      rules: [
        makeRule(
          'Ask a human',
          { type: 'ai_uncertain', confidenceBelow: 0.7 },
          { type: 'request_human_help' },
        ),
        makeRule(
          'Deliver',
          { type: 'ai_prediction', label: 'person_target', confidenceAbove: 0.5 },
          { type: 'deliver_supply' },
        ),
      ],
    };

    expect(evaluateProgram(program, context(prediction(0.6))).action.type).toBe('request_human_help');
    expect(evaluateProgram(program, context(prediction(0.85))).action.type).toBe('deliver_supply');
  });

  it('explains its decision in plain English', () => {
    const program = programWith({
      type: 'ai_prediction',
      label: 'person_target',
      confidenceAbove: 0.8,
    });
    const match = evaluateProgram(program, context(prediction(0.95)));
    expect(match.reason.length).toBeGreaterThan(10);
    expect(match.reason).toMatch(/act on ai|person/i);
  });
});
