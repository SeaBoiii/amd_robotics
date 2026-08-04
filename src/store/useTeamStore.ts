/**
 * Team profile, mission progress, badges and the engineering notebook.
 *
 * No personal data is stored unless Educator Mode explicitly enables member
 * names, and even then it never leaves the device.
 */

import { create } from 'zustand';
import type {
  Difficulty,
  EngineeringNotebookEntry,
  MissionResult,
  TeamProfile,
  TeamProgress,
} from '@/types';
import { createId } from '@/utils/format';
import { persisted } from './persisted';

interface TeamState extends TeamProgress {
  notebook: EngineeringNotebookEntry[];

  createTeam(profile: Omit<TeamProfile, 'createdAt'>): void;
  updateProfile(patch: Partial<TeamProfile>): void;
  setDifficulty(difficulty: Difficulty): void;
  recordResult(result: MissionResult): void;
  addNotebookEntry(entry: Omit<EngineeringNotebookEntry, 'id' | 'timestamp'>): void;
  updateReflection(entryId: string, reflection: EngineeringNotebookEntry['reflection']): void;
  deleteNotebookEntry(entryId: string): void;
  hasCompleted(missionId: string): boolean;
  attemptsFor(missionId: string): number;
  resetProgress(): void;
}

const EMPTY: TeamProgress & { notebook: EngineeringNotebookEntry[] } = {
  profile: null,
  completedMissionIds: [],
  bestScores: {},
  attempts: {},
  results: [],
  badges: [],
  totalScore: 0,
  notebook: [],
};

export const useTeamStore = create<TeamState>()(
  persisted(
    (set, get) => ({
      ...EMPTY,

      createTeam: (profile) =>
        set({
          ...EMPTY,
          profile: { ...profile, createdAt: Date.now() },
          notebook: [
            {
              id: createId('note'),
              type: 'reflection',
              title: 'Team created',
              summary: `${profile.teamName} joined the AMD AI Rover Challenge.`,
              timestamp: Date.now(),
              details: {
                'Team size': profile.memberCount,
                Difficulty: profile.difficulty,
                'School or class': profile.schoolOrClass || 'Not given',
              },
            },
          ],
        }),

      updateProfile: (patch) => {
        const profile = get().profile;
        if (!profile) return;
        set({ profile: { ...profile, ...patch } });
      },

      setDifficulty: (difficulty) => {
        const profile = get().profile;
        if (!profile) return;
        set({ profile: { ...profile, difficulty } });
      },

      recordResult: (result) => {
        const state = get();
        const previousBest = state.bestScores[result.missionId] ?? 0;
        const bestScores = {
          ...state.bestScores,
          [result.missionId]: Math.max(previousBest, result.score.total),
        };
        const attempts = {
          ...state.attempts,
          [result.missionId]: (state.attempts[result.missionId] ?? 0) + 1,
        };
        const completedMissionIds = result.success
          ? Array.from(new Set([...state.completedMissionIds, result.missionId]))
          : state.completedMissionIds;
        const badges = Array.from(new Set([...state.badges, ...result.badgesEarned]));
        const totalScore = Object.values(bestScores).reduce((sum, value) => sum + value, 0);

        // Keep the last 60 results so long workshops do not fill local storage.
        const results = [result, ...state.results].slice(0, 60);

        const entry: EngineeringNotebookEntry = {
          id: createId('note'),
          type: 'mission_attempt',
          title: `${result.success ? 'Passed' : 'Failed'} — attempt ${attempts[result.missionId]}`,
          summary: result.success
            ? `Scored ${result.score.total}/100.`
            : (result.failureReason ?? 'Mission failed.'),
          timestamp: Date.now(),
          missionId: result.missionId,
          details: {
            Score: result.score.total,
            'Time (s)': result.telemetry.elapsedSeconds,
            Collisions: result.telemetry.collisions,
            'Energy used': result.telemetry.energyUsed,
            'Supplies delivered': result.telemetry.suppliesDelivered,
            'Targets found': result.telemetry.targetsFound,
            'AI predictions': result.telemetry.predictionsMade,
            'Correct predictions': result.telemetry.correctPredictions,
            'Human checks': result.telemetry.humanInterventions,
            Seed: result.telemetry.seed,
          },
        };

        set({
          bestScores,
          attempts,
          completedMissionIds,
          badges,
          totalScore,
          results,
          notebook: [entry, ...state.notebook].slice(0, 200),
        });
      },

      addNotebookEntry: (entry) =>
        set((state) => ({
          notebook: [
            { ...entry, id: createId('note'), timestamp: Date.now() },
            ...state.notebook,
          ].slice(0, 200),
        })),

      updateReflection: (entryId, reflection) =>
        set((state) => ({
          notebook: state.notebook.map((entry) =>
            entry.id === entryId ? { ...entry, reflection } : entry,
          ),
        })),

      deleteNotebookEntry: (entryId) =>
        set((state) => ({ notebook: state.notebook.filter((entry) => entry.id !== entryId) })),

      hasCompleted: (missionId) => get().completedMissionIds.includes(missionId),
      attemptsFor: (missionId) => get().attempts[missionId] ?? 0,

      resetProgress: () => set({ ...EMPTY, profile: get().profile }),
    }),
    {
      key: 'team',
      partialize: ({
        profile,
        completedMissionIds,
        bestScores,
        attempts,
        results,
        badges,
        totalScore,
        notebook,
      }) => ({
        profile,
        completedMissionIds,
        bestScores,
        attempts,
        results,
        badges,
        totalScore,
        notebook,
      }),
    },
  ),
);
