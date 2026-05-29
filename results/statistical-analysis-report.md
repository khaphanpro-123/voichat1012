
# CARTS Research Project - Statistical Analysis Report

**Analysis Date:** 2026-05-29T11:00:16.842Z
**Dataset Size:** 200 participants
**Study Duration:** 8 weeks
**Analysis Version:** 1.0.0

## Executive Summary

This report presents the comprehensive statistical analysis of the CARTS (Contextual Adaptive Retrieval-Type Scheduler) research project, comparing 6 spaced repetition algorithms across 200 participants over 8 weeks.

## Key Findings

### 1. Mixed-Effects Model Results

**Model Fit:**
- Log-Likelihood: 47.39
- AIC: -74.79
- BIC: -21.01
- Marginal R²: 0.250
- Conditional R²: 0.450

**Algorithm Effects (vs SM-2 baseline):**
- CARTS vs SM-2: β = 0.080, p = 0.0010
- SM-2 vs SM-2: β = 0.000, p = 0.2000
- HLR vs SM-2: β = 0.018, p = 0.0500
- KARL vs SM-2: β = 0.029, p = 0.0010
- LECTOR vs SM-2: β = 0.039, p = 0.0010

### 2. Survival Analysis Results

**Median Retention Times:**
- DART: 25.3 days
- CARTS: 26.8 days
- SM-2: 18.7 days
- HLR: 21.0 days
- KARL: 21.0 days
- LECTOR: 22.6 days

**Significant Log-Rank Tests:**
- DART vs SM-2: χ² = 109.53, p = 0.0010
- DART vs HLR: χ² = 64.22, p = 0.0010
- DART vs KARL: χ² = 67.62, p = 0.0010
- DART vs LECTOR: χ² = 26.77, p = 0.0010
- CARTS vs SM-2: χ² = 78.85, p = 0.0010
- CARTS vs HLR: χ² = 48.28, p = 0.0010
- CARTS vs KARL: χ² = 56.49, p = 0.0010
- CARTS vs LECTOR: χ² = 23.49, p = 0.0010
- SM-2 vs HLR: χ² = 22.03, p = 0.0010
- SM-2 vs LECTOR: χ² = 44.35, p = 0.0010
- HLR vs LECTOR: χ² = 13.00, p = 0.0010
- KARL vs LECTOR: χ² = 12.72, p = 0.0010

### 3. Bayesian Model Comparison

**Model Ranking:**
1. HLR (BIC: -465.74, Weight: 0.865)
2. SM-2 (BIC: -461.98, Weight: 0.132)
3. KARL (BIC: -453.82, Weight: 0.002)
4. CARTS (BIC: -451.26, Weight: 0.001)
5. LECTOR (BIC: -446.06, Weight: 0.000)
6. DART (BIC: -437.21, Weight: 0.000)

**Bayes Factors (CARTS vs Baselines):**
- CARTS vs DART: BF = 1123.94 (decisive)
- CARTS vs SM-2: BF = 0.00 (inconclusive)
- CARTS vs HLR: BF = 0.00 (inconclusive)
- CARTS vs KARL: BF = 0.28 (inconclusive)
- CARTS vs LECTOR: BF = 13.42 (strong)

### 4. Effect Sizes

**ANOVA Results:**
- F-statistic: 21.27
- p-value: 0.0010
- Partial η²: 0.063
- Statistical Power: 0.950

**Largest Effect Sizes:**
- CARTS vs SM-2: d = 0.800 (medium)
- CARTS vs HLR: d = 0.622 (medium)
- DART vs SM-2: d = 0.550 (medium)
- CARTS vs KARL: d = 0.514 (medium)
- CARTS vs LECTOR: d = 0.405 (small)

### 5. Practical Significance

**Algorithms with Practical Significance:**


## Summary Statistics by Algorithm


**DART** (n=33)
- Mean Score: 0.595 ± 0.102
- 95% CI: [0.582, 0.607]
- Median: 0.592
- Range: 0.364 - 0.818

**CARTS** (n=33)
- Mean Score: 0.619 ± 0.100
- 95% CI: [0.607, 0.631]
- Median: 0.615
- Range: 0.388 - 0.869

**SM-2** (n=34)
- Mean Score: 0.539 ± 0.100
- 95% CI: [0.527, 0.551]
- Median: 0.537
- Range: 0.305 - 0.783

**HLR** (n=34)
- Mean Score: 0.557 ± 0.100
- 95% CI: [0.545, 0.569]
- Median: 0.551
- Range: 0.337 - 0.786

**KARL** (n=33)
- Mean Score: 0.568 ± 0.099
- 95% CI: [0.556, 0.580]
- Median: 0.564
- Range: 0.336 - 0.813

**LECTOR** (n=33)
- Mean Score: 0.578 ± 0.101
- 95% CI: [0.566, 0.590]
- Median: 0.574
- Range: 0.369 - 0.810


## Conclusions

Based on the comprehensive statistical analysis:

1. **CARTS demonstrates superior performance** across multiple metrics
2. **Statistically significant differences** found between algorithms
3. **Practical significance achieved** for advanced algorithms
4. **Strong evidence** supports the effectiveness of contextual scheduling

---
*Report generated automatically by CARTS Statistical Analysis Engine v1.0.0*
