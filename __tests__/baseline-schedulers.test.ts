// __tests__/baseline-schedulers.test.ts
// Test suite for baseline spaced repetition algorithms

import {
  SM2Scheduler,
  HLRScheduler,
  KARLScheduler,
  LECTORScheduler,
  SchedulerFactory,
  SchedulerComparator,
  BaseScheduler
} from '../lib/baseline-schedulers';
import {
  RetrievalDifficulty,
  DARTFeatures,
  createInteractionLog
} from '../lib/spacedRepetition';

describe('Baseline Schedulers Tests', () => {
  // Common test data
  const basicFeatures: DARTFeatures = {
    timesReviewed: 3,
    successRate: 0.8,
    daysSinceFirstSeen: 7,
    averageResponseTime: 2500,
    consecutiveCorrect: 2,
    wordFrequency: -5.2
  };

  const sampleHistory = [
    createInteractionLog('word1', RetrievalDifficulty.RECOGNITION_MCQ, true, 3000, 'context1', basicFeatures),
    createInteractionLog('word1', RetrievalDifficulty.CLOZE_FILL, true, 2500, 'context2', basicFeatures),
    createInteractionLog('word1', RetrievalDifficulty.CLOZE_FILL, false, 4000, 'context3', basicFeatures)
  ];

  describe('SM-2 Scheduler', () => {
    let scheduler: SM2Scheduler;

    beforeEach(() => {
      scheduler = new SM2Scheduler();
    });

    test('should return valid scheduling results', () => {
      const result = scheduler.scheduleReview(basicFeatures, sampleHistory);
      
      expect(result.interval).toBeGreaterThan(0);
      expect(result.difficulty).toBe(RetrievalDifficulty.RECOGNITION_MCQ); // SM-2 uses fixed difficulty
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
      expect(result.metadata.algorithm).toBe('SM-2');
    });

    test('should handle new learners correctly', () => {
      const newLearnerFeatures: DARTFeatures = {
        timesReviewed: 0,
        successRate: 0,
        daysSinceFirstSeen: 0,
        averageResponseTime: 5000,
        consecutiveCorrect: 0,
        wordFrequency: -6.0
      };

      const result = scheduler.scheduleReview(newLearnerFeatures, []);
      
      expect(result.interval).toBe(1); // Should start with 1 day
      expect(result.difficulty).toBe(RetrievalDifficulty.RECOGNITION_MCQ);
      expect(result.metadata.repetitions).toBe(0);
    });

    test('should reset interval for poor performance', () => {
      const poorFeatures: DARTFeatures = {
        ...basicFeatures,
        successRate: 0.4, // Below 60% threshold
        timesReviewed: 5
      };

      const result = scheduler.scheduleReview(poorFeatures, sampleHistory);
      
      expect(result.interval).toBe(1); // Should reset to 1 day
      expect(result.metadata.repetitions).toBe(0);
    });

    test('should increase intervals for good performance', () => {
      const goodFeatures: DARTFeatures = {
        ...basicFeatures,
        successRate: 0.95,
        timesReviewed: 5
      };

      const result = scheduler.scheduleReview(goodFeatures, sampleHistory);
      
      expect(result.interval).toBeGreaterThan(1);
      expect(result.metadata.easeFactor).toBeGreaterThan(1.3);
    });
  });

  describe('HLR Scheduler', () => {
    let scheduler: HLRScheduler;

    beforeEach(() => {
      scheduler = new HLRScheduler();
    });

    test('should calculate half-life based intervals', () => {
      const result = scheduler.scheduleReview(basicFeatures, sampleHistory);
      
      expect(result.interval).toBeGreaterThan(0);
      expect(result.difficulty).toBe(RetrievalDifficulty.RECOGNITION_MCQ); // HLR uses fixed difficulty
      expect(result.metadata.halfLife).toBeGreaterThan(0);
      expect(result.metadata.recallProbability).toBeGreaterThan(0);
      expect(result.metadata.recallProbability).toBeLessThanOrEqual(1);
      expect(result.metadata.algorithm).toBe('HLR');
    });

    test('should use custom parameters when provided', () => {
      const customParams = [1.0, 0.5, 0.3, 0.2, 0.1, 0.05];
      const customScheduler = new HLRScheduler(customParams);
      
      const result = customScheduler.scheduleReview(basicFeatures, sampleHistory);
      
      expect(result.interval).toBeGreaterThan(0);
      expect(result.metadata.algorithm).toBe('HLR');
    });

    test('should handle different feature combinations', () => {
      const highPerformanceFeatures: DARTFeatures = {
        timesReviewed: 10,
        successRate: 0.95,
        daysSinceFirstSeen: 30,
        averageResponseTime: 1500,
        consecutiveCorrect: 8,
        wordFrequency: -3.0
      };

      const lowPerformanceFeatures: DARTFeatures = {
        timesReviewed: 2,
        successRate: 0.5,
        daysSinceFirstSeen: 2,
        averageResponseTime: 5000,
        consecutiveCorrect: 0,
        wordFrequency: -7.0
      };

      const highResult = scheduler.scheduleReview(highPerformanceFeatures, sampleHistory);
      const lowResult = scheduler.scheduleReview(lowPerformanceFeatures, sampleHistory);
      
      expect(highResult.interval).toBeGreaterThan(lowResult.interval);
      expect(highResult.confidence).toBeGreaterThan(lowResult.confidence);
    });
  });

  describe('KARL Scheduler', () => {
    let scheduler: KARLScheduler;

    beforeEach(() => {
      scheduler = new KARLScheduler();
    });

    test('should provide adaptive difficulty based on knowledge state', () => {
      const result = scheduler.scheduleReview(basicFeatures, sampleHistory, undefined, 'testWord');
      
      expect(result.interval).toBeGreaterThan(0);
      expect(Object.values(RetrievalDifficulty)).toContain(result.difficulty);
      expect(result.metadata.algorithm).toBe('KARL');
      expect(result.metadata.knowledgeLevel).toBeGreaterThanOrEqual(0);
      expect(result.metadata.knowledgeLevel).toBeLessThanOrEqual(1);
    });

    test('should handle semantic transfer when embeddings are available', () => {
      // Add word embeddings
      scheduler.addWordEmbedding('word1', [0.1, 0.2, 0.3, 0.4, 0.5]);
      scheduler.addWordEmbedding('word2', [0.15, 0.25, 0.35, 0.45, 0.55]); // Similar to word1
      scheduler.addWordEmbedding('word3', [0.9, 0.8, 0.7, 0.6, 0.5]); // Different from word1

      // First, establish knowledge for word2
      const word2Features: DARTFeatures = {
        ...basicFeatures,
        successRate: 0.9,
        timesReviewed: 8
      };
      scheduler.scheduleReview(word2Features, sampleHistory, undefined, 'word2');

      // Now schedule word1 - should benefit from word2's knowledge
      const result = scheduler.scheduleReview(basicFeatures, sampleHistory, undefined, 'word1');
      
      expect(result.metadata.transferBonus).toBeGreaterThanOrEqual(0);
    });

    test('should progress difficulty with increasing knowledge', () => {
      const wordId = 'progressiveWord';
      
      // Start with low knowledge
      const beginnerFeatures: DARTFeatures = {
        timesReviewed: 1,
        successRate: 0.5,
        daysSinceFirstSeen: 1,
        averageResponseTime: 4000,
        consecutiveCorrect: 0,
        wordFrequency: -5.5
      };

      const beginnerResult = scheduler.scheduleReview(beginnerFeatures, [], undefined, wordId);
      
      // Progress to high knowledge
      const expertFeatures: DARTFeatures = {
        timesReviewed: 15,
        successRate: 0.95,
        daysSinceFirstSeen: 45,
        averageResponseTime: 1200,
        consecutiveCorrect: 10,
        wordFrequency: -5.5
      };

      const expertResult = scheduler.scheduleReview(expertFeatures, sampleHistory, undefined, wordId);
      
      expect(expertResult.difficulty).toBeGreaterThanOrEqual(beginnerResult.difficulty);
      expect(expertResult.confidence).toBeGreaterThan(beginnerResult.confidence);
    });
  });

  describe('LECTOR Scheduler', () => {
    let scheduler: LECTORScheduler;

    beforeEach(() => {
      scheduler = new LECTORScheduler();
    });

    test('should apply conservative scheduling', () => {
      const result = scheduler.scheduleReview(basicFeatures, sampleHistory, undefined, 'testWord');
      
      expect(result.interval).toBeGreaterThan(0);
      expect(Object.values(RetrievalDifficulty)).toContain(result.difficulty);
      expect(result.metadata.algorithm).toBe('LECTOR');
      expect(result.confidence).toBeLessThanOrEqual(0.9); // Conservative confidence
    });

    test('should delay scheduling when interference is detected', () => {
      // Set up interference between words
      scheduler.setInterference('word1', 'word2', 0.9); // High interference
      
      // Schedule word2 first
      const word2Result = scheduler.scheduleReview(basicFeatures, sampleHistory, undefined, 'word2');
      
      // Now schedule word1 - should be delayed due to interference
      const word1Result = scheduler.scheduleReview(basicFeatures, sampleHistory, undefined, 'word1');
      
      expect(word1Result.metadata.interferenceAdjustment).toBeGreaterThanOrEqual(0);
      expect(word1Result.interval).toBeGreaterThanOrEqual(word1Result.metadata.baseInterval);
    });

    test('should use conservative difficulty progression', () => {
      const highPerformanceFeatures: DARTFeatures = {
        timesReviewed: 8,
        successRate: 0.9,
        daysSinceFirstSeen: 20,
        averageResponseTime: 1800,
        consecutiveCorrect: 6,
        wordFrequency: -4.0
      };

      const result = scheduler.scheduleReview(highPerformanceFeatures, sampleHistory);
      
      // LECTOR should be more conservative than other algorithms
      expect(result.difficulty).toBeLessThanOrEqual(RetrievalDifficulty.CONSTRAINED_GENERATION);
    });

    test('should maintain minimum separation between similar words', () => {
      scheduler.setInterference('wordA', 'wordB', 0.95);
      
      // Schedule wordA
      scheduler.scheduleReview(basicFeatures, sampleHistory, undefined, 'wordA');
      
      // Immediately schedule wordB
      const resultB = scheduler.scheduleReview(basicFeatures, sampleHistory, undefined, 'wordB');
      
      expect(resultB.interval).toBeGreaterThanOrEqual(2); // Minimum separation
    });
  });

  describe('Scheduler Factory', () => {
    test('should create all scheduler types', () => {
      const sm2 = SchedulerFactory.createScheduler('SM-2');
      const hlr = SchedulerFactory.createScheduler('HLR');
      const karl = SchedulerFactory.createScheduler('KARL');
      const lector = SchedulerFactory.createScheduler('LECTOR');

      expect(sm2).toBeInstanceOf(SM2Scheduler);
      expect(hlr).toBeInstanceOf(HLRScheduler);
      expect(karl).toBeInstanceOf(KARLScheduler);
      expect(lector).toBeInstanceOf(LECTORScheduler);
    });

    test('should throw error for unknown scheduler type', () => {
      expect(() => {
        SchedulerFactory.createScheduler('UNKNOWN' as any);
      }).toThrow('Unknown scheduler type: UNKNOWN');
    });

    test('should return all schedulers', () => {
      const allSchedulers = SchedulerFactory.getAllSchedulers();
      
      expect(allSchedulers).toHaveLength(4);
      expect(allSchedulers.map(s => s.name)).toEqual(['SM-2', 'HLR', 'KARL', 'LECTOR']);
    });
  });

  describe('Scheduler Comparator', () => {
    test('should compare multiple schedulers on test cases', () => {
      const schedulers = SchedulerFactory.getAllSchedulers();
      const testCases = [
        { features: basicFeatures, history: sampleHistory, wordId: 'word1' },
        { 
          features: { ...basicFeatures, successRate: 0.95, timesReviewed: 8 }, 
          history: sampleHistory, 
          wordId: 'word2' 
        },
        { 
          features: { ...basicFeatures, successRate: 0.4, timesReviewed: 2 }, 
          history: [], 
          wordId: 'word3' 
        }
      ];

      const comparison = SchedulerComparator.compareSchedulers(schedulers, testCases);
      
      expect(comparison).toHaveLength(4);
      
      comparison.forEach(result => {
        expect(result.schedulerName).toBeTruthy();
        expect(result.avgInterval).toBeGreaterThan(0);
        expect(result.avgConfidence).toBeGreaterThan(0);
        expect(result.avgConfidence).toBeLessThanOrEqual(1);
        expect(result.metadata.totalTests).toBe(testCases.length);
        
        // Check difficulty distribution sums to 1
        const totalDistribution = Object.values(result.difficultyDistribution)
          .reduce((sum, val) => sum + val, 0);
        expect(totalDistribution).toBeCloseTo(1.0, 2);
      });
    });

    test('should show different behaviors between schedulers', () => {
      const schedulers = [
        SchedulerFactory.createScheduler('SM-2'),
        SchedulerFactory.createScheduler('HLR'),
        SchedulerFactory.createScheduler('KARL')
      ];

      const testCases = [
        { features: basicFeatures, history: sampleHistory, wordId: 'testWord' }
      ];

      const comparison = SchedulerComparator.compareSchedulers(schedulers, testCases);
      
      // SM-2 should only use RECOGNITION_MCQ
      const sm2Result = comparison.find(r => r.schedulerName === 'SM-2')!;
      expect(sm2Result.difficultyDistribution[RetrievalDifficulty.RECOGNITION_MCQ]).toBe(1);
      
      // KARL should potentially use different difficulties
      const karlResult = comparison.find(r => r.schedulerName === 'KARL')!;
      expect(karlResult.difficultyDistribution).toBeDefined();
    });
  });

  describe('Cross-Scheduler Consistency', () => {
    test('all schedulers should handle edge cases gracefully', () => {
      const schedulers = SchedulerFactory.getAllSchedulers();
      
      // Test with extreme features
      const extremeFeatures: DARTFeatures = {
        timesReviewed: 0,
        successRate: 0,
        daysSinceFirstSeen: 0,
        averageResponseTime: 0,
        consecutiveCorrect: 0,
        wordFrequency: -10
      };

      schedulers.forEach(scheduler => {
        const result = scheduler.scheduleReview(extremeFeatures, []);
        
        expect(result.interval).toBeGreaterThan(0);
        expect(result.interval).toBeLessThan(1000); // Reasonable upper bound
        expect(Object.values(RetrievalDifficulty)).toContain(result.difficulty);
        expect(result.confidence).toBeGreaterThanOrEqual(0);
        expect(result.confidence).toBeLessThanOrEqual(1);
      });
    });

    test('all schedulers should produce deterministic results', () => {
      const schedulers = SchedulerFactory.getAllSchedulers();
      
      schedulers.forEach(scheduler => {
        const result1 = scheduler.scheduleReview(basicFeatures, sampleHistory);
        const result2 = scheduler.scheduleReview(basicFeatures, sampleHistory);
        
        expect(result1.interval).toBe(result2.interval);
        expect(result1.difficulty).toBe(result2.difficulty);
        expect(result1.confidence).toBe(result2.confidence);
      });
    });
  });
});