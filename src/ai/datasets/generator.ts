/**
 * Deterministic training-data generation.
 *
 * The rover's "camera" does not produce real photographs — it produces a
 * six-number feature vector plus an 8x8 preview tile. This keeps training fast
 * enough for a 40-minute workshop while still teaching every real concept:
 * features, labels, class balance, noise, lighting, and look-alike classes.
 *
 * Two classes are deliberately designed to be confusable — `person_target` and
 * `hazard_zone` both contain warm colours — so that students discover
 * misclassification on their own instead of being told about it.
 */

import type { LabelId, TrainingSample } from '@/types';
import { LABELS } from '@/types';
import { createRng, type Rng } from '@/utils/rng';
import { clamp } from '@/utils/format';
import { FEATURE_COUNT } from '../labels';

/** mean + standard deviation per feature, in FEATURE_NAMES order. */
interface ClassProfile {
  mean: number[];
  std: number[];
}

const PROFILES: Record<LabelId, ClassProfile> = {
  //            bright edges green blue  warm  rough
  clear_path: {
    mean: [0.74, 0.14, 0.18, 0.12, 0.16, 0.15],
    std: [0.07, 0.05, 0.06, 0.05, 0.05, 0.05],
  },
  obstacle: {
    mean: [0.42, 0.82, 0.2, 0.14, 0.3, 0.78],
    std: [0.08, 0.07, 0.07, 0.05, 0.08, 0.07],
  },
  person_target: {
    mean: [0.58, 0.55, 0.22, 0.18, 0.76, 0.42],
    std: [0.08, 0.08, 0.07, 0.06, 0.07, 0.08],
  },
  hazard_zone: {
    mean: [0.46, 0.3, 0.16, 0.72, 0.55, 0.3],
    std: [0.09, 0.08, 0.06, 0.08, 0.09, 0.08],
  },
  supply_station: {
    mean: [0.66, 0.68, 0.72, 0.16, 0.26, 0.24],
    std: [0.07, 0.07, 0.08, 0.05, 0.07, 0.06],
  },
};

const LIGHTING_EFFECT = {
  bright: { brightnessShift: 0.12, noiseScale: 0.85 },
  normal: { brightnessShift: 0, noiseScale: 1 },
  dim: { brightnessShift: -0.18, noiseScale: 1.7 },
} as const;

export type Lighting = keyof typeof LIGHTING_EFFECT;

/** Builds the 8x8 preview grid students look at while labelling. */
function buildPattern(label: LabelId, features: number[], rng: Rng): number[] {
  const pattern: number[] = new Array(64);
  const [brightness, edges, , , , roughness] = features;

  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const index = row * 8 + col;
      let value = brightness;

      switch (label) {
        case 'clear_path':
          // A smooth road with faint lane markings down the middle.
          value = brightness + (col === 3 || col === 4 ? 0.18 : 0) - row * 0.01;
          break;
        case 'obstacle': {
          // A jagged blocky mass in the centre.
          const inBlob = Math.abs(col - 3.5) + Math.abs(row - 4) < 3.2;
          value = inBlob ? brightness - 0.35 + rng.range(0, roughness * 0.4) : brightness + 0.1;
          break;
        }
        case 'person_target': {
          // An upright figure: narrow head, wider body.
          const isHead = row < 3 && Math.abs(col - 3.5) < 1.2;
          const isBody = row >= 3 && Math.abs(col - 3.5) < 2.1;
          value = isHead || isBody ? brightness + 0.25 : brightness - 0.22;
          break;
        }
        case 'hazard_zone': {
          // Rippling water bands.
          value = brightness + Math.sin((row + col) * 0.9) * 0.16 - 0.05;
          break;
        }
        case 'supply_station': {
          // A crate: strong rectangular border with a cross brace.
          const border = row === 1 || row === 6 || col === 1 || col === 6;
          const brace = row === col || row + col === 7;
          value = border || brace ? brightness + 0.22 : brightness - 0.18;
          break;
        }
      }

      value += rng.gaussian(0, 0.03 + roughness * 0.05 + edges * 0.02);
      pattern[index] = clamp(value, 0, 1);
    }
  }
  return pattern;
}

export interface GenerateOptions {
  /** How many samples of each label to produce. */
  counts: Partial<Record<LabelId, number>>;
  seed: number;
  /** Extra noise multiplier applied on top of the class profile. */
  noiseMultiplier?: number;
  source?: TrainingSample['source'];
  /** Fix lighting instead of sampling it, used by deterministic demo data. */
  lighting?: Lighting;
  /** When true, samples arrive pre-labelled (starter data). */
  preLabelled?: boolean;
  idPrefix?: string;
}

export function generateSamples(options: GenerateOptions): TrainingSample[] {
  const {
    counts,
    seed,
    noiseMultiplier = 1,
    source = 'generated',
    preLabelled = false,
    idPrefix = 's',
  } = options;
  const rng = createRng(seed);
  const samples: TrainingSample[] = [];
  let index = 0;

  for (const label of LABELS) {
    const count = counts[label] ?? 0;
    const profile = PROFILES[label];

    for (let i = 0; i < count; i++) {
      const lighting: Lighting =
        options.lighting ?? (rng.chance(0.15) ? 'dim' : rng.chance(0.2) ? 'bright' : 'normal');
      const effect = LIGHTING_EFFECT[lighting];

      const features: number[] = new Array(FEATURE_COUNT);
      for (let f = 0; f < FEATURE_COUNT; f++) {
        const noise = profile.std[f] * noiseMultiplier * effect.noiseScale;
        let value = rng.gaussian(profile.mean[f], noise);
        if (f === 0) value += effect.brightnessShift;
        features[f] = clamp(value, 0, 1);
      }

      samples.push({
        id: `${idPrefix}_${label}_${index++}`,
        features,
        label: preLabelled ? label : null,
        trueLabel: label,
        pattern: buildPattern(label, features, rng),
        source,
        lighting,
        timestamp: seed + index,
      });
    }
  }

  return rng.shuffle(samples);
}

/**
 * The deterministic starter dataset every team begins with.
 *
 * It is intentionally *imbalanced* — plenty of clear-path examples, very few
 * hazard examples — because that is exactly the mistake real datasets contain,
 * and noticing it is the point of Mission 3.
 */
export function createStarterDataset(seed = 20260101): TrainingSample[] {
  return generateSamples({
    counts: {
      clear_path: 14,
      obstacle: 8,
      person_target: 5,
      hazard_zone: 3,
      supply_station: 6,
    },
    seed,
    source: 'starter',
    preLabelled: true,
    idPrefix: 'starter',
  });
}

/** A balanced, held-out set used to measure accuracy honestly. */
export function createTestDataset(seed = 20260202): TrainingSample[] {
  return generateSamples({
    counts: {
      clear_path: 12,
      obstacle: 12,
      person_target: 12,
      hazard_zone: 12,
      supply_station: 12,
    },
    seed,
    source: 'generated',
    preLabelled: true,
    idPrefix: 'test',
  });
}

/**
 * Simulates driving the rover forward and grabbing camera snapshots. Returned
 * samples are unlabelled — students must label them, which is the whole lesson.
 */
export function collectSamples(label: LabelId, count: number, seed: number): TrainingSample[] {
  return generateSamples({
    counts: { [label]: count },
    seed,
    source: 'collected',
    preLabelled: false,
    idPrefix: `collect_${Date.now().toString(36)}`,
  });
}

/**
 * Produces the feature vector the rover's camera "sees" for a given world tile.
 * Used by the simulator so that in-mission predictions come from the same
 * distribution the model was trained on.
 */
export function sampleFeaturesForLabel(
  label: LabelId,
  rng: Rng,
  uncertainty: number,
): { features: number[]; lighting: Lighting } {
  const profile = PROFILES[label];
  const lighting: Lighting = rng.chance(0.12) ? 'dim' : 'normal';
  const effect = LIGHTING_EFFECT[lighting];
  const features: number[] = new Array(FEATURE_COUNT);
  for (let f = 0; f < FEATURE_COUNT; f++) {
    const noise = profile.std[f] * (1 + uncertainty) * effect.noiseScale;
    let value = rng.gaussian(profile.mean[f], noise);
    if (f === 0) value += effect.brightnessShift;
    features[f] = clamp(value, 0, 1);
  }
  return { features, lighting };
}
