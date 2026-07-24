// lib/baselines/lector.ts
// LECTOR baseline — LEarner-Contextual Optimal Review.
// Compact reference implementation used as CARTS's context-aware baseline (paper Sec 2.3).
//
// LECTOR: fixed retrieval type, but chooses next context c* by cosine-distance
// coverage over the pool. Combines an HLR-style interval with a
// "contextual novelty bonus" that dampens intervals when the word has only
// been seen in similar contexts.

import { cosineDist } from "../contextDiversity";
import { calculateNextReviewHlr } from "./hlr";
import { DartWeights, DEFAULT_DART_WEIGHTS } from "../dart";

export interface LectorInputs {
  featureVector: number[];
  quality: number;
  seenEmbeddings: number[][];    // contexts already shown
  poolEmbeddings: number[][];    // candidate contexts (>=1)
  weights?: DartWeights;
  tau?: number;
}

export interface LectorSchedule {
  intervalDays: number;
  halfLife: number;
  nextReviewDate: Date;
  contextIndex: number;          // argmax over pool
  contextCoverage: number;       // ∈ [0, 1] — 1 means highly novel
}

function coverage(chosen: number[], seen: number[][]): number {
  if (!seen.length) return 1;
  let minDist = Infinity;
  for (const s of seen) minDist = Math.min(minDist, cosineDist(chosen, s));
  return Math.max(0, Math.min(1, minDist));
}

export function lectorSchedule(input: LectorInputs): LectorSchedule {
  const weights = input.weights ?? DEFAULT_DART_WEIGHTS;
  const tau = input.tau ?? 0.9;

  // 1. HLR-style interval (no difficulty modulation).
  const hlr = calculateNextReviewHlr(
    { featureVector: input.featureVector, quality: input.quality },
    weights,
    tau,
  );

  // 2. Pick the pool item that maximises novelty (min cosine-distance).
  let bestIdx = 0;
  let bestCov = -Infinity;
  input.poolEmbeddings.forEach((emb, idx) => {
    const cov = coverage(emb, input.seenEmbeddings);
    if (cov > bestCov) { bestCov = cov; bestIdx = idx; }
  });

  // 3. Damp the interval when novelty is low (already seen similar contexts).
  const damp = 0.5 + 0.5 * bestCov;                // ∈ [0.5, 1]
  const interval = Math.max(1, Math.round(hlr.interval * damp));
  const nextReviewDate = new Date();
  nextReviewDate.setDate(nextReviewDate.getDate() + interval);

  return {
    intervalDays: interval,
    halfLife: hlr.halfLife,
    nextReviewDate,
    contextIndex: bestIdx,
    contextCoverage: Math.max(0, bestCov),
  };
}
