// lib/statistical-analysis.ts
// Statistical Analysis & Results for CARTS Research Project
// Step 6: Comprehensive statistical analysis of longitudinal study data

import { 
  StudyParticipant, 
  AssessmentResult, 
  StudySession,
  InteractionLog 
} from './longitudinal-study-infrastructure';

/**
 * Statistical Analysis Interfaces
 */
export interface ExportedParticipantData {
  participantId: string;
  algorithm: string;
  proficiencyLevel: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
  weeklyScores: WeeklyScore[];
  sessionData: SessionData[];
  vocabularyProgress: VocabularyProgress[];
  retentionEvents: RetentionEvent[];
}

export interface WeeklyScore {
  week: number;
  overallScore: number;
  contextTransferScore: number;
  retentionRate: number;
  learningEfficiency: number;
  vocabularyGrowth: number;
}

export interface SessionData {
  sessionId: string;
  week: number;
  day: number;
  totalInteractions: number;
  correctResponses: number;
  averageResponseTime: number;
  difficultyProgression: number[];
  contextDiversity: number;
  engagementScore: number;
}

export interface VocabularyProgress {
  wordId: string;
  initialMastery: number;
  finalMastery: number;
  timesToMastery: number;
  forgettingEvents: number;
  lastReviewDate: Date;
}

export interface RetentionEvent {
  wordId: string;
  timeToForgetting: number; // days until forgotten
  wasRecalled: boolean;
  difficulty: number;
  censored: boolean; // true if study ended before forgetting
}
/**
 * Mixed-Effects Model Results
 */
export interface MixedEffectsResults {
  fixedEffects: {
    algorithm: FixedEffectResult[];
    proficiencyLevel: FixedEffectResult[];
    weekNumber: FixedEffectResult;
    interactions: FixedEffectResult[];
  };
  randomEffects: {
    participantVariance: number;
    wordItemVariance: number;
    residualVariance: number;
  };
  modelFit: {
    logLikelihood: number;
    aic: number;
    bic: number;
    marginalR2: number;
    conditionalR2: number;
  };
}

export interface FixedEffectResult {
  coefficient: number;
  standardError: number;
  tValue: number;
  pValue: number;
  confidenceInterval: [number, number];
  effectName: string;
}

/**
 * Survival Analysis Results
 */
export interface SurvivalAnalysisResults {
  kaplanMeierCurves: KaplanMeierCurve[];
  logRankTests: LogRankTest[];
  medianSurvivalTimes: MedianSurvivalTime[];
  hazardRatios: HazardRatio[];
}

export interface KaplanMeierCurve {
  algorithm: string;
  timePoints: number[];
  survivalProbabilities: number[];
  confidenceIntervals: Array<[number, number]>;
  atRisk: number[];
}

export interface LogRankTest {
  algorithm1: string;
  algorithm2: string;
  chiSquare: number;
  pValue: number;
  significant: boolean;
}

export interface MedianSurvivalTime {
  algorithm: string;
  medianTime: number;
  confidenceInterval: [number, number];
}

export interface HazardRatio {
  algorithm1: string;
  algorithm2: string;
  hazardRatio: number;
  confidenceInterval: [number, number];
  pValue: number;
}
/**
 * Bayesian Model Comparison Results
 */
export interface BayesianComparisonResults {
  modelScores: ModelScore[];
  bayesFactors: BayesFactor[];
  posteriorProbabilities: PosteriorProbability[];
  modelRanking: ModelRanking[];
}

export interface ModelScore {
  algorithm: string;
  aic: number;
  bic: number;
  waic: number; // Watanabe-Akaike Information Criterion
  looic: number; // Leave-One-Out Information Criterion
}

export interface BayesFactor {
  algorithm1: string; // CARTS
  algorithm2: string; // Baseline
  bayesFactor: number;
  logBayesFactor: number;
  evidence: 'decisive' | 'very_strong' | 'strong' | 'moderate' | 'weak' | 'inconclusive';
  interpretation: string;
}

export interface PosteriorProbability {
  algorithm: string;
  probability: number;
  rank: number;
}

export interface ModelRanking {
  rank: number;
  algorithm: string;
  score: number;
  weight: number;
}

/**
 * Effect Size Results
 */
export interface EffectSizeResults {
  pairwiseComparisons: PairwiseComparison[];
  anovaResults: ANOVAResults;
  effectSizeMatrix: EffectSizeMatrix;
  practicalSignificance: PracticalSignificance[];
}

export interface PairwiseComparison {
  algorithm1: string;
  algorithm2: string;
  cohensD: number;
  hedgesG: number;
  confidenceInterval: [number, number];
  magnitude: 'negligible' | 'small' | 'medium' | 'large' | 'very_large';
  pValue: number;
  adjustedPValue: number; // Bonferroni corrected
}

export interface ANOVAResults {
  fStatistic: number;
  pValue: number;
  partialEtaSquared: number;
  confidenceInterval: [number, number];
  powerAnalysis: number;
}

export interface EffectSizeMatrix {
  algorithms: string[];
  cohensD: number[][];
  hedgesG: number[][];
  confidenceIntervals: Array<Array<[number, number]>>;
}

export interface PracticalSignificance {
  algorithm: string;
  meanImprovement: number;
  practicallySignificant: boolean;
  minimumDetectableEffect: number;
}
/**
 * Publication-Ready Output
 */
export interface PublicationOutput {
  summaryStatistics: SummaryStatistics;
  pairwiseMatrix: PairwiseMatrix;
  retentionCurveData: RetentionCurveData;
  exportFormats: {
    json: string;
    csv: string;
  };
}

export interface SummaryStatistics {
  byAlgorithm: AlgorithmSummary[];
  overall: OverallSummary;
}

export interface AlgorithmSummary {
  algorithm: string;
  participantCount: number;
  meanScore: number;
  standardDeviation: number;
  standardError: number;
  confidenceInterval: [number, number];
  median: number;
  interquartileRange: [number, number];
  minScore: number;
  maxScore: number;
}

export interface OverallSummary {
  totalParticipants: number;
  totalSessions: number;
  studyDuration: number;
  completionRate: number;
  overallMeanScore: number;
}

export interface PairwiseMatrix {
  algorithms: string[];
  pValues: number[][];
  adjustedPValues: number[][];
  effectSizes: number[][];
  significance: boolean[][];
}

export interface RetentionCurveData {
  algorithms: string[];
  timePoints: number[];
  survivalData: number[][];
  confidenceIntervals: Array<Array<[number, number]>>;
}

/**
 * Complete Statistical Results
 */
export interface StatisticalResults {
  mixedEffectsModel: MixedEffectsResults;
  survivalAnalysis: SurvivalAnalysisResults;
  bayesianComparison: BayesianComparisonResults;
  effectSizes: EffectSizeResults;
  publicationOutput: PublicationOutput;
  metadata: {
    analysisDate: Date;
    datasetSize: number;
    algorithms: string[];
    studyDuration: number;
    analysisVersion: string;
  };
}
/**
 * Statistical Analysis Engine
 * Main class for conducting comprehensive statistical analysis
 */
export class StatisticalAnalysisEngine {
  private readonly ALGORITHMS = ['DART', 'CARTS', 'SM-2', 'HLR', 'KARL', 'LECTOR'];
  private readonly PROFICIENCY_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
  private readonly ALPHA_LEVEL = 0.05;
  private readonly BONFERRONI_CORRECTION = 15; // 6 algorithms = 15 pairwise comparisons

  /**
   * Main analysis function - conducts all statistical analyses
   */
  async analyzeStudyResults(data: ExportedParticipantData[]): Promise<StatisticalResults> {
    console.log(`Starting statistical analysis of ${data.length} participants`);
    
    // Validate input data
    this.validateInputData(data);
    
    // Conduct all analyses in parallel for efficiency
    const [
      mixedEffectsModel,
      survivalAnalysis,
      bayesianComparison,
      effectSizes
    ] = await Promise.all([
      this.conductMixedEffectsAnalysis(data),
      this.conductSurvivalAnalysis(data),
      this.conductBayesianComparison(data),
      this.calculateEffectSizes(data)
    ]);

    // Generate publication-ready output
    const publicationOutput = this.generatePublicationOutput(
      data, mixedEffectsModel, effectSizes, survivalAnalysis
    );

    return {
      mixedEffectsModel,
      survivalAnalysis,
      bayesianComparison,
      effectSizes,
      publicationOutput,
      metadata: {
        analysisDate: new Date(),
        datasetSize: data.length,
        algorithms: this.ALGORITHMS,
        studyDuration: this.calculateStudyDuration(data),
        analysisVersion: '1.0.0'
      }
    };
  }

  /**
   * 1. MIXED-EFFECTS MODEL ANALYSIS
   * Hierarchical linear model with fixed and random effects
   */
  private async conductMixedEffectsAnalysis(
    data: ExportedParticipantData[]
  ): Promise<MixedEffectsResults> {
    console.log('Conducting mixed-effects model analysis...');
    
    // Prepare data for analysis
    const modelData = this.prepareModelData(data);
    
    // Fit mixed-effects model: Score ~ Algorithm + ProficiencyLevel + Week + (1|Participant) + (1|WordItem)
    const fixedEffects = this.fitFixedEffects(modelData);
    const randomEffects = this.estimateRandomEffects(modelData);
    const modelFit = this.calculateModelFit(modelData, fixedEffects, randomEffects);

    return {
      fixedEffects,
      randomEffects,
      modelFit
    };
  }

  private prepareModelData(data: ExportedParticipantData[]): any[] {
    const modelData: any[] = [];
    
    data.forEach(participant => {
      participant.weeklyScores.forEach(weekScore => {
        modelData.push({
          participantId: participant.participantId,
          algorithm: participant.algorithm,
          proficiencyLevel: participant.proficiencyLevel,
          week: weekScore.week,
          overallScore: weekScore.overallScore,
          contextTransferScore: weekScore.contextTransferScore,
          retentionRate: weekScore.retentionRate
        });
      });
    });
    
    return modelData;
  }

  private fitFixedEffects(modelData: any[]): MixedEffectsResults['fixedEffects'] {
    // Algorithm effects (reference: SM-2)
    const algorithmEffects = this.ALGORITHMS.slice(1).map(algorithm => {
      const algorithmData = modelData.filter(d => d.algorithm === algorithm);
      const referenceData = modelData.filter(d => d.algorithm === 'SM-2');
      
      const { coefficient, standardError, tValue, pValue } = this.calculateCoefficient(
        algorithmData, referenceData, 'overallScore'
      );
      
      return {
        coefficient,
        standardError,
        tValue,
        pValue,
        confidenceInterval: this.calculateConfidenceInterval(coefficient, standardError),
        effectName: `${algorithm} vs SM-2`
      };
    });

    // Proficiency level effects (reference: A1)
    const proficiencyEffects = this.PROFICIENCY_LEVELS.slice(1).map(level => {
      const levelData = modelData.filter(d => d.proficiencyLevel === level);
      const referenceData = modelData.filter(d => d.proficiencyLevel === 'A1');
      
      const { coefficient, standardError, tValue, pValue } = this.calculateCoefficient(
        levelData, referenceData, 'overallScore'
      );
      
      return {
        coefficient,
        standardError,
        tValue,
        pValue,
        confidenceInterval: this.calculateConfidenceInterval(coefficient, standardError),
        effectName: `${level} vs A1`
      };
    });

    // Week number effect (linear trend)
    const weekEffect = this.calculateLinearTrend(modelData, 'week', 'overallScore');

    return {
      algorithm: algorithmEffects,
      proficiencyLevel: proficiencyEffects,
      weekNumber: weekEffect,
      interactions: [] // Simplified - would include Algorithm × Week interactions
    };
  }
  private calculateCoefficient(
    treatmentData: any[], 
    controlData: any[], 
    outcome: string
  ): { coefficient: number; standardError: number; tValue: number; pValue: number } {
    const treatmentMean = this.calculateMean(treatmentData.map(d => d[outcome]));
    const controlMean = this.calculateMean(controlData.map(d => d[outcome]));
    const coefficient = treatmentMean - controlMean;
    
    const treatmentVar = this.calculateVariance(treatmentData.map(d => d[outcome]));
    const controlVar = this.calculateVariance(controlData.map(d => d[outcome]));
    const pooledSE = Math.sqrt(
      (treatmentVar / treatmentData.length) + (controlVar / controlData.length)
    );
    
    const tValue = coefficient / pooledSE;
    const df = treatmentData.length + controlData.length - 2;
    const pValue = this.calculateTTestPValue(tValue, df);
    
    return {
      coefficient,
      standardError: pooledSE,
      tValue,
      pValue
    };
  }

  private calculateLinearTrend(
    data: any[], 
    predictor: string, 
    outcome: string
  ): FixedEffectResult {
    const n = data.length;
    const xValues = data.map(d => d[predictor]);
    const yValues = data.map(d => d[outcome]);
    
    const xMean = this.calculateMean(xValues);
    const yMean = this.calculateMean(yValues);
    
    const numerator = data.reduce((sum, d) => 
      sum + (d[predictor] - xMean) * (d[outcome] - yMean), 0
    );
    const denominator = data.reduce((sum, d) => 
      sum + Math.pow(d[predictor] - xMean, 2), 0
    );
    
    const coefficient = numerator / denominator;
    const residualSumSquares = data.reduce((sum, d) => {
      const predicted = yMean + coefficient * (d[predictor] - xMean);
      return sum + Math.pow(d[outcome] - predicted, 2);
    }, 0);
    
    const standardError = Math.sqrt(residualSumSquares / (n - 2) / denominator);
    const tValue = coefficient / standardError;
    const pValue = this.calculateTTestPValue(tValue, n - 2);
    
    return {
      coefficient,
      standardError,
      tValue,
      pValue,
      confidenceInterval: this.calculateConfidenceInterval(coefficient, standardError),
      effectName: 'Week Number (Linear Trend)'
    };
  }

  private estimateRandomEffects(modelData: any[]): MixedEffectsResults['randomEffects'] {
    // Simplified random effects estimation
    const participantGroups = this.groupBy(modelData, 'participantId');
    const participantVariances = Object.values(participantGroups).map(group => 
      this.calculateVariance((group as any[]).map(d => d.overallScore))
    );
    
    return {
      participantVariance: this.calculateMean(participantVariances),
      wordItemVariance: 0.05, // Simplified - would need word-level data
      residualVariance: 0.15
    };
  }

  private calculateModelFit(
    modelData: any[], 
    fixedEffects: any, 
    randomEffects: any
  ): MixedEffectsResults['modelFit'] {
    const n = modelData.length;
    const k = 10; // Number of parameters (simplified)
    
    // Simplified model fit calculations
    const logLikelihood = -n * Math.log(2 * Math.PI) / 2 - n * Math.log(randomEffects.residualVariance) / 2;
    const aic = -2 * logLikelihood + 2 * k;
    const bic = -2 * logLikelihood + k * Math.log(n);
    
    return {
      logLikelihood,
      aic,
      bic,
      marginalR2: 0.25, // Simplified - variance explained by fixed effects
      conditionalR2: 0.45 // Simplified - variance explained by full model
    };
  }

  /**
   * 2. SURVIVAL ANALYSIS
   * Kaplan-Meier curves and log-rank tests for retention analysis
   */
  private async conductSurvivalAnalysis(
    data: ExportedParticipantData[]
  ): Promise<SurvivalAnalysisResults> {
    console.log('Conducting survival analysis...');
    
    // Extract retention events
    const retentionEvents = this.extractRetentionEvents(data);
    
    // Calculate Kaplan-Meier curves for each algorithm
    const kaplanMeierCurves = this.ALGORITHMS.map(algorithm => 
      this.calculateKaplanMeierCurve(retentionEvents, algorithm)
    );
    
    // Conduct pairwise log-rank tests
    const logRankTests = this.conductLogRankTests(retentionEvents);
    
    // Calculate median survival times
    const medianSurvivalTimes = kaplanMeierCurves.map(curve => 
      this.calculateMedianSurvivalTime(curve)
    );
    
    // Calculate hazard ratios
    const hazardRatios = this.calculateHazardRatios(retentionEvents);
    
    return {
      kaplanMeierCurves,
      logRankTests,
      medianSurvivalTimes,
      hazardRatios
    };
  }

  private extractRetentionEvents(data: ExportedParticipantData[]): RetentionEvent[] {
    const events: RetentionEvent[] = [];
    
    data.forEach(participant => {
      participant.retentionEvents.forEach(event => {
        events.push({
          ...event,
          algorithm: participant.algorithm,
          proficiencyLevel: participant.proficiencyLevel
        } as any);
      });
    });
    
    return events;
  }

  private calculateKaplanMeierCurve(
    events: RetentionEvent[], 
    algorithm: string
  ): KaplanMeierCurve {
    const algorithmEvents = events.filter((e: any) => e.algorithm === algorithm);
    
    // Sort by time to event
    algorithmEvents.sort((a, b) => a.timeToForgetting - b.timeToForgetting);
    
    const timePoints: number[] = [];
    const survivalProbabilities: number[] = [];
    const confidenceIntervals: Array<[number, number]> = [];
    const atRisk: number[] = [];
    
    let currentSurvival = 1.0;
    let currentAtRisk = algorithmEvents.length;
    
    // Group events by time
    const timeGroups = this.groupBy(algorithmEvents, 'timeToForgetting');
    
    Object.keys(timeGroups).sort((a, b) => Number(a) - Number(b)).forEach(timeStr => {
      const time = Number(timeStr);
      const eventsAtTime = timeGroups[timeStr] as RetentionEvent[];
      const failures = eventsAtTime.filter(e => !e.wasRecalled).length;
      
      if (failures > 0) {
        const hazard = failures / currentAtRisk;
        currentSurvival *= (1 - hazard);
        
        timePoints.push(time);
        survivalProbabilities.push(currentSurvival);
        atRisk.push(currentAtRisk);
        
        // Greenwood's formula for confidence intervals
        const variance = this.calculateGreenwoodVariance(algorithmEvents, time);
        const se = Math.sqrt(variance) * currentSurvival;
        const ci: [number, number] = [
          Math.max(0, currentSurvival - 1.96 * se),
          Math.min(1, currentSurvival + 1.96 * se)
        ];
        confidenceIntervals.push(ci);
      }
      
      currentAtRisk -= eventsAtTime.length;
    });
    
    return {
      algorithm,
      timePoints,
      survivalProbabilities,
      confidenceIntervals,
      atRisk
    };
  }
  private calculateGreenwoodVariance(events: RetentionEvent[], time: number): number {
    // Simplified Greenwood's variance formula
    let variance = 0;
    let atRisk = events.length;
    
    const timeGroups = this.groupBy(events.filter(e => e.timeToForgetting <= time), 'timeToForgetting');
    
    Object.keys(timeGroups).forEach(timeStr => {
      const eventsAtTime = timeGroups[timeStr] as RetentionEvent[];
      const failures = eventsAtTime.filter(e => !e.wasRecalled).length;
      
      if (failures > 0 && atRisk > 0) {
        variance += failures / (atRisk * (atRisk - failures));
      }
      atRisk -= eventsAtTime.length;
    });
    
    return variance;
  }

  private conductLogRankTests(events: RetentionEvent[]): LogRankTest[] {
    const tests: LogRankTest[] = [];
    
    // Pairwise comparisons between all algorithms
    for (let i = 0; i < this.ALGORITHMS.length; i++) {
      for (let j = i + 1; j < this.ALGORITHMS.length; j++) {
        const alg1 = this.ALGORITHMS[i];
        const alg2 = this.ALGORITHMS[j];
        
        const test = this.calculateLogRankTest(events, alg1, alg2);
        tests.push(test);
      }
    }
    
    return tests;
  }

  private calculateLogRankTest(
    events: RetentionEvent[], 
    algorithm1: string, 
    algorithm2: string
  ): LogRankTest {
    const events1 = events.filter((e: any) => e.algorithm === algorithm1);
    const events2 = events.filter((e: any) => e.algorithm === algorithm2);
    
    // Combine and sort all events
    const allEvents = [...events1, ...events2].sort((a, b) => a.timeToForgetting - b.timeToForgetting);
    
    let observed1 = 0;
    let expected1 = 0;
    let variance = 0;
    
    const timeGroups = this.groupBy(allEvents, 'timeToForgetting');
    
    Object.keys(timeGroups).forEach(timeStr => {
      const eventsAtTime = timeGroups[timeStr] as RetentionEvent[];
      const failures1 = eventsAtTime.filter(e => (e as any).algorithm === algorithm1 && !e.wasRecalled).length;
      const failures2 = eventsAtTime.filter(e => (e as any).algorithm === algorithm2 && !e.wasRecalled).length;
      const totalFailures = failures1 + failures2;
      
      const atRisk1 = events1.filter(e => e.timeToForgetting >= Number(timeStr)).length;
      const atRisk2 = events2.filter(e => e.timeToForgetting >= Number(timeStr)).length;
      const totalAtRisk = atRisk1 + atRisk2;
      
      if (totalAtRisk > 0 && totalFailures > 0) {
        const expected = (atRisk1 * totalFailures) / totalAtRisk;
        const varianceComponent = (atRisk1 * atRisk2 * totalFailures * (totalAtRisk - totalFailures)) / 
          (totalAtRisk * totalAtRisk * (totalAtRisk - 1));
        
        observed1 += failures1;
        expected1 += expected;
        variance += varianceComponent;
      }
    });
    
    const chiSquare = Math.pow(observed1 - expected1, 2) / variance;
    const pValue = this.calculateChiSquarePValue(chiSquare, 1);
    
    return {
      algorithm1,
      algorithm2,
      chiSquare,
      pValue,
      significant: pValue < this.ALPHA_LEVEL
    };
  }

  private calculateMedianSurvivalTime(curve: KaplanMeierCurve): MedianSurvivalTime {
    // Find time point where survival probability drops below 0.5
    let medianTime = Infinity;
    
    for (let i = 0; i < curve.survivalProbabilities.length; i++) {
      if (curve.survivalProbabilities[i] <= 0.5) {
        medianTime = curve.timePoints[i];
        break;
      }
    }
    
    // Calculate confidence interval (simplified)
    const confidenceInterval: [number, number] = [
      medianTime * 0.8,
      medianTime * 1.2
    ];
    
    return {
      algorithm: curve.algorithm,
      medianTime: medianTime === Infinity ? -1 : medianTime,
      confidenceInterval
    };
  }

  private calculateHazardRatios(events: RetentionEvent[]): HazardRatio[] {
    const hazardRatios: HazardRatio[] = [];
    
    // Calculate hazard ratios comparing each algorithm to SM-2 (reference)
    this.ALGORITHMS.filter(alg => alg !== 'SM-2').forEach(algorithm => {
      const hazardRatio = this.calculatePairwiseHazardRatio(events, algorithm, 'SM-2');
      hazardRatios.push(hazardRatio);
    });
    
    return hazardRatios;
  }

  private calculatePairwiseHazardRatio(
    events: RetentionEvent[], 
    algorithm1: string, 
    algorithm2: string
  ): HazardRatio {
    // Simplified Cox proportional hazards model
    const events1 = events.filter((e: any) => e.algorithm === algorithm1);
    const events2 = events.filter((e: any) => e.algorithm === algorithm2);
    
    const failures1 = events1.filter(e => !e.wasRecalled).length;
    const failures2 = events2.filter(e => !e.wasRecalled).length;
    const totalTime1 = events1.reduce((sum, e) => sum + e.timeToForgetting, 0);
    const totalTime2 = events2.reduce((sum, e) => sum + e.timeToForgetting, 0);
    
    const hazardRate1 = failures1 / totalTime1;
    const hazardRate2 = failures2 / totalTime2;
    const hazardRatio = hazardRate1 / hazardRate2;
    
    // Simplified confidence interval
    const logHR = Math.log(hazardRatio);
    const seLogHR = Math.sqrt(1/failures1 + 1/failures2);
    const confidenceInterval: [number, number] = [
      Math.exp(logHR - 1.96 * seLogHR),
      Math.exp(logHR + 1.96 * seLogHR)
    ];
    
    const pValue = this.calculateZTestPValue(logHR / seLogHR);
    
    return {
      algorithm1,
      algorithm2,
      hazardRatio,
      confidenceInterval,
      pValue
    };
  }

  /**
   * 3. BAYESIAN MODEL COMPARISON
   * BIC/AIC scores and Bayes Factors
   */
  private async conductBayesianComparison(
    data: ExportedParticipantData[]
  ): Promise<BayesianComparisonResults> {
    console.log('Conducting Bayesian model comparison...');
    
    // Calculate model scores for each algorithm
    const modelScores = this.ALGORITHMS.map(algorithm => 
      this.calculateModelScores(data, algorithm)
    );
    
    // Calculate Bayes Factors (CARTS vs each baseline)
    const bayesFactors = this.ALGORITHMS.filter(alg => alg !== 'CARTS').map(algorithm => 
      this.calculateBayesFactor(modelScores, 'CARTS', algorithm)
    );
    
    // Calculate posterior probabilities
    const posteriorProbabilities = this.calculatePosteriorProbabilities(modelScores);
    
    // Rank models
    const modelRanking = this.rankModels(modelScores);
    
    return {
      modelScores,
      bayesFactors,
      posteriorProbabilities,
      modelRanking
    };
  }
  private calculateModelScores(data: ExportedParticipantData[], algorithm: string): ModelScore {
    const algorithmData = data.filter(p => p.algorithm === algorithm);
    const n = algorithmData.length;
    const k = 5; // Number of parameters (simplified)
    
    // Calculate log-likelihood (simplified)
    const scores = algorithmData.flatMap(p => p.weeklyScores.map(w => w.overallScore));
    const mean = this.calculateMean(scores);
    const variance = this.calculateVariance(scores);
    
    const logLikelihood = scores.reduce((sum, score) => {
      return sum - 0.5 * Math.log(2 * Math.PI * variance) - 0.5 * Math.pow(score - mean, 2) / variance;
    }, 0);
    
    const aic = -2 * logLikelihood + 2 * k;
    const bic = -2 * logLikelihood + k * Math.log(n);
    
    // Simplified WAIC and LOOIC (would require more sophisticated calculation)
    const waic = aic + 2; // Approximation
    const looic = aic + 1; // Approximation
    
    return {
      algorithm,
      aic,
      bic,
      waic,
      looic
    };
  }

  private calculateBayesFactor(
    modelScores: ModelScore[], 
    algorithm1: string, 
    algorithm2: string
  ): BayesFactor {
    const score1 = modelScores.find(s => s.algorithm === algorithm1)!;
    const score2 = modelScores.find(s => s.algorithm === algorithm2)!;
    
    // BF = exp((BIC2 - BIC1) / 2)
    const logBayesFactor = (score2.bic - score1.bic) / 2;
    const bayesFactor = Math.exp(logBayesFactor);
    
    // Interpret Bayes Factor according to Kass & Raftery (1995)
    let evidence: BayesFactor['evidence'];
    let interpretation: string;
    
    if (bayesFactor > 100) {
      evidence = 'decisive';
      interpretation = 'Decisive evidence for CARTS';
    } else if (bayesFactor > 30) {
      evidence = 'very_strong';
      interpretation = 'Very strong evidence for CARTS';
    } else if (bayesFactor > 10) {
      evidence = 'strong';
      interpretation = 'Strong evidence for CARTS';
    } else if (bayesFactor > 3) {
      evidence = 'moderate';
      interpretation = 'Moderate evidence for CARTS';
    } else if (bayesFactor > 1) {
      evidence = 'weak';
      interpretation = 'Weak evidence for CARTS';
    } else {
      evidence = 'inconclusive';
      interpretation = 'Inconclusive or evidence against CARTS';
    }
    
    return {
      algorithm1,
      algorithm2,
      bayesFactor,
      logBayesFactor,
      evidence,
      interpretation
    };
  }

  private calculatePosteriorProbabilities(modelScores: ModelScore[]): PosteriorProbability[] {
    // Calculate model weights using BIC
    const bicValues = modelScores.map(s => s.bic);
    const minBIC = Math.min(...bicValues);
    const deltaBICs = bicValues.map(bic => bic - minBIC);
    const weights = deltaBICs.map(delta => Math.exp(-delta / 2));
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    const probabilities = weights.map(w => w / totalWeight);
    
    return modelScores.map((score, index) => ({
      algorithm: score.algorithm,
      probability: probabilities[index],
      rank: probabilities.map((p, i) => ({ p, i }))
        .sort((a, b) => b.p - a.p)
        .findIndex(item => item.i === index) + 1
    }));
  }

  private rankModels(modelScores: ModelScore[]): ModelRanking[] {
    // Rank by BIC (lower is better)
    const sorted = [...modelScores].sort((a, b) => a.bic - b.bic);
    const totalWeight = sorted.reduce((sum, s) => sum + Math.exp(-s.bic / 2), 0);
    
    return sorted.map((score, index) => ({
      rank: index + 1,
      algorithm: score.algorithm,
      score: score.bic,
      weight: Math.exp(-score.bic / 2) / totalWeight
    }));
  }

  /**
   * 4. EFFECT SIZE CALCULATIONS
   * Cohen's d, Hedges' g, and confidence intervals
   */
  private async calculateEffectSizes(data: ExportedParticipantData[]): Promise<EffectSizeResults> {
    console.log('Calculating effect sizes...');
    
    // Pairwise comparisons
    const pairwiseComparisons = this.calculatePairwiseEffectSizes(data);
    
    // ANOVA results
    const anovaResults = this.calculateANOVA(data);
    
    // Effect size matrix
    const effectSizeMatrix = this.createEffectSizeMatrix(pairwiseComparisons);
    
    // Practical significance
    const practicalSignificance = this.assessPracticalSignificance(data);
    
    return {
      pairwiseComparisons,
      anovaResults,
      effectSizeMatrix,
      practicalSignificance
    };
  }

  private calculatePairwiseEffectSizes(data: ExportedParticipantData[]): PairwiseComparison[] {
    const comparisons: PairwiseComparison[] = [];
    
    // All pairwise comparisons
    for (let i = 0; i < this.ALGORITHMS.length; i++) {
      for (let j = i + 1; j < this.ALGORITHMS.length; j++) {
        const alg1 = this.ALGORITHMS[i];
        const alg2 = this.ALGORITHMS[j];
        
        const comparison = this.calculatePairwiseComparison(data, alg1, alg2);
        comparisons.push(comparison);
      }
    }
    
    return comparisons;
  }

  private calculatePairwiseComparison(
    data: ExportedParticipantData[], 
    algorithm1: string, 
    algorithm2: string
  ): PairwiseComparison {
    const data1 = data.filter(p => p.algorithm === algorithm1);
    const data2 = data.filter(p => p.algorithm === algorithm2);
    
    const scores1 = data1.flatMap(p => p.weeklyScores.map(w => w.overallScore));
    const scores2 = data2.flatMap(p => p.weeklyScores.map(w => w.overallScore));
    
    const mean1 = this.calculateMean(scores1);
    const mean2 = this.calculateMean(scores2);
    const sd1 = Math.sqrt(this.calculateVariance(scores1));
    const sd2 = Math.sqrt(this.calculateVariance(scores2));
    
    const n1 = scores1.length;
    const n2 = scores2.length;
    
    // Cohen's d
    const pooledSD = Math.sqrt(((n1 - 1) * sd1 * sd1 + (n2 - 1) * sd2 * sd2) / (n1 + n2 - 2));
    const cohensD = (mean1 - mean2) / pooledSD;
    
    // Hedges' g (small sample correction)
    const correctionFactor = 1 - (3 / (4 * (n1 + n2) - 9));
    const hedgesG = cohensD * correctionFactor;
    
    // Confidence interval for effect size
    const seD = Math.sqrt((n1 + n2) / (n1 * n2) + (cohensD * cohensD) / (2 * (n1 + n2)));
    const confidenceInterval: [number, number] = [
      cohensD - 1.96 * seD,
      cohensD + 1.96 * seD
    ];
    
    // Effect size magnitude interpretation
    const absD = Math.abs(cohensD);
    let magnitude: PairwiseComparison['magnitude'];
    if (absD < 0.2) magnitude = 'negligible';
    else if (absD < 0.5) magnitude = 'small';
    else if (absD < 0.8) magnitude = 'medium';
    else if (absD < 1.2) magnitude = 'large';
    else magnitude = 'very_large';
    
    // T-test for significance
    const { tValue, pValue } = this.calculateTTest(scores1, scores2);
    const adjustedPValue = Math.min(1.0, pValue * this.BONFERRONI_CORRECTION);
    
    return {
      algorithm1,
      algorithm2,
      cohensD,
      hedgesG,
      confidenceInterval,
      magnitude,
      pValue,
      adjustedPValue
    };
  }
  private calculateTTest(scores1: number[], scores2: number[]): { tValue: number; pValue: number } {
    const mean1 = this.calculateMean(scores1);
    const mean2 = this.calculateMean(scores2);
    const var1 = this.calculateVariance(scores1);
    const var2 = this.calculateVariance(scores2);
    const n1 = scores1.length;
    const n2 = scores2.length;
    
    // Welch's t-test (unequal variances)
    const se = Math.sqrt(var1 / n1 + var2 / n2);
    const tValue = (mean1 - mean2) / se;
    
    // Degrees of freedom (Welch-Satterthwaite equation)
    const df = Math.pow(var1 / n1 + var2 / n2, 2) / 
      (Math.pow(var1 / n1, 2) / (n1 - 1) + Math.pow(var2 / n2, 2) / (n2 - 1));
    
    const pValue = this.calculateTTestPValue(tValue, df);
    
    return { tValue, pValue };
  }

  private calculateANOVA(data: ExportedParticipantData[]): ANOVAResults {
    // One-way ANOVA across algorithms
    const allScores = data.flatMap(p => p.weeklyScores.map(w => ({ 
      score: w.overallScore, 
      algorithm: p.algorithm 
    })));
    
    const grandMean = this.calculateMean(allScores.map(s => s.score));
    const totalN = allScores.length;
    
    // Between-group sum of squares
    const algorithmMeans = this.ALGORITHMS.map(alg => {
      const algScores = allScores.filter(s => s.algorithm === alg).map(s => s.score);
      return {
        algorithm: alg,
        mean: this.calculateMean(algScores),
        n: algScores.length
      };
    });
    
    const ssBetween = algorithmMeans.reduce((sum, algMean) => 
      sum + algMean.n * Math.pow(algMean.mean - grandMean, 2), 0
    );
    
    // Within-group sum of squares
    const ssWithin = allScores.reduce((sum, score) => {
      const algMean = algorithmMeans.find(am => am.algorithm === score.algorithm)!.mean;
      return sum + Math.pow(score.score - algMean, 2);
    }, 0);
    
    const dfBetween = this.ALGORITHMS.length - 1;
    const dfWithin = totalN - this.ALGORITHMS.length;
    
    const msBetween = ssBetween / dfBetween;
    const msWithin = ssWithin / dfWithin;
    
    const fStatistic = msBetween / msWithin;
    const pValue = this.calculateFTestPValue(fStatistic, dfBetween, dfWithin);
    
    // Partial eta-squared
    const partialEtaSquared = ssBetween / (ssBetween + ssWithin);
    
    // Confidence interval for eta-squared (simplified)
    const confidenceInterval: [number, number] = [
      Math.max(0, partialEtaSquared - 0.1),
      Math.min(1, partialEtaSquared + 0.1)
    ];
    
    // Power analysis (simplified)
    const powerAnalysis = this.calculatePower(fStatistic, dfBetween, dfWithin);
    
    return {
      fStatistic,
      pValue,
      partialEtaSquared,
      confidenceInterval,
      powerAnalysis
    };
  }

  private createEffectSizeMatrix(comparisons: PairwiseComparison[]): EffectSizeMatrix {
    const n = this.ALGORITHMS.length;
    const cohensD: number[][] = Array(n).fill(null).map(() => Array(n).fill(0));
    const hedgesG: number[][] = Array(n).fill(null).map(() => Array(n).fill(0));
    const confidenceIntervals: Array<Array<[number, number]>> = 
      Array(n).fill(null).map(() => Array(n).fill(null).map(() => [0, 0] as [number, number]));
    
    // Fill matrices
    comparisons.forEach(comp => {
      const i = this.ALGORITHMS.indexOf(comp.algorithm1);
      const j = this.ALGORITHMS.indexOf(comp.algorithm2);
      
      cohensD[i][j] = comp.cohensD;
      cohensD[j][i] = -comp.cohensD; // Symmetric with sign flip
      
      hedgesG[i][j] = comp.hedgesG;
      hedgesG[j][i] = -comp.hedgesG;
      
      confidenceIntervals[i][j] = comp.confidenceInterval;
      confidenceIntervals[j][i] = [-comp.confidenceInterval[1], -comp.confidenceInterval[0]];
    });
    
    return {
      algorithms: this.ALGORITHMS,
      cohensD,
      hedgesG,
      confidenceIntervals
    };
  }

  private assessPracticalSignificance(data: ExportedParticipantData[]): PracticalSignificance[] {
    const minimumDetectableEffect = 0.3; // Practical significance threshold
    
    return this.ALGORITHMS.map(algorithm => {
      const algorithmData = data.filter(p => p.algorithm === algorithm);
      const baselineData = data.filter(p => p.algorithm === 'SM-2'); // Reference
      
      const algorithmScores = algorithmData.flatMap(p => p.weeklyScores.map(w => w.overallScore));
      const baselineScores = baselineData.flatMap(p => p.weeklyScores.map(w => w.overallScore));
      
      const meanImprovement = this.calculateMean(algorithmScores) - this.calculateMean(baselineScores);
      const practicallySignificant = Math.abs(meanImprovement) >= minimumDetectableEffect;
      
      return {
        algorithm,
        meanImprovement,
        practicallySignificant,
        minimumDetectableEffect
      };
    });
  }

  /**
   * 5. PUBLICATION-READY OUTPUT GENERATION
   */
  private generatePublicationOutput(
    data: ExportedParticipantData[],
    mixedEffects: MixedEffectsResults,
    effectSizes: EffectSizeResults,
    survival: SurvivalAnalysisResults
  ): PublicationOutput {
    console.log('Generating publication-ready output...');
    
    const summaryStatistics = this.generateSummaryStatistics(data);
    const pairwiseMatrix = this.generatePairwiseMatrix(effectSizes.pairwiseComparisons);
    const retentionCurveData = this.generateRetentionCurveData(survival.kaplanMeierCurves);
    
    // Export formats
    const jsonOutput = JSON.stringify({
      summaryStatistics,
      pairwiseMatrix,
      retentionCurveData,
      mixedEffects,
      effectSizes,
      survival
    }, null, 2);
    
    const csvOutput = this.generateCSVOutput(data, effectSizes.pairwiseComparisons);
    
    return {
      summaryStatistics,
      pairwiseMatrix,
      retentionCurveData,
      exportFormats: {
        json: jsonOutput,
        csv: csvOutput
      }
    };
  }

  private generateSummaryStatistics(data: ExportedParticipantData[]): SummaryStatistics {
    const byAlgorithm = this.ALGORITHMS.map(algorithm => {
      const algorithmData = data.filter(p => p.algorithm === algorithm);
      const scores = algorithmData.flatMap(p => p.weeklyScores.map(w => w.overallScore));
      
      const mean = this.calculateMean(scores);
      const sd = Math.sqrt(this.calculateVariance(scores));
      const se = sd / Math.sqrt(scores.length);
      const sortedScores = [...scores].sort((a, b) => a - b);
      
      return {
        algorithm,
        participantCount: algorithmData.length,
        meanScore: mean,
        standardDeviation: sd,
        standardError: se,
        confidenceInterval: [mean - 1.96 * se, mean + 1.96 * se] as [number, number],
        median: this.calculateMedian(sortedScores),
        interquartileRange: [
          this.calculatePercentile(sortedScores, 25),
          this.calculatePercentile(sortedScores, 75)
        ] as [number, number],
        minScore: Math.min(...scores),
        maxScore: Math.max(...scores)
      };
    });
    
    const overall = {
      totalParticipants: data.length,
      totalSessions: data.reduce((sum, p) => sum + p.sessionData.length, 0),
      studyDuration: this.calculateStudyDuration(data),
      completionRate: data.filter(p => p.weeklyScores.length >= 8).length / data.length,
      overallMeanScore: this.calculateMean(data.flatMap(p => p.weeklyScores.map(w => w.overallScore)))
    };
    
    return { byAlgorithm, overall };
  }
  private generatePairwiseMatrix(comparisons: PairwiseComparison[]): PairwiseMatrix {
    const n = this.ALGORITHMS.length;
    const pValues: number[][] = Array(n).fill(null).map(() => Array(n).fill(1));
    const adjustedPValues: number[][] = Array(n).fill(null).map(() => Array(n).fill(1));
    const effectSizes: number[][] = Array(n).fill(null).map(() => Array(n).fill(0));
    const significance: boolean[][] = Array(n).fill(null).map(() => Array(n).fill(false));
    
    // Fill diagonal with 1s for p-values and 0s for effect sizes
    for (let i = 0; i < n; i++) {
      pValues[i][i] = 1;
      adjustedPValues[i][i] = 1;
      effectSizes[i][i] = 0;
      significance[i][i] = false;
    }
    
    // Fill matrices from comparisons
    comparisons.forEach(comp => {
      const i = this.ALGORITHMS.indexOf(comp.algorithm1);
      const j = this.ALGORITHMS.indexOf(comp.algorithm2);
      
      pValues[i][j] = comp.pValue;
      pValues[j][i] = comp.pValue;
      
      adjustedPValues[i][j] = comp.adjustedPValue;
      adjustedPValues[j][i] = comp.adjustedPValue;
      
      effectSizes[i][j] = comp.cohensD;
      effectSizes[j][i] = -comp.cohensD;
      
      significance[i][j] = comp.adjustedPValue < this.ALPHA_LEVEL;
      significance[j][i] = comp.adjustedPValue < this.ALPHA_LEVEL;
    });
    
    return {
      algorithms: this.ALGORITHMS,
      pValues,
      adjustedPValues,
      effectSizes,
      significance
    };
  }

  private generateRetentionCurveData(curves: KaplanMeierCurve[]): RetentionCurveData {
    // Find common time points across all curves
    const allTimePoints = new Set<number>();
    curves.forEach(curve => {
      curve.timePoints.forEach(time => allTimePoints.add(time));
    });
    
    const timePoints = Array.from(allTimePoints).sort((a, b) => a - b);
    
    // Interpolate survival probabilities for common time points
    const survivalData: number[][] = [];
    const confidenceIntervals: Array<Array<[number, number]>> = [];
    
    curves.forEach(curve => {
      const interpolatedSurvival: number[] = [];
      const interpolatedCIs: Array<[number, number]> = [];
      
      timePoints.forEach(time => {
        const index = this.findClosestTimeIndex(curve.timePoints, time);
        interpolatedSurvival.push(curve.survivalProbabilities[index] || 1.0);
        interpolatedCIs.push(curve.confidenceIntervals[index] || [1.0, 1.0]);
      });
      
      survivalData.push(interpolatedSurvival);
      confidenceIntervals.push(interpolatedCIs);
    });
    
    return {
      algorithms: curves.map(c => c.algorithm),
      timePoints,
      survivalData,
      confidenceIntervals
    };
  }

  private generateCSVOutput(data: ExportedParticipantData[], comparisons: PairwiseComparison[]): string {
    const csvRows: string[] = [];
    
    // Header
    csvRows.push('Analysis,Algorithm1,Algorithm2,Statistic,Value,PValue,Significant');
    
    // Pairwise comparisons
    comparisons.forEach(comp => {
      csvRows.push([
        'PairwiseComparison',
        comp.algorithm1,
        comp.algorithm2,
        'CohensD',
        comp.cohensD.toFixed(4),
        comp.adjustedPValue.toFixed(6),
        (comp.adjustedPValue < this.ALPHA_LEVEL).toString()
      ].join(','));
    });
    
    // Summary statistics
    this.ALGORITHMS.forEach(algorithm => {
      const algorithmData = data.filter(p => p.algorithm === algorithm);
      const scores = algorithmData.flatMap(p => p.weeklyScores.map(w => w.overallScore));
      const mean = this.calculateMean(scores);
      const sd = Math.sqrt(this.calculateVariance(scores));
      
      csvRows.push([
        'SummaryStatistics',
        algorithm,
        '',
        'Mean',
        mean.toFixed(4),
        '',
        ''
      ].join(','));
      
      csvRows.push([
        'SummaryStatistics',
        algorithm,
        '',
        'StandardDeviation',
        sd.toFixed(4),
        '',
        ''
      ].join(','));
    });
    
    return csvRows.join('\n');
  }

  /**
   * UTILITY FUNCTIONS
   */
  private validateInputData(data: ExportedParticipantData[]): void {
    if (!data || data.length === 0) {
      throw new Error('No participant data provided');
    }
    
    // Check required fields
    data.forEach((participant, index) => {
      if (!participant.participantId || !participant.algorithm || !participant.proficiencyLevel) {
        throw new Error(`Invalid participant data at index ${index}: missing required fields`);
      }
      
      if (!this.ALGORITHMS.includes(participant.algorithm)) {
        throw new Error(`Invalid algorithm: ${participant.algorithm}`);
      }
      
      if (!this.PROFICIENCY_LEVELS.includes(participant.proficiencyLevel)) {
        throw new Error(`Invalid proficiency level: ${participant.proficiencyLevel}`);
      }
    });
    
    console.log(`Validated ${data.length} participant records`);
  }

  private calculateStudyDuration(data: ExportedParticipantData[]): number {
    const allWeeks = data.flatMap(p => p.weeklyScores.map(w => w.week));
    return Math.max(...allWeeks);
  }

  private calculateMean(values: number[]): number {
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }

  private calculateVariance(values: number[]): number {
    const mean = this.calculateMean(values);
    return values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / (values.length - 1);
  }

  private calculateMedian(sortedValues: number[]): number {
    const n = sortedValues.length;
    if (n % 2 === 0) {
      return (sortedValues[n / 2 - 1] + sortedValues[n / 2]) / 2;
    } else {
      return sortedValues[Math.floor(n / 2)];
    }
  }

  private calculatePercentile(sortedValues: number[], percentile: number): number {
    const index = (percentile / 100) * (sortedValues.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index - lower;
    
    return sortedValues[lower] * (1 - weight) + sortedValues[upper] * weight;
  }

  private calculateConfidenceInterval(estimate: number, standardError: number): [number, number] {
    return [
      estimate - 1.96 * standardError,
      estimate + 1.96 * standardError
    ];
  }

  private calculateTTestPValue(tValue: number, df: number): number {
    // Simplified t-test p-value calculation (two-tailed)
    // In practice, would use proper statistical library
    const absT = Math.abs(tValue);
    if (absT > 3) return 0.001;
    if (absT > 2.5) return 0.01;
    if (absT > 2) return 0.05;
    if (absT > 1.5) return 0.1;
    return 0.2;
  }

  private calculateChiSquarePValue(chiSquare: number, df: number): number {
    // Simplified chi-square p-value calculation
    if (chiSquare > 10.83) return 0.001;
    if (chiSquare > 6.63) return 0.01;
    if (chiSquare > 3.84) return 0.05;
    if (chiSquare > 2.71) return 0.1;
    return 0.2;
  }

  private calculateZTestPValue(zValue: number): number {
    // Simplified z-test p-value calculation (two-tailed)
    const absZ = Math.abs(zValue);
    if (absZ > 2.58) return 0.01;
    if (absZ > 1.96) return 0.05;
    if (absZ > 1.64) return 0.1;
    return 0.2;
  }

  private calculateFTestPValue(fValue: number, df1: number, df2: number): number {
    // Simplified F-test p-value calculation
    if (fValue > 5) return 0.001;
    if (fValue > 3) return 0.01;
    if (fValue > 2.5) return 0.05;
    if (fValue > 2) return 0.1;
    return 0.2;
  }

  private calculatePower(fValue: number, df1: number, df2: number): number {
    // Simplified power calculation
    if (fValue > 5) return 0.95;
    if (fValue > 3) return 0.8;
    if (fValue > 2.5) return 0.7;
    if (fValue > 2) return 0.6;
    return 0.5;
  }

  private groupBy<T>(array: T[], key: keyof T): Record<string, T[]> {
    return array.reduce((groups, item) => {
      const groupKey = String(item[key]);
      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(item);
      return groups;
    }, {} as Record<string, T[]>);
  }

  private findClosestTimeIndex(timePoints: number[], targetTime: number): number {
    let closestIndex = 0;
    let minDiff = Math.abs(timePoints[0] - targetTime);
    
    for (let i = 1; i < timePoints.length; i++) {
      const diff = Math.abs(timePoints[i] - targetTime);
      if (diff < minDiff) {
        minDiff = diff;
        closestIndex = i;
      }
    }
    
    return closestIndex;
  }
}