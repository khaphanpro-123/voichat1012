// app/api/research/pretest/score/route.ts
// Server-side scoring for the CEFR placement test.
// No auth required (pre-enrolment). Returns score + cefrLevel + submissionId.
// The answer key lives only in lib/pretestItems.ts — never sent to client.
//
// D-016 (2026-08-13): each valid score is persisted as a PretestSubmission
// so /api/research/enrol can verify the score server-side instead of trusting
// the client-supplied pretestScore. Client stores `submissionId` and posts it
// back in the enrol body; server re-fetches, verifies, marks used.

import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { scorePretestAnswers, PRETEST_ITEMS } from "@/lib/pretestItems";
import { connectDB } from "@/lib/db";
import PretestSubmission from "@/app/models/PretestSubmission";

export const dynamic = "force-dynamic";

interface ScoreRequest {
  // Map of itemId → picked option index (0-3)
  answers: Record<string, number>;
  completedAt?: string;  // ISO, recorded for audit
}

function bad(msg: string) {
  return NextResponse.json({ success: false, message: msg }, { status: 400 });
}

/** Deterministic canonical hash of the answers dict — used to audit tampering. */
function hashAnswers(answers: Record<string, number>): string {
  const canonical = Object.keys(answers)
    .sort()
    .map((k) => `${k}:${answers[k]}`)
    .join("|");
  return crypto.createHash("sha256").update(canonical).digest("hex");
}

/** URL-safe random id, ~22 chars — enough entropy for a 1-of-N single-use token. */
function newSubmissionId(): string {
  return "ps_" + crypto.randomBytes(16).toString("base64url");
}

export async function POST(req: NextRequest) {
  let body: ScoreRequest;
  try {
    body = await req.json();
  } catch {
    return bad("Invalid JSON");
  }

  if (!body.answers || typeof body.answers !== "object" || Array.isArray(body.answers)) {
    return bad("answers must be an object mapping itemId → picked index");
  }

  // Validate answer values are all 0-3
  const validIds = new Set(PRETEST_ITEMS.map((i) => i.id));
  for (const [id, idx] of Object.entries(body.answers)) {
    if (!validIds.has(id)) return bad(`Unknown item id: ${id}`);
    if (typeof idx !== "number" || idx < 0 || idx > 3 || !Number.isInteger(idx)) {
      return bad(`Answer for ${id} must be integer 0–3, got ${idx}`);
    }
  }

  // Completeness gate — CEFR placement is only valid if all items answered.
  // Prevents partial submissions from silently landing in A2 stratum.
  const answeredIds = new Set(Object.keys(body.answers));
  const missing = PRETEST_ITEMS.filter((it) => !answeredIds.has(it.id)).map((it) => it.id);
  if (missing.length > 0) {
    return bad(`Incomplete submission: ${missing.length} item(s) unanswered (first: ${missing[0]}). All ${PRETEST_ITEMS.length} items must be answered.`);
  }

  // Validate completedAt if provided (defence-in-depth against Invalid Date persistence downstream)
  if (body.completedAt !== undefined) {
    if (typeof body.completedAt !== "string" || Number.isNaN(new Date(body.completedAt).getTime())) {
      return bad("completedAt must be a valid ISO date string");
    }
  }

  const result = scorePretestAnswers(body.answers);
  const submissionId = newSubmissionId();
  const answersHash = hashAnswers(body.answers);

  // Persist for /enrol verification. Non-fatal if DB is unreachable — still
  // return the score so the flow doesn't hard-fail during dev; but flag the
  // response so caller knows the submissionId isn't verifiable.
  let persisted = true;
  try {
    await connectDB();
    await PretestSubmission.create({
      submissionId,
      score: result.score,
      cefrLevel: result.cefrLevel,
      correct: result.correct,
      total: result.total,
      itemCount: Object.keys(body.answers).length,
      answersHash,
      clientCompletedAt: body.completedAt ? new Date(body.completedAt) : undefined,
      serverScoredAt: new Date(),
      used: false,
    });
  } catch (err) {
    console.error("[pretest/score] persist failed:", err);
    persisted = false;
  }

  return NextResponse.json({
    success: true,
    submissionId,
    persisted,
    score: result.score,
    cefrLevel: result.cefrLevel,
    correct: result.correct,
    total: result.total,
    completedAt: body.completedAt ?? new Date().toISOString(),
  });
}
