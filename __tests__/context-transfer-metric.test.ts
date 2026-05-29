// __tests__/context-transfer-metric.test.ts
// Test suite for ContextTransfer Metric and LLM-as-a-Judge Framework

import {
  ContextTransferEvaluator,
  ContextTransferTask,
  LearnerResponse,
  ContextTransferScore,
  HumanExpertValidator,
  HumanExpertRating
} from '../lib/context-transfer-metric';
import {
  MockLLMProvider,
  LLMProviderFactory,
  LLMProviderComparator
} from '../lib/llm-providers';
import { RetrievalDifficulty } from '../lib/spacedRepetition';

describe('ContextTransfer Metric Tests', () => {
  let evaluator: ContextTransferEvaluator;
  let mockProvider: MockLLMProvider;

  beforeEach(() => {
    mockProvider = new MockLLMProvider();
    evaluator = new ContextTransferEvaluator(mockProvider);
  });

  describe('ContextTransfer Evaluator', () => {
    test('should evaluate recognition MCQ tasks correctly', async () => {
      const task: ContextTransferTask = {
        wordId: 'word1',
        targetWord: 'elaborate',
        context: 'The scientist provided an elaborate explanation of the theory.',
        difficulty: RetrievalDifficulty.RECOGNITION_MCQ,
        expectedUsage: ['detailed', 'complex', 'thorough'],
        distractorContexts: ['simple', 'basic']
      };

      const response: LearnerResponse = {
        userId: 'user1',
        taskId: 'task1',
        response: 'detailed and complex',
        responseTime: 3000,
        confidence: 4,
        timestamp: new Date()
      };

      const score = await evaluator.evaluateResponse(task, response);

      expect(score.overall).toBeGreaterThan(0);
      expect(score.overall).toBeLessThanOrEqual(1);
      expect(score.semantic).toBeDefined();
      expect(score.confidence).toBeGreaterThan(0);
      expect(score.explanation).toBeTruthy();
    });

    test('should evaluate cloze fill tasks correctly', async () => {
      const task: ContextTransferTask = {
        wordId: 'word2',
        targetWord: 'meticulous',
        context: 'She was _____ in her research methodology.',
        difficulty: RetrievalDifficulty.CLOZE_FILL,
        expectedUsage: ['meticulous', 'very careful', 'extremely thorough'],
        distractorContexts: []
      };

      const response: LearnerResponse = {
        userId: 'user1',
        taskId: 'task2',
        response: 'meticulous',
        responseTime: 2500,
        confidence: 5,
        timestamp: new Date()
      };

      const score = await evaluator.evaluateResponse(task, response);

      expect(score.collocational).toBeDefined();
      expect(score.syntactic).toBeDefined();
      expect(score.semantic).toBeDefined();
      expect(score.fluency).toBeDefined();
      expect(score.overall).toBeGreaterThan(0);
    });

    test('should evaluate constrained generation tasks correctly', async () => {
      const task: ContextTransferTask = {
        wordId: 'word3',
        targetWord: 'ubiquitous',
        context: 'Technology in modern society',
        difficulty: RetrievalDifficulty.CONSTRAINED_GENERATION,
        expectedUsage: ['everywhere', 'omnipresent', 'pervasive'],
        distractorContexts: []
      };

      const response: LearnerResponse = {
        userId: 'user1',
        taskId: 'task3',
        response: 'Smartphones have become ubiquitous in our daily lives.',
        responseTime: 4500,
        confidence: 4,
        timestamp: new Date()
      };

      const score = await evaluator.evaluateResponse(task, response);

      expect(score.collocational).toBeDefined();
      expect(score.syntactic).toBeDefined();
      expect(score.pragmatic).toBeDefined();
      expect(score.semantic).toBeDefined();
      expect(score.fluency).toBeDefined();
      expect(score.overall).toBeGreaterThan(0);
    });

    test('should evaluate open paraphrase tasks correctly', async () => {
      const task: ContextTransferTask = {
        wordId: 'word4',
        targetWord: 'serendipity',
        context: 'Unexpected discoveries in research',
        difficulty: RetrievalDifficulty.OPEN_PARAPHRASE,
        expectedUsage: ['happy accident', 'fortunate discovery', 'pleasant surprise'],
        distractorContexts: []
      };

      const response: LearnerResponse = {
        userId: 'user1',
        taskId: 'task4',
        response: 'Serendipity refers to the phenomenon of making fortunate discoveries by accident, like when researchers stumble upon breakthrough findings while investigating something completely different.',
        responseTime: 8000,
        confidence: 3,
        timestamp: new Date()
      };

      const score = await evaluator.evaluateResponse(task, response);

      expect(score.collocational).toBeDefined();
      expect(score.syntactic).toBeDefined();
      expect(score.pragmatic).toBeDefined();
      expect(score.semantic).toBeDefined();
      expect(score.fluency).toBeDefined();
      expect(score.overall).toBeGreaterThan(0);
    });

    test('should handle batch evaluation efficiently', async () => {
      const tasks: ContextTransferTask[] = [
        {
          wordId: 'word1',
          targetWord: 'analyze',
          context: 'Research methodology',
          difficulty: RetrievalDifficulty.CLOZE_FILL,
          expectedUsage: ['examine', 'study'],
          distractorContexts: []
        },
        {
          wordId: 'word2',
          targetWord: 'synthesize',
          context: 'Academic writing',
          difficulty: RetrievalDifficulty.CONSTRAINED_GENERATION,
          expectedUsage: ['combine', 'integrate'],
          distractorContexts: []
        }
      ];

      const responses: LearnerResponse[] = [
        {
          userId: 'user1',
          taskId: 'task1',
          response: 'analyze',
          responseTime: 2000,
          confidence: 4,
          timestamp: new Date()
        },
        {
          userId: 'user1',
          taskId: 'task2',
          response: 'The author synthesizes multiple theories.',
          responseTime: 3500,
          confidence: 3,
          timestamp: new Date()
        }
      ];

      const scores = await evaluator.evaluateBatch(tasks, responses);

      expect(scores).toHaveLength(2);
      scores.forEach(score => {
        expect(score.overall).toBeGreaterThan(0);
        expect(score.overall).toBeLessThanOrEqual(1);
        expect(score.confidence).toBeGreaterThan(0);
        expect(score.explanation).toBeTruthy();
      });
    });

    test('should handle evaluation errors gracefully', async () => {
      // Create a provider that throws errors
      const errorProvider = {
        evaluate: async () => { throw new Error('API Error'); },
        evaluateBatch: async () => { throw new Error('Batch API Error'); }
      };

      const errorEvaluator = new ContextTransferEvaluator(errorProvider);

      const task: ContextTransferTask = {
        wordId: 'word1',
        targetWord: 'test',
        context: 'test context',
        difficulty: RetrievalDifficulty.RECOGNITION_MCQ,
        expectedUsage: ['test'],
        distractorContexts: []
      };

      const response: LearnerResponse = {
        userId: 'user1',
        taskId: 'task1',
        response: 'test response',
        responseTime: 1000,
        confidence: 3,
        timestamp: new Date()
      };

      // Should not throw, but return default scores
      const score = await errorEvaluator.evaluateResponse(task, response);
      
      expect(score.overall).toBe(0.5); // Default score
      expect(score.confidence).toBe(0.5);
      expect(score.explanation).toContain('error');
    });
  });

  describe('Mock LLM Provider', () => {
    test('should provide consistent mock responses', async () => {
      const prompt = 'Test evaluation prompt';
      
      const response1 = await mockProvider.evaluate(prompt);
      const response2 = await mockProvider.evaluate(prompt);
      
      // Should be consistent but with some variation
      expect(response1).toBeTruthy();
      expect(response2).toBeTruthy();
      
      // Parse responses to check structure
      const parsed1 = JSON.parse(response1);
      const parsed2 = JSON.parse(response2);
      
      expect(parsed1).toHaveProperty('explanation');
      expect(parsed2).toHaveProperty('explanation');
    });

    test('should handle different difficulty levels', async () => {
      const difficulties = [
        'RECOGNITION_MCQ',
        'CLOZE_FILL', 
        'CONSTRAINED_GENERATION',
        'OPEN_PARAPHRASE'
      ];

      for (const difficulty of difficulties) {
        const response = await mockProvider.evaluate(`Test prompt with ${difficulty}`);
        const parsed = JSON.parse(response);
        
        expect(parsed).toHaveProperty('explanation');
        expect(typeof parsed.explanation).toBe('string');
      }
    });

    test('should support custom mock responses', () => {
      const customResponse = `{
        "collocational": 0.95,
        "syntactic": 0.9,
        "explanation": "Custom test response"
      }`;

      mockProvider.addMockResponse('custom_test', customResponse);
      
      // Test that custom response is returned
      mockProvider.evaluate('This is a custom_test prompt').then(response => {
        expect(response).toBe(customResponse);
      });
    });
  });

  describe('Human Expert Validator', () => {
    let validator: HumanExpertValidator;

    beforeEach(() => {
      validator = new HumanExpertValidator();
    });

    test('should calculate inter-rater reliability correctly', () => {
      const taskId = 'task1';
      const responseId = 'response1';

      // Add multiple expert ratings
      const rating1: HumanExpertRating = {
        expertId: 'expert1',
        taskId,
        responseId,
        scores: {
          overall: 0.8,
          collocational: 0.8,
          syntactic: 0.75,
          pragmatic: 0.85,
          semantic: 0.9,
          fluency: 0.8,
          confidence: 0.9,
          explanation: 'Good performance'
        },
        timestamp: new Date()
      };

      const rating2: HumanExpertRating = {
        expertId: 'expert2',
        taskId,
        responseId,
        scores: {
          overall: 0.82,
          collocational: 0.85,
          syntactic: 0.8,
          pragmatic: 0.8,
          semantic: 0.88,
          fluency: 0.82,
          confidence: 0.85,
          explanation: 'Very good performance'
        },
        timestamp: new Date()
      };

      validator.addExpertRating(rating1);
      validator.addExpertRating(rating2);

      const reliability = validator.calculateInterRaterReliability(taskId, responseId);

      expect(reliability.cronbachAlpha).toBeGreaterThan(0);
      expect(reliability.averageAgreement).toBeGreaterThan(0);
      expect(reliability.averageAgreement).toBeLessThanOrEqual(1);
      expect(reliability.pearsonCorrelations).toHaveProperty('expert1_expert2');
    });

    test('should handle single expert ratings', () => {
      const taskId = 'task2';
      const responseId = 'response2';

      const rating: HumanExpertRating = {
        expertId: 'expert1',
        taskId,
        responseId,
        scores: {
          overall: 0.7,
          collocational: 0.7,
          syntactic: 0.65,
          pragmatic: 0.75,
          semantic: 0.8,
          fluency: 0.7,
          confidence: 0.8,
          explanation: 'Adequate performance'
        },
        timestamp: new Date()
      };

      validator.addExpertRating(rating);

      const reliability = validator.calculateInterRaterReliability(taskId, responseId);

      expect(reliability.cronbachAlpha).toBe(0);
      expect(reliability.averageAgreement).toBe(0);
      expect(Object.keys(reliability.pearsonCorrelations)).toHaveLength(0);
    });

    test('should calculate agreement for multiple experts', () => {
      const taskId = 'task3';
      const responseId = 'response3';

      // Add three expert ratings with varying agreement
      const experts = ['expert1', 'expert2', 'expert3'];
      const baseScores = [0.8, 0.75, 0.85, 0.9, 0.8];
      
      experts.forEach((expertId, index) => {
        const variation = (index - 1) * 0.05; // -0.05, 0, +0.05
        const rating: HumanExpertRating = {
          expertId,
          taskId,
          responseId,
          scores: {
            overall: baseScores[0] + variation,
            collocational: baseScores[0] + variation,
            syntactic: baseScores[1] + variation,
            pragmatic: baseScores[2] + variation,
            semantic: baseScores[3] + variation,
            fluency: baseScores[4] + variation,
            confidence: 0.8,
            explanation: `Rating from ${expertId}`
          },
          timestamp: new Date()
        };

        validator.addExpertRating(rating);
      });

      const reliability = validator.calculateInterRaterReliability(taskId, responseId);

      expect(reliability.cronbachAlpha).toBeGreaterThan(0.8); // Should be high due to small variations
      expect(reliability.averageAgreement).toBeGreaterThan(0.9); // Should be high agreement
      expect(Object.keys(reliability.pearsonCorrelations)).toHaveLength(3); // 3 pairs
    });
  });

  describe('LLM Provider Factory', () => {
    test('should create mock provider without API key', () => {
      const provider = LLMProviderFactory.createProvider('mock');
      expect(provider).toBeInstanceOf(MockLLMProvider);
    });

    test('should throw error for providers requiring API keys', () => {
      expect(() => {
        LLMProviderFactory.createProvider('openai');
      }).toThrow('API key required');

      expect(() => {
        LLMProviderFactory.createProvider('anthropic');
      }).toThrow('API key required');

      expect(() => {
        LLMProviderFactory.createProvider('gemini');
      }).toThrow('API key required');
    });

    test('should create providers with API keys', () => {
      const openaiProvider = LLMProviderFactory.createProvider('openai', 'test-key');
      const anthropicProvider = LLMProviderFactory.createProvider('anthropic', 'test-key');
      const geminiProvider = LLMProviderFactory.createProvider('gemini', 'test-key');

      expect(openaiProvider).toBeDefined();
      expect(anthropicProvider).toBeDefined();
      expect(geminiProvider).toBeDefined();
    });

    test('should get all available providers', () => {
      const apiKeys = {
        openai: 'test-openai-key',
        anthropic: 'test-anthropic-key',
        gemini: 'test-gemini-key'
      };

      const providers = LLMProviderFactory.getAllProviders(apiKeys);

      expect(providers).toHaveProperty('mock');
      expect(providers).toHaveProperty('openai');
      expect(providers).toHaveProperty('anthropic');
      expect(providers).toHaveProperty('gemini');
    });
  });

  describe('Provider Comparison', () => {
    test('should compare multiple providers', async () => {
      const providers = {
        mock1: new MockLLMProvider(),
        mock2: new MockLLMProvider()
      };

      const testPrompts = [
        'Evaluate: The student used "elaborate" correctly.',
        'Evaluate: The response shows good understanding.'
      ];

      const comparison = await LLMProviderComparator.compareProviders(providers, testPrompts);

      expect(comparison).toHaveProperty('mock1');
      expect(comparison).toHaveProperty('mock2');
      
      Object.values(comparison).forEach((result: any) => {
        expect(result).toHaveProperty('totalTime');
        expect(result).toHaveProperty('avgResponseTime');
        expect(result).toHaveProperty('successRate');
        expect(result.successRate).toBeGreaterThan(0);
      });
    });
  });

  describe('Integration Tests', () => {
    test('should complete full evaluation workflow', async () => {
      // Create a complete evaluation scenario
      const task: ContextTransferTask = {
        wordId: 'integration_test',
        targetWord: 'paradigm',
        context: 'Scientific research methodology',
        difficulty: RetrievalDifficulty.CONSTRAINED_GENERATION,
        expectedUsage: ['framework', 'model', 'approach'],
        distractorContexts: ['example', 'instance']
      };

      const response: LearnerResponse = {
        userId: 'test_user',
        taskId: 'integration_task',
        response: 'The new paradigm in machine learning emphasizes interpretability.',
        responseTime: 5000,
        confidence: 4,
        timestamp: new Date()
      };

      // Evaluate with LLM
      const llmScore = await evaluator.evaluateResponse(task, response);

      // Simulate human expert evaluation
      const validator = new HumanExpertValidator();
      const expertRating: HumanExpertRating = {
        expertId: 'expert_linguist',
        taskId: task.wordId,
        responseId: response.userId,
        scores: {
          overall: 0.85,
          collocational: 0.9,
          syntactic: 0.8,
          pragmatic: 0.85,
          semantic: 0.9,
          fluency: 0.85,
          confidence: 0.9,
          explanation: 'Excellent use of paradigm in appropriate context'
        },
        timestamp: new Date()
      };

      validator.addExpertRating(expertRating);

      // Verify both evaluations are reasonable
      expect(llmScore.overall).toBeGreaterThan(0.5);
      expect(llmScore.overall).toBeLessThanOrEqual(1);
      expect(expertRating.scores.overall).toBe(0.85);

      // The difference should be reasonable (within 0.3)
      const difference = Math.abs(llmScore.overall - expertRating.scores.overall);
      expect(difference).toBeLessThan(0.3);
    });
  });
});