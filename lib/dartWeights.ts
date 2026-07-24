// lib/dartWeights.ts
// Load DART weights from disk (produced by python-api/train_dart.py).
// Server-side only. Caches in module scope with mtime-based invalidation so the
// first request after a fresh training picks up new params without a redeploy.

import fs from "fs";
import path from "path";
import { DartWeights, DEFAULT_DART_WEIGHTS } from "./dart";

const CANDIDATE_PATHS = [
  process.env.DART_WEIGHTS_PATH,
  path.join(process.cwd(), "dart_weights.json"),
  path.join(process.cwd(), "python-api", "dart_weights.json"),
  path.join(process.cwd(), "public", "dart_weights.json"),
].filter(Boolean) as string[];

let cache: { weights: DartWeights; source: string; mtimeMs: number } | null = null;

function readWeights(p: string): DartWeights | null {
  try {
    const raw = fs.readFileSync(p, "utf-8");
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed.theta) || typeof parsed.alpha !== "number") return null;
    return {
      theta: parsed.theta,
      alpha: parsed.alpha,
      featureNames: parsed.featureNames ?? DEFAULT_DART_WEIGHTS.featureNames,
      thresholds: parsed.thresholds ?? DEFAULT_DART_WEIGHTS.thresholds,
    };
  } catch {
    return null;
  }
}

/**
 * Returns the freshest DartWeights it can find. Falls back to
 * DEFAULT_DART_WEIGHTS when no file exists yet (cold start before first training).
 */
export function getDartWeights(): DartWeights {
  for (const p of CANDIDATE_PATHS) {
    try {
      const stat = fs.statSync(p);
      if (cache && cache.source === p && cache.mtimeMs === stat.mtimeMs) {
        return cache.weights;
      }
      const w = readWeights(p);
      if (w) {
        cache = { weights: w, source: p, mtimeMs: stat.mtimeMs };
        return w;
      }
    } catch {
      // path not found — try next
    }
  }
  return DEFAULT_DART_WEIGHTS;
}

/** Force a re-read (used by the admin refresh endpoint). */
export function invalidateDartWeights(): void {
  cache = null;
}

export function getDartWeightsMeta() {
  return cache
    ? { source: cache.source, mtimeMs: cache.mtimeMs, trained: true }
    : { source: null, mtimeMs: null, trained: false };
}
