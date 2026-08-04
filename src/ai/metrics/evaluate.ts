/**
 * Model evaluation: the numbers students use to decide whether their model is
 * actually any good, and why it is not.
 */

import type {
  ConfusionMatrix,
  LabelId,
  ModelMetrics,
  ModelWeights,
  TrainingSample,
} from '@/types';
import { LABELS } from '@/types';
import { classifier } from '../classifier/logisticRegression';

export function countPerClass(samples: TrainingSample[]): Record<LabelId, number> {
  const counts = Object.fromEntries(LABELS.map((label) => [label, 0])) as Record<LabelId, number>;
  for (const sample of samples) {
    if (sample.label) counts[sample.label] += 1;
  }
  return counts;
}

/**
 * Imbalance score in [0, 1]. 0 means every class has the same number of
 * examples; values above ~0.35 are worth warning a student about.
 */
export function computeImbalance(counts: Record<LabelId, number>): number {
  const values = LABELS.map((label) => counts[label]);
  const total = values.reduce((sum, value) => sum + value, 0);
  if (total === 0) return 0;
  const ideal = total / LABELS.length;
  const deviation = values.reduce((sum, value) => sum + Math.abs(value - ideal), 0);
  const worstCase = 2 * (total - ideal);
  return worstCase === 0 ? 0 : Math.min(1, deviation / worstCase);
}

export interface BalanceWarning {
  label: LabelId;
  severity: 'low' | 'missing' | 'dominant';
  message: string;
}

export function analyseBalance(counts: Record<LabelId, number>): BalanceWarning[] {
  const warnings: BalanceWarning[] = [];
  const total = LABELS.reduce((sum, label) => sum + counts[label], 0);
  if (total === 0) return warnings;
  const average = total / LABELS.length;

  for (const label of LABELS) {
    const count = counts[label];
    if (count === 0) {
      warnings.push({
        label,
        severity: 'missing',
        message: 'No examples at all. The rover can never predict this label.',
      });
    } else if (count < 3) {
      warnings.push({
        label,
        severity: 'low',
        message: `Only ${count} example${count === 1 ? '' : 's'}. The model will be unsure about this one.`,
      });
    } else if (count > average * 2.2) {
      warnings.push({
        label,
        severity: 'dominant',
        message: `${count} examples — far more than the others. The model may guess this label too often.`,
      });
    }
  }
  return warnings;
}

export function buildConfusionMatrix(
  weights: ModelWeights,
  samples: TrainingSample[],
): ConfusionMatrix {
  const counts = LABELS.map(() => LABELS.map(() => 0));
  for (const sample of samples) {
    const actual = LABELS.indexOf(sample.trueLabel);
    const predicted = LABELS.indexOf(classifier.predict(weights, sample.features).label);
    if (actual >= 0 && predicted >= 0) counts[actual][predicted] += 1;
  }
  return { labels: [...LABELS], counts };
}

export interface Misclassification {
  sample: TrainingSample;
  predicted: LabelId;
  confidence: number;
}

export function findMisclassifications(
  weights: ModelWeights,
  samples: TrainingSample[],
): Misclassification[] {
  const results: Misclassification[] = [];
  for (const sample of samples) {
    const prediction = classifier.predict(weights, sample.features);
    if (prediction.label !== sample.trueLabel) {
      results.push({ sample, predicted: prediction.label, confidence: prediction.confidence });
    }
  }
  return results.sort((a, b) => b.confidence - a.confidence);
}

export function evaluate(
  weights: ModelWeights,
  trainingSamples: TrainingSample[],
  testSamples: TrainingSample[],
): ModelMetrics {
  const confusion = buildConfusionMatrix(weights, testSamples);

  let correct = 0;
  let confidenceSum = 0;
  for (const sample of testSamples) {
    const prediction = classifier.predict(weights, sample.features);
    if (prediction.label === sample.trueLabel) correct += 1;
    confidenceSum += prediction.confidence;
  }

  let trainCorrect = 0;
  const labelledTraining = trainingSamples.filter((sample) => sample.label !== null);
  for (const sample of labelledTraining) {
    if (classifier.predict(weights, sample.features).label === sample.label) trainCorrect += 1;
  }

  const perClassAccuracy = Object.fromEntries(
    LABELS.map((label, index) => {
      const row = confusion.counts[index];
      const total = row.reduce((sum, value) => sum + value, 0);
      return [label, total === 0 ? 0 : row[index] / total];
    }),
  ) as Record<LabelId, number>;

  const perClassCount = countPerClass(trainingSamples);

  return {
    accuracy: testSamples.length === 0 ? 0 : correct / testSamples.length,
    trainAccuracy: labelledTraining.length === 0 ? 0 : trainCorrect / labelledTraining.length,
    perClassAccuracy,
    perClassCount,
    confusion,
    imbalance: computeImbalance(perClassCount),
    averageConfidence: testSamples.length === 0 ? 0 : confidenceSum / testSamples.length,
    testSampleCount: testSamples.length,
  };
}
