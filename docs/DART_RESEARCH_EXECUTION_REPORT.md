# DART Research Execution Report

**Maintainer:** Codex execution workflow  
**Started:** 2026-10-15 (Asia/Bangkok)  
**Scope:** DART registered-report preparation and research-operational gates.

## Operating rule

This report distinguishes **repository evidence** (a file or test exists) from
**operational evidence** (a command, external approval, or real study action has
actually completed). A repository file alone never proves that an IRB approval,
database migration, backup, preregistration, pilot, or data collection occurred.

## Baseline audit

| Area | Repository evidence | Operational status | Next verification |
| --- | --- | --- | --- |
| DART / HLR model | `research/dart_model.py`, `research/fit_dart.py` | Not yet run in this execution environment | Install analysis dependencies; run synthetic pipeline only as a smoke test |
| RQ1 inference | DeLong and cluster-related code are present, but the production fit command still calls the invalid row-IID LRT | Confirmatory analysis is not operationally valid | Freeze a statistician-approved clustered null procedure; wire it into the production command; then verify Type-I control and learner-level CV |
| Research database | `research/verify_env.js`, `research/create_indexes.js`, backup script exist | Blocked: no `.env.research` supplied to this environment | User provides/configures secrets locally; run the verifier without logging secrets |
| IRB | Checklist/submission material exists | Unverified external gate | Record approval identifier and date; do not enrol until approved |
| Preregistration | Draft exists | Unverified external gate | Publish a frozen version after IRB approval and technical gates |
| Instruments | Word bank, retrieval tasks, post-test and judge code exist | Familiarity screen and rater calibration not evidenced | Run H5 and H6 before main study |
| Pilot / main study | Checklist and analysis code exist | No real participant data verified | Run pilot only after the preceding gates pass |

## Current blocking sequence

1. Configure a private `.env.research` containing an isolated research MongoDB URI,
   database name, and a strong research salt. Do not commit or paste its values.
2. Run `node research/verify_env.js` and retain only its non-secret pass/fail output.
3. Run `node research/create_indexes.js` against the isolated research database.
4. Perform a backup-and-restore drill to a disposable database; save a dated report.
5. Install the analysis environment and run the synthetic pipeline and Type-I checks.
6. Obtain IRB approval, freeze/publish preregistration, then run familiarity and
   rater-calibration gates before the pilot.

## Research scheduler remediation: acceptance criteria

The RCT scheduler gate is complete only when all of the following are evidenced
by automated tests and a staging dry run:

| Requirement | Evidence required |
| --- | --- |
| Authentication | Missing, expired, or forged participant token returns 401; token identity is the only participant identity used by scheduling. |
| Arm fidelity | A participant stored as `sm2`, `hlr`, or `dart` reaches exactly that server-side dispatcher; the arm is never received from the client. |
| Baseline fidelity | Research-owned SM-2 state persists and transitions deterministically from the pre-registered quality mapping and initial state. HLR has α fixed to zero; DART uses the frozen weights/version. |
| Task decision provenance | Every task has a server-signed, short-lived one-time receipt binding participant, vocabulary, arm, retrieval type, features, scheduler version, and weights version. |
| Fail closed | A missing/invalid/expired/consumed receipt prevents review insertion. Offline retries reuse an issued receipt and cannot fabricate a replacement task. |
| Blinding | Client response does not expose arm name, weights, or an arm-distinguishing explanation. |
| Logging | The server writes the true arm and immutable decision version; the client cannot override either field. |
| Pilot audit | A staging/controlled pilot export shows all assigned arms, no default/fabricated tasks, valid receipts only, and the planned retrieval-type distribution. |

## Evidence log

### 2026-10-15 — protocol/code consistency finding: ε-exploration

- `lib/retrievalTasks/session.ts` uses `EPSILON = 0.20` and its code comment
  attributes the change from 0.10 to 0.20 to decision D-014 on 2026-08-11.
- `research/PREREGISTRATION.md` and `research/DESIGN_FREEZE.md` still specify
  ε = 0.10. This is a material protocol/code discrepancy because ε determines
  the randomized retrieval-type assignments used to identify the DART α
  parameter.
- **Gate:** Before any pilot or enrolment, either restore the implementation to
  0.10 or amend the preregistration and design-freeze documents to 0.20 with a
  dated rationale, version identifiers, and the updated distribution/power
  check. Do not silently choose either value.

**Resolution (documentation only):** `docs/DECISIONS.md` records active
Decision D-014 (2026-08-11) raising ε to 0.20. The unpublished draft
`PREREGISTRATION.md` and `DESIGN_FREEZE.md` were synchronized to 0.20 with that
decision reference. This does not resolve the separate live-wiring gate below.

### 2026-10-15 — ε-exploration is not wired into the live study path

- Repository search found no call site for `pickTaskType()` outside its
  definition in `lib/retrievalTasks/session.ts`; consequently its
  `epsilonExplore` switch and `EPSILON` constant are not part of the observed
  application flow.
- The live study page instead calls `/api/dart/schedule`, which calculates the
  next retrieval type through `lib/dart.ts::dartSchedule()` and
  `selectNextRetrievalType()`. Those functions have no ε-exploration input or
  random override.
- **Gate:** Do not claim the preregistered random exploration is implemented
  until the live scheduler receives a reproducible, logged exploration decision
  and the study tests cover both the random and non-random paths. The 0.10 vs
  0.20 decision is therefore not only a documentation mismatch; currently
  neither value is evidenced in the live schedule path.

### 2026-10-15 — critical RCT fidelity gap: live scheduler ignores assigned arm

- Enrolment assigns and persists one of `sm2`, `hlr`, or `dart` in
  `Participant.condition`, and the review-write endpoint correctly stamps that
  condition on each log row.
- In contrast, `app/dashboard-new/study/page.tsx` always calls
  `/api/dart/schedule`. The request contains no assigned arm and the endpoint
  does not authenticate a participant token or look up `Participant.condition`;
  it always invokes the DART scheduling implementation.
- **Do-not-enrol gate:** Running the current session flow would label logs as
  three arms while serving the DART route to all of them. This invalidates the
  randomized comparison. Before pilot or enrolment, implement a server-side,
  authenticated research schedule endpoint that obtains the participant's
  stored condition and dispatches SM-2, HLR, or DART accordingly; return only
  an opaque, condition-blind task response; persist a verifiable scheduler
  version/decision; and add integration tests proving one distinct dispatch
  path per arm.

### 2026-10-15 — critical RCT integrity gap: unsafe client-side fallback

- The study page sends the participant's signed token as `userId` to the
  legacy `/api/dart/schedule` endpoint. That endpoint queries `Vocabulary` by
  its own application user identifier, not by participant token, so a real
  research participant can receive a not-found/error response.
- On any scheduling or network error the page fabricates a default task, then
  allows it to be submitted to `/api/research/review`. The research write path
  can therefore receive a row that has no server-authoritative scheduling
  decision.
- **Do-not-enrol gate:** The new authenticated research scheduling endpoint
  must fail closed. A task can be shown/submitted only with a short-lived,
  server-issued decision receipt binding participant, vocabulary, arm,
  retrieval type, feature vector, scheduler version, and weights version.
  The review endpoint must validate and consume that receipt once. Offline
  queues may retry an already-issued receipt but must never invent or replace a
  study task client-side.

### 2026-10-16 — authenticated arm dispatch and receipt-gated review: PASS (scope bounded)\n\n- Published on main: authenticated scheduler endpoint 9a6d8933f75339c6f142eb468f2bc4da5b3c0735 and its endpoint test af5299e591b9a887c5efdd68af5b5b54ef7e0927; participant UI integration e6702e9680b8dacad7e057dadfff6166c416dbac; receipt-enforced review fdd3edaf321222c310571f509ac2d427a94c5abf; review regression update 1b965de3ff120f1a73974407570a63e1845a8878.\n- POST /api/research/schedule authenticates the participant, reads its stored condition, computes history-derived features server-side, selects the retrieval type server-side, generates the task, persists a signed expiring receipt, and sends an opaque response without arm, scheduler-version, or weights-version fields. The client supplies only a word-bank id.\n- The study UI now requests that endpoint for an authenticated participant. If it cannot obtain a valid issued task, it stops instead of fabricating a fallback; preview mode remains separate and cannot submit an authenticated research decision.\n- POST /api/research/review now requires a valid decision receipt. It checks the issued prompt hash and stored arm, atomically marks the receipt consumed, and writes vocabulary, word, retrieval type, feature vector, versions, and scheduled time from the receipt rather than client echo. Repeated clientEventId retries are checked before consumption and remain idempotent.\n- Verification command: node ./node_modules/jest/bin/jest.js __tests__/researchScheduleRoute.test.ts __tests__/researchReviewRoute.test.ts __tests__/researchDecisionReceipt.test.ts __tests__/researchSm2State.test.ts --runInBand --verbose. Result: PASS, 4 suites / 18 tests. The schedule test verifies stored-arm dispatch and response redaction; the review test verifies forged/missing receipt rejection, idempotency, and client scheduler-field override prevention. Isolated study-page transpilation reported study_page_syntax=pass.\n- **Scope limit / remaining do-not-enrol gate:** receipt creation and consumption are now wired, but the review transaction does not yet transition ResearchSm2State, and no due-time policy or production/staging MongoDB integration test has run. The receipt record is atomic by itself; the combined receipt-consumption, log-write, and SM-2-state transition still needs a transaction/optimistic-concurrency implementation plus integration tests before enrolment.\n### 2026-10-15 — critical baseline fidelity gap: SM-2 state is unavailable

- The live research write path intentionally does not mutate application
  `Vocabulary` state, and `ReviewLog` does not store per-item SM-2 ease factor,
  interval, or repetition count. The study UI supplies binary recall, not the
  0–5 quality input expected by the existing SM-2 implementation.
- A condition-dispatch endpoint therefore cannot truthfully run the current
  SM-2 baseline from the research log alone. Reconstructing it ad hoc would
  create an undocumented, non-standard baseline and compromise the RCT.
- **Do-not-enrol gate:** Specify and version a research-owned scheduler state
  model (or a fully pre-registered deterministic reconstruction), including
  the mapping from task response to SM-2 quality, all initial values, and the
  update transaction. Then add state-transition fixtures and parity tests
  before enabling any participant session.

### 2026-10-16 — self-rated SM-2 quality: first implementation slice PASS (scope bounded)

- The research lead granted autonomous execution in this chat. The working pre-data implementation choice is **A**: collect a participant self-rating from 0 to 5 after every objectively graded retrieval response. This is an implementation decision only; it is not an IRB approval, OSF registration, published preregistration, or evidence of any participant session.
- Published on `main`: study UI change `f69565f1bedb6d6b41022163439d0edfc8842f61`, research-review validation `ad0edd09bf18dcd53b9bd1937c14a7624f687627`, and the regression test `7503d6ebbdbb8e92a9e0cf4fa9230157f461bcad`.
- The study page now grades the response to immutable binary `recall`, then requires a 0–5 self-rating before it writes the event to IndexedDB or submits it. The prompt is condition-blind and identical for all study arms. It no longer defaults an outcome quality from the legacy scheduler request.
- `POST /api/research/review` now requires `quality` and rejects non-integer values outside 0–5. The route persists that value alongside the objective recall; a missing value can no longer become an ambiguous SM-2 log row.
- Verification command: `node .\\node_modules\\jest\\bin\\jest.js __tests__/researchReviewRoute.test.ts --runInBand --verbose`. Result: PASS, 1 suite / 11 tests, including missing, out-of-range, and fractional quality rejection. Isolated syntax check command: `node -e "... ts.transpileModule(... app/dashboard-new/study/page.tsx ...) ..."`; result: `study_page_syntax=pass`.
- **Scope limit / remaining gate:** this slice does not yet create research-owned SM-2 state, a server-side arm dispatcher, or a signed one-time decision receipt. It does not make the existing client scheduling fallback safe, and it does not clear the do-not-enrol gate.

### 2026-10-16 — research-owned SM-2 state and signed-receipt foundations: PASS (not yet wired)

- Published on main: research SM-2 transition utility c867a3e731e2234c7d87c7c2f416b1835dc7c26a, MongoDB state model 20efb9374f0290becdcd67b264fc6513055582da, state tests c16f0ed7ed44505394c6dcf7f1eaf4b87bf68555; receipt HMAC utility b0fbb2b86725d6ffcc3c0cdb31555de0582f5dc2, receipt model 5ebd867060403ab634abe725f4a577941fbfbc4c, and receipt tests ae293258483173fb2d4a79a29411110efa2fa761.
- ResearchSm2State is a separate participant-word collection with initial values (ease factor 2.5, interval one day, repetitions zero), state version sm2-self-rating-v1, and a unique participant-word index. The pure transition utility accepts only integer quality values 0–5 and uses the existing SM-2 transition rule.
- A decision receipt now has an opaque random identifier, an HMAC signature derived from the required research salt, a 20-minute expiry, and server-side fields for participant, word, true arm, retrieval type, feature vector, scheduler/weights versions, prompt hash, and consumption state. The wire token does not expose those fields.
- Migration commit df448f9ec434f71ad4a4357f40b4170e0d535b15 adds indexes for the two new collections. Verification command: node --check research/create_indexes.js; result: exit 0. The migration was not run because the isolated research database remains unconfigured.
- Verification command: node ./node_modules/jest/bin/jest.js __tests__/researchDecisionReceipt.test.ts __tests__/researchSm2State.test.ts __tests__/researchReviewRoute.test.ts --runInBand --verbose. Result: PASS, 3 suites / 17 tests. Tests cover state initialization/transition validation, receipt signature tampering, and the existing review route quality validation.
- **Scope limit / next gate:** neither foundation is yet connected to a participant-authenticated scheduling endpoint or to receipt consumption in the review transaction. The live study page can therefore not be considered safe to enrol; server-side arm dispatch, receipt issue/consume integration, atomic state updates, and endpoint integration tests remain required.
### 2026-10-16 — study UI currently records binary recall, not SM-2 quality

- Static source audit at code commit `3bf1520960a5d3f638140f0193a2936f6f013d29` inspected `app/dashboard-new/study/page.tsx` and `app/api/research/review/route.ts`. The audit command was `rg -n -C 5 "quality|/api/vocabulary-review|recall|submit|handle.*Review|onReview" app\\dashboard-new\\study\\page.tsx`, followed by targeted source reads.
- In `fetchNextTask()`, the study page sends a hard-coded `quality: 4` only to the legacy `/api/dart/schedule` request. In `handleAnswer()`, it grades the answer to binary `recall` and submits that value to `/api/research/review`; `PendingSubmission` has no quality field. The research review route accepts `quality?` as optional and persists it if supplied, but it does not derive, require, or version a 0–5 value.
- **Finding:** the live study path neither collects learner self-ratings (option A) nor implements a deterministic, versioned binary-to-quality mapping (option B). The hard-coded scheduling value is not an observed review outcome and must not be treated as SM-2 input.
- **Do-not-enrol gate:** the protocol owner must choose A or B, freeze the scale/mapping and initial state, then implement a condition-blind UI plus authenticated server-side state transitions and fixtures. This finding reinforces the existing SM-2 baseline-fidelity gate; it does not create a protocol choice or a participant result.

### 2026-10-16 — SM-2 decision packet: numeric mapping changes later schedules

- Static source reads at code commit `3bf1520960a5d3f638140f0193a2936f6f013d29` verified that `lib/spacedRepetition.ts::calculateNextReview()` stores and updates `easeFactor`, `interval`, and `repetitions`. The legacy `Vocabulary` defaults are ease factor 2.5, interval 1 day, and zero repetitions, but the research review path intentionally does not mutate that application state.
- The implementation resets repetitions and sets interval to one day for quality below 3. A quality of 3, 4, or 5 advances repetitions, but updates ease factor by different amounts; therefore a binary-to-quality choice changes later SM-2 intervals even where the first successful interval is the same.
- **Decision A:** collect a learner-selected 0–5 quality value after the objectively graded response, persist it with the immutable review event, and pre-specify whether every blinded arm receives the same rating interaction. **Decision B:** freeze an explicit mapping for both recall outcomes (including its version and rationale), and persist the derived quality plus the original binary recall. Neither option has been selected or implemented.
- **Required implementation after a choice:** add research-owned state keyed to the participant and vocabulary, atomically apply the frozen initial values and update rule on a valid server receipt, and add fixtures covering every accepted quality/mapping outcome, retries, and concurrent submissions. This is a protocol/engineering decision packet, not a claim that any participant schedule has run.

### 2026-10-15 — synthetic analysis-pipeline smoke test: PASS (test-only)

- Environment: standard CPython 3.12 virtual environment with the versions in
  `research/requirements.txt` installed successfully.
- Commands completed with seed `20261015`:
  - `research/synth_logs.py --learners 60 --weeks 8 --seed 20261015`
  - `research/fit_dart.py --source jsonl ... --boot 20 --seed 20261015`
- The generated log contained 85,621 synthetic review rows across 60 synthetic
  learners. Fitting completed with cluster bootstrap, five learner-level folds,
  DeLong comparison, Brier score, and calibration output written successfully.
- **Interpretation:** PASS demonstrates that the local analysis code path runs.
  The generator embeds `alpha_true = 0.45`; therefore neither fitted α, its
  confidence interval, p-values, AUC, nor calibration values are study findings
  or permitted manuscript results.

### 2026-10-15 — existing unit-test baseline: PASS, but scope is insufficient

- After `npm ci --ignore-scripts`, the following suites passed under Jest in
  band: `__tests__/baselines.test.ts`, `__tests__/dart.test.ts`, and
  `__tests__/researchReviewRoute.test.ts` (27 tests total).
- These results cover isolated SM-2/HLR/DART computations, random assignment,
  and review-write validation. They do **not** exercise participant-authenticated
  schedule dispatch, arm-specific serving, server decision receipts, or the
  unsafe client fallback identified above. Passing tests do not clear the RCT
  scheduler gate.

### 2026-10-15 — full TypeScript verification: blocked by unrelated syntax errors

- `npx tsc --noEmit` did not reach research scheduling code because the current
  repository has parser errors in `components/MediaLearningEnhanced.tsx`,
  `components/SmartDocumentExtractor.tsx`, and `hooks/useErrorHandler.ts`
  (unclosed JSX / JSX parsed in a `.ts` file).
- These files were not changed by this workflow and are outside the RCT
  scheduler scope. Targeted scheduler/review tests passed, but a clean global
  type check remains unavailable until the repository-wide syntax errors are
  repaired independently.

### 2026-10-16 — Type-I runner does not implement the pre-registered test

- The running `research/power_analysis.py` Type-I job calls
  `dart_model.lrt_alpha()` within `one_replicate()`. That is the legacy
  row-IID asymptotic boundary LRT, not a clustered procedure.
- The same repository explicitly marks that function anti-conservative for
  clustered `ReviewLog` data, and the current pre-registration instead names
  `lrt_alpha_cluster_bootstrap` as the RQ1 primary test. The documented
  historical diagnostic is Type-I approximately 0.146 at the study setting,
  versus 0.05 nominal.
- **Classification:** even if this job completes normally, it is a regression
  diagnostic for the legacy test only. It cannot validate Type-I control for
  the confirmatory analysis and its numerical output must not be reported as a
  study finding or a release gate pass.
- **Do-not-enrol gate:** implement and version a Type-I simulation runner that
  applies the frozen cluster-bootstrap RQ1 test (including its null-generation
  procedure), then retain its command, seed range, environment, and output
  alongside the analysis archive before recruitment.

**Completed diagnostic (not a confirmatory test):** The legacy runner completed
with `--grid 60,180 --alpha-true 0 --reps 200 --seed0 20261015`. It rejected
the null in 32/200 replicates at N=60 (0.160; Monte-Carlo SE about 0.026) and
23/200 at N=180 (0.115; Monte-Carlo SE about 0.023). Both observed rates exceed
the repository's 0.10 anti-conservatism alert threshold. This is reproducible
operating-characteristic evidence that the obsolete row-IID LRT remains
miscalibrated; it is not participant data, a paper finding, or evidence that
the pre-registered clustered RQ1 test is valid.

### 2026-10-16 — confirmatory RQ1 analysis is not wired to its amendment

- `research/fit_dart.py` computes and exports `p_boundary` from
  `dart_model.lrt_alpha()` and labels it "report THIS one". The primary analysis
  command therefore continues to use the row-IID asymptotic LRT which Amendment
  #A-001 replaced because it is anti-conservative under learner clustering.
- `dart_model.lrt_alpha_cluster_bootstrap()` exists, but repository search
  found no call from `fit_dart.py`. Its current implementation case-resamples
  the observed learners and compares those LR values to the observed LR. The
  adjacent prototype itself notes that such resampling is only a null
  diagnostic when the data were generated with `alpha_true = 0`; under a real
  alternative it preserves signal and is not a generated null distribution.
- **Do-not-claim / do-not-enrol gate:** Do not run or report the current
  `fit_dart.py` p-value as the preregistered RQ1 test. Before recruitment,
  obtain a statistician-approved, frozen null procedure (for example a
  restricted-model parametric or residual cluster bootstrap), implement it in
  the production analysis command, and test its Type-I error and power with
  reproducible seeds. Because this changes the practical inferential procedure,
  record a dated amendment before viewing pilot data.

**Method note for the statistician (literature review, not a protocol change):**
The replacement procedure must generate each bootstrap data set under the
restricted/null model, not simply resample observed learners under a possible
alternative. This distinction is consistent with parametric-bootstrap LRT work
on boundary hypotheses (Drton & Williams, 2011,
https://doi.org/10.1093/biomet/asr021) and cluster-inference guidance that
emphasises imposing the null in bootstrap testing (Cameron & Miller, 2015,
https://cameron.econ.ucdavis.edu/research/Cameron_Miller_JHR_2015.pdf). The
specific null generator, treatment of learner-level dependence, bootstrap
count, and p-value convention require statistician approval and a dated
pre-data amendment; this note deliberately does not select them.

**RQ1 statistician handoff packet (decision required):**

| Item | Verified project fact | Decision/evidence requested |
| --- | --- | --- |
| Estimand | RQ1 tests DART's constrained `α ≥ 0` against nested HLR `α = 0`; rows are repeated within `userId`. | Confirm the null and alternative definitions and whether the one-sided boundary constraint is retained. |
| Current failure | Legacy row-IID LRT gave Type-I 0.160 (N=60) and 0.115 (N=180) in 200 null simulations. | Confirm that this test is retired from every confirmatory report. |
| Null generator | The existing case-resample implementation resamples observed learners and is not a null generator under an alternative. | Specify a restricted-model parametric/residual/other cluster-valid bootstrap, including which participant-level features and retrieval histories are generated or conditioned on. |
| Calibration | There are roughly 60 planned learner clusters; no real participant data are available. | Set bootstrap count, seed policy, p-value formula, minimum valid replicates, and Type-I/power acceptance thresholds before data collection. |
| Reproducibility | `research/fit_dart.py` currently exports the obsolete `lrt_alpha` p-value. | Provide signed/dated pseudocode or code review criteria; then replace the production path and archive a null simulation plus power report. |

The required return artifact is a dated statistical-method approval (or written
rejection with replacement plan), followed by a preregistration amendment
before pilot data are viewed.

### 2026-10-16 — isolated research database gate: blocked (verified)

- Command run from the repository root: `node research/verify_env.js`.
- Result: the verifier stopped before any database connection because
  `.env.research` is absent. It requires `RESEARCH_MONGO_URI`,
  `RESEARCH_MONGO_DB`, and `RESEARCH_SALT`; no secret values were requested,
  read, written, or logged.
- **Next owner action:** configure those values locally for an isolated research
  database (not the production/application database), then rerun the verifier,
  index-creation script, and a disposable-database backup/restore drill. This
  is an operational prerequisite, not a paper result.

**Safe setup aid added:** `research.env.example` is a tracked, secret-free
template for the required isolated-MongoDB values and optional all-or-none
Upstash pair. Copy it to the ignored `.env.research`, replace every placeholder
locally, then run `node research/verify_env.js`. The template contains no
credential and does not create a database connection.

**Configuration consistency remediation:** Decision D-008 specifies a MongoDB
research queue, but `verify_env.js` had warned that absent Upstash would block
that queue; it also checked only `UPSTASH_REDIS_REST_*` while another client
uses `UPSTASH_REDIS_*`. The verifier now states that Upstash is optional for
the research queue and recognises either complete naming pair if configured.
The secret-free template no longer suggests Upstash as a required research
setup value. `node --check research/verify_env.js` passed; running the verifier
without `.env.research` still correctly exits 1 before any connection attempt.

### 2026-10-16 — participant-facing arm-blinding unit check: PASS (narrow)

- Command: `npx jest __tests__/experimentBlinding.test.ts --runInBand`.
- Result: 1 suite / 11 tests passed. The tested functions map the three arms to
  opaque labels, remove telltale keys/values from client payloads, and redact
  arm names from judge prompts.
- **Scope limit:** this validates the pure blinding utilities only. It does not
  prove that the live scheduler authenticates a participant, dispatches the
  stored arm, or never returns an arm-revealing response. The RCT scheduler
  gate remains open until those endpoint-level tests pass.

### 2026-10-16 — posttest form allowlist: remediated and verified

- Finding: `GET /api/research/posttest/items?form=<unknown>` silently served
  the immediate-posttest item set. This could mask a caller error and return a
  wrong instrument form.
- Change: the route now accepts only `immediate` or `delayed`; every other
  value returns HTTP 400 with `Invalid posttest form`. The route test was
  changed from pinning the fail-open behaviour to asserting the rejection.
- Verification: `npx jest __tests__/researchPosttestItemsRoute.test.ts
  --runInBand` passed (1 suite, 5 tests). This is an instrument-integrity fix;
  it does not clear the scheduler, database, consent/IRB, or RQ1 inference
  gates.

### 2026-10-16 — research regression set: PASS (scope bounded)

- Command: `npx jest` over participant auth, enrolment, pretest scoring, review
  logging, posttest items/builder, arm blinding, baselines, and DART inference,
  with `--runInBand`.
- Result: 9 suites / 124 tests passed. The observed `console.error` is the
  expected mock of a MongoDB persistence failure in the pretest route test;
  that test asserts `persisted=false` rather than treating the output as an
  unhandled failure.
- **Scope limit:** these are mocked/unit-route checks. They do not exercise a
  configured research database, real participant sessions, live arm dispatch,
  scheduler receipts, IRB/consent operations, or the corrected RQ1 inference
  procedure.

### 2026-10-16 — pilot-readiness runner: repaired and executed (BLOCKED)

- `research/pilot_readiness.py` was made safe for the documented research
  configuration: it reads local `.env.research` without mutating process
  environment, prioritises `RESEARCH_MONGO_*`, selects `RESEARCH_MONGO_DB`,
  and refuses the production `viettalk` database. Windows handling was repaired
  for UTF-8 console output and `npx.cmd`; subprocess output is decoded as UTF-8
  with replacement so a test failure is reported rather than crashing.
- Its Jest gate is now explicitly a 10-suite RCT regression set (auth,
  enrolment, research endpoints, posttest, blinding, baselines, DART, and judge
  queue), not a misleading claim that all application tests pass. The full
  application Jest run remains separately unhealthy: 23 suites / 345 tests
  passed, while `sentenceContextSelector` had 7 expectation failures and
  `async-upload` could not resolve `server-only` in Jest. Those are not used to
  clear any RCT gate.
- Command: `py -3.12 research/pilot_readiness.py` (no secret environment was
  provided). Result: the 10 requested research suites passed, but the runner
  exited 1 with five expected critical failures: missing research salt/URI,
  consequent skipped HMAC and MongoDB checks, and the existing repository-wide
  TypeScript parser errors. It also warned that the local familiarity artifact
  reports only 1 screener; that file is not treated as evidence of a completed
  H5 screen without a configured research database and an operational record.
- **Do-not-enrol gate:** configure and verify the isolated database, resolve or
  formally isolate the global TypeScript parser errors for deployment, complete
  H5 and governance gates, and repair the RCT scheduler/RQ1 inference gates
  already listed above. The runner is now an evidence-producing preflight, not
  an approval shortcut.

### 2026-10-16 — one TypeScript parser fault removed; two truncated components remain

- The parser fault in `hooks/useErrorHandler.ts` was mechanical: it contained
  JSX despite the `.ts` extension. The file was moved unchanged to
  `hooks/useErrorHandler.tsx`. Repository search found no source imports of the
  hook or its `ErrorBanner` export, so the extension correction preserves its
  public module resolution while allowing TypeScript to parse its JSX.
- Verification command: `npx tsc --noEmit`. The `useErrorHandler` parser error
  is gone. The command still exits 1 solely with parser diagnostics in
  `components/MediaLearningEnhanced.tsx` (line 21) and
  `components/SmartDocumentExtractor.tsx` (lines 253, 254, 296, and 331).
- Both remaining files are clean in the worktree and their checked-in source is
  structurally truncated; repository search found no source imports. No
  semantics-preserving repair can be verified from the remaining text, so they
  were not deleted, stubbed, or reconstructed. A maintainer must either recover
  their intended source or explicitly authorize their retirement/rebuild before
  the repository-wide TypeScript deployment gate can pass.
- **Scope limit:** this fixes one build-health defect only. It does not clear
  any RCT scheduler, research database, governance, or confirmatory-inference
  gate.

- Published on `main`: report triage commit `f5a0437edff3fd0f55945dca0d715b5aace734dd`,
  creation of the TSX module `b6039124d497d82ca6187b666203448cfb9300da`, and removal
  of the superseded TS module `7294a8822199afb515054065713b4b765ed69ab9`.
  A fresh `npx tsc --noEmit` after those commits produced only the two
  remaining truncated-component parser diagnostics listed above.

- Recovery check: a read-only archive-entry search using
  `[System.IO.Compression.ZipFile]::OpenRead('D:\\WOKI for KIRO.zip')` with the
  filename pattern `MediaLearningEnhanced|SmartDocumentExtractor|useErrorHandler`
  found no matching source file. The archive was not extracted and its contents
  were not used; it cannot supply a verified restoration for the two components.

### 2026-10-16 — Google Docs protocol status corrected (verified scope)

- Target: the `Main Paper` Google Doc
  (`1uZX1bOseNpjnh3HSGGUTjwCUR8BSGpXyP1B0XQrhi-c`, tab `t.0`). A revision-guarded
  `documents.batchUpdate` replaced the obsolete projected pilot/main-study
  dates in its status paragraph with a current execution-scope statement.
- The revised text says that no IRB approval, OSF registration, isolated
  research-database configuration, participant data, pilot, or main study has
  been **verified in the current execution environment**; it retains
  `[TBD]` for effect-size, precision, and inference values and labels any
  simulation output as design justification only.
- Readback at document indexes 890–1345 confirmed the new paragraph and
  preserved the adjacent corresponding-author paragraph. No research result,
  participant record, external approval, or manuscript conclusion was added or
  changed.
- **Scope limit:** this is an integrity/status correction in a pre-data protocol,
  not evidence that the external actions did or did not occur elsewhere. Those
  gates still require their own operational records.

### 2026-10-16 — source roadmap spreadsheet is a historical plan, not operational evidence

- Read-only inspection of spreadsheet `PAPER`, visible tabs `ROADMAP` and
  `TIMELINE`, bounded ranges `ROADMAP!A1:W80` and `TIMELINE!A1:Z50`, found
  several historical “Đã hoàn thành” labels for design freeze, IRB,
  preregistration, and `.env.research`.
- The same `ROADMAP` rows carry a later checkout-verification column that says
  “Cần chứng từ”, “Ngoài repo - chưa xác minh”, or “Một phần - thiếu cấu hình”;
  for the research environment it explicitly states that `.env.research` does
  not exist and the safe verifier fails. The sheet's own evidence column
  therefore does not support treating the historical completion labels as proof.
- `TIMELINE` contains calendar milestones in August–September 2026 marked
  complete or pending. With no independently verified pilot, data, governance,
  or research-database record in this execution, those dates remain a planning
  snapshot—not evidence that a study occurred or completed.
- **Action:** preserve the supplied sheet as a source/history. Re-baseline any
  live execution tracker only from fresh artifacts: an approval identifier,
  published preregistration URL, non-secret verifier output, isolated-database
  drill evidence, frozen scheduler/inference verification, and controlled-pilot
  records. Do not overwrite historical plan rows to manufacture completion.

### 2026-10-16 — separate verified execution tracker created

- A new Google Sheets tracker was created without changing the supplied
  historical `PAPER` workbook:
  `DART Research Execution Tracker — Verified 2026-10-16`
  (spreadsheet ID `1r61rjvL_1aFe4nhcez1wxCivJQMxTnO-Qc9fR3w25ko`).
- It contains nine ordered research gates with owner, verified evidence, next
  concrete action, and blocking dependency. Its header explicitly says
  “BLOCKED — do not enrol” and distinguishes code/simulation evidence from
  external approvals and study results.
- Import verification confirmed a native `DartExecutionTasks` table at
  `Execution Tracker!A7:G16`, frozen rows, the preserved status validation
  list, and all nine seeded records. The source tracker is therefore a live
  evidence-oriented checklist, not a retrospective claim that the listed work
  completed.
- Local XLSX inspection found no formula-error token and its rendered preview
  was readable. Native browser visual inspection was unavailable in this run
  because the Windows UI helper failed during initialization; the API metadata
  confirms structure and validation but does not substitute for a future
  normal-zoom Google Sheets visual check.
- **Scope limit:** no external approval, database, participant, pilot, or study
  result was created by this tracker.

### 2026-10-16 — manuscript title and abstract no longer overclaim registration/inference

- In the `Main Paper` Google Doc, a revision-guarded edit changed the title from
  “Protocol for a Pre-Registered…” to “Protocol for a Planned…”.
- The Abstract now says the RCT is planned; it says the primary tests and
  procedures **will** be finalized and preregistered before data collection and
  that the draft makes no claim of a completed registration.
- It also replaced the unsupported claim that Amendment #A-001 was signed and
  a cluster-bootstrap test had already become primary with the verified current
  state: the legacy row-IID boundary test can be anti-conservative for clustered
  logs, and a confirmatory RQ1 null-generation/bootstrap procedure still needs
  statistician approval, production wiring, and a dated pre-data amendment.
- Readback confirmed the revised title and Abstract text. No participant result,
  IRB approval, OSF record, amendment signature, or statistical method was
  invented by this correction.

### 2026-10-16 — protocol manuscript integrity sweep completed

- A revision-guarded Google Docs pass replaced 12 additional unsupported or stale
  protocol assertions while preserving the scientific questions and planned
  three-arm design. The text no longer claims that the study is already
  preregistered, that H5 was completed with 20 learners, that a word bank is
  frozen, that OSF was submitted, or that Amendment #A-001 was signed.
- The design sections now distinguish Decision D-014’s ε=.20 exploration target
  from live implementation: the study scheduler has not yet wired or logged the
  exploration decision, so it remains a do-not-enrol engineering gate.
- RQ1 sections now distinguish the verified legacy row-IID diagnostic
  (anti-conservative in clustered synthetic simulations) from the absent
  confirmatory procedure. They require a statistician-approved clustered null
  generator, production wiring, calibration, and a dated pre-data amendment.
  The Abstract’s RQ1 parenthetical was made consistent with that state.
- Readback confirmed the new Abstract RQ1 wording and the revised protocol
  paragraphs. These changes do not create a statistical method, governance
  record, implementation, participant, or result; they prevent the manuscript
  from claiming one without evidence.

### 2026-10-16 — manuscript reference placeholders removed

- A source-verification pass could not substantiate five bibliography entries that
  were explicitly marked `[TBD]` (Cheng et al. 2022; Nguyen & Godfroid 2020;
  Pham & Nguyen 2024; Traxler et al. 2024; and Ye et al. 2022). They were
  removed rather than converted into speculative citations.
- Three narrative paragraphs that depended directly on those placeholders were
  rewritten to retain only the supported general framing and the existing
  completed citations. No effect-size, usage-rate, curriculum-coverage, or
  neural-model claim was retained without a verifiable reference.
- Readback found no remaining placeholder author/reference citation. The sole
  remaining `[TBD]` is the protocol-status placeholder for future real-study
  effect sizes, precision, and inference values, which is appropriate before
  data collection.
- **Scope limit:** citation cleanup does not validate the existing retained
  bibliography wholesale; a journal-specific reference/style audit is still
  required before submission.

### 2026-10-15 — initial environment audit

- Python 3.12.12 and Node v24.14.0 are available in the execution environment.
- No `.env.research`, Python virtual environment, or Node dependencies were present
  in the isolated clone. No secrets were read or created.
- Repository HEAD inspected: `3bf1520960a5d3f638140f0193a2936f6f013d29`.
- The repository status matrix is dated 2026-08-09 and is not treated as current
  operational evidence.
- The first Python executable on `PATH` is bundled with Inkscape and cannot use
  the pinned scientific-package wheels. A standard CPython 3.12 virtual
  environment is being used for research checks instead.

## Constraints

- Synthetic logs and simulations validate code paths and statistical operating
  characteristics; they are never study results.
- Codex cannot obtain IRB approval, recruit/consent participants, create an OSF
  registration on the researcher's behalf without account access, or invent database
  credentials.
- Future updates must record the exact command, commit, date, result, and any
  unresolved risk.

### 2026-10-17 — server-scored review and atomic SM-2 write path: PASS (unit/static scope only)

- Published commits: `88278d` (transactional review route), `6a63d33` (active task lease and SM-2 due check), `aea3366` (client no longer receives the answer key for authenticated study tasks), `cbcfa52` (research word-bank IDs accepted by `ReviewLog`), `bcc21e7` (required partial unique active-task index), `20886fd` / `bcad91c` (server scoring and transaction helper), and associated tests through `baa527a`.
- Verified command: `node .\\node_modules\\jest\\bin\\jest.js __tests__/researchScheduleRoute.test.ts __tests__/researchReviewRoute.test.ts __tests__/researchDecisionReceipt.test.ts __tests__/researchSm2State.test.ts __tests__/researchAnswerScoring.test.ts __tests__/researchTransaction.test.ts __tests__/researchReviewLogSchema.test.ts --runInBand --verbose` — PASS: 7 suites / 25 tests.
- Verified syntax command over the changed route, UI, model, and helper files — PASS. Full `tsc --noEmit` remains blocked only by the pre-existing malformed `components/MediaLearningEnhanced.tsx` and `components/SmartDocumentExtractor.tsx`; it did not report a DART-path error.
- The review endpoint now derives `recall` from `answerText` server-side, keeps the answer key out of authenticated schedule responses until after a committed response, and ties receipt consumption, ReviewLog creation, SM-2 state transition, and participant counter update to one MongoDB transaction. The first SM-2 state transition is covered by the route test. The scheduler enforces one active receipt per participant-word with a partial unique index and respects persisted SM-2 due dates.
- Limits/risk: this is mocked/unit and static verification only. No isolated research MongoDB, index migration, transaction-capable staging replica set, endpoint integration test, participant, or study result was verified. HLR/DART timing-state implementation remains a separate blocker; this change must not be represented as a live three-arm timing intervention.
- Next blocker: configure the isolated research database locally (without sharing credentials), run `node research/verify_env.js` and `node research/create_indexes.js`, then perform a staging transaction rollback/commit and endpoint integration check before any enrolment.

### 2026-10-17 — HLR/DART timing state: PASS (unit/static scope only)

- Published commits: `df1c6a6` (review transaction persists adaptive timing state), `fb21fa1` (due-date enforcement for all three arms), `ae209d8` (timing-state indexes), `67959bd` / `6620c76` (model and pure timing transition), and `53354a7` (timing-state tests).
- Verified command: `node .\\node_modules\\jest\\bin\\jest.js __tests__/researchScheduleRoute.test.ts __tests__/researchReviewRoute.test.ts __tests__/researchDecisionReceipt.test.ts __tests__/researchSm2State.test.ts __tests__/researchAnswerScoring.test.ts __tests__/researchTransaction.test.ts __tests__/researchReviewLogSchema.test.ts __tests__/researchTimingState.test.ts --runInBand --verbose` — PASS: 8 suites / 27 tests. Changed-file syntax checks also passed.
- HLR and DART now persist a distinct participant-word-condition timing state after the receipt, server-scored ReviewLog, and state transition are committed in the transaction. Scheduler requests reject a word that is not due for SM-2, HLR, or DART. HLR uses `alpha = 0`; DART uses the receipt's prior retrieval type in its timing calculation. This supersedes the prior report note that HLR/DART timing state was unimplemented.
- Limits/risk: no research database or staging deployment was available. The partial unique active-task index and timing-state indexes have not been migrated or exercised against a transaction-capable MongoDB replica set; no live endpoint integration, participant, enrolment, or study result is verified. The deterministic d=2/d=3 eligibility auto-score is not semantic LLM-Judge validation.
- Next blocker: configure the isolated research database locally (do not share credentials), run `node research/verify_env.js` and `node research/create_indexes.js`, then execute a staging commit/rollback and end-to-end authenticated schedule→review test before enrolment.

### 2026-10-17 — RQ1 inference safety gate and Python research environment: PASS (scope bounded)

- Published commits: `2bf1cdd` (fit output marks the IID LRT diagnostic-only and blocks confirmatory RQ1 inference), `1357aed` (power output marked diagnostic-only), `6feec7f` (research-runbook correction), `fca45ba` (test runner dependency), and `be5b940` (clustered-inference gate note).
- Verified environment action: created/reused an isolated local Python 3.12 venv under the task work directory and installed `research/requirements.txt`; no database connection or research secret was read.
- Verified commands: `python -m py_compile research\\fit_dart.py research\\power_analysis.py research\\dart_model.py`; test-only `synth_logs.py` + `fit_dart.py --folds 2 --boot 2`; a one-replicate `power_analysis.py` diagnostic; and `python -m pytest research\\test_dart_model.py -q` — PASS: 13 tests in 89.41 seconds.
- Verified finding: the existing `fit_dart.py` had printed the boundary-corrected IID LRT as reportable even though `dart_model.py` documents it as anti-conservative under learner clustering. The existing case-cluster bootstrap routine is not invoked by `fit_dart.py` and does not generate a restricted-null distribution. It is therefore not treated as an approved confirmatory test.
- Safeguard: output artifacts now carry `BLOCKED_PENDING_CLUSTERED_NULL_TEST`; IID LRT and power numbers are explicitly diagnostic-only. Synthetic output is test-only and is not study evidence.
- Next blocker: obtain a statistician-approved clustered-null RQ1 procedure (including boundary handling, small-cluster assumptions, and simulated Type-I calibration), implement and regression-test it before preregistration, power selection, or any primary RQ1 claim. This is independent of the still-missing isolated research database/staging verification.
