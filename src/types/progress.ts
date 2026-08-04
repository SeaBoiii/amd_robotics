/**
 * Team progress, badges and the engineering notebook.
 */

import type { Difficulty, MissionResult } from './mission';

export interface TeamProfile {
  teamName: string;
  schoolOrClass: string;
  memberCount: number;
  colour: string;
  avatar: string;
  difficulty: Difficulty;
  createdAt: number;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  /** Short explanation of how to earn it, shown before it is unlocked. */
  howToEarn: string;
}

export interface TeamProgress {
  profile: TeamProfile | null;
  completedMissionIds: string[];
  bestScores: Record<string, number>;
  attempts: Record<string, number>;
  results: MissionResult[];
  badges: string[];
  totalScore: number;
}

export type NotebookEntryType =
  | 'rover_config'
  | 'ai_model'
  | 'program_change'
  | 'mission_attempt'
  | 'reflection';

export interface EngineeringNotebookEntry {
  id: string;
  type: NotebookEntryType;
  title: string;
  summary: string;
  timestamp: number;
  missionId?: string;
  /** Structured snapshot of whatever changed. Rendered as a details table. */
  details: Record<string, string | number | boolean>;
  /** Student-authored reflection fields. */
  reflection?: {
    whatChanged: string;
    whyChanged: string;
    whatHappened: string;
    whatNext: string;
  };
}

export interface ScoreHistoryRow {
  missionId: string;
  missionTitle: string;
  score: number;
  attempts: number;
  bestAt: number;
}
