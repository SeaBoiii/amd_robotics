/** Student programs, stored per mission so each mission keeps its own rules. */

import { create } from 'zustand';
import type { Action, Condition, Rule, StudentProgram } from '@/types';
import { createStarterProgram } from '@/program/templates';
import { createId } from '@/utils/format';
import { persisted } from './persisted';

interface ProgramState {
  programs: Record<string, StudentProgram>;

  getProgram(missionId: string): StudentProgram;
  addRule(missionId: string, rule: Omit<Rule, 'id'>): void;
  updateRule(missionId: string, ruleId: string, patch: Partial<Rule>): void;
  setCondition(missionId: string, ruleId: string, condition: Condition): void;
  setAction(missionId: string, ruleId: string, action: Action): void;
  removeRule(missionId: string, ruleId: string): void;
  moveRule(missionId: string, ruleId: string, direction: -1 | 1): void;
  resetProgram(missionId: string): void;
}

function bump(program: StudentProgram, rules: Rule[]): StudentProgram {
  return { ...program, rules, version: program.version + 1, updatedAt: Date.now() };
}

export const useProgramStore = create<ProgramState>()(
  persisted(
    (set, get) => ({
      programs: {},

      getProgram: (missionId) => {
        const existing = get().programs[missionId];
        if (existing) return existing;
        const starter = createStarterProgram(missionId);
        set((state) => ({ programs: { ...state.programs, [missionId]: starter } }));
        return starter;
      },

      addRule: (missionId, rule) => {
        const program = get().getProgram(missionId);
        const newRule: Rule = { ...rule, id: createId('rule') };
        // New rules go above the catch-all so they are actually reachable.
        const catchAllIndex = program.rules.findIndex(
          (item) => item.condition.type === 'always' && item.enabled,
        );
        const rules =
          catchAllIndex === -1
            ? [...program.rules, newRule]
            : [
                ...program.rules.slice(0, catchAllIndex),
                newRule,
                ...program.rules.slice(catchAllIndex),
              ];
        set((state) => ({ programs: { ...state.programs, [missionId]: bump(program, rules) } }));
      },

      updateRule: (missionId, ruleId, patch) => {
        const program = get().getProgram(missionId);
        const rules = program.rules.map((rule) =>
          rule.id === ruleId ? { ...rule, ...patch } : rule,
        );
        set((state) => ({ programs: { ...state.programs, [missionId]: bump(program, rules) } }));
      },

      setCondition: (missionId, ruleId, condition) =>
        get().updateRule(missionId, ruleId, { condition }),

      setAction: (missionId, ruleId, action) => get().updateRule(missionId, ruleId, { action }),

      removeRule: (missionId, ruleId) => {
        const program = get().getProgram(missionId);
        const rules = program.rules.filter((rule) => rule.id !== ruleId);
        set((state) => ({ programs: { ...state.programs, [missionId]: bump(program, rules) } }));
      },

      moveRule: (missionId, ruleId, direction) => {
        const program = get().getProgram(missionId);
        const index = program.rules.findIndex((rule) => rule.id === ruleId);
        const target = index + direction;
        if (index === -1 || target < 0 || target >= program.rules.length) return;
        const rules = [...program.rules];
        [rules[index], rules[target]] = [rules[target], rules[index]];
        set((state) => ({ programs: { ...state.programs, [missionId]: bump(program, rules) } }));
      },

      resetProgram: (missionId) =>
        set((state) => ({
          programs: { ...state.programs, [missionId]: createStarterProgram(missionId) },
        })),
    }),
    { key: 'programs', partialize: ({ programs }) => ({ programs }) },
  ),
);
