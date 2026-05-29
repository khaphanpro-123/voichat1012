// lib/spacedRepetition.ts
// Advanced Spaced Repetition System with DART (Difficulty-Aware Retrieval-Type) Algorithm

export interface SRSData {
  easeFactor: number;
  interval: number;
  repetitions: number;
  nextReviewDate: Date;
}

// DART Algorithm Interfaces
export interface DARTFeatures {
  timesReviewed: number;
  successRate: number;
  daysSinceFirstSeen: number;
  averageResponseTime: number;
  consecutiveCorrect: number;
  wordFrequency: number; // Log frequency in corpus
}

export interface DARTParameters {
  theta: number[]; // HLR base parameters
  alpha: number;   // Difficulty modulation coefficient (≥ 0)
}

export interface InteractionLog {
  wordId: string;
  timestamp: Date;
  difficulty: RetrievalDifficulty;
  isCorrect: boolean;
  responseTime: number;
  context: string;
  features: DARTFeatures;
}

export enum RetrievalDifficulty {
  RECOGNITION_MCQ = 0,    // Multiple choice recognition
  CLOZE_FILL = 1,         // Fill in the blank
  CONSTRAINED_GENERATION = 2, // Sentence completion
  OPEN_PARAPHRASE = 3     // Free-form paraphrasing
}

export interface MemoryState {
  halfLife: number;        // Memory half-life in days
  stability: number;       // Current memory stability
  retrievability: number;  // P(recall) at current time
  lastDifficulty: RetrievalDifficulty;
}

/**
 * DART Algorithm Implementation
 * Difficulty-Aware Retrieval-Type baseline extending Half-Life Regression
 */
export class DARTScheduler {
  private parameters: DARTParameters;
  private readonly TARGET_RECALL_RATE = 0.9;
  private readonly DIFFICULTY_THRESHOLDS = {
    low: 2.0,    // θ_low - switch to cloze
    mid: 7.0,    // θ_mid - switch to generation  
    high: 21.0   // θ_high - switch to paraphrase
  };

  constructor(parameters?: DARTParameters) {
    // Initialize with default parameters if not provided
    this.parameters = parameters || {
      theta: [0.5, 0.3, 0.2, 0.1, 0.1, 0.05], // Default HLR weights
      alpha: 0.15 // Default difficulty modulation
    };
  }

  /**
   * Calculate base half-life using HLR formula: h₀ = 2^(θᵀx)
   */
  private calculateBaseHalfLife(features: DARTFeatures): number {
    const x = this.featuresToVector(features);
    const dotProduct = this.parameters.theta.reduce((sum, theta_i, i) => 
      sum + theta_i * (x[i] || 0), 0
    );
    return Math.pow(2, dotProduct);
  }

  /**
   * Convert features to numerical vector for HLR
   */
  private featuresToVector(features: DARTFeatures): number[] {
    return [
      Math.log(features.timesReviewed + 1),
      features.successRate,
      Math.log(features.daysSinceFirstSeen + 1),
      Math.log(features.averageResponseTime + 1),
      Math.log(features.consecutiveCorrect + 1),
      features.wordFrequency
    ];
  }

  /**
   * Calculate difficulty-modulated half-life: h = h₀ × exp(α × φ(d))
   * where φ(d) = d/3 normalizes difficulty to [0, 1]
   */
  calculateDifficultyAwareHalfLife(
    features: DARTFeatures, 
    difficulty: RetrievalDifficulty
  ): number {
    const baseHalfLife = this.calculateBaseHalfLife(features);
    const normalizedDifficulty = difficulty / 3.0; // φ(d) = d/3
    const difficultyModulation = Math.exp(this.parameters.alpha * normalizedDifficulty);
    
    return baseHalfLife * difficultyModulation;
  }

  /**
   * Calculate recall probability: p = 2^(-Δ/h)
   */
  calculateRecallProbability(
    daysSinceLastReview: number, 
    halfLife: number
  ): number {
    return Math.pow(2, -daysSinceLastReview / halfLife);
  }

  /**
   * Determine optimal next review interval to achieve target recall rate
   */
  calculateOptimalInterval(halfLife: number): number {
    // t_next = h × log₂(1/τ) where τ = 0.9
    return Math.ceil(halfLife * Math.log2(1 / this.TARGET_RECALL_RATE));
  }

  /**
   * Adaptive scaffolding: select retrieval difficulty based on memory stability
   */
  selectRetrievalDifficulty(halfLife: number): RetrievalDifficulty {
    if (halfLife < this.DIFFICULTY_THRESHOLDS.low) {
      return RetrievalDifficulty.RECOGNITION_MCQ;
    } else if (halfLife < this.DIFFICULTY_THRESHOLDS.mid) {
      return RetrievalDifficulty.CLOZE_FILL;
    } else if (halfLife < this.DIFFICULTY_THRESHOLDS.high) {
      return RetrievalDifficulty.CONSTRAINED_GENERATION;
    } else {
      return RetrievalDifficulty.OPEN_PARAPHRASE;
    }
  }

  /**
   * Main scheduling function - returns next review timing and format
   */
  scheduleNextReview(
    features: DARTFeatures,
    lastDifficulty: RetrievalDifficulty
  ): {
    interval: number;
    difficulty: RetrievalDifficulty;
    halfLife: number;
    recallProbability: number;
  } {
    const halfLife = this.calculateDifficultyAwareHalfLife(features, lastDifficulty);
    const interval = this.calculateOptimalInterval(halfLife);
    const difficulty = this.selectRetrievalDifficulty(halfLife);
    const recallProbability = this.calculateRecallProbability(0, halfLife); // Current recall prob
    
    return {
      interval,
      difficulty,
      halfLife,
      recallProbability
    };
  }

  /**
   * Update parameters using gradient descent (simplified version)
   * In full implementation, this would use regularized loss minimization
   */
  updateParameters(trainingData: InteractionLog[]): void {
    // Placeholder for parameter optimization
    // Full implementation would include:
    // 1. Binary cross-entropy loss calculation
    // 2. L2 regularization
    // 3. Projected gradient descent with α ≥ 0 constraint
    console.log(`Training on ${trainingData.length} interactions`);
  }
}

/**
 * Legacy SM-2 Algorithm (kept for baseline comparison)
 */
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

/**
 * Utility Functions for Research Data Collection
 */
export function createInteractionLog(
  wordId: string,
  difficulty: RetrievalDifficulty,
  isCorrect: boolean,
  responseTime: number,
  context: string,
  features: DARTFeatures
): InteractionLog {
  return {
    wordId,
    timestamp: new Date(),
    difficulty,
    isCorrect,
    responseTime,
    context,
    features
  };
}

export function calculateFeatures(
  wordHistory: InteractionLog[],
  wordFrequency: number = 0
): DARTFeatures {
  if (wordHistory.length === 0) {
    return {
      timesReviewed: 0,
      successRate: 0,
      daysSinceFirstSeen: 0,
      averageResponseTime: 5000, // Default 5 seconds
      consecutiveCorrect: 0,
      wordFrequency
    };
  }

  const timesReviewed = wordHistory.length;
  const correctCount = wordHistory.filter(log => log.isCorrect).length;
  const successRate = correctCount / timesReviewed;
  
  const firstSeen = wordHistory[0].timestamp;
  const daysSinceFirstSeen = Math.floor(
    (Date.now() - firstSeen.getTime()) / (1000 * 60 * 60 * 24)
  );
  
  const totalResponseTime = wordHistory.reduce((sum, log) => sum + log.responseTime, 0);
  const averageResponseTime = totalResponseTime / timesReviewed;
  
  // Calculate consecutive correct from the end
  let consecutiveCorrect = 0;
  for (let i = wordHistory.length - 1; i >= 0; i--) {
    if (wordHistory[i].isCorrect) {
      consecutiveCorrect++;
    } else {
      break;
    }
  }

  return {
    timesReviewed,
    successRate,
    daysSinceFirstSeen,
    averageResponseTime,
    consecutiveCorrect,
    wordFrequency
  };
}
/**
 * Enhanced Vocabulary Management with DART Integration
 */
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
  // Enhanced criteria using DART principles
  return (
    vocab.timesReviewed >= 5 &&
    vocab.timesCorrect / vocab.timesReviewed > 0.8 &&
    vocab.interval >= 30 &&
    vocab.repetitions >= 3 &&
    vocab.lastDifficulty >= RetrievalDifficulty.CONSTRAINED_GENERATION // Must succeed at higher difficulties
  );
}

/**
 * Research Data Export Functions
 */
export function exportInteractionLogs(logs: InteractionLog[]): string {
  return JSON.stringify(logs, null, 2);
}

export function importInteractionLogs(jsonData: string): InteractionLog[] {
  return JSON.parse(jsonData);
}