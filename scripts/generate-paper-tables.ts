#!/usr/bin/env tsx
// scripts/generate-paper-tables.ts
// Generate publication-ready tables for CARTS research paper

import { promises as fs } from 'fs';
import { join } from 'path';
import { StatisticalResults } from '../lib/statistical-analysis';

/**
 * Table Data Interfaces
 */
export interface SummaryStatisticsTable {
  title: string;
  headers: string[];
  rows: Array<{
    algorithm: string;
    n: number;
    mean: number;
    sd: number;
    se: number;
    ci_lower: number;
    ci_upper: number;
    median: number;
    iqr_lower: number;
    iqr_upper: number;
  }>;
  caption: string;
}

export interface PairwiseComparisonTable {
  title: string;
  algorithms: string[];
  pValues: number[][];
  adjustedPValues: number[][];
  effectSizes: number[][];
  significance: string[][];
  caption: string;
}

export interface MixedEffectsTable {
  title: string;
  effects: Array<{
    effect: string;
    coefficient: number;
    se: number;
    tValue: number;
    pValue: number;
    ci_lower: number;
    ci_upper: number;
    significance: string;
  }>;
  modelFit: {
    logLikelihood: number;
    aic: number;
    bic: number;
    marginalR2: number;
    conditionalR2: number;
  };
  caption: string;
}

export interface BayesianComparisonTable {
  title: string;
  models: Array<{
    algorithm: string;
    rank: number;
    bic: number;
    bayesFactor: number;
    posteriorProb: number;
    evidence: string;
  }>;
  caption: string;
}

/**
 * Paper Table Generator
 */
export class PaperTableGenerator {
  private results: StatisticalResults;

  constructor(results: StatisticalResults) {
    this.results = results;
  }

  /**
   * Generate all tables for the paper
   */
  async generateAllTables(): Promise<void> {
    console.log('📊 Generating paper tables...');

    await this.ensureDirectoryExists('results/tables');

    // Generate each table
    const table1 = this.generateSummaryStatistics();
    const table2 = this.generatePairwiseComparison();
    const table3 = this.generateMixedEffectsResults();
    const table4 = this.generateBayesianComparison();

    // Save tables in multiple formats
    await Promise.all([
      this.saveTable('table1-summary-statistics', table1),
      this.saveTable('table2-pairwise-comparison', table2),
      this.saveTable('table3-mixed-effects', table3),
      this.saveTable('table4-bayesian-comparison', table4)
    ]);

    console.log('✅ All tables generated successfully');
  }

  /**
   * Table 1: Summary Statistics
   */
  private generateSummaryStatistics(): SummaryStatisticsTable {
    const summaryStats = this.results.publicationOutput.summaryStatistics.byAlgorithm;

    return {
      title: 'Descriptive Statistics by Algorithm',
      headers: ['Algorithm', 'N', 'Mean', 'SD', 'SE', '95% CI Lower', '95% CI Upper', 'Median', 'IQR Lower', 'IQR Upper'],
      rows: summaryStats.map(stat => ({
        algorithm: this.getAlgorithmDisplayName(stat.algorithm),
        n: stat.participantCount,
        mean: this.roundTo(stat.meanScore, 3),
        sd: this.roundTo(stat.standardDeviation, 3),
        se: this.roundTo(stat.standardError, 3),
        ci_lower: this.roundTo(stat.confidenceInterval[0], 3),
        ci_upper: this.roundTo(stat.confidenceInterval[1], 3),
        median: this.roundTo(stat.median, 3),
        iqr_lower: this.roundTo(stat.interquartileRange[0], 3),
        iqr_upper: this.roundTo(stat.interquartileRange[1], 3)
      })),
      caption: 'Descriptive statistics for overall learning performance by algorithm. N = number of participants; CI = confidence interval; IQR = interquartile range. Higher scores indicate better learning outcomes.'
    };
  }

  /**
   * Table 2: Pairwise Comparison Matrix
   */
  private generatePairwiseComparison(): PairwiseComparisonTable {
    const matrix = this.results.publicationOutput.pairwiseMatrix;
    
    // Create significance symbols
    const significance: string[][] = [];
    for (let i = 0; i < matrix.algorithms.length; i++) {
      significance[i] = [];
      for (let j = 0; j < matrix.algorithms.length; j++) {
        if (i === j) {
          significance[i][j] = '—';
        } else {
          const p = matrix.adjustedPValues[i][j];
          if (p < 0.001) significance[i][j] = '***';
          else if (p < 0.01) significance[i][j] = '**';
          else if (p < 0.05) significance[i][j] = '*';
          else significance[i][j] = 'ns';
        }
      }
    }

    return {
      title: 'Pairwise Comparison Matrix',
      algorithms: matrix.algorithms.map(alg => this.getAlgorithmDisplayName(alg)),
      pValues: matrix.pValues,
      adjustedPValues: matrix.adjustedPValues,
      effectSizes: matrix.effectSizes,
      significance,
      caption: 'Pairwise comparisons between algorithms. Upper triangle: Cohen\'s d effect sizes. Lower triangle: Bonferroni-corrected p-values. Significance: *** p < 0.001, ** p < 0.01, * p < 0.05, ns = not significant.'
    };
  }

  /**
   * Table 3: Mixed-Effects Model Results
   */
  private generateMixedEffectsResults(): MixedEffectsTable {
    const fixedEffects = this.results.mixedEffectsModel.fixedEffects;
    const modelFit = this.results.mixedEffectsModel.modelFit;

    const effects = [
      // Algorithm effects
      ...fixedEffects.algorithm.map(effect => ({
        effect: effect.effectName,
        coefficient: this.roundTo(effect.coefficient, 4),
        se: this.roundTo(effect.standardError, 4),
        tValue: this.roundTo(effect.tValue, 3),
        pValue: this.roundTo(effect.pValue, 4),
        ci_lower: this.roundTo(effect.confidenceInterval[0], 4),
        ci_upper: this.roundTo(effect.confidenceInterval[1], 4),
        significance: this.getSignificanceSymbol(effect.pValue)
      })),
      // Proficiency effects
      ...fixedEffects.proficiencyLevel.map(effect => ({
        effect: effect.effectName,
        coefficient: this.roundTo(effect.coefficient, 4),
        se: this.roundTo(effect.standardError, 4),
        tValue: this.roundTo(effect.tValue, 3),
        pValue: this.roundTo(effect.pValue, 4),
        ci_lower: this.roundTo(effect.confidenceInterval[0], 4),
        ci_upper: this.roundTo(effect.confidenceInterval[1], 4),
        significance: this.getSignificanceSymbol(effect.pValue)
      })),
      // Week effect
      {
        effect: fixedEffects.weekNumber.effectName,
        coefficient: this.roundTo(fixedEffects.weekNumber.coefficient, 4),
        se: this.roundTo(fixedEffects.weekNumber.standardError, 4),
        tValue: this.roundTo(fixedEffects.weekNumber.tValue, 3),
        pValue: this.roundTo(fixedEffects.weekNumber.pValue, 4),
        ci_lower: this.roundTo(fixedEffects.weekNumber.confidenceInterval[0], 4),
        ci_upper: this.roundTo(fixedEffects.weekNumber.confidenceInterval[1], 4),
        significance: this.getSignificanceSymbol(fixedEffects.weekNumber.pValue)
      }
    ];

    return {
      title: 'Mixed-Effects Model Results',
      effects,
      modelFit: {
        logLikelihood: this.roundTo(modelFit.logLikelihood, 2),
        aic: this.roundTo(modelFit.aic, 2),
        bic: this.roundTo(modelFit.bic, 2),
        marginalR2: this.roundTo(modelFit.marginalR2, 3),
        conditionalR2: this.roundTo(modelFit.conditionalR2, 3)
      },
      caption: 'Fixed effects from mixed-effects model: Score ~ Algorithm + Proficiency + Week + (1|Participant) + (1|Word). Reference categories: SM-2 algorithm, A1 proficiency level. Significance: *** p < 0.001, ** p < 0.01, * p < 0.05.'
    };
  }

  /**
   * Table 4: Bayesian Model Comparison
   */
  private generateBayesianComparison(): BayesianComparisonTable {
    const ranking = this.results.bayesianComparison.modelRanking;
    const bayesFactors = this.results.bayesianComparison.bayesFactors;
    const posteriorProbs = this.results.bayesianComparison.posteriorProbabilities;

    const models = ranking.map(rank => {
      const bayesFactor = bayesFactors.find(bf => bf.algorithm2 === rank.algorithm);
      const posteriorProb = posteriorProbs.find(pp => pp.algorithm === rank.algorithm);
      
      return {
        algorithm: this.getAlgorithmDisplayName(rank.algorithm),
        rank: rank.rank,
        bic: this.roundTo(rank.score, 2),
        bayesFactor: bayesFactor ? this.roundTo(bayesFactor.bayesFactor, 2) : 1.00,
        posteriorProb: posteriorProb ? this.roundTo(posteriorProb.probability, 3) : 0,
        evidence: bayesFactor ? bayesFactor.evidence.replace('_', ' ') : 'reference'
      };
    });

    return {
      title: 'Bayesian Model Comparison',
      models,
      caption: 'Bayesian model comparison results. BIC = Bayesian Information Criterion (lower is better). Bayes Factor compares each algorithm to CARTS. Evidence interpretation: decisive (BF > 100), very strong (30-100), strong (10-30), moderate (3-10), weak (1-3).'
    };
  }

  /**
   * Save table in multiple formats
   */
  private async saveTable(filename: string, table: any): Promise<void> {
    // Save as JSON
    await fs.writeFile(
      join(process.cwd(), 'results', 'tables', `${filename}.json`),
      JSON.stringify(table, null, 2)
    );

    // Save as CSV
    const csvContent = this.convertToCSV(table);
    await fs.writeFile(
      join(process.cwd(), 'results', 'tables', `${filename}.csv`),
      csvContent
    );

    // Save as LaTeX
    const latexContent = this.convertToLaTeX(table);
    await fs.writeFile(
      join(process.cwd(), 'results', 'tables', `${filename}.tex`),
      latexContent
    );

    console.log(`   📊 Saved ${filename} in JSON, CSV, and LaTeX formats`);
  }

  /**
   * Convert table to CSV format
   */
  private convertToCSV(table: any): string {
    if (table.rows) {
      // Summary statistics or mixed-effects table
      const headers = table.headers || Object.keys(table.rows[0]);
      const csvRows = [headers.join(',')];
      
      table.rows.forEach((row: any) => {
        const values = headers.map((header: string) => {
          const key = header.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
          return row[key] || row[header] || '';
        });
        csvRows.push(values.join(','));
      });
      
      return csvRows.join('\n');
    } else if (table.algorithms) {
      // Pairwise comparison matrix
      const csvRows = ['Algorithm,' + table.algorithms.join(',')];
      
      table.algorithms.forEach((alg: string, i: number) => {
        const row = [alg];
        table.effectSizes[i].forEach((effect: number, j: number) => {
          if (i === j) {
            row.push('—');
          } else {
            row.push(`${effect.toFixed(3)}${table.significance[i][j]}`);
          }
        });
        csvRows.push(row.join(','));
      });
      
      return csvRows.join('\n');
    } else if (table.models) {
      // Bayesian comparison table
      const headers = ['Algorithm', 'Rank', 'BIC', 'Bayes Factor', 'Posterior Prob', 'Evidence'];
      const csvRows = [headers.join(',')];
      
      table.models.forEach((model: any) => {
        csvRows.push([
          model.algorithm,
          model.rank,
          model.bic,
          model.bayesFactor,
          model.posteriorProb,
          model.evidence
        ].join(','));
      });
      
      return csvRows.join('\n');
    }
    
    return '';
  }

  /**
   * Convert table to LaTeX format
   */
  private convertToLaTeX(table: any): string {
    let latex = `\\begin{table}[htbp]\n\\centering\n\\caption{${table.title}}\n`;
    
    if (table.rows) {
      // Summary statistics or mixed-effects table
      const headers = table.headers || Object.keys(table.rows[0]);
      const numCols = headers.length;
      
      latex += `\\begin{tabular}{${'l' + 'c'.repeat(numCols - 1)}}\n\\toprule\n`;
      latex += headers.join(' & ') + ' \\\\\n\\midrule\n';
      
      table.rows.forEach((row: any) => {
        const values = headers.map((header: string) => {
          const key = header.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
          const value = row[key] || row[header] || '';
          return typeof value === 'number' ? value.toString() : value;
        });
        latex += values.join(' & ') + ' \\\\\n';
      });
      
    } else if (table.algorithms) {
      // Pairwise comparison matrix
      const numCols = table.algorithms.length + 1;
      latex += `\\begin{tabular}{${'l' + 'c'.repeat(numCols - 1)}}\n\\toprule\n`;
      latex += 'Algorithm & ' + table.algorithms.join(' & ') + ' \\\\\n\\midrule\n';
      
      table.algorithms.forEach((alg: string, i: number) => {
        const row = [alg];
        table.effectSizes[i].forEach((effect: number, j: number) => {
          if (i === j) {
            row.push('—');
          } else {
            row.push(`${effect.toFixed(3)}${table.significance[i][j]}`);
          }
        });
        latex += row.join(' & ') + ' \\\\\n';
      });
      
    } else if (table.models) {
      // Bayesian comparison table
      latex += `\\begin{tabular}{lccccc}\n\\toprule\n`;
      latex += 'Algorithm & Rank & BIC & Bayes Factor & Posterior Prob & Evidence \\\\\n\\midrule\n';
      
      table.models.forEach((model: any) => {
        latex += `${model.algorithm} & ${model.rank} & ${model.bic} & ${model.bayesFactor} & ${model.posteriorProb} & ${model.evidence} \\\\\n`;
      });
    }
    
    latex += `\\bottomrule\n\\end{tabular}\n\\label{tab:${table.title.toLowerCase().replace(/\s+/g, '-')}}\n`;
    latex += `\\caption*{${table.caption}}\n\\end{table}`;
    
    return latex;
  }

  /**
   * Helper methods
   */
  private getAlgorithmDisplayName(algorithm: string): string {
    const displayNames: Record<string, string> = {
      'SM-2': 'SuperMemo-2',
      'HLR': 'Half-Life Regression',
      'KARL': 'KARL',
      'LECTOR': 'LECTOR',
      'DART': 'DART',
      'CARTS': 'CARTS'
    };
    return displayNames[algorithm] || algorithm;
  }

  private getSignificanceSymbol(pValue: number): string {
    if (pValue < 0.001) return '***';
    if (pValue < 0.01) return '**';
    if (pValue < 0.05) return '*';
    return '';
  }

  private roundTo(value: number, decimals: number): number {
    return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);
  }

  private async ensureDirectoryExists(dirPath: string): Promise<void> {
    try {
      await fs.access(dirPath);
    } catch {
      await fs.mkdir(dirPath, { recursive: true });
    }
  }
}

/**
 * Main execution function
 */
async function main() {
  try {
    console.log('📊 CARTS Research - Paper Table Generation');
    console.log('=' .repeat(50));

    // Load statistical results
    const resultsPath = join(process.cwd(), 'results', 'statistical-output.json');
    const resultsData = await fs.readFile(resultsPath, 'utf-8');
    const results: StatisticalResults = JSON.parse(resultsData);

    // Generate tables
    const generator = new PaperTableGenerator(results);
    await generator.generateAllTables();

    console.log('\n✅ Paper tables generated successfully!');
    console.log('📁 Output directory: results/tables/');
    console.log('📊 Generated files:');
    console.log('   - table1-summary-statistics.{json,csv,tex}');
    console.log('   - table2-pairwise-comparison.{json,csv,tex}');
    console.log('   - table3-mixed-effects.{json,csv,tex}');
    console.log('   - table4-bayesian-comparison.{json,csv,tex}');

  } catch (error) {
    console.error('❌ Error generating paper tables:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main().catch(console.error);
}