/**
 * Student program contracts.
 *
 * A student program is an ordered list of rules. Every rule is
 * `condition → action`, which is simple enough for a 13-year-old to reason
 * about and structured enough to serialise, validate, test and replay.
 *
 * The visual rule builder produces exactly this JSON; nothing else.
 */

import type { LabelId } from './ai';
import type { SensorType } from './sensor';

export type ComparisonOperator = 'lt' | 'lte' | 'gt' | 'gte' | 'eq';

export type Condition =
  | { type: 'always' }
  | {
      type: 'sensor';
      sensor: SensorType;
      operator: ComparisonOperator;
      value: number;
    }
  | {
      type: 'ai_prediction';
      label: LabelId;
      confidenceAbove: number;
    }
  | {
      type: 'ai_uncertain';
      /** Fires when the top prediction's confidence is below this value. */
      confidenceBelow: number;
    }
  | { type: 'battery'; operator: ComparisonOperator; value: number }
  | { type: 'carrying'; operator: ComparisonOperator; value: number }
  | { type: 'timer'; operator: ComparisonOperator; value: number }
  | { type: 'and'; left: Condition; right: Condition }
  | { type: 'or'; left: Condition; right: Condition }
  | { type: 'not'; inner: Condition };

export type ActionType =
  | 'forward'
  | 'reverse'
  | 'turn_left'
  | 'turn_right'
  | 'stop'
  | 'wait'
  | 'deliver_supply'
  | 'pick_up_target'
  | 'scan'
  | 'request_human_help'
  | 'return_to_base';

export interface Action {
  type: ActionType;
  /** 0–100 speed override, used by forward/reverse. */
  speed?: number;
  /** Optional note shown in the event log and mission report. */
  note?: string;
}

export interface Rule {
  id: string;
  /** Student-facing name, e.g. "Stop for hazards". */
  name: string;
  enabled: boolean;
  condition: Condition;
  action: Action;
}

export interface StudentProgram {
  missionId: string;
  rules: Rule[];
  /** Bumped on every edit; recorded in the engineering notebook. */
  version: number;
  updatedAt: number;
}

export interface ProgramIssue {
  severity: 'error' | 'warning';
  ruleId: string | null;
  message: string;
  /** Plain-English suggestion for how to fix it. */
  hint: string;
}

export interface ProgramValidation {
  valid: boolean;
  issues: ProgramIssue[];
}
