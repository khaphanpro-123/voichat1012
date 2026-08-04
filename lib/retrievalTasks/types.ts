// lib/retrievalTasks/types.ts
//
// Shared types for the 4 retrieval task formats (Ngày 15–17 of PLAN_45_DAYS).
//
// The paper's α parameter modulates half-life by task difficulty d ∈ {0,1,2,3}:
//
//   d=0  MCQ recognition            (easiest — cue rich, distractors close)
//   d=1  Cloze single-blank         (moderate — one target word missing)
//   d=2  Constrained generation     (harder — produce a short sentence with the word)
//   d=3  Paraphrase                 (hardest — re-express meaning in a new context)
//
// If only some d values appear in the log, α is unidentifiable and the whole
// RQ1 argument collapses. Every scheduler MUST be able to serve at least d=0
// through d=2; d=3 gated on user's CEFR ≥ B1 (A2 can't paraphrase reliably).

export type RetrievalType = 0 | 1 | 2 | 3;

export const TASK_NAMES: Record<RetrievalType, string> = {
  0: "MCQ",
  1: "Cloze",
  2: "ConstrainedGen",
  3: "Paraphrase",
};

/**
 * All task variants share this outer envelope. Subtypes differ by `variant`
 * and by which subset of fields are populated.
 */
export interface RetrievalTaskBase {
  taskId: string;             // deterministic hash of (word, contextId, variant)
  variant: RetrievalType;
  word: string;               // target vocabulary
  vocabularyId: string;       // Mongo _id
  contextId?: string;         // for CARTS reward + judge disambiguation
  prompt: string;             // question text shown to learner (Vietnamese if instructions)
  context: string;            // sentence/passage the task is about
  createdAt: string;          // ISO — when this task was generated
}

export interface MCQTask extends RetrievalTaskBase {
  variant: 0;
  options: string[];          // exactly 4 — 1 correct, 3 distractors
  correctIndex: number;       // 0..3, kept server-side (not sent to client)
}

export interface ClozeTask extends RetrievalTaskBase {
  variant: 1;
  blankIndex: number;         // token index in `context` that's blanked
  correctAnswer: string;      // target surface form
  acceptedVariants?: string[]; // allow common misspellings / morphology
}

export interface ConstrainedGenTask extends RetrievalTaskBase {
  variant: 2;
  maxWords: number;           // hard cap, e.g. 20
  mustContainLemma: string;   // lemma the sentence must contain
}

export interface ParaphraseTask extends RetrievalTaskBase {
  variant: 3;
  passageToParaphrase: string; // 2–3 sentences
  minWords: number;
  maxWords: number;
}

export type RetrievalTask =
  | MCQTask
  | ClozeTask
  | ConstrainedGenTask
  | ParaphraseTask;

/** What the learner submits back to /api/research/review. */
export interface TaskSubmission {
  taskId: string;
  variant: RetrievalType;
  answer: string;
  elapsedMs: number;          // performance.now() delta from render to submit
}

/** Immediate scoring result (before LLM judge for d=2/3). */
export interface TaskScoreResult {
  recall: 0 | 1;              // binary for RQ1
  autoScore?: number;         // exact-match or numeric (d=0/1 have this immediately)
  needsJudge: boolean;        // d=2/3 always true — judge runs async
  matchType?: "exact" | "case_insensitive" | "variant" | "no_match";
}

// ---------------- Public-facing envelope (safe to send to client) ------------
//
// A common source of leakage: sending the correct answer inside the task
// payload so the frontend can validate locally. Never do that — sniffing the
// XHR response would reveal the answer. `PublicTask` is the version that goes
// over the wire.

export type PublicTask =
  | Omit<MCQTask, "correctIndex">
  | Omit<ClozeTask, "correctAnswer" | "acceptedVariants">
  | ConstrainedGenTask
  | ParaphraseTask;

export function toPublicTask(task: RetrievalTask): PublicTask {
  switch (task.variant) {
    case 0: {
      const { correctIndex, ...rest } = task;
      return rest;
    }
    case 1: {
      const { correctAnswer, acceptedVariants, ...rest } = task;
      return rest;
    }
    default:
      return task;
  }
}
