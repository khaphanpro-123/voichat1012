// app/api/context-transfer/judge/status/route.ts
//
// GET /api/context-transfer/judge/status?jobId=xxx
// Poll endpoint for the async LLM-Judge queue (Ngày 11 / D-008).
//
// Response shape:
//   200 { success: true, jobId, status, scores?, error?, queuedAt, startedAt?, completedAt? }
//   400 { success: false, message: 'jobId required' }
//   404 { success: false, message: 'job not found' }
//
// Side effect: every poll also kicks the worker once (fire-and-forget) so
// client polling doubles as the worker driver — safety net if the piggyback
// in the POST handler was killed by serverless freeze.

import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import ReviewLog from "@/app/models/ReviewLog";
import type { JudgeScores } from "@/lib/contextTransferJudge";
import { getJudgeJob, kickWorker } from "@/lib/judgeQueue";

async function mirrorIntoReviewLog(reviewLogId: string, scores: JudgeScores) {
  await ReviewLog.findByIdAndUpdate(reviewLogId, {
    $set: {
      "judge.accuracy": scores.accuracy,
      "judge.fluency": scores.fluency,
      "judge.appropriateness": scores.appropriateness,
      "judge.creativity": scores.creativity,
      "judge.composite": scores.composite,
      // Amendment #A-002: feature x[5] input for the next DART inference
      judgeComposite: Math.min(Math.max(scores.composite / 10, 0), 1),
    },
  }, { strict: false });
}

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const jobId = new URL(req.url).searchParams.get("jobId");
    if (!jobId) {
      return NextResponse.json(
        { success: false, message: "jobId required" },
        { status: 400 },
      );
    }

    const job = await getJudgeJob(jobId);
    if (!job) {
      return NextResponse.json(
        { success: false, message: "job not found" },
        { status: 404 },
      );
    }

    // Safety-net worker kick — drives progress even if the POST piggyback died.
    // Only kick when there's still work to do (job or another one might be queued).
    if (job.status === "queued") {
      kickWorker({ reviewLogUpdate: mirrorIntoReviewLog });
    }

    return NextResponse.json({
      success: true,
      jobId: job.jobId,
      status: job.status,
      scores: job.scores,
      error: job.error,
      queuedAt: job.createdAt,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
    });
  } catch (err) {
    console.error("judge status error:", err);
    return NextResponse.json({ success: false, message: "status failed" }, { status: 500 });
  }
}
