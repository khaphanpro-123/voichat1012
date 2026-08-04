// lib/experimentAssignment.ts
//
// Deterministic condition assignment for the RCT.
//
// CHANGED 2026-08: the live trial now uses THREE arms, not six.
//
// Why: six arms at the sample size we can realistically recruit gives ~10-30
// learners per arm. Detecting a medium effect (f = .25) in a six-group ANOVA at
// 80% power needs ~210 participants; below that the study is powered only for
// effects large enough to be implausible. Three arms concentrates the same
// recruits into cells big enough to say something.
//
// KARL, LECTOR and CARTS are still compared -- but OFFLINE, replayed on the logs
// the three live arms generate. That is a legitimate simulation comparison and
// costs no extra participants. See research/README.md.
//
// Set EXPERIMENT_ARMS in the environment to override (e.g. for a pilot).

import { SchedulerName } from "./baselines";

const FNV_OFFSET = 0x811c9dc5;
const FNV_PRIME = 0x01000193;

/** Arms served to real learners. Keep this list short and justified. */
export const LIVE_ARMS: SchedulerName[] = ["sm2", "hlr", "dart"];

/** Arms evaluated offline by replaying logs -- no participants needed. */
export const OFFLINE_ARMS: SchedulerName[] = ["karl", "lector", "carts"];

function activeArms(): SchedulerName[] {
  const raw = process.env.EXPERIMENT_ARMS;
  if (!raw) return LIVE_ARMS;
  const parsed = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean) as SchedulerName[];
  return parsed.length ? parsed : LIVE_ARMS;
}

function fnv1a(s: string): number {
  let h = FNV_OFFSET;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, FNV_PRIME);
  }
  return h >>> 0;
}

export interface Assignment {
  userId: string;
  condition: SchedulerName;
  stratum?: string; // CEFR band -- stratified randomisation
  arms: SchedulerName[];
  createdAt: string;
}

/**
 * Stable per-learner assignment.
 *
 * Stratified by CEFR band so the arms stay balanced on baseline proficiency --
 * the strongest single predictor of vocabulary gain. Including the stratum in
 * the hash salt means each band is randomised independently.
 *
 * Deterministic by design: the same learner resolves to the same arm on every
 * request, with no assignment table to keep in sync. The trade-off is that
 * allocation is only balanced *in expectation*. With N < 100 you can end up with
 * noticeably uneven cells, so check the actual counts after enrolment closes and
 * report them in the CONSORT flow diagram.
 */
export function assignCondition(userId: string, stratum?: string): Assignment {
  const arms = activeArms();
  const salt = stratum ? `${stratum}::${userId}` : userId;
  const bucket = fnv1a(salt) % arms.length;
  return {
    userId,
    condition: arms[bucket],
    stratum,
    arms,
    createdAt: new Date().toISOString(),
  };
}

/** Allocation counts for a cohort -- run this after enrolment closes. */
export function allocationSummary(
  learners: Array<{ userId: string; stratum?: string }>
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const arm of activeArms()) counts[arm] = 0;
  for (const l of learners) {
    const a = assignCondition(l.userId, l.stratum);
    counts[a.condition] = (counts[a.condition] ?? 0) + 1;
  }
  return counts;
}
