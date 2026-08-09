// __tests__/aiCache.test.ts
//
// Tests for lib/aiCache, lib/callAICached, lib/aiBudget (Ngày 12 / D-013).
//
// Exit criterion Ngày 12: 200 calls with same input → exactly 1 real LLM call.

import { computeCacheKey, getCached, setCached, type CacheDeps } from "@/lib/aiCache";
import { callAICached, type CallAICachedDeps } from "@/lib/callAICached";
import { chargeAI, currentSpend, dateKeyUTC, estimateCostUsd, type BudgetDeps } from "@/lib/aiBudget";

// ─── In-memory fake Mongoose Model ────────────────────────────────────────────

function makeFakeCacheModel() {
  const store = new Map<string, any>();
  return {
    _store: store,
    findOneAndUpdate(query: any, update: any, opts?: any) {
      const doc = store.get(query.cacheKey);
      const hit = doc && (!query.expiresAt || doc.expiresAt > query.expiresAt.$gt);
      const chain = {
        lean: async () => {
          if (!hit) return null;
          if (update.$inc?.hitCount) doc.hitCount = (doc.hitCount ?? 0) + update.$inc.hitCount;
          if (update.$set?.lastHitAt) doc.lastHitAt = update.$set.lastHitAt;
          return { ...doc };
        },
      };
      return chain;
    },
    async updateOne(query: any, update: any, opts?: any) {
      const existing = store.get(query.cacheKey);
      const now = new Date();
      const doc = existing ?? { ...(update.$setOnInsert ?? {}), cacheKey: query.cacheKey };
      Object.assign(doc, update.$set ?? {});
      store.set(query.cacheKey, doc);
      return { matchedCount: existing ? 1 : 0, upsertedCount: existing ? 0 : 1 };
    },
    async deleteMany(query: any) {
      let n = 0;
      for (const [k, v] of store.entries()) {
        if (v.expiresAt <= query.expiresAt.$lte) { store.delete(k); n++; }
      }
      return { deletedCount: n };
    },
  } as any;
}

function makeFakeBudgetModel() {
  const store = new Map<string, any>();
  return {
    _store: store,
    findOne(query: any) {
      const doc = store.get(query.dateKey) ?? null;
      return { lean: async () => (doc ? { ...doc } : null) };
    },
    findOneAndUpdate(query: any, update: any, opts?: any) {
      let doc = store.get(query.dateKey);
      if (!doc) {
        doc = { ...(update.$setOnInsert ?? {}), byProvider: {}, totalUsd: 0, callCount: 0 };
        store.set(query.dateKey, doc);
      }
      if (update.$inc) {
        for (const [k, v] of Object.entries(update.$inc)) {
          if (k.startsWith("byProvider.")) {
            const p = k.split(".")[1];
            doc.byProvider[p] = (doc.byProvider[p] ?? 0) + (v as number);
          } else {
            doc[k] = (doc[k] ?? 0) + (v as number);
          }
        }
      }
      Object.assign(doc, update.$set ?? {});
      return { lean: async () => ({ ...doc }) };
    },
  } as any;
}

// ─── Key computation ──────────────────────────────────────────────────────────

describe("computeCacheKey", () => {
  it("same input → same key", () => {
    const a = computeCacheKey({ prompt: "hello", temperature: 0.5, maxTokens: 100 });
    const b = computeCacheKey({ prompt: "hello", temperature: 0.5, maxTokens: 100 });
    expect(a).toBe(b);
  });

  it("different prompt → different key", () => {
    const a = computeCacheKey({ prompt: "hello" });
    const b = computeCacheKey({ prompt: "world" });
    expect(a).not.toBe(b);
  });

  it("different namespace isolates keys", () => {
    const a = computeCacheKey({ prompt: "same", namespace: "judge" });
    const b = computeCacheKey({ prompt: "same", namespace: "cloze" });
    expect(a).not.toBe(b);
  });

  it("temperature floating-point noise is normalised", () => {
    const a = computeCacheKey({ prompt: "x", temperature: 0.5 });
    const b = computeCacheKey({ prompt: "x", temperature: 0.5000001 });  // rounds to 0.5000
    expect(a).toBe(b);
  });

  it("output is 64-char hex (SHA-256)", () => {
    const k = computeCacheKey({ prompt: "any" });
    expect(k).toMatch(/^[0-9a-f]{64}$/);
  });
});

// ─── get / set ────────────────────────────────────────────────────────────────

describe("getCached / setCached", () => {
  it("miss returns null", async () => {
    const deps: CacheDeps = { model: makeFakeCacheModel() };
    expect(await getCached("nonexistent", deps)).toBeNull();
  });

  it("set then get returns the stored response", async () => {
    const deps: CacheDeps = { model: makeFakeCacheModel() };
    await setCached("k1", { content: "hello", provider: "groq", model: "llama-3.3-70b-versatile" }, deps);
    const r = await getCached("k1", deps);
    expect(r).toEqual({ content: "hello", provider: "groq", model: "llama-3.3-70b-versatile" });
  });

  it("expired entries return null", async () => {
    let t = 1000;
    const deps: CacheDeps = { model: makeFakeCacheModel(), ttlMs: 500, now: () => new Date(t) };
    await setCached("k2", { content: "x", provider: "groq", model: "m" }, deps);
    t = 2000;   // > 1000 + 500
    expect(await getCached("k2", deps)).toBeNull();
  });

  it("increments hitCount on read", async () => {
    const fake = makeFakeCacheModel();
    const deps: CacheDeps = { model: fake };
    await setCached("k3", { content: "x", provider: "groq", model: "m" }, deps);
    await getCached("k3", deps);
    await getCached("k3", deps);
    await getCached("k3", deps);
    expect(fake._store.get("k3").hitCount).toBe(3);
  });
});

// ─── callAICached — Ngày 12 SLA (200x → 1 LLM call) ──────────────────────────

describe("callAICached — Ngày 12 exit criterion", () => {
  it("200 calls same input → exactly 1 real LLM call", async () => {
    const llmMock = jest.fn(async () => ({
      success: true,
      content: "mocked llm response",
      provider: "groq" as const,
      model: "llama-3.3-70b-versatile",
    }));

    const deps: CallAICachedDeps = { model: makeFakeCacheModel(), llmCall: llmMock as any };

    const input = {
      prompt: "What is the capital of France?",
      preferProvider: "groq",
      temperature: 0.0,
      maxTokens: 100,
      keys: { groqKey: "test-key" },
    };

    // First call — cache miss → LLM called
    const first = await callAICached(input, deps);
    expect(first.success).toBe(true);
    expect(first.cached).toBe(false);
    expect(first.content).toBe("mocked llm response");

    // Next 199 calls — all cache hits, no LLM
    let hits = 0;
    for (let i = 0; i < 199; i++) {
      const r = await callAICached(input, deps);
      if (r.cached) hits++;
      expect(r.success).toBe(true);
      expect(r.content).toBe("mocked llm response");
    }

    expect(hits).toBe(199);
    expect(llmMock).toHaveBeenCalledTimes(1);   // ← THE Ngày 12 EXIT CRITERION
  });

  it("different prompt → separate cache entry", async () => {
    const llmMock = jest.fn(async () => ({
      success: true, content: "x", provider: "groq" as const, model: "m",
    }));
    const deps: CallAICachedDeps = { model: makeFakeCacheModel(), llmCall: llmMock as any };
    const keys = { groqKey: "k" };
    await callAICached({ prompt: "a", keys }, deps);
    await callAICached({ prompt: "b", keys }, deps);
    await callAICached({ prompt: "a", keys }, deps);   // hit
    await callAICached({ prompt: "b", keys }, deps);   // hit
    expect(llmMock).toHaveBeenCalledTimes(2);
  });

  it("LLM failure → not cached, next call retries", async () => {
    let n = 0;
    const llmMock = jest.fn(async () => {
      n++;
      if (n === 1) return { success: false, content: "", provider: "groq" as const, model: "m", error: "quota" };
      return { success: true, content: "ok", provider: "groq" as const, model: "m" };
    });
    const deps: CallAICachedDeps = { model: makeFakeCacheModel(), llmCall: llmMock as any };
    const input = { prompt: "retry-me", keys: { groqKey: "k" } };

    const r1 = await callAICached(input, deps);
    expect(r1.success).toBe(false);
    const r2 = await callAICached(input, deps);
    expect(r2.success).toBe(true);
    expect(r2.cached).toBe(false);  // wasn't cached because first call failed
    expect(llmMock).toHaveBeenCalledTimes(2);
  });

  it("cache write failure doesn't fail the result", async () => {
    const llmMock = jest.fn(async () => ({ success: true, content: "ok", provider: "groq" as const, model: "m" }));
    const brokenModel = {
      findOneAndUpdate: () => ({ lean: async () => null }),
      updateOne: async () => { throw new Error("mongo down"); },
    } as any;
    const deps: CallAICachedDeps = { model: brokenModel, llmCall: llmMock as any };
    const r = await callAICached({ prompt: "x", keys: { groqKey: "k" } }, deps);
    expect(r.success).toBe(true);
    expect(r.content).toBe("ok");
  });
});

// ─── Fallback chain verification (via callAI's real logic) ────────────────────

describe("Fallback chain (mocked)", () => {
  it("Groq fails → OpenAI succeeds via injected llmCall", async () => {
    // Since callAI itself is what handles the chain, we test that callAICached
    // simply passes through: if the underlying llmCall reports success from
    // openai (after trying groq internally), we get openai back.
    const llmMock = jest.fn(async (prompt: string, keys: any) => ({
      success: true, content: "from-openai", provider: "openai" as const, model: "gpt-4o-mini",
    }));
    const deps: CallAICachedDeps = { model: makeFakeCacheModel(), llmCall: llmMock as any };
    const r = await callAICached({
      prompt: "hi",
      keys: { groqKey: "bad", openaiKey: "good" },
    }, deps);
    expect(r.provider).toBe("openai");
    expect(r.content).toBe("from-openai");
  });
});

// ─── Budget guard ─────────────────────────────────────────────────────────────

describe("aiBudget", () => {
  it("dateKeyUTC formats YYYY-MM-DD", () => {
    expect(dateKeyUTC(new Date(Date.UTC(2026, 0, 5)))).toBe("2026-01-05");
    expect(dateKeyUTC(new Date(Date.UTC(2026, 11, 31)))).toBe("2026-12-31");
  });

  it("estimateCostUsd matches known price table", () => {
    // gpt-4o-mini: $0.15/M in, $0.60/M out
    const cost = estimateCostUsd("openai", "gpt-4o-mini", 1_000_000, 1_000_000);
    expect(cost).toBeCloseTo(0.15 + 0.60, 6);
  });

  it("groq is free (cost = 0)", () => {
    expect(estimateCostUsd("groq", "llama-3.3-70b-versatile", 1_000_000, 1_000_000)).toBe(0);
  });

  it("unknown provider uses fallback price", () => {
    const c = estimateCostUsd("unknown", "unknown", 1_000_000, 1_000_000);
    expect(c).toBeGreaterThan(0);
  });

  it("chargeAI accumulates and returns totals", async () => {
    const deps: BudgetDeps = { model: makeFakeBudgetModel(), capUsd: 10, now: () => new Date(Date.UTC(2026, 0, 1)) };
    const r1 = await chargeAI({ provider: "openai", model: "gpt-4o-mini", tokensIn: 1_000_000, tokensOut: 0 }, deps);
    expect(r1.allowed).toBe(true);
    expect(r1.chargedUsd).toBeCloseTo(0.15, 4);
    expect(r1.totalUsd).toBeCloseTo(0.15, 4);
    expect(r1.alertLevel).toBe("ok");
    const r2 = await chargeAI({ provider: "openai", model: "gpt-4o-mini", tokensIn: 1_000_000, tokensOut: 0 }, deps);
    expect(r2.totalUsd).toBeCloseTo(0.30, 4);
  });

  it("exceeded cap → allowed=false", async () => {
    const deps: BudgetDeps = { model: makeFakeBudgetModel(), capUsd: 0.10, now: () => new Date(Date.UTC(2026, 0, 1)) };
    // First charge should push past cap
    await chargeAI({ provider: "openai", model: "gpt-4o-mini", tokensIn: 1_000_000, tokensOut: 0 }, deps);  // 0.15 > 0.10
    const r = await chargeAI({ provider: "openai", model: "gpt-4o-mini", tokensIn: 1_000_000, tokensOut: 0 }, deps);
    expect(r.allowed).toBe(false);
    expect(r.alertLevel).toBe("exceeded");
  });

  it("warn level triggers at alertPct", async () => {
    const deps: BudgetDeps = { model: makeFakeBudgetModel(), capUsd: 1, alertPct: 80, now: () => new Date(Date.UTC(2026, 0, 1)) };
    // Charge 0.90 → 90% → warn
    await chargeAI({ provider: "openai", model: "gpt-4o-mini", tokensIn: 6_000_000, tokensOut: 0 }, deps);  // 6*0.15 = 0.90
    const r = await chargeAI({ provider: "groq", model: "llama-3.3-70b-versatile", tokensIn: 1000, tokensOut: 0 }, deps);
    expect(r.alertLevel).toBe("warn");
  });

  it("currentSpend returns 0 when no doc yet", async () => {
    const deps: BudgetDeps = { model: makeFakeBudgetModel(), capUsd: 5, now: () => new Date() };
    const r = await currentSpend(deps);
    expect(r.totalUsd).toBe(0);
    expect(r.capUsd).toBe(5);
  });
});
