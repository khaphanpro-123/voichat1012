// app/api/research/posttest/submit/route.ts
// Accept and score a posttest submission.
//
// Auth: Bearer participant token.
// Idempotent per (participantCode, testType): duplicate submissions are rejected
// with 409 (not silently overwritten — prevents participant re-taking the test).
//
// Flow:
//   1. Validate auth + body
//   2. Check not already submitted (unique index guard)
//   3. Build server-side item keys (answer key), score Sections 1+2 auto
//   4. Section 3 (context transfer): tentative auto-score, mark needsJudge
//   5. Save TestResult to DB
//   6. Return auto scores; contextTransfer score updates later when judge runs

import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import TestResult from "@/app/models/TestResult";
import Participant from "@/app/models/Participant";
import {
  buildRecallItems, buildClozeItems, buildContextTransferItems,
  scorePosttest, computeTotalScore, FORM_VERSION, PosttestAnswers,
} from "@/lib/posttestBuilder";
import { verifyRequest } from "@/lib/participantAuth";

export const dynamic = "force-dynamic";

function bad(msg: string, status = 400) {
  return NextResponse.json({ success: false, message: msg }, { status });
}

export async function POST(req: NextRequest) {
  const participantCode = verifyRequest(req.headers.get("authorization"));
  if (!participantCode) return bad("Unauthorized", 401);

  let body: {
    testType: "posttest_immediate" | "posttest_delayed";
    answers: PosttestAnswers;
    administeredAt: string;
  };
  try {
    body = await req.json();
  } catch {
    return bad("Invalid JSON");
  }

  if (!["posttest_immediate", "posttest_delayed"].includes(body.testType)) {
    return bad("testType must be posttest_immediate or posttest_delayed");
  }
  if (!body.answers || typeof body.answers !== "object") return bad("answers required");
  if (!body.administeredAt) return bad("administeredAt required");

  try {
    await connectDB();

    // 1. Confirm participant is enrolled and active
    const participant = await Participant.findOne({ participantCode }).lean();
    if (!participant) return bad("Unknown participant", 403);
    if ((participant as any).dropoutAt) return bad("Participant has withdrawn", 403);

    // 2. Idempotency: reject if already submitted
    const existing = await TestResult.findOne({ participantCode, testType: body.testType }).lean();
    if (existing) {
      return NextResponse.json(
        { success: false, message: "Posttest already submitted", alreadySubmitted: true },
        { status: 409 }
      );
    }

    // 3. Build server-side items (includes correctIndex/correctAnswer)
    const recallItems = buildRecallItems();
    const clozeItems = buildClozeItems();
    const ctItems = buildContextTransferItems();

    // 4. Score
    const scored = scorePosttest(recallItems, clozeItems, ctItems, body.answers);
    const totalScore = computeTotalScore(scored.recallRaw, scored.clozeRaw, scored.ctTentativeRaw);

    // 5. Build TestResult.items payload (prompt from word bank sentences / CT scenarios)
    const recallItemsMap = Object.fromEntries(recallItems.map((i) => [i.itemId, i]));
    const clozeItemsMap = Object.fromEntries(clozeItems.map((i) => [i.itemId, i]));
    const ctItemsMap = Object.fromEntries(ctItems.map((i) => [i.itemId, i]));

    const items = scored.itemResults.map((r) => {
      let prompt = "";
      let correctAnswer = r.correctAnswer;
      if (r.section === "recall") {
        const ri = recallItemsMap[r.itemId];
        prompt = `Definition of "${ri.word}"? Options: ${ri.options.join(" | ")}`;
      } else if (r.section === "cloze") {
        const ci = clozeItemsMap[r.itemId];
        prompt = ci.context;
      } else {
        const ct = ctItemsMap[r.itemId];
        prompt = ct.prompt;
        correctAnswer = "[open-ended, judged]";
      }
      return {
        itemId: r.itemId,
        section: r.section,
        prompt,
        correctAnswer,
        userAnswer: r.userAnswer,
        autoScore: r.autoScore,
        judgeScoreIds: [],
      };
    });

    // 6. Save
    const doc = await TestResult.create({
      participantCode,
      testType: body.testType,
      items,
      totalScore,
      sectionScores: {
        recall: scored.recallScore,
        cloze: scored.clozeScore,
        contextTransfer: null,  // pending judge
      },
      administeredAt: new Date(body.administeredAt),
      formVersion: FORM_VERSION,
      isBlindGraded: true,
    });

    // 7. Update participant activity
    Participant.updateOne(
      { participantCode },
      { $set: { lastActiveAt: new Date() } }
    ).catch((e) => console.warn("Participant lastActiveAt update failed:", e));

    return NextResponse.json({
      success: true,
      id: doc._id,
      formVersion: FORM_VERSION,
      scores: {
        recall: scored.recallScore,
        cloze: scored.clozeScore,
        contextTransfer: null,  // pending LLM + human judge
        totalAuto: totalScore,
      },
      breakdown: {
        recallCorrect: scored.recallRaw,
        recallTotal: recallItems.length,
        clozeCorrect: scored.clozeRaw,
        clozeTotal: clozeItems.length,
        contextTransferPending: ctItems.length,
      },
      note: "Context transfer section will be scored by a judge. Final total score updated within 48 hours.",
    });
  } catch (err: any) {
    // Unique index violation — already submitted
    if (err?.code === 11000) {
      return NextResponse.json(
        { success: false, message: "Posttest already submitted", alreadySubmitted: true },
        { status: 409 }
      );
    }
    console.error("/api/research/posttest/submit error:", err);
    return bad("Server error", 500);
  }
}
