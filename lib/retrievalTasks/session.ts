// lib/retrievalTasks/session.ts
//
// Session orchestrator — the "brain" of a study session.
//
// Given a participant + a list of due vocabulary items, this decides which
// retrieval type to serve for each item, builds the task, and (on submit)
// scores it. This is server-side; the frontend just renders whatever comes
// out of pickTaskForItem() and echoes what scoreSubmission() decides.
//
// Contracts intentionally enforced here (single point of failure):
//   - Only the participant's assigned scheduler chooses d.
//   - d=3 (paraphrase) never served to A2 learners.
//   - Serving fails-closed: if any input is malformed, refuse rather than
//     downgrade — a silent downgrade would mask coverage bugs.

import { RetrievalTask, RetrievalType, TaskScoreResult, TaskSubmission } from "./types";
import { buildMCQ, scoreMCQ, MCQInput } from "./mcq";
import { buildCloze, scoreCloze, ClozeInput } from "./cloze";
import { buildConstrainedGen, scoreConstrainedGen, ConstrainedGenInput } from "./constrainedGen";
import { buildParaphrase, scoreParaphrase, ParaphraseInput } from "./paraphrase";

export type SchedulerName = "sm2" | "hlr" | "dart";
export type CefrLevel = "A2" | "B1" | "B2";

export interface ItemContext {
  word: string;
  vocabularyId: string;
  cefrOfWord: CefrLevel;         // difficulty of the word itself
  timesReviewed: number;
  userAvgAccuracy: number;       // 0-1
  contextId?: string;
}

export interface SessionContext {
  participantCefr: CefrLevel;
  scheduler: SchedulerName;
  /** Optional forced d — used by pilot experiments and the ε-exploration path (see Ngày 38). */
  epsilonExplore?: boolean;
  /** Uniform random in [0,1] — inject from caller to keep this pure. */
  rand?: () => number;
}

/**
 * SM-2 always serves MCQ (that's what SM-2 is). HLR and DART pick d based on
 * user proficiency and word familiarity.
 *
 * NOTE: this is a heuristic, not a scheduler-native decision. The paper's
 * scheduler comparison is about *timing*, not *task type*. Task type comes
 * from a shared policy so we don't accidentally confound scheduler with the
 * quantity that α is supposed to modulate.
 */
export function pickTaskType(item: ItemContext, session: SessionContext): RetrievalType {
  // ε-exploration (Ngày 38): with probability ε pick a d uniformly from
  // the participant's eligible set. This is what makes α identifiable — see
  // research/README.md §5.
  //
  // ε bumped 0.10 → 0.20 on 2026-08-11 (D-014) because α identifiability
  // requires each retrieval-type level to appear in ≥15% of a participant's
  // logs. At ε=0.10 with a heuristic that strongly favours d=0-1, the pilot
  // simulation produced 55/43/2/0 % — d=2 and d=3 too thin to identify α.
  // With ε=0.20 uniformly over 3-4 eligible types, exploration alone yields
  // ~5-6% floor per type; combined with the mastery-driven baseline flow,
  // long-form pilots project to ≥15% each. LLT reviewers of the RQ1 α claim
  // will otherwise reject on "unidentifiable" grounds.
  const EPSILON = 0.20;
  if (session.epsilonExplore) {
    const rand = session.rand ?? Math.random;
    if (rand() < EPSILON) {
      const eligible: RetrievalType[] =
        session.participantCefr === "A2" ? [0, 1, 2] : [0, 1, 2, 3];
      return eligible[Math.floor(rand() * eligible.length)];
    }
  }

  if (session.scheduler === "sm2") return 0;

  // HLR / DART policy: escalate d as the learner shows mastery.
  const acc = item.userAvgAccuracy;
  const reps = item.timesReviewed;
  const canParaphrase = session.participantCefr !== "A2";

  if (reps === 0) return 0;                    // first exposure — MCQ
  if (acc < 0.5) return 0;                     // struggling — back to MCQ
  if (acc < 0.7) return 1;                     // ok — cloze
  if (acc < 0.85 || !canParaphrase) return 2;  // good — constrained gen
  return 3;                                    // strong — paraphrase (B1+)
}

// ---------- Build ----------

export interface BuildTaskInput {
  variant: RetrievalType;
  mcqInput?: MCQInput;
  clozeInput?: ClozeInput;
  constrainedGenInput?: ConstrainedGenInput;
  paraphraseInput?: ParaphraseInput;
}

export function buildTaskForVariant(input: BuildTaskInput): RetrievalTask {
  switch (input.variant) {
    case 0:
      if (!input.mcqInput) throw new Error("buildTaskForVariant: mcqInput required for d=0");
      return buildMCQ(input.mcqInput);
    case 1:
      if (!input.clozeInput) throw new Error("buildTaskForVariant: clozeInput required for d=1");
      return buildCloze(input.clozeInput);
    case 2:
      if (!input.constrainedGenInput)
        throw new Error("buildTaskForVariant: constrainedGenInput required for d=2");
      return buildConstrainedGen(input.constrainedGenInput);
    case 3:
      if (!input.paraphraseInput)
        throw new Error("buildTaskForVariant: paraphraseInput required for d=3");
      return buildParaphrase(input.paraphraseInput);
  }
}

// ---------- Score ----------

export function scoreSubmission(
  task: RetrievalTask,
  submission: TaskSubmission,
  seenExamples: string[] = []
): TaskScoreResult {
  if (task.taskId !== submission.taskId) {
    throw new Error(
      `scoreSubmission: taskId mismatch (task=${task.taskId} submission=${submission.taskId})`
    );
  }
  if (task.variant !== submission.variant) {
    throw new Error("scoreSubmission: variant mismatch");
  }
  switch (task.variant) {
    case 0: return scoreMCQ(task, submission.answer);
    case 1: return scoreCloze(task, submission.answer);
    case 2: return scoreConstrainedGen(task, submission.answer, seenExamples);
    case 3: return scoreParaphrase(task, submission.answer);
  }
}
