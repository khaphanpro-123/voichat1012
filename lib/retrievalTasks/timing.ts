// lib/retrievalTasks/timing.ts
//
// One place to define what "elapsedMs" means in the paper.
//
// Definition (frozen for the study):
//   elapsedMs = performance.now() delta from AFTER the task's DOM has painted
//               to the moment the learner clicks Submit or presses Enter.
//
// Why not from mount / from fetch: mount happens before layout, so any measure
// starting there includes browser layout time (varies by device). Fetch time is
// network — orthogonal to the cognitive act we care about.
//
// Client hook (browser):
//   const startRef = useTaskTimerStart();
//   // ...
//   const elapsedMs = markSubmit(startRef);
//
// Server never invokes these — they're strictly client. Kept isomorphic
// (no window refs at import time) so route.ts files can still import the
// module for shared constants.

/** Reasonable clamps to reject clock skew / afk noise before it hits Mongo. */
export const MIN_PLAUSIBLE_ELAPSED_MS = 200;     // faster than reflex ≈ mash button
export const MAX_PLAUSIBLE_ELAPSED_MS = 5 * 60 * 1000; // 5 min = afk

export function isPlausibleElapsed(ms: number): boolean {
  return (
    Number.isFinite(ms) &&
    ms >= MIN_PLAUSIBLE_ELAPSED_MS &&
    ms <= MAX_PLAUSIBLE_ELAPSED_MS
  );
}

/**
 * Winsorize an elapsedMs value into the plausible range. Use for analysis, not
 * for logging — the raw value goes to Mongo, cleaning happens downstream so we
 * can inspect the original.
 */
export function clampElapsed(ms: number): number {
  if (!Number.isFinite(ms)) return MAX_PLAUSIBLE_ELAPSED_MS;
  return Math.min(MAX_PLAUSIBLE_ELAPSED_MS, Math.max(MIN_PLAUSIBLE_ELAPSED_MS, ms));
}
