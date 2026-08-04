/**
 * Starter rule sets and the block palette used by the Programming Lab.
 *
 * Every mission opens with a small, deliberately incomplete program. Students
 * always have something that runs, and always have something to fix.
 */

import type { Condition, Rule, StudentProgram } from '@/types';
import { createId } from '@/utils/format';

export function makeRule(name: string, condition: Condition, action: Rule['action']): Rule {
  return { id: createId('rule'), name, enabled: true, condition, action };
}

export const CONDITION_PRESETS: { id: string; label: string; hint: string; build: () => Condition }[] =
  [
    {
      id: 'always',
      label: 'Always',
      hint: 'Runs when nothing above it matched. Keep this at the bottom.',
      build: () => ({ type: 'always' }),
    },
    {
      id: 'distance_close',
      label: 'Something is close ahead',
      hint: 'Uses the distance sensor. Lower numbers mean closer.',
      build: () => ({ type: 'sensor', sensor: 'distance', operator: 'lt', value: 2 }),
    },
    {
      id: 'line_detected',
      label: 'On a damaged road edge',
      hint: 'Uses the line sensor to follow or avoid road markings.',
      build: () => ({ type: 'sensor', sensor: 'line', operator: 'gte', value: 1 }),
    },
    {
      id: 'ai_sees',
      label: 'The AI sees a label',
      hint: 'Fires only when the AI is confident enough.',
      build: () => ({ type: 'ai_prediction', label: 'hazard_zone', confidenceAbove: 0.75 }),
    },
    {
      id: 'ai_unsure',
      label: 'The AI is unsure',
      hint: 'Your safety net for low-confidence predictions.',
      build: () => ({ type: 'ai_uncertain', confidenceBelow: 0.5 }),
    },
    {
      id: 'battery_low',
      label: 'Battery is low',
      hint: 'Head home before the rover runs flat.',
      build: () => ({ type: 'battery', operator: 'lt', value: 25 }),
    },
    {
      id: 'carrying',
      label: 'Carrying supplies',
      hint: 'Check whether there is still cargo on board.',
      build: () => ({ type: 'carrying', operator: 'gt', value: 0 }),
    },
    {
      id: 'timer',
      label: 'Mission time passed',
      hint: 'Trigger a fallback plan after a number of seconds.',
      build: () => ({ type: 'timer', operator: 'gt', value: 45 }),
    },
  ];

export const ACTION_PRESETS: { id: Rule['action']['type']; label: string; hint: string }[] = [
  { id: 'forward', label: 'Drive forward', hint: 'Move one tile in the direction the rover faces.' },
  { id: 'turn_left', label: 'Turn left', hint: 'Rotate 90° anticlockwise. Does not move.' },
  { id: 'turn_right', label: 'Turn right', hint: 'Rotate 90° clockwise. Does not move.' },
  { id: 'reverse', label: 'Reverse', hint: 'Back up one tile. Useful after a collision.' },
  { id: 'stop', label: 'Stop', hint: 'Cut the motors. Safe, but the mission clock keeps running.' },
  { id: 'scan', label: 'Scan', hint: 'Take a careful camera reading. Slower but more reliable.' },
  { id: 'deliver_supply', label: 'Deliver supply', hint: 'Drop a package at a supply station.' },
  { id: 'pick_up_target', label: 'Pick up target', hint: 'Collect the person or item on this tile.' },
  {
    id: 'request_human_help',
    label: 'Ask a human',
    hint: 'Pause and request confirmation. Costs time, protects your safety score.',
  },
  { id: 'return_to_base', label: 'Return to base', hint: 'Steer back towards the command centre.' },
  { id: 'wait', label: 'Wait', hint: 'Do nothing for one step.' },
];

/** Mission-specific starter programs, keyed by mission id. */
export function createStarterProgram(missionId: string): StudentProgram {
  const rules: Rule[] = [];

  switch (missionId) {
    case 'm1-first-movement':
      rules.push(makeRule('Drive forward', { type: 'always' }, { type: 'forward', speed: 70 }));
      break;

    case 'm2-sense-and-avoid':
      rules.push(
        makeRule(
          'Turn when blocked',
          { type: 'sensor', sensor: 'distance', operator: 'lt', value: 2 },
          { type: 'turn_right' },
        ),
        makeRule('Drive forward', { type: 'always' }, { type: 'forward', speed: 70 }),
      );
      break;

    case 'm3-teach-the-rover':
      rules.push(
        makeRule(
          'Stop for hazards',
          { type: 'ai_prediction', label: 'hazard_zone', confidenceAbove: 0.7 },
          { type: 'turn_left' },
        ),
        makeRule(
          'Turn when blocked',
          { type: 'sensor', sensor: 'distance', operator: 'lt', value: 2 },
          { type: 'turn_right' },
        ),
        makeRule('Drive forward', { type: 'always' }, { type: 'forward', speed: 65 }),
      );
      break;

    case 'm4-ai-in-control':
      rules.push(
        makeRule(
          'Ask a human when unsure',
          { type: 'ai_uncertain', confidenceBelow: 0.5 },
          { type: 'request_human_help', note: 'I cannot tell what is ahead.' },
        ),
        makeRule(
          'Avoid hazards',
          { type: 'ai_prediction', label: 'hazard_zone', confidenceAbove: 0.7 },
          { type: 'turn_left' },
        ),
        makeRule(
          'Deliver at supply station',
          { type: 'ai_prediction', label: 'supply_station', confidenceAbove: 0.6 },
          { type: 'deliver_supply' },
        ),
        makeRule(
          'Turn when blocked',
          { type: 'sensor', sensor: 'distance', operator: 'lt', value: 2 },
          { type: 'turn_right' },
        ),
        makeRule('Drive forward', { type: 'always' }, { type: 'forward', speed: 65 }),
      );
      break;

    case 'm5-rescue-rover':
      rules.push(
        makeRule(
          'Battery low — go home',
          { type: 'battery', operator: 'lt', value: 25 },
          { type: 'return_to_base' },
        ),
        makeRule(
          'Ask a human when unsure',
          { type: 'ai_uncertain', confidenceBelow: 0.5 },
          { type: 'request_human_help', note: 'Low confidence — requesting a check.' },
        ),
        makeRule(
          'Avoid hazards',
          { type: 'ai_prediction', label: 'hazard_zone', confidenceAbove: 0.75 },
          { type: 'turn_left' },
        ),
        makeRule(
          'Rescue the target',
          { type: 'ai_prediction', label: 'person_target', confidenceAbove: 0.6 },
          { type: 'pick_up_target' },
        ),
        makeRule(
          'Deliver at supply station',
          { type: 'ai_prediction', label: 'supply_station', confidenceAbove: 0.6 },
          { type: 'deliver_supply' },
        ),
        makeRule(
          'Turn when blocked',
          { type: 'sensor', sensor: 'distance', operator: 'lt', value: 2 },
          { type: 'turn_right' },
        ),
        makeRule('Drive forward', { type: 'always' }, { type: 'forward', speed: 60 }),
      );
      break;

    default:
      rules.push(makeRule('Drive forward', { type: 'always' }, { type: 'forward', speed: 70 }));
  }

  return { missionId, rules, version: 1, updatedAt: Date.now() };
}
