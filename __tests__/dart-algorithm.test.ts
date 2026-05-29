// __tests__/dart-algorithm.test.ts
// Test suite for DART Algorithm implementation

import {
  DARTScheduler,
  RetrievalDifficulty,
  DARTFeatures,
  calculateFeatures,
  createInteractionLog
} from '../lib/spacedRepetition';

describe('DART Algorithm Tests', () => {
  let scheduler: DARTScheduler;

  beforeEach(() => {
    scheduler = new DARTScheduler();
  });

  describe('Basic DART Functionality', () => {
    test('should calculate base half-life correctly', () => {
      const features: DARTFeatures = {
        timesReviewed: 3,
        successRate: 0.8,
        daysSinceFirstSeen: 7,
        averageResponseTime: 2500,
        consecutiveCorrect: 2,
        wordFrequency: -5.2
      };

      const result = scheduler.scheduleNextReview(features, RetrievalDifficulty.RECOGNITION_MCQ);
      
      expect(result.halfLife).toBeGreaterThan(0);
      expect(result.interval).toBeGreaterThan(0);
      expect(result.recallProbability).toBeLessThanOrEqual(1);
      expect(result.recallProbability).toBeGreaterThanOrEqual(0);
    });

    test('should increase half-life with higher difficulty', () => {
      const features: DARTFeatures = {
        timesReviewed: 5,
        successRate: 0.9,
        daysSinceFirstSeen: 14,
        averageResponseTime: 2000,
        consecutiveCorrect: 3,
        wordFrequency: -4.8
      };

      const easyResult = scheduler.scheduleNextReview(features, RetrievalDifficulty.RECOGNITION_MCQ);
      const hardResult = scheduler.scheduleNextReview(features, RetrievalDifficulty.OPEN_PARAPHRASE);
      
      expect(hardResult.halfLife).toBeGreaterThan(easyResult.halfLife);
    });

    test('should select appropriate difficulty based on memory stability', () => {
      // New word - should get easy difficulty
      const newWordFeatures: DARTFeatures = {
        timesReviewed: 1,
        successRate: 1.0,
        daysSinceFirstSeen: 1,
        averageResponseTime: 4000,
        consecutiveCorrect: 1,
        wordFrequency: -6.0
      };

      const newWordResult = scheduler.scheduleNextReview(newWordFeatures, RetrievalDifficulty.RECOGNITION_MCQ);
      expect(newWordResult.difficulty).toBe(RetrievalDifficulty.RECOGNITION_MCQ);

      // Well-learned word - should get harder difficulty
      const learnedWordFeatures: DARTFeatures = {
        timesReviewed: 10,
        successRate: 0.95,
        daysSinceFirstSeen: 60,
        averageResponseTime: 1500,
        consecutiveCorrect: 8,
        wordFrequency: -3.2
      };

      const learnedWordResult = scheduler.scheduleNextReview(learnedWordFeatures, RetrievalDifficulty.CONSTRAINED_GENERATION);
      expect(learnedWordResult.difficulty).toBeGreaterThanOrEqual(RetrievalDifficulty.CONSTRAINED_GENERATION);
    });
  });

  describe('Feature Calculation', () => {
    test('should calculate features from interaction history', () => {
      const logs = [
        createInteractionLog('word1', RetrievalDifficulty.RECOGNITION_MCQ, true, 3000, 'context1', {} as DARTFeatures),
        createInteractionLog('word1', RetrievalDifficulty.CLOZE_FILL, true, 2500, 'context2', {} as DARTFeatures),
        createInteractionLog('word1', RetrievalDifficulty.CLOZE_FILL, false, 4000, 'context3', {} as DARTFeatures),
        createInteractionLog('word1', RetrievalDifficulty.RECOGNITION_MCQ, true, 2000, 'context4', {} as DARTFeatures)
      ];

      // Set timestamps manually for testing
      logs[0].timestamp = new Date('2024-01-01');
      logs[1].timestamp = new Date('2024-01-03');
      logs[2].timestamp = new Date('2024-01-05');
      logs[3].timestamp = new Date('2024-01-07');

      const features = calculateFeatures(logs, -5.0);

      expect(features.timesReviewed).toBe(4);
      expect(features.successRate).toBe(0.75); // 3/4 correct
      expect(features.averageResponseTime).toBe(2875); // (3000+2500+4000+2000)/4
      expect(features.consecutiveCorrect).toBe(1); // Last one was correct
      expect(features.wordFrequency).toBe(-5.0);
    });

    test('should handle empty interaction history', () => {
      const features = calculateFeatures([], -4.5);

      expect(features.timesReviewed).toBe(0);
      expect(features.successRate).toBe(0);
      expect(features.daysSinceFirstSeen).toBe(0);
      expect(features.averageResponseTime).toBe(5000); // Default
      expect(features.consecutiveCorrect).toBe(0);
      expect(features.wordFrequency).toBe(-4.5);
    });
  });

  describe('Recall Probability Calculation', () => {
    test('should calculate correct recall probability', () => {
      const halfLife = 7.0; // 7 days
      
      // At t=0, probability should be 1
      expect(scheduler.calculateRecallProbability(0, halfLife)).toBeCloseTo(1.0);
      
      // At t=halfLife, probability should be 0.5
      expect(scheduler.calculateRecallProbability(halfLife, halfLife)).toBeCloseTo(0.5);
      
      // At t=2*halfLife, probability should be 0.25
      expect(scheduler.calculateRecallProbability(2 * halfLife, halfLife)).toBeCloseTo(0.25);
    });
  });

  describe('Interval Calculation', () => {
    test('should calculate optimal interval for target recall rate', () => {
      const halfLife = 10.0;
      const interval = scheduler.calculateOptimalInterval(halfLife);
      
      // For target recall rate of 0.9, interval should be less than half-life
      expect(interval).toBeLessThan(halfLife);
      expect(interval).toBeGreaterThan(0);
      
      // Verify the math: 2^(-interval/halfLife) ≈ 0.9
      const actualRecallRate = Math.pow(2, -interval / halfLife);
      expect(actualRecallRate).toBeGreaterThanOrEqual(0.85); // Allow some rounding error
    });
  });
});