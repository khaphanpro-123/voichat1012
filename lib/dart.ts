// lib/dart.ts
// DART: Difficulty-Aware Half-Life Regression
// Implements Algorithm 1 (training-time formulas) and Algorithm 2 (inference)
// from x.pdf.
//
// Notation matches the paper:
//   h0 = 2^(θ⊤x)
//   h  = h0 · exp(α · φ(d))
//   p̂ = 2^(-Δ / h)
//   t_next = h · log2(1/τ)
//
// The training loop itself runs offline in Python (see python-api/train_dart.py).
// This TS file is used for inference inside Next.js API routes.

export type RetrievalType = 0 | 1 | 2 | 3;

export interface DartWeights {
  theta: number[]; // length F
  alpha: number;   // >= 0
  featureNames?: string[];
  thresholds?: { low: number; mid: number; high: number };
}

// φ(d): difficulty embedding. Monotone-increasing so exp(α·φ(d)) grows with d.
export const PHI: Record<RetrievalType, number> = {
  0: 0.0,   // recognition MCQ — easiest
  1: 0.33,  // cloze completion
  2: 0.66,  // constrained generation
  3: 1.0,   // open paraphrase — hardest
};

// Server-side fallback weights (used until train_dart.py has produced real ones).
// Feature order: [bias, cefr, wordFreqLog, userAvgAcc, timesReviewedLog].
export const DEFAULT_DART_WEIGHTS: DartWeights = {
  theta: [1.2, -0.4, 0.3, 0.8, 0.5],
  alpha: 0.35,
  featureNames: ["bias", "cefr", "wordFreqLog", "userAvgAcc", "timesReviewedLog"],
  thresholds: { low: 2, mid: 7, high: 30 },
};

function dot(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length);
  let s = 0;
  for (let i = 0; i < n; i++) s += a[i] * b[i];
  return s;
}

/** Base half-life h0 = 2^(θ⊤x) — Alg 1 line 6 / Alg 2 line 1. */
export function baseHalfLife(theta: number[], x: number[]): number {
  return Math.pow(2, dot(theta, x));
}

/** Full half-life h = h0 · exp(α · φ(d)) — Alg 1 line 7 / Alg 2 line 2. */
export function halfLife(
  theta: number[],
  alpha: number,
  x: number[],
  dPrev: RetrievalType
): number {
  return baseHalfLife(theta, x) * Math.exp(alpha * PHI[dPrev]);
}

/** Recall probability p̂ = 2^(-Δ/h) — Alg 1 line 8. */
export function predictRecall(h: number, deltaDays: number): number {
  if (h <= 0) return 0;
  return Math.pow(2, -deltaDays / h);
}

/** Weighted binary cross-entropy loss — Alg 1 line 9. Used only for eval on server. */
export function bceLoss(pHat: number, r: 0 | 1): number {
  const eps = 1e-9;
  const p = Math.min(Math.max(pHat, eps), 1 - eps);
  return -(r * Math.log(p) + (1 - r) * Math.log(1 - p));
}

/** Rule-based next retrieval type — Alg 2 lines 4-11. */
export function selectNextRetrievalType(
  h: number,
  thresholds = DEFAULT_DART_WEIGHTS.thresholds!
): RetrievalType {
  if (h < thresholds.low) return 0;
  if (h < thresholds.mid) return 1;
  if (h < thresholds.high) return 2;
  return 3;
}

export interface DartSchedule {
  halfLife: number;         // h
  intervalDays: number;     // t_next
  nextRetrievalType: RetrievalType;
  predictedRecall: number;  // p̂ at t_next (should ≈ τ)
}

/**
 * Alg 2 inference: returns everything the review scheduler needs.
 * @param tau target recall probability (default 0.9 from paper)
 */
export function dartSchedule(
  weights: DartWeights,
  featureVector: number[],
  lastRetrievalType: RetrievalType,
  tau = 0.9
): DartSchedule {
  const h = halfLife(weights.theta, weights.alpha, featureVector, lastRetrievalType);
  const tNext = h * Math.log2(1 / tau);
  const dNext = selectNextRetrievalType(h, weights.thresholds);
  return {
    halfLife: h,
    intervalDays: Math.max(1, tNext),
    nextRetrievalType: dNext,
    predictedRecall: predictRecall(h, tNext),
  };
}

/**
 * Build learner feature vector x consistent with DEFAULT_DART_WEIGHTS.featureNames.
 * CEFR: A1=0..C2=5. Missing values fall back to 0 (bias term stays 1).
 */
export function buildFeatureVector(input: {
  cefr?: number;
  wordFrequency?: number;
  userAverageAccuracy?: number;
  timesReviewed?: number;
}): number[] {
  const cefr = (input.cefr ?? 2) / 5;
  const wordFreq = input.wordFrequency ?? 1;
  const wordFreqLog = Math.log(1 + wordFreq) / Math.log(1e6);
  const acc = Math.min(Math.max(input.userAverageAccuracy ?? 0.5, 0), 1);
  const reviewed = Math.log(1 + (input.timesReviewed ?? 0)) / Math.log(50);
  return [1, cefr, wordFreqLog, acc, reviewed];
}
