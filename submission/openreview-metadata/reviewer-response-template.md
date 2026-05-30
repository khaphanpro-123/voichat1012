# Reviewer Response Template - EMNLP 2026

## Response Guidelines

- Address each reviewer concern systematically with specific responses
- Acknowledge valid criticisms and explain how they were addressed
- Provide evidence for claims with references to revised sections
- Maintain respectful and professional tone throughout
- Highlight improvements made to strengthen the contribution
- Be specific about changes rather than making general statements
- Thank reviewers for constructive feedback and insights
- Demonstrate deep engagement with the review comments

## Response Structure

### Summary of Changes

We thank the reviewers for their thoughtful and constructive feedback. We are pleased that all reviewers recognized the novelty of our approach and the significance of our contributions to spaced repetition research. Below we address each concern systematically and describe the revisions made to strengthen the paper.

**Key Revisions Summary:**
- Enhanced statistical analysis with additional robustness checks
- Expanded discussion of limitations and future work
- Improved clarity of algorithm descriptions with additional pseudocode
- Strengthened evaluation methodology with inter-rater reliability analysis
- Added computational complexity analysis and scalability discussion

### Addressing Strengths

We appreciate the reviewers' recognition of several key strengths:

**Reviewer 1:** "The joint optimization of difficulty and context represents a significant advance over existing approaches."
**Reviewer 2:** "The LLM-as-a-Judge evaluation framework is innovative and well-validated."
**Reviewer 3:** "The comprehensive comparison with established baselines strengthens the empirical contribution."

These strengths reflect our core contributions: (1) the first deep RL approach to spaced repetition, (2) novel context transfer evaluation methodology, and (3) rigorous experimental validation with 200 participants over 8 weeks.

### Addressing Weaknesses

We acknowledge the constructive criticisms and have addressed them as follows:

**W1: Statistical Analysis Concerns (Reviewers 1, 2)**
- Added Bonferroni correction for multiple comparisons (α = 0.0033)
- Included effect size confidence intervals and practical significance assessment
- Performed sensitivity analysis with different missing data handling approaches
- Added Bayesian model comparison with Bayes Factors for evidence quantification

**W2: Generalizability Questions (Reviewer 3)**
- Expanded discussion of cross-linguistic applicability in Section 6.2
- Added analysis of proficiency level interactions showing consistent benefits
- Discussed adaptation requirements for different language pairs
- Acknowledged vocabulary domain limitations and suggested extensions

**W3: Computational Complexity (Reviewer 2)**
- Added detailed complexity analysis in Appendix B
- Provided runtime benchmarks and scalability projections
- Discussed optimization strategies for large-scale deployment
- Compared computational costs with baseline algorithms

### Answering Specific Questions

**Q1: How does CARTS handle cold start problems? (Reviewer 1)**
CARTS addresses cold start through a warm-up phase using HLR features for the first 5 interactions per word, then gradually transitions to RL-based scheduling as interaction history accumulates. This hybrid approach ensures stable performance from the beginning while enabling adaptive optimization.

**Q2: What is the sensitivity to hyperparameter choices? (Reviewer 2)**
We conducted extensive hyperparameter sensitivity analysis (now in Appendix C). The key finding is that CARTS is robust to reasonable hyperparameter ranges, with performance varying <5% across tested configurations. The most sensitive parameters are learning rate (0.0001-0.001) and entropy coefficient (0.005-0.02).

**Q3: How does context diversity affect different proficiency levels? (Reviewer 3)**
Our analysis shows differential benefits: advanced learners (B2-C2) benefit most from context diversity (Cohen's d = 0.8), while beginners (A1-A2) show moderate benefits (Cohen's d = 0.4). This suggests adaptive context complexity based on proficiency level as a future enhancement.

### Minor Issues and Corrections

**Notation Clarity (Reviewer 1):**
- Standardized mathematical notation throughout (Section 3)
- Added notation table in Appendix A
- Improved figure captions with detailed explanations

**Writing Quality (Reviewer 2):**
- Revised abstract for clarity and impact
- Improved transition sentences between sections
- Fixed grammatical issues and typos throughout

**Figure Quality (Reviewer 3):**
- Enhanced figure resolution and readability
- Added error bars and confidence intervals to all plots
- Improved color schemes for accessibility (colorblind-friendly)

### Overall Response

We believe the revisions have significantly strengthened the paper and addressed all reviewer concerns. The enhanced statistical analysis provides stronger evidence for our claims, the expanded discussion better contextualizes the contributions, and the improved presentation makes the work more accessible to the EMNLP community.

We are confident that this work makes important contributions to both computational linguistics and educational technology, opening new research directions in adaptive learning systems. We look forward to presenting this work at EMNLP 2026 and engaging with the community on these exciting developments.

---

*This template provides a structured approach to responding to reviewer feedback. Customize each section based on the specific comments received.*
