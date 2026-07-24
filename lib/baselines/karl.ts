// lib/baselines/karl.ts
// KARL baseline — Knowledge-Aware Retention Learning.
// Simplified reference implementation for the ablation study.
// Idea: interval grows with (1 + priorAccuracy) and shrinks with wordDifficulty,
// gated by a logistic on the last-response outcome.
//
// This is intentionally NOT the full KARL paper (which uses a neural retention
// predictor); it's the compact, comparable variant reported in adjacent SRS
// benchmarks and used here for RQ2.

export interface KarlState {
  intervalDays: number;
  successStreak: number;
}

export interface KarlInputs {
  cefr?: number;             // 0..5
  wordFrequency?: number;    // rough corpus rank; higher = easier
  userAvgAccuracy?: number;  // 0..1
  quality: number;           // 0..5
  currentInterval?: number;  // days
  currentStreak?: number;
}

const sigma = (z: number) => 1 / (1 + Math.exp(-z));

export function karlNext(input: KarlInputs): KarlState & { nextReviewDate: Date } {
  const cefr = (input.cefr ?? 2) / 5;
  const freq = Math.log(1 + (input.wordFrequency ?? 1000)) / Math.log(1e6);
  const acc = input.userAvgAccuracy ?? 0.5;
  const q = input.quality;
  const streak = input.currentStreak ?? 0;
  const cur = input.currentInterval ?? 1;

  // Retention gate — logistic in (q, acc); words the learner tends to get right
  // and answered well this round grow fastest.
  const gate = sigma(1.5 * (q - 3) + 1.2 * (acc - 0.5) - 0.8 * cefr + 0.5 * freq);

  // Interval update: multiplicative when passed, reset when failed.
  const success = q >= 3;
  const growth = 1 + 1.6 * gate;             // ∈ (1, 2.6)
  const next = success ? Math.max(1, cur * growth) : Math.max(1, cur * 0.3);

  const nextReviewDate = new Date();
  nextReviewDate.setDate(nextReviewDate.getDate() + Math.round(next));
  return {
    intervalDays: Math.round(next),
    successStreak: success ? streak + 1 : 0,
    nextReviewDate,
  };
}
