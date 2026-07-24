// app/api/context-transfer/judge/route.ts
// LLM-as-a-Judge endpoint — paper Sec 2.5 and RQ3.
// Also persists the scores back to ReviewLog so we can plot the linear
// improvement curve (β = 0.0191 in the paper) over the 8-week study.

import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import ReviewLog from "@/app/models/ReviewLog";
import { judgeContextTransfer } from "@/lib/contextTransferJudge";

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
      return NextResponse.json({ success: false, message: "word and learnerSentence required" }, { status: 400 });
    }

    const scores = await judgeContextTransfer({ word, learnerSentence, targetContext, reference });

    // Attach scores to the ReviewLog row (if provided) — needed for RQ3 plots.
    if (reviewLogId) {
      try {
        await ReviewLog.findByIdAndUpdate(reviewLogId, {
          $set: {
            "judge.accuracy": scores.accuracy,
            "judge.fluency": scores.fluency,
            "judge.appropriateness": scores.appropriateness,
            "judge.creativity": scores.creativity,
            "judge.composite": scores.composite,
          },
        }, { strict: false });
      } catch (err) {
        console.warn("Judge score persist failed:", err);
      }
    }

    return NextResponse.json({ success: true, scores, userId });
  } catch (err) {
    console.error("judge error:", err);
    return NextResponse.json({ success: false, message: "judge failed" }, { status: 500 });
  }
}
