// lib/baselines/hlr.ts
// Half-Life Regression (HLR) baseline — Settles & Meeder (ACL 2016).
// Paper Sec 2.3 lists HLR as one of the 5 baselines against CARTS.
// This is DART with α = 0 (no difficulty modulation), so we reuse lib/dart.

import { DartWeights, DEFAULT_DART_WEIGHTS, dartSchedule, RetrievalType } from "../dart";

export interface HlrSchedule {
  halfLife: number;
  intervalDays: number;
  predictedRecall: number;
}

export function hlrSchedule(
  weights: DartWeights,
  featureVector: number[],
  tau = 0.9,
): HlrSchedule {
  // Force α=0 so exp(α·φ(d)) = 1 regardless of d.
  const noDifficulty: DartWeights = { ...weights, alpha: 0 };
  const s = dartSchedule(noDifficulty, featureVector, 0 as RetrievalType, tau);
  return { halfLife: s.halfLife, intervalDays: s.intervalDays, predictedRecall: s.predictedRecall };
}

/** Convenience wrapper matching the calculateNextReview* signature. */
export function calculateNextReviewHlr(
  input: { featureVector?: number[]; quality: number },
  weights: DartWeights = DEFAULT_DART_WEIGHTS,
  tau = 0.9,
) {
  const x = input.featureVector && input.featureVector.length ? input.featureVector : [1, 0.4, 0.5, 0.5, 0];
  const s = hlrSchedule(weights, x, tau);
  const recall = input.quality >= 3 ? 1 : 0;
  const interval = recall ? s.intervalDays : Math.max(1, s.intervalDays * 0.3);
  const nextReviewDate = new Date();
  nextReviewDate.setDate(nextReviewDate.getDate() + Math.round(interval));
  return {
    easeFactor: 2.5,
    interval: Math.round(interval),
    repetitions: recall ? 1 : 0,
    nextReviewDate,
    halfLife: s.halfLife,
    predictedRecall: s.predictedRecall,
  };
}
