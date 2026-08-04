// lib/retrievalTasks/mcq.ts
//
// d=0: Multiple-choice recognition.
//
// The learner picks the correct meaning (or the correct example) from 4
// choices. This is the easiest retrieval — cue is rich, the target sits right
// on screen among distractors.
//
// Distractor quality matters a lot. If distractors are obviously wrong the
// task is trivial and adds no information about half-life. Guidance:
//   - Same part of speech as the target
//   - Similar CEFR level
//   - Semantically related but distinguishable (not synonyms — synonyms make
//     the item unanswerable)
//
// Distractor sourcing is the caller's job — this module only assembles and
// scores. See app/api/research/study/generate/route.ts for how they come out
// of the vocabulary pool.

import crypto from "crypto";
import { MCQTask, TaskScoreResult } from "./types";

export interface MCQInput {
  word: string;
  vocabularyId: string;
  correctDefinition: string;
  distractors: string[];         // must have exactly 3
  context: string;               // example sentence containing the word
  contextId?: string;
  /** Deterministic shuffle seed. Same taskId → same option order. */
  seed?: string;
}

function taskIdOf(input: MCQInput): string {
  const key = `${input.vocabularyId}|${input.contextId ?? ""}|mcq|${input.seed ?? ""}`;
  return crypto.createHash("sha256").update(key).digest("hex").slice(0, 16);
}

/**
 * Deterministic Fisher-Yates shuffle so the same taskId always produces the
 * same option order — needed so a page refresh or a race-loser retry sees the
 * identical prompt (avoids the participant memorising the "first option is
 * correct" tell).
 */
function seededShuffle<T>(arr: T[], seedStr: string): T[] {
  const hash = crypto.createHash("sha256").update(seedStr).digest();
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = hash[i % hash.length] % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function buildMCQ(input: MCQInput): MCQTask {
  if (input.distractors.length !== 3) {
    throw new Error(`buildMCQ: need exactly 3 distractors, got ${input.distractors.length}`);
  }
  const taskId = taskIdOf(input);
  const raw = [input.correctDefinition, ...input.distractors];
  const seed = input.seed ?? taskId;
  const shuffled = seededShuffle(raw, seed);
  const correctIndex = shuffled.indexOf(input.correctDefinition);
  if (correctIndex < 0) {
    throw new Error("buildMCQ: correct answer lost in shuffle (duplicate distractor?)");
  }
  return {
    taskId,
    variant: 0,
    word: input.word,
    vocabularyId: input.vocabularyId,
    contextId: input.contextId,
    prompt: `Nghĩa nào phù hợp nhất với từ "${input.word}" trong câu dưới đây?`,
    context: input.context,
    options: shuffled,
    correctIndex,
    createdAt: new Date().toISOString(),
  };
}

/** Learner submits the picked index as a string ("0".."3"). */
export function scoreMCQ(task: MCQTask, answer: string): TaskScoreResult {
  const picked = Number.parseInt(answer, 10);
  if (!Number.isInteger(picked) || picked < 0 || picked > 3) {
    return { recall: 0, autoScore: 0, needsJudge: false, matchType: "no_match" };
  }
  const correct = picked === task.correctIndex;
  return {
    recall: correct ? 1 : 0,
    autoScore: correct ? 1 : 0,
    needsJudge: false,
    matchType: correct ? "exact" : "no_match",
  };
}
