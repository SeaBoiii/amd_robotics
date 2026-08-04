/**
 * AI Lab state: the dataset, the trained model, training progress and the
 * Responsible-AI confidence policy.
 */

import { create } from 'zustand';
import type { AIModel, ConfidencePolicy, LabelId, TrainingProgress, TrainingSample } from '@/types';
import { collectSamples, createStarterDataset, createTestDataset } from '@/ai/datasets/generator';
import { analyseBalance, countPerClass, findMisclassifications } from '@/ai/metrics/evaluate';
import { instantTrain, trainModel } from '@/ai/training/trainer';
import { persisted } from './persisted';

interface AIState {
  samples: TrainingSample[];
  model: AIModel | null;
  training: boolean;
  progress: TrainingProgress | null;
  error: string | null;
  confidencePolicy: ConfidencePolicy;

  labelSample(sampleId: string, label: LabelId | null): void;
  labelAll(label: LabelId): void;
  collect(label: LabelId, count: number): void;
  removeSample(sampleId: string): void;
  resetDataset(): void;

  train(): Promise<boolean>;
  runInstantTraining(): Promise<boolean>;
  clearModel(): void;
  setConfidencePolicy(policy: Partial<ConfidencePolicy>): void;
  clearError(): void;
}

const DEFAULT_POLICY: ConfidencePolicy = { actAbove: 0.8, verifyAbove: 0.5 };

export const useAIStore = create<AIState>()(
  persisted(
    (set, get) => ({
      samples: createStarterDataset(),
      model: null,
      training: false,
      progress: null,
      error: null,
      confidencePolicy: DEFAULT_POLICY,

      labelSample: (sampleId, label) =>
        set((state) => ({
          samples: state.samples.map((sample) =>
            sample.id === sampleId ? { ...sample, label } : sample,
          ),
        })),

      labelAll: (label) =>
        set((state) => ({
          samples: state.samples.map((sample) =>
            sample.label === null ? { ...sample, label } : sample,
          ),
        })),

      collect: (label, count) =>
        set((state) => ({
          samples: [...state.samples, ...collectSamples(label, count, Date.now() % 2147483647)],
        })),

      removeSample: (sampleId) =>
        set((state) => ({ samples: state.samples.filter((sample) => sample.id !== sampleId) })),

      resetDataset: () => set({ samples: createStarterDataset(), model: null, error: null }),

      train: async () => {
        set({ training: true, error: null, progress: null });
        const outcome = await trainModel({
          samples: get().samples,
          previousVersion: get().model?.version ?? 0,
          onProgress: (progress) => set({ progress }),
        });
        set({ training: false, model: outcome.model ?? get().model, error: outcome.error });
        return outcome.ok;
      },

      runInstantTraining: async () => {
        set({ training: true, error: null, progress: null });
        const outcome = await instantTrain(get().model?.version ?? 0);
        set({ training: false, model: outcome.model ?? get().model, error: outcome.error });
        return outcome.ok;
      },

      clearModel: () => set({ model: null, progress: null, error: null }),

      setConfidencePolicy: (policy) =>
        set((state) => {
          const next = { ...state.confidencePolicy, ...policy };
          // Keep the two thresholds in a sane order so the bands never invert.
          if (next.verifyAbove >= next.actAbove) {
            next.verifyAbove = Math.max(0.05, next.actAbove - 0.05);
          }
          return { confidencePolicy: next };
        }),

      clearError: () => set({ error: null }),
    }),
    {
      key: 'ai',
      partialize: ({ samples, model, confidencePolicy }) => ({ samples, model, confidencePolicy }),
    },
  ),
);

// ------------------------------------------------------------ derivations
//
// These build fresh arrays every call, so they must NOT be handed to
// `useAIStore` as selectors: Zustand compares snapshots with `Object.is`, and a
// new array on every render is an infinite update loop. Subscribe to `samples`
// or `model` and memoise these in the component instead.

export const perClassCounts = (samples: TrainingSample[]) => countPerClass(samples);

export const balanceWarnings = (samples: TrainingSample[]) => analyseBalance(countPerClass(samples));

export const unlabelledCount = (samples: TrainingSample[]) =>
  samples.filter((sample) => sample.label === null).length;

/** Held-out mistakes, so students review errors on data the model never saw. */
export function misclassifications(model: AIModel | null) {
  if (!model) return [];
  return findMisclassifications(model.weights, createTestDataset()).slice(0, 12);
}
