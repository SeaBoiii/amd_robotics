/**
 * The training service the AI Lab talks to.
 *
 * Also home of **Instant Training Mode**: a one-click path that generates a
 * balanced dataset and trains a working model in a fraction of a second. It
 * exists because a workshop that runs out of time still needs every team to
 * reach the mission, and because a demo must never depend on live training
 * succeeding in front of an audience.
 */

import type { AIModel, TrainingProgress, TrainingSample } from '@/types';
import { createId } from '@/utils/format';
import { classifier, TrainingError } from '../classifier/logisticRegression';
import { createTestDataset, generateSamples } from '../datasets/generator';
import { evaluate } from '../metrics/evaluate';

export const DEFAULT_EPOCHS = 220;
export const DEFAULT_LEARNING_RATE = 0.6;

export interface TrainRequest {
  samples: TrainingSample[];
  epochs?: number;
  learningRate?: number;
  seed?: number;
  previousVersion?: number;
  onProgress?: (progress: TrainingProgress) => void;
}

export interface TrainOutcome {
  ok: boolean;
  model: AIModel | null;
  error: string | null;
}

async function buildModel(
  samples: TrainingSample[],
  request: Required<Pick<TrainRequest, 'epochs' | 'learningRate' | 'seed'>>,
  instant: boolean,
  previousVersion: number,
  onProgress?: (progress: TrainingProgress) => void,
): Promise<AIModel> {
  const weights = await classifier.train(samples, {
    epochs: request.epochs,
    learningRate: request.learningRate,
    seed: request.seed,
    onProgress,
  });

  const testSet = createTestDataset();
  const metrics = evaluate(weights, samples, testSet);

  return {
    id: createId('model'),
    version: previousVersion + 1,
    createdAt: Date.now(),
    weights,
    metrics,
    instant,
    trainingSampleCount: samples.filter((sample) => sample.label !== null).length,
  };
}

export async function trainModel(request: TrainRequest): Promise<TrainOutcome> {
  try {
    const model = await buildModel(
      request.samples,
      {
        epochs: request.epochs ?? DEFAULT_EPOCHS,
        learningRate: request.learningRate ?? DEFAULT_LEARNING_RATE,
        seed: request.seed ?? 12345,
      },
      false,
      request.previousVersion ?? 0,
      request.onProgress,
    );
    return { ok: true, model, error: null };
  } catch (error) {
    const message =
      error instanceof TrainingError
        ? error.message
        : 'Training could not finish. Try Instant Training Mode, or reset the data and start again.';
    console.error('[ai] Training failed', error);
    return { ok: false, model: null, error: message };
  }
}

/**
 * Instant Training Mode — a balanced, deterministic dataset plus a short
 * training run. Always labelled clearly in the UI so students know they skipped
 * the data-collection step rather than being told the model appeared by magic.
 */
export async function instantTrain(previousVersion = 0): Promise<TrainOutcome> {
  const samples = generateSamples({
    counts: {
      clear_path: 20,
      obstacle: 20,
      person_target: 20,
      hazard_zone: 20,
      supply_station: 20,
    },
    seed: 987654,
    source: 'generated',
    preLabelled: true,
    idPrefix: 'instant',
  });

  try {
    const model = await buildModel(
      samples,
      { epochs: 260, learningRate: 0.7, seed: 4242 },
      true,
      previousVersion,
    );
    return { ok: true, model, error: null };
  } catch (error) {
    console.error('[ai] Instant training failed', error);
    return {
      ok: false,
      model: null,
      error: 'Instant training failed unexpectedly. Please reload the page.',
    };
  }
}
