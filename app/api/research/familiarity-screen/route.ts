// app/api/research/familiarity-screen/route.ts
//
// POST — Submit word-familiarity screening responses (H5 word bank validation).
//        No auth required: screeners are external volunteers, not enrolled participants.
//        screenerId is self-reported (e.g. "S001"); one submission per screenerId (idempotent).
//
// GET  — Return the public word list (id + word + definition) for the screener UI.
//        No auth required.

import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import FamiliarityResponse from "@/app/models/FamiliarityResponse";
import { getActiveWords } from "@/lib/wordBank";

export const dynamic = "force-dynamic";

// ── GET: public word list for the screener form ───────────────────────────────
export async function GET() {
  const words = getActiveWords().map((w) => ({
    id: w.id,
    word: w.word,
    definition: w.definition,
    cefrBand: w.cefrBand,
    partOfSpeech: w.partOfSpeech,
  }));

  return NextResponse.json({ success: true, words, total: words.length });
}

// ── POST: submit familiarity responses ────────────────────────────────────────
export async function POST(req: NextRequest) {
  let body: {
    screenerId?: string;
    responses?: Record<string, boolean>;
    durationSecs?: number;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, message: "Invalid JSON" },
      { status: 400 }
    );
  }

  const { screenerId, responses, durationSecs } = body;

  // ── Validate ────────────────────────────────────────────────────────────────
  if (!screenerId || typeof screenerId !== "string" || screenerId.trim().length === 0) {
    return NextResponse.json(
      { success: false, message: "screenerId is required" },
      { status: 400 }
    );
  }

  if (!responses || typeof responses !== "object" || Array.isArray(responses)) {
    return NextResponse.json(
      { success: false, message: "responses must be an object { wordId: boolean }" },
      { status: 400 }
    );
  }

  const activeWordIds = new Set(getActiveWords().map((w) => w.id));
  const submittedIds = Object.keys(responses);

  // Must contain at least some word bank IDs
  const validIds = submittedIds.filter((id) => activeWordIds.has(id));
  if (validIds.length < 10) {
    return NextResponse.json(
      {
        success: false,
        message: `Too few valid word IDs (got ${validIds.length}, need ≥10). Ensure you are using IDs from /api/research/familiarity-screen`,
      },
      { status: 400 }
    );
  }

  // All values must be booleans
  for (const [k, v] of Object.entries(responses)) {
    if (typeof v !== "boolean") {
      return NextResponse.json(
        { success: false, message: `Value for ${k} must be boolean, got ${typeof v}` },
        { status: 400 }
      );
    }
  }

  await connectDB();

  // Idempotent: reject duplicate screenerId
  const existing = await FamiliarityResponse.findOne({ screenerId: screenerId.trim() });
  if (existing) {
    return NextResponse.json(
      {
        success: false,
        message: `Screener '${screenerId}' has already submitted. Each screener submits once.`,
        submittedAt: existing.submittedAt,
      },
      { status: 409 }
    );
  }

  const doc = await FamiliarityResponse.create({
    screenerId: screenerId.trim(),
    responses,
    metadata: {
      userAgent: req.headers.get("user-agent")?.slice(0, 300) ?? undefined,
      durationSecs: typeof durationSecs === "number" ? durationSecs : undefined,
      nWords: validIds.length,
    },
  });

  const knownCount = Object.values(responses).filter(Boolean).length;

  return NextResponse.json({
    success: true,
    screenerId: doc.screenerId,
    submittedAt: doc.submittedAt,
    totalWords: submittedIds.length,
    knownCount,
    unknownCount: submittedIds.length - knownCount,
  });
}
