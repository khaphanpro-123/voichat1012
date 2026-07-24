import {
  cosineSim,
  cosineDist,
  meanEmbedding,
  pickDiverseContext,
} from "../lib/contextDiversity";

describe("Alg 4 Step 4 — max-min context diversity", () => {
  test("cosineSim of identical vectors is 1", () => {
    expect(cosineSim([1, 0], [1, 0])).toBeCloseTo(1);
    expect(cosineDist([1, 0], [1, 0])).toBeCloseTo(0);
  });

  test("mean embedding averages component-wise", () => {
    expect(meanEmbedding([[1, 0], [0, 1]])).toEqual([0.5, 0.5]);
  });

  test("with empty seen set picks any pool item and score=1", () => {
    const pool = [
      { id: "a", embedding: [1, 0] },
      { id: "b", embedding: [0, 1] },
    ];
    const r = pickDiverseContext(pool, [], 0.2);
    expect(r).not.toBeNull();
    expect(r!.score).toBeCloseTo(1);
  });

  test("prefers the item farthest from the seen set", () => {
    const pool = [
      { id: "close", embedding: [1, 0] },
      { id: "far", embedding: [0, 1] },
    ];
    const seen = [{ id: "s", embedding: [1, 0] }];
    const r = pickDiverseContext(pool, seen, 0.2);
    expect(r!.chosen.id).toBe("far");
  });

  test("falls back to global best when Cvalid is empty", () => {
    // δ_min very high forces valid = ∅
    const pool = [{ id: "a", embedding: [1, 0] }];
    const seen = [{ id: "s", embedding: [1, 0] }];
    const r = pickDiverseContext(pool, seen, 1.5);
    expect(r!.fallbackUsed).toBe(true);
    expect(r!.chosen.id).toBe("a");
  });
});
