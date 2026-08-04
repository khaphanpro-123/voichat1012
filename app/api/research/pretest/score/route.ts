// app/api/research/pretest/score/route.ts
// Server-side scoring for the CEFR placement test.
// No auth required (pre-enrolment). Returns score + cefrLevel.
// The answer key lives only in lib/pretestItems.ts — never sent to client.

import { NextRequest, NextResponse } from "next/server";
import { scorePretestAnswers, PRETEST_ITEMS } from "@/lib/pretestItems";

export const dynamic = "force-dynamic";

interface ScoreRequest {
  // Map of itemId → picked option index (0-3)
  answers: Record<string, number>;
  completedAt: string;  // ISO, recorded for audit
}

function bad(msg: string) {
  return NextResponse.json({ success: false, message: msg }, { status: 400 });
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

  const result = scorePretestAnswers(body.answers);

  return NextResponse.json({
    success: true,
    score: result.score,
    cefrLevel: result.cefrLevel,
    correct: result.correct,
    total: result.total,
    completedAt: body.completedAt ?? new Date().toISOString(),
  });
}
