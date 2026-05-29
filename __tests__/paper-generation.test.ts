// __tests__/paper-generation.test.ts
// Tests for paper generation scripts

import { promises as fs } from 'fs';
import { join } from 'path';
import { PaperFigureGenerator } from '../scripts/generate-paper-figures';
import { PaperTableGenerator } from '../scripts/generate-paper-tables';
import { ResultsSectionGenerator } from '../scripts/generate-results-section';
import { AbstractGenerator } from '../scripts/generate-abstract';
import { StatisticalResults } from '../lib/statistical-analysis';

describe('Paper Generation', () => {
  let mockResults: StatisticalResults;

  beforeEach(() => {
    mockResults = generateMockStatisticalResults();
  });

  describe('PaperFigureGenerator', () => {
    let generator: PaperFigureGenerator;

    beforeEach(() => {
      generator = new PaperFigureGenerator(mockResults);
    });

    test('should generate retention curves figure', () => {
      const figure = generator['generateRetentionCurves']();
      
      expect(figure.title).toBe('Vocabulary Retention Curves by Algorithm');
      expect(figure.algorithms).toHaveLength(6);
      expect(figure.timePoints).toBeInstanceOf(Array);
      expect(figure.survivalProbabilities).toHaveLength(6);
      expect(figure.confidenceIntervals).toHaveLength(6);
      expect(figure.colors).toHaveLength(6);
      expect(figure.legendLabels).toHaveLength(6);
    });

    test('should generate effect size heatmap', () => {
      const figure = generator['generateEffectSizeHeatmap']();
      
      expect(figure.title).toBe('Pairwise Effect Sizes (Cohen\'s d) Between Algorithms');
      expect(figure.algorithms).toHaveLength(6);
      expect(figure.effectSizeMatrix).toHaveLength(6);
      expect(figure.significanceMatrix).toHaveLength(6);
      expect(figure.colorScale).toHaveProperty('min');
      expect(figure.colorScale).toHaveProperty('max');
      expect(figure.colorScale).toHaveProperty('midpoint');
      expect(figure.annotations).toHaveLength(6);
    });

    test('should generate learning efficiency figure', () => {
      const figure = generator['generateLearningEfficiency']();
      
      expect(figure.title).toBe('Learning Efficiency by Proficiency Level and Algorithm');
      expect(figure.proficiencyLevels).toEqual(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']);
      expect(figure.algorithms).toHaveLength(6);
      expect(figure.meanScores).toHaveLength(6);
      expect(figure.standardErrors).toHaveLength(6);
      expect(figure.colors).toHaveLength(6);
    });

    test('should generate context transfer progression figure', () => {
      const figure = generator['generateContextTransferProgression']();
      
      expect(figure.title).toBe('Context Transfer Score Progression Over 8 Weeks');
      expect(figure.weeks).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
      expect(figure.algorithms).toHaveLength(6);
      expect(figure.contextTransferScores).toHaveLength(6);
      expect(figure.confidenceIntervals).toHaveLength(6);
      expect(figure.colors).toHaveLength(6);
    });

    test('should use correct algorithm display names', () => {
      expect(generator['getAlgorithmDisplayName']('SM-2')).toBe('SuperMemo-2');
      expect(generator['getAlgorithmDisplayName']('HLR')).toBe('Half-Life Regression');
      expect(generator['getAlgorithmDisplayName']('CARTS')).toBe('CARTS (Ours)');
      expect(generator['getAlgorithmDisplayName']('DART')).toBe('DART (Ours)');
    });

    test('should calculate algorithm effects correctly', () => {
      expect(generator['getAlgorithmEffect']('SM-2')).toBe(0.00);
      expect(generator['getAlgorithmEffect']('CARTS')).toBe(0.12);
      expect(generator['getAlgorithmEffect']('DART')).toBe(0.08);
    });
  });

  describe('PaperTableGenerator', () => {
    let generator: PaperTableGenerator;

    beforeEach(() => {
      generator = new PaperTableGenerator(mockResults);
    });

    test('should generate summary statistics table', () => {
      const table = generator['generateSummaryStatistics']();
      
      expect(table.title).toBe('Descriptive Statistics by Algorithm');
      expect(table.headers).toContain('Algorithm');
      expect(table.headers).toContain('Mean');
      expect(table.headers).toContain('SD');
      expect(table.rows).toHaveLength(6);
      expect(table.caption).toContain('Descriptive statistics');
      
      table.rows.forEach(row => {
        expect(typeof row.algorithm).toBe('string');
        expect(typeof row.n).toBe('number');
        expect(typeof row.mean).toBe('number');
        expect(typeof row.sd).toBe('number');
      });
    });

    test('should generate pairwise comparison table', () => {
      const table = generator['generatePairwiseComparison']();
      
      expect(table.title).toBe('Pairwise Comparison Matrix');
      expect(table.algorithms).toHaveLength(6);
      expect(table.pValues).toHaveLength(6);
      expect(table.adjustedPValues).toHaveLength(6);
      expect(table.effectSizes).toHaveLength(6);
      expect(table.significance).toHaveLength(6);
      expect(table.caption).toContain('Pairwise comparisons');
    });

    test('should generate mixed-effects table', () => {
      const table = generator['generateMixedEffectsResults']();
      
      expect(table.title).toBe('Mixed-Effects Model Results');
      expect(table.effects).toBeInstanceOf(Array);
      expect(table.modelFit).toHaveProperty('logLikelihood');
      expect(table.modelFit).toHaveProperty('aic');
      expect(table.modelFit).toHaveProperty('bic');
      expect(table.caption).toContain('Fixed effects');
      
      table.effects.forEach(effect => {
        expect(typeof effect.effect).toBe('string');
        expect(typeof effect.coefficient).toBe('number');
        expect(typeof effect.pValue).toBe('number');
      });
    });

    test('should generate Bayesian comparison table', () => {
      const table = generator['generateBayesianComparison']();
      
      expect(table.title).toBe('Bayesian Model Comparison');
      expect(table.models).toHaveLength(6);
      expect(table.caption).toContain('Bayesian model comparison');
      
      table.models.forEach(model => {
        expect(typeof model.algorithm).toBe('string');
        expect(typeof model.rank).toBe('number');
        expect(typeof model.bic).toBe('number');
        expect(typeof model.bayesFactor).toBe('number');
      });
    });

    test('should convert tables to CSV format', () => {
      const table = generator['generateSummaryStatistics']();
      const csv = generator['convertToCSV'](table);
      
      expect(csv).toContain('Algorithm');
      expect(csv).toContain('Mean');
      expect(csv).toContain('SD');
      
      const lines = csv.split('\n');
      expect(lines.length).toBeGreaterThan(6); // Header + 6 algorithms
    });

    test('should convert tables to LaTeX format', () => {
      const table = generator['generateSummaryStatistics']();
      const latex = generator['convertToLaTeX'](table);
      
      expect(latex).toContain('\\begin{table}');
      expect(latex).toContain('\\end{table}');
      expect(latex).toContain('\\begin{tabular}');
      expect(latex).toContain('\\end{tabular}');
      expect(latex).toContain('\\caption{');
    });

    test('should format significance symbols correctly', () => {
      expect(generator['getSignificanceSymbol'](0.0001)).toBe('***');
      expect(generator['getSignificanceSymbol'](0.005)).toBe('**');
      expect(generator['getSignificanceSymbol'](0.03)).toBe('*');
      expect(generator['getSignificanceSymbol'](0.1)).toBe('');
    });

    test('should round numbers correctly', () => {
      expect(generator['roundTo'](3.14159, 2)).toBe(3.14);
      expect(generator['roundTo'](3.14159, 3)).toBe(3.142);
      expect(generator['roundTo'](3.14159, 0)).toBe(3);
    });
  });

  describe('ResultsSectionGenerator', () => {
    let generator: ResultsSectionGenerator;

    beforeEach(() => {
      generator = new ResultsSectionGenerator(mockResults);
    });

    test('should generate complete results section', () => {
      const results = generator.generateResultsSection();
      
      expect(results).toContain('# Results');
      expect(results).toContain('## Descriptive Statistics');
      expect(results).toContain('## RQ1: DART Algorithm Performance');
      expect(results).toContain('## RQ2: CARTS Algorithm Performance');
      expect(results).toContain('## RQ3: Context Transfer Assessment Validation');
      expect(results).toContain('## RQ4: Component Contribution Analysis');
      
      // Check word count (should be substantial)
      const wordCount = results.split(/\s+/).length;
      expect(wordCount).toBeGreaterThan(500);
    });

    test('should generate descriptive statistics section', () => {
      const section = generator['generateDescriptiveStatistics']();
      
      expect(section).toContain('participants');
      expect(section).toContain('completion rate');
      expect(section).toContain('mean learning performance');
      expect(section).toContain('Table 1');
    });

    test('should format p-values correctly', () => {
      expect(generator['formatPValue'](0.0001)).toBe('< 0.001');
      expect(generator['formatPValue'](0.005)).toBe('= 0.005');
      expect(generator['formatPValue'](0.05)).toBe('= 0.05');
    });

    test('should classify effect size magnitudes correctly', () => {
      expect(generator['getEffectSizeMagnitude'](0.1)).toBe('negligible');
      expect(generator['getEffectSizeMagnitude'](0.3)).toBe('small');
      expect(generator['getEffectSizeMagnitude'](0.6)).toBe('medium');
      expect(generator['getEffectSizeMagnitude'](0.9)).toBe('large');
      expect(generator['getEffectSizeMagnitude'](1.5)).toBe('very large');
    });

    test('should use correct algorithm display names', () => {
      expect(generator['getAlgorithmDisplayName']('SM-2')).toBe('SuperMemo-2');
      expect(generator['getAlgorithmDisplayName']('HLR')).toBe('Half-Life Regression');
      expect(generator['getAlgorithmDisplayName']('CARTS')).toBe('CARTS');
    });
  });

  describe('AbstractGenerator', () => {
    let generator: AbstractGenerator;

    beforeEach(() => {
      generator = new AbstractGenerator(mockResults);
    });

    test('should generate complete abstract', () => {
      const abstract = generator.generateAbstract();
      
      expect(abstract).toContain('spaced repetition');
      expect(abstract).toContain('CARTS');
      expect(abstract).toContain('deep reinforcement learning');
      expect(abstract).toContain('longitudinal study');
      
      // Check word count
      const wordCount = abstract.split(/\s+/).length;
      expect(wordCount).toBeLessThanOrEqual(250);
      expect(wordCount).toBeGreaterThan(200);
    });

    test('should generate background section', () => {
      const background = generator['generateBackground']();
      
      expect(background).toContain('Spaced repetition systems');
      expect(background).toContain('contextual diversity');
      expect(background).toContain('retrieval difficulty');
      
      const wordCount = background.split(/\s+/).length;
      expect(wordCount).toBeGreaterThan(40);
      expect(wordCount).toBeLessThan(70);
    });

    test('should generate method section', () => {
      const method = generator['generateMethod']();
      
      expect(method).toContain('CARTS');
      expect(method).toContain('Transformer');
      expect(method).toContain('longitudinal study');
      expect(method).toContain('LLM-as-a-Judge');
      
      const wordCount = method.split(/\s+/).length;
      expect(wordCount).toBeGreaterThan(50);
      expect(wordCount).toBeLessThan(80);
    });

    test('should generate results section', () => {
      const results = generator['generateResults']();
      
      expect(results).toContain('CARTS');
      expect(results).toContain('superior performance');
      expect(results).toContain('Bayesian model comparison');
      expect(results).toContain('survival analysis');
      
      const wordCount = results.split(/\s+/).length;
      expect(wordCount).toBeGreaterThan(70);
      expect(wordCount).toBeLessThan(100);
    });

    test('should generate conclusion section', () => {
      const conclusion = generator['generateConclusion']();
      
      expect(conclusion).toContain('joint optimization');
      expect(conclusion).toContain('vocabulary learning');
      expect(conclusion).toContain('LLM-as-a-Judge');
      
      const wordCount = conclusion.split(/\s+/).length;
      expect(wordCount).toBeGreaterThan(30);
      expect(wordCount).toBeLessThan(60);
    });

    test('should generate appropriate keywords', () => {
      const keywords = generator.generateKeywords();
      
      expect(keywords).toContain('spaced repetition');
      expect(keywords).toContain('deep reinforcement learning');
      expect(keywords).toContain('vocabulary learning');
      expect(keywords).toContain('context transfer');
      expect(keywords.length).toBeGreaterThanOrEqual(6);
      expect(keywords.length).toBeLessThanOrEqual(10);
    });

    test('should generate title suggestions', () => {
      const titles = generator.generateTitleSuggestions();
      
      expect(titles.length).toBeGreaterThanOrEqual(3);
      titles.forEach(title => {
        expect(title).toContain('CARTS');
        expect(title.length).toBeGreaterThan(50);
        expect(title.length).toBeLessThan(120);
      });
    });
  });

  describe('File Output Validation', () => {
    test('should validate JSON figure output format', () => {
      const generator = new PaperFigureGenerator(mockResults);
      const figure = generator['generateRetentionCurves']();
      
      // Should be valid JSON
      expect(() => JSON.stringify(figure)).not.toThrow();
      
      // Should have required properties
      expect(figure).toHaveProperty('title');
      expect(figure).toHaveProperty('algorithms');
      expect(figure).toHaveProperty('timePoints');
      expect(figure).toHaveProperty('survivalProbabilities');
    });

    test('should validate CSV table output format', () => {
      const generator = new PaperTableGenerator(mockResults);
      const table = generator['generateSummaryStatistics']();
      const csv = generator['convertToCSV'](table);
      
      // Should have proper CSV structure
      const lines = csv.split('\n');
      expect(lines.length).toBeGreaterThan(1);
      
      // Header should have commas
      expect(lines[0]).toContain(',');
      
      // Data rows should have same number of columns as header
      const headerCols = lines[0].split(',').length;
      lines.slice(1).forEach(line => {
        if (line.trim()) {
          expect(line.split(',').length).toBe(headerCols);
        }
      });
    });

    test('should validate LaTeX table output format', () => {
      const generator = new PaperTableGenerator(mockResults);
      const table = generator['generateSummaryStatistics']();
      const latex = generator['convertToLaTeX'](table);
      
      // Should have proper LaTeX structure
      expect(latex).toMatch(/\\begin{table}/);
      expect(latex).toMatch(/\\end{table}/);
      expect(latex).toMatch(/\\begin{tabular}/);
      expect(latex).toMatch(/\\end{tabular}/);
      expect(latex).toMatch(/\\caption{/);
    });

    test('should validate markdown results format', () => {
      const generator = new ResultsSectionGenerator(mockResults);
      const results = generator.generateResultsSection();
      
      // Should have proper markdown structure
      expect(results).toMatch(/^# Results/m);
      expect(results).toMatch(/## RQ\d:/gm);
      expect(results).toMatch(/\*\w+\*/g); // Italics for statistics
    });

    test('should validate abstract word count', () => {
      const generator = new AbstractGenerator(mockResults);
      const abstract = generator.generateAbstract();
      
      const wordCount = abstract.split(/\s+/).length;
      expect(wordCount).toBeLessThanOrEqual(250);
      expect(wordCount).toBeGreaterThan(150);
    });
  });

  describe('Error Handling', () => {
    test('should handle missing data gracefully', () => {
      const incompleteResults = { ...mockResults };
      delete (incompleteResults as any).publicationOutput;
      
      expect(() => new PaperFigureGenerator(incompleteResults)).not.toThrow();
      expect(() => new PaperTableGenerator(incompleteResults)).not.toThrow();
    });

    test('should handle empty arrays gracefully', () => {
      const emptyResults = { ...mockResults };
      emptyResults.effectSizes.pairwiseComparisons = [];
      
      const generator = new ResultsSectionGenerator(emptyResults);
      expect(() => generator.generateResultsSection()).not.toThrow();
    });

    test('should handle undefined algorithm names', () => {
      const generator = new PaperFigureGenerator(mockResults);
      expect(generator['getAlgorithmDisplayName']('UNKNOWN')).toBe('UNKNOWN');
    });
  });
});

/**
 * Generate mock statistical results for testing
 */
function generateMockStatisticalResults(): StatisticalResults {
  const algorithms = ['SM-2', 'HLR', 'KARL', 'LECTOR', 'DART', 'CARTS'];
  
  return {
    mixedEffectsModel: {
      fixedEffects: {
        algorithm: algorithms.slice(1).map((alg, i) => ({
          coefficient: 0.02 + i * 0.02,
          standardError: 0.01,
          tValue: 2.0 + i,
          pValue: 0.05 / (i + 1),
          confidenceInterval: [0.01 + i * 0.02, 0.03 + i * 0.02] as [number, number],
          effectName: `${alg} vs SM-2`
        })),
        proficiencyLevel: ['A2', 'B1', 'B2', 'C1', 'C2'].map((level, i) => ({
          coefficient: 0.05 + i * 0.02,
          standardError: 0.015,
          tValue: 3.0 + i,
          pValue: 0.01 / (i + 1),
          confidenceInterval: [0.03 + i * 0.02, 0.07 + i * 0.02] as [number, number],
          effectName: `${level} vs A1`
        })),
        weekNumber: {
          coefficient: 0.023,
          standardError: 0.005,
          tValue: 4.6,
          pValue: 0.001,
          confidenceInterval: [0.013, 0.033] as [number, number],
          effectName: 'Week Number (Linear Trend)'
        },
        interactions: []
      },
      randomEffects: {
        participantVariance: 0.15,
        wordItemVariance: 0.05,
        residualVariance: 0.25
      },
      modelFit: {
        logLikelihood: -1250.5,
        aic: 2520.0,
        bic: 2580.3,
        marginalR2: 0.25,
        conditionalR2: 0.45
      }
    },
    survivalAnalysis: {
      kaplanMeierCurves: algorithms.map(alg => ({
        algorithm: alg,
        timePoints: [1, 3, 7, 14, 21, 28],
        survivalProbabilities: [0.95, 0.90, 0.85, 0.75, 0.65, 0.55],
        confidenceIntervals: [[0.92, 0.98], [0.85, 0.95], [0.80, 0.90], [0.68, 0.82], [0.58, 0.72], [0.48, 0.62]] as Array<[number, number]>,
        atRisk: [100, 95, 90, 80, 70, 60]
      })),
      logRankTests: [],
      medianSurvivalTimes: algorithms.map(alg => ({
        algorithm: alg,
        medianTime: 15 + Math.random() * 10,
        confidenceInterval: [12, 25] as [number, number]
      })),
      hazardRatios: []
    },
    bayesianComparison: {
      modelScores: algorithms.map((alg, i) => ({
        algorithm: alg,
        aic: 2500 + i * 10,
        bic: 2550 + i * 10,
        waic: 2520 + i * 10,
        looic: 2530 + i * 10
      })),
      bayesFactors: [],
      posteriorProbabilities: algorithms.map((alg, i) => ({
        algorithm: alg,
        probability: 0.3 - i * 0.05,
        rank: i + 1
      })),
      modelRanking: algorithms.map((alg, i) => ({
        rank: i + 1,
        algorithm: alg,
        score: 2550 + i * 10,
        weight: 0.3 - i * 0.05
      }))
    },
    effectSizes: {
      pairwiseComparisons: [],
      anovaResults: {
        fStatistic: 12.4,
        pValue: 0.001,
        partialEtaSquared: 0.15,
        confidenceInterval: [0.08, 0.25] as [number, number],
        powerAnalysis: 0.95
      },
      effectSizeMatrix: {
        algorithms,
        cohensD: algorithms.map(() => algorithms.map(() => Math.random() - 0.5)),
        hedgesG: algorithms.map(() => algorithms.map(() => Math.random() - 0.5)),
        confidenceIntervals: algorithms.map(() => algorithms.map(() => [-0.2, 0.8] as [number, number]))
      },
      practicalSignificance: algorithms.map(alg => ({
        algorithm: alg,
        meanImprovement: Math.random() * 0.2,
        practicallySignificant: Math.random() > 0.5,
        minimumDetectableEffect: 0.3
      }))
    },
    publicationOutput: {
      summaryStatistics: {
        byAlgorithm: algorithms.map((alg, i) => ({
          algorithm: alg,
          participantCount: 33 + (i % 2),
          meanScore: 0.65 + i * 0.03,
          standardDeviation: 0.12 + Math.random() * 0.05,
          standardError: 0.02,
          confidenceInterval: [0.60 + i * 0.03, 0.70 + i * 0.03] as [number, number],
          median: 0.66 + i * 0.03,
          interquartileRange: [0.58 + i * 0.03, 0.72 + i * 0.03] as [number, number],
          minScore: 0.45 + i * 0.02,
          maxScore: 0.85 + i * 0.02
        })),
        overall: {
          totalParticipants: 200,
          totalSessions: 8000,
          studyDuration: 8,
          completionRate: 0.85,
          overallMeanScore: 0.72
        }
      },
      pairwiseMatrix: {
        algorithms,
        pValues: algorithms.map(() => algorithms.map(() => Math.random() * 0.1)),
        adjustedPValues: algorithms.map(() => algorithms.map(() => Math.random() * 0.1)),
        effectSizes: algorithms.map(() => algorithms.map(() => Math.random() - 0.5)),
        significance: algorithms.map(() => algorithms.map(() => Math.random() > 0.5))
      },
      retentionCurveData: {
        algorithms,
        timePoints: [1, 3, 7, 14, 21, 28],
        survivalData: algorithms.map(() => [0.95, 0.90, 0.85, 0.75, 0.65, 0.55]),
        confidenceIntervals: algorithms.map(() => [[0.92, 0.98], [0.85, 0.95], [0.80, 0.90], [0.68, 0.82], [0.58, 0.72], [0.48, 0.62]] as Array<[number, number]>)
      },
      exportFormats: {
        json: '{}',
        csv: 'header,data\nvalue1,value2'
      }
    },
    metadata: {
      analysisDate: new Date(),
      datasetSize: 200,
      algorithms,
      studyDuration: 8,
      analysisVersion: '1.0.0'
    }
  };
}