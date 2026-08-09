// lib/judgeQueue.ts
//
// Async queue for the LLM-Judge endpoint (Ngày 11 / D-008).
//
// Design in one paragraph:
//   POST /api/context-transfer/judge creates a JudgeJob (status='queued') and
//   returns {jobId} in <2s. A "worker step" (processOneJudgeJob) atomically
//   claims one queued job via findOneAndUpdate, calls judgeContextTransfer,
//   writes scores back into the job doc AND into ReviewLog.judge.* (for RQ3
//   plot compatibility), then marks the job 'completed'. The worker runs in
//   two places: (a) fire-and-forget after POST enqueue (piggyback), (b) on
//   every GET status poll (safety net if serverless killed the piggyback).
//
// Testability: the pure logic is exposed as functions that take injected
// dependencies (`deps.model`, `deps.judge`, `deps.reviewLog`). Production
// callers get sensible defaults.

import type { Model } from "mongoose";
import { randomUUID } from "crypto";

import DefaultJudgeJob, { type IJudgeJob, type JudgeJobStatus } from "@/app/models/JudgeJob";
import { judgeContextTransfer as defaultJudge, type JudgeScores } from "@/lib/contextTransferJudge";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface EnqueueInput {
  word: string;
  learnerSentence: string;
  targetContext?: string;
  reference?: string;
  userId?: string;
  reviewLogId?: string;
}

export interface JudgeQueueDeps {
  /** Mongoose model backing the queue. Default: JudgeJob. */
  model?: Model<IJudgeJob>;
  /** LLM judge fn. Default: judgeContextTransfer from lib/contextTransferJudge. */
  judge?: (input: {
    word: string;
    learnerSentence: string;
    targetContext?: string;
    reference?: string;
  }) => Promise<JudgeScores>;
  /**
   * Optional ReviewLog updater. If provided, the worker mirrors judge scores
   * into ReviewLog.judge.* on completion (keeps RQ3 plots working).
   * Signature intentionally loose to avoid a mongoose import cycle in tests.
   */
  reviewLogUpdate?: (reviewLogId: string, scores: JudgeScores) => Promise<void>;
}

function resolveDeps(deps?: JudgeQueueDeps): Required<JudgeQueueDeps> {
  return {
    model: (deps?.model ?? DefaultJudgeJob) as Model<IJudgeJob>,
    judge: deps?.judge ?? defaultJudge,
    reviewLogUpdate: deps?.reviewLogUpdate ?? (async () => { /* no-op default */ }),
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Enqueue a judge job. Returns the created jobId. Fast (<50ms typical) —
 * single insert, no LLM call.
 */
export async function enqueueJudgeJob(
  input: EnqueueInput,
  deps?: JudgeQueueDeps,
): Promise<{ jobId: string }> {
  const { model } = resolveDeps(deps);
  if (!input.word || !input.learnerSentence) {
    throw new Error("word and learnerSentence required");
  }
  const jobId = randomUUID();
  await model.create({
    jobId,
    userId: input.userId ?? "anonymous",
    word: input.word,
    learnerSentence: input.learnerSentence,
    targetContext: input.targetContext,
    reference: input.reference,
    reviewLogId: input.reviewLogId,
    status: "queued",
    retryCount: 0,
    createdAt: new Date(),
  });
  return { jobId };
}

/** Fetch a job by id. */
export async function getJudgeJob(
  jobId: string,
  deps?: JudgeQueueDeps,
): Promise<IJudgeJob | null> {
  const { model } = resolveDeps(deps);
  return model.findOne({ jobId }).lean<IJudgeJob>() as Promise<IJudgeJob | null>;
}

/**
 * Atomically claim one queued job (oldest first) and process it end-to-end.
 * Returns:
 *   - {processed: true, jobId, status}  when a job was processed
 *   - {processed: false}                 when no queued jobs
 * Never throws — errors are logged onto the job document as 'failed'.
 */
export async function processOneJudgeJob(
  deps?: JudgeQueueDeps,
): Promise<{ processed: boolean; jobId?: string; status?: JudgeJobStatus }> {
  const { model, judge, reviewLogUpdate } = resolveDeps(deps);

  // Atomic claim: flip the oldest queued job to 'processing' in a single op so
  // two concurrent workers can't grab the same job.
  const claimed = await model.findOneAndUpdate(
    { status: "queued" },
    { $set: { status: "processing", startedAt: new Date() } },
    { sort: { createdAt: 1 }, new: true },
  ).lean<IJudgeJob>();

  if (!claimed) return { processed: false };

  try {
    const scores = await judge({
      word: claimed.word,
      learnerSentence: claimed.learnerSentence,
      targetContext: claimed.targetContext,
      reference: claimed.reference,
    });

    await model.updateOne(
      { jobId: claimed.jobId },
      {
        $set: {
          status: "completed",
          completedAt: new Date(),
          scores: {
            accuracy: scores.accuracy,
            fluency: scores.fluency,
            appropriateness: scores.appropriateness,
            creativity: scores.creativity,
            composite: scores.composite,
            rationale: scores.rationale,
          },
        },
      },
    );

    // Best-effort mirror into ReviewLog.judge.* for RQ3 plot compatibility.
    if (claimed.reviewLogId) {
      try {
        await reviewLogUpdate(claimed.reviewLogId, scores);
      } catch (err) {
        // Don't fail the job just because ReviewLog mirror failed.
        // eslint-disable-next-line no-console
        console.warn("[judgeQueue] ReviewLog mirror failed for", claimed.jobId, err);
      }
    }

    return { processed: true, jobId: claimed.jobId, status: "completed" };
  } catch (err: any) {
    await model.updateOne(
      { jobId: claimed.jobId },
      {
        $set: {
          status: "failed",
          completedAt: new Date(),
          error: String(err?.message ?? err),
        },
        $inc: { retryCount: 1 },
      },
    );
    return { processed: true, jobId: claimed.jobId, status: "failed" };
  }
}

/**
 * Fire-and-forget helper for route handlers. Kicks off one worker step
 * without awaiting — safe to call from POST/GET response paths.
 *
 * Note on Vercel serverless: after the response is returned, the function
 * may be frozen before the promise settles. That's why we ALSO call this
 * from the GET status endpoint — repeated client polling drives progress
 * as a safety net.
 */
export function kickWorker(deps?: JudgeQueueDeps): void {
  // Deliberate no-await; swallow errors (already logged by processOneJudgeJob).
  processOneJudgeJob(deps).catch((err) => {
    // eslint-disable-next-line no-console
    console.warn("[judgeQueue] kickWorker error:", err);
  });
}
