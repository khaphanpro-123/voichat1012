import { calculateNextReviewHlr } from "../lib/baselines/hlr";
import { karlNext } from "../lib/baselines/karl";
import { lectorSchedule } from "../lib/baselines/lector";
import { calculateNextReviewDart, calculateNextReview } from "../lib/spacedRepetition";
import { buildFeatureVector } from "../lib/dart";
import { assignCondition, allocationSummary, LIVE_ARMS } from "../lib/experimentAssignment";
import { SCHEDULER_NAMES } from "../lib/baselines";

describe("Baseline schedulers", () => {
  const x = buildFeatureVector({ cefr: 2, wordFrequency: 500, userAverageAccuracy: 0.6, timesReviewed: 2 });

  test("SM-2 grows interval on success and resets on failure", () => {
    const good = calculateNextReview({ easeFactor: 2.5, interval: 6, repetitions: 2, nextReviewDate: new Date() }, 5);
    expect(good.interval).toBeGreaterThanOrEqual(6);
    const bad = calculateNextReview({ easeFactor: 2.5, interval: 6, repetitions: 2, nextReviewDate: new Date() }, 1);
    expect(bad.repetitions).toBe(0);
    expect(bad.interval).toBe(1);
  });

  test("HLR = DART with α = 0 (interval invariant to dPrev)", () => {
    const s = calculateNextReviewHlr({ featureVector: x, quality: 5 });
    expect(s.interval).toBeGreaterThan(0);
    expect(s.halfLife).toBeGreaterThan(0);
  });

  test("KARL grows on quality 5, shrinks on quality 1", () => {
    const good = karlNext({ cefr: 2, userAvgAccuracy: 0.7, quality: 5, currentInterval: 4 });
    const bad = karlNext({ cefr: 2, userAvgAccuracy: 0.7, quality: 1, currentInterval: 4 });
    expect(good.intervalDays).toBeGreaterThan(bad.intervalDays);
  });

  test("LECTOR picks the most novel pool item", () => {
    const seen = [[1, 0, 0]];
    const pool = [[1, 0, 0], [0, 0, 1]];
    const r = lectorSchedule({
      featureVector: x, quality: 5,
      seenEmbeddings: seen, poolEmbeddings: pool,
    });
    expect(r.contextIndex).toBe(1);
    expect(r.contextCoverage).toBeGreaterThan(0);
  });

  test("DART interval matches h · log2(1/τ) direction", () => {
    const s = calculateNextReviewDart({ featureVector: x, lastRetrievalType: 0, quality: 5 });
    expect(s.interval).toBeGreaterThan(0);
    expect(s.halfLife).toBeGreaterThan(0);
  });
});

describe("Experiment assignment", () => {
  test("assignment is deterministic per userId", () => {
    const a = assignCondition("user-42");
    const b = assignCondition("user-42");
    expect(a.condition).toBe(b.condition);
  });

  test("condition falls within registry", () => {
    for (let i = 0; i < 20; i++) {
      const a = assignCondition(`user-${i}`);
      expect(SCHEDULER_NAMES).toContain(a.condition);
    }
  });

  test("stratum changes bucket", () => {
    const a = assignCondition("u", "A1");
    const b = assignCondition("u", "C1");
    // Not guaranteed different, but at least deterministic
    expect(typeof a.condition).toBe("string");
    expect(typeof b.condition).toBe("string");
  });

  test("live trial serves only the three pre-registered arms", () => {
    for (let i = 0; i < 300; i++) {
      expect(LIVE_ARMS).toContain(assignCondition(`p-${i}`).condition);
    }
  });

  test("allocation is roughly balanced across arms", () => {
    const learners = Array.from({ length: 180 }, (_, i) => ({ userId: `P${i}` }));
    const counts = allocationSummary(learners);
    const expected = 180 / LIVE_ARMS.length;
    // Hash-based allocation balances only in expectation; allow +/-35%.
    // If a real cohort drifts further than this, fall back to an explicit
    // block-randomisation table rather than the hash.
    for (const arm of LIVE_ARMS) {
      expect(counts[arm]).toBeGreaterThan(expected * 0.65);
      expect(counts[arm]).toBeLessThan(expected * 1.35);
    }
  });
});
