# Judge Calibration Guide — DART-RCT Context Transfer Scoring
Version: v1.0 | Frozen: before pilot (Ngày 27) | Do not revise after data collection starts.

## Overview

This guide is for **human raters** who will independently score a subset of Context Transfer (CT) items for ICC analysis. The LLM judge scores all CT items; human raters score the calibration subset (20% of items, ~40 items). ICC between LLM and human must be ≥ 0.70 before the LLM scores can be accepted as the primary scoring source (Ngày 39–40).

Each item is scored on **4 rubric dimensions, each 0–2**:

| Dimension | What it measures |
|---|---|
| **Form** | Correct spelling and morphological form of the target word |
| **Meaning** | Correct semantic sense clearly demonstrated |
| **Use** | Grammatically and collocationally integrated |
| **Context Fit** | Response meaningfully engages with the given scenario |

**Total per item: 0–8 points.** Normalized to 0–100 for analysis.

---

## Detailed Criteria and Anchor Examples

### Dimension 1: Form

> Does the learner spell the target word correctly and use the appropriate morphological form?

| Score | Label | Decision rule |
|---|---|---|
| **0** | Incorrect | Word absent, misspelled past recognition, or wrong part-of-speech that distorts meaning (e.g., noun where verb needed, changing argument structure). |
| **1** | Partially correct | Single minor error: wrong inflection that context would accept (e.g., *contributes* for *contribute*), or a spelling error that still preserves the word's identity (e.g., *contribut*). |
| **2** | Correct | Correct spelling, correct morphological form for the grammatical slot. |

**Anchor examples** (target word: *contribute*)

- Score 0: "She made a strong contribt to the project." ← spelling destroys identity; score 0.
- Score 1: "She contributes many ideas to the team." ← inflection *contributes* acceptable in some readings; score 1.
- Score 2: "She decided to contribute her savings to the fund." ← correct; score 2.

---

### Dimension 2: Meaning

> Does the usage reflect the correct semantic sense of the target word?

| Score | Label | Decision rule |
|---|---|---|
| **0** | Incorrect | Demonstrably wrong meaning, or word present but used in a way that shows no understanding of the sense tested. |
| **1** | Partially correct | Approximately correct but vague or ambiguous; the reader cannot be confident the learner understands the precise sense. |
| **2** | Correct | The correct meaning is clearly demonstrated by the surrounding context. |

**Anchor examples** (target word: *contribute*, definition: *give something to help achieve a goal*)

- Score 0: "His experience will contribute to his height." ← no meaningful relationship to the target sense; score 0.
- Score 1: "Everyone should contribute." ← correct word but too vague to confirm meaning comprehension; score 1.
- Score 2: "Each team member was asked to contribute one idea to improve the product." ← precise sense demonstrated; score 2.

---

### Dimension 3: Use

> Is the word integrated grammatically and collocationally into the sentence?

| Score | Label | Decision rule |
|---|---|---|
| **0** | Incorrect | Clearly ungrammatical structure around the target word, or severely broken collocation that a native speaker would not produce. |
| **1** | Partially correct | Minor grammatical issue or slightly unnatural collocation, but the sentence is interpretable. |
| **2** | Correct | Natural grammar, natural collocation; the sentence reads as a native-like production. |

**Anchor examples** (target word: *contribute*)

- Score 0: "She contribute money the charity." ← missing auxiliary/inflection and preposition; score 0.
- Score 1: "She contributed in the project by giving her time." ← *contributed in* is non-standard (should be *to*); score 1.
- Score 2: "She contributed significantly to the success of the project." ← natural grammar and collocation; score 2.

---

### Dimension 4: Context Fit

> Does the response address the given scenario specifically and meaningfully?

| Score | Label | Decision rule |
|---|---|---|
| **0** | No fit | Response could be a generic sentence under any prompt; does not mention or engage with the scenario details. |
| **1** | Partial fit | Acknowledges the scenario but the connection is superficial (e.g., just echoes a word from the prompt). |
| **2** | Good fit | Clearly and specifically addresses the situation described, drawing on specific scenario details. |

**Anchor examples** (scenario: *A student writes to a scholarship committee about their community contributions*)

- Score 0: "I want to contribute to society." ← completely generic; score 0.
- Score 1: "I have tried to contribute to my community." ← acknowledges theme but no scenario-specific detail; score 1.
- Score 2: "As a volunteer coordinator, I have contributed over 200 hours to tutoring local students, which I believe demonstrates the commitment the scholarship committee values." ← directly addresses scholarship + community + contribution; score 2.

---

## Calibration Process

### Before scoring independently:
1. Read this entire guide carefully.
2. Score the **5 practice items** (in `research/calibration_practice_items.json`) independently.
3. Meet with the PI to compare scores and resolve disagreements. Target: ≥80% agreement within 1 point on each dimension.
4. Only proceed to independent scoring after calibration session.

### During scoring:
- Score each dimension before looking at your total — avoid anchoring on overall impressions.
- If a learner does not use the target word at all: Form=0, Meaning=0, Use=0, ContextFit=0.
- **Do not penalise** for overall writing quality beyond the four dimensions.
- **Do not reward** length or complexity beyond what the dimensions capture.
- Write a 1-sentence rationale for any dimension where you scored 0 or 1.

### ICC analysis (Ngày 39–40):
- Human rater 1 and human rater 2 each score the calibration set independently.
- LLM scores are compared against the human mean.
- Intraclass Correlation Coefficient (ICC[2,1] two-way mixed, absolute agreement) ≥ 0.70 is required.
- If ICC < 0.70: diagnose which dimension drives disagreement, run a second calibration session.

---

## Common Errors to Avoid

| Error | Example | Correct approach |
|---|---|---|
| **Holistic bias** | Giving all 2s to a well-written response regardless of word use | Score each dimension independently |
| **Length penalty** | Scoring a short but accurate response lower | Length is irrelevant unless the task specifies minWords |
| **L1 transfer penalty** | Penalising Vietnamese word order patterns | Only penalise errors that affect meaning or grammaticality per the rubric |
| **Harshness on Form=1** | Marking *contributes* as 0 when the error is minor | Form=1 is appropriate for minor inflection errors |

---

## Contact

Questions about scoring: contact PI before scoring to avoid systematic disagreements.
IRB protocol number: [pending — fill before pilot].
