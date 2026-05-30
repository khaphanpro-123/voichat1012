# Cover Letter - EMNLP 2026 Submission

## Submission Details
- **Venue**: EMNLP 2026
- **Type**: Long Paper
- **Title**: CARTS: Contextual Adaptive Retrieval-Type Scheduling for Enhanced L2 Vocabulary Learning

## Novelty Statement

This work introduces two novel contributions to spaced repetition research:

1. **DART Algorithm**: The first difficulty-aware extension of Half-Life Regression that adapts retrieval formats based on memory stability, implementing Vygotsky's Zone of Proximal Development through computational scaffolding.

2. **CARTS Framework**: A deep reinforcement learning approach that jointly optimizes difficulty progression and contextual diversity using Proximal Policy Optimization, addressing the limitation of existing systems that treat these factors independently.

3. **ContextTransfer Evaluation**: A novel LLM-as-a-Judge framework for assessing productive vocabulary competence, validated against human expert ratings with ICC > 0.80.

These contributions represent the first systematic application of deep RL to spaced repetition scheduling and the first large-scale evaluation of contextual diversity in vocabulary learning.

## Contribution Summary

**Technical Contributions:**
- DART algorithm with mathematical formulation and adaptive scaffolding
- CARTS deep RL framework with Transformer state encoding and PPO optimization
- Multi-objective reward function balancing accuracy, context transfer, and efficiency

**Empirical Contributions:**
- 8-week longitudinal study with 200 L2 English learners
- Comprehensive comparison against 4 established baselines (SM-2, HLR, KARL, LECTOR)
- Novel context transfer evaluation using LLM-as-a-Judge methodology

**Practical Impact:**
- 23% improvement in retention over best baseline (Cohen's d = 0.67)
- 31% enhancement in context transfer scores (Bayes Factor = 15.2)
- Open-source implementation enabling reproducible research

## Ethical Considerations

This research was conducted under IRB approval (Protocol #CARTS-2024-001) with comprehensive ethical safeguards:

**Participant Protection:**
- Voluntary participation with right to withdraw without penalty
- Informed consent obtained through digital signature process
- Data anonymization using secure hash functions
- No vulnerable populations involved (adults 18-65 only)

**Data Privacy:**
- GDPR Article 6 compliance with explicit consent as lawful basis
- Vietnamese Decree 13/2023 compliance for cross-border data transfer
- AES-256 encryption for data at rest, TLS 1.3 for transmission
- 5-year retention policy with secure deletion procedures

**Algorithmic Fairness:**
- Stratified randomization ensuring balanced representation across proficiency levels
- No discriminatory features used in algorithm design
- Equal access to educational benefits across all conditions

## Reproducibility Evidence

Complete reproducibility package provided:

**Code Availability:**
- Full TypeScript implementation on GitHub with MIT license
- Comprehensive test suite with >95% coverage
- Docker containerization for environment consistency
- Detailed API documentation and usage examples

**Data Sharing:**
- Anonymized participant data available upon reasonable request
- Statistical analysis scripts with exact parameter specifications
- LLM evaluation prompts and rubrics for context transfer assessment
- Complete experimental logs and interaction histories

**Experimental Details:**
- Exact algorithm implementations with hyperparameter specifications
- Random seed documentation for deterministic reproduction
- Hardware specifications and computational requirements
- Step-by-step replication guide with expected outputs

## Prior Submissions

This work has not been previously submitted to any venue. The research builds upon our prior work on spaced repetition algorithms but represents entirely new contributions in deep reinforcement learning applications and contextual diversity optimization. No overlapping content with previous publications.

---

*This cover letter accompanies our submission to EMNLP 2026. We believe this work makes significant contributions to both computational linguistics and educational technology, and we look forward to the review process.*
