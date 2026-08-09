# Pre-Registration: DART — Difficulty-Adaptive Retrieval Timing for L2 Vocabulary Learning

**Pre-registration draft (OSF format)**
Status: DRAFT — submit to OSF after IRB approval (H1) and DESIGN_FREEZE.md is signed (H2).
Do not modify after OSF submission. Any deviation from this document must be disclosed in the final paper as a registered report deviation.

---

## 1. Study Title

*Difficulty-Adaptive Retrieval Timing (DART) for Second-Language Vocabulary Acquisition: A Three-Arm Randomized Controlled Trial*

---

## 2. Authors

- **Principal Investigator**: Phan Văn Kha
- **Supervisor**: [name pending — fill before OSF submission]
- **Institutional Affiliation**: [fill before OSF submission]
- **Contact**: phanvankha06122004@gmail.com

---

## 3. Rationale

Spaced-repetition systems (SRS) schedule reviews using only elapsed time and overall recall history (half-life regression, HLR; Settles & Meeder 2016). However, the difficulty of a retrieval event — how hard the learner had to work to retrieve a word — may provide additional scheduling signal beyond the elapsed-time path. **DART** extends HLR by introducing a difficulty modifier α: when a learner retrieves a word with high effort (cloze, context-transfer) the algorithm lengthens the inter-study interval more than when the word is retrieved via an easy recognition task (MCQ), consistent with desirable difficulties theory (Bjork 1994; Kornell & Bjork 2008).

If α > 0 and DART produces higher recall at delayed posttest than SM-2 or HLR, this suggests that retrieval effort — not only time — should be encoded in scheduling algorithms, with direct implications for adaptive language-learning applications.

---

## 4. Research Questions and Hypotheses

### RQ1 — Algorithm fit (in-model and out-of-sample)

Does DART predict recall probability more accurately than HLR on real review logs?

- **H₀ (RQ1)**: α = 0 (DART reduces to HLR; difficulty provides no additional signal)
- **H₁ (RQ1)**: α > 0

**Primary test**: **Cluster-bootstrap likelihood-ratio test** (case cluster bootstrap resampling participants with replacement, B=1000, boundary correction 0.5×). See Amendment #A-001 (`research/AMENDMENTS.md`, signed 2026-08-07) — the original asymptotic boundary-corrected LRT (Self & Liang 1987) was shown to be anti-conservative under the study's clustering pattern (Type-I ≈ 0.146 vs 0.05 nominal; Cameron & Miller 2015). Implementation: `lrt_alpha_cluster_bootstrap` in `research/dart_model.py`. Significance criterion: p_cluster_boundary < .05.
**Confirmatory test**: DeLong out-of-sample AUC comparison (DART vs HLR on held-out 20% data).
Criterion: DeLong p < .05. Both must be satisfied for H₁ to be supported.

### RQ2 — Learning outcome (posttest)

Do DART-assigned participants achieve higher delayed recall than SM-2 and HLR participants?

- **H₀ (RQ2)**: μ_DART = μ_HLR = μ_SM2 (no arm difference in delayed-posttest score)
- **H₁ (RQ2)**: μ_DART > max(μ_HLR, μ_SM2) (DART arm superior to both comparators)

**Primary test**: Mixed-effects ANCOVA with participant as random effect, arm as fixed effect, pretest CEFR score and baseline recall rate as covariates. Pairwise contrasts: DART vs SM-2 and DART vs HLR, Holm–Bonferroni adjusted. Significance: adjusted p < .05 for both contrasts.

**Primary outcome**: Delayed posttest score at Week 10 (2 weeks after end of 8-week intervention), scored as proportion correct, transformed to percentage (0–100).

### RQ3 — Context transfer (production + meaning-in-use)

Does DART produce higher Context Transfer (CT) scores than comparator arms, as assessed by LLM judge with human ICC validation?

- **H₀ (RQ3)**: μ_CT,DART = μ_CT,HLR = μ_CT,SM2
- **H₁ (RQ3)**: μ_CT,DART > max(μ_CT,HLR, μ_CT,SM2)

**Pre-condition**: LLM judge ICC(2,1) ≥ 0.70 vs human rater mean (measured on ~40-item calibration set, Ngày 39–40). If ICC < 0.70, CT scores cannot be used as primary outcome; RQ3 becomes exploratory.

---

## 4bis. Giải thích chi tiết 3 RQ (bản tiếng Việt)

> Bổ sung cho §4. Mục đích: nói rõ cái gì đang được kiểm định, tại sao chọn test đó, ngưỡng gì, và bẫy gì cần tránh. Nếu có mâu thuẫn với §4 tiếng Anh, §4 là nguồn chính.

### Ngữ cảnh chung — DART làm gì

DART mở rộng HLR (Half-Life Regression, Settles & Meeder 2016) bằng một tham số duy nhất **α ≥ 0**:

    log h_i = w · x_i  +  α · d_i

Trong đó `h_i` là "half-life" (nửa đời trí nhớ) của từ *i*, `x_i` là feature vector (tần suất, thời gian, lịch sử recall…), và `d_i ∈ {0, 1, 2, 3}` là **retrieval difficulty**:

| d | Loại retrieval | Ý nghĩa |
|---|---|---|
| 0 | MCQ (nhận diện) | Dễ nhất — chỉ cần nhận ra |
| 1 | Cloze (điền chỗ trống) | Sản sinh có gợi ý ngữ cảnh |
| 2 | Constrained generation (dùng từ trong câu tự viết) | Sản sinh có ràng buộc |
| 3 | Paraphrase (viết lại đoạn) | Chuyển giao ngữ cảnh — khó nhất |

Nếu **α = 0**, DART thoái hoá thành HLR. Nếu **α > 0**, retrieval khó hơn kéo dài half-life nhiều hơn — khớp lý thuyết "desirable difficulties" (Bjork 1994).

Ba RQ là ba tầng chứng cứ **độc lập** phải cùng đạt để claim "DART có tác dụng": RQ1 kiểm tra **mô hình có fit tốt hơn** (fit độ khớp trên log review), RQ2 kiểm tra **học viên có nhớ nhiều hơn** (posttest), RQ3 kiểm tra **học viên có chuyển giao được** (sinh ngữ mới). RQ1 có thể "thắng" mà RQ2 không (mô hình fit tốt hơn nhưng không dẫn tới nhớ tốt hơn — chuyện thường). RQ2 có thể thắng mà RQ3 không.

### RQ1 chi tiết — Algorithm fit

**H₁ là one-sided**. α < 0 (difficulty cao → half-life ngắn hơn) sẽ là "reverse desirable difficulties" — thú vị nhưng không phải điều DART tuyên bố. Nếu quan sát α < 0 significant, phải báo cáo là finding phụ.

**Tại sao boundary correction:** α được test ở biên của parameter space (α ≥ 0). Phân phối null của LR không phải χ²₁ mà là hỗn hợp 50:50 của χ²₀ (điểm khối tại 0) và χ²₁ (Self & Liang 1987; Chernoff 1954). Bỏ qua boundary correction sẽ khiến p-value nhỏ hơn thực tế 2 lần — sai chiều conservative.

**Cạm bẫy đã confirm — Type-I inflation do clustering:** Diagnostic 2026-08-05/06 (`reports/TYPE1_DIAGNOSTIC_2026-08-06.md`) cho thấy LRT boundary-corrected chuẩn **anti-conservative** tại tham số study (weeks=8, N=60): reject rate 0.146, Wilson CI [0.092, 0.223] — floor > 0.05 nominal. Nguyên nhân: `n = số dòng` (~28k–56k) trong LRT nhưng dữ liệu phân cụm theo `userId` (60 cụm). Tail bootstrap null dày 2.8×–3.7× χ²₁. → Cần **Amendment #A-001** (`research/AMENDMENTS.md`) đổi sang cluster-bootstrap LRT (A) hoặc sandwich adjustment (B). Ký trước Ngày 27.

**Tại sao cần DeLong out-of-sample bên cạnh LRT:** LRT là kiểm định in-model — mọi overfit sẽ trông như evidence. DeLong (DeLong et al. 1988) là gate độc lập: chia 80/20 theo `userId` (không theo dòng — tránh leak), fit trên 80%, so AUC trên 20% held-out. Non-parametric so hai AUC tương quan (cùng test set).

**Điều kiện chấp nhận H₁:** **Cả hai** phải đạt: LRT p_boundary < .05 AND DeLong p < .05. Nếu chỉ LRT đạt, đó là **thiếu power ngoài mẫu** — không phải kết quả. Phải báo cáo âm tính.

**Ngưỡng phụ (phải báo cáo, không phải test chính):**
- Bootstrap 95% CI cho α_hat phải không chạm 0.
- α theo fold (5-fold CV theo userId): cùng dấu ở ≥ 4/5 fold.
- ECE < .05: fit tốt phải calibrated.
- **Cảnh báo `retrievalType`**: nếu pilot data chỉ có 1 mức d (VD 100% MCQ), α **không định danh được** — mọi số dưới vô nghĩa. Kiểm tra đầu tiên khi đọc `fit_dart.py` output.

### RQ2 chi tiết — Learning outcome

**H₁ đòi hỏi DART thắng cả HLR và SM-2** — không phải "trung bình cộng hai nhánh kia". Nếu DART = HLR và cả hai > SM-2, đó là claim "SRS adaptive tốt hơn SRS truyền thống" — không phải claim của DART.

**Cấu trúc outcome (totalScore):** Delayed posttest ở Tuần 10, 0–100%, 3 phần:
1. Recall MCQ (20 từ) — tự động chấm.
2. Cloze Fill (20 từ, câu **khác** câu training) — tự động chấm (fuzzy Levenshtein-1 cho word ≥ 5 chars).
3. Context Transfer (10 từ, scenario mới hoàn toàn) — rubric 4 chiều (form/meaning/use/contextFit), LLM + người song song.

Trọng số **70% recall+cloze / 30% context transfer**. RQ2 dùng totalScore này.

**Tại sao mixed-effects ANCOVA (không phải t-test 2 mẫu):** Participant là random effect (nhiều dòng/người nếu có repeated measures; ở đây 1 posttest/người nhưng vẫn cần cấu trúc để thêm CEFR baseline + baseline recall làm covariate — absorb heterogeneity, tăng power). Fixed effect = arm. Pairwise **DART vs SM-2** và **DART vs HLR** — Holm–Bonferroni (2 comparisons, bảo thủ hơn Bonferroni thuần vì tuần tự).

**Ngưỡng:** adjusted p < .05 cho **cả hai** contrasts. Nếu chỉ 1 đạt, RQ2 âm tính.

**Power — thừa nhận thẳng thắn:** Với N = 200 (65–70/nhánh sau dropout ~15%), power để detect Cohen's d = 0.55 (medium-large) trong pairwise ANCOVA ≈ 0.80. Nếu effect thật < 0.55, thiếu power. Đã ghi §7. Kết quả âm tính không được kết luận "DART không hiệu quả" — chỉ "không detect được effect ≥ d=0.55 ở N=200".

**Phân tích phụ:**
- ITT (Intention-to-Treat) — tất cả người enrol, imputed missing (multiple imputation, 20 imp).
- PP (Per-Protocol) — chỉ người tuân thủ ≥ 70% phiên.
- Nếu ITT vs PP kết luận khác nhau → dropout bias mạnh, nhấn mạnh trong Discussion.

### RQ3 chi tiết — Context transfer

Cùng cấu trúc RQ2 nhưng outcome hẹp hơn: **chỉ 10 items Context Transfer**, rubric max 8 điểm/item.

**Tại sao gate ICC(2,1) ≥ 0.70:** Ở Ngày 39–40, ~40 item CT chấm **song song** bởi LLM Judge (OpenAI/Groq, temp=0, `lib/llmJudge.ts`) **và** ≥ 2 giáo viên người đã qua calibration (H6, `CALIBRATION_GUIDE.md` + `calibration_practice_items.json`). Tính ICC(2,1) — Intraclass Correlation, two-way random, single measures, absolute agreement — giữa LLM và mean human.

- **ICC ≥ 0.70**: LLM đủ tin cậy → chấm tất cả ~2000 responses → RQ3 chạy full primary.
- **ICC < 0.70**: LLM không đủ tin. RQ3 **downgrade thành exploratory** (chỉ 2 người chấm subset).

**Tại sao chọn ICC(2,1) chứ không Pearson r hay ICC(3,1):**
- Two-way random: cả rater và subject đều random effect (LLM cũng là "một rater").
- Single measures: muốn biết một rater đơn lẻ có nhất quán không (không average).
- Absolute agreement: quan tâm điểm tuyệt đối, không chỉ thứ tự.

Threshold 0.70 theo Cicchetti (1994): 0.60–0.74 = good, 0.75+ = excellent. 0.70 là biên dưới của "good" — bảo thủ vừa phải cho LLM-as-judge (Chiang & Lee 2023).

**Bẫy thường gặp:**
- **Ceiling / floor**: CT khó → nhiều điểm gần 0. ANCOVA giả định residual normal — nếu floor rõ, cân nhắc Poisson/beta-regression sensitivity.
- **Rater drift**: LLM version thay đổi giữa nghiên cứu → phải log `judgeId = "llm:<model-slug>"` mỗi score (đã có `lib/llmJudge.ts`). Nếu OpenAI update model giữa study, phải re-validate ICC trên subset mới.
- **Correlation với RQ2**: CT là một phần totalScore RQ2 (30%). Nếu RQ2 dương tính chủ yếu do CT thắng, RQ2 và RQ3 không phải chứng cứ độc lập — phải báo cáo tương quan giữa recall+cloze subscore và CT subscore.

### Kết cấu chứng cứ — cách đọc kết quả tổng hợp

| RQ1 | RQ2 | RQ3 | Kết luận |
|:-:|:-:|:-:|---|
| ✅ | ✅ | ✅ | DART có hiệu quả toàn diện — kết quả mạnh nhất |
| ✅ | ✅ | ✗ | Học vẹt tốt hơn nhưng không transfer — hạn chế thực tiễn |
| ✅ | ✗ | ✗ | Mô hình fit tốt hơn không đồng nghĩa dạy tốt hơn — đóng góp lý thuyết yếu |
| ✗ | ✅ | ? | Bất thường — có thể do noise; phải điều tra |
| ✗ | ✗ | ✗ | DART không hiệu quả ở N khả thi — **kết quả âm tính chính thức**, vẫn đáng công bố |

Kết quả âm tính (row cuối) **không phải thất bại của nghiên cứu**. Với pre-registration đầy đủ, đây vẫn là contribution — chứng cứ negative với power được ghi rõ giúp cộng đồng SRS/L2 tránh đi lại con đường này.

---

## 5. Study Design

| Parameter | Value |
|---|---|
| Design | Three-arm parallel RCT, participant-blind |
| Arms | SM-2 (control) · HLR (baseline SRS) · DART (intervention) |
| Allocation ratio | 1:1:1 |
| Stratification | CEFR band (A2 / B1 / B2) from placement pretest |
| Allocation concealment | Computer-generated; arm assignment encrypted in signed participant token; not visible to participant |
| Blinding | Participants blind to arm. NCV has read access to arm labels but does not score outcome items. |
| Platform | Web application (voichat1012 / EnglishPal) |
| Intervention duration | 8 weeks |
| Delayed posttest | Week 10 (2 weeks post-intervention) |
| Target word bank | 60 words: B1 (w_001–030), B2 (w_031–060) — from AWL/GSL (Nation & Waring 1997) |
| Practice retrieval types | MCQ recognition (d=0), Cloze completion (d=1), Paraphrase (d=2), Context Transfer (d=3) |

---

## 6. Participants

### Inclusion criteria
- Native Vietnamese speakers
- CEFR A2–B2 on placement pretest (≥ 4 correct items on A2 band, or placed into B1/B2)
- Access to a smartphone or computer with internet connection
- Ability to commit to 8-week study period

### Exclusion criteria
- Learners with English as a specialty subject above B2
- Diagnosed vision or language disorder not corrected/controlled
- Participants under 18 without parental consent form

### Target N
**200 enrolled**; expected ~165 for per-protocol analysis (~18% attrition).

### Power analysis
Alpha = 0.05 (two-tailed for RQ2 pairwise), power = 0.80, expected effect size for DART vs HLR: d = 0.45 (medium; grounded in Settles & Meeder 2016 improvement over SM-2 baseline).
G*Power result: minimum N = 83 per arm (3 arms → 249), adjusted for 18% attrition → **200** is underpowered for RQ2 per strict power calculation. If N = 200 is confirmed, RQ2 is adequately powered only for d ≥ 0.55. Pre-registered acknowledgement: *study may be underpowered for small-to-medium effects on RQ2; RQ1 (single-parameter α test) is well-powered at N ≥ 100 review events per d-level.*

---

## 7. Target Words and Posttest Design

### Word bank (frozen)
60 words: `lib/wordBank.ts`, version `word_bank_v1.0`, validated by `research/validate_word_bank.py` (305/305 checks pass).

### Posttest form
`FORM_VERSION = "posttest_v1.0"` (frozen in `lib/posttestBuilder.ts`).

| Section | Words | Format | Scoring |
|---|---|---|---|
| Recall MCQ | w_001–010 + w_031–040 | 4-choice MCQ | 1 per correct |
| Cloze completion | w_011–020 + w_041–050 | Fill target word in sentences[1] | 1 per correct (Levenshtein ≤ 1, word ≥ 5 chars) |
| Context Transfer | w_021–025 + w_051–055 | Free-response scenario | Rubric 0–8 per item |
| Delayed (Week 10 only) | w_026–030 + w_056–060 | Mixed Recall+Cloze | As above |

### Posttest scoring formula
- Recall raw + Cloze raw → 70% weight
- Context Transfer LLM score (normalized 0–100) → 30% weight
- Total = 0.70 × (recall + cloze proportions combined) × 100 + 0.30 × CT_normalized

---

## 8. Measures and Instruments

### Primary outcome
Delayed posttest score (Week 10), section Recall + Cloze + CT, total 0–100.

### Secondary outcomes
1. Immediate posttest score (Week 8)
2. Context Transfer score (if ICC ≥ 0.70)
3. Adherence rate (proportion of scheduled sessions completed)
4. Retention curve slope (estimated per participant from review logs)

### Placement pretest
20 MCQ items: 8 A2, 6 B1, 6 B2. Scoring band: ≥ 4 B2-level correct → B2; ≥ 4 B1-level correct → B1; else A2.

### Algorithm parameters
- DART: half-life regression with difficulty modifier α; ε = 0.10 exploration rate (10% random retrieval-type assignment per session to ensure identifiability)
- HLR: standard half-life regression (Settles & Meeder 2016), same features minus difficulty
- SM-2: original algorithm (SuperMemo 2, 1987) as control

---

## 9. Analysis Plan

### 9.1 RQ1 — α parameter estimation

1. Fit DART model on training folds (5-fold CV, grouped by userId).
2. Fit HLR (nested model, α=0) on same folds.
3. Compute LRT statistic: λ = 2(ℓ_DART − ℓ_HLR).
4. Apply boundary correction: p_boundary = 0.5 × P(χ²₁ > λ) (Self & Liang 1987, one-sided because α ≥ 0).
5. Also report naïve p (without correction) for transparency.
6. DeLong test: fit both models on training, predict on held-out 20% fold, compare AUC.

**Pre-registered decision rule**: H₁ supported iff p_boundary < .05 AND DeLong p < .05.

### 9.2 RQ2 — Posttest arm comparison

1. Primary: mixed-effects ANCOVA, outcome = delayed posttest score, fixed effects = arm + pretest_score + cefr_band, random effect = userId.
2. Contrasts: DART vs SM-2, DART vs HLR (Holm–Bonferroni).
3. Intent-to-treat (ITT): include all randomised participants regardless of adherence; missing posttest → multiple imputation (m=20, auxiliary = arm, pretest, adherence rate).
4. Per-protocol (PP) sensitivity: include only participants completing ≥ 60% of sessions AND posttest.
5. Effect size: Cohen's d (unadjusted SD).

### 9.3 RQ3 — Context Transfer

1. Compute ICC(2,1) between LLM judge and mean of 2 human raters on calibration set (~40 items).
2. If ICC ≥ 0.70: CT score is confirmatory secondary outcome; repeat RQ2 ANCOVA with CT score as outcome.
3. If ICC < 0.70: CT analysis is exploratory; reported but not treated as hypothesis-confirming.

### 9.4 Exploratory analyses (not hypothesis-testing)
- Moderation by CEFR band (arm × CEFR interaction)
- Comparison with LECTOR/KARL/CARTS via offline simulation on review logs
- Retention curve shape by arm
- α heterogeneity across retrieval types

### 9.5 Data quality exclusion criteria (pre-specified)
Applied before any analysis:
1. `elapsed_ms < 200`: flag as button-mash; exclude from α estimation only (keep in ITT outcome analysis)
2. `elapsed_ms > 300000`: clamp to 300000 for HLR fit; flag for sensitivity check
3. Any d-level with < 10% of total reviews for a participant: flag; if < 10% system-wide, note as α identifiability warning
4. Participants with 0 posttest items answered: excluded from primary analysis (attritor)

---

## 10. Pre-registered Constants

The following constants are locked before data collection begins. Changing them post-hoc requires a registered amendment (see `research/AMENDMENTS.md` format).

| Constant | Value | Source |
|---|---|---|
| `PARAPHRASE_OVERLAP_MAX` | 0.70 (Jaccard) | `lib/posttestBuilder.ts` |
| Levenshtein typo tolerance | 1 edit, word ≥ 5 chars only | `lib/posttestBuilder.ts` |
| ε-exploration rate | 0.10 | DART scheduler |
| `TOKEN_TTL_SECS` | 6,048,000 (70 days) | `lib/participantAuth.ts` |
| `FORM_VERSION` | `"posttest_v1.0"` | `lib/posttestBuilder.ts` |
| ICC threshold (RQ3 gate) | ≥ 0.70 | `research/CALIBRATION_GUIDE.md` |
| Rubric max (4-dim) | 8 (0–2 per dim × 4) | `lib/judgeRubric.ts` |
| α significance: p_boundary | < 0.05 | RQ1 |
| Posttest weight (recall+cloze) | 70% | `lib/posttestBuilder.ts` |
| Posttest weight (CT) | 30% | `lib/posttestBuilder.ts` |
| Dropout threshold (PP analysis) | < 60% sessions | Section 9.2 |
| Min D-level spread (identifiability) | ≥ 10% per d ∈ {0,1,2,3} | `research/dq_check.py` |

---

## 11. Timeline

| Milestone | Target date |
|---|---|
| IRB submission | [H1 — overdue, user must submit] |
| DESIGN_FREEZE.md signed | [H2 — immediately after IRB approval] |
| Pilot word bank testing (N=20) | Ngày 27–28 |
| Human rater recruitment (ICC calibration) | Ngày 25 (done), Ngày 39–40 |
| Production deployment | Ngày 30 |
| Participant recruitment begins | Ngày 31 |
| Recruitment closes | Week 8 from start |
| Immediate posttest | Week 8 from start |
| Delayed posttest | Week 10 from start |
| Analysis + write-up | Ngày 38–45 |

---

## 12. Disclosure of Deviations

Any deviation from this pre-registration after data collection begins must be documented in `research/AMENDMENTS.md` and disclosed in the Methods section of the final paper with rationale. Exploratory analyses run in addition to pre-registered analyses must be labelled *exploratory* in the paper.

---

## 13. Data Availability

De-identified review logs and anonymised posttest data will be made available via OSF after embargo lift (after publication). Raw participant identifiers will not be shared; all IDs are HMAC-SHA256 hashed with `RESEARCH_SALT` (not disclosed).

---

## 14. References

- Settles, B., & Meeder, B. (2016). A trainable spaced repetition model for language learning. *ACL 2016*.
- Bjork, R.A. (1994). Memory and metamemory considerations in the training of human beings. In J. Metcalfe & A. Shimamura (Eds.), *Metacognition*.
- Kornell, N., & Bjork, R.A. (2008). Optimising self-regulated study. *Memory & Cognition, 36*(4), 625–635.
- Nation, I.S.P. (2001). *Learning vocabulary in another language*. Cambridge University Press.
- Read, J. (2000). *Assessing vocabulary*. Cambridge University Press.
- Self, S.G., & Liang, K.Y. (1987). Asymptotic properties of maximum likelihood estimators under nonstandard conditions. *JASA, 82*(398), 605–610.
- DeLong, E.R., DeLong, D.M., & Clarke-Pearson, D.L. (1988). Comparing the areas under two or more correlated receiver operating characteristic curves. *Biometrics, 44*, 837–845.

---

*Document generated: 2026-08-04*
*OSF submission date: [pending — fill after IRB approval]*
*OSF registration DOI: [pending]*
