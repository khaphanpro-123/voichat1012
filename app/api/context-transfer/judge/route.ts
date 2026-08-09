// app/api/context-transfer/judge/route.ts
//
// LLM-as-a-Judge endpoint — paper Sec 2.5 and RQ3.
//
// Ngày 11 refactor (D-008): synchronous LLM call replaced by MongoDB-backed
// async queue. POST now returns {jobId} in <2s (no LLM call in the request
// path). Client polls GET /api/context-transfer/judge/status?jobId=... to
// retrieve scores when ready.
//
// Backward-compat: if the body includes ?sync=1 as a query param, we run
// synchronously — kept only for the DART/CARTS Lab UI's demo tab which
// expects immediate feedback and doesn't need queue behaviour.

import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import ReviewLog from "@/app/models/ReviewLog";
import { judgeContextTransfer, type JudgeScores } from "@/lib/contextTransferJudge";
import { enqueueJudgeJob, kickWorker } from "@/lib/judgeQueue";

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

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();
    const {
      word,
      learnerSentence,
      targetContext,
      reference,
      userId = "anonymous",
      reviewLogId,
    } = body || {};

    if (!word || !learnerSentence) {
      return NextResponse.json(
        { success: false, message: "word and learnerSentence required" },
        { status: 400 },
      );
    }

    // Sync mode — retained for the interactive lab UI where a live demo
    // is more valuable than SLA. Not used by the study pipeline.
    const url = new URL(req.url);
    if (url.searchParams.get("sync") === "1") {
      const scores = await judgeContextTransfer({ word, learnerSentence, targetContext, reference });
      if (reviewLogId) {
        try { await mirrorIntoReviewLog(reviewLogId, scores); }
        catch (err) { console.warn("Judge score persist failed:", err); }
      }
      return NextResponse.json({ success: true, scores, userId, mode: "sync" });
    }

    // Async mode — Ngày 11 default. Enqueue + kick worker (piggyback).
    const { jobId } = await enqueueJudgeJob({
      word,
      learnerSentence,
      targetContext,
      reference,
      userId,
      reviewLogId,
    });

    // Fire-and-forget; if this dies (serverless freeze), the /status polling
    // endpoint will drive progress on the next tick.
    kickWorker({ reviewLogUpdate: mirrorIntoReviewLog });

    return NextResponse.json(
      { success: true, jobId, status: "queued", mode: "async", userId },
      { status: 202 },
    );
  } catch (err) {
    console.error("judge error:", err);
    return NextResponse.json({ success: false, message: "judge failed" }, { status: 500 });
  }
}
