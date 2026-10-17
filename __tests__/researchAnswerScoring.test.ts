import { scoreResearchAnswer } from "@/lib/researchAnswerScoring";

describe("research answer scoring", () => {
  it("scores MCQ and cloze on the server with the documented tolerance", () => {
    expect(scoreResearchAnswer({ retrievalType: 0, expectedAnswer: "Meaning A", word: "ubiquitous", answerText: "meaning a" })).toBe(1);
    expect(scoreResearchAnswer({ retrievalType: 0, expectedAnswer: "Meaning A", word: "ubiquitous", answerText: "meaning b" })).toBe(0);
    expect(scoreResearchAnswer({ retrievalType: 1, expectedAnswer: "ubiquitous", word: "ubiquitous", answerText: "ubiquitous" })).toBe(1);
    expect(scoreResearchAnswer({ retrievalType: 1, expectedAnswer: "ubiquitous", word: "ubiquitous", answerText: "ubiquitousx" })).toBe(1);
  });

  it("uses the target lemma as the deterministic d=2/d=3 eligibility score", () => {
    expect(scoreResearchAnswer({ retrievalType: 2, expectedAnswer: "reference", word: "adapt", answerText: "I adapted quickly." })).toBe(1);
    expect(scoreResearchAnswer({ retrievalType: 3, expectedAnswer: "reference", word: "adapt", answerText: "A different response." })).toBe(0);
  });
});

