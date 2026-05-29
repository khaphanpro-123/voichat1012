// lib/carts-scheduler.ts
// CARTS: Contextual Adaptive Retrieval-Type Scheduler
// Deep Reinforcement Learning Framework for Joint Scheduling

import { RetrievalDifficulty, DARTFeatures, InteractionLog } from './spacedRepetition';

/**
 * CARTS Core Interfaces
 */
export interface LearnerState {
  userId: string;
  wordId: string;
  interactionHistory: InteractionLog[];
  currentFeatures: DARTFeatures;
  contextHistory: string[];
  memoryStability: number;
}

export interface CARTSAction {
  difficulty: RetrievalDifficulty;
  context: string;
  contextEmbedding: number[];
}

export interface CARTSReward {
  correctness: number;      // Binary: 0 or 1
  contextTransfer: number;  // ContextTransfer metric score
  responseTime: number;     // Normalized response time penalty
  total: number;           // Weighted combination
}

export interface TransformerConfig {
  modelDim: number;        // d_model
  numHeads: number;        // Multi-head attention
  numLayers: number;       // Transformer layers
  feedforwardDim: number;  // FFN hidden size
  maxSequenceLength: number;
  dropoutRate: number;
}

export interface PPOConfig {
  learningRate: number;
  clipEpsilon: number;     // PPO clipping parameter
  valueCoeff: number;      // Value loss coefficient
  entropyCoeff: number;    // Entropy bonus coefficient
  gamma: number;           // Discount factor
  lambda: number;          // GAE lambda
  batchSize: number;
  epochs: number;
}

/**
 * Transformer-based State Encoder
 * Encodes interaction history into dense representations
 */
export class TransformerStateEncoder {
  private config: TransformerConfig;
  private weights: Map<string, number[][]>;
  
  constructor(config: TransformerConfig) {
    this.config = config;
    this.weights = new Map();
    this.initializeWeights();
  }

  private initializeWeights(): void {
    // Initialize transformer weights (simplified version)
    // In full implementation, this would use proper Xavier/He initialization
    const { modelDim, numHeads, numLayers, feedforwardDim } = this.config;
    
    for (let layer = 0; layer < numLayers; layer++) {
      // Multi-head attention weights
      this.weights.set(`layer_${layer}_wq`, this.randomMatrix(modelDim, modelDim));
      this.weights.set(`layer_${layer}_wk`, this.randomMatrix(modelDim, modelDim));
      this.weights.set(`layer_${layer}_wv`, this.randomMatrix(modelDim, modelDim));
      this.weights.set(`layer_${layer}_wo`, this.randomMatrix(modelDim, modelDim));
      
      // Feed-forward weights
      this.weights.set(`layer_${layer}_ff1`, this.randomMatrix(modelDim, feedforwardDim));
      this.weights.set(`layer_${layer}_ff2`, this.randomMatrix(feedforwardDim, modelDim));
    }
  }

  private randomMatrix(rows: number, cols: number): number[][] {
    const matrix: number[][] = [];
    const scale = Math.sqrt(2.0 / (rows + cols)); // Xavier initialization
    
    for (let i = 0; i < rows; i++) {
      matrix[i] = [];
      for (let j = 0; j < cols; j++) {
        matrix[i][j] = (Math.random() - 0.5) * 2 * scale;
      }
    }
    return matrix;
  }

  /**
   * Encode interaction sequence into state representation
   * h_t = f_ψ({r_i, d_i, e_c_i}_{i=1}^{t-1})
   */
  encode(interactionHistory: InteractionLog[]): number[] {
    // Convert interactions to input embeddings
    const inputEmbeddings = this.createInputEmbeddings(interactionHistory);
    
    // Apply positional encoding
    const positionEncoded = this.addPositionalEncoding(inputEmbeddings);
    
    // Pass through transformer layers
    let hidden = positionEncoded;
    for (let layer = 0; layer < this.config.numLayers; layer++) {
      hidden = this.transformerLayer(hidden, layer);
    }
    
    // Pool to single vector (mean pooling)
    return this.meanPool(hidden);
  }

  private createInputEmbeddings(interactions: InteractionLog[]): number[][] {
    const embeddings: number[][] = [];
    
    for (const interaction of interactions.slice(-this.config.maxSequenceLength)) {
      // Create embedding from interaction features
      const embedding = new Array(this.config.modelDim).fill(0);
      
      // Encode correctness
      embedding[0] = interaction.isCorrect ? 1.0 : -1.0;
      
      // Encode difficulty (one-hot style)
      embedding[1 + interaction.difficulty] = 1.0;
      
      // Encode normalized response time
      embedding[5] = Math.log(interaction.responseTime / 1000) / 10; // Normalize
      
      // Encode context embedding (first few dimensions)
      const contextEmb = this.getContextEmbedding(interaction.context);
      for (let i = 0; i < Math.min(contextEmb.length, this.config.modelDim - 10); i++) {
        embedding[10 + i] = contextEmb[i];
      }
      
      embeddings.push(embedding);
    }
    
    return embeddings;
  }

  private getContextEmbedding(context: string): number[] {
    // Simplified context embedding (in practice, use BERT/sentence-transformers)
    const words = context.toLowerCase().split(' ');
    const embedding = new Array(128).fill(0);
    
    // Simple bag-of-words style embedding
    for (let i = 0; i < words.length && i < embedding.length; i++) {
      const hash = this.simpleHash(words[i]);
      embedding[hash % embedding.length] += 1.0 / words.length;
    }
    
    return embedding;
  }

  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  private addPositionalEncoding(embeddings: number[][]): number[][] {
    const result: number[][] = [];
    
    for (let pos = 0; pos < embeddings.length; pos++) {
      const encoded = [...embeddings[pos]];
      
      for (let i = 0; i < this.config.modelDim; i += 2) {
        const angle = pos / Math.pow(10000, i / this.config.modelDim);
        if (i < encoded.length) encoded[i] += Math.sin(angle);
        if (i + 1 < encoded.length) encoded[i + 1] += Math.cos(angle);
      }
      
      result.push(encoded);
    }
    
    return result;
  }

  private transformerLayer(input: number[][], layerIndex: number): number[][] {
    // Simplified transformer layer implementation
    // In practice, this would be much more sophisticated
    
    // Multi-head self-attention (simplified)
    const attended = this.multiHeadAttention(input, layerIndex);
    
    // Add & Norm
    const residual1 = this.addAndNorm(input, attended);
    
    // Feed-forward
    const feedForward = this.feedForwardNetwork(residual1, layerIndex);
    
    // Add & Norm
    return this.addAndNorm(residual1, feedForward);
  }

  private multiHeadAttention(input: number[][], layerIndex: number): number[][] {
    // Simplified single-head attention for demonstration
    const seqLen = input.length;
    const modelDim = this.config.modelDim;
    
    // Compute attention scores (simplified)
    const scores: number[][] = [];
    for (let i = 0; i < seqLen; i++) {
      scores[i] = [];
      for (let j = 0; j < seqLen; j++) {
        // Dot product attention
        let score = 0;
        for (let k = 0; k < modelDim; k++) {
          score += input[i][k] * input[j][k];
        }
        scores[i][j] = score / Math.sqrt(modelDim);
      }
    }
    
    // Apply softmax
    const attentionWeights = scores.map(row => this.softmax(row));
    
    // Apply attention to values
    const output: number[][] = [];
    for (let i = 0; i < seqLen; i++) {
      output[i] = new Array(modelDim).fill(0);
      for (let j = 0; j < seqLen; j++) {
        for (let k = 0; k < modelDim; k++) {
          output[i][k] += attentionWeights[i][j] * input[j][k];
        }
      }
    }
    
    return output;
  }

  private feedForwardNetwork(input: number[][], layerIndex: number): number[][] {
    const ff1Weights = this.weights.get(`layer_${layerIndex}_ff1`)!;
    const ff2Weights = this.weights.get(`layer_${layerIndex}_ff2`)!;
    
    return input.map(vector => {
      // First linear layer + ReLU
      const hidden = this.matrixVectorMultiply(ff1Weights, vector).map(x => Math.max(0, x));
      
      // Second linear layer
      return this.matrixVectorMultiply(ff2Weights, hidden);
    });
  }

  private addAndNorm(input: number[][], residual: number[][]): number[][] {
    return input.map((vector, i) => {
      // Add residual connection
      const added = vector.map((val, j) => val + residual[i][j]);
      
      // Layer normalization (simplified)
      const mean = added.reduce((sum, val) => sum + val, 0) / added.length;
      const variance = added.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / added.length;
      const std = Math.sqrt(variance + 1e-8);
      
      return added.map(val => (val - mean) / std);
    });
  }

  private meanPool(sequences: number[][]): number[] {
    if (sequences.length === 0) return new Array(this.config.modelDim).fill(0);
    
    const pooled = new Array(this.config.modelDim).fill(0);
    for (const seq of sequences) {
      for (let i = 0; i < seq.length && i < pooled.length; i++) {
        pooled[i] += seq[i] / sequences.length;
      }
    }
    
    return pooled;
  }

  private softmax(logits: number[]): number[] {
    const maxLogit = Math.max(...logits);
    const exps = logits.map(x => Math.exp(x - maxLogit));
    const sumExps = exps.reduce((sum, exp) => sum + exp, 0);
    return exps.map(exp => exp / sumExps);
  }

  private matrixVectorMultiply(matrix: number[][], vector: number[]): number[] {
    return matrix.map(row => 
      row.reduce((sum, weight, i) => sum + weight * (vector[i] || 0), 0)
    );
  }
}
/**
 * PPO Policy Network
 * Learns joint action selection: π_θ(d_t, c_t | h_t)
 */
export class PPOPolicy {
  private config: PPOConfig;
  private actorWeights: Map<string, number[][]>;
  private criticWeights: Map<string, number[][]>;
  private memoryEstimatorWeights: Map<string, number[][]>;
  
  constructor(config: PPOConfig, stateDim: number) {
    this.config = config;
    this.actorWeights = new Map();
    this.criticWeights = new Map();
    this.memoryEstimatorWeights = new Map();
    this.initializeNetworks(stateDim);
  }

  private initializeNetworks(stateDim: number): void {
    const hiddenDim = 256;
    
    // Actor network (policy): state -> action probabilities
    this.actorWeights.set('fc1', this.randomMatrix(stateDim, hiddenDim));
    this.actorWeights.set('fc2', this.randomMatrix(hiddenDim, hiddenDim));
    this.actorWeights.set('difficulty_head', this.randomMatrix(hiddenDim, 4)); // 4 difficulty levels
    this.actorWeights.set('context_head', this.randomMatrix(hiddenDim, 128)); // Context embedding dim
    
    // Critic network (value function): state -> value estimate
    this.criticWeights.set('fc1', this.randomMatrix(stateDim, hiddenDim));
    this.criticWeights.set('fc2', this.randomMatrix(hiddenDim, hiddenDim));
    this.criticWeights.set('value_head', this.randomMatrix(hiddenDim, 1));
    
    // Memory stability estimator: state -> memory estimate
    this.memoryEstimatorWeights.set('fc1', this.randomMatrix(stateDim, hiddenDim));
    this.memoryEstimatorWeights.set('fc2', this.randomMatrix(hiddenDim, 64));
    this.memoryEstimatorWeights.set('memory_head', this.randomMatrix(64, 1));
  }

  private randomMatrix(rows: number, cols: number): number[][] {
    const matrix: number[][] = [];
    const scale = Math.sqrt(2.0 / (rows + cols));
    
    for (let i = 0; i < rows; i++) {
      matrix[i] = [];
      for (let j = 0; j < cols; j++) {
        matrix[i][j] = (Math.random() - 0.5) * 2 * scale;
      }
    }
    return matrix;
  }

  /**
   * Sample action from policy: (d_t, c_t) ~ π_θ(·|h_t)
   */
  sampleAction(state: number[], availableContexts: string[]): {
    difficulty: RetrievalDifficulty;
    context: string;
    logProb: number;
  } {
    const { difficultyProbs, contextEmbedding } = this.forward(state);
    
    // Sample difficulty
    const difficulty = this.sampleFromDistribution(difficultyProbs) as RetrievalDifficulty;
    
    // Select context using max-min diversity criterion
    const context = this.selectDiverseContext(contextEmbedding, availableContexts);
    
    // Calculate log probability
    const logProb = Math.log(difficultyProbs[difficulty] + 1e-8);
    
    return { difficulty, context, logProb };
  }

  /**
   * Get action probabilities (for training)
   */
  getActionProbabilities(state: number[], difficulty: RetrievalDifficulty): number {
    const { difficultyProbs } = this.forward(state);
    return difficultyProbs[difficulty];
  }

  /**
   * Estimate state value V_φ(h_t)
   */
  estimateValue(state: number[]): number {
    const hidden1 = this.relu(this.matrixVectorMultiply(
      this.criticWeights.get('fc1')!, state
    ));
    const hidden2 = this.relu(this.matrixVectorMultiply(
      this.criticWeights.get('fc2')!, hidden1
    ));
    const value = this.matrixVectorMultiply(
      this.criticWeights.get('value_head')!, hidden2
    );
    
    return value[0];
  }

  /**
   * Estimate memory stability ĝ_ω(h_t)
   */
  estimateMemoryStability(state: number[]): number {
    const hidden1 = this.relu(this.matrixVectorMultiply(
      this.memoryEstimatorWeights.get('fc1')!, state
    ));
    const hidden2 = this.relu(this.matrixVectorMultiply(
      this.memoryEstimatorWeights.get('fc2')!, hidden1
    ));
    const memory = this.matrixVectorMultiply(
      this.memoryEstimatorWeights.get('memory_head')!, hidden2
    );
    
    return Math.max(0.1, memory[0]); // Ensure positive memory stability
  }

  private forward(state: number[]): {
    difficultyProbs: number[];
    contextEmbedding: number[];
  } {
    // Shared hidden layers
    const hidden1 = this.relu(this.matrixVectorMultiply(
      this.actorWeights.get('fc1')!, state
    ));
    const hidden2 = this.relu(this.matrixVectorMultiply(
      this.actorWeights.get('fc2')!, hidden1
    ));
    
    // Difficulty head
    const difficultyLogits = this.matrixVectorMultiply(
      this.actorWeights.get('difficulty_head')!, hidden2
    );
    const difficultyProbs = this.softmax(difficultyLogits);
    
    // Context embedding head
    const contextEmbedding = this.matrixVectorMultiply(
      this.actorWeights.get('context_head')!, hidden2
    );
    
    return { difficultyProbs, contextEmbedding };
  }

  private selectDiverseContext(
    targetEmbedding: number[], 
    availableContexts: string[]
  ): string {
    if (availableContexts.length === 0) {
      return "The word appears in various contexts."; // Default context
    }
    
    // For now, select randomly (in full implementation, use semantic similarity)
    const randomIndex = Math.floor(Math.random() * availableContexts.length);
    return availableContexts[randomIndex];
  }

  private sampleFromDistribution(probs: number[]): number {
    const random = Math.random();
    let cumulative = 0;
    
    for (let i = 0; i < probs.length; i++) {
      cumulative += probs[i];
      if (random <= cumulative) {
        return i;
      }
    }
    
    return probs.length - 1; // Fallback
  }

  private relu(vector: number[]): number[] {
    return vector.map(x => Math.max(0, x));
  }

  private softmax(logits: number[]): number[] {
    const maxLogit = Math.max(...logits);
    const exps = logits.map(x => Math.exp(x - maxLogit));
    const sumExps = exps.reduce((sum, exp) => sum + exp, 0);
    return exps.map(exp => exp / sumExps);
  }

  private matrixVectorMultiply(matrix: number[][], vector: number[]): number[] {
    return matrix.map(row => 
      row.reduce((sum, weight, i) => sum + weight * (vector[i] || 0), 0)
    );
  }

  /**
   * PPO Update (simplified version)
   */
  updatePolicy(
    states: number[][],
    actions: RetrievalDifficulty[],
    advantages: number[],
    oldLogProbs: number[],
    returns: number[]
  ): void {
    // This is a placeholder for the full PPO update algorithm
    // In practice, this would involve:
    // 1. Computing policy ratios r_t(θ) = π_θ(a_t|s_t) / π_θ_old(a_t|s_t)
    // 2. Clipped surrogate objective
    // 3. Value function loss
    // 4. Entropy bonus
    // 5. Gradient computation and parameter updates
    
    console.log(`PPO Update: ${states.length} samples, avg advantage: ${
      advantages.reduce((sum, adv) => sum + adv, 0) / advantages.length
    }`);
  }
}

/**
 * Main CARTS Scheduler
 * Orchestrates the complete system
 */
export class CARTSScheduler {
  private stateEncoder: TransformerStateEncoder;
  private policy: PPOPolicy;
  private contextDatabase: Map<string, string[]>; // wordId -> available contexts
  private rewardWeights: { correctness: number; contextTransfer: number; responseTime: number };
  
  constructor(
    transformerConfig: TransformerConfig,
    ppoConfig: PPOConfig
  ) {
    this.stateEncoder = new TransformerStateEncoder(transformerConfig);
    this.policy = new PPOPolicy(ppoConfig, transformerConfig.modelDim);
    this.contextDatabase = new Map();
    this.rewardWeights = {
      correctness: 0.4,
      contextTransfer: 0.4,
      responseTime: 0.2
    };
  }

  /**
   * Main scheduling function - Algorithm 4 from paper
   */
  scheduleReview(learnerState: LearnerState): {
    difficulty: RetrievalDifficulty;
    context: string;
    interval: number;
    memoryStability: number;
  } {
    // Step 1: Encode state h_t = f_ψ(τ)
    const stateVector = this.stateEncoder.encode(learnerState.interactionHistory);
    
    // Step 2: Estimate memory stability m̂_t = g_ω(h_t)
    const memoryStability = this.policy.estimateMemoryStability(stateVector);
    
    // Step 3: Calculate optimal interval t_next = m̂_t × log₂(1/τ_target)
    const interval = Math.ceil(memoryStability * Math.log2(1 / 0.9));
    
    // Step 4: Select difficulty greedily d* = argmax π_θ(d|h_t)
    const availableContexts = this.contextDatabase.get(learnerState.wordId) || [];
    const action = this.policy.sampleAction(stateVector, availableContexts);
    
    return {
      difficulty: action.difficulty,
      context: action.context,
      interval,
      memoryStability
    };
  }

  /**
   * Process learning outcome and update policy
   */
  processOutcome(
    learnerState: LearnerState,
    action: CARTSAction,
    isCorrect: boolean,
    responseTime: number,
    contextTransferScore: number
  ): void {
    // Calculate multi-objective reward
    const reward = this.calculateReward(isCorrect, responseTime, contextTransferScore);
    
    // Log interaction for future training
    const newInteraction: InteractionLog = {
      wordId: learnerState.wordId,
      timestamp: new Date(),
      difficulty: action.difficulty,
      isCorrect,
      responseTime,
      context: action.context,
      features: learnerState.currentFeatures
    };
    
    // Add to history
    learnerState.interactionHistory.push(newInteraction);
    learnerState.contextHistory.push(action.context);
    
    // In full implementation, this would trigger policy updates
    console.log(`Outcome processed: reward=${reward.total}, difficulty=${action.difficulty}`);
  }

  private calculateReward(
    isCorrect: boolean,
    responseTime: number,
    contextTransferScore: number
  ): CARTSReward {
    const correctness = isCorrect ? 1.0 : 0.0;
    const normalizedResponseTime = Math.max(0, 1.0 - responseTime / 10000); // Penalty for slow responses
    
    const total = 
      this.rewardWeights.correctness * correctness +
      this.rewardWeights.contextTransfer * contextTransferScore +
      this.rewardWeights.responseTime * normalizedResponseTime;
    
    return {
      correctness,
      contextTransfer: contextTransferScore,
      responseTime: normalizedResponseTime,
      total
    };
  }

  /**
   * Add contexts for a word (for context diversity)
   */
  addContextsForWord(wordId: string, contexts: string[]): void {
    this.contextDatabase.set(wordId, contexts);
  }

  /**
   * Training interface (placeholder)
   */
  trainOnBatch(experiences: any[]): void {
    // Placeholder for batch training
    console.log(`Training on batch of ${experiences.length} experiences`);
  }
}