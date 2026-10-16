import {
  RESEARCH_SM2_STATE_VERSION,
  initialResearchSm2State,
  isResearchSm2Quality,
  transitionResearchSm2State,
} from "@/lib/researchSm2";

describe("research-owned SM-2 state", () => {
  it("starts independently with the frozen initial values", () => {
    const now = new Date("2026-10-16T00:00:00.000Z");
    expect(initialResearchSm2State(now)).toEqual({
      stateVersion: RESEARCH_SM2_STATE_VERSION,
      easeFactor: 2.5,
      interval: 1,
      repetitions: 0,
      nextReviewDate: now,
    });
  });

  it("accepts exactly the six integer self-rating values", () => {
    for (const quality of [0, 1, 2, 3, 4, 5]) expect(isResearchSm2Quality(quality)).toBe(true);
    for (const quality of [-1, 2.5, 6, "4", null]) expect(isResearchSm2Quality(quality)).toBe(false);
  });

  it("preserves a successful transition and resets after a low self-rating", () => {
    const initial = initialResearchSm2State();
    const successful = transitionResearchSm2State(initial, 5);
    expect(successful.repetitions).toBe(1);
    expect(successful.interval).toBe(1);
    expect(successful.stateVersion).toBe(RESEARCH_SM2_STATE_VERSION);

    const failed = transitionResearchSm2State({ ...successful, interval: 6, repetitions: 2 }, 2);
    expect(failed.repetitions).toBe(0);
    expect(failed.interval).toBe(1);
  });

  it("refuses a non-protocol quality before state mutation", () => {
    expect(() => transitionResearchSm2State(initialResearchSm2State(), 2.5)).toThrow(/integer from 0 to 5/);
  });
});

