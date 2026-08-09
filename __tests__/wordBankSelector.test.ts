import {
  selectWords,
  computeMode,
  seedFromUserAndDate,
  N_MIN,
  MIN_QUEUE,
  POOL_RATIO_AFTER,
  PersonalWord,
} from "@/lib/wordBankSelector";
import { POOL, poolSummary } from "@/lib/defaultWordBankPool";

describe("wordBankSelector — pool sanity", () => {
  test("pool loads with at least 60 entries and both bands present", () => {
    const s = poolSummary();
    expect(s.total).toBeGreaterThanOrEqual(60);
    expect(s.byBand.B1).toBeGreaterThan(0);
    expect(s.byBand.B2).toBeGreaterThan(0);
  });

  test("all pool entries have required fields", () => {
    for (const w of POOL) {
      expect(w.word).toBeTruthy();
      expect(["B1", "B2"]).toContain(w.band);
      expect(["n", "v", "adj", "adv"]).toContain(w.pos);
      expect(w.definition.length).toBeGreaterThan(0);
      expect(w.viDefinition.length).toBeGreaterThan(0);
      expect(w.commonness).toBeGreaterThanOrEqual(1);
      expect(w.commonness).toBeLessThanOrEqual(5);
    }
  });
});

describe("computeMode", () => {
  test("cold-start below threshold", () => {
    expect(computeMode(0)).toBe("cold-start");
    expect(computeMode(N_MIN - 1)).toBe("cold-start");
  });
  test("personalized at or above threshold", () => {
    expect(computeMode(N_MIN)).toBe("personalized");
    expect(computeMode(N_MIN + 100)).toBe("personalized");
  });
});

describe("selectWords — review-queue rule", () => {
  test("returns nothing new when review queue is full", () => {
    const out = selectWords({
      personalCount: 5,
      reviewQueueSize: MIN_QUEUE + 2,
      newCardsTarget: 5,
      seed: 42,
      alreadyStudied: new Set(),
    });
    expect(out.fromPool).toHaveLength(0);
    expect(out.fromPersonal).toHaveLength(0);
    expect(out.reasoning).toContain("no new words");
  });

  test("returns nothing new when newCardsTarget is 0", () => {
    const out = selectWords({
      personalCount: 5,
      reviewQueueSize: 0,
      newCardsTarget: 0,
      seed: 42,
      alreadyStudied: new Set(),
    });
    expect(out.fromPool).toHaveLength(0);
    expect(out.fromPersonal).toHaveLength(0);
  });
});

describe("selectWords — cold-start mode", () => {
  test("gives 100% pool words when personalCount is 0", () => {
    const out = selectWords({
      personalCount: 0,
      reviewQueueSize: 0,
      newCardsTarget: 5,
      seed: 42,
      alreadyStudied: new Set(),
    });
    expect(out.mode).toBe("cold-start");
    expect(out.fromPool).toHaveLength(5);
    expect(out.fromPersonal).toHaveLength(0);
  });

  test("respects preferredBand", () => {
    const out = selectWords({
      personalCount: 0,
      reviewQueueSize: 0,
      newCardsTarget: 8,
      preferredBand: "B2",
      seed: 42,
      alreadyStudied: new Set(),
    });
    for (const w of out.fromPool) expect(w.band).toBe("B2");
  });

  test("excludes already-studied words", () => {
    const first = selectWords({
      personalCount: 0,
      reviewQueueSize: 0,
      newCardsTarget: 3,
      seed: 1,
      alreadyStudied: new Set(),
    });
    const exclude = new Set(first.fromPool.map((w) => w.word.toLowerCase()));
    const second = selectWords({
      personalCount: 0,
      reviewQueueSize: 0,
      newCardsTarget: 3,
      seed: 1, // same seed
      alreadyStudied: exclude,
    });
    for (const w of second.fromPool) expect(exclude.has(w.word.toLowerCase())).toBe(false);
  });

  test("deterministic given same seed and exclusion set", () => {
    const a = selectWords({
      personalCount: 0,
      reviewQueueSize: 0,
      newCardsTarget: 4,
      seed: 999,
      alreadyStudied: new Set(),
    });
    const b = selectWords({
      personalCount: 0,
      reviewQueueSize: 0,
      newCardsTarget: 4,
      seed: 999,
      alreadyStudied: new Set(),
    });
    expect(a.fromPool.map((w) => w.word)).toEqual(b.fromPool.map((w) => w.word));
  });
});

describe("selectWords — personalized mode", () => {
  const personalCandidates: PersonalWord[] = Array.from({ length: 50 }, (_, i) => ({
    id: `p_${i}`,
    word: `personalword${i}`,
    band: (i % 2 === 0 ? "B1" : "B2") as "B1" | "B2",
    source: "document" as const,
  }));

  test("mode flips to personalized above threshold", () => {
    const out = selectWords({
      personalCount: N_MIN,
      reviewQueueSize: 0,
      newCardsTarget: 10,
      seed: 42,
      alreadyStudied: new Set(),
      personalCandidates,
    });
    expect(out.mode).toBe("personalized");
  });

  test("mixes ~80% personal and ~20% pool", () => {
    const out = selectWords({
      personalCount: N_MIN + 10,
      reviewQueueSize: 0,
      newCardsTarget: 10,
      seed: 42,
      alreadyStudied: new Set(),
      personalCandidates,
    });
    const total = out.fromPool.length + out.fromPersonal.length;
    expect(total).toBe(10);
    // 20% of 10 = 2 pool, 8 personal
    const expectedPool = Math.max(1, Math.round(10 * POOL_RATIO_AFTER));
    expect(out.fromPool).toHaveLength(expectedPool);
    expect(out.fromPersonal).toHaveLength(10 - expectedPool);
  });

  test("guarantees at least 1 pool word for anchor even at small newCardsTarget", () => {
    const out = selectWords({
      personalCount: N_MIN + 10,
      reviewQueueSize: 0,
      newCardsTarget: 3,
      seed: 42,
      alreadyStudied: new Set(),
      personalCandidates,
    });
    expect(out.fromPool.length).toBeGreaterThanOrEqual(1);
  });
});

describe("seedFromUserAndDate", () => {
  test("same input gives same seed", () => {
    expect(seedFromUserAndDate("user123", "2026-08-09")).toBe(
      seedFromUserAndDate("user123", "2026-08-09"),
    );
  });
  test("different user gives different seed", () => {
    expect(seedFromUserAndDate("user123", "2026-08-09")).not.toBe(
      seedFromUserAndDate("user456", "2026-08-09"),
    );
  });
  test("different date gives different seed", () => {
    expect(seedFromUserAndDate("user123", "2026-08-09")).not.toBe(
      seedFromUserAndDate("user123", "2026-08-10"),
    );
  });
});
