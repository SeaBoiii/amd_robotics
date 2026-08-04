import { describe, expect, it } from 'vitest';
import { validateMission } from '@/missions/validateMission';
import { makeMission } from '../fixtures';

const FILE = 'test.json';

describe('mission validation', () => {
  it('accepts a well-formed mission', () => {
    const result = validateMission(makeMission(), FILE);
    expect(result.errors).toEqual([]);
    expect(result.valid).toBe(true);
  });

  it('rejects a mission whose rows do not match the declared height', () => {
    const mission = makeMission();
    const broken = { ...mission, map: { ...mission.map, rows: mission.map.rows.slice(0, 2) } };
    const result = validateMission(broken, FILE);
    expect(result.valid).toBe(false);
    expect(result.errors.join(' ')).toMatch(/row/i);
  });

  it('rejects a start position outside the map', () => {
    const result = validateMission(makeMission({ start: { x: 99, y: 99, heading: 'north' } }), FILE);
    expect(result.valid).toBe(false);
  });

  it('rejects a start position inside a wall', () => {
    const result = validateMission(makeMission({ start: { x: 0, y: 0, heading: 'east' } }), FILE);
    expect(result.valid).toBe(false);
  });

  it('rejects an AI mission that has no camera available', () => {
    const result = validateMission(
      makeMission({ requiresAI: true, availableSensors: ['distance'] }),
      FILE,
    );
    expect(result.valid).toBe(false);
    expect(result.errors.join(' ')).toMatch(/camera/i);
  });

  it('warns when the scoring weights do not add up to 100', () => {
    const mission = makeMission();
    const result = validateMission(
      { ...mission, scoring: { ...mission.scoring, completion: 50 } },
      FILE,
    );
    expect(result.warnings.join(' ')).toMatch(/100/);
  });

  it('rejects values that are not missions at all', () => {
    expect(validateMission(null, FILE).valid).toBe(false);
    expect(validateMission('not a mission', FILE).valid).toBe(false);
    expect(validateMission({}, FILE).valid).toBe(false);
  });

  it('names the file in its errors so an author can find the problem', () => {
    const result = validateMission({}, 'broken-mission.json');
    expect(result.errors[0]).toContain('broken-mission.json');
  });
});
