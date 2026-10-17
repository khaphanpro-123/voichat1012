import { initialResearchTimingState, transitionResearchTimingState } from "@/lib/researchTiming";

const vector = [1, 0.4, 0.5, 0.5, 0.2, 0.5];

describe("research HLR/DART timing state", () => {
  it("starts due immediately and produces a persisted HLR timing decision", () => {
    const now = new Date("2026-10-17T00:00:00.000Z");
    expect(initialResearchTimingState(now).nextReviewDate).toEqual(now);
    const next = transitionResearchTimingState({ condition: "hlr", featureVector: vector, lastRetrievalType: 0, quality: 5, now });
    expect(next.interval).toBeGreaterThanOrEqual(1);
    expect(next.nextReviewDate.getTime()).toBeGreaterThan(now.getTime());
    expect(next.predictedRecall).toBeGreaterThan(0);
  });

  it("uses DART's prior retrieval difficulty and shortens a failed interval", () => {
    const now = new Date("2026-10-17T00:00:00.000Z");
    const success = transitionResearchTimingState({ condition: "dart", featureVector: vector, lastRetrievalType: 3, quality: 5, now });
    const failure = transitionResearchTimingState({ condition: "dart", featureVector: vector, lastRetrievalType: 3, quality: 1, now });
    expect(success.lastRetrievalType).toBe(3);
    expect(failure.interval).toBeLessThanOrEqual(success.interval);
  });
});

