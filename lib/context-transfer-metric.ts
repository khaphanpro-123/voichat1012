// lib/context-transfer-metric.ts
// ContextTransfer Metric: Multi-dimensional L2 Vocabulary Assessment
// LLM-as-a-Judge Framework for Productive Language Use Evaluation

import { RetrievalDifficulty } from './spacedRepetition';

/**
 * Core ContextTransfer Interfaces
 */
export interface ContextTransferTask {
  wordId: string;
  targetWord: string;
  context: string;
  difficulty: RetrievalDifficulty;
  expectedUsage: string[];      // Acceptable usage patterns
  distractorContexts: string[]; // Contexts that might confuse
}

export interface LearnerResponse {
  userId: string;
  taskId: string;
  response: string;
  responseTime: number;
  confidence: number; // Self-reported confidence [1-5]
  timestamp: Date;
}

export interface ContextTransferScore {
  overall: number;              // Combined score [0-1]
  collocational: number;        // Appropriate word combinations
  syntactic: number;           // Grammatical correctness
  pragmatic: number;           // Contextual appropriateness
  semantic: number;            // Meaning preservation
  fluency: number;             // Natural language flow
  confidence: number;          // Scoring confidence [0-1]
  explanation: string;         // Detailed feedback
}

export interface HumanExpertRating {
  expertId: string;
  taskId: string;
  responseId: string;
  scores: ContextTransferScore;
  timestamp: Date;
  notes?: string;
}

/**
 * LLM-as-a-Judge Evaluator
 * Implements multi-dimensional vocabulary assessment
 */
export class ContextTransferEvaluator {
  private llmProvider: LLMProvider;
  private evaluationPrompts: Map<RetrievalDifficulty, string>;
  private scoringRubric: ScoringRubric;

  constructor(llmProvider: LLMProvider) {
    this.llmProvider = llmProvider;
    this.evaluationPrompts = new Map();
    this.scoringRubric = new ScoringRubric();
    this.initializePrompts();
  }

  /**
   * Main evaluation function - Algorithm from paper
   */
  async evaluateResponse(
    task: ContextTransferTask,
    response: LearnerResponse
  ): Promise<ContextTransferScore> {
    // Step 1: Generate evaluation prompt based on difficulty
    const evaluationPrompt = this.generateEvaluationPrompt(task, response);
    
    // Step 2: Get LLM assessment
    const llmAssessment = await this.llmProvider.evaluate(evaluationPrompt);
    
    // Step 3: Parse and validate scores
    const parsedScores = this.parseLLMResponse(llmAssessment);
    
    // Step 4: Apply scoring rubric and normalization
    const normalizedScores = this.applyScoringRubric(parsedScores, task.difficulty);
    
    // Step 5: Calculate overall score with weighted combination
    const overallScore = this.calculateOverallScore(normalizedScores);
    
    return {
      ...normalizedScores,
      overall: overallScore,
      confidence: this.calculateScoringConfidence(llmAssessment),
      explanation: this.extractExplanation(llmAssessment)
    };
  }

  /**
   * Batch evaluation for efficiency
   */
  async evaluateBatch(
    tasks: ContextTransferTask[],
    responses: LearnerResponse[]
  ): Promise<ContextTransferScore[]> {
    const batchPrompt = this.generateBatchEvaluationPrompt(tasks, responses);
    const batchAssessment = await this.llmProvider.evaluate(batchPrompt);
    
    return this.parseBatchLLMResponse(batchAssessment, tasks.length);
  }

  private initializePrompts(): void {
    // Recognition MCQ evaluation prompt
    this.evaluationPrompts.set(RetrievalDifficulty.RECOGNITION_MCQ, `
You are an expert L2 English assessment specialist. Evaluate the learner's vocabulary recognition performance.

TASK: The learner was asked to recognize the meaning of "{targetWord}" in the context: "{context}"
RESPONSE: "{response}"

Evaluate on these dimensions (0.0-1.0 scale):

1. SEMANTIC ACCURACY: Does the response demonstrate correct understanding of the word's meaning?
2. CONTEXTUAL APPROPRIATENESS: Is the understanding appropriate for this specific context?
3. PRECISION: How precise and specific is the demonstrated understanding?

Provide scores and brief explanations in JSON format:
{
  "semantic": 0.0-1.0,
  "contextual": 0.0-1.0, 
  "precision": 0.0-1.0,
  "explanation": "detailed feedback"
}
    `);

    // Cloze fill evaluation prompt
    this.evaluationPrompts.set(RetrievalDifficulty.CLOZE_FILL, `
You are an expert L2 English assessment specialist. Evaluate the learner's cloze completion performance.

TASK: Fill in the blank with "{targetWord}" in context: "{context}"
LEARNER RESPONSE: "{response}"

Evaluate on these dimensions (0.0-1.0 scale):

1. COLLOCATIONAL: Are the word combinations natural and appropriate?
2. SYNTACTIC: Is the grammar and word form correct?
3. SEMANTIC: Does the word choice preserve the intended meaning?
4. FLUENCY: Does the completion sound natural to native speakers?

Provide scores and explanations in JSON format:
{
  "collocational": 0.0-1.0,
  "syntactic": 0.0-1.0,
  "semantic": 0.0-1.0,
  "fluency": 0.0-1.0,
  "explanation": "detailed feedback"
}
    `);

    // Constrained generation evaluation prompt
    this.evaluationPrompts.set(RetrievalDifficulty.CONSTRAINED_GENERATION, `
You are an expert L2 English assessment specialist. Evaluate the learner's constrained sentence generation.

TASK: Create a sentence using "{targetWord}" that demonstrates understanding in the context: "{context}"
LEARNER RESPONSE: "{response}"

Evaluate on these dimensions (0.0-1.0 scale):

1. COLLOCATIONAL: Natural word combinations and partnerships
2. SYNTACTIC: Grammatical correctness and appropriate word forms
3. PRAGMATIC: Contextual appropriateness and register
4. SEMANTIC: Accurate meaning demonstration
5. FLUENCY: Natural, native-like expression

Provide scores and explanations in JSON format:
{
  "collocational": 0.0-1.0,
  "syntactic": 0.0-1.0,
  "pragmatic": 0.0-1.0,
  "semantic": 0.0-1.0,
  "fluency": 0.0-1.0,
  "explanation": "detailed feedback with specific examples"
}
    `);

    // Open paraphrase evaluation prompt
    this.evaluationPrompts.set(RetrievalDifficulty.OPEN_PARAPHRASE, `
You are an expert L2 English assessment specialist. Evaluate the learner's open paraphrasing performance.

TASK: Paraphrase or explain "{targetWord}" demonstrating deep understanding in various contexts
ORIGINAL CONTEXT: "{context}"
LEARNER RESPONSE: "{response}"

Evaluate on these dimensions (0.0-1.0 scale):

1. COLLOCATIONAL: Sophisticated and varied word combinations
2. SYNTACTIC: Complex grammatical structures used correctly
3. PRAGMATIC: Appropriate register and contextual sensitivity
4. SEMANTIC: Deep, nuanced understanding of meaning
5. FLUENCY: Sophisticated, native-like expression
6. TRANSFER: Ability to use the word in novel contexts

Provide scores and explanations in JSON format:
{
  "collocational": 0.0-1.0,
  "syntactic": 0.0-1.0,
  "pragmatic": 0.0-1.0,
  "semantic": 0.0-1.0,
  "fluency": 0.0-1.0,
  "transfer": 0.0-1.0,
  "explanation": "comprehensive feedback with examples and suggestions"
}
    `);
  }

  private generateEvaluationPrompt(
    task: ContextTransferTask,
    response: LearnerResponse
  ): string {
    const template = this.evaluationPrompts.get(task.difficulty)!;
    
    return template
      .replace(/\{targetWord\}/g, task.targetWord)
      .replace(/\{context\}/g, task.context)
      .replace(/\{response\}/g, response.response);
  }

  private generateBatchEvaluationPrompt(
    tasks: ContextTransferTask[],
    responses: LearnerResponse[]
  ): string {
    let batchPrompt = `
You are an expert L2 English assessment specialist. Evaluate multiple learner responses efficiently.

INSTRUCTIONS: For each task-response pair, provide scores according to the difficulty level rubric.

TASKS AND RESPONSES:
`;

    for (let i = 0; i < tasks.length; i++) {
      const task = tasks[i];
      const response = responses[i];
      
      batchPrompt += `
ITEM ${i + 1}:
- Difficulty: ${RetrievalDifficulty[task.difficulty]}
- Target Word: "${task.targetWord}"
- Context: "${task.context}"
- Response: "${response.response}"
`;
    }

    batchPrompt += `
Provide evaluations in JSON array format with appropriate dimensions for each difficulty level.
`;

    return batchPrompt;
  }

  private parseLLMResponse(llmResponse: string): Partial<ContextTransferScore> {
    try {
      // Extract JSON from LLM response
      const jsonMatch = llmResponse.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in LLM response');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      // Validate and normalize scores
      const scores: Partial<ContextTransferScore> = {};
      
      if (typeof parsed.collocational === 'number') {
        scores.collocational = Math.max(0, Math.min(1, parsed.collocational));
      }
      if (typeof parsed.syntactic === 'number') {
        scores.syntactic = Math.max(0, Math.min(1, parsed.syntactic));
      }
      if (typeof parsed.pragmatic === 'number') {
        scores.pragmatic = Math.max(0, Math.min(1, parsed.pragmatic));
      }
      if (typeof parsed.semantic === 'number') {
        scores.semantic = Math.max(0, Math.min(1, parsed.semantic));
      }
      if (typeof parsed.fluency === 'number') {
        scores.fluency = Math.max(0, Math.min(1, parsed.fluency));
      }
      
      return scores;
    } catch (error) {
      console.error('Error parsing LLM response:', error);
      return this.getDefaultScores();
    }
  }

  private parseBatchLLMResponse(
    llmResponse: string,
    expectedCount: number
  ): ContextTransferScore[] {
    try {
      const jsonMatch = llmResponse.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error('No JSON array found in batch LLM response');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      if (!Array.isArray(parsed) || parsed.length !== expectedCount) {
        throw new Error(`Expected ${expectedCount} evaluations, got ${parsed.length}`);
      }

      return parsed.map((item, index) => {
        const scores = this.parseLLMResponse(JSON.stringify(item));
        return {
          ...this.getDefaultScores(),
          ...scores,
          overall: this.calculateOverallScore(scores),
          confidence: 0.8, // Default batch confidence
          explanation: item.explanation || `Batch evaluation ${index + 1}`
        };
      });
    } catch (error) {
      console.error('Error parsing batch LLM response:', error);
      // Return default scores for all items
      return Array.from({ length: expectedCount }, () => ({
        ...this.getDefaultScores(),
        overall: 0.5,
        confidence: 0.3,
        explanation: 'Error in batch evaluation'
      }));
    }
  }

  private applyScoringRubric(
    scores: Partial<ContextTransferScore>,
    difficulty: RetrievalDifficulty
  ): Partial<ContextTransferScore> {
    // Apply difficulty-specific adjustments
    const adjustedScores = { ...scores };
    
    switch (difficulty) {
      case RetrievalDifficulty.RECOGNITION_MCQ:
        // More lenient for recognition tasks
        Object.keys(adjustedScores).forEach(key => {
          if (typeof adjustedScores[key as keyof ContextTransferScore] === 'number') {
            adjustedScores[key as keyof ContextTransferScore] = 
              Math.min(1.0, (adjustedScores[key as keyof ContextTransferScore] as number) * 1.1);
          }
        });
        break;
        
      case RetrievalDifficulty.OPEN_PARAPHRASE:
        // More stringent for advanced tasks
        Object.keys(adjustedScores).forEach(key => {
          if (typeof adjustedScores[key as keyof ContextTransferScore] === 'number') {
            adjustedScores[key as keyof ContextTransferScore] = 
              (adjustedScores[key as keyof ContextTransferScore] as number) * 0.9;
          }
        });
        break;
    }
    
    return adjustedScores;
  }

  private calculateOverallScore(scores: Partial<ContextTransferScore>): number {
    // Weighted combination of available scores
    const weights = {
      collocational: 0.25,
      syntactic: 0.20,
      pragmatic: 0.20,
      semantic: 0.25,
      fluency: 0.10
    };
    
    let totalWeight = 0;
    let weightedSum = 0;
    
    Object.entries(weights).forEach(([dimension, weight]) => {
      const score = scores[dimension as keyof ContextTransferScore] as number;
      if (typeof score === 'number') {
        weightedSum += score * weight;
        totalWeight += weight;
      }
    });
    
    return totalWeight > 0 ? weightedSum / totalWeight : 0.5;
  }

  private calculateScoringConfidence(llmResponse: string): number {
    // Heuristic confidence based on response characteristics
    let confidence = 0.8; // Base confidence
    
    // Increase confidence for detailed explanations
    if (llmResponse.length > 200) confidence += 0.1;
    
    // Increase confidence for specific examples
    if (llmResponse.includes('example') || llmResponse.includes('specifically')) {
      confidence += 0.05;
    }
    
    // Decrease confidence for hedging language
    if (llmResponse.includes('might') || llmResponse.includes('possibly')) {
      confidence -= 0.1;
    }
    
    return Math.max(0.3, Math.min(0.95, confidence));
  }

  private extractExplanation(llmResponse: string): string {
    try {
      const jsonMatch = llmResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return parsed.explanation || 'No detailed explanation provided.';
      }
    } catch (error) {
      // Fallback to extracting text explanation
      const lines = llmResponse.split('\n');
      const explanationLines = lines.filter(line => 
        line.toLowerCase().includes('explanation') || 
        line.toLowerCase().includes('feedback')
      );
      
      if (explanationLines.length > 0) {
        return explanationLines.join(' ').trim();
      }
    }
    
    return 'Evaluation completed without detailed explanation.';
  }

  private getDefaultScores(): ContextTransferScore {
    return {
      overall: 0.5,
      collocational: 0.5,
      syntactic: 0.5,
      pragmatic: 0.5,
      semantic: 0.5,
      fluency: 0.5,
      confidence: 0.5,
      explanation: 'Default scores due to evaluation error'
    };
  }
}

/**
 * Scoring Rubric for Consistency
 */
class ScoringRubric {
  getCollocationalCriteria(difficulty: RetrievalDifficulty): string[] {
    switch (difficulty) {
      case RetrievalDifficulty.RECOGNITION_MCQ:
        return ['Basic word recognition', 'Simple associations'];
      case RetrievalDifficulty.CLOZE_FILL:
        return ['Natural word combinations', 'Common collocations'];
      case RetrievalDifficulty.CONSTRAINED_GENERATION:
        return ['Varied collocations', 'Context-appropriate partnerships'];
      case RetrievalDifficulty.OPEN_PARAPHRASE:
        return ['Sophisticated combinations', 'Creative but natural usage'];
      default:
        return ['Basic collocational awareness'];
    }
  }

  getSyntacticCriteria(difficulty: RetrievalDifficulty): string[] {
    switch (difficulty) {
      case RetrievalDifficulty.RECOGNITION_MCQ:
        return ['Basic grammatical awareness'];
      case RetrievalDifficulty.CLOZE_FILL:
        return ['Correct word form', 'Basic grammatical integration'];
      case RetrievalDifficulty.CONSTRAINED_GENERATION:
        return ['Complex sentence structures', 'Varied grammatical patterns'];
      case RetrievalDifficulty.OPEN_PARAPHRASE:
        return ['Sophisticated syntax', 'Multiple grammatical constructions'];
      default:
        return ['Basic syntactic correctness'];
    }
  }
}

/**
 * LLM Provider Interface
 */
export interface LLMProvider {
  evaluate(prompt: string): Promise<string>;
  evaluateBatch(prompts: string[]): Promise<string[]>;
}

/**
 * Human Expert Validation Framework
 */
export class HumanExpertValidator {
  private expertRatings: Map<string, HumanExpertRating[]>;
  
  constructor() {
    this.expertRatings = new Map();
  }

  addExpertRating(rating: HumanExpertRating): void {
    const key = `${rating.taskId}_${rating.responseId}`;
    if (!this.expertRatings.has(key)) {
      this.expertRatings.set(key, []);
    }
    this.expertRatings.get(key)!.push(rating);
  }

  calculateInterRaterReliability(taskId: string, responseId: string): {
    cronbachAlpha: number;
    pearsonCorrelations: Record<string, number>;
    averageAgreement: number;
  } {
    const key = `${taskId}_${responseId}`;
    const ratings = this.expertRatings.get(key) || [];
    
    if (ratings.length < 2) {
      return {
        cronbachAlpha: 0,
        pearsonCorrelations: {},
        averageAgreement: 0
      };
    }

    // Calculate Cronbach's Alpha (simplified)
    const dimensions = ['collocational', 'syntactic', 'pragmatic', 'semantic', 'fluency'];
    const cronbachAlpha = this.calculateCronbachAlpha(ratings, dimensions);
    
    // Calculate pairwise Pearson correlations
    const pearsonCorrelations = this.calculatePairwiseCorrelations(ratings);
    
    // Calculate average agreement
    const averageAgreement = this.calculateAverageAgreement(ratings);
    
    return {
      cronbachAlpha,
      pearsonCorrelations,
      averageAgreement
    };
  }

  private calculateCronbachAlpha(
    ratings: HumanExpertRating[],
    dimensions: string[]
  ): number {
    // Simplified Cronbach's Alpha calculation
    const n = ratings.length;
    const k = dimensions.length;
    
    if (n < 2 || k < 2) return 0;
    
    // Calculate variance for each dimension
    const dimensionVariances = dimensions.map(dim => {
      const scores = ratings.map(r => r.scores[dim as keyof ContextTransferScore] as number);
      return this.calculateVariance(scores);
    });
    
    // Calculate total score variance
    const totalScores = ratings.map(r => 
      dimensions.reduce((sum, dim) => 
        sum + (r.scores[dim as keyof ContextTransferScore] as number), 0
      )
    );
    const totalVariance = this.calculateVariance(totalScores);
    
    const sumDimensionVariances = dimensionVariances.reduce((sum, v) => sum + v, 0);
    
    return (k / (k - 1)) * (1 - sumDimensionVariances / totalVariance);
  }

  private calculatePairwiseCorrelations(
    ratings: HumanExpertRating[]
  ): Record<string, number> {
    const correlations: Record<string, number> = {};
    
    for (let i = 0; i < ratings.length; i++) {
      for (let j = i + 1; j < ratings.length; j++) {
        const expert1 = ratings[i].expertId;
        const expert2 = ratings[j].expertId;
        const key = `${expert1}_${expert2}`;
        
        correlations[key] = this.calculatePearsonCorrelation(
          ratings[i].scores,
          ratings[j].scores
        );
      }
    }
    
    return correlations;
  }

  private calculateAverageAgreement(ratings: HumanExpertRating[]): number {
    if (ratings.length < 2) return 0;
    
    const dimensions = ['collocational', 'syntactic', 'pragmatic', 'semantic', 'fluency'];
    let totalAgreement = 0;
    let comparisons = 0;
    
    for (let i = 0; i < ratings.length; i++) {
      for (let j = i + 1; j < ratings.length; j++) {
        dimensions.forEach(dim => {
          const score1 = ratings[i].scores[dim as keyof ContextTransferScore] as number;
          const score2 = ratings[j].scores[dim as keyof ContextTransferScore] as number;
          const agreement = 1 - Math.abs(score1 - score2); // Agreement as 1 - absolute difference
          totalAgreement += agreement;
          comparisons++;
        });
      }
    }
    
    return comparisons > 0 ? totalAgreement / comparisons : 0;
  }

  private calculateVariance(values: number[]): number {
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    return squaredDiffs.reduce((sum, diff) => sum + diff, 0) / values.length;
  }

  private calculatePearsonCorrelation(
    scores1: ContextTransferScore,
    scores2: ContextTransferScore
  ): number {
    const dimensions = ['collocational', 'syntactic', 'pragmatic', 'semantic', 'fluency'];
    const values1 = dimensions.map(dim => scores1[dim as keyof ContextTransferScore] as number);
    const values2 = dimensions.map(dim => scores2[dim as keyof ContextTransferScore] as number);
    
    const n = values1.length;
    const sum1 = values1.reduce((sum, val) => sum + val, 0);
    const sum2 = values2.reduce((sum, val) => sum + val, 0);
    const sum1Sq = values1.reduce((sum, val) => sum + val * val, 0);
    const sum2Sq = values2.reduce((sum, val) => sum + val * val, 0);
    const sumProducts = values1.reduce((sum, val, i) => sum + val * values2[i], 0);
    
    const numerator = n * sumProducts - sum1 * sum2;
    const denominator = Math.sqrt((n * sum1Sq - sum1 * sum1) * (n * sum2Sq - sum2 * sum2));
    
    return denominator !== 0 ? numerator / denominator : 0;
  }
}