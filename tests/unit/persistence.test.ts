import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  STORAGE_VERSION,
  clearAllState,
  getStorageUsageKb,
  isPersistenceAvailable,
  loadState,
  removeState,
  saveState,
} from '@/utils/storage';
import { useTeamStore } from '@/store/useTeamStore';
import { makeMission } from '../fixtures';

const PREFIX = 'amd-rover:';

beforeEach(() => {
  window.localStorage.clear();
  vi.restoreAllMocks();
});

describe('storage', () => {
  it('is available in a normal browser', () => {
    expect(isPersistenceAvailable()).toBe(true);
  });

  it('round-trips a value', () => {
    saveState('demo', { teamName: 'Rover Rangers', score: 72 });
    expect(loadState('demo', null)).toEqual({ teamName: 'Rover Rangers', score: 72 });
  });

  it('returns the fallback when nothing is saved', () => {
    expect(loadState('missing', { fresh: true })).toEqual({ fresh: true });
  });

  it('wraps saved data in a versioned envelope', () => {
    saveState('demo', { a: 1 });
    const raw = JSON.parse(window.localStorage.getItem(`${PREFIX}demo`)!);
    expect(raw.version).toBe(STORAGE_VERSION);
    expect(raw.data).toEqual({ a: 1 });
    expect(typeof raw.savedAt).toBe('number');
  });

  it('starts fresh instead of crashing on corrupt JSON', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    window.localStorage.setItem(`${PREFIX}demo`, '{ this is not json');
    expect(loadState('demo', { fresh: true })).toEqual({ fresh: true });
    expect(window.localStorage.getItem(`${PREFIX}demo`)).toBeNull();
  });

  it('starts fresh instead of crashing on a value of the wrong shape', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    window.localStorage.setItem(`${PREFIX}demo`, '"just a string"');
    expect(loadState('demo', { fresh: true })).toEqual({ fresh: true });
  });

  it('discards data saved by an older version', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    window.localStorage.setItem(
      `${PREFIX}demo`,
      JSON.stringify({ version: STORAGE_VERSION - 1, savedAt: 0, data: { old: true } }),
    );
    expect(loadState('demo', { fresh: true })).toEqual({ fresh: true });
  });

  it('reports failure rather than throwing when the quota is exceeded', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(window.localStorage, 'setItem').mockImplementation((key: string) => {
      // Let the availability probe through; only real writes hit the quota.
      if (key.includes('__probe__')) return;
      throw new DOMException('QuotaExceededError');
    });
    expect(saveState('demo', { a: 1 })).toBe(false);
  });

  it('removes and clears only its own keys', () => {
    saveState('one', 1);
    saveState('two', 2);
    window.localStorage.setItem('someone-elses-key', 'keep me');

    removeState('one');
    expect(loadState('one', null)).toBeNull();
    expect(loadState('two', null)).toBe(2);

    clearAllState();
    expect(loadState('two', null)).toBeNull();
    expect(window.localStorage.getItem('someone-elses-key')).toBe('keep me');
  });

  it('reports its own storage usage', () => {
    expect(getStorageUsageKb()).toBe(0);
    saveState('big', { blob: 'x'.repeat(4000) });
    expect(getStorageUsageKb()).toBeGreaterThan(1);
  });
});

describe('progress persistence', () => {
  const result = (missionId: string, total: number) => ({
    missionId,
    attemptNumber: 1,
    success: true,
    failureReason: null,
    score: {
      total,
      completion: 30,
      aiAccuracy: 20,
      reliability: 15,
      energy: 10,
      time: 10,
      safety: 10,
      responsibleAi: 5,
    },
    telemetry: {
      ticks: 10,
      elapsedSeconds: 5,
      distanceTravelled: 4,
      energyUsed: 10,
      energyRemaining: 90,
      collisions: 0,
      hazardsEntered: 0,
      suppliesDelivered: 1,
      targetsFound: 0,
      predictionsMade: 0,
      correctPredictions: 0,
      humanInterventions: 0,
      lowConfidenceStops: 0,
      seed: 1,
    },
    objectives: [],
    explanations: [],
    suggestions: [],
    badgesEarned: ['reliable-rover'],
    completedAt: Date.now(),
    difficulty: 'engineer' as const,
  });

  const PROFILE = {
    teamName: 'Rover Rangers',
    schoolOrClass: 'Sec 2E',
    memberCount: 3,
    colour: '#ED1C24',
    avatar: 'rover',
    difficulty: 'engineer' as const,
  };

  beforeEach(() => {
    useTeamStore.setState({
      profile: null,
      completedMissionIds: [],
      bestScores: {},
      attempts: {},
      results: [],
      badges: [],
      totalScore: 0,
      notebook: [],
    });
  });

  it('creates a team and writes it to local storage', () => {
    useTeamStore.getState().createTeam(PROFILE);
    expect(useTeamStore.getState().profile?.teamName).toBe('Rover Rangers');
    expect(useTeamStore.getState().profile?.createdAt).toBeGreaterThan(0);
    expect(window.localStorage.getItem(`${PREFIX}team`)).toBeTruthy();
  });

  it('records mission results and tracks completion', () => {
    useTeamStore.getState().createTeam(PROFILE);
    useTeamStore.getState().recordResult(result('m1-first-movement', 82));

    expect(useTeamStore.getState().hasCompleted('m1-first-movement')).toBe(true);
    expect(useTeamStore.getState().hasCompleted('m2-sense-and-avoid')).toBe(false);
    expect(useTeamStore.getState().attemptsFor('m1-first-movement')).toBe(1);
  });

  it('keeps the best score when a mission is replayed', () => {
    useTeamStore.getState().createTeam(PROFILE);
    useTeamStore.getState().recordResult(result('m1-first-movement', 60));
    useTeamStore.getState().recordResult(result('m1-first-movement', 88));
    useTeamStore.getState().recordResult(result('m1-first-movement', 71));

    expect(useTeamStore.getState().bestScores['m1-first-movement']).toBe(88);
    expect(useTeamStore.getState().attemptsFor('m1-first-movement')).toBe(3);
    expect(useTeamStore.getState().completedMissionIds).toEqual(['m1-first-movement']);
  });

  it('does not award the same badge twice', () => {
    useTeamStore.getState().createTeam(PROFILE);
    useTeamStore.getState().recordResult(result('m1-first-movement', 60));
    useTeamStore.getState().recordResult(result('m2-sense-and-avoid', 70));

    expect(useTeamStore.getState().badges.filter((badge) => badge === 'reliable-rover')).toHaveLength(1);
  });

  it('stores notebook entries and lets a reflection be added later', () => {
    useTeamStore.getState().createTeam(PROFILE);
    useTeamStore.getState().addNotebookEntry({
      type: 'mission_attempt',
      title: 'Mission 1 attempt 1',
      summary: 'First run of the delivery route.',
      missionId: 'm1-first-movement',
      details: { score: 82, collisions: 0 },
    });

    const [entry] = useTeamStore.getState().notebook;
    expect(entry.id).toBeTruthy();
    expect(entry.timestamp).toBeGreaterThan(0);

    useTeamStore.getState().updateReflection(entry.id, {
      whatChanged: 'Slowed the motors down.',
      whyChanged: 'We kept hitting the wall.',
      whatHappened: 'No collisions.',
      whatNext: 'Try the shorter route.',
    });

    expect(useTeamStore.getState().notebook[0].reflection?.whatChanged).toBe('Slowed the motors down.');
  });

  it('survives a reload by reading the saved state back', () => {
    useTeamStore.getState().createTeam(PROFILE);
    useTeamStore.getState().recordResult(result(makeMission().id, 82));

    const saved = loadState<{ profile: { teamName: string } | null; totalScore: number }>('team', {
      profile: null,
      totalScore: 0,
    });
    expect(saved.profile?.teamName).toBe('Rover Rangers');
    expect(saved.totalScore).toBe(82);
  });

  it('clears scores and badges on reset but keeps the team signed in', () => {
    useTeamStore.getState().createTeam(PROFILE);
    useTeamStore.getState().recordResult(result(makeMission().id, 82));
    useTeamStore.getState().resetProgress();

    expect(useTeamStore.getState().profile?.teamName).toBe('Rover Rangers');
    expect(useTeamStore.getState().results).toEqual([]);
    expect(useTeamStore.getState().badges).toEqual([]);
    expect(useTeamStore.getState().totalScore).toBe(0);
  });
});
