/**
 * Seeded pseudo-random number generation.
 *
 * Every source of randomness in the game funnels through here. That is what
 * makes a mission run repeatable: same seed + same program + same model
 * produces byte-identical telemetry, so scores are fair and bugs are
 * reproducible in a classroom.
 */

export interface Rng {
  /** Uniform float in [0, 1). */
  next(): number;
  /** Uniform integer in [min, max]. */
  int(min: number, max: number): number;
  /** Uniform float in [min, max). */
  range(min: number, max: number): number;
  /** Approximately gaussian value with the given mean and standard deviation. */
  gaussian(mean: number, stdDev: number): number;
  /** Picks one element. Throws on an empty array. */
  pick<T>(items: readonly T[]): T;
  /** Returns a shuffled copy. */
  shuffle<T>(items: readonly T[]): T[];
  /** True with the given probability. */
  chance(probability: number): boolean;
}

/**
 * mulberry32 — small, fast, good enough statistically for a teaching game and
 * trivially portable, so a replay produced on one machine reproduces on another.
 */
export function createRng(seed: number): Rng {
  let state = seed >>> 0;
  if (state === 0) state = 0x9e3779b9;

  const next = (): number => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const rng: Rng = {
    next,
    int: (min, max) => Math.floor(next() * (max - min + 1)) + min,
    range: (min, max) => next() * (max - min) + min,
    gaussian: (mean, stdDev) => {
      // Box–Muller. Guard against log(0).
      const u1 = Math.max(next(), Number.EPSILON);
      const u2 = next();
      const magnitude = Math.sqrt(-2 * Math.log(u1));
      return mean + stdDev * magnitude * Math.cos(2 * Math.PI * u2);
    },
    pick: (items) => {
      if (items.length === 0) throw new Error('Cannot pick from an empty array');
      return items[Math.floor(next() * items.length)];
    },
    shuffle: (items) => {
      const copy = [...items];
      for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
      }
      return copy;
    },
    chance: (probability) => next() < probability,
  };

  return rng;
}

/** Turns any string into a stable 32-bit seed, so mission ids can seed runs. */
export function hashSeed(text: string): number {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}
