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
| RQ1 inference | Cluster-bootstrap and DeLong code are present | No current real-log result | Confirm Type-I simulation and learner-level CV before preregistration |
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

### 2026-10-15 — critical baseline fidelity gap: SM-2 state is unavailable

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

