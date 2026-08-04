// app/api/admin/research/judge/route.ts
// Admin endpoint to trigger LLM judging for context-transfer posttest items.
//
// GET  — list pending items (contextTransfer items with no LLM JudgeScore yet)
// POST — judge one item (or batch) by testResultId + itemId
//
// Admin-gated via middleware (role === "admin").
// The LLM judge runs synchronously here (not queued) — each call takes ~2-5s.
// For bulk grading, call POST with { batch: true } to grade all pending items.

import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import TestResult from "@/app/models/TestResult";
import JudgeScore from "@/app/models/JudgeScore";
import { runLLMJudge } from "@/lib/llmJudge";
import { CONTEXT_TRANSFER_ITEMS } from "@/lib/posttestBuilder";

export const dynamic = "force-dynamic";

const CT_ITEM_MAP = Object.fromEntries(
  CONTEXT_TRANSFER_ITEMS.map((i) => [i.itemId, i])
);

// ── GET: list pending items ────────────────────────────────────────────────────
export async function GET(_req: NextRequest) {
  await connectDB();

  // Find all TestResults that have context_transfer items
  const results = await TestResult.find({
    "items.section": "context_transfer",
  })
    .select({ participantCode: 1, testType: 1, items: 1 })
    .lean();

  // For each, check which items have no LLM JudgeScore
  const pending: Array<{
    testResultId: string;
    participantCode: string;
    testType: string;
    itemId: string;
  }> = [];

  for (const tr of results) {
    const ctItems = (tr as any).items.filter(
      (i: any) => i.section === "context_transfer"
    );
    for (const item of ctItems) {
      const hasLLMScore = await JudgeScore.exists({
        testResultId: (tr as any)._id,
        itemId: item.itemId,
        judgeType: "llm",
      });
      if (!hasLLMScore) {
        pending.push({
          testResultId: String((tr as any)._id),
          participantCode: (tr as any).participantCode,
          testType: (tr as any).testType,
          itemId: item.itemId,
        });
      }
    }
  }

  return NextResponse.json({
    success: true,
    pendingCount: pending.length,
    pending,
  });
}

// ── POST: run LLM judge ───────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  await connectDB();

  let body: { testResultId?: string; itemId?: string; batch?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, message: "Invalid JSON" }, { status: 400 });
  }

  if (body.batch) {
    // Grade all pending items
    const results = await TestResult.find({ "items.section": "context_transfer" })
      .select({ participantCode: 1, items: 1 })
      .lean();

    const judged: string[] = [];
    const failed: string[] = [];

    for (const tr of results) {
      const ctItems = (tr as any).items.filter((i: any) => i.section === "context_transfer");
      for (const item of ctItems) {
        const already = await JudgeScore.exists({
          testResultId: (tr as any)._id,
          itemId: item.itemId,
          judgeType: "llm",
        });
        if (already) continue;

        const ctDef = CT_ITEM_MAP[item.itemId];
        if (!ctDef) { failed.push(item.itemId); continue; }

        const result = await runLLMJudge({
          itemId: item.itemId,
          wordId: ctDef.wordId,
          scenario: ctDef.scenario,
          prompt: ctDef.prompt,
          userAnswer: item.userAnswer,
        });

        if (!result.parsed.valid || !result.callSucceeded) {
          console.warn(`LLM judge failed for ${item.itemId}:`, result.parsed.parseError);
          failed.push(item.itemId);
          continue;
        }

        await JudgeScore.create({
          testResultId: (tr as any)._id,
          itemId: item.itemId,
          judgeType: "llm",
          judgeId: result.judgeId,
          rubric: result.parsed.rubric,
          totalScore: result.parsed.totalScore,
          rationale: result.parsed.rationale,
          gradedAt: new Date(),
          gradingDurationMs: result.durationMs,
          isCalibrationItem: false,
        });

        // Update TestResult item's judgeScoreIds
        await TestResult.updateOne(
          { _id: (tr as any)._id, "items.itemId": item.itemId },
          { $push: { "items.$.judgeScoreIds": (await JudgeScore.findOne({ testResultId: (tr as any)._id, itemId: item.itemId, judgeType: "llm" }).select("_id"))!._id } }
        );

        judged.push(item.itemId);
      }
    }

    return NextResponse.json({ success: true, judged: judged.length, failed: failed.length, failedIds: failed });
  }

  // Single item
  if (!body.testResultId || !body.itemId) {
    return NextResponse.json({ success: false, message: "testResultId and itemId required" }, { status: 400 });
  }

  const tr = await TestResult.findById(body.testResultId).lean();
  if (!tr) {
    return NextResponse.json({ success: false, message: "TestResult not found" }, { status: 404 });
  }

  const item = (tr as any).items.find((i: any) => i.itemId === body.itemId);
  if (!item || item.section !== "context_transfer") {
    return NextResponse.json({ success: false, message: "Item not found or not context_transfer" }, { status: 404 });
  }

  const ctDef = CT_ITEM_MAP[body.itemId];
  if (!ctDef) {
    return NextResponse.json({ success: false, message: `No CT definition for ${body.itemId}` }, { status: 400 });
  }

  const result = await runLLMJudge({
    itemId: body.itemId,
    wordId: ctDef.wordId,
    scenario: ctDef.scenario,
    prompt: ctDef.prompt,
    userAnswer: item.userAnswer,
  });

  if (!result.parsed.valid) {
    return NextResponse.json({
      success: false,
      message: "LLM output could not be parsed",
      parseError: result.parsed.parseError,
      rawOutput: result.rawOutput,
    }, { status: 422 });
  }

  const scoreDoc = await JudgeScore.create({
    testResultId: body.testResultId,
    itemId: body.itemId,
    judgeType: "llm",
    judgeId: result.judgeId,
    rubric: result.parsed.rubric,
    totalScore: result.parsed.totalScore,
    rationale: result.parsed.rationale,
    gradedAt: new Date(),
    gradingDurationMs: result.durationMs,
    isCalibrationItem: false,
  });

  await TestResult.updateOne(
    { _id: body.testResultId, "items.itemId": body.itemId },
    { $push: { "items.$.judgeScoreIds": scoreDoc._id } }
  );

  return NextResponse.json({
    success: true,
    judgeScoreId: scoreDoc._id,
    rubric: result.parsed.rubric,
    totalScore: result.parsed.totalScore,
    normalizedScore: result.parsed.normalizedScore,
    rationale: result.parsed.rationale,
    judgeId: result.judgeId,
    durationMs: result.durationMs,
  });
}
