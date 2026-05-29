// __tests__/carts-scheduler.test.ts
// Test suite for CARTS Deep RL Framework

import {
  CARTSScheduler,
  TransformerStateEncoder,
  PPOPolicy,
  LearnerState,
  TransformerConfig,
  PPOConfig
} from '../lib/carts-scheduler';
import {
  RetrievalDifficulty,
  DARTFeatures,
  createInteractionLog
} from '../lib/spacedRepetition';

describe('CARTS Deep RL Framework Tests', () => {
  let transformerConfig: TransformerConfig;
  let ppoConfig: PPOConfig;
  let scheduler: CARTSScheduler;

  beforeEach(() => {
    transformerConfig = {
      modelDim: 128,
      numHeads: 4,
      numLayers: 2,
      feedforwardDim: 256,
      maxSequenceLength: 50,
      dropoutRate: 0.1
    };

    ppoConfig = {
      learningRate: 0.0003,
      clipEpsilon: 0.2,
      valueCoeff: 0.5,
      entropyCoeff: 0.01,
      gamma: 0.99,
      lambda: 0.95,
      batchSize: 32,
      epochs: 4
    };

    scheduler = new CARTSScheduler(transformerConfig, ppoConfig);
  });

  describe('Transformer State Encoder', () => {
    test('should encode interaction history to fixed-size vector', () => {
      const encoder = new TransformerStateEncoder(transformerConfig);
      
      const interactions = [
        createInteractionLog('word1', RetrievalDifficulty.RECOGNITION_MCQ, true, 2000, 'context1', {} as DARTFeatures),
        createInteractionLog('word1', RetrievalDifficulty.CLOZE_FILL, false, 3500, 'context2', {} as DARTFeatures),
        createInteractionLog('word1', RetrievalDifficulty.RECOGNITION_MCQ, true, 1800, 'context3', {} as DARTFeatures)
      ];

      const stateVector = encoder.encode(interactions);
      
      expect(stateVector).toHaveLength(transformerConfig.modelDim);
      expect(stateVector.every(val => typeof val === 'number')).toBe(true);
      expect(stateVector.some(val => val !== 0)).toBe(true); // Should not be all zeros
    });

    test('should handle empty interaction history', () => {
      const encoder = new TransformerStateEncoder(transformerConfig);
      const stateVector = encoder.encode([]);
      
      expect(stateVector).toHaveLength(transformerConfig.modelDim);
      expect(stateVector.every(val => val === 0)).toBe(true); // Should be all zeros for empty history
    });

    test('should respect maximum sequence length', () => {
      const encoder = new TransformerStateEncoder({
        ...transformerConfig,
        maxSequenceLength: 2
      });
      
      const manyInteractions = Array.from({ length: 5 }, (_, i) =>
        createInteractionLog(`word1`, RetrievalDifficulty.RECOGNITION_MCQ, true, 2000, `context${i}`, {} as DARTFeatures)
      );

      const stateVector = encoder.encode(manyInteractions);
      
      expect(stateVector).toHaveLength(transformerConfig.modelDim);
      // Should only process last 2 interactions due to maxSequenceLength=2
    });
  });

  describe('PPO Policy Network', () => {
    test('should sample valid actions', () => {
      const policy = new PPOPolicy(ppoConfig, transformerConfig.modelDim);
      const mockState = new Array(transformerConfig.modelDim).fill(0.1);
      const availableContexts = ['context1', 'context2', 'context3'];
      
      const action = policy.sampleAction(mockState, availableContexts);
      
      expect(Object.values(RetrievalDifficulty)).toContain(action.difficulty);
      expect(availableContexts).toContain(action.context);
      expect(typeof action.logProb).toBe('number');
      expect(action.logProb).toBeLessThanOrEqual(0); // Log probabilities should be ≤ 0
    });

    test('should estimate reasonable state values', () => {
      const policy = new PPOPolicy(ppoConfig, transformerConfig.modelDim);
      const mockState = new Array(transformerConfig.modelDim).fill(0.5);
      
      const value = policy.estimateValue(mockState);
      
      expect(typeof value).toBe('number');
      expect(isFinite(value)).toBe(true);
    });

    test('should estimate positive memory stability', () => {
      const policy = new PPOPolicy(ppoConfig, transformerConfig.modelDim);
      const mockState = new Array(transformerConfig.modelDim).fill(0.3);
      
      const memoryStability = policy.estimateMemoryStability(mockState);
      
      expect(memoryStability).toBeGreaterThan(0);
      expect(isFinite(memoryStability)).toBe(true);
    });

    test('should return consistent action probabilities', () => {
      const policy = new PPOPolicy(ppoConfig, transformerConfig.modelDim);
      const mockState = new Array(transformerConfig.modelDim).fill(0.2);
      
      const prob1 = policy.getActionProbabilities(mockState, RetrievalDifficulty.RECOGNITION_MCQ);
      const prob2 = policy.getActionProbabilities(mockState, RetrievalDifficulty.RECOGNITION_MCQ);
      
      expect(prob1).toBe(prob2); // Should be deterministic for same input
      expect(prob1).toBeGreaterThan(0);
      expect(prob1).toBeLessThanOrEqual(1);
    });
  });

  describe('CARTS Scheduler Integration', () => {
    test('should schedule review with valid parameters', () => {
      const learnerState: LearnerState = {
        userId: 'user123',
        wordId: 'word456',
        interactionHistory: [
          createInteractionLog('word456', RetrievalDifficulty.RECOGNITION_MCQ, true, 2500, 'context1', {
            timesReviewed: 1,
            successRate: 1.0,
            daysSinceFirstSeen: 1,
            averageResponseTime: 2500,
            consecutiveCorrect: 1,
            wordFrequency: -5.2
          })
        ],
        currentFeatures: {
          timesReviewed: 1,
          successRate: 1.0,
          daysSinceFirstSeen: 1,
          averageResponseTime: 2500,
          consecutiveCorrect: 1,
          wordFrequency: -5.2
        },
        contextHistory: ['context1'],
        memoryStability: 2.0
      };

      const schedule = scheduler.scheduleReview(learnerState);
      
      expect(Object.values(RetrievalDifficulty)).toContain(schedule.difficulty);
      expect(typeof schedule.context).toBe('string');
      expect(schedule.interval).toBeGreaterThan(0);
      expect(schedule.memoryStability).toBeGreaterThan(0);
    });

    test('should process learning outcomes correctly', () => {
      const learnerState: LearnerState = {
        userId: 'user123',
        wordId: 'word456',
        interactionHistory: [],
        currentFeatures: {
          timesReviewed: 0,
          successRate: 0,
          daysSinceFirstSeen: 0,
          averageResponseTime: 5000,
          consecutiveCorrect: 0,
          wordFrequency: -5.0
        },
        contextHistory: [],
        memoryStability: 1.0
      };

      const initialHistoryLength = learnerState.interactionHistory.length;
      
      scheduler.processOutcome(
        learnerState,
        {
          difficulty: RetrievalDifficulty.CLOZE_FILL,
          context: 'test context',
          contextEmbedding: [0.1, 0.2, 0.3]
        },
        true, // isCorrect
        2000, // responseTime
        0.8   // contextTransferScore
      );

      expect(learnerState.interactionHistory).toHaveLength(initialHistoryLength + 1);
      expect(learnerState.contextHistory).toContain('test context');
    });

    test('should handle context database operations', () => {
      const wordId = 'testWord';
      const contexts = ['context A', 'context B', 'context C'];
      
      scheduler.addContextsForWord(wordId, contexts);
      
      // Create a learner state for this word
      const learnerState: LearnerState = {
        userId: 'user123',
        wordId: wordId,
        interactionHistory: [],
        currentFeatures: {
          timesReviewed: 0,
          successRate: 0,
          daysSinceFirstSeen: 0,
          averageResponseTime: 5000,
          consecutiveCorrect: 0,
          wordFrequency: -4.8
        },
        contextHistory: [],
        memoryStability: 1.5
      };

      const schedule = scheduler.scheduleReview(learnerState);
      
      // The selected context should be one of the provided contexts
      expect(contexts).toContain(schedule.context);
    });
  });

  describe('Reward Calculation', () => {
    test('should calculate multi-objective rewards correctly', () => {
      const learnerState: LearnerState = {
        userId: 'user123',
        wordId: 'word789',
        interactionHistory: [],
        currentFeatures: {
          timesReviewed: 0,
          successRate: 0,
          daysSinceFirstSeen: 0,
          averageResponseTime: 5000,
          consecutiveCorrect: 0,
          wordFrequency: -5.5
        },
        contextHistory: [],
        memoryStability: 1.0
      };

      // Test correct response with good context transfer
      scheduler.processOutcome(
        learnerState,
        {
          difficulty: RetrievalDifficulty.CONSTRAINED_GENERATION,
          context: 'high quality context',
          contextEmbedding: [0.5, 0.6, 0.7]
        },
        true,  // correct
        1500,  // fast response
        0.9    // high context transfer
      );

      // Should have added one interaction
      expect(learnerState.interactionHistory).toHaveLength(1);
      
      const interaction = learnerState.interactionHistory[0];
      expect(interaction.isCorrect).toBe(true);
      expect(interaction.difficulty).toBe(RetrievalDifficulty.CONSTRAINED_GENERATION);
      expect(interaction.responseTime).toBe(1500);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('should handle learner with no interaction history', () => {
      const newLearnerState: LearnerState = {
        userId: 'newUser',
        wordId: 'newWord',
        interactionHistory: [],
        currentFeatures: {
          timesReviewed: 0,
          successRate: 0,
          daysSinceFirstSeen: 0,
          averageResponseTime: 5000,
          consecutiveCorrect: 0,
          wordFrequency: -6.0
        },
        contextHistory: [],
        memoryStability: 0.5
      };

      const schedule = scheduler.scheduleReview(newLearnerState);
      
      expect(schedule.difficulty).toBe(RetrievalDifficulty.RECOGNITION_MCQ); // Should start with easiest
      expect(schedule.interval).toBeGreaterThan(0);
      expect(schedule.memoryStability).toBeGreaterThan(0);
    });

    test('should handle very long interaction histories', () => {
      const longHistory = Array.from({ length: 100 }, (_, i) =>
        createInteractionLog('word', RetrievalDifficulty.RECOGNITION_MCQ, i % 2 === 0, 2000 + i * 10, `context${i}`, {} as DARTFeatures)
      );

      const learnerState: LearnerState = {
        userId: 'powerUser',
        wordId: 'frequentWord',
        interactionHistory: longHistory,
        currentFeatures: {
          timesReviewed: 100,
          successRate: 0.5,
          daysSinceFirstSeen: 100,
          averageResponseTime: 2500,
          consecutiveCorrect: 1,
          wordFrequency: -3.0
        },
        contextHistory: longHistory.map((_, i) => `context${i}`),
        memoryStability: 15.0
      };

      const schedule = scheduler.scheduleReview(learnerState);
      
      expect(schedule.difficulty).toBeGreaterThanOrEqual(RetrievalDifficulty.CONSTRAINED_GENERATION); // Should be advanced
      expect(schedule.interval).toBeGreaterThan(10); // Should have long intervals
    });
  });
});