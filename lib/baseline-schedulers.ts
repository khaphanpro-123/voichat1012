// lib/baseline-schedulers.ts
// Baseline Spaced Repetition Algorithms for Research Comparison

import { RetrievalDifficulty, DARTFeatures, InteractionLog } from './spacedRepetition';

/**
 * Common interfaces for all schedulers
 */
export interface SchedulerResult {
  interval: number;
  difficulty: RetrievalDifficulty;
  confidence: number; // Algorithm's confidence in the scheduling decision
  metadata?: any;     // Algorithm-specific data
}

export interface BaseScheduler {
  name: string;
  scheduleReview(
    features: DARTFeatures,
    interactionHistory: InteractionLog[],
    lastDifficulty?: RetrievalDifficulty
  ): SchedulerResult;
}

/**
 * SM-2 Algorithm (Wozniak, 1990)
 * Classic spaced repetition with ease factor
 */
export class SM2Scheduler implements BaseScheduler {
  name = 'SM-2';
  private readonly initialInterval = 1;
  private readonly secondInterval = 6;
  private readonly minEaseFactor = 1.3;

  scheduleReview(
    features: DARTFeatures,
    interactionHistory: InteractionLog[]
  ): SchedulerResult {
    // Calculate current ease factor and repetition count
    let easeFactor = 2.5; // Default ease factor
    let repetitions = features.timesReviewed;
    let interval = this.initialInterval;

    if (interactionHistory.length > 0) {
      // Calculate ease factor based on performance
      const avgQuality = this.calculateAverageQuality(interactionHistory);
      easeFactor = Math.max(
        this.minEaseFactor,
        easeFactor + (0.1 - (5 - avgQuality) * (0.08 + (5 - avgQuality) * 0.02))
      );

      // Calculate interval based on SM-2 formula
      if (features.successRate < 0.6) {
        // Poor performance - reset
        repetitions = 0;
        interval = this.initialInterval;
      } else {
        if (repetitions === 1) {
          interval = this.initialInterval;
        } else if (repetitions === 2) {
          interval = this.secondInterval;
        } else {
          const lastInterval = this.getLastInterval(interactionHistory);
          interval = Math.round(lastInterval * easeFactor);
        }
      }
    }

    // SM-2 uses fixed difficulty (recognition-based)
    const difficulty = RetrievalDifficulty.RECOGNITION_MCQ;
    const confidence = Math.min(0.9, features.successRate + 0.1);

    return {
      interval,
      difficulty,
      confidence,
      metadata: {
        easeFactor,
        repetitions,
        algorithm: 'SM-2'
      }
    };
  }

  private calculateAverageQuality(history: InteractionLog[]): number {
    // Convert binary correctness to SM-2 quality scale (0-5)
    const qualities = history.map(log => log.isCorrect ? 4 : 1);
    return qualities.reduce((sum, q) => sum + q, 0) / qualities.length;
  }

  private getLastInterval(history: InteractionLog[]): number {
    if (history.length < 2) return this.initialInterval;
    
    const lastTwo = history.slice(-2);
    const timeDiff = lastTwo[1].timestamp.getTime() - lastTwo[0].timestamp.getTime();
    return Math.max(1, Math.round(timeDiff / (1000 * 60 * 60 * 24))); // Convert to days
  }
}

/**
 * Half-Life Regression (HLR) - Settles & Meeder, 2016
 * Data-driven memory modeling with exponential decay
 */
export class HLRScheduler implements BaseScheduler {
  name = 'HLR';
  private parameters: number[];
  private readonly targetRecallRate = 0.9;

  constructor(parameters?: number[]) {
    // Default HLR parameters (would be learned from data in practice)
    this.parameters = parameters || [
      0.5,   // Intercept
      0.3,   // Times reviewed coefficient
      0.2,   // Success rate coefficient  
      0.1,   // Days since first seen coefficient
      0.05,  // Response time coefficient
      0.05   // Word frequency coefficient
    ];
  }

  scheduleReview(
    features: DARTFeatures,
    interactionHistory: InteractionLog[]
  ): SchedulerResult {
    // Calculate half-life using HLR formula: h = 2^(θᵀx)
    const featureVector = this.featuresToVector(features);
    const logHalfLife = this.dotProduct(this.parameters, featureVector);
    const halfLife = Math.pow(2, logHalfLife);

    // Calculate optimal interval for target recall rate
    // t = h × log₂(1/τ) where τ = 0.9
    const interval = Math.ceil(halfLife * Math.log2(1 / this.targetRecallRate));

    // HLR uses fixed difficulty (recognition-based)
    const difficulty = RetrievalDifficulty.RECOGNITION_MCQ;

    // Calculate current recall probability as confidence
    const daysSinceLastReview = this.getDaysSinceLastReview(interactionHistory);
    const recallProbability = Math.pow(2, -daysSinceLastReview / halfLife);
    
    return {
      interval: Math.max(1, interval),
      difficulty,
      confidence: recallProbability,
      metadata: {
        halfLife,
        recallProbability,
        algorithm: 'HLR'
      }
    };
  }

  private featuresToVector(features: DARTFeatures): number[] {
    return [
      1.0, // Intercept
      Math.log(features.timesReviewed + 1),
      features.successRate,
      Math.log(features.daysSinceFirstSeen + 1),
      Math.log(features.averageResponseTime / 1000 + 1),
      features.wordFrequency
    ];
  }

  private dotProduct(a: number[], b: number[]): number {
    return a.reduce((sum, val, i) => sum + val * (b[i] || 0), 0);
  }

  private getDaysSinceLastReview(history: InteractionLog[]): number {
    if (history.length === 0) return 0;
    
    const lastReview = history[history.length - 1];
    const now = new Date();
    return Math.floor((now.getTime() - lastReview.timestamp.getTime()) / (1000 * 60 * 60 * 24));
  }
}

/**
 * KARL - Semantic-Aware Knowledge Tracing (EMNLP 2024)
 * Integrates semantic similarity for cross-word knowledge transfer
 */
export class KARLScheduler implements BaseScheduler {
  name = 'KARL';
  private semanticNetwork: Map<string, number[]>; // wordId -> embedding
  private knowledgeState: Map<string, number>;    // wordId -> knowledge level
  private readonly transferThreshold = 0.7;       // Semantic similarity threshold

  constructor() {
    this.semanticNetwork = new Map();
    this.knowledgeState = new Map();
  }

  scheduleReview(
    features: DARTFeatures,
    interactionHistory: InteractionLog[],
    lastDifficulty?: RetrievalDifficulty,
    wordId?: string
  ): SchedulerResult {
    // Update knowledge state based on recent performance
    if (wordId) {
      this.updateKnowledgeState(wordId, features, interactionHistory);
    }

    // Calculate base interval using modified HLR
    const baseInterval = this.calculateBaseInterval(features);

    // Apply semantic transfer from related words
    const transferBonus = wordId ? this.calculateSemanticTransfer(wordId) : 0;
    const adjustedInterval = Math.round(baseInterval * (1 + transferBonus));

    // KARL uses adaptive difficulty based on knowledge state
    const knowledgeLevel = wordId ? (this.knowledgeState.get(wordId) || 0) : 0;
    const difficulty = this.selectDifficulty(knowledgeLevel);

    const confidence = Math.min(0.95, knowledgeLevel + 0.1);

    return {
      interval: Math.max(1, adjustedInterval),
      difficulty,
      confidence,
      metadata: {
        baseInterval,
        transferBonus,
        knowledgeLevel,
        algorithm: 'KARL'
      }
    };
  }

  private updateKnowledgeState(
    wordId: string,
    features: DARTFeatures,
    history: InteractionLog[]
  ): void {
    // Simple knowledge state update (in practice, would use neural networks)
    const currentKnowledge = this.knowledgeState.get(wordId) || 0;
    
    // Factor in recent performance
    const recentPerformance = features.successRate;
    const stabilityFactor = Math.min(1.0, features.timesReviewed / 10);
    
    const newKnowledge = currentKnowledge * 0.8 + recentPerformance * 0.2 * stabilityFactor;
    this.knowledgeState.set(wordId, Math.max(0, Math.min(1, newKnowledge)));
  }

  private calculateBaseInterval(features: DARTFeatures): number {
    // Simplified HLR-style calculation
    const logInterval = 
      0.5 + 
      0.3 * Math.log(features.timesReviewed + 1) +
      0.4 * features.successRate +
      0.1 * Math.log(features.daysSinceFirstSeen + 1);
    
    return Math.ceil(Math.pow(2, logInterval));
  }

  private calculateSemanticTransfer(wordId: string): number {
    // Calculate knowledge transfer from semantically similar words
    const wordEmbedding = this.semanticNetwork.get(wordId);
    if (!wordEmbedding) return 0;

    let totalTransfer = 0;
    let similarWords = 0;

    for (const [otherWordId, otherEmbedding] of this.semanticNetwork) {
      if (otherWordId === wordId) continue;

      const similarity = this.cosineSimilarity(wordEmbedding, otherEmbedding);
      if (similarity > this.transferThreshold) {
        const otherKnowledge = this.knowledgeState.get(otherWordId) || 0;
        totalTransfer += similarity * otherKnowledge;
        similarWords++;
      }
    }

    return similarWords > 0 ? totalTransfer / similarWords : 0;
  }

  private selectDifficulty(knowledgeLevel: number): RetrievalDifficulty {
    if (knowledgeLevel < 0.3) {
      return RetrievalDifficulty.RECOGNITION_MCQ;
    } else if (knowledgeLevel < 0.6) {
      return RetrievalDifficulty.CLOZE_FILL;
    } else if (knowledgeLevel < 0.8) {
      return RetrievalDifficulty.CONSTRAINED_GENERATION;
    } else {
      return RetrievalDifficulty.OPEN_PARAPHRASE;
    }
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
    const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
    const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
    
    return dotProduct / (magnitudeA * magnitudeB);
  }

  // Public method to add word embeddings
  addWordEmbedding(wordId: string, embedding: number[]): void {
    this.semanticNetwork.set(wordId, embedding);
  }
}

/**
 * LECTOR - Interference-Aware Scheduler (2025)
 * Mitigates proactive and retroactive interference between similar words
 */
export class LECTORScheduler implements BaseScheduler {
  name = 'LECTOR';
  private interferenceMatrix: Map<string, Map<string, number>>; // word1 -> word2 -> interference
  private recentReviews: Map<string, Date>; // wordId -> last review time
  private readonly interferenceThreshold = 0.8;
  private readonly minSeparation = 2; // Minimum days between similar words

  constructor() {
    this.interferenceMatrix = new Map();
    this.recentReviews = new Map();
  }

  scheduleReview(
    features: DARTFeatures,
    interactionHistory: InteractionLog[],
    lastDifficulty?: RetrievalDifficulty,
    wordId?: string
  ): SchedulerResult {
    // Calculate base interval using HLR-style approach
    const baseInterval = this.calculateBaseInterval(features);

    // Apply interference mitigation
    const interferenceAdjustment = wordId ? 
      this.calculateInterferenceAdjustment(wordId) : 0;
    
    const adjustedInterval = Math.max(
      this.minSeparation,
      baseInterval + interferenceAdjustment
    );

    // LECTOR uses conservative difficulty to reduce interference
    const difficulty = this.selectConservativeDifficulty(features);

    // Update recent reviews tracking
    if (wordId) {
      this.recentReviews.set(wordId, new Date());
    }

    const confidence = Math.min(0.9, features.successRate * 0.8 + 0.2);

    return {
      interval: adjustedInterval,
      difficulty,
      confidence,
      metadata: {
        baseInterval,
        interferenceAdjustment,
        algorithm: 'LECTOR'
      }
    };
  }

  private calculateBaseInterval(features: DARTFeatures): number {
    // HLR-inspired calculation with conservative bias
    const logInterval = 
      0.4 + // More conservative intercept
      0.25 * Math.log(features.timesReviewed + 1) +
      0.35 * features.successRate +
      0.15 * Math.log(features.daysSinceFirstSeen + 1);
    
    return Math.ceil(Math.pow(2, logInterval));
  }

  private calculateInterferenceAdjustment(wordId: string): number {
    const interferenceMap = this.interferenceMatrix.get(wordId);
    if (!interferenceMap) return 0;

    let maxInterference = 0;
    const now = new Date();

    for (const [otherWordId, interferenceScore] of interferenceMap) {
      if (interferenceScore < this.interferenceThreshold) continue;

      const lastReview = this.recentReviews.get(otherWordId);
      if (!lastReview) continue;

      const daysSinceReview = Math.floor(
        (now.getTime() - lastReview.getTime()) / (1000 * 60 * 60 * 24)
      );

      // Higher interference if the similar word was reviewed recently
      if (daysSinceReview < this.minSeparation) {
        const recencyFactor = (this.minSeparation - daysSinceReview) / this.minSeparation;
        const currentInterference = interferenceScore * recencyFactor;
        maxInterference = Math.max(maxInterference, currentInterference);
      }
    }

    // Convert interference to additional delay (in days)
    return Math.ceil(maxInterference * 3);
  }

  private selectConservativeDifficulty(features: DARTFeatures): RetrievalDifficulty {
    // LECTOR uses more conservative difficulty progression to reduce errors
    const adjustedSuccessRate = features.successRate * 0.8; // Conservative adjustment
    
    if (adjustedSuccessRate < 0.4 || features.timesReviewed < 3) {
      return RetrievalDifficulty.RECOGNITION_MCQ;
    } else if (adjustedSuccessRate < 0.7 || features.timesReviewed < 6) {
      return RetrievalDifficulty.CLOZE_FILL;
    } else if (adjustedSuccessRate < 0.85 || features.timesReviewed < 10) {
      return RetrievalDifficulty.CONSTRAINED_GENERATION;
    } else {
      return RetrievalDifficulty.OPEN_PARAPHRASE;
    }
  }

  // Public method to set interference between words
  setInterference(word1: string, word2: string, score: number): void {
    if (!this.interferenceMatrix.has(word1)) {
      this.interferenceMatrix.set(word1, new Map());
    }
    if (!this.interferenceMatrix.has(word2)) {
      this.interferenceMatrix.set(word2, new Map());
    }
    
    this.interferenceMatrix.get(word1)!.set(word2, score);
    this.interferenceMatrix.get(word2)!.set(word1, score); // Symmetric
  }
}

/**
 * Scheduler Factory for Easy Baseline Comparison
 */
export class SchedulerFactory {
  static createScheduler(type: 'SM-2' | 'HLR' | 'KARL' | 'LECTOR'): BaseScheduler {
    switch (type) {
      case 'SM-2':
        return new SM2Scheduler();
      case 'HLR':
        return new HLRScheduler();
      case 'KARL':
        return new KARLScheduler();
      case 'LECTOR':
        return new LECTORScheduler();
      default:
        throw new Error(`Unknown scheduler type: ${type}`);
    }
  }

  static getAllSchedulers(): BaseScheduler[] {
    return [
      new SM2Scheduler(),
      new HLRScheduler(),
      new KARLScheduler(),
      new LECTORScheduler()
    ];
  }
}

/**
 * Comparative Evaluation Framework
 */
export interface ComparisonResult {
  schedulerName: string;
  avgInterval: number;
  avgConfidence: number;
  difficultyDistribution: Record<RetrievalDifficulty, number>;
  metadata: any;
}

export class SchedulerComparator {
  static compareSchedulers(
    schedulers: BaseScheduler[],
    testCases: Array<{
      features: DARTFeatures;
      history: InteractionLog[];
      wordId?: string;
    }>
  ): ComparisonResult[] {
    return schedulers.map(scheduler => {
      const results = testCases.map(testCase => 
        scheduler.scheduleReview(testCase.features, testCase.history)
      );

      const avgInterval = results.reduce((sum, r) => sum + r.interval, 0) / results.length;
      const avgConfidence = results.reduce((sum, r) => sum + r.confidence, 0) / results.length;
      
      const difficultyDistribution: Record<RetrievalDifficulty, number> = {
        [RetrievalDifficulty.RECOGNITION_MCQ]: 0,
        [RetrievalDifficulty.CLOZE_FILL]: 0,
        [RetrievalDifficulty.CONSTRAINED_GENERATION]: 0,
        [RetrievalDifficulty.OPEN_PARAPHRASE]: 0
      };

      results.forEach(result => {
        difficultyDistribution[result.difficulty]++;
      });

      // Normalize to percentages
      Object.keys(difficultyDistribution).forEach(key => {
        difficultyDistribution[key as any] /= results.length;
      });

      return {
        schedulerName: scheduler.name,
        avgInterval,
        avgConfidence,
        difficultyDistribution,
        metadata: {
          totalTests: results.length,
          results: results.slice(0, 5) // Sample results
        }
      };
    });
  }
}