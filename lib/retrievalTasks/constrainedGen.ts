// lib/retrievalTasks/constrainedGen.ts
//
// d=2: Constrained generation.
//
// Learner writes a short sentence (≤ maxWords) that USES the target word
// meaningfully. Harder than cloze because the learner has to construct the
// grammatical frame themselves.
//
// Immediate auto-check (client sees instantly):
//   1. Word count ≤ maxWords
//   2. Sentence contains the target lemma (or an inflected form)
//   3. Not just a copy of an example sentence we've shown
//
// Meaningful use (does the sentence show real understanding?) — that requires
// LLM-Judge, which runs async. This module returns `needsJudge: true` so
// scoring completes in two stages.

import crypto from "crypto";
import { ConstrainedGenTask, TaskScoreResult } from "./types";

export interface ConstrainedGenInput {
  word: string;
  vocabularyId: string;
  contextId?: string;
  maxWords?: number;             // default 20
  mustContainLemma?: string;     // default = word
  /**
   * Sentences the learner has already seen for this word — we reject them if
   * echoed back verbatim (copy-paste from the example section).
   */
  seenExamples?: string[];
}

function taskIdOf(input: ConstrainedGenInput): string {
  const key = `${input.vocabularyId}|${input.contextId ?? ""}|congen`;
  return crypto.createHash("sha256").update(key).digest("hex").slice(0, 16);
}

export function buildConstrainedGen(input: ConstrainedGenInput): ConstrainedGenTask {
  const maxWords = input.maxWords ?? 20;
  const mustContainLemma = (input.mustContainLemma ?? input.word).toLowerCase();

  return {
    taskId: taskIdOf(input),
    variant: 2,
    word: input.word,
    vocabularyId: input.vocabularyId,
    contextId: input.contextId,
    prompt: `Viết một câu ngắn (không quá ${maxWords} từ) sử dụng từ "${input.word}" cho đúng nghĩa của nó.`,
    context: `Từ mục tiêu: ${input.word}`,
    maxWords,
    mustContainLemma,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Auto-check that runs BEFORE queueing the judge. If auto-check fails, we
 * still return needsJudge=false — no point burning a judge call on a sentence
 * that doesn't even contain the word.
 *
 * The "seen examples" check catches the most common form of gaming (copy-
 * pasting the example sentence).
 */
export function scoreConstrainedGen(
  task: ConstrainedGenTask,
  answer: string,
  seenExamples: string[] = []
): TaskScoreResult {
  const trimmed = answer.trim();
  if (!trimmed) return { recall: 0, autoScore: 0, needsJudge: false, matchType: "no_match" };

  const wordCount = trimmed.split(/\s+/).length;
  if (wordCount > task.maxWords) {
    return { recall: 0, autoScore: 0, needsJudge: false, matchType: "no_match" };
  }

  // Contains lemma (crude morphological match: startsWith or contains)
  const lower = trimmed.toLowerCase();
  const lemma = task.mustContainLemma.toLowerCase();
  const containsLemma =
    lower.split(/\W+/).some((tok) => tok === lemma || tok.startsWith(lemma));
  if (!containsLemma) {
    return { recall: 0, autoScore: 0, needsJudge: false, matchType: "no_match" };
  }

  // Reject verbatim copies of shown examples
  const isEcho = seenExamples.some(
    (ex) => ex.trim().toLowerCase() === lower
  );
  if (isEcho) {
    return { recall: 0, autoScore: 0, needsJudge: false, matchType: "no_match" };
  }

  // Passes auto-check → judge decides `recall` (semantic correctness).
  // We tentatively record recall=1 so the learner gets immediate positive
  // feedback; the judge may later downgrade in JudgeScore. Because RQ1 uses
  // the judge-corrected recall (see fit_dart.py --source mongo), the tentative
  // value has no analytic effect.
  return {
    recall: 1,
    autoScore: undefined,
    needsJudge: true,
    matchType: "exact",
  };
}
