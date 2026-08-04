import { describe, expect, it } from 'vitest';
import { LABELS } from '@/types';
import { TrainingError, classifier } from '@/ai/classifier/logisticRegression';
import { createStarterDataset, generateSamples } from '@/ai/datasets/generator';
import { analyseBalance, computeImbalance, countPerClass, findMisclassifications } from '@/ai/metrics/evaluate';
import { instantTrain, trainModel } from '@/ai/training/trainer';
import { FEATURE_COUNT } from '@/ai/labels';

function balancedSamples(perClass = 20, seed = 555) {
  return generateSamples({
    counts: {
      clear_path: perClass,
      obstacle: perClass,
      person_target: perClass,
      hazard_zone: perClass,
      supply_station: perClass,
    },
    seed,
    source: 'generated',
    preLabelled: true,
    idPrefix: 'test',
  });
}

describe('training data', () => {
  it('gives every sample the right number of features', () => {
    for (const sample of createStarterDataset()) {
      expect(sample.features).toHaveLength(FEATURE_COUNT);
    }
  });

  it('ships a deliberately imbalanced starter dataset so students must notice', () => {
    const counts = countPerClass(createStarterDataset());
    const values = Object.values(counts);
    expect(computeImbalance(counts)).toBeGreaterThan(0.1);
    expect(Math.max(...values)).toBeGreaterThan(Math.min(...values) * 2);
  });

  it('reports no balance warnings for an evenly spread dataset', () => {
    expect(analyseBalance(countPerClass(balancedSamples()))).toEqual([]);
    expect(computeImbalance(countPerClass(balancedSamples()))).toBe(0);
  });

  it('warns about missing and thin classes', () => {
    const skewed = generateSamples({
      counts: { clear_path: 20, obstacle: 2, person_target: 0, hazard_zone: 5, supply_station: 5 },
      seed: 11,
      source: 'generated',
      preLabelled: true,
      idPrefix: 'skew',
    });
    const warnings = analyseBalance(countPerClass(skewed));
    const severities = warnings.map((warning) => warning.severity);

    expect(severities).toContain('missing');
    expect(severities).toContain('low');
    expect(severities).toContain('dominant');
  });

  it('leaves collected samples unlabelled until the student labels them', () => {
    const collected = generateSamples({
      counts: { clear_path: 3, obstacle: 3, person_target: 0, hazard_zone: 0, supply_station: 0 },
      seed: 1,
      source: 'collected',
      preLabelled: false,
      idPrefix: 'c',
    });
    expect(collected.every((sample) => sample.label === null)).toBe(true);
    expect(collected.every((sample) => sample.trueLabel !== null)).toBe(true);
  });
});

describe('training guard rails', () => {
  it('refuses to train on fewer than five labelled examples', async () => {
    const samples = balancedSamples(1).slice(0, 4);
    await expect(classifier.train(samples, { epochs: 10, learningRate: 0.5, seed: 1 })).rejects.toBeInstanceOf(
      TrainingError,
    );
  });

  it('refuses to train when every example has the same label', async () => {
    const samples = generateSamples({
      counts: { clear_path: 12, obstacle: 0, person_target: 0, hazard_zone: 0, supply_station: 0 },
      seed: 3,
      source: 'generated',
      preLabelled: true,
      idPrefix: 'single',
    });
    await expect(classifier.train(samples, { epochs: 10, learningRate: 0.5, seed: 1 })).rejects.toBeInstanceOf(
      TrainingError,
    );
  });

  it('returns a friendly message rather than throwing at the store boundary', async () => {
    const outcome = await trainModel({ samples: balancedSamples(1).slice(0, 3), epochs: 10 });
    expect(outcome.ok).toBe(false);
    expect(outcome.model).toBeNull();
    expect(outcome.error).toMatch(/labelled/i);
  });
});

describe('predictions', () => {
  it('learns something better than guessing', async () => {
    const outcome = await trainModel({ samples: balancedSamples(), seed: 42 });
    expect(outcome.ok).toBe(true);
    expect(outcome.model?.metrics.accuracy ?? 0).toBeGreaterThan(0.6);
  });

  it('produces confidences that are probabilities summing to one', async () => {
    const { model } = await trainModel({ samples: balancedSamples(), seed: 42 });
    const prediction = classifier.predict(model!.weights, balancedSamples(1, 8)[0].features);

    expect(prediction.confidence).toBeGreaterThanOrEqual(0);
    expect(prediction.confidence).toBeLessThanOrEqual(1);

    const total = LABELS.reduce((sum, label) => sum + prediction.scores[label], 0);
    expect(total).toBeCloseTo(1, 4);
  });

  it('picks the label with the highest score', async () => {
    const { model } = await trainModel({ samples: balancedSamples(), seed: 42 });
    const prediction = classifier.predict(model!.weights, balancedSamples(1, 12)[0].features);
    const best = LABELS.reduce((a, b) =>
      prediction.scores[a] >= prediction.scores[b] ? a : b,
    );
    expect(prediction.label).toBe(best);
    expect(prediction.confidence).toBeCloseTo(prediction.scores[best], 6);
  });

  it('is deterministic for the same seed', async () => {
    const first = await trainModel({ samples: balancedSamples(), seed: 7 });
    const second = await trainModel({ samples: balancedSamples(), seed: 7 });
    expect(first.model?.weights.weights).toEqual(second.model?.weights.weights);
    expect(first.model?.weights.bias).toEqual(second.model?.weights.bias);
  });

  it('reports every misclassification it makes on the training data', async () => {
    const samples = balancedSamples();
    const { model } = await trainModel({ samples, seed: 42 });
    const mistakes = findMisclassifications(model!.weights, samples);

    for (const mistake of mistakes) {
      expect(mistake.predicted).not.toBe(mistake.sample.trueLabel);
      expect(mistake.confidence).toBeGreaterThan(0);
    }
  });
});

describe('instant training mode', () => {
  it('produces a usable model and flags itself as instant', async () => {
    const outcome = await instantTrain(3);
    expect(outcome.ok).toBe(true);
    expect(outcome.model?.instant).toBe(true);
    expect(outcome.model?.version).toBe(4);
    expect(outcome.model?.metrics.accuracy ?? 0).toBeGreaterThan(0.6);
  });
});
