import ReviewLog from "@/app/models/ReviewLog";

describe("research ReviewLog vocabulary identifier", () => {
  it("accepts the frozen word-bank string IDs without coercing them to ObjectId", () => {
    const doc = new ReviewLog({
      userId: "P0042",
      vocabularyId: "w_001",
      word: "significant",
      deltaDays: 0,
      retrievalType: 0,
      recall: 1,
    });
    expect(doc.validateSync()).toBeUndefined();
    expect(doc.vocabularyId).toBe("w_001");
  });
});

