// lib/spacedRepetition.ts
// Spaced Repetition System (SRS) implementation.
// - SM-2 remains as the default fallback (backward compatible).
// - DART (Algorithm 2, x.pdf) is exposed via calculateNextReviewDart() and is used
//   whenever a vocabulary item has scheduler='dart' or trained weights are available.

import {
  DartWeights,
  DEFAULT_DART_WEIGHTS,
  dartSchedule,
  RetrievalType,
  buildFeatureVector,
} from "./dart";

export interface SRSData {
  easeFactor: number;
  interval: number;
  repetitions: number;
  nextReviewDate: Date;
}

export function calculateNextReview(
  currentSRS: SRSData,
  quality: number // 0-5 (0=complete blackout, 5=perfect response)
): SRSData {
  let { easeFactor, interval, repetitions } = currentSRS;

  // Update ease factor
  easeFactor = Math.max(1.3, easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)));

  if (quality < 3) {
    // Incorrect response - reset repetitions
    repetitions = 0;
    interval = 1;
  } else {
    // Correct response
    repetitions += 1;
    
    if (repetitions === 1) {
      interval = 1;
    } else if (repetitions === 2) {
      interval = 6;
    } else {
      interval = Math.round(interval * easeFactor);
    }
  }

  // Calculate next review date
  const nextReviewDate = new Date();
  nextReviewDate.setDate(nextReviewDate.getDate() + interval);

  return {
    easeFactor,
    interval,
    repetitions,
    nextReviewDate
  };
}

export function getDueVocabularies(vocabularies: any[]): any[] {
  const now = new Date();
  return vocabularies.filter(vocab => 
    new Date(vocab.nextReviewDate) <= now && !vocab.isLearned
  );
}

export function getReviewPriority(vocab: any): number {
  const daysSinceLastReview = vocab.lastReviewedAt 
    ? Math.floor((Date.now() - new Date(vocab.lastReviewedAt).getTime()) / (1000 * 60 * 60 * 24))
    : 999;
  
  const successRate = vocab.timesReviewed > 0 
    ? vocab.timesCorrect / vocab.timesReviewed 
    : 0;
  
  // Higher priority for words that are due and have low success rate
  return daysSinceLastReview * (1 - successRate) * 100;
}

/**
 * DART-based scheduler (Algorithm 2 in x.pdf).
 * Drop-in replacement for calculateNextReview when scheduler='dart'.
 * The 0-5 quality is mapped to recall r ∈ {0,1} (r=1 iff quality>=3).
 */
export function calculateNextReviewDart(
  input: {
    featureVector?: number[];
    lastRetrievalType?: RetrievalType;
    quality: number;
  },
  weights: DartWeights = DEFAULT_DART_WEIGHTS,
  tau = 0.9
): SRSData & {
  halfLife: number;
  nextRetrievalType: RetrievalType;
  predictedRecall: number;
} {
  const x = input.featureVector && input.featureVector.length
    ? input.featureVector
    : buildFeatureVector({});
  const dPrev = (input.lastRetrievalType ?? 0) as RetrievalType;

  const sched = dartSchedule(weights, x, dPrev, tau);

  // Punish failure: halve the interval so wrong answers come back sooner.
  const recall = input.quality >= 3 ? 1 : 0;
  const interval = recall ? sched.intervalDays : Math.max(1, sched.intervalDays * 0.3);

  const nextReviewDate = new Date();
  nextReviewDate.setDate(nextReviewDate.getDate() + Math.round(interval));

  return {
    easeFactor: 2.5, // legacy field kept for compatibility
    interval: Math.round(interval),
    repetitions: recall ? 1 : 0,
    nextReviewDate,
    halfLife: sched.halfLife,
    nextRetrievalType: sched.nextRetrievalType,
    predictedRecall: sched.predictedRecall,
  };
}

export function shouldPromoteToLearned(vocab: any): boolean {
  // Consider a word "learned" if:
  // - Reviewed at least 5 times
  // - Success rate > 80%
  // - Last 3 reviews were correct
  // - Interval is at least 30 days
  
  return (
    vocab.timesReviewed >= 5 &&
    vocab.timesCorrect / vocab.timesReviewed > 0.8 &&
    vocab.interval >= 30 &&
    vocab.repetitions >= 3
  );
}