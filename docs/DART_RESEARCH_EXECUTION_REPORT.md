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

