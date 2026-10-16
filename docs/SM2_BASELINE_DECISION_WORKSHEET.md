# SM-2 baseline decision worksheet

**Status:** decision aid only — no SM-2 protocol choice, participant data, IRB approval, or preregistration is asserted by this document.  
**Last code audit:** 2026-10-16 (Asia/Bangkok), source commit `3bf1520960a5d3f638140f0193a2936f6f013d29`.  
**Related execution report:** [DART research execution report](./DART_RESEARCH_EXECUTION_REPORT.md).

## Verified implementation facts

The existing `calculateNextReview()` implementation in `lib/spacedRepetition.ts` takes a numeric quality from 0 to 5 and updates three values:

| State | Legacy initial value | Why it matters |
| --- | ---: | --- |
| `easeFactor` | 2.5 | Varies by the exact numeric quality, changing later intervals |
| `interval` | 1 day | Is reset to one day for quality < 3 |
| `repetitions` | 0 | Is reset on quality < 3 and grows otherwise |

The current research study page grades responses as binary `recall` and sends that to `/api/research/review`. It does not collect a learner quality value. Its request to the legacy schedule endpoint contains a fixed `quality: 4`; that value is not an observed review outcome.

The research review endpoint accepts an optional `quality` field and writes it if supplied, but it does not require, derive, version, or use one to transition research-owned SM-2 state. The research endpoint deliberately does not mutate application `Vocabulary` state.

## One decision required

### A — Collect learner self-rating (recommended)

After the answer has been objectively graded, show a condition-blind 0–5 quality prompt. Store:

- immutable objective `recall` (0 or 1);
- selected `quality` (0–5);
- rating-scale version;
- server-authoritative scheduler decision and receipt;
- resulting SM-2 state transition.

Before enrolment, freeze the exact labels/anchors for every score 0–5, the moment at which the prompt is shown, whether all blinded arms see the same interaction, and handling for a missing/invalid rating.

**Benefit:** preserves a genuine 0–5 SM-2 input instead of converting an objectively graded response into an undocumented proxy.  
**Risk to control:** self-ratings may differ from automatic correctness; retain both values and pre-specify which drives SM-2.

### B — Use a deterministic binary-to-quality mapping

Do not ask for a self-rating. Freeze a complete versioned mapping:

| Objective recall | Frozen SM-2 quality | Rationale/version |
| --- | --- | --- |
| 0 | **[choose 0–2]** | **[required]** |
| 1 | **[choose 3–5]** | **[required]** |

Persist the original `recall`, derived `quality`, and mapping version on each event.

**Benefit:** no extra participant interaction and fully reproducible scheduling.  
**Risk to control:** this becomes a modified SM-2 baseline; the exact success score changes `easeFactor` and therefore later intervals, so it must be justified and frozen before data collection.

## Common implementation sequence after choosing A or B

1. Record a dated pre-data protocol decision with the scale/mapping, initial state, state key, and version.
2. Add a research-owned SM-2 state record keyed by participant and vocabulary. Do not reuse or mutate application `Vocabulary` state.
3. Implement an authenticated schedule decision that dispatches from the participant's stored arm and returns a signed, short-lived, one-time receipt.
4. On review, validate and consume that receipt, derive/validate the frozen quality, and atomically write the immutable review event plus next SM-2 state.
5. Keep the client condition-blind; it must not send the arm or create a fallback task/state transition.
6. Add fixtures for all accepted quality values or both mapping outcomes, initial state, repeat success, failure reset, duplicate retry, receipt expiry, and concurrent submissions.
7. Run endpoint integration tests and a staging dry run before any controlled pilot.

## Completion evidence for this gate

The SM-2 baseline gate is not complete until the following are retained:

- protocol decision/version and amendment record, if required;
- source code and tests demonstrating server-side stored-arm dispatch;
- state-transition fixtures and test output;
- staging export showing valid receipts, true arm logging, immutable quality/recall fields, and no client-fabricated task;
- confirmation that the isolated research database is configured and backed up.

No item in this worksheet authorizes participant enrolment by itself.
