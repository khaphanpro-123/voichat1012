// lib/researchVersion.ts
// Version + provenance stamps for research write path.
//
// Every /api/research/* write attaches:
//   - schedulerVersion  (bumped manually when scheduler logic changes)
//   - weightsVersion    (sha256[0..12] of the dart_weights.json currently loaded)
//
// This lets us slice the log later by weights snapshot and drop rows served by
// a buggy revision without losing everything else. See Ngày 9 of PLAN_45_DAYS.
//
// Cache correctness (fix for review risk #5): we do NOT hash the file ourselves.
// We ask `dartWeights.getDartWeightsMeta()` for the loaded file's source+mtime,
// and hash from that. This guarantees weightsVersion always describes the SAME
// bytes that the scheduler is using — no split-brain between two mtime caches.

import fs from "fs";
import crypto from "crypto";
import { getDartWeights, getDartWeightsMeta, invalidateDartWeights } from "./dartWeights";

/** Bump manually when scheduler algorithm changes shape. */
export const SCHEDULER_VERSION = "dart@1.0.0";

let shaCache: { source: string; mtimeMs: number; sha: string } | null = null;

/**
 * sha256[0..12] of the currently-loaded dart_weights.json.
 * Returns "default" if no weights file present (cold start).
 * Anchored to dartWeights' own cache so we can never disagree about which
 * file is live.
 */
export function getWeightsVersion(): string {
  // Force dartWeights to (re)load if needed — this populates its meta cache.
  getDartWeights();
  const meta = getDartWeightsMeta();
  if (!meta.trained || !meta.source || meta.mtimeMs == null) {
    return "default";
  }
  if (shaCache && shaCache.source === meta.source && shaCache.mtimeMs === meta.mtimeMs) {
    return shaCache.sha;
  }
  try {
    const raw = fs.readFileSync(meta.source);
    const sha = crypto.createHash("sha256").update(raw).digest("hex").slice(0, 12);
    shaCache = { source: meta.source, mtimeMs: meta.mtimeMs, sha };
    return sha;
  } catch {
    return "default";
  }
}

/** Invalidate both the weights cache AND the sha cache together. */
export function invalidateResearchVersion(): void {
  invalidateDartWeights();
  shaCache = null;
}

/** sha256[0..12] of an arbitrary string, used for task prompt hashing. */
export function hashPrompt(prompt: string): string {
  return crypto.createHash("sha256").update(prompt, "utf-8").digest("hex").slice(0, 12);
}

/**
 * Validate a client-supplied `weightsVersion` — must be either "default" or
 * exactly 12 lowercase hex chars. Prevents log injection through the field.
 */
export function isValidWeightsVersion(v: unknown): v is string {
  return typeof v === "string" && (v === "default" || /^[0-9a-f]{12}$/.test(v));
}

/** Return `{schedulerVersion, weightsVersion}` — attach to every research write. */
export function getVersionStamp(): { schedulerVersion: string; weightsVersion: string } {
  return {
    schedulerVersion: SCHEDULER_VERSION,
    weightsVersion: getWeightsVersion(),
  };
}
