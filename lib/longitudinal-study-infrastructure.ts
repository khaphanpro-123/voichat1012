// lib/longitudinal-study-infrastructure.ts
// Longitudinal Study Infrastructure for CARTS Research
// 8-week study with 200 L2 English learners

import { 
  DARTScheduler, 
  RetrievalDifficulty, 
  DARTFeatures, 
  InteractionLog,
  calculateFeatures 
} from './spacedRepetition';
import { CARTSScheduler } from './carts-scheduler';
import { BaseScheduler, SchedulerFactory } from './baseline-schedulers';
import { 
  ContextTransferEvaluator, 
  ContextTransferTask, 
  LearnerResponse, 
  ContextTransferScore 
} from './context-transfer-metric';
import { LLMProviderFactory } from './llm-providers';

/**
 * Study Configuration and Participant Management
 */
export interface StudyConfiguration {
  studyId: string;
  title: string;
  description: string;
  startDate: Date;
  endDate: Date;
  targetParticipants: number;
  vocabularySetSize: number;
  sessionFrequency: 'daily' | 'every-other-day' | 'weekly';
  minSessionsPerWeek: number;
  maxSessionDuration: number; // minutes
  algorithms: SchedulerAlgorithm[];
  evaluationSchedule: EvaluationSchedule;
}

export interface SchedulerAlgorithm {
  name: 'SM-2' | 'HLR' | 'KARL' | 'LECTOR' | 'DART' | 'CARTS';
  displayName: string;
  description: string;
  parameters?: any;
}

export interface EvaluationSchedule {
  preTest: boolean;
  postTest: boolean;
  weeklyAssessments: boolean;
  contextTransferTests: number[]; // Week numbers for transfer tests
  retentionTests: number[]; // Week numbers for retention tests
}

export interface StudyParticipant {
  participantId: string;
  userId: string;
  studyId: string;
  assignedAlgorithm: string;
  enrollmentDate: Date;
  demographicData: DemographicData;
  proficiencyLevel: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
  vocabularySet: VocabularyItem[];
  sessionHistory: StudySession[];
  assessmentResults: AssessmentResult[];
  status: 'enrolled' | 'active' | 'completed' | 'withdrawn';
  consentGiven: boolean;
  dataRetentionConsent: boolean;
}

export interface DemographicData {
  age: number;
  gender: 'male' | 'female' | 'other' | 'prefer-not-to-say';
  nativeLanguage: string;
  educationLevel: 'high-school' | 'undergraduate' | 'graduate' | 'postgraduate';
  englishLearningYears: number;
  previousSRSExperience: boolean;
  studyMotivation: string;
  timeZone: string;
}

export interface VocabularyItem {
  wordId: string;
  word: string;
  definition: string;
  partOfSpeech: string;
  frequency: number; // Log frequency in corpus
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  contexts: string[];
  semanticEmbedding: number[];
  firstEncounter?: Date;
  masteryLevel: number; // 0-1 scale
}

export interface StudySession {
  sessionId: string;
  participantId: string;
  startTime: Date;
  endTime: Date;
  interactions: InteractionLog[];
  contextTransferTasks: ContextTransferTask[];
  contextTransferResponses: LearnerResponse[];
  sessionMetrics: SessionMetrics;
  technicalIssues: string[];
}

export interface SessionMetrics {
  totalInteractions: number;
  correctResponses: number;
  averageResponseTime: number;
  difficultyProgression: RetrievalDifficulty[];
  contextDiversity: number;
  engagementScore: number; // 0-1 based on session behavior
  cognitiveLoad: number; // Self-reported 1-5 scale
}

export interface AssessmentResult {
  assessmentId: string;
  participantId: string;
  assessmentType: 'pre-test' | 'post-test' | 'weekly' | 'retention' | 'transfer';
  weekNumber: number;
  completionDate: Date;
  scores: {
    overallScore: number;
    retentionRate: number;
    contextTransferScore: number;
    learningEfficiency: number;
    vocabularyGrowth: number;
  };
  detailedResults: ContextTransferScore[];
}

/**
 * Participant Management System
 */
export class ParticipantManager {
  private participants: Map<string, StudyParticipant>;
  private studyConfig: StudyConfiguration;
  private randomizationSeed: number;

  constructor(studyConfig: StudyConfiguration, randomizationSeed?: number) {
    this.participants = new Map();
    this.studyConfig = studyConfig;
    this.randomizationSeed = randomizationSeed || Date.now();
  }

  /**
   * Enroll new participant with randomized algorithm assignment
   */
  enrollParticipant(
    userId: string,
    demographicData: DemographicData,
    proficiencyLevel: string,
    consentGiven: boolean
  ): StudyParticipant {
    const participantId = this.generateParticipantId();
    
    // Stratified randomization based on proficiency level
    const assignedAlgorithm = this.assignAlgorithm(proficiencyLevel as any);
    
    // Generate personalized vocabulary set
    const vocabularySet = this.generateVocabularySet(proficiencyLevel as any);
    
    const participant: StudyParticipant = {
      participantId,
      userId,
      studyId: this.studyConfig.studyId,
      assignedAlgorithm,
      enrollmentDate: new Date(),
      demographicData,
      proficiencyLevel: proficiencyLevel as any,
      vocabularySet,
      sessionHistory: [],
      assessmentResults: [],
      status: 'enrolled',
      consentGiven,
      dataRetentionConsent: consentGiven
    };

    this.participants.set(participantId, participant);
    
    console.log(`Participant ${participantId} enrolled with algorithm: ${assignedAlgorithm}`);
    return participant;
  }

  /**
   * Stratified randomization to ensure balanced groups
   */
  private assignAlgorithm(proficiencyLevel: string): string {
    const algorithms = this.studyConfig.algorithms.map(a => a.name);
    const participantCount = this.getParticipantCountByLevel(proficiencyLevel);
    
    // Use modulo for balanced assignment within proficiency level
    const algorithmIndex = participantCount % algorithms.length;
    return algorithms[algorithmIndex];
  }

  private getParticipantCountByLevel(proficiencyLevel: string): number {
    return Array.from(this.participants.values())
      .filter(p => p.proficiencyLevel === proficiencyLevel).length;
  }

  private generateParticipantId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    return `P_${timestamp}_${random}`.toUpperCase();
  }

  private generateVocabularySet(proficiencyLevel: string): VocabularyItem[] {
    // Vocabulary selection based on proficiency level
    const vocabularyPool = this.getVocabularyPool(proficiencyLevel);
    const setSize = this.studyConfig.vocabularySetSize;
    
    // Stratified sampling across difficulty levels
    const beginnerCount = Math.floor(setSize * 0.4);
    const intermediateCount = Math.floor(setSize * 0.4);
    const advancedCount = setSize - beginnerCount - intermediateCount;
    
    const selectedWords: VocabularyItem[] = [];
    
    // Sample from each difficulty level
    selectedWords.push(...this.sampleWords(vocabularyPool.beginner, beginnerCount));
    selectedWords.push(...this.sampleWords(vocabularyPool.intermediate, intermediateCount));
    selectedWords.push(...this.sampleWords(vocabularyPool.advanced, advancedCount));
    
    return this.shuffleArray(selectedWords);
  }

  private getVocabularyPool(proficiencyLevel: string): Record<string, VocabularyItem[]> {
    // In practice, this would load from a curated vocabulary database
    // For now, we'll generate mock vocabulary items
    return {
      beginner: this.generateMockVocabulary('beginner', 200),
      intermediate: this.generateMockVocabulary('intermediate', 300),
      advanced: this.generateMockVocabulary('advanced', 200)
    };
  }

  private generateMockVocabulary(difficulty: string, count: number): VocabularyItem[] {
    const words: VocabularyItem[] = [];
    
    for (let i = 0; i < count; i++) {
      words.push({
        wordId: `${difficulty}_word_${i + 1}`,
        word: `${difficulty}Word${i + 1}`,
        definition: `Definition for ${difficulty} word ${i + 1}`,
        partOfSpeech: ['noun', 'verb', 'adjective', 'adverb'][i % 4],
        frequency: Math.random() * -10, // Log frequency
        difficulty: difficulty as any,
        contexts: [
          `Context 1 for ${difficulty} word ${i + 1}`,
          `Context 2 for ${difficulty} word ${i + 1}`,
          `Context 3 for ${difficulty} word ${i + 1}`
        ],
        semanticEmbedding: Array.from({ length: 128 }, () => Math.random() - 0.5),
        masteryLevel: 0
      });
    }
    
    return words;
  }

  private sampleWords(words: VocabularyItem[], count: number): VocabularyItem[] {
    const shuffled = this.shuffleArray([...words]);
    return shuffled.slice(0, count);
  }

  private shuffleArray<T>(array: T[]): T[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  /**
   * Get participant by ID
   */
  getParticipant(participantId: string): StudyParticipant | undefined {
    return this.participants.get(participantId);
  }

  /**
   * Update participant status
   */
  updateParticipantStatus(
    participantId: string, 
    status: StudyParticipant['status']
  ): boolean {
    const participant = this.participants.get(participantId);
    if (participant) {
      participant.status = status;
      return true;
    }
    return false;
  }

  /**
   * Get study statistics
   */
  getStudyStatistics(): {
    totalParticipants: number;
    activeParticipants: number;
    completedParticipants: number;
    algorithmDistribution: Record<string, number>;
    proficiencyDistribution: Record<string, number>;
  } {
    const participants = Array.from(this.participants.values());
    
    const algorithmDistribution: Record<string, number> = {};
    const proficiencyDistribution: Record<string, number> = {};
    
    participants.forEach(p => {
      algorithmDistribution[p.assignedAlgorithm] = 
        (algorithmDistribution[p.assignedAlgorithm] || 0) + 1;
      proficiencyDistribution[p.proficiencyLevel] = 
        (proficiencyDistribution[p.proficiencyLevel] || 0) + 1;
    });
    
    return {
      totalParticipants: participants.length,
      activeParticipants: participants.filter(p => p.status === 'active').length,
      completedParticipants: participants.filter(p => p.status === 'completed').length,
      algorithmDistribution,
      proficiencyDistribution
    };
  }
}

/**
 * A/B Testing Framework
 */
export class ABTestingFramework {
  private participantManager: ParticipantManager;
  private schedulers: Map<string, BaseScheduler | DARTScheduler | CARTSScheduler>;
  private contextTransferEvaluator: ContextTransferEvaluator;

  constructor(
    participantManager: ParticipantManager,
    llmApiKey?: string
  ) {
    this.participantManager = participantManager;
    this.schedulers = new Map();
    this.initializeSchedulers();
    
    // Initialize ContextTransfer evaluator
    const llmProvider = LLMProviderFactory.createProvider(
      llmApiKey ? 'openai' : 'mock',
      llmApiKey
    );
    this.contextTransferEvaluator = new ContextTransferEvaluator(llmProvider);
  }

  private initializeSchedulers(): void {
    // Initialize baseline schedulers
    const baselineSchedulers = SchedulerFactory.getAllSchedulers();
    baselineSchedulers.forEach(scheduler => {
      this.schedulers.set(scheduler.name, scheduler);
    });

    // Initialize DART scheduler
    this.schedulers.set('DART', new DARTScheduler());

    // Initialize CARTS scheduler (with default config)
    const transformerConfig = {
      modelDim: 128,
      numHeads: 4,
      numLayers: 2,
      feedforwardDim: 256,
      maxSequenceLength: 50,
      dropoutRate: 0.1
    };

    const ppoConfig = {
      learningRate: 0.0003,
      clipEpsilon: 0.2,
      valueCoeff: 0.5,
      entropyCoeff: 0.01,
      gamma: 0.99,
      lambda: 0.95,
      batchSize: 32,
      epochs: 4
    };

    this.schedulers.set('CARTS', new CARTSScheduler(transformerConfig, ppoConfig));
  }

  /**
   * Conduct learning session for participant
   */
  async conductLearningSession(
    participantId: string,
    sessionDuration: number = 20 // minutes
  ): Promise<StudySession> {
    const participant = this.participantManager.getParticipant(participantId);
    if (!participant) {
      throw new Error(`Participant ${participantId} not found`);
    }

    const sessionId = this.generateSessionId();
    const startTime = new Date();
    const scheduler = this.schedulers.get(participant.assignedAlgorithm);
    
    if (!scheduler) {
      throw new Error(`Scheduler ${participant.assignedAlgorithm} not found`);
    }

    const interactions: InteractionLog[] = [];
    const contextTransferTasks: ContextTransferTask[] = [];
    const contextTransferResponses: LearnerResponse[] = [];

    // Simulate learning session
    const sessionEndTime = new Date(startTime.getTime() + sessionDuration * 60 * 1000);
    let currentTime = new Date(startTime);

    while (currentTime < sessionEndTime && interactions.length < 50) {
      // Select word for review
      const wordToReview = this.selectWordForReview(participant);
      if (!wordToReview) break;

      // Get scheduling decision
      const features = this.calculateWordFeatures(wordToReview, interactions);
      const schedulingResult = this.getSchedulingDecision(
        scheduler,
        features,
        interactions.filter(i => i.wordId === wordToReview.wordId)
      );

      // Simulate learner interaction
      const interaction = await this.simulateLearnerInteraction(
        participant,
        wordToReview,
        schedulingResult.difficulty,
        currentTime
      );

      interactions.push(interaction);

      // Occasionally conduct context transfer assessment
      if (interactions.length % 10 === 0) {
        const transferTask = this.createContextTransferTask(wordToReview, schedulingResult.difficulty);
        const transferResponse = await this.simulateContextTransferResponse(
          participant,
          transferTask,
          currentTime
        );

        contextTransferTasks.push(transferTask);
        contextTransferResponses.push(transferResponse);
      }

      // Advance time
      currentTime = new Date(currentTime.getTime() + (2 + Math.random() * 3) * 60 * 1000);
    }

    const endTime = new Date();
    const sessionMetrics = this.calculateSessionMetrics(interactions, contextTransferResponses);

    const session: StudySession = {
      sessionId,
      participantId,
      startTime,
      endTime,
      interactions,
      contextTransferTasks,
      contextTransferResponses,
      sessionMetrics,
      technicalIssues: []
    };

    // Update participant session history
    participant.sessionHistory.push(session);

    return session;
  }

  private generateSessionId(): string {
    return `SESSION_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
  }

  private selectWordForReview(participant: StudyParticipant): VocabularyItem | null {
    // Select words that are due for review or need introduction
    const availableWords = participant.vocabularySet.filter(word => {
      const lastInteraction = participant.sessionHistory
        .flatMap(s => s.interactions)
        .filter(i => i.wordId === word.wordId)
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0];

      if (!lastInteraction) return true; // New word

      // Check if word is due for review (simplified logic)
      const daysSinceLastReview = Math.floor(
        (Date.now() - lastInteraction.timestamp.getTime()) / (1000 * 60 * 60 * 24)
      );

      return daysSinceLastReview >= 1; // Due if not reviewed today
    });

    if (availableWords.length === 0) return null;

    // Prioritize words with lower mastery levels
    availableWords.sort((a, b) => a.masteryLevel - b.masteryLevel);
    return availableWords[0];
  }

  private calculateWordFeatures(
    word: VocabularyItem,
    allInteractions: InteractionLog[]
  ): DARTFeatures {
    const wordInteractions = allInteractions.filter(i => i.wordId === word.wordId);
    return calculateFeatures(wordInteractions, word.frequency);
  }

  private getSchedulingDecision(
    scheduler: any,
    features: DARTFeatures,
    wordHistory: InteractionLog[]
  ): { difficulty: RetrievalDifficulty; interval: number } {
    if (scheduler instanceof DARTScheduler) {
      const lastDifficulty = wordHistory.length > 0 
        ? wordHistory[wordHistory.length - 1].difficulty 
        : RetrievalDifficulty.RECOGNITION_MCQ;
      
      const result = scheduler.scheduleNextReview(features, lastDifficulty);
      return { difficulty: result.difficulty, interval: result.interval };
    } else if (scheduler.scheduleReview) {
      // Baseline scheduler
      const result = scheduler.scheduleReview(features, wordHistory);
      return { difficulty: result.difficulty, interval: result.interval };
    } else {
      // CARTS scheduler (simplified)
      return { 
        difficulty: RetrievalDifficulty.RECOGNITION_MCQ, 
        interval: 1 
      };
    }
  }

  private async simulateLearnerInteraction(
    participant: StudyParticipant,
    word: VocabularyItem,
    difficulty: RetrievalDifficulty,
    timestamp: Date
  ): Promise<InteractionLog> {
    // Simulate learner performance based on word difficulty and participant proficiency
    const proficiencyBonus = this.getProficiencyBonus(participant.proficiencyLevel);
    const difficultyPenalty = difficulty * 0.1;
    const masteryBonus = word.masteryLevel * 0.3;
    
    const successProbability = Math.max(0.1, Math.min(0.95, 
      0.6 + proficiencyBonus - difficultyPenalty + masteryBonus + (Math.random() - 0.5) * 0.2
    ));
    
    const isCorrect = Math.random() < successProbability;
    const responseTime = this.simulateResponseTime(difficulty, isCorrect);
    
    // Update word mastery level
    if (isCorrect) {
      word.masteryLevel = Math.min(1.0, word.masteryLevel + 0.05);
    } else {
      word.masteryLevel = Math.max(0.0, word.masteryLevel - 0.02);
    }

    return {
      wordId: word.wordId,
      timestamp,
      difficulty,
      isCorrect,
      responseTime,
      context: word.contexts[Math.floor(Math.random() * word.contexts.length)],
      features: this.calculateWordFeatures(word, [])
    };
  }

  private getProficiencyBonus(proficiencyLevel: string): number {
    const bonuses = { A1: -0.2, A2: -0.1, B1: 0, B2: 0.1, C1: 0.2, C2: 0.3 };
    return bonuses[proficiencyLevel as keyof typeof bonuses] || 0;
  }

  private simulateResponseTime(difficulty: RetrievalDifficulty, isCorrect: boolean): number {
    const baseTimes = [2000, 3000, 4500, 6000]; // Base times for each difficulty
    const baseTime = baseTimes[difficulty];
    const correctnessMultiplier = isCorrect ? 0.8 : 1.3;
    const randomVariation = 0.7 + Math.random() * 0.6; // 0.7 to 1.3
    
    return Math.round(baseTime * correctnessMultiplier * randomVariation);
  }

  private createContextTransferTask(
    word: VocabularyItem,
    difficulty: RetrievalDifficulty
  ): ContextTransferTask {
    return {
      wordId: word.wordId,
      targetWord: word.word,
      context: word.contexts[Math.floor(Math.random() * word.contexts.length)],
      difficulty,
      expectedUsage: [word.definition],
      distractorContexts: []
    };
  }

  private async simulateContextTransferResponse(
    participant: StudyParticipant,
    task: ContextTransferTask,
    timestamp: Date
  ): Promise<LearnerResponse> {
    // Simulate learner response quality based on proficiency and word mastery
    const word = participant.vocabularySet.find(w => w.wordId === task.wordId)!;
    const responseQuality = Math.max(0.1, Math.min(0.95,
      word.masteryLevel * 0.7 + this.getProficiencyBonus(participant.proficiencyLevel) * 0.3
    ));

    const responses = [
      `Basic usage of ${task.targetWord}`,
      `Good understanding of ${task.targetWord} in context`,
      `Excellent demonstration of ${task.targetWord} with natural usage`,
      `Sophisticated use of ${task.targetWord} showing deep comprehension`
    ];

    const responseIndex = Math.floor(responseQuality * responses.length);
    const selectedResponse = responses[Math.min(responseIndex, responses.length - 1)];

    return {
      userId: participant.userId,
      taskId: task.wordId,
      response: selectedResponse,
      responseTime: this.simulateResponseTime(task.difficulty, responseQuality > 0.6),
      confidence: Math.ceil(responseQuality * 5),
      timestamp
    };
  }

  private calculateSessionMetrics(
    interactions: InteractionLog[],
    contextTransferResponses: LearnerResponse[]
  ): SessionMetrics {
    const totalInteractions = interactions.length;
    const correctResponses = interactions.filter(i => i.isCorrect).length;
    const averageResponseTime = interactions.reduce((sum, i) => sum + i.responseTime, 0) / totalInteractions;
    
    const difficultyProgression = interactions.map(i => i.difficulty);
    const uniqueContexts = new Set(interactions.map(i => i.context)).size;
    const contextDiversity = uniqueContexts / Math.max(1, totalInteractions);
    
    const engagementScore = Math.min(1.0, totalInteractions / 30); // Normalize to expected session length
    const cognitiveLoad = 2 + Math.random() * 2; // Simulated self-report 1-5 scale

    return {
      totalInteractions,
      correctResponses,
      averageResponseTime,
      difficultyProgression,
      contextDiversity,
      engagementScore,
      cognitiveLoad
    };
  }

  /**
   * Evaluate context transfer performance
   */
  async evaluateContextTransfer(
    tasks: ContextTransferTask[],
    responses: LearnerResponse[]
  ): Promise<ContextTransferScore[]> {
    return await this.contextTransferEvaluator.evaluateBatch(tasks, responses);
  }
}
/**
 * Data Collection Pipeline
 */
export class DataCollectionPipeline {
  private participantManager: ParticipantManager;
  private abTestFramework: ABTestingFramework;
  private dataStorage: StudyDataStorage;

  constructor(
    participantManager: ParticipantManager,
    abTestFramework: ABTestingFramework,
    dataStorage: StudyDataStorage
  ) {
    this.participantManager = participantManager;
    this.abTestFramework = abTestFramework;
    this.dataStorage = dataStorage;
  }

  /**
   * Conduct weekly assessment for participant
   */
  async conductWeeklyAssessment(
    participantId: string,
    weekNumber: number
  ): Promise<AssessmentResult> {
    const participant = this.participantManager.getParticipant(participantId);
    if (!participant) {
      throw new Error(`Participant ${participantId} not found`);
    }

    const assessmentId = `WEEKLY_${participantId}_W${weekNumber}`;
    
    // Select representative vocabulary for assessment
    const assessmentWords = this.selectAssessmentVocabulary(participant, 20);
    
    // Conduct context transfer assessment
    const transferTasks: ContextTransferTask[] = [];
    const transferResponses: LearnerResponse[] = [];
    
    for (const word of assessmentWords) {
      const task = this.createAssessmentTask(word, weekNumber);
      const response = await this.simulateAssessmentResponse(participant, task);
      
      transferTasks.push(task);
      transferResponses.push(response);
    }

    // Evaluate responses
    const contextTransferScores = await this.abTestFramework.evaluateContextTransfer(
      transferTasks,
      transferResponses
    );

    // Calculate aggregate scores
    const scores = this.calculateAssessmentScores(
      participant,
      contextTransferScores,
      weekNumber
    );

    const assessmentResult: AssessmentResult = {
      assessmentId,
      participantId,
      assessmentType: 'weekly',
      weekNumber,
      completionDate: new Date(),
      scores,
      detailedResults: contextTransferScores
    };

    // Store assessment result
    participant.assessmentResults.push(assessmentResult);
    await this.dataStorage.saveAssessmentResult(assessmentResult);

    return assessmentResult;
  }

  private selectAssessmentVocabulary(
    participant: StudyParticipant,
    count: number
  ): VocabularyItem[] {
    // Stratified sampling across mastery levels
    const lowMastery = participant.vocabularySet.filter(w => w.masteryLevel < 0.3);
    const mediumMastery = participant.vocabularySet.filter(w => w.masteryLevel >= 0.3 && w.masteryLevel < 0.7);
    const highMastery = participant.vocabularySet.filter(w => w.masteryLevel >= 0.7);

    const selected: VocabularyItem[] = [];
    
    // Sample proportionally
    const lowCount = Math.min(lowMastery.length, Math.ceil(count * 0.4));
    const mediumCount = Math.min(mediumMastery.length, Math.ceil(count * 0.4));
    const highCount = Math.min(highMastery.length, count - lowCount - mediumCount);

    selected.push(...this.sampleRandomly(lowMastery, lowCount));
    selected.push(...this.sampleRandomly(mediumMastery, mediumCount));
    selected.push(...this.sampleRandomly(highMastery, highCount));

    return selected;
  }

  private sampleRandomly<T>(array: T[], count: number): T[] {
    const shuffled = [...array].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
  }

  private createAssessmentTask(
    word: VocabularyItem,
    weekNumber: number
  ): ContextTransferTask {
    // Progressive difficulty based on week number
    let difficulty: RetrievalDifficulty;
    if (weekNumber <= 2) {
      difficulty = RetrievalDifficulty.RECOGNITION_MCQ;
    } else if (weekNumber <= 4) {
      difficulty = RetrievalDifficulty.CLOZE_FILL;
    } else if (weekNumber <= 6) {
      difficulty = RetrievalDifficulty.CONSTRAINED_GENERATION;
    } else {
      difficulty = RetrievalDifficulty.OPEN_PARAPHRASE;
    }

    return {
      wordId: word.wordId,
      targetWord: word.word,
      context: word.contexts[Math.floor(Math.random() * word.contexts.length)],
      difficulty,
      expectedUsage: [word.definition],
      distractorContexts: []
    };
  }

  private async simulateAssessmentResponse(
    participant: StudyParticipant,
    task: ContextTransferTask
  ): Promise<LearnerResponse> {
    const word = participant.vocabularySet.find(w => w.wordId === task.wordId)!;
    
    // Assessment responses are typically more careful/accurate
    const baseQuality = word.masteryLevel * 0.8 + this.getProficiencyBonus(participant.proficiencyLevel) * 0.2;
    const assessmentBonus = 0.1; // People try harder in assessments
    const responseQuality = Math.max(0.1, Math.min(0.95, baseQuality + assessmentBonus));

    const responses = this.generateAssessmentResponses(task, responseQuality);
    const selectedResponse = responses[Math.floor(responseQuality * responses.length)];

    return {
      userId: participant.userId,
      taskId: task.wordId,
      response: selectedResponse,
      responseTime: this.simulateAssessmentResponseTime(task.difficulty),
      confidence: Math.ceil(responseQuality * 5),
      timestamp: new Date()
    };
  }

  private getProficiencyBonus(proficiencyLevel: string): number {
    const bonuses = { A1: -0.2, A2: -0.1, B1: 0, B2: 0.1, C1: 0.2, C2: 0.3 };
    return bonuses[proficiencyLevel as keyof typeof bonuses] || 0;
  }

  private generateAssessmentResponses(
    task: ContextTransferTask,
    quality: number
  ): string[] {
    const word = task.targetWord;
    
    switch (task.difficulty) {
      case RetrievalDifficulty.RECOGNITION_MCQ:
        return [
          `I don't know what ${word} means`,
          `${word} means something basic`,
          `${word} has a clear meaning in this context`,
          `${word} means exactly what is expected here`
        ];
      
      case RetrievalDifficulty.CLOZE_FILL:
        return [
          word.toLowerCase(),
          word,
          `${word} (with proper form)`,
          `${word} used correctly in context`
        ];
      
      case RetrievalDifficulty.CONSTRAINED_GENERATION:
        return [
          `The word ${word} is used here.`,
          `${word} appears in this sentence naturally.`,
          `Using ${word} correctly shows understanding of its meaning.`,
          `The sophisticated use of ${word} demonstrates mastery of its nuanced meaning.`
        ];
      
      case RetrievalDifficulty.OPEN_PARAPHRASE:
        return [
          `${word} is a word that means something.`,
          `${word} can be explained as having a specific meaning.`,
          `${word} represents a concept that can be used in various contexts to convey meaning.`,
          `${word} embodies a sophisticated concept that, when properly understood, can be applied across diverse contexts to express nuanced meanings with precision and clarity.`
        ];
      
      default:
        return [`Basic response about ${word}`];
    }
  }

  private simulateAssessmentResponseTime(difficulty: RetrievalDifficulty): number {
    // Assessment responses typically take longer due to careful consideration
    const baseTimes = [3000, 5000, 8000, 12000]; // Longer than regular session times
    const baseTime = baseTimes[difficulty];
    const variation = 0.8 + Math.random() * 0.4; // Less variation in assessments
    
    return Math.round(baseTime * variation);
  }

  private calculateAssessmentScores(
    participant: StudyParticipant,
    contextTransferScores: ContextTransferScore[],
    weekNumber: number
  ): AssessmentResult['scores'] {
    // Overall context transfer score
    const contextTransferScore = contextTransferScores.reduce(
      (sum, score) => sum + score.overall, 0
    ) / contextTransferScores.length;

    // Retention rate based on session history
    const retentionRate = this.calculateRetentionRate(participant, weekNumber);

    // Learning efficiency (improvement per session)
    const learningEfficiency = this.calculateLearningEfficiency(participant);

    // Vocabulary growth (mastery level improvement)
    const vocabularyGrowth = this.calculateVocabularyGrowth(participant);

    // Overall score (weighted combination)
    const overallScore = 
      0.4 * contextTransferScore +
      0.3 * retentionRate +
      0.2 * learningEfficiency +
      0.1 * vocabularyGrowth;

    return {
      overallScore,
      retentionRate,
      contextTransferScore,
      learningEfficiency,
      vocabularyGrowth
    };
  }

  private calculateRetentionRate(participant: StudyParticipant, weekNumber: number): number {
    // Calculate retention based on recent session performance
    const recentSessions = participant.sessionHistory.slice(-7); // Last week
    if (recentSessions.length === 0) return 0;

    const totalInteractions = recentSessions.reduce(
      (sum, session) => sum + session.sessionMetrics.totalInteractions, 0
    );
    const correctInteractions = recentSessions.reduce(
      (sum, session) => sum + session.sessionMetrics.correctResponses, 0
    );

    return totalInteractions > 0 ? correctInteractions / totalInteractions : 0;
  }

  private calculateLearningEfficiency(participant: StudyParticipant): number {
    // Measure improvement rate over time
    if (participant.sessionHistory.length < 2) return 0;

    const firstWeekSessions = participant.sessionHistory.slice(0, 7);
    const lastWeekSessions = participant.sessionHistory.slice(-7);

    const firstWeekAccuracy = this.calculateAverageAccuracy(firstWeekSessions);
    const lastWeekAccuracy = this.calculateAverageAccuracy(lastWeekSessions);

    return Math.max(0, lastWeekAccuracy - firstWeekAccuracy);
  }

  private calculateAverageAccuracy(sessions: StudySession[]): number {
    if (sessions.length === 0) return 0;

    const totalInteractions = sessions.reduce(
      (sum, session) => sum + session.sessionMetrics.totalInteractions, 0
    );
    const correctInteractions = sessions.reduce(
      (sum, session) => sum + session.sessionMetrics.correctResponses, 0
    );

    return totalInteractions > 0 ? correctInteractions / totalInteractions : 0;
  }

  private calculateVocabularyGrowth(participant: StudyParticipant): number {
    // Average mastery level across all vocabulary
    const totalMastery = participant.vocabularySet.reduce(
      (sum, word) => sum + word.masteryLevel, 0
    );
    return totalMastery / participant.vocabularySet.length;
  }

  /**
   * Export participant data for analysis
   */
  async exportParticipantData(participantId: string): Promise<any> {
    const participant = this.participantManager.getParticipant(participantId);
    if (!participant) {
      throw new Error(`Participant ${participantId} not found`);
    }

    return {
      participant: {
        ...participant,
        // Remove sensitive data
        userId: 'ANONYMIZED',
        demographicData: {
          ...participant.demographicData,
          // Keep only research-relevant demographics
          age: participant.demographicData.age,
          proficiencyLevel: participant.proficiencyLevel,
          englishLearningYears: participant.demographicData.englishLearningYears
        }
      },
      summary: {
        totalSessions: participant.sessionHistory.length,
        totalInteractions: participant.sessionHistory.reduce(
          (sum, session) => sum + session.sessionMetrics.totalInteractions, 0
        ),
        averageAccuracy: this.calculateAverageAccuracy(participant.sessionHistory),
        vocabularyMastery: this.calculateVocabularyGrowth(participant),
        assessmentProgression: participant.assessmentResults.map(result => ({
          week: result.weekNumber,
          overallScore: result.scores.overallScore,
          contextTransferScore: result.scores.contextTransferScore
        }))
      }
    };
  }
}

/**
 * Study Data Storage Interface
 */
export interface StudyDataStorage {
  saveParticipant(participant: StudyParticipant): Promise<void>;
  saveSession(session: StudySession): Promise<void>;
  saveAssessmentResult(result: AssessmentResult): Promise<void>;
  getParticipant(participantId: string): Promise<StudyParticipant | null>;
  getStudyData(studyId: string): Promise<any>;
  exportStudyData(studyId: string, format: 'json' | 'csv'): Promise<string>;
}

/**
 * Mock Data Storage Implementation
 */
export class MockStudyDataStorage implements StudyDataStorage {
  private participants: Map<string, StudyParticipant> = new Map();
  private sessions: Map<string, StudySession> = new Map();
  private assessments: Map<string, AssessmentResult> = new Map();

  async saveParticipant(participant: StudyParticipant): Promise<void> {
    this.participants.set(participant.participantId, participant);
  }

  async saveSession(session: StudySession): Promise<void> {
    this.sessions.set(session.sessionId, session);
  }

  async saveAssessmentResult(result: AssessmentResult): Promise<void> {
    this.assessments.set(result.assessmentId, result);
  }

  async getParticipant(participantId: string): Promise<StudyParticipant | null> {
    return this.participants.get(participantId) || null;
  }

  async getStudyData(studyId: string): Promise<any> {
    const studyParticipants = Array.from(this.participants.values())
      .filter(p => p.studyId === studyId);
    
    const studySessions = Array.from(this.sessions.values())
      .filter(s => studyParticipants.some(p => p.participantId === s.participantId));
    
    const studyAssessments = Array.from(this.assessments.values())
      .filter(a => studyParticipants.some(p => p.participantId === a.participantId));

    return {
      participants: studyParticipants,
      sessions: studySessions,
      assessments: studyAssessments
    };
  }

  async exportStudyData(studyId: string, format: 'json' | 'csv'): Promise<string> {
    const data = await this.getStudyData(studyId);
    
    if (format === 'json') {
      return JSON.stringify(data, null, 2);
    } else {
      // Simple CSV export (would be more sophisticated in practice)
      const csvRows = ['ParticipantID,Algorithm,Week,OverallScore,ContextTransferScore'];
      
      data.assessments.forEach((assessment: AssessmentResult) => {
        const participant = data.participants.find(
          (p: StudyParticipant) => p.participantId === assessment.participantId
        );
        
        if (participant) {
          csvRows.push([
            assessment.participantId,
            participant.assignedAlgorithm,
            assessment.weekNumber,
            assessment.scores.overallScore.toFixed(3),
            assessment.scores.contextTransferScore.toFixed(3)
          ].join(','));
        }
      });
      
      return csvRows.join('\n');
    }
  }
}

/**
 * Study Orchestrator - Main coordination class
 */
export class StudyOrchestrator {
  private studyConfig: StudyConfiguration;
  private participantManager: ParticipantManager;
  private abTestFramework: ABTestingFramework;
  private dataCollectionPipeline: DataCollectionPipeline;
  private dataStorage: StudyDataStorage;

  constructor(studyConfig: StudyConfiguration, llmApiKey?: string) {
    this.studyConfig = studyConfig;
    this.participantManager = new ParticipantManager(studyConfig);
    this.abTestFramework = new ABTestingFramework(this.participantManager, llmApiKey);
    this.dataStorage = new MockStudyDataStorage();
    this.dataCollectionPipeline = new DataCollectionPipeline(
      this.participantManager,
      this.abTestFramework,
      this.dataStorage
    );
  }

  /**
   * Initialize study with configuration
   */
  async initializeStudy(): Promise<void> {
    console.log(`Initializing study: ${this.studyConfig.title}`);
    console.log(`Target participants: ${this.studyConfig.targetParticipants}`);
    console.log(`Study duration: ${this.studyConfig.startDate} to ${this.studyConfig.endDate}`);
    console.log(`Algorithms: ${this.studyConfig.algorithms.map(a => a.name).join(', ')}`);
  }

  /**
   * Enroll participant in study
   */
  enrollParticipant(
    userId: string,
    demographicData: DemographicData,
    proficiencyLevel: string,
    consentGiven: boolean
  ): StudyParticipant {
    return this.participantManager.enrollParticipant(
      userId,
      demographicData,
      proficiencyLevel,
      consentGiven
    );
  }

  /**
   * Run daily study operations
   */
  async runDailyOperations(): Promise<void> {
    const activeParticipants = Array.from(this.participantManager['participants'].values())
      .filter(p => p.status === 'active');

    console.log(`Running daily operations for ${activeParticipants.length} active participants`);

    for (const participant of activeParticipants) {
      try {
        // Conduct learning session
        const session = await this.abTestFramework.conductLearningSession(
          participant.participantId,
          20 // 20-minute sessions
        );

        await this.dataStorage.saveSession(session);

        // Check if weekly assessment is due
        const weekNumber = this.calculateWeekNumber(participant.enrollmentDate);
        const lastAssessment = participant.assessmentResults
          .filter(a => a.assessmentType === 'weekly')
          .sort((a, b) => b.weekNumber - a.weekNumber)[0];

        if (!lastAssessment || lastAssessment.weekNumber < weekNumber) {
          const assessment = await this.dataCollectionPipeline.conductWeeklyAssessment(
            participant.participantId,
            weekNumber
          );
          console.log(`Completed weekly assessment for participant ${participant.participantId}, week ${weekNumber}`);
        }

      } catch (error) {
        console.error(`Error in daily operations for participant ${participant.participantId}:`, error);
      }
    }
  }

  private calculateWeekNumber(enrollmentDate: Date): number {
    const daysSinceEnrollment = Math.floor(
      (Date.now() - enrollmentDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    return Math.floor(daysSinceEnrollment / 7) + 1;
  }

  /**
   * Generate study progress report
   */
  async generateProgressReport(): Promise<any> {
    const statistics = this.participantManager.getStudyStatistics();
    const studyData = await this.dataStorage.getStudyData(this.studyConfig.studyId);

    return {
      studyInfo: {
        studyId: this.studyConfig.studyId,
        title: this.studyConfig.title,
        startDate: this.studyConfig.startDate,
        currentDate: new Date(),
        daysElapsed: Math.floor(
          (Date.now() - this.studyConfig.startDate.getTime()) / (1000 * 60 * 60 * 24)
        )
      },
      participantStatistics: statistics,
      dataCollection: {
        totalSessions: studyData.sessions.length,
        totalAssessments: studyData.assessments.length,
        averageSessionsPerParticipant: studyData.sessions.length / statistics.totalParticipants
      },
      algorithmPerformance: this.calculateAlgorithmPerformance(studyData)
    };
  }

  private calculateAlgorithmPerformance(studyData: any): Record<string, any> {
    const algorithmStats: Record<string, any> = {};

    // Group assessments by algorithm
    studyData.participants.forEach((participant: StudyParticipant) => {
      const algorithm = participant.assignedAlgorithm;
      if (!algorithmStats[algorithm]) {
        algorithmStats[algorithm] = {
          participantCount: 0,
          totalAssessments: 0,
          averageOverallScore: 0,
          averageContextTransferScore: 0,
          weeklyProgression: {}
        };
      }

      algorithmStats[algorithm].participantCount++;

      const participantAssessments = studyData.assessments.filter(
        (a: AssessmentResult) => a.participantId === participant.participantId
      );

      algorithmStats[algorithm].totalAssessments += participantAssessments.length;

      participantAssessments.forEach((assessment: AssessmentResult) => {
        const week = assessment.weekNumber;
        if (!algorithmStats[algorithm].weeklyProgression[week]) {
          algorithmStats[algorithm].weeklyProgression[week] = {
            count: 0,
            totalOverallScore: 0,
            totalContextTransferScore: 0
          };
        }

        algorithmStats[algorithm].weeklyProgression[week].count++;
        algorithmStats[algorithm].weeklyProgression[week].totalOverallScore += assessment.scores.overallScore;
        algorithmStats[algorithm].weeklyProgression[week].totalContextTransferScore += assessment.scores.contextTransferScore;
      });
    });

    // Calculate averages
    Object.keys(algorithmStats).forEach(algorithm => {
      const stats = algorithmStats[algorithm];
      
      Object.keys(stats.weeklyProgression).forEach(week => {
        const weekStats = stats.weeklyProgression[week];
        weekStats.averageOverallScore = weekStats.totalOverallScore / weekStats.count;
        weekStats.averageContextTransferScore = weekStats.totalContextTransferScore / weekStats.count;
      });
    });

    return algorithmStats;
  }

  /**
   * Export complete study data
   */
  async exportStudyData(format: 'json' | 'csv' = 'json'): Promise<string> {
    return await this.dataStorage.exportStudyData(this.studyConfig.studyId, format);
  }
}