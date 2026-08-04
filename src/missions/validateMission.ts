/**
 * Mission validation.
 *
 * Missions are authored by hand (and, we hope, by teachers), so a bad file must
 * produce a precise, readable complaint rather than a runtime crash three
 * screens later. Every check here maps to something a mission author can fix.
 */

import type { Difficulty, Mission } from '@/types';

const DIFFICULTIES: Difficulty[] = ['explorer', 'engineer', 'expert'];
const LEGAL_TILES = new Set(['.', '#', '~', '!', 'S', 'T', 'B', 'o', 'g']);
const HEADINGS = new Set(['north', 'east', 'south', 'west']);
const OBJECTIVE_TYPES = new Set([
  'reach_base',
  'reach_tile',
  'deliver_supplies',
  'find_targets',
  'avoid_hazards',
  'no_collisions',
  'classify_correctly',
  'energy_remaining',
]);

export interface MissionValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function validateMission(raw: unknown, fileName: string): MissionValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const fail = (message: string) => errors.push(`${fileName}: ${message}`);

  if (!isRecord(raw)) {
    return { valid: false, errors: [`${fileName}: file is not a JSON object.`], warnings };
  }

  for (const field of ['id', 'title', 'subtitle', 'description', 'story']) {
    if (typeof raw[field] !== 'string' || (raw[field] as string).length === 0) {
      fail(`"${field}" must be a non-empty string.`);
    }
  }
  if (typeof raw.index !== 'number') fail('"index" must be a number.');
  if (typeof raw.seed !== 'number') fail('"seed" must be a number so runs are repeatable.');
  if (typeof raw.budget !== 'number' || (raw.budget as number) <= 0) {
    fail('"budget" must be a positive number.');
  }
  if (typeof raw.timeLimit !== 'number' || (raw.timeLimit as number) <= 0) {
    fail('"timeLimit" must be a positive number of seconds.');
  }
  if (typeof raw.requiresAI !== 'boolean') fail('"requiresAI" must be true or false.');

  // ------------------------------------------------------------------- map
  const map = raw.map;
  if (!isRecord(map)) {
    fail('"map" is missing.');
  } else {
    const width = map.width;
    const height = map.height;
    const rows = map.rows;

    if (typeof width !== 'number' || width < 3) fail('"map.width" must be at least 3.');
    if (typeof height !== 'number' || height < 3) fail('"map.height" must be at least 3.');
    if (!Array.isArray(rows)) {
      fail('"map.rows" must be an array of strings.');
    } else {
      if (rows.length !== height) {
        fail(`"map.rows" has ${rows.length} rows but "map.height" says ${height}.`);
      }
      rows.forEach((row, index) => {
        if (typeof row !== 'string') {
          fail(`"map.rows[${index}]" is not a string.`);
          return;
        }
        if (row.length !== width) {
          fail(`"map.rows[${index}]" is ${row.length} characters but "map.width" is ${width}.`);
        }
        for (const char of row) {
          if (!LEGAL_TILES.has(char)) {
            fail(`"map.rows[${index}]" contains an unknown tile "${char}".`);
            break;
          }
        }
      });
    }
  }

  // ----------------------------------------------------------------- start
  const start = raw.start;
  if (!isRecord(start)) {
    fail('"start" is missing.');
  } else {
    if (typeof start.x !== 'number' || typeof start.y !== 'number') {
      fail('"start.x" and "start.y" must be numbers.');
    } else if (isRecord(map) && Array.isArray(map.rows)) {
      const rows = map.rows as string[];
      const row = rows[start.y as number];
      if (typeof row !== 'string' || start.x < 0 || start.x >= row.length) {
        fail('"start" is outside the map.');
      } else if (row[start.x as number] === '#' || row[start.x as number] === 'o') {
        fail('"start" is inside a wall or an obstacle. The rover would be stuck.');
      }
    }
    if (typeof start.heading !== 'string' || !HEADINGS.has(start.heading)) {
      fail('"start.heading" must be north, east, south or west.');
    }
  }

  // ------------------------------------------------------------ objectives
  const objectives = raw.objectives;
  if (!Array.isArray(objectives) || objectives.length === 0) {
    fail('"objectives" must contain at least one objective.');
  } else {
    const ids = new Set<string>();
    objectives.forEach((objective, index) => {
      if (!isRecord(objective)) {
        fail(`"objectives[${index}]" is not an object.`);
        return;
      }
      if (typeof objective.id !== 'string') fail(`"objectives[${index}].id" must be a string.`);
      else if (ids.has(objective.id)) fail(`Duplicate objective id "${objective.id}".`);
      else ids.add(objective.id);

      if (typeof objective.type !== 'string' || !OBJECTIVE_TYPES.has(objective.type)) {
        fail(`"objectives[${index}].type" is not a known objective type.`);
      }
      if (typeof objective.target !== 'number') {
        fail(`"objectives[${index}].target" must be a number.`);
      }
      if (typeof objective.description !== 'string') {
        fail(`"objectives[${index}].description" must be a string.`);
      }
      if (objective.type === 'reach_tile' && !isRecord(objective.tile)) {
        fail(`"objectives[${index}]" is a reach_tile objective but has no "tile".`);
      }
    });

    if (!objectives.some((objective) => isRecord(objective) && objective.required === true)) {
      warnings.push(`${fileName}: no objective is marked required, so the mission can never be won.`);
    }
  }

  // --------------------------------------------------------------- scoring
  const scoring = raw.scoring;
  if (!isRecord(scoring)) {
    fail('"scoring" is missing.');
  } else {
    const keys = ['completion', 'aiAccuracy', 'reliability', 'energy', 'time', 'safety', 'responsibleAi'];
    let total = 0;
    for (const key of keys) {
      if (typeof scoring[key] !== 'number') fail(`"scoring.${key}" must be a number.`);
      else total += scoring[key] as number;
    }
    if (errors.length === 0 && Math.abs(total - 100) > 0.01) {
      warnings.push(`${fileName}: scoring weights add up to ${total}, not 100.`);
    }
  }

  // ---------------------------------------------------- difficulty modifiers
  const modifiers = raw.difficultyModifiers;
  if (!isRecord(modifiers)) {
    fail('"difficultyModifiers" is missing.');
  } else {
    for (const difficulty of DIFFICULTIES) {
      const entry = modifiers[difficulty];
      if (!isRecord(entry)) {
        fail(`"difficultyModifiers.${difficulty}" is missing.`);
        continue;
      }
      for (const key of ['sensorNoise', 'aiUncertainty', 'energyMultiplier', 'timeMultiplier']) {
        if (typeof entry[key] !== 'number') {
          fail(`"difficultyModifiers.${difficulty}.${key}" must be a number.`);
        }
      }
    }
  }

  // ------------------------------------------------------------ soft checks
  if (!Array.isArray(raw.availableSensors) || raw.availableSensors.length === 0) {
    fail('"availableSensors" must list at least one sensor type.');
  }
  if (!Array.isArray(raw.availableComponents) || raw.availableComponents.length === 0) {
    fail('"availableComponents" must list at least one component id.');
  }
  if (!Array.isArray(raw.learningObjectives) || raw.learningObjectives.length === 0) {
    warnings.push(`${fileName}: no learning objectives listed.`);
  }
  if (!Array.isArray(raw.hints) || raw.hints.length === 0) {
    warnings.push(`${fileName}: no hints listed. Students will have nothing to fall back on.`);
  }

  if (raw.requiresAI === true && Array.isArray(raw.availableSensors)) {
    if (!(raw.availableSensors as unknown[]).includes('camera')) {
      fail('This mission requires AI, but the camera is not in "availableSensors".');
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

/** Narrowing helper used after validation succeeds. */
export function asMission(raw: unknown): Mission {
  return raw as Mission;
}
