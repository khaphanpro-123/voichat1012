# Difficulty-Adaptive Retrieval Timing (DART) for Second-Language Vocabulary Learning: Protocol for a Pre-Registered Three-Arm Randomized Controlled Trial

**Manuscript type:** Registered report / research protocol
**Target journal:** *Computers & Education* (Elsevier)
**Draft version:** v1 — 2026-08-09 (Day 6 of 45-day preparation window)
**Status:** Pre-data-collection protocol. All effect-size, precision, and inference numbers reported here are placeholders `[TBD]` and will be filled from real review logs after the main study (pilot start: ~2026-09-01, main study start: 2026-09-17). Simulation numbers, where quoted, are marked *(simulation only — not results)* and exist to justify design decisions, not to make substantive claims.

---

## Authors

- **Phan Văn Kha** (Principal Investigator)^a,*
- **[Supervisor name — pending]**^a
- **[Second co-author — pending]**^b

^a [Institutional affiliation — pending]
^b [Second affiliation — pending]

*Corresponding author. E-mail: phanvankha06122004@gmail.com

---

## Keywords

Spaced repetition; retrieval practice; desirable difficulties; adaptive learning; L2 vocabulary; log data; half-life regression; educational technology

---

## Abstract

Spaced-repetition systems (SRS) for second-language (L2) vocabulary learning schedule reviews using only elapsed time and the learner's overall recall history. Contemporary implementations — from SM-2 (Wozniak, 1990) to half-life regression (HLR; Settles & Meeder, 2016) — treat every retrieval event as equivalent, regardless of the cognitive demand it placed on the learner. However, decades of memory research on *desirable difficulties* (Bjork, 1994; Bjork & Bjork, 2011; Kornell & Bjork, 2008) suggest that harder, more effortful retrievals produce longer-lasting learning than easier ones. This raises a testable prediction that current SRS algorithms do not exploit: **the difficulty of the retrieval event itself should be a scheduling signal**. The present study introduces **DART** (Difficulty-Adaptive Retrieval Timing), a single-parameter extension of HLR in which the log half-life of a vocabulary item is modelled as `log h = w·x + α·d`, where `d ∈ {0,1,2,3}` indexes retrieval difficulty (multiple-choice, cloze, constrained generation, paraphrase) and `α ≥ 0` scales the difficulty contribution. We will conduct a pre-registered three-arm randomized controlled trial (target N = 200 Vietnamese EFL learners at CEFR B1–B2) comparing DART against HLR and SM-2 over an 8-week intervention with a 2-week delayed posttest. Three research questions structure the analysis: **(RQ1)** Does DART fit real review logs better than HLR (test: cluster-bootstrap likelihood-ratio test for α > 0, with out-of-sample DeLong AUC comparison as an independent gate)? **(RQ2)** Does DART produce higher delayed recall than HLR and SM-2 (test: mixed-effects ANCOVA with Holm–Bonferroni-adjusted pairwise contrasts)? **(RQ3)** Does DART improve productive vocabulary use in novel contexts (test: LLM-judge rubric score, conditional on human ICC ≥ .70)? All primary tests, exclusion rules, and estimation procedures are pre-registered before data collection. Simulation-based diagnostics revealed that the naïve boundary-corrected asymptotic likelihood-ratio test is anti-conservative under the study's clustering structure (empirical Type-I ≈ .146 at nominal .05, N = 60 clusters); we therefore switched the primary RQ1 test to a cluster-bootstrap variant (Amendment #A-001, signed 2026-08-07). Expected contributions: (a) the first randomized head-to-head comparison of a difficulty-adaptive scheduler against established SRS baselines with real learners; (b) an open-source implementation of DART with instrumented logging; (c) a methodological demonstration that pre-collection simulation can catch inferential problems that would otherwise silently inflate Type-I error in SRS-algorithm research.

---

## 1. Introduction

Vocabulary is the rate-limiting factor for most L2 learners at the intermediate level: comprehension of 95 % of running text — the threshold for adequate reading comprehension — requires stable knowledge of approximately 8,000–9,000 word families (Nation, 2006), well beyond what any Vietnamese secondary-school English curriculum delivers by graduation (Nguyen & Godfroid, 2020). Because explicit vocabulary study is one of the few learning activities where deliberate practice reliably transfers to long-term retention (Nakata, 2015), digital spaced-repetition systems have become a central technology in L2 self-study. Anki (Elmes, 2006), Quizlet, Memrise, Duolingo, and Chinese-market products such as Baicizhan collectively serve tens of millions of active users; among Vietnamese university-entrance IELTS candidates, self-reported daily SRS use exceeds 60 % (Pham & Nguyen, 2024).

Despite this scale of adoption, the algorithmic core of modern SRS has changed remarkably little since the original SM-2 heuristic (Wozniak, 1990). SM-2 and its descendants — SM-15, FSRS, and Anki's default scheduler — update an item's inter-study interval as a monotonic function of the learner's *self-reported* recall difficulty (an ordinal 1–4 rating) and the item's prior scheduling history. The most theoretically grounded modernization, half-life regression (HLR; Settles & Meeder, 2016), replaces the rating heuristic with a maximum-likelihood-estimated model of the item's memory half-life, using features derived from lag time and recall history. HLR outperformed SM-2 in Duolingo's large-scale offline evaluation (Settles & Meeder, 2016) and has since been extended to incorporate word difficulty (Tabibian et al., 2019), learner ability (Reddy et al., 2016), and neural feature encoders (Cheng et al., 2022). What none of these extensions — nor SM-2, nor the widely deployed FSRS — do is exploit the *type of retrieval event itself* as a scheduling signal.

This omission is puzzling from the perspective of memory theory. A robust and repeatedly replicated finding is the *desirable difficulties* effect (Bjork, 1994; Bjork & Bjork, 2011): retrieval practice that requires more effort — as when the learner must generate the target from a partial cue rather than recognize it in a list — produces less accurate immediate performance but substantially better long-term retention. Kornell and Bjork (2008) demonstrated that when learners were free to schedule their own study, they systematically chose easier retrievals, and their delayed recall suffered as a result. In the closely related literature on the *testing effect*, generation-format tests consistently outperform recognition-format tests on delayed measures, with effect sizes typically in the *d* = 0.4–0.7 range (Adesope et al., 2017; Rowland, 2014). If harder retrievals genuinely produce longer-lasting learning, then an SRS that observes the retrieval format and adjusts the next scheduled interval accordingly should — in principle — deliver better delayed recall than one that treats all retrievals as equivalent.

Two considerations sharpen this prediction into a testable one. First, most L2 vocabulary apps already administer multiple retrieval formats: multiple-choice questions (MCQ), cloze completion, constrained-generation writing tasks, and paraphrase or dialog tasks are all common in Duolingo, Quizlet, Anki add-ons, and their competitors. The information needed to observe retrieval difficulty is already present in production log data; it is simply not read. Second, the modelling extension required is minimal: augmenting HLR's log-half-life predictor with a single scalar difficulty coefficient α introduces no new hyperparameters and no new data requirements. If α > 0 in real learner data, this constitutes a small, low-cost, and immediately deployable improvement to any HLR-based scheduler; if α = 0, this is itself informative — it tells the field that retrieval format alone is not enough of a signal to change scheduling on top of what elapsed time and recall history already encode.

The present pre-registered study will provide the first randomized evaluation of this prediction with a scheduling algorithm — DART — that operationalizes it. We compare DART against HLR (its own algorithmic parent) and against SM-2 (the *de facto* production baseline used by Anki and its derivatives) in Vietnamese EFL learners at CEFR B1–B2. The 8-week intervention plus 2-week delay was chosen to match the retention window that matters pedagogically for exam preparation (the modal use case for the target population) and long enough for meaningful spacing effects to accrue (Cepeda et al., 2008). Three research questions organize the analysis (§2.4): a model-fit test on the review logs themselves (RQ1), a learning-outcome test on delayed recall (RQ2), and a productive-use test on context-transfer generation (RQ3). Simulation-based Type-I diagnostics run during protocol development revealed that the standard boundary-corrected likelihood-ratio test for RQ1 is anti-conservative under our clustering structure; we describe the discovery and the resulting amendment (§4.7) as a methodological contribution in its own right.

---

## 2. Research background

### 2.1. Spaced repetition and elapsed-time-based scheduling

The empirical foundation for spaced repetition is Ebbinghaus's (1885) demonstration that retention decays approximately exponentially with time and that distributed practice yields better long-term retention than massed practice. Modern SRS operationalize this by scheduling each item's next review to occur when the probability of successful recall is estimated to have fallen to a target threshold, typically around .85–.90 (Wozniak, 1990; Settles & Meeder, 2016). The scheduling problem thus reduces to estimating a per-item memory *half-life*: the time interval after which recall probability crosses .5.

The dominant production algorithm, SM-2, uses a discrete update rule: after each review, the interval is multiplied by an *ease factor* that is decreased by a fixed amount if the learner rated the retrieval difficult and increased if it was easy. SM-2 has clear pedagogical appeal — it is interpretable and requires no training data — but its interval updates are driven entirely by the learner's *subjective* rating, which is known to be poorly calibrated to actual future recall (Kornell & Bjork, 2008; Metcalfe & Finn, 2008).

Settles and Meeder (2016) proposed HLR as a supervised-learning replacement. The half-life *h* of item *i* for learner *l* is modelled as `h = 2^(w·x)`, where the feature vector `x` includes elapsed time, right/wrong history, and item-level features; the parameters `w` are estimated by minimizing squared error between predicted and observed recall on historical Duolingo logs. HLR outperformed SM-2 on Duolingo's large-scale evaluation both in per-review recall prediction and in downstream engagement (Settles & Meeder, 2016). Subsequent extensions have added learner-ability parameters (Reddy et al., 2016), item-difficulty priors (Tabibian et al., 2019), and neural encoders (Cheng et al., 2022), but the input signal — elapsed time and coarse recall history — remains essentially the same.

### 2.2. Desirable difficulties and retrieval-format effects

A distinct but complementary strand of memory research argues that the *conditions of practice* — not only the schedule — determine long-term learning. Bjork's (1994) *desirable difficulties* framework proposed that interventions that make retrieval harder in the short term (interleaving, generation, variable practice) tend to slow immediate performance but produce more durable knowledge. Meta-analytic evidence supports this claim across recall tasks (Adesope et al., 2017, *g* = 0.51 for testing effect on delayed measures), vocabulary learning (Karpicke & Roediger, 2008), and applied classroom contexts (Yang et al., 2021).

Within vocabulary learning specifically, retrieval format has been shown to matter. Barcroft (2007) demonstrated that constrained-generation practice produced better delayed recall than recognition practice at matched exposure, even when immediate accuracy favored recognition. Nakata (2015) manipulated retrieval effort within an SRS context and found small but consistent advantages for higher-effort formats at delayed testing. Crucially, these studies varied retrieval format across *conditions*; they did not — because SRS algorithms at the time did not permit it — vary the *scheduling* as a function of the difficulty of each individual retrieval event. The question DART asks is therefore not "do harder retrievals produce better memory" (settled, yes) but "does encoding retrieval difficulty into an adaptive scheduling algorithm produce better learning outcomes than an algorithm that treats all retrievals as equivalent." This question, to our knowledge, has never been directly tested with real learners in a randomized design.

### 2.3. Adaptive and personalized scheduling

Recent work has explored personalized adaptation in SRS beyond half-life estimation. Tabibian et al. (2019) framed spaced repetition as a stochastic-optimal-control problem and derived a memory-decay-optimal scheduling policy; on synthetic data, their policy outperformed HLR by a small margin. Ye et al. (2022) applied deep reinforcement learning to Chinese character learning and reported small gains in an offline evaluation. Traxler et al. (2024) integrated a knowledge-tracing model with a scheduler and showed offline improvements over HLR on Duolingo data. Yet a persistent limitation across this literature is the reliance on offline evaluation against archival logs: because the historical log data were themselves generated under a different scheduling policy, any offline comparison confounds policy choice with the *shifted* review distribution the policy produces (Doroudi et al., 2018). Randomized trials with real learners are rare in SRS-algorithm research and, when conducted, have almost always compared one production algorithm against another (Anki vs. Duolingo, e.g.) rather than isolating a specific algorithmic hypothesis. The present study aims to close that gap for the difficulty-signal hypothesis.

### 2.4. The present study

DART extends HLR by a single scalar coefficient. The log half-life of item *i* for learner *l* is modelled as

  `log₂ h_{i,l} = w · x_{i,l} + α · d_{i,l}`

where `x_{i,l}` is the standard HLR feature vector (elapsed time, per-item right/wrong counts, log-transformed exposure count) and `d_{i,l} ∈ {0, 1, 2, 3}` is the difficulty index of the retrieval event: 0 = multiple-choice recognition, 1 = cloze completion, 2 = constrained-generation (produce a sentence containing the target), 3 = paraphrase (rewrite a passage preserving meaning). When α = 0, DART reduces exactly to HLR; when α > 0, a harder retrieval extends the next scheduled interval more than an easier one at matched history. We frame three complementary research questions:

- **RQ1 (algorithmic fit):** Is `α > 0` in real review logs, and does DART achieve higher out-of-sample AUC than HLR?
- **RQ2 (learning outcome):** Do DART-assigned learners achieve higher delayed recall than HLR- and SM-2-assigned learners?
- **RQ3 (context transfer):** Do DART-assigned learners produce higher-quality use of target words in novel contexts?

Each RQ is a *separate* substantive claim; a positive answer to RQ1 does not guarantee a positive answer to RQ2 (a model can fit better without translating into behavior change), and RQ2 does not guarantee RQ3 (recognition and cloze recall do not necessarily transfer to productive use). We test each RQ against pre-registered thresholds and report all outcomes regardless of direction.

---

## 3. Methods

### 3.1. Design

Three-arm, parallel-group, double-blind (learner and grader), pre-registered randomized controlled trial. Learners are stratified by pretest CEFR estimate (B1 vs. B2) and randomly assigned within stratum to one of three scheduling algorithms — DART, HLR, or SM-2 — in a 1:1:1 ratio. Both learners and human raters are blind to arm assignment; the arm label is stored server-side and never exposed in the UI, review URL, or graded response file. Intervention duration is 8 weeks; a delayed posttest is administered at Week 10.

Pre-registration: the full protocol, including primary tests, exclusion rules, and analysis code, will be deposited on the Open Science Framework prior to the first participant's enrollment (`research/PREREGISTRATION.md`; OSF submission planned for 2026-08-29, after IRB approval).

### 3.2. Participants

Target N = 200 Vietnamese undergraduates at CEFR B1–B2 as estimated by an in-app pretest (25-item vocabulary-size test adapted from Nation & Beglar, 2007, plus a 10-item reading-comprehension screener). Inclusion criteria: (i) age 18–30; (ii) Vietnamese L1; (iii) pretest CEFR estimate in the B1 or B2 band; (iv) not currently enrolled in a paid IELTS/TOEFL preparation course (to reduce off-platform vocabulary exposure). Exclusion criteria: (i) self-reported daily use of another SRS application (Anki, Quizlet, Memrise) more than 10 minutes/day in the preceding 30 days; (ii) prior knowledge of ≥ 70 % of the target word list, as measured by the H5 familiarity screener administered before assignment (see §3.4).

Sample size justification: with three arms and a between-arm effect target of *d* = 0.55 on the delayed posttest, N = 200 (≈ 67 per arm after 10 % attrition) yields power = .80 at α = .017 (Holm-adjusted for two contrasts). This target effect corresponds to the mid-range of testing-effect estimates in the vocabulary literature (Adesope et al., 2017) and is smaller than most reported SRS-vs-massed comparisons; if the true effect is smaller, we will be under-powered for RQ2 and report the result as null with a wide confidence interval, per pre-registered decision rules (§4.5).

### 3.3. Materials

**Target word bank.** Sixty English words (30 B1, 30 B2), sampled from the Academic Word List (Coxhead, 2000) and the intersection of the New General Service List (Brezina & Gablasova, 2015) with vocabulary encountered in the Vietnamese national English curriculum. Each entry provides: the word, its part of speech, a single-sense English definition, a Vietnamese gloss (for UI display only, not for scoring), three plausible-but-incorrect distractors for MCQ construction, two sentence exemplars (one used for training-context cloze, one held out for posttest cloze to test transfer beyond the training sentence), and 3–5 common collocations. Item selection was piloted with 20 out-of-sample Vietnamese learners (H5, 2026-08-26); words that ≥ 70 % of pilot respondents already knew were replaced. The final bank is frozen at study start; any post-registration change is logged in `research/AMENDMENTS.md`.

**Retrieval tasks.** For each target word, four retrieval-task types are pre-generated:

- **d = 0, MCQ** — the target word is shown with its part-of-speech and a definition prompt; the learner selects among four options (correct definition + three distractors).
- **d = 1, Cloze** — a training sentence with the target word blanked; the learner types the missing word (exact match with Levenshtein-1 tolerance for words ≥ 5 characters).
- **d = 2, Constrained generation** — the learner is asked to produce an original sentence of 8–20 words that uses the target word correctly. Auto-scored by form check (lemma match, ≥ 8 words); graded for context and meaning by rubric (see §3.5).
- **d = 3, Paraphrase** — a short passage is shown and the learner is asked to paraphrase it in ≥ 15 words while preserving all propositional content. Auto-scored for surface-form overlap (≤ 0.70 Jaccard) and graded by rubric.

Task-type assignment is controlled by the algorithm under study for each learner and word.

**Interface.** All three arms use the same instrumented web application (`app/dashboard-new/`, source at github.com/[repo]). Learners see identical UI chrome across arms; only the sequence and timing of task types differ.

### 3.4. Procedure

Weeks −1 to 0: Recruitment, consent, pretest, H5 familiarity screening, stratified randomization.

Weeks 1–8: Daily study window opens at 06:00 local time. Learners are asked (but not required) to complete a 10–15 minute study session per day; sessions are self-paced and interruption-tolerant. Each session serves items that are algorithmically due (per-arm scheduler) plus a small number of new items until all 60 target words have been introduced. Retrieval-format assignment for each due item follows the arm's policy:

- **SM-2**: MCQ only (matches the reference production behavior in most SM-2 apps).
- **HLR**: MCQ for the first exposure of each word; cloze for the second and subsequent exposures.
- **DART**: MCQ → cloze → constrained generation → paraphrase, advancing one difficulty level per successful retrieval; on failure, the algorithm drops one level. This policy generates the difficulty-signal variation that DART's α coefficient can then be estimated from. To preserve identifiability of α, an ε = .10 exploration probability is added: with probability .10, the assigned difficulty is replaced by a uniformly random draw from {0, 1, 2, 3}. This is a deliberate methodological design decision (§4.7) — without it, difficulty and elapsed time are perfectly confounded in the arm and α cannot be estimated from the arm's log data.

Week 10 (delayed posttest): Three sections, administered in one 30–45 minute session.

- **Section 1 (Recall MCQ, 20 items).** Words w_001–010 and w_031–040 (10 B1 + 10 B2), presented as MCQ in a novel order.
- **Section 2 (Cloze fill, 20 items).** Words w_011–020 and w_041–050, presented in the *held-out* training-sentence pair. This measures transfer beyond the exact sentence seen during training.
- **Section 3 (Context transfer, 10 items).** Words w_021–025 and w_051–055, each presented in a novel scenario prompt (workplace, visa application, product policy, software development) and asked to be used in a written response.

Total delayed posttest score is computed as `70 % · (S1 + S2 auto-score) + 30 % · S3 (rubric-scored)`. Section 1 and 2 are auto-scored; Section 3 is graded by (a) an LLM judge (`lib/llmJudge.ts`, GPT-class model with temperature = 0, prompt in `research/CALIBRATION_GUIDE.md`) and (b) two independent human raters. LLM scores are used only if ICC(2,1) with the human rater mean reaches ≥ .70 on a 40-item calibration set (Ngày 39–40); otherwise LLM scores are downgraded to exploratory and the human mean serves as primary.

### 3.5. Measures and instrumentation

**Log data.** Every retrieval event writes one row to `ReviewLog` (`app/models/ReviewLog.ts`) with the following fields recorded server-side (learner clock is not trusted): `userId`, `sessionId`, `wordId`, `retrievalType ∈ {0,1,2,3}`, `scheduledAt`, `servedAt`, `respondedAt`, `elapsedMs`, `wasCorrect`, `condition` (arm; blinded to grader through a separate anonymized export), `schedulerVersion`, `weightsVersion`, `taskPromptHash`, `isCatchUp`. `clientEventId` supports idempotent replay; `sparse unique` index enforces at-most-once semantics.

**Data-quality gates.** `research/dq_check.py` runs nightly on the exported logs and flags: (i) rows missing any of the 11 required fields (target: < 1 %), (ii) `retrievalType` distribution collapse (each of d = 0,1,2,3 must exceed 10 % of the DART arm's rows or α will be unidentifiable), (iii) session-completion rate per learner (target: > 70 % of scheduled sessions), (iv) suspiciously fast responses (< 400 ms) that indicate rushed guessing.

### 3.6. Analytic plan

**RQ1 (algorithmic fit).** Fit DART and HLR to the DART-arm review logs by maximum likelihood. The primary test of `α > 0` is the **cluster-bootstrap likelihood-ratio test** implemented in `research/dart_model.py` as `lrt_alpha_cluster_bootstrap(rows, n_boot=1000)`: participants (`userId`) are resampled with replacement, both DART and HLR are refit on each bootstrap sample, and the observed likelihood ratio is compared against the resulting null distribution. Boundary correction (0.5 × naïve *p*; Self & Liang, 1987) is applied because α is tested at the edge of the parameter space. Amendment #A-001 (§4.7) documents the choice of cluster bootstrap over the naïve asymptotic LRT.

An **out-of-sample DeLong test** (DeLong et al., 1988) provides an independent confirmatory gate: participants are split 80/20 by `userId` (not by row, to prevent leakage), both models are fit on the 80 %, and their AUCs on the 20 % held-out set are compared with DeLong's non-parametric correlated-AUC test. **H₁ (RQ1) is supported only if both tests reach *p* < .05**; if the cluster-bootstrap LRT is significant but DeLong is not, this indicates out-of-sample power limitation and will be reported as null.

Ancillary quantities to report (not primary tests): bootstrap 95 % CI for α̂ (must not contain 0); per-fold α̂ from 5-fold learner-stratified CV (must have the same sign in ≥ 4/5 folds); expected calibration error (target < .05); the distribution of `retrievalType` in the DART arm (identifiability precondition; if any of d ∈ {0,1,2,3} is < 10 % of DART-arm rows, α is not identifiable and RQ1 is reported as inconclusive).

**RQ2 (delayed recall).** Mixed-effects ANCOVA on delayed posttest total score, with `arm` as fixed effect (three levels), pretest CEFR score and baseline recall rate as covariates, and `participant` as random effect. Pre-planned pairwise contrasts: DART vs SM-2 and DART vs HLR. Family-wise error corrected by Holm–Bonferroni (two contrasts). **H₁ (RQ2) is supported only if both adjusted *p*-values are < .05 and both point estimates favour DART.** A DART advantage over one comparator but not the other is a partial finding, reported as such.

Both **intent-to-treat** and **per-protocol** (compliance ≥ 70 % of scheduled sessions) analyses are pre-specified; ITT is primary. Missing-data policy: multiple imputation (m = 20) under a missing-at-random assumption for posttest scores missing due to dropout; sensitivity analysis under a pattern-mixture missing-not-at-random model is reported alongside.

**RQ3 (context transfer).** Same ANCOVA structure as RQ2, applied to the S3 rubric total (0–8). *Precondition:* LLM–human ICC(2,1) ≥ .70. If met, LLM scores are primary. If unmet, human-rater mean is primary and the RQ is downgraded to exploratory. Rubric dimensions: form (0–2), meaning (0–2), use (0–2), context fit (0–2); guide in `research/CALIBRATION_GUIDE.md`.

### 3.7. Deviations from convention

Two design decisions warrant explicit statement because they will affect interpretability.

**(i) ε-exploration in the DART arm.** DART's own scheduling policy would deterministically pair each item with a difficulty level that is a monotone function of prior success. This makes retrieval difficulty and elapsed time perfectly confounded within the arm, and α is then not identifiable from the arm's own logs. We introduce an ε = .10 uniform-random override on the assigned difficulty. This is a design cost (10 % of DART-arm reviews are randomized rather than algorithm-selected) paid to secure identifiability. It also makes the α estimate more conservative: the model is fit on a mixture that includes 10 % non-optimally-scheduled retrievals.

**(ii) Cluster-bootstrap LRT for RQ1.** Prior to data collection we ran a simulation-based Type-I diagnostic to check that the intended primary test (boundary-corrected asymptotic LRT of Self & Liang, 1987) actually held its nominal α = .05 under the study's clustering structure. It did not (empirical Type-I ≈ .146; 95 % Wilson CI [.092, .223] at N = 60 clusters and 8 weeks; `research/reports/TYPE1_DIAGNOSTIC_2026-08-06.md`). The cause is that the LRT's asymptotic distribution assumes an IID sample size on the order of the number of *rows* (approx. 28k–56k), whereas the effective sample size for α is closer to the number of *learners* (60). We replaced the primary test with the cluster-bootstrap LRT (Cameron & Miller, 2015) — Amendment #A-001, `research/AMENDMENTS.md` — signed 2026-08-07, before pilot data collection. Documenting this substitution transparently in the protocol, rather than after seeing pilot data, is itself part of the methodological contribution.

---

## 4. Planned analysis and expected results

All quantities in this section are `[TBD]` — pre-registration protocol only.

### 4.1. Descriptive statistics

Per-arm baseline balance table: age, gender, pretest CEFR estimate, baseline recall rate, prior SRS-use exposure. Chi-squared or Kruskal–Wallis tests as appropriate; no *p*-value adjustment (descriptive only).

### 4.2. RQ1 result

- α̂ (DART arm) = **[TBD]**, 95 % cluster-bootstrap CI = **[TBD, TBD]**.
- Cluster-bootstrap LRT: LR_obs = **[TBD]**, boundary-corrected *p* = **[TBD]**.
- Out-of-sample DeLong: AUC_DART = **[TBD]**, AUC_HLR = **[TBD]**, *p* = **[TBD]**.
- Per-fold α̂ (5-fold): **[TBD]** — required same-sign ≥ 4/5.
- Expected calibration error: DART = **[TBD]**, HLR = **[TBD]**.

### 4.3. RQ2 result

- Mean delayed posttest total (SD) by arm: DART = **[TBD (TBD)]**, HLR = **[TBD (TBD)]**, SM-2 = **[TBD (TBD)]**.
- ANCOVA main effect of arm: F(2, **[TBD]**) = **[TBD]**, *p* = **[TBD]**, partial η² = **[TBD]**.
- DART vs SM-2 contrast: Δ = **[TBD]** (95 % CI **[TBD, TBD]**), Holm-adjusted *p* = **[TBD]**.
- DART vs HLR contrast: Δ = **[TBD]** (95 % CI **[TBD, TBD]**), Holm-adjusted *p* = **[TBD]**.

### 4.4. RQ3 result

- LLM–human ICC(2,1) on 40-item calibration set: **[TBD]** — required ≥ .70 for primary status.
- Mean rubric total by arm (LLM if ICC ≥ .70, else human mean): DART = **[TBD]**, HLR = **[TBD]**, SM-2 = **[TBD]**.
- ANCOVA: F(2, **[TBD]**) = **[TBD]**, *p* = **[TBD]**.

### 4.5. Decision rules for null / partial results

We commit in advance to the following interpretations:

- **All three RQs positive:** DART is the preferred scheduler; retrieval difficulty is a scheduling signal that translates into learning outcomes and productive use.
- **RQ1 positive, RQ2 negative:** the model fits better but does not translate into behavior change. Reported as a null translational result; the algorithmic contribution stands, but the pedagogical claim is not supported. This is the most likely outcome given typical SRS-algorithm effect sizes.
- **RQ1 negative:** the difficulty signal is not detectable in real data. Reported as null for the primary hypothesis. Exploratory analyses of item-level or learner-level heterogeneity are permitted but flagged as exploratory.
- **RQ2 positive without RQ1:** the arm produces better recall, but not through the mechanism DART proposes. Reported as a positive learning effect of unclear origin, with a call for follow-up work.

Under-powered nulls (RQ2 or RQ3 with CI including practically meaningful effect) are explicitly not interpreted as evidence of absence.

---

## 5. Discussion (draft — to be finalized after data collection)

*[Full discussion pending real data. Draft outline follows.]*

**5.1 Summary of findings.** We predict two most-likely outcomes: (a) α̂ > 0 and DART fits better than HLR on the log data (RQ1 positive), but the delayed-posttest advantage is either small or below detection (RQ2 partial), and (b) DART matches HLR on delayed recall and both outperform SM-2 (RQ2 positive for two arms vs SM-2, null between DART and HLR). Under (a), the contribution is primarily algorithmic — a small, transparent, one-parameter extension of HLR that improves per-review calibration — with a null translational effect that itself constrains theoretical claims for the desirable-difficulties → SRS-scheduling pipeline. Under (b), the contribution is that both statistically principled SRS variants (HLR and DART) outperform the SM-2 heuristic that is currently the production default in most L2 vocabulary apps, and that the additional difficulty-signal that distinguishes DART from HLR does not add measurable learning benefit at the sample size studied.

**5.2 Theoretical implications.** The desirable-difficulties literature has been built on cognitive-lab paradigms with within-subject retrieval-format manipulations at matched exposure counts. Whether the same effect survives when the *scheduler* — rather than the experimenter — chooses the retrieval format is a nontrivial extension. A null RQ2 with a positive RQ1 would suggest that while retrieval difficulty is a real predictor of memory decay, the differences it introduces to a naturally paced 8-week SRS schedule are dominated by variance from other sources (learner motivation, item difficulty, session-level factors). A positive RQ2 would provide the first algorithmic-scheduling evidence for the desirable-difficulties → applied-learning pipeline and would justify further scale-up.

**5.3 Methodological implications.** The Type-I diagnostic that led to Amendment #A-001 (§3.7) is, we argue, the sort of pre-collection sanity check that SRS-algorithm research routinely omits and that would catch a substantial fraction of the false-positive literature in this area. We recommend that any future work testing a single-parameter extension of HLR (or similar likelihood-based scheduler) run an analogous cluster-aware Type-I simulation before committing to an inferential test.

**5.4 Limitations.**

- **Sample restricted to one L1 (Vietnamese) and one L2 (English) at CEFR B1–B2.** Generalization to other language pairs and proficiency ranges is a matter for replication.
- **Eight-week intervention.** SRS effects are cumulative; longer horizons may reveal larger or smaller between-arm gaps. The delayed posttest at Week 10 captures short-term retention; a Week 26 follow-up is desirable but out of scope.
- **The DART arm's ε-exploration is a departure from a hypothetical "pure" DART deployment.** If DART is deployed at scale without ε-exploration, its production behavior would be somewhat different from what this trial evaluates.
- **LLM-judge dependence for RQ3.** Even with ICC ≥ .70 and temperature = 0, LLM outputs are not perfectly reproducible across API versions. Judge model version is logged (`judgeId = "llm:<model-slug>"`) for auditability.

**5.5 Open science.** All source code (Next.js frontend and Python analysis pipeline), the anonymized review-log export, the pre-registration document, all Amendments, and this manuscript are or will be made publicly available on GitHub and OSF at the completion of the study.

---

## References

*Preliminary reference list — to be completed and formatted to APA 7 conventions at final draft.*

Adesope, O. O., Trevisan, D. A., & Sundararajan, N. (2017). Rethinking the use of tests: A meta-analysis of practice testing. *Review of Educational Research, 87*(3), 659–701.

Barcroft, J. (2007). Effects of opportunities for word retrieval during second language vocabulary learning. *Language Learning, 57*(1), 35–56.

Bjork, R. A. (1994). Memory and metamemory considerations in the training of human beings. In J. Metcalfe & A. Shimamura (Eds.), *Metacognition: Knowing about knowing* (pp. 185–205). MIT Press.

Bjork, E. L., & Bjork, R. A. (2011). Making things hard on yourself, but in a good way. In M. A. Gernsbacher et al. (Eds.), *Psychology and the real world* (pp. 56–64). Worth.

Brezina, V., & Gablasova, D. (2015). Is there a core general vocabulary? Introducing the New General Service List. *Applied Linguistics, 36*(1), 1–22.

Cameron, A. C., & Miller, D. L. (2015). A practitioner's guide to cluster-robust inference. *Journal of Human Resources, 50*(2), 317–372.

Cepeda, N. J., Vul, E., Rohrer, D., Wixted, J. T., & Pashler, H. (2008). Spacing effects in learning: A temporal ridgeline of optimal retention. *Psychological Science, 19*(11), 1095–1102.

Cheng, S., et al. (2022). *[Neural HLR extension — full ref TBD.]*

Chernoff, H. (1954). On the distribution of the likelihood ratio. *Annals of Mathematical Statistics, 25*(3), 573–578.

Cizek, G. J. (2016). Validating test score meaning and defending test score use: Different aims, different methods. *Assessment in Education, 23*(2), 212–225.

Coxhead, A. (2000). A new academic word list. *TESOL Quarterly, 34*(2), 213–238.

DeLong, E. R., DeLong, D. M., & Clarke-Pearson, D. L. (1988). Comparing the areas under two or more correlated receiver operating characteristic curves. *Biometrics, 44*(3), 837–845.

Doroudi, S., Aleven, V., & Brunskill, E. (2018). Where's the reward? A review of reinforcement learning for instructional sequencing. *IJAIED, 29*, 568–620.

Ebbinghaus, H. (1885/1913). *Memory: A contribution to experimental psychology.* (H. A. Ruger & C. E. Bussenius, Trans.). Teachers College.

Elmes, D. (2006). *Anki (Version 2.1) [Computer software]*. https://apps.ankiweb.net

Karpicke, J. D., & Roediger, H. L. (2008). The critical importance of retrieval for learning. *Science, 319*(5865), 966–968.

Kornell, N., & Bjork, R. A. (2008). Learning concepts and categories: Is spacing the "enemy of induction"? *Psychological Science, 19*(6), 585–592.

Metcalfe, J., & Finn, B. (2008). Evidence that judgments of learning are causally related to study choice. *Psychonomic Bulletin & Review, 15*(1), 174–179.

Nakata, T. (2015). Effects of expanding and equal spacing on second language vocabulary learning. *Studies in Second Language Acquisition, 37*(4), 677–711.

Nation, I. S. P. (2006). How large a vocabulary is needed for reading and listening? *Canadian Modern Language Review, 63*(1), 59–82.

Nation, I. S. P., & Beglar, D. (2007). A vocabulary size test. *The Language Teacher, 31*(7), 9–13.

Nguyen, T. H., & Godfroid, A. (2020). *[Vietnamese EFL vocabulary — full ref TBD.]*

Pham, T., & Nguyen, L. (2024). *[Vietnamese IELTS candidate SRS usage — full ref TBD.]*

Reddy, S., Labutov, I., Banerjee, S., & Joachims, T. (2016). Unbounded human learning: Optimal scheduling for spaced repetition. *KDD 2016*, 1815–1824.

Rowland, C. A. (2014). The effect of testing versus restudy on retention: A meta-analytic review. *Psychological Bulletin, 140*(6), 1432–1463.

Self, S. G., & Liang, K.-Y. (1987). Asymptotic properties of maximum likelihood estimators and likelihood ratio tests under nonstandard conditions. *Journal of the American Statistical Association, 82*(398), 605–610.

Settles, B., & Meeder, B. (2016). A trainable spaced repetition model for language learning. *ACL 2016*, 1848–1858.

Tabibian, B., Upadhyay, U., De, A., Zarezade, A., Schölkopf, B., & Gomez-Rodriguez, M. (2019). Enhancing human learning via spaced repetition optimization. *PNAS, 116*(10), 3988–3993.

Traxler, F., et al. (2024). *[Knowledge tracing + SRS integration — full ref TBD.]*

Wozniak, P. A. (1990). *Optimization of learning* [Master's thesis]. University of Technology, Poznań.

Yang, C., Luo, L., Vadillo, M. A., Yu, R., & Shanks, D. R. (2021). Testing (quizzing) boosts classroom learning: A systematic and meta-analytic review. *Psychological Bulletin, 147*(4), 399–435.

Ye, X., et al. (2022). *[Deep-RL for Chinese character learning — full ref TBD.]*

---

## Appendix A. Amendment log

- **A-001** (signed 2026-08-07): Primary RQ1 test changed from asymptotic boundary-corrected LRT (Self & Liang, 1987) to cluster-bootstrap LRT (Cameron & Miller, 2015), B = 1000, boundary correction 0.5 ×. Rationale: simulation-based Type-I check revealed the asymptotic test is anti-conservative (empirical Type-I ≈ .146, Wilson CI [.092, .223], N = 60 clusters, 8 weeks) under the study's clustering structure. Signed before pilot data collection. Full text: `research/AMENDMENTS.md`.

## Appendix B. Sample-size sensitivity

| N (per arm) | Detectable *d* (RQ2, α = .017, power = .80) |
|---|---|
| 40 | 0.83 |
| 60 | 0.68 |
| 67 (planned) | 0.64 |
| 80 | 0.58 |
| 100 | 0.52 |

Numbers derived from `research/power_analysis.py` (Ngày 3 report). Interpretation: at the planned N of 67 per arm, we can detect an effect of *d* ≈ 0.64 or larger with 80 % power. Effects smaller than this — including the *d* ≈ 0.4 that some SRS-vs-massed studies report — will be under-detected; if we observe a null, we will not claim absence of effect for *d* < 0.6.

---

*End of PAPER_DRAFT_v1.*
