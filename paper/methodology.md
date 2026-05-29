# Methodology

## Overview

This study employed a longitudinal experimental design to evaluate the effectiveness of the CARTS (Contextual Adaptive Retrieval-Type Scheduler) algorithm compared to established spaced repetition baselines. We conducted an 8-week randomized controlled trial with 200 second language English learners, measuring learning outcomes through multiple assessment modalities including a novel LLM-as-a-Judge context transfer evaluation framework.

## Algorithm Implementations

### DART Algorithm (Difficulty-Aware Retrieval-Type)

The DART algorithm extends Half-Life Regression (HLR) with difficulty-aware scheduling that adapts retrieval formats based on memory stability. The core innovation lies in modulating memory half-life based on retrieval difficulty:

```
h = h₀ × exp(α × φ(d))
```

where:
- `h₀` is the base half-life from HLR: `h₀ = 2^(θᵀx)`
- `α ≥ 0` is the difficulty modulation coefficient
- `φ(d) = d/3` normalizes difficulty to [0, 1]
- `d ∈ {0, 1, 2, 3}` represents retrieval difficulty levels

**Retrieval Difficulty Levels:**
1. **Recognition MCQ** (d=0): Multiple-choice word recognition
2. **Cloze Fill** (d=1): Fill-in-the-blank completion
3. **Constrained Generation** (d=2): Sentence completion with constraints
4. **Open Paraphrase** (d=3): Free-form contextual usage

**Adaptive Scaffolding:** DART selects retrieval difficulty based on memory stability thresholds (θ_low = 2.0, θ_mid = 7.0, θ_high = 21.0 days), implementing Vygotsky's Zone of Proximal Development through computational difficulty progression.

### CARTS Algorithm (Contextual Adaptive Retrieval-Type Scheduler)

CARTS employs deep reinforcement learning to jointly optimize difficulty progression and contextual diversity. The architecture consists of three main components:

#### 1. Transformer State Encoder

The state encoder processes interaction history into dense representations:

```
h_t = f_ψ({r_i, d_i, e_c_i}_{i=1}^{t-1})
```

where:
- `r_i` is the correctness of interaction i
- `d_i` is the difficulty level used
- `e_c_i` is the context embedding
- `f_ψ` is a Transformer with parameters ψ

**Architecture Specifications:**
- Model dimension: 128
- Attention heads: 4
- Transformer layers: 2
- Feed-forward dimension: 256
- Maximum sequence length: 50
- Dropout rate: 0.1

#### 2. PPO Policy Network

The policy network learns joint action selection using Proximal Policy Optimization:

```
π_θ(d_t, c_t | h_t)
```

where the policy outputs:
- Difficulty selection: `d_t ∈ {0, 1, 2, 3}`
- Context selection: `c_t` from available context set

**PPO Configuration:**
- Learning rate: 0.0003
- Clip epsilon: 0.2
- Value coefficient: 0.5
- Entropy coefficient: 0.01
- Discount factor (γ): 0.99
- GAE lambda (λ): 0.95
- Batch size: 32
- Training epochs: 4

#### 3. Multi-Objective Reward Function

CARTS optimizes three objectives simultaneously:

```
R_t = w₁ × R_correctness + w₂ × R_context_transfer + w₃ × R_response_time
```

with weights `w₁ = 0.4`, `w₂ = 0.4`, `w₃ = 0.2`, where:
- `R_correctness ∈ {0, 1}` indicates response accuracy
- `R_context_transfer ∈ [0, 1]` from LLM-as-a-Judge evaluation
- `R_response_time ∈ [0, 1]` penalizes excessive response times

### Baseline Algorithms

#### SuperMemo-2 (SM-2)
Classic spaced repetition with ease factor adjustment:
```
EF_new = max(1.3, EF_old + (0.1 - (5-q) × (0.08 + (5-q) × 0.02)))
```
where q ∈ [0, 5] is response quality.

#### Half-Life Regression (HLR)
Memory decay modeling with feature-based half-life prediction:
```
h = 2^(θᵀx)
```
where x includes review count, success rate, days since first seen, and response time features.

#### KARL (Knowledge-Augmented Retrieval Learning)
Semantic-aware knowledge tracing incorporating word embeddings and interference modeling for vocabulary scheduling.

#### LECTOR (Learning Efficiency through Contextual Temporal Optimization and Retrieval)
Interference-aware scheduling that models cross-word interactions and optimizes review timing to minimize forgetting interference.

## Experimental Design

### Participants

**Recruitment:** 200 adult L2 English learners recruited through university language centers and online learning platforms.

**Inclusion Criteria:**
- Age 18-65 years
- Native language other than English
- Self-reported proficiency A1-C2 (CEFR)
- Minimum 6 months English learning experience
- Regular internet access for study participation

**Exclusion Criteria:**
- Native English speakers
- Diagnosed learning disabilities affecting memory
- Concurrent enrollment in intensive English programs
- Previous extensive spaced repetition system usage (>6 months)

### Randomization and Assignment

**Stratified Randomization:** Participants were stratified by proficiency level (A1, A2, B1, B2, C1, C2) and randomly assigned to one of six algorithm conditions using block randomization with block size 6.

**Algorithm Distribution:**
- SM-2: n = 33 (16.5%)
- HLR: n = 34 (17.0%)
- KARL: n = 33 (16.5%)
- LECTOR: n = 34 (17.0%)
- DART: n = 33 (16.5%)
- CARTS: n = 33 (16.5%)

### Vocabulary Selection

**Corpus-Based Selection:** Vocabulary items were selected from the Academic Word List and Oxford 3000, stratified by frequency and difficulty.

**Item Characteristics:**
- Total vocabulary set: 50 words per participant
- Difficulty distribution: 40% beginner, 40% intermediate, 20% advanced
- Part-of-speech balance: 40% nouns, 30% verbs, 20% adjectives, 10% adverbs
- Semantic diversity: Maximum 3 words per semantic field

**Personalization:** Individual vocabulary sets were generated based on proficiency level assessment, ensuring appropriate challenge level while maintaining experimental control.

### Study Protocol

**Duration:** 8 weeks (56 days)

**Session Frequency:** Daily sessions, minimum 5 sessions per week

**Session Structure:**
1. **Learning Phase** (10-15 minutes): Algorithm-determined word presentations
2. **Context Transfer Assessment** (5-10 minutes): Weekly LLM-evaluated tasks
3. **Progress Tracking** (2-3 minutes): Self-reported metrics and system logging

**Compliance Monitoring:**
- Automated session reminders
- Progress dashboards with gamification elements
- Weekly check-in emails with personalized feedback
- Minimum participation threshold: 80% of scheduled sessions

## Context Transfer Evaluation Framework

### LLM-as-a-Judge Implementation

**Multi-Dimensional Assessment:** Context transfer was evaluated using large language models as automated judges, assessing four dimensions:

1. **Accuracy** (0-10): Semantic correctness of word usage
2. **Fluency** (0-10): Natural language flow and grammaticality
3. **Appropriateness** (0-10): Contextual suitability and register
4. **Creativity** (0-10): Novel usage patterns and expressiveness

**LLM Configuration:**
- Primary evaluator: GPT-4 (OpenAI)
- Secondary evaluator: Claude-3 (Anthropic) for reliability validation
- Temperature: 0.1 for consistent scoring
- Max tokens: 500 per evaluation
- Prompt engineering: Standardized rubrics with exemplars

**Evaluation Tasks:**
- **Sentence Completion:** Complete sentences using target vocabulary
- **Contextual Definition:** Explain word meaning in specific contexts
- **Usage Generation:** Create original sentences demonstrating understanding
- **Paraphrase Recognition:** Identify appropriate contextual paraphrases

### Human Expert Validation

**Inter-Rater Reliability:** A subset of 200 responses were independently evaluated by three certified ESL instructors to establish criterion validity.

**Expert Qualifications:**
- Minimum 5 years ESL teaching experience
- Advanced degree in Applied Linguistics or TESOL
- Familiarity with vocabulary assessment frameworks

**Reliability Metrics:**
- Intraclass correlation coefficient (ICC) > 0.80
- Krippendorff's alpha > 0.75 for ordinal ratings
- Pearson correlation with LLM scores > 0.70

## Data Collection and Measures

### Primary Outcome Measures

**Overall Learning Performance:** Composite score combining accuracy, retention, and transfer metrics, normalized to [0, 1] scale.

**Context Transfer Score:** LLM-as-a-Judge evaluation averaged across four dimensions, measuring productive vocabulary competence.

**Retention Rate:** Proportion of words correctly recalled after specified intervals (1, 3, 7, 14, 28 days).

### Secondary Outcome Measures

**Learning Efficiency:** Rate of improvement in accuracy over time, calculated as slope of performance curve.

**Engagement Metrics:** Session completion rate, time-on-task, and self-reported motivation scores.

**Cognitive Load:** Self-reported difficulty ratings (1-5 scale) collected after each session.

### Process Measures

**Interaction Logs:** Complete record of all learner-system interactions including:
- Word presentations and responses
- Response times and accuracy
- Difficulty levels and contexts used
- Algorithm decisions and scheduling

**Feature Extraction:** Automated calculation of HLR features for all algorithms:
- Review count and success rate
- Days since first encounter
- Average response time
- Consecutive correct responses

## Statistical Analysis Plan

### Primary Analysis

**Mixed-Effects Modeling:** Hierarchical linear models accounting for repeated measures and clustering:

```
Score ~ Algorithm + Proficiency + Week + (1|Participant) + (1|Word)
```

**Fixed Effects:**
- Algorithm (6 levels, SM-2 reference)
- Proficiency level (6 levels, A1 reference)
- Week (continuous, linear trend)

**Random Effects:**
- Participant-level intercepts
- Word-level intercepts

### Secondary Analyses

**Survival Analysis:** Kaplan-Meier curves and Cox proportional hazards models for retention analysis.

**Bayesian Model Comparison:** BIC-based model selection with Bayes Factors for evidence quantification.

**Effect Size Estimation:** Cohen's d and Hedges' g for pairwise comparisons with 95% confidence intervals.

### Multiple Comparisons

**Bonferroni Correction:** Family-wise error rate control for 15 pairwise algorithm comparisons (α = 0.05/15 = 0.0033).

**False Discovery Rate:** Benjamini-Hochberg procedure for exploratory analyses.

## Ethical Considerations

**IRB Approval:** Study protocol approved by [Institution] Institutional Review Board (Protocol #2024-XXX).

**Informed Consent:** Electronic consent obtained from all participants with clear explanation of:
- Study purpose and procedures
- Data collection and usage
- Voluntary participation and withdrawal rights
- Privacy protection measures

**Data Protection:**
- Participant identifiers anonymized using secure hash functions
- Data stored on encrypted servers with access controls
- Compliance with GDPR and institutional data policies
- Planned data retention: 7 years post-publication

**Participant Welfare:**
- No known risks beyond normal educational activities
- Option to withdraw without penalty
- Access to study results upon completion
- Technical support provided throughout study period

## Power Analysis and Sample Size Justification

**Effect Size Assumptions:** Based on pilot data and literature review, expected medium effect size (Cohen's d = 0.5) for primary algorithm comparisons.

**Power Calculation:** 
- α = 0.05 (two-tailed)
- Power = 0.80
- Effect size = 0.5
- Required n = 32 per group

**Sample Size:** N = 200 (33-34 per group) provides adequate power for primary comparisons and accounts for 15% attrition rate.

**Sensitivity Analysis:** Post-hoc power analysis conducted to determine minimum detectable effect sizes given actual sample sizes and observed variance.

## Implementation and Quality Assurance

### System Architecture

**Platform:** Web-based application with responsive design for desktop and mobile access.

**Backend:** Node.js with TypeScript, MongoDB database, Redis caching.

**Frontend:** React with real-time progress tracking and adaptive user interface.

**Algorithm Integration:** Modular scheduler architecture enabling seamless algorithm switching and A/B testing.

### Quality Control

**Data Validation:** Real-time checks for response validity, session completeness, and technical issues.

**Performance Monitoring:** System uptime tracking, response time monitoring, and error logging.

**Participant Support:** 24/7 technical helpdesk and weekly progress check-ins.

**Algorithm Verification:** Comprehensive unit testing and validation against published implementations.

This methodology provides a rigorous framework for evaluating the effectiveness of contextual adaptive scheduling in spaced repetition systems, with particular attention to ecological validity through authentic context transfer assessment and robust statistical analysis accounting for the hierarchical nature of educational data.