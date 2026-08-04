// lib/retrievalTasks/paraphrase.ts
//
// d=3: Paraphrase.
//
// Learner re-expresses a 2-3 sentence passage using the target word IN THEIR
// OWN WORDS. Hardest of the four — requires deep semantic understanding, not
// just recognition or reproduction.
//
// Gated on CEFR ≥ B1: A2 learners can't reliably paraphrase, and forcing them
// to try produces noise that inflates variance without adding signal about
// half-life. If your assignment ever schedules d=3 for an A2 learner, that's
// a scheduler bug — the session runner refuses it (see session.ts).
//
// Scoring is entirely LLM-Judge. Auto-check only enforces:
//   1. Word count in [minWords, maxWords]
//   2. Contains the target lemma
//   3. NOT >70% word-overlap with the source passage (that's copy, not paraphrase)
//
// The 70% overlap threshold is a defensible floor from paraphrase-detection
// literature (Dolan & Brockett 2005 used 30% for the harder direction).
// Pre-register this value.

import crypto from "crypto";
import { ParaphraseTask, TaskScoreResult } from "./types";

export interface ParaphraseInput {
  word: string;
  vocabularyId: string;
  passage: string;               // 2-3 sentences
  contextId?: string;
  minWords?: number;             // default 10
  maxWords?: number;             // default 40
}

function taskIdOf(input: ParaphraseInput): string {
  const key = `${input.vocabularyId}|${input.contextId ?? ""}|para`;
  return crypto.createHash("sha256").update(key).digest("hex").slice(0, 16);
}

export function buildParaphrase(input: ParaphraseInput): ParaphraseTask {
  const minWords = input.minWords ?? 10;
  const maxWords = input.maxWords ?? 40;
  return {
    taskId: taskIdOf(input),
    variant: 3,
    word: input.word,
    vocabularyId: input.vocabularyId,
    contextId: input.contextId,
    prompt: `Diễn giải đoạn văn dưới đây bằng lời của chính bạn (${minWords}–${maxWords} từ), sao cho vẫn dùng từ "${input.word}" và giữ đúng ý.`,
    context: input.passage,
    passageToParaphrase: input.passage,
    minWords,
    maxWords,
    createdAt: new Date().toISOString(),
  };
}

/** Bag-of-words Jaccard similarity — cheap way to detect copy-paste paraphrase. */
function wordOverlapRatio(a: string, b: string): number {
  const toks = (s: string) =>
    new Set(
      s
        .toLowerCase()
        .replace(/[.,!?;:()"']/g, " ")
        .split(/\s+/)
        .filter((t) => t.length > 2) // ignore function words shorter than 3 chars
    );
  const A = toks(a);
  const B = toks(b);
  if (A.size === 0 || B.size === 0) return 0;
  let inter = 0;
  for (const t of A) if (B.has(t)) inter++;
  const union = A.size + B.size - inter;
  return union === 0 ? 0 : inter / union;
}

export const PARAPHRASE_OVERLAP_MAX = 0.70;

export function scoreParaphrase(
  task: ParaphraseTask,
  answer: string
): TaskScoreResult {
  const trimmed = answer.trim();
  if (!trimmed) return { recall: 0, autoScore: 0, needsJudge: false, matchType: "no_match" };

  const wordCount = trimmed.split(/\s+/).length;
  if (wordCount < task.minWords || wordCount > task.maxWords) {
    return { recall: 0, autoScore: 0, needsJudge: false, matchType: "no_match" };
  }

  const containsLemma = trimmed
    .toLowerCase()
    .split(/\W+/)
    .some((tok) => tok === task.word.toLowerCase() || tok.startsWith(task.word.toLowerCase()));
  if (!containsLemma) {
    return { recall: 0, autoScore: 0, needsJudge: false, matchType: "no_match" };
  }

  const overlap = wordOverlapRatio(trimmed, task.passageToParaphrase);
  if (overlap > PARAPHRASE_OVERLAP_MAX) {
    // Too close to a copy — reject before it wastes a judge call.
    return { recall: 0, autoScore: 0, needsJudge: false, matchType: "no_match" };
  }

  // Passes auto — judge decides.
  return {
    recall: 1,
    autoScore: undefined,
    needsJudge: true,
    matchType: "exact",
  };
}
