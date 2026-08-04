/**
 * AI / machine-learning contracts.
 *
 * The MVP ships a small pure-JavaScript classifier, but every consumer talks to
 * the `Classifier` interface only. A TensorFlow.js implementation can replace it
 * without touching the AI Lab UI or the rule engine.
 */

/** The five categories the rover's vision model learns to recognise. */
export type LabelId = 'clear_path' | 'obstacle' | 'person_target' | 'hazard_zone' | 'supply_station';

export const LABELS: LabelId[] = [
  'clear_path',
  'obstacle',
  'person_target',
  'hazard_zone',
  'supply_station',
];

export interface LabelInfo {
  id: LabelId;
  name: string;
  description: string;
  colour: string;
  /** Shape token used by the colour-blind-friendly indicators. */
  shape: 'circle' | 'square' | 'triangle' | 'diamond' | 'hexagon';
  icon: string;
}

/**
 * One training example. `features` is a fixed-length numeric vector describing a
 * simulated camera snapshot (brightness, edges, colour channels, texture…), and
 * `pattern` is the small visual tile students actually look at while labelling.
 */
export interface TrainingSample {
  id: string;
  features: number[];
  /** The label a student assigned. `null` means "not labelled yet". */
  label: LabelId | null;
  /** The label the environment actually generated it from, for grading only. */
  trueLabel: LabelId;
  /** 8x8 greyscale-plus-hue preview grid used to render the sample thumbnail. */
  pattern: number[];
  /** Where the sample came from — affects how students reason about the data. */
  source: 'starter' | 'collected' | 'generated';
  /** Lighting condition, used to teach that data quality affects confidence. */
  lighting: 'bright' | 'normal' | 'dim';
  timestamp: number;
}

export interface Prediction {
  label: LabelId;
  confidence: number;
  scores: Record<LabelId, number>;
  timestamp: number;
}

export interface TrainingProgress {
  epoch: number;
  totalEpochs: number;
  loss: number;
  accuracy: number;
}

export interface TrainingOptions {
  epochs: number;
  learningRate: number;
  /** Seed so that classroom training runs are reproducible. */
  seed: number;
  onProgress?: (progress: TrainingProgress) => void;
}

export interface ModelWeights {
  /** [numLabels][numFeatures] */
  weights: number[][];
  bias: number[];
  featureCount: number;
  labels: LabelId[];
  /** Per-feature mean/std used to normalise inputs. */
  featureMean: number[];
  featureStd: number[];
}

export interface ConfusionMatrix {
  labels: LabelId[];
  /** counts[actualIndex][predictedIndex] */
  counts: number[][];
}

export interface ModelMetrics {
  accuracy: number;
  trainAccuracy: number;
  perClassAccuracy: Record<LabelId, number>;
  perClassCount: Record<LabelId, number>;
  confusion: ConfusionMatrix;
  /** 0 = perfectly balanced, 1 = every sample is one class. */
  imbalance: number;
  averageConfidence: number;
  testSampleCount: number;
}

export interface AIModel {
  id: string;
  version: number;
  createdAt: number;
  weights: ModelWeights;
  metrics: ModelMetrics;
  /** True when produced by Instant Training Mode rather than student training. */
  instant: boolean;
  trainingSampleCount: number;
}

export interface Classifier {
  train(samples: TrainingSample[], options: TrainingOptions): Promise<ModelWeights>;
  predict(weights: ModelWeights, features: number[]): Prediction;
}

/**
 * The Responsible-AI policy students configure. Predictions above `actAbove`
 * are trusted; between `verifyAbove` and `actAbove` the rover slows down and
 * double-checks; below `verifyAbove` it stops and asks a human.
 */
export interface ConfidencePolicy {
  actAbove: number;
  verifyAbove: number;
}
