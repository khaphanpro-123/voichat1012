// __tests__/posttestBuilder.test.ts
// Tests for lib/posttestBuilder — item construction, scoring, and form integrity.

import {
  buildRecallItems,
  buildClozeItems,
  buildContextTransferItems,
  scorePosttest,
  computeTotalScore,
  toPublicRecallItem,
  toPublicClozeItem,
  RECALL_WORD_IDS,
  CLOZE_WORD_IDS,
  DELAYED_WORD_IDS,
  CONTEXT_TRANSFER_ITEMS,
  FORM_VERSION,
  PosttestAnswers,
} from "@/lib/posttestBuilder";
import { WORD_BANK } from "@/lib/wordBank";

// ── Form version ──────────────────────────────────────────────────────────────
describe("FORM_VERSION", () => {
  it("is a non-empty string", () => {
    expect(typeof FORM_VERSION).toBe("string");
    expect(FORM_VERSION.length).toBeGreaterThan(0);
  });
});

// ── Word ID partitioning ──────────────────────────────────────────────────────
describe("word ID partitioning", () => {
  it("no overlap between recall, cloze, and delayed sets", () => {
    const all = [
      ...RECALL_WORD_IDS,
      ...CLOZE_WORD_IDS,
      ...DELAYED_WORD_IDS,
    ];
    const unique = new Set(all);
    expect(unique.size).toBe(all.length);
  });

  it("context transfer items use words not in recall or cloze sets", () => {
    const ctWordIds = CONTEXT_TRANSFER_ITEMS.map((i) => i.wordId);
    const recallSet = new Set(RECALL_WORD_IDS as readonly string[]);
    const clozeSet = new Set(CLOZE_WORD_IDS as readonly string[]);
    for (const id of ctWordIds) {
      expect(recallSet.has(id)).toBe(false);
      expect(clozeSet.has(id)).toBe(false);
    }
  });

  it("all word IDs reference entries in WORD_BANK", () => {
    const bankIds = new Set(WORD_BANK.map((w) => w.id));
    for (const id of [...RECALL_WORD_IDS, ...CLOZE_WORD_IDS, ...DELAYED_WORD_IDS]) {
      expect(bankIds.has(id)).toBe(true);
    }
    for (const item of CONTEXT_TRANSFER_ITEMS) {
      expect(bankIds.has(item.wordId)).toBe(true);
    }
  });
});

// ── buildRecallItems ──────────────────────────────────────────────────────────
describe("buildRecallItems", () => {
  const items = buildRecallItems();

  it("returns one item per recall word ID", () => {
    expect(items).toHaveLength(RECALL_WORD_IDS.length);
  });

  it("each item has 4 options", () => {
    for (const item of items) {
      expect(item.options).toHaveLength(4);
    }
  });

  it("each item has a valid correctIndex (0-3)", () => {
    for (const item of items) {
      expect(item.correctIndex).toBeGreaterThanOrEqual(0);
      expect(item.correctIndex).toBeLessThanOrEqual(3);
    }
  });

  it("is deterministic across calls (same seed)", () => {
    const items2 = buildRecallItems();
    for (let i = 0; i < items.length; i++) {
      expect(items[i].options).toEqual(items2[i].options);
      expect(items[i].correctIndex).toBe(items2[i].correctIndex);
    }
  });

  it("toPublicRecallItem strips correctIndex", () => {
    const pub = toPublicRecallItem(items[0]);
    expect((pub as any).correctIndex).toBeUndefined();
    expect(pub.options).toBeDefined();
  });
});

// ── buildClozeItems ───────────────────────────────────────────────────────────
describe("buildClozeItems", () => {
  const items = buildClozeItems();

  it("returns one item per cloze word ID", () => {
    expect(items).toHaveLength(CLOZE_WORD_IDS.length);
  });

  it("each item context contains '______'", () => {
    for (const item of items) {
      expect(item.context).toContain("______");
    }
  });

  it("each item has a non-empty correctAnswer", () => {
    for (const item of items) {
      expect(item.correctAnswer.length).toBeGreaterThan(0);
    }
  });

  it("toPublicClozeItem strips correctAnswer", () => {
    const pub = toPublicClozeItem(items[0]);
    expect((pub as any).correctAnswer).toBeUndefined();
    expect(pub.context).toContain("______");
  });
});

// ── buildContextTransferItems ─────────────────────────────────────────────────
describe("buildContextTransferItems", () => {
  const items = buildContextTransferItems();

  it("returns 10 items", () => {
    expect(items).toHaveLength(10);
  });

  it("each item has a non-empty prompt with the target word mentioned", () => {
    for (const item of items) {
      expect(item.prompt.length).toBeGreaterThan(20);
      expect(item.prompt.toLowerCase()).toContain(item.word.toLowerCase());
    }
  });

  it("each item has valid minWords and maxWords", () => {
    for (const item of items) {
      expect(item.minWords).toBeGreaterThan(0);
      expect(item.maxWords).toBeGreaterThan(item.minWords);
    }
  });
});

// ── scorePosttest ─────────────────────────────────────────────────────────────
describe("scorePosttest", () => {
  const recallItems = buildRecallItems();
  const clozeItems = buildClozeItems();
  const ctItems = buildContextTransferItems();

  function allCorrectAnswers(): PosttestAnswers {
    const recall: Record<string, string> = {};
    for (const item of recallItems) {
      recall[item.itemId] = String(item.correctIndex);
    }
    const cloze: Record<string, string> = {};
    for (const item of clozeItems) {
      cloze[item.itemId] = item.correctAnswer;
    }
    const contextTransfer: Record<string, string> = {};
    for (const item of ctItems) {
      // Valid response: contains word, within word count bounds (minWords=15, maxWords=60)
      contextTransfer[item.itemId] =
        `In this situation the person chose to ${item.word} by taking careful and deliberate action. ` +
        `This shows how important it is to ${item.word} thoughtfully in everyday professional life.`;
    }
    return { recall, cloze, contextTransfer };
  }

  it("perfect recall answers score 100 on recall section", () => {
    const answers = allCorrectAnswers();
    const result = scorePosttest(recallItems, clozeItems, ctItems, answers);
    expect(result.recallRaw).toBe(recallItems.length);
    expect(result.recallScore).toBe(100);
  });

  it("all wrong recall answers score 0", () => {
    const answers: PosttestAnswers = { recall: {}, cloze: {}, contextTransfer: {} };
    for (const item of recallItems) {
      answers.recall[item.itemId] = String((item.correctIndex + 1) % 4);
    }
    const result = scorePosttest(recallItems, clozeItems, ctItems, answers);
    expect(result.recallRaw).toBe(0);
    expect(result.recallScore).toBe(0);
  });

  it("correct cloze answers score 100 on cloze section", () => {
    const answers = allCorrectAnswers();
    const result = scorePosttest(recallItems, clozeItems, ctItems, answers);
    expect(result.clozeRaw).toBe(clozeItems.length);
    expect(result.clozeScore).toBe(100);
  });

  it("CT items with target word and valid length get tentative score 1", () => {
    const answers = allCorrectAnswers();
    const result = scorePosttest(recallItems, clozeItems, ctItems, answers);
    expect(result.ctTentativeRaw).toBe(ctItems.length);
  });

  it("CT items missing the target word score 0", () => {
    const answers: PosttestAnswers = { recall: {}, cloze: {}, contextTransfer: {} };
    for (const item of ctItems) {
      answers.contextTransfer[item.itemId] = "I wrote something without the forbidden word here at length.";
    }
    const result = scorePosttest(recallItems, clozeItems, ctItems, answers);
    expect(result.ctTentativeRaw).toBe(0);
  });

  it("returns one itemResult per item", () => {
    const answers = allCorrectAnswers();
    const result = scorePosttest(recallItems, clozeItems, ctItems, answers);
    const total = recallItems.length + clozeItems.length + ctItems.length;
    expect(result.itemResults).toHaveLength(total);
  });

  it("CT itemResults all have needsJudge=true", () => {
    const answers = allCorrectAnswers();
    const result = scorePosttest(recallItems, clozeItems, ctItems, answers);
    const ctResults = result.itemResults.filter((r) => r.section === "contextTransfer");
    expect(ctResults.every((r) => r.needsJudge)).toBe(true);
  });

  it("recall itemResults all have needsJudge=false", () => {
    const answers = allCorrectAnswers();
    const result = scorePosttest(recallItems, clozeItems, ctItems, answers);
    const rResults = result.itemResults.filter((r) => r.section === "recall");
    expect(rResults.every((r) => !r.needsJudge)).toBe(true);
  });
});

// ── computeTotalScore ─────────────────────────────────────────────────────────
describe("computeTotalScore", () => {
  it("perfect score on all sections returns 100", () => {
    expect(computeTotalScore(20, 20, 10, 20, 20, 10)).toBe(100);
  });

  it("zero on all sections returns 0", () => {
    expect(computeTotalScore(0, 0, 0, 20, 20, 10)).toBe(0);
  });

  it("70% recall/cloze only gives ~70 (ct weight 30%)", () => {
    // 20 recall + 20 cloze correct → auto score 100, but ct 0/10
    const score = computeTotalScore(20, 20, 0, 20, 20, 10);
    expect(score).toBeCloseTo(70, 0);
  });

  it("score is 0-100", () => {
    const s = computeTotalScore(10, 10, 5, 20, 20, 10);
    expect(s).toBeGreaterThanOrEqual(0);
    expect(s).toBeLessThanOrEqual(100);
  });
});
