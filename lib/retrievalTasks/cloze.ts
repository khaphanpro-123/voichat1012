// lib/retrievalTasks/cloze.ts
//
// d=1: Cloze single-blank.
//
// The learner types the missing target word into one blank in a sentence.
// Harder than MCQ because the learner has to produce the surface form, not
// just recognise it — but easier than d=2/3 because the sentence heavily
// constrains the answer.
//
// Scoring is fuzzy on purpose. L2 learners frequently make morphology or
// spelling slips that don't reflect not knowing the word:
//   - Case insensitive
//   - Trim whitespace
//   - Accept common variants (caller supplies)
//   - Accept Levenshtein distance = 1 for words ≥ 5 chars (typo tolerance)
//
// Sub-1 Levenshtein is a common convention in vocabulary research (Nation
// 2001) but MUST be pre-registered. Anything looser gets called "fishing" by
// reviewers.

import crypto from "crypto";
import { ClozeTask, TaskScoreResult } from "./types";

export interface ClozeInput {
  word: string;
  vocabularyId: string;
  sentence: string;              // the full sentence (target word appears once)
  contextId?: string;
  acceptedVariants?: string[];   // e.g. ["runs", "running", "ran"] for "run"
}

function taskIdOf(input: ClozeInput): string {
  const key = `${input.vocabularyId}|${input.contextId ?? ""}|cloze`;
  return crypto.createHash("sha256").update(key).digest("hex").slice(0, 16);
}

/** Find the target word in the sentence and record its token index. */
function findBlankIndex(sentence: string, word: string): number {
  const tokens = sentence.split(/\s+/);
  const idx = tokens.findIndex((t) => t.toLowerCase().replace(/[.,!?;:]$/g, "") === word.toLowerCase());
  if (idx < 0) {
    throw new Error(`buildCloze: target word "${word}" not found in sentence`);
  }
  return idx;
}

export function buildCloze(input: ClozeInput): ClozeTask {
  const blankIndex = findBlankIndex(input.sentence, input.word);
  const tokens = input.sentence.split(/\s+/);
  // Preserve trailing punctuation on the blank so the learner sees natural text.
  const original = tokens[blankIndex];
  const trailing = original.match(/[.,!?;:]$/)?.[0] ?? "";
  tokens[blankIndex] = "______" + trailing;
  const displayed = tokens.join(" ");

  return {
    taskId: taskIdOf(input),
    variant: 1,
    word: input.word,
    vocabularyId: input.vocabularyId,
    contextId: input.contextId,
    prompt: `Điền từ còn thiếu vào chỗ trống:`,
    context: displayed,
    blankIndex,
    correctAnswer: input.word,
    acceptedVariants: input.acceptedVariants,
    createdAt: new Date().toISOString(),
  };
}

/** One-edit Levenshtein used for typo tolerance on words ≥ 5 chars. */
function isOneEdit(a: string, b: string): boolean {
  if (Math.abs(a.length - b.length) > 1) return false;
  const [shorter, longer] = a.length <= b.length ? [a, b] : [b, a];
  let i = 0, j = 0, edits = 0;
  while (i < shorter.length && j < longer.length) {
    if (shorter[i] === longer[j]) {
      i++; j++;
    } else {
      edits++;
      if (edits > 1) return false;
      if (shorter.length === longer.length) { i++; j++; }
      else { j++; }
    }
  }
  return edits + (longer.length - j) + (shorter.length - i) <= 1;
}

export function scoreCloze(task: ClozeTask, answer: string): TaskScoreResult {
  const raw = answer.trim();
  if (!raw) return { recall: 0, autoScore: 0, needsJudge: false, matchType: "no_match" };

  const norm = raw.toLowerCase().replace(/[.,!?;:]$/g, "");
  const target = task.correctAnswer.toLowerCase();

  if (norm === target) {
    // Case-insensitive exact match — distinguish from case-sensitive
    return {
      recall: 1,
      autoScore: 1,
      needsJudge: false,
      matchType: raw === task.correctAnswer ? "exact" : "case_insensitive",
    };
  }

  if (task.acceptedVariants?.some((v) => v.toLowerCase() === norm)) {
    return { recall: 1, autoScore: 1, needsJudge: false, matchType: "variant" };
  }

  // Typo tolerance only for words ≥ 5 chars (one edit on "cat" is any 3-letter word)
  if (target.length >= 5 && isOneEdit(norm, target)) {
    return { recall: 1, autoScore: 0.75, needsJudge: false, matchType: "variant" };
  }

  return { recall: 0, autoScore: 0, needsJudge: false, matchType: "no_match" };
}
