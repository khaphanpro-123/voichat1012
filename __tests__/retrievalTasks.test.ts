// __tests__/retrievalTasks.test.ts
//
// Unit tests for lib/retrievalTasks/*.
// Cover the scoring branches — they're the ones that silently produce wrong
// research data if they regress.

import { buildMCQ, scoreMCQ } from "@/lib/retrievalTasks/mcq";
import { buildCloze, scoreCloze } from "@/lib/retrievalTasks/cloze";
import { buildConstrainedGen, scoreConstrainedGen } from "@/lib/retrievalTasks/constrainedGen";
import { buildParaphrase, scoreParaphrase, PARAPHRASE_OVERLAP_MAX } from "@/lib/retrievalTasks/paraphrase";
import { toPublicTask } from "@/lib/retrievalTasks/types";
import { isPlausibleElapsed, clampElapsed, MIN_PLAUSIBLE_ELAPSED_MS, MAX_PLAUSIBLE_ELAPSED_MS } from "@/lib/retrievalTasks/timing";

describe("MCQ", () => {
  const input = {
    word: "abundant",
    vocabularyId: "vocab_1",
    correctDefinition: "existing in large quantity",
    distractors: ["extremely rare", "moderately common", "of unknown quantity"],
    context: "The forest had abundant wildlife.",
    seed: "seed-x",
  };

  it("throws if distractor count is wrong", () => {
    expect(() => buildMCQ({ ...input, distractors: ["only two", "distractors"] } as any)).toThrow();
  });

  it("puts the correct answer at correctIndex", () => {
    const t = buildMCQ(input);
    expect(t.options).toHaveLength(4);
    expect(t.options[t.correctIndex]).toBe(input.correctDefinition);
  });

  it("scores exact match as recall=1", () => {
    const t = buildMCQ(input);
    expect(scoreMCQ(t, String(t.correctIndex))).toMatchObject({ recall: 1, autoScore: 1 });
  });

  it("scores wrong index as recall=0", () => {
    const t = buildMCQ(input);
    const wrong = (t.correctIndex + 1) % 4;
    expect(scoreMCQ(t, String(wrong))).toMatchObject({ recall: 0, autoScore: 0 });
  });

  it("scores garbage input as recall=0", () => {
    const t = buildMCQ(input);
    expect(scoreMCQ(t, "banana")).toMatchObject({ recall: 0 });
    expect(scoreMCQ(t, "9")).toMatchObject({ recall: 0 });
    expect(scoreMCQ(t, "-1")).toMatchObject({ recall: 0 });
  });

  it("is deterministic across builds with the same seed", () => {
    const a = buildMCQ(input);
    const b = buildMCQ(input);
    expect(a.options).toEqual(b.options);
    expect(a.correctIndex).toBe(b.correctIndex);
  });

  it("toPublicTask strips correctIndex", () => {
    const t = buildMCQ(input);
    const pub = toPublicTask(t);
    expect((pub as any).correctIndex).toBeUndefined();
  });
});

describe("Cloze", () => {
  const input = {
    word: "abundant",
    vocabularyId: "vocab_1",
    sentence: "The forest had abundant wildlife.",
  };

  it("marks the blank at the target token", () => {
    const t = buildCloze(input);
    expect(t.context).toContain("______");
    expect(t.correctAnswer).toBe("abundant");
  });

  it("scores exact case-sensitive match as recall=1 exact", () => {
    const t = buildCloze(input);
    expect(scoreCloze(t, "abundant")).toMatchObject({ recall: 1, matchType: "exact" });
  });

  it("case-insensitive still counts but tagged case_insensitive", () => {
    const t = buildCloze(input);
    expect(scoreCloze(t, "Abundant")).toMatchObject({ recall: 1, matchType: "case_insensitive" });
    expect(scoreCloze(t, "ABUNDANT")).toMatchObject({ recall: 1, matchType: "case_insensitive" });
  });

  it("accepts declared variants", () => {
    const t = buildCloze({ ...input, acceptedVariants: ["abounding"] });
    expect(scoreCloze(t, "abounding")).toMatchObject({ recall: 1, matchType: "variant" });
  });

  it("allows one-edit typo on words >= 5 chars", () => {
    const t = buildCloze(input); // 'abundant' is 8 chars
    expect(scoreCloze(t, "abundnt")).toMatchObject({ recall: 1, matchType: "variant" });    // one deletion
    expect(scoreCloze(t, "abunndant")).toMatchObject({ recall: 1, matchType: "variant" });  // one insertion
    expect(scoreCloze(t, "abundent")).toMatchObject({ recall: 1, matchType: "variant" });   // one substitution
  });

  it("does NOT allow typo tolerance on short words", () => {
    const t = buildCloze({ word: "cat", vocabularyId: "v", sentence: "the cat ran" });
    expect(scoreCloze(t, "cot")).toMatchObject({ recall: 0 }); // would be 1-edit but word < 5 chars
  });

  it("rejects two-edit typos", () => {
    const t = buildCloze(input);
    expect(scoreCloze(t, "abunndent")).toMatchObject({ recall: 0 }); // two edits
  });

  it("strips trailing punctuation from answer", () => {
    const t = buildCloze(input);
    expect(scoreCloze(t, "abundant.")).toMatchObject({ recall: 1 });
  });

  it("empty answer is recall=0", () => {
    const t = buildCloze(input);
    expect(scoreCloze(t, "   ")).toMatchObject({ recall: 0, matchType: "no_match" });
  });
});

describe("ConstrainedGen", () => {
  const input = {
    word: "abundant",
    vocabularyId: "vocab_1",
    maxWords: 10,
  };

  it("rejects answers exceeding maxWords", () => {
    const t = buildConstrainedGen(input);
    const long = "one two three four five six seven eight nine ten eleven twelve";
    expect(scoreConstrainedGen(t, long)).toMatchObject({ needsJudge: false, recall: 0 });
  });

  it("rejects answers missing the lemma", () => {
    const t = buildConstrainedGen(input);
    expect(scoreConstrainedGen(t, "the forest was full of life")).toMatchObject({ recall: 0, needsJudge: false });
  });

  it("accepts sentence containing lemma → needsJudge=true", () => {
    const t = buildConstrainedGen(input);
    const r = scoreConstrainedGen(t, "The forest had abundant wildlife");
    expect(r.needsJudge).toBe(true);
    expect(r.recall).toBe(1); // tentative; judge may downgrade
  });

  it("rejects verbatim echoes of shown examples", () => {
    const t = buildConstrainedGen(input);
    const answer = "The forest had abundant wildlife";
    expect(scoreConstrainedGen(t, answer, [answer])).toMatchObject({ recall: 0, needsJudge: false });
  });

  it("accepts inflected form via startsWith", () => {
    const t = buildConstrainedGen({ word: "run", vocabularyId: "v", mustContainLemma: "run" });
    const r = scoreConstrainedGen(t, "she was running fast");
    expect(r.needsJudge).toBe(true);
  });
});

describe("Paraphrase", () => {
  const passage = "Abundant wildlife filled the forest and many species thrived in its dense canopy.";
  const input = {
    word: "abundant",
    vocabularyId: "vocab_1",
    passage,
    minWords: 5,
    maxWords: 30,
  };

  it("rejects too-short answers", () => {
    const t = buildParaphrase(input);
    expect(scoreParaphrase(t, "abundant forest")).toMatchObject({ recall: 0, needsJudge: false });
  });

  it("rejects too-long answers", () => {
    const t = buildParaphrase(input);
    const long = Array(40).fill("word").join(" ") + " abundant";
    expect(scoreParaphrase(t, long)).toMatchObject({ recall: 0, needsJudge: false });
  });

  it("rejects answer missing the target word", () => {
    const t = buildParaphrase(input);
    expect(
      scoreParaphrase(t, "the trees held many creatures that lived in the leaves and moved between branches")
    ).toMatchObject({ recall: 0, needsJudge: false });
  });

  it("rejects near-copies via Jaccard > threshold", () => {
    const t = buildParaphrase(input);
    // literal near-copy — should hit the overlap ceiling
    const copy = "Abundant wildlife filled the forest and many species thrived in its canopy";
    const r = scoreParaphrase(t, copy);
    expect(r.recall).toBe(0);
    expect(r.needsJudge).toBe(false);
  });

  it("accepts genuine rephrasing → needsJudge=true", () => {
    const t = buildParaphrase(input);
    const rephrase = "So many kinds of animals lived among leafy branches that the woods felt abundant";
    const r = scoreParaphrase(t, rephrase);
    expect(r.needsJudge).toBe(true);
  });

  it("overlap threshold is exposed as 0.70", () => {
    expect(PARAPHRASE_OVERLAP_MAX).toBe(0.7);
  });
});

describe("timing", () => {
  it("clamps below-min and above-max to bounds", () => {
    expect(clampElapsed(0)).toBe(MIN_PLAUSIBLE_ELAPSED_MS);
    expect(clampElapsed(9_999_999)).toBe(MAX_PLAUSIBLE_ELAPSED_MS);
    expect(clampElapsed(NaN)).toBe(MAX_PLAUSIBLE_ELAPSED_MS);
  });

  it("isPlausibleElapsed rejects extremes", () => {
    expect(isPlausibleElapsed(0)).toBe(false);
    expect(isPlausibleElapsed(150)).toBe(false);
    expect(isPlausibleElapsed(2500)).toBe(true);
    expect(isPlausibleElapsed(400_000)).toBe(false);
    expect(isPlausibleElapsed(Number.POSITIVE_INFINITY)).toBe(false);
  });
});
