// lib/spacedRepetition.ts
// Spaced Repetition System (SRS) implementation

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