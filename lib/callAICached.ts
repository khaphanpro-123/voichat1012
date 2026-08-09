// lib/callAICached.ts
//
// Wrapper around callAI (lib/aiProvider.ts) that adds a content-addressed cache.
//
// Exit criterion Ngày 12: 200 calls with the same (prompt, params, namespace)
// → exactly 1 real LLM call.
//
// Also serves internal-validity for the RCT: two learners in the same arm asked
// the same retrieval question get **the same** LLM-generated task (not a fresh
// sampled variant), removing content-noise as a confound.
//
// Design principle: the ORIGINAL fallback chain in callAI is preserved on cache
// misses. Cached entries record which provider actually generated them, so
// analytics can attribute cost properly.

import { callAI } from "@/lib/aiProvider";
import { computeCacheKey, getCached, setCached, type CacheDeps, type CacheKeyInput } from "@/lib/aiCache";

export interface CallAICachedInput extends CacheKeyInput {
  keys: {
    openaiKey?: string | null;
    groqKey?: string | null;
    cohereKey?: string | null;
  };
}

export interface CallAICachedResult {
  success: boolean;
  content: string;
  provider: "openai" | "groq" | "cohere";
  model: string;
  cached: boolean;              // true if response came from cache
  cacheKey: string;
  error?: string;
}

export interface CallAICachedDeps extends CacheDeps {
  /** Injected callAI for tests. Defaults to lib/aiProvider callAI. */
  llmCall?: typeof callAI;
}

/**
 * Call the LLM with cache lookup. Cache misses go through the normal provider
 * fallback chain and, on success, are stored so subsequent identical calls are
 * free.
 */
export async function callAICached(
  input: CallAICachedInput,
  deps?: CallAICachedDeps,
): Promise<CallAICachedResult> {
  const cacheKey = computeCacheKey(input);
  const llm = deps?.llmCall ?? callAI;

  // 1. Cache lookup
  try {
    const hit = await getCached(cacheKey, deps);
    if (hit) {
      return {
        success: true,
        content: hit.content,
        provider: hit.provider,
        model: hit.model,
        cached: true,
        cacheKey,
      };
    }
  } catch (err) {
    // Cache lookup should never break a real call. Log-swallow and continue.
    // eslint-disable-next-line no-console
    console.warn("[callAICached] cache lookup failed, falling through to LLM:", err);
  }

  // 2. Cache miss → real LLM call via fallback chain
  const res = await llm(input.prompt, input.keys, {
    preferProvider: input.preferProvider as any,
    temperature: input.temperature,
    maxTokens: input.maxTokens,
  });

  if (!res.success) {
    return {
      success: false,
      content: res.content,
      provider: res.provider,
      model: res.model,
      cached: false,
      cacheKey,
      error: res.error,
    };
  }

  // 3. Store successful response
  try {
    await setCached(
      cacheKey,
      { content: res.content, provider: res.provider, model: res.model },
      deps,
    );
  } catch (err) {
    // Cache write failing must not fail the actual result.
    // eslint-disable-next-line no-console
    console.warn("[callAICached] cache write failed:", err);
  }

  return {
    success: true,
    content: res.content,
    provider: res.provider,
    model: res.model,
    cached: false,
    cacheKey,
  };
}
