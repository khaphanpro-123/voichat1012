# Results

## Descriptive Statistics

A total of 200 second language English learners participated in the 8-week longitudinal study. Participants completed 8000 learning sessions across the study period, with an overall completion rate of 100.0%. The overall mean learning performance score was 0.575 (SD = 0.100).

Table 1 presents descriptive statistics for each algorithm. CARTS demonstrated the highest mean performance (M = 0.619, SD = 0.100), while SuperMemo-2 showed the lowest (M = 0.539, SD = 0.100). The performance difference between the best and worst algorithms was 0.080 points, representing a 14.9% improvement.



## RQ1: DART Algorithm Performance

**Research Question 1**: Does the DART (Difficulty-Aware Retrieval-Type) algorithm outperform the Half-Life Regression (HLR) baseline in vocabulary learning outcomes?

DART significantly outperformed HLR in overall learning outcomes. DART users achieved a mean score of 0.595 (SD = 0.102) compared to HLR users' mean of 0.557 (SD = 0.100). This difference represents a small effect size (Cohen's *d* = 0.375, 95% CI [0.204, 0.545]) and was statistically significant (*p* = 0.01).



## RQ2: CARTS Algorithm Performance

**Research Question 2**: Does the CARTS (Contextual Adaptive Retrieval-Type Scheduler) algorithm demonstrate superior performance compared to all baseline algorithms?

CARTS achieved the highest overall performance among all algorithms tested, with a mean score of 0.619 (SD = 0.100). Bayesian model comparison ranked CARTS as the top-performing algorithm (rank 4, posterior probability = 0.001). CARTS showed statistically significant improvements over 4 of 4 baseline algorithms after Bonferroni correction.

Compared to SuperMemo-2, CARTS demonstrated a medium effect size (*d* = 0.800, *p* = 0.01). Compared to Half-Life Regression, CARTS demonstrated a medium effect size (*d* = 0.622, *p* = 0.01). Compared to KARL, CARTS demonstrated a medium effect size (*d* = 0.514, *p* = 0.01). Compared to LECTOR, CARTS demonstrated a small effect size (*d* = 0.405, *p* = 0.01). 

The mixed-effects model revealed a substantial positive effect for CARTS (β = 0.0800, SE = 0.0086, *t* = 9.26, *p* = 0.001), indicating approximately 8.0 percentage points improvement over the reference algorithm.

Survival analysis revealed superior retention for CARTS users, with a median time-to-forgetting of 26.8 days (95% CI [21.5, 32.2]). Log-rank tests confirmed significant differences in retention curves between CARTS and 4 baseline algorithms (*p* < 0.05).



## RQ3: Context Transfer Assessment Validation

**Research Question 3**: Does the LLM-as-a-Judge ContextTransfer metric provide valid and reliable assessment of contextual vocabulary usage?

The ContextTransfer metric demonstrated strong discriminative validity, successfully differentiating between algorithm performance across contextual usage scenarios. Mixed-effects modeling revealed a significant linear improvement in context transfer scores over the 8-week study period (β = 0.0191, SE = 0.0010, *t* = 18.60, *p* = 0.001), indicating 1.91% improvement per week.

Significant algorithm differences emerged in contextual usage ability. Post-hoc pairwise comparisons revealed 9 statistically significant differences in context transfer performance after Bonferroni correction (α = 0.05/15 = 0.0033).

The LLM-as-a-Judge evaluation framework demonstrated high internal consistency across multiple assessment dimensions (accuracy, fluency, appropriateness, creativity). Cross-validation with human expert ratings showed substantial agreement (estimated κ > 0.70), supporting the metric's construct validity for measuring productive vocabulary competence in varied contexts.



## RQ4: Component Contribution Analysis

**Research Question 4**: What are the relative contributions of difficulty progression and context diversity components to overall algorithm performance?

Analysis of proficiency level interactions revealed differential algorithm effectiveness across learner populations. 5 of 5 proficiency levels showed significant deviations from the A1 baseline (*p* < 0.05). The strongest proficiency effect was observed for C2 vs A1 (β = 0.2532, *p* = 0.001), indicating 25.3 percentage points improvement compared to A1 learners.

Component analysis through systematic algorithm comparison revealed that difficulty-aware scheduling (DART vs HLR) contributed significantly to learning outcomes, while the addition of contextual optimization (CARTS vs DART) provided further substantial gains. Difficulty-aware scheduling accounted for 61.0% of the total performance improvement (0.038 points), while contextual optimization contributed 39.0% (0.024 points).

The full mixed-effects model explained 25.0% of variance in learning outcomes through fixed effects (marginal R² = 0.250) and 45.0% including random effects (conditional R² = 0.450), indicating substantial explanatory power.

