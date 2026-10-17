import { decideTaskType, DART_EXPLORATION_EPSILON, RETRIEVAL_POLICY_VERSION } from "@/lib/retrievalTasks/session";

const item = { word: "contribute", vocabularyId: "w_001", cefrOfWord: "B1" as const, timesReviewed: 4, userAvgAccuracy: 0.9 };

describe("DART retrieval exploration decision records", () => {
  it("records a reproducible epsilon-selected branch without relying on client input", () => {
    const values = [0.10, 0.74];
    const decision = decideTaskType(item, { participantCefr: "B1", scheduler: "dart", epsilonExplore: true, rand: () => values.shift()! });
    expect(decision).toEqual({
      retrievalType: 2,
      heuristicRetrievalType: 3,
      epsilon: DART_EXPLORATION_EPSILON,
      epsilonDraw: 0.10,
      explorationSelected: true,
      explorationEligibleTypes: [0, 1, 2, 3],
      explorationSelectionDraw: 0.74,
    });
    expect(RETRIEVAL_POLICY_VERSION).toBe("retrieval-policy-v1");
  });

  it("records a non-exploration DART branch and leaves other arms at epsilon zero", () => {
    const dart = decideTaskType(item, { participantCefr: "B1", scheduler: "dart", epsilonExplore: true, rand: () => 0.8 });
    expect(dart).toMatchObject({ retrievalType: 3, heuristicRetrievalType: 3, epsilon: 0.20, epsilonDraw: 0.8, explorationSelected: false });
    const hlr = decideTaskType(item, { participantCefr: "B1", scheduler: "hlr", epsilonExplore: false });
    expect(hlr).toEqual({ retrievalType: 3, heuristicRetrievalType: 3, epsilon: 0, explorationSelected: false });
  });

  it("rejects invalid injected random values instead of silently changing the allocation policy", () => {
    expect(() => decideTaskType(item, { participantCefr: "B1", scheduler: "dart", epsilonExplore: true, rand: () => 1 })).toThrow("[0, 1)");
  });
});

