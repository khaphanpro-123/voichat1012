// lib/posttestBuilder.ts
// Posttest item set for the DART-RCT (Ngày 24).
//
// PRE-REGISTER NOTE: FORM_VERSION, word assignments, and item prompts are
// fixed at study launch and MUST NOT change after data collection starts.
// Any amendment requires IRB approval and a new formVersion.
//
// ── Item set design ──────────────────────────────────────────────────────────
//
// 60 target words split across 3 test forms (immediate + delayed):
//
//   Section 1 — Recall MCQ     (20 items: w_001–010 + w_031–040)
//     Given the word, choose the correct definition. Auto-scored (1/0).
//
//   Section 2 — Cloze Fill     (20 items: w_011–020 + w_041–050)
//     Fill in the blank in a sentence. Uses sentences[1] from the word bank
//     (a different sentence than sentences[0] used in training). Auto-scored.
//
//   Section 3 — Context Transfer (10 items: w_021–025 + w_051–055)
//     Write 2-3 sentences responding to a NEW scenario using the target word.
//     Always sent to LLM judge + human rater (isBlindGraded=true).
//
//   Delayed posttest (week 10):  w_026–030 + w_056–060 (same 3-section format)
//     These words appear ONLY at the delayed posttest — not in immediate form.
//
// Total scored at week 8: 50 items (20 recall + 20 cloze + 10 transfer).
// Total scored at week 10: 10 additional delayed words (+ transfer repeats).

import { WORD_BANK, getWordById, WordEntry } from "@/lib/wordBank";
import { buildMCQ, scoreMCQ } from "@/lib/retrievalTasks/mcq";
import { buildCloze, scoreCloze } from "@/lib/retrievalTasks/cloze";

// ── Form version — pre-register and freeze ───────────────────────────────────
export const FORM_VERSION = "posttest_v1.0";

// ── Item set word ID assignments ─────────────────────────────────────────────
/** Section 1: Recall MCQ items (10 B1 + 10 B2) */
export const RECALL_WORD_IDS = [
  "w_001","w_002","w_003","w_004","w_005",
  "w_006","w_007","w_008","w_009","w_010",
  "w_031","w_032","w_033","w_034","w_035",
  "w_036","w_037","w_038","w_039","w_040",
] as const;

/** Section 2: Cloze Fill items (10 B1 + 10 B2), uses sentences[1] as source */
export const CLOZE_WORD_IDS = [
  "w_011","w_012","w_013","w_014","w_015",
  "w_016","w_017","w_018","w_019","w_020",
  "w_041","w_042","w_043","w_044","w_045",
  "w_046","w_047","w_048","w_049","w_050",
] as const;

/** Words tested only at delayed posttest (week 10) */
export const DELAYED_WORD_IDS = [
  "w_026","w_027","w_028","w_029","w_030",
  "w_056","w_057","w_058","w_059","w_060",
] as const;

// ── Section 3: Context Transfer — new scenario prompts ───────────────────────
// These scenarios do NOT appear in the word bank or training materials.
// They place the target word in a domain the learner has not explicitly studied.
// Rubric: form (0-2) + meaning (0-2) + contextFit (0-2) per item → max 6 each.

export interface ContextTransferItem {
  itemId: string;
  wordId: string;
  word: string;
  scenario: string;      // short situation description shown to participant
  prompt: string;        // full prompt
  minWords: number;
  maxWords: number;
}

export const CONTEXT_TRANSFER_ITEMS: ContextTransferItem[] = [
  // ── B1 words ──────────────────────────────────────────────────────────────
  {
    itemId: "ct_w_021", wordId: "w_021", word: "contribute",
    scenario: "A student is writing to a university scholarship committee.",
    prompt:
      "A university student is writing a letter to explain why they deserve a scholarship. " +
      "Write 2-3 sentences in which the student uses the word 'contribute' to describe " +
      "how they have helped their community.",
    minWords: 15, maxWords: 60,
  },
  {
    itemId: "ct_w_022", wordId: "w_022", word: "resolve",
    scenario: "Two colleagues are having a disagreement about how to finish a project.",
    prompt:
      "Two colleagues disagree about how to divide the remaining work on a project. " +
      "Write 2-3 sentences describing how their manager helped them, using the word 'resolve'.",
    minWords: 15, maxWords: 60,
  },
  {
    itemId: "ct_w_023", wordId: "w_023", word: "obtain",
    scenario: "Someone is applying for a visa to travel abroad.",
    prompt:
      "A person wants to travel to another country for the first time. " +
      "Write 2-3 sentences describing the steps they must take, using the word 'obtain'.",
    minWords: 15, maxWords: 60,
  },
  {
    itemId: "ct_w_024", wordId: "w_024", word: "relevant",
    scenario: "A job applicant is preparing for an interview.",
    prompt:
      "A person is preparing for a job interview at a technology company. " +
      "Write 2-3 sentences explaining what experience they should highlight, using the word 'relevant'.",
    minWords: 15, maxWords: 60,
  },
  {
    itemId: "ct_w_025", wordId: "w_025", word: "valid",
    scenario: "A customer is complaining about a product return policy.",
    prompt:
      "A customer bought a product that broke after one week but was told they cannot return it. " +
      "Write 2-3 sentences in which the customer argues their case, using the word 'valid'.",
    minWords: 15, maxWords: 60,
  },
  // ── B2 words ──────────────────────────────────────────────────────────────
  {
    itemId: "ct_w_051", wordId: "w_051", word: "justify",
    scenario: "A city is planning to build a new highway through a park.",
    prompt:
      "City planners want to build a highway through a public park, but many residents are opposed. " +
      "Write 2-3 sentences from the planners' perspective, using the word 'justify'.",
    minWords: 15, maxWords: 60,
  },
  {
    itemId: "ct_w_052", wordId: "w_052", word: "modify",
    scenario: "A software team is reviewing a product after getting user complaints.",
    prompt:
      "Users of a mobile banking app have complained that it is too complicated for elderly people. " +
      "Write 2-3 sentences describing what the development team decided to do, using the word 'modify'.",
    minWords: 15, maxWords: 60,
  },
  {
    itemId: "ct_w_053", wordId: "w_053", word: "implicit",
    scenario: "A new employee is learning the unwritten rules of an office.",
    prompt:
      "A recent graduate has just started their first job and notices there are unspoken rules " +
      "about how people behave in the office. Write 2-3 sentences about this experience, " +
      "using the word 'implicit'.",
    minWords: 15, maxWords: 60,
  },
  {
    itemId: "ct_w_054", wordId: "w_054", word: "contend",
    scenario: "A small business owner is facing multiple problems at the same time.",
    prompt:
      "A small restaurant owner faces rising food costs, a broken oven, and staff shortages " +
      "all in the same month. Write 2-3 sentences describing their situation, using the word 'contend'.",
    minWords: 15, maxWords: 60,
  },
  {
    itemId: "ct_w_055", wordId: "w_055", word: "reinforce",
    scenario: "A parent is trying to help their child develop good reading habits.",
    prompt:
      "A parent wants to help their 8-year-old child enjoy reading more. " +
      "Write 2-3 sentences describing what strategies the parent uses, using the word 'reinforce'.",
    minWords: 15, maxWords: 60,
  },
];

// ── Item builder types ────────────────────────────────────────────────────────

export type PosttestSection = "recall" | "cloze" | "contextTransfer";

export interface RecallItem {
  itemId: string;
  section: "recall";
  wordId: string;
  word: string;
  options: string[];      // 4 choices, correctIndex stripped for client
  correctIndex?: number;  // server-only
}

export interface ClozeItem {
  itemId: string;
  section: "cloze";
  wordId: string;
  word: string;
  context: string;        // sentence with "______"
  correctAnswer?: string; // server-only
}

export type PosttestItem = RecallItem | ClozeItem | ContextTransferItem & { section: "contextTransfer" };

// ── Build helpers ─────────────────────────────────────────────────────────────

/** Build all MCQ recall items. correctIndex is included (strip for client). */
export function buildRecallItems(): (RecallItem & { correctIndex: number })[] {
  return RECALL_WORD_IDS.map((wordId) => {
    const entry = getWordById(wordId);
    if (!entry) throw new Error(`Word not found: ${wordId}`);
    const task = buildMCQ({
      word: entry.word,
      vocabularyId: wordId,
      correctDefinition: entry.definition,
      distractors: entry.distractors,
      context: entry.sentences[0],
      seed: `posttest_recall_${wordId}`,  // deterministic for all participants
    });
    return {
      itemId: `recall_${wordId}`,
      section: "recall" as const,
      wordId,
      word: entry.word,
      options: task.options,
      correctIndex: task.correctIndex,
    };
  });
}

/** Build all Cloze items using sentences[1] (not the training sentence). */
export function buildClozeItems(): (ClozeItem & { correctAnswer: string })[] {
  return CLOZE_WORD_IDS.map((wordId) => {
    const entry = getWordById(wordId);
    if (!entry) throw new Error(`Word not found: ${wordId}`);
    if (entry.sentences.length < 2) {
      throw new Error(`Word ${wordId} needs ≥2 sentences for posttest cloze`);
    }
    const task = buildCloze({
      word: entry.word,
      vocabularyId: wordId,
      sentence: entry.sentences[1],  // sentences[1] — not the training sentence
      acceptedVariants: entry.collocations,
    });
    return {
      itemId: `cloze_${wordId}`,
      section: "cloze" as const,
      wordId,
      word: entry.word,
      context: task.context,
      correctAnswer: task.correctAnswer,
    };
  });
}

/** Context transfer items — prompts are pre-written in CONTEXT_TRANSFER_ITEMS. */
export function buildContextTransferItems(): (ContextTransferItem & { section: "contextTransfer" })[] {
  return CONTEXT_TRANSFER_ITEMS.map((item) => ({ ...item, section: "contextTransfer" as const }));
}

// ── Public versions (strip server-only fields for client) ──────────────────

export function toPublicRecallItem(item: RecallItem & { correctIndex: number }): RecallItem {
  const { correctIndex: _c, ...rest } = item;
  return rest;
}

export function toPublicClozeItem(item: ClozeItem & { correctAnswer: string }): ClozeItem {
  const { correctAnswer: _a, ...rest } = item;
  return rest;
}

// ── Scoring ───────────────────────────────────────────────────────────────────

export interface PosttestAnswers {
  recall: Record<string, string>;           // itemId → picked index string "0"-"3"
  cloze: Record<string, string>;            // itemId → typed answer
  contextTransfer: Record<string, string>;  // itemId → written response
}

export interface PosttestAutoScoreResult {
  recallRaw: number;           // 0..20 correct
  clozeRaw: number;            // 0..20 correct (exact + fuzzy)
  recallScore: number;         // 0-100 within section
  clozeScore: number;          // 0-100 within section
  /** Tentative context-transfer score (1 if word present + length OK, else 0). Final score set by judge. */
  ctTentativeRaw: number;      // 0..10
  /** Per-item breakdown for TestResult.items payload */
  itemResults: Array<{
    itemId: string;
    section: PosttestSection;
    userAnswer: string;
    correctAnswer: string;
    autoScore: number;
    needsJudge: boolean;
  }>;
}

export function scorePosttest(
  recallItems: (RecallItem & { correctIndex: number })[],
  clozeItems: (ClozeItem & { correctAnswer: string })[],
  ctItems: ContextTransferItem[],
  answers: PosttestAnswers
): PosttestAutoScoreResult {
  const itemResults: PosttestAutoScoreResult["itemResults"] = [];

  // ── Section 1: Recall ────────────────────────────────────────────────────
  let recallRaw = 0;
  for (const item of recallItems) {
    const userAnswer = answers.recall[item.itemId] ?? "";
    const result = scoreMCQ(
      { ...item, taskId: item.itemId, vocabularyId: item.wordId, taskType: 0 },
      userAnswer
    );
    if (result.recall === 1) recallRaw++;
    itemResults.push({
      itemId: item.itemId,
      section: "recall",
      userAnswer,
      correctAnswer: String(item.correctIndex),
      autoScore: result.autoScore,
      needsJudge: false,
    });
  }

  // ── Section 2: Cloze ─────────────────────────────────────────────────────
  let clozeRaw = 0;
  for (const item of clozeItems) {
    const userAnswer = answers.cloze[item.itemId] ?? "";
    const entry = getWordById(item.wordId)!;
    const task = buildCloze({
      word: entry.word,
      vocabularyId: item.wordId,
      sentence: entry.sentences[1],
      acceptedVariants: entry.collocations,
    });
    const result = scoreCloze(task, userAnswer);
    if (result.recall === 1) clozeRaw++;
    itemResults.push({
      itemId: item.itemId,
      section: "cloze",
      userAnswer,
      correctAnswer: item.correctAnswer,
      autoScore: result.autoScore,
      needsJudge: false,
    });
  }

  // ── Section 3: Context Transfer ───────────────────────────────────────────
  let ctTentativeRaw = 0;
  for (const item of ctItems) {
    const userAnswer = answers.contextTransfer[item.itemId] ?? "";
    const wordCount = userAnswer.trim().split(/\s+/).filter(Boolean).length;
    const hasWord = userAnswer.toLowerCase().includes(item.word.toLowerCase());
    const lengthOk = wordCount >= item.minWords && wordCount <= item.maxWords;
    const tentativeScore = hasWord && lengthOk ? 1 : 0;
    if (tentativeScore) ctTentativeRaw++;
    itemResults.push({
      itemId: item.itemId,
      section: "contextTransfer",
      userAnswer,
      correctAnswer: "",         // no single correct answer — judge scores rubric
      autoScore: tentativeScore,
      needsJudge: true,
    });
  }

  return {
    recallRaw,
    clozeRaw,
    recallScore: Math.round((recallRaw / recallItems.length) * 100),
    clozeScore: Math.round((clozeRaw / clozeItems.length) * 100),
    ctTentativeRaw,
    itemResults,
  };
}

/**
 * Compute totalScore for TestResult (auto-portion only).
 * Context transfer is weighted at 30% of total — pending judge score fills it in.
 * Until judged, contextTransfer section uses tentative auto score.
 */
export function computeTotalScore(
  recallRaw: number,
  clozeRaw: number,
  ctTentativeRaw: number,
  recallMax = RECALL_WORD_IDS.length,
  clozeMax = CLOZE_WORD_IDS.length,
  ctMax = CONTEXT_TRANSFER_ITEMS.length
): number {
  const autoWeight = 0.70;   // recall + cloze combined
  const ctWeight = 0.30;     // context transfer
  const autoScore = ((recallRaw + clozeRaw) / (recallMax + clozeMax)) * 100;
  const ctScore = (ctTentativeRaw / ctMax) * 100;
  return Math.round(autoScore * autoWeight + ctScore * ctWeight);
}
