// lib/researchVersion.ts
// Version + provenance stamps for research write path.
//
// Every /api/research/* write attaches:
//   - schedulerVersion  (bumped manually when scheduler logic changes)
//   - weightsVersion    (sha256[0..12] of the dart_weights.json currently loaded)
//
// This lets us slice the log later by weights snapshot and drop rows served by
// a buggy revision without losing everything else. See Ngày 9 of PLAN_45_DAYS.

import fs from "fs";
import path from "path";
import crypto from "crypto";

/** Bump manually when scheduler algorithm changes shape. */
export const SCHEDULER_VERSION = "dart@1.0.0";

const CANDIDATE_PATHS = [
  process.env.DART_WEIGHTS_PATH,
  path.join(process.cwd(), "dart_weights.json"),
  path.join(process.cwd(), "python-api", "dart_weights.json"),
  path.join(process.cwd(), "public", "dart_weights.json"),
].filter(Boolean) as string[];

let cache: { source: string; mtimeMs: number; sha: string } | null = null;

/**
 * sha256[0..12] of the currently-loaded dart_weights.json.
 * Returns "default" if no weights file present (cold start).
 * Mtime-cached: only rehash when file changes on disk.
 */
export function getWeightsVersion(): string {
  for (const p of CANDIDATE_PATHS) {
    try {
      const stat = fs.statSync(p);
      if (cache && cache.source === p && cache.mtimeMs === stat.mtimeMs) {
        return cache.sha;
      }
      const raw = fs.readFileSync(p);
      const sha = crypto.createHash("sha256").update(raw).digest("hex").slice(0, 12);
      cache = { source: p, mtimeMs: stat.mtimeMs, sha };
      return sha;
    } catch {
      // path not found — try next
    }
  }
  return "default";
}

/** sha256[0..12] of an arbitrary string, used for task prompt hashing. */
export function hashPrompt(prompt: string): string {
  return crypto.createHash("sha256").update(prompt, "utf-8").digest("hex").slice(0, 12);
}

/** Return `{schedulerVersion, weightsVersion}` — attach to every research write. */
export function getVersionStamp(): { schedulerVersion: string; weightsVersion: string } {
  return {
    schedulerVersion: SCHEDULER_VERSION,
    weightsVersion: getWeightsVersion(),
  };
}
