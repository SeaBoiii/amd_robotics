/**
 * A small multinomial logistic-regression classifier written in plain
 * JavaScript.
 *
 * Why not TensorFlow.js for the MVP?
 *  - It downloads several megabytes, which fails on locked-down school Wi-Fi.
 *  - It needs WebGL, which is unreliable on old classroom laptops.
 *  - Training here finishes in well under a second, so the lesson keeps moving.
 *
 * This is a genuine trained model — real gradient descent on real features, not
 * a lookup table dressed up as AI. Everything students see (loss going down,
 * accuracy going up, confidence, confusion between look-alike classes) is a
 * true consequence of the maths. `Classifier` is an interface, so a
 * TensorFlow.js implementation can be swapped in without UI changes.
 */

import type {
  Classifier,
  LabelId,
  ModelWeights,
  Prediction,
  TrainingOptions,
  TrainingSample,
} from '@/types';
import { LABELS } from '@/types';
import { createRng } from '@/utils/rng';
import { FEATURE_COUNT } from '../labels';

export class TrainingError extends Error {}

function softmax(logits: number[]): number[] {
  const max = Math.max(...logits);
  const exps = logits.map((value) => Math.exp(value - max));
  const sum = exps.reduce((total, value) => total + value, 0) || 1;
  return exps.map((value) => value / sum);
}

/** Computes per-feature mean and standard deviation for input normalisation. */
function computeNormalisation(samples: TrainingSample[], featureCount: number) {
  const mean = new Array(featureCount).fill(0);
  const std = new Array(featureCount).fill(0);

  for (const sample of samples) {
    for (let f = 0; f < featureCount; f++) mean[f] += sample.features[f];
  }
  for (let f = 0; f < featureCount; f++) mean[f] /= samples.length;

  for (const sample of samples) {
    for (let f = 0; f < featureCount; f++) {
      const diff = sample.features[f] - mean[f];
      std[f] += diff * diff;
    }
  }
  for (let f = 0; f < featureCount; f++) {
    std[f] = Math.sqrt(std[f] / samples.length) || 1;
  }

  return { mean, std };
}

function normalise(features: number[], mean: number[], std: number[]): number[] {
  return features.map((value, index) => (value - mean[index]) / std[index]);
}

export class LogisticRegressionClassifier implements Classifier {
  async train(samples: TrainingSample[], options: TrainingOptions): Promise<ModelWeights> {
    const labelled = samples.filter(
      (sample): sample is TrainingSample & { label: LabelId } => sample.label !== null,
    );

    if (labelled.length < 5) {
      throw new TrainingError(
        'You need at least 5 labelled examples before the rover can learn anything.',
      );
    }

    const presentLabels = new Set(labelled.map((sample) => sample.label));
    if (presentLabels.size < 2) {
      throw new TrainingError(
        'Your data only has one label. A classifier needs at least two different labels to tell things apart.',
      );
    }

    const featureCount = FEATURE_COUNT;
    const { mean, std } = computeNormalisation(labelled, featureCount);
    const rng = createRng(options.seed);

    // Small random init keeps the classes from starting perfectly tied.
    const weights: number[][] = LABELS.map(() =>
      Array.from({ length: featureCount }, () => rng.gaussian(0, 0.01)),
    );
    const bias: number[] = LABELS.map(() => 0);

    const inputs = labelled.map((sample) => normalise(sample.features, mean, std));
    const targets = labelled.map((sample) => LABELS.indexOf(sample.label));

    // Class weighting so a rare label is not simply ignored by the optimiser.
    // Students still see the imbalance warning — this only stops the model from
    // collapsing entirely, which would make the lesson unplayable.
    const classCounts = LABELS.map(
      (_, index) => targets.filter((target) => target === index).length || 0,
    );
    const maxCount = Math.max(...classCounts, 1);
    const classWeight = classCounts.map((count) => (count > 0 ? Math.sqrt(maxCount / count) : 0));

    const n = inputs.length;
    const l2 = 0.002;
    // Hard cap: a runaway epoch count must never freeze a classroom laptop.
    const epochs = Math.min(Math.max(1, Math.floor(options.epochs)), 2000);

    for (let epoch = 1; epoch <= epochs; epoch++) {
      let loss = 0;
      let correct = 0;

      const gradW: number[][] = LABELS.map(() => new Array(featureCount).fill(0));
      const gradB: number[] = LABELS.map(() => 0);

      for (let i = 0; i < n; i++) {
        const x = inputs[i];
        const logits = LABELS.map((_, k) => {
          let sum = bias[k];
          for (let f = 0; f < featureCount; f++) sum += weights[k][f] * x[f];
          return sum;
        });
        const probs = softmax(logits);
        const target = targets[i];
        const weight = classWeight[target];

        loss -= weight * Math.log(Math.max(probs[target], 1e-9));
        if (probs.indexOf(Math.max(...probs)) === target) correct++;

        for (let k = 0; k < LABELS.length; k++) {
          const error = (probs[k] - (k === target ? 1 : 0)) * weight;
          gradB[k] += error;
          for (let f = 0; f < featureCount; f++) gradW[k][f] += error * x[f];
        }
      }

      for (let k = 0; k < LABELS.length; k++) {
        bias[k] -= (options.learningRate * gradB[k]) / n;
        for (let f = 0; f < featureCount; f++) {
          weights[k][f] -= options.learningRate * (gradW[k][f] / n + l2 * weights[k][f]);
        }
      }

      options.onProgress?.({
        epoch,
        totalEpochs: epochs,
        loss: loss / n,
        accuracy: correct / n,
      });

      // Yield to the browser occasionally so the progress bar actually paints.
      if (epoch % 25 === 0) await Promise.resolve();
    }

    if (weights.some((row) => row.some((value) => !Number.isFinite(value)))) {
      throw new TrainingError(
        'Training did not settle. Try again with a lower learning rate or more examples.',
      );
    }

    return {
      weights,
      bias,
      featureCount,
      labels: [...LABELS],
      featureMean: mean,
      featureStd: std,
    };
  }

  predict(weights: ModelWeights, features: number[]): Prediction {
    const x = normalise(features, weights.featureMean, weights.featureStd);
    const logits = weights.labels.map((_, k) => {
      let sum = weights.bias[k];
      for (let f = 0; f < weights.featureCount; f++) sum += weights.weights[k][f] * x[f];
      return sum;
    });
    const probs = softmax(logits);

    let bestIndex = 0;
    for (let i = 1; i < probs.length; i++) if (probs[i] > probs[bestIndex]) bestIndex = i;

    const scores = {} as Record<LabelId, number>;
    weights.labels.forEach((label, index) => {
      scores[label] = probs[index];
    });

    return {
      label: weights.labels[bestIndex],
      confidence: probs[bestIndex],
      scores,
      timestamp: Date.now(),
    };
  }
}

export const classifier = new LogisticRegressionClassifier();
