// __tests__/judgeRubric.test.ts
// Tests for lib/judgeRubric — rubric validation, arithmetic, and LLM output parsing.

import {
  isValidRubricScores,
  sumRubric,
  maxRubricScore,
  normalizeRubricScore,
  parseLLMJudgeOutput,
  RubricScores,
} from "@/lib/judgeRubric";

// ── isValidRubricScores ───────────────────────────────────────────────────────
describe("isValidRubricScores", () => {
  it("accepts a valid rubric without contextFit", () => {
    expect(isValidRubricScores({ form: 2, meaning: 1, use: 0 })).toBe(true);
  });

  it("accepts a valid rubric with contextFit", () => {
    expect(isValidRubricScores({ form: 1, meaning: 2, use: 1, contextFit: 0 })).toBe(true);
  });

  it("rejects out-of-range scores", () => {
    expect(isValidRubricScores({ form: 3, meaning: 1, use: 1 })).toBe(false);
    expect(isValidRubricScores({ form: -1, meaning: 1, use: 1 })).toBe(false);
  });

  it("rejects missing required fields", () => {
    expect(isValidRubricScores({ form: 1, meaning: 1 })).toBe(false);
    expect(isValidRubricScores(null)).toBe(false);
    expect(isValidRubricScores(undefined)).toBe(false);
  });

  it("rejects non-integer scores", () => {
    expect(isValidRubricScores({ form: 1.5, meaning: 1, use: 1 })).toBe(false);
  });
});

// ── sumRubric + maxRubricScore ────────────────────────────────────────────────
describe("sumRubric", () => {
  it("sums 3 dimensions correctly", () => {
    expect(sumRubric({ form: 2, meaning: 1, use: 0 })).toBe(3);
  });

  it("sums 4 dimensions with contextFit", () => {
    expect(sumRubric({ form: 2, meaning: 2, use: 2, contextFit: 2 })).toBe(8);
  });

  it("treats missing contextFit as 0", () => {
    expect(sumRubric({ form: 2, meaning: 2, use: 2 })).toBe(6);
  });
});

describe("maxRubricScore", () => {
  it("returns 6 without contextFit", () => {
    expect(maxRubricScore({ form: 0, meaning: 0, use: 0 })).toBe(6);
  });

  it("returns 8 with contextFit", () => {
    expect(maxRubricScore({ form: 0, meaning: 0, use: 0, contextFit: 0 })).toBe(8);
  });
});

// ── normalizeRubricScore ──────────────────────────────────────────────────────
describe("normalizeRubricScore", () => {
  it("perfect score normalizes to 100", () => {
    expect(normalizeRubricScore(8, 8)).toBe(100);
    expect(normalizeRubricScore(6, 6)).toBe(100);
  });

  it("zero normalizes to 0", () => {
    expect(normalizeRubricScore(0, 8)).toBe(0);
  });

  it("half score normalizes to 50", () => {
    expect(normalizeRubricScore(4, 8)).toBe(50);
  });

  it("handles max=0 gracefully", () => {
    expect(normalizeRubricScore(0, 0)).toBe(0);
  });
});

// ── parseLLMJudgeOutput ───────────────────────────────────────────────────────
describe("parseLLMJudgeOutput — valid JSON", () => {
  it("parses clean JSON with contextFit", () => {
    const raw = JSON.stringify({ form: 2, meaning: 1, use: 2, contextFit: 1, rationale: "Good use." });
    const result = parseLLMJudgeOutput(raw, true);
    expect(result.valid).toBe(true);
    expect(result.rubric).toMatchObject({ form: 2, meaning: 1, use: 2, contextFit: 1 });
    expect(result.totalScore).toBe(6);
    expect(result.normalizedScore).toBe(75); // 6/8 * 100
    expect(result.rationale).toBe("Good use.");
  });

  it("parses JSON without contextFit when not expected", () => {
    const raw = JSON.stringify({ form: 2, meaning: 2, use: 2, rationale: "Perfect." });
    const result = parseLLMJudgeOutput(raw, false);
    expect(result.valid).toBe(true);
    expect(result.totalScore).toBe(6);
    expect(result.normalizedScore).toBe(100); // 6/6
  });

  it("handles JSON embedded in preamble text", () => {
    const raw = `Here is my assessment:\n${JSON.stringify({ form: 1, meaning: 1, use: 1, contextFit: 1, rationale: "ok" })}\nDone.`;
    const result = parseLLMJudgeOutput(raw, true);
    expect(result.valid).toBe(true);
    expect(result.totalScore).toBe(4);
  });

  it("coerces string scores to numbers", () => {
    const raw = JSON.stringify({ form: "2", meaning: "1", use: "0", contextFit: "2", rationale: "str scores" });
    const result = parseLLMJudgeOutput(raw, true);
    expect(result.valid).toBe(true);
    expect(result.rubric.form).toBe(2);
  });

  it("caps rationale at 1000 chars", () => {
    const long = "x".repeat(2000);
    const raw = JSON.stringify({ form: 2, meaning: 2, use: 2, contextFit: 2, rationale: long });
    const result = parseLLMJudgeOutput(raw, true);
    expect(result.rationale.length).toBeLessThanOrEqual(1000);
  });
});

describe("parseLLMJudgeOutput — invalid inputs", () => {
  it("returns valid=false for no JSON in output", () => {
    const result = parseLLMJudgeOutput("I think the learner did well.", true);
    expect(result.valid).toBe(false);
    expect(result.parseError).toContain("No JSON");
  });

  it("returns valid=false for malformed JSON", () => {
    const result = parseLLMJudgeOutput("{ form: 2, meaning 1 }", true);
    expect(result.valid).toBe(false);
    expect(result.parseError).toContain("JSON parse");
  });

  it("returns valid=false for out-of-range scores", () => {
    const raw = JSON.stringify({ form: 3, meaning: 1, use: 1, contextFit: 1, rationale: "bad" });
    const result = parseLLMJudgeOutput(raw, true);
    expect(result.valid).toBe(false);
    expect(result.parseError).toContain("out of range");
  });

  it("returns valid=false for negative scores", () => {
    const raw = JSON.stringify({ form: -1, meaning: 1, use: 1, rationale: "neg" });
    const result = parseLLMJudgeOutput(raw, false);
    expect(result.valid).toBe(false);
  });

  it("returns valid=false for missing required field", () => {
    const raw = JSON.stringify({ form: 1, meaning: 1, rationale: "missing use" });
    const result = parseLLMJudgeOutput(raw, false);
    expect(result.valid).toBe(false);
  });
});

// ── perfect and zero rubrics (integration) ───────────────────────────────────
describe("rubric arithmetic round-trips", () => {
  it("all-2 rubric with contextFit gives totalScore=8, normalizedScore=100", () => {
    const rubric: RubricScores = { form: 2, meaning: 2, use: 2, contextFit: 2 };
    const total = sumRubric(rubric);
    const max = maxRubricScore(rubric);
    expect(normalizeRubricScore(total, max)).toBe(100);
  });

  it("all-0 rubric gives totalScore=0, normalizedScore=0", () => {
    const rubric: RubricScores = { form: 0, meaning: 0, use: 0, contextFit: 0 };
    const total = sumRubric(rubric);
    const max = maxRubricScore(rubric);
    expect(normalizeRubricScore(total, max)).toBe(0);
  });
});
