import {
  halfLife,
  baseHalfLife,
  predictRecall,
  bceLoss,
  selectNextRetrievalType,
  dartSchedule,
  buildFeatureVector,
  DEFAULT_DART_WEIGHTS,
  PHI,
  RetrievalType,
} from "../lib/dart";

describe("DART inference (Algorithm 2)", () => {
  const w = DEFAULT_DART_WEIGHTS;
  const x = buildFeatureVector({ cefr: 2, wordFrequency: 1000, userAverageAccuracy: 0.6, timesReviewed: 3 });

  test("baseHalfLife is 2^(θ⊤x)", () => {
    const dot = w.theta.reduce((s, t, i) => s + t * x[i], 0);
    expect(baseHalfLife(w.theta, x)).toBeCloseTo(Math.pow(2, dot), 6);
  });

  test("half-life is monotone-increasing in retrieval difficulty d", () => {
    const hs = ([0, 1, 2, 3] as RetrievalType[]).map(d => halfLife(w.theta, w.alpha, x, d));
    for (let i = 1; i < hs.length; i++) expect(hs[i]).toBeGreaterThan(hs[i - 1]);
  });

  test("predictRecall matches 2^(-Δ/h) and lies in [0,1]", () => {
    const h = 4;
    const p = predictRecall(h, 2);
    expect(p).toBeCloseTo(Math.pow(2, -0.5), 6);
    expect(p).toBeGreaterThanOrEqual(0);
    expect(p).toBeLessThanOrEqual(1);
  });

  test("bceLoss handles correct/incorrect endpoints", () => {
    expect(bceLoss(0.99, 1)).toBeLessThan(0.05);
    expect(bceLoss(0.01, 1)).toBeGreaterThan(4);
  });

  test("selectNextRetrievalType respects thresholds", () => {
    expect(selectNextRetrievalType(1)).toBe(0);
    expect(selectNextRetrievalType(3)).toBe(1);
    expect(selectNextRetrievalType(10)).toBe(2);
    expect(selectNextRetrievalType(60)).toBe(3);
  });

  test("dartSchedule returns h, tNext≈max(1, h·log2(1/τ)), d in {0..3}", () => {
    // Use a feature vector that yields a large half-life so the max(1,...) clamp is inactive.
    const bigX = buildFeatureVector({ cefr: 5, wordFrequency: 100000, userAverageAccuracy: 1, timesReviewed: 40 });
    const s = dartSchedule(w, bigX, 3, 0.9);
    expect(s.halfLife).toBeGreaterThan(0);
    const expected = Math.max(1, s.halfLife * Math.log2(1 / 0.9));
    expect(s.intervalDays).toBeCloseTo(expected, 3);
    expect([0, 1, 2, 3]).toContain(s.nextRetrievalType);
  });

  test("PHI is strictly increasing", () => {
    expect(PHI[0]).toBeLessThan(PHI[1]);
    expect(PHI[1]).toBeLessThan(PHI[2]);
    expect(PHI[2]).toBeLessThan(PHI[3]);
  });
});
