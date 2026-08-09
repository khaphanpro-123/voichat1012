// lib/aiCache.ts
//
// Content-addressed cache for LLM responses. Backing store: MongoDB (via
// app/models/AICache.ts). Testable via injected deps.
//
// Two responsibilities kept clean:
//   1. Compute stable cache keys from prompt + relevant parameters.
//   2. get / set / hit-count.
//
// Wrapping callAI with cache lookup lives in lib/callAICached.ts.

import { createHash } from "crypto";
import type { Model } from "mongoose";
import DefaultAICache, { type IAICache } from "@/app/models/AICache";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CachedResponse {
  content: string;
  provider: "openai" | "groq" | "cohere";
  model: string;
}

export interface CacheKeyInput {
  /** The full prompt sent to the LLM. */
  prompt: string;
  /** Provider preference — different prefer values might route to different models. */
  preferProvider?: string;
  /** Temperature — determinism control. */
  temperature?: number;
  /** Max tokens — response cap. */
  maxTokens?: number;
  /**
   * Optional semantic namespace. Callers pass e.g. `context-transfer-judge` or
   * `retrieval-task-cloze-d1` so hash collisions across features are impossible
   * even if the prompts happen to overlap.
   */
  namespace?: string;
}

export interface CacheDeps {
  model?: Model<IAICache>;
  ttlMs?: number;  // default 7 days
  now?: () => Date;
}

const DEFAULT_TTL_MS = 7 * 24 * 60 * 60 * 1000;

// ─── Key computation ──────────────────────────────────────────────────────────

/**
 * Stable SHA-256 cache key. All inputs normalised (JSON.stringify) so that
 * insertion order or floating-point display don't cause misses.
 */
export function computeCacheKey(input: CacheKeyInput): string {
  const normalised = {
    p: input.prompt,
    pf: input.preferProvider ?? "auto",
    t: typeof input.temperature === "number" ? Number(input.temperature.toFixed(4)) : 0,
    m: input.maxTokens ?? 0,
    ns: input.namespace ?? "",
  };
  return createHash("sha256").update(JSON.stringify(normalised)).digest("hex");
}

// ─── Public API ───────────────────────────────────────────────────────────────

function resolveDeps(deps?: CacheDeps): Required<CacheDeps> {
  return {
    model: (deps?.model ?? DefaultAICache) as Model<IAICache>,
    ttlMs: deps?.ttlMs ?? DEFAULT_TTL_MS,
    now: deps?.now ?? (() => new Date()),
  };
}

export async function getCached(
  cacheKey: string,
  deps?: CacheDeps,
): Promise<CachedResponse | null> {
  const { model, now } = resolveDeps(deps);
  const doc = await model.findOneAndUpdate(
    { cacheKey, expiresAt: { $gt: now() } },
    { $inc: { hitCount: 1 }, $set: { lastHitAt: now() } },
    { new: true },
  ).lean<IAICache>();
  if (!doc) return null;
  return {
    content: doc.response.content,
    provider: doc.response.provider,
    model: doc.response.model,
  };
}

export async function setCached(
  cacheKey: string,
  response: CachedResponse,
  deps?: CacheDeps,
): Promise<void> {
  const { model, ttlMs, now } = resolveDeps(deps);
  const nowD = now();
  const expiresAt = new Date(nowD.getTime() + ttlMs);
  // Upsert so a rare race between two concurrent misses doesn't error out.
  await model.updateOne(
    { cacheKey },
    {
      $set: {
        cacheKey,
        response: {
          content: response.content,
          provider: response.provider,
          model: response.model,
        },
        expiresAt,
      },
      $setOnInsert: { createdAt: nowD, hitCount: 0 },
    },
    { upsert: true },
  );
}

/** Purge expired entries manually (also handled by Mongo TTL index). */
export async function purgeExpired(deps?: CacheDeps): Promise<number> {
  const { model, now } = resolveDeps(deps);
  const r = await model.deleteMany({ expiresAt: { $lte: now() } });
  return r.deletedCount ?? 0;
}
