// app/api/dart/schedule/route.ts
// DART inference endpoint — Algorithm 2 in x.pdf.
// GET  /api/dart/schedule?vocabularyId=...&userId=...
// POST /api/dart/schedule  body: { vocabularyId, userId, quality?, lastRetrievalType? }

import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Vocabulary from "@/app/models/Vocabulary";
import ReviewLog from "@/app/models/ReviewLog";
import { calculateNextReviewDart } from "@/lib/spacedRepetition";
import { buildFeatureVector, RetrievalType } from "@/lib/dart";
import { getDartWeights } from "@/lib/dartWeights";

const CEFR_TABLE: Record<string, number> = { A1: 0, A2: 1, B1: 2, B2: 3, C1: 4, C2: 5 };

/**
 * Amendment #A-002: look up the most recent ReviewLog with judgeComposite set
 * for this (userId, vocabularyId). Returns undefined if none — buildFeatureVector
 * then defaults to 0.5 (neutral prior).
 */
async function recentJudgeCompositeFor(userId: string, vocabularyId: string): Promise<number | undefined> {
  try {
    const last = await ReviewLog.findOne(
      { userId, vocabularyId, judgeComposite: { $exists: true, $ne: null } },
      { judgeComposite: 1 },
    )
      .sort({ createdAt: -1 })
      .lean<{ judgeComposite?: number }>();
    return typeof last?.judgeComposite === "number" ? last.judgeComposite : undefined;
  } catch {
    return undefined;
  }
}

async function featureVectorFor(vocab: any, userId: string) {
  const cefr = CEFR_TABLE[vocab.level?.toUpperCase?.()] ?? 2;
  const acc =
    vocab.timesReviewed > 0 ? vocab.timesCorrect / vocab.timesReviewed : 0.5;
  const recentJudgeComposite = await recentJudgeCompositeFor(userId, String(vocab._id));
  return buildFeatureVector({
    cefr,
    wordFrequency: 1000, // TODO: plug real corpus frequency when available
    userAverageAccuracy: acc,
    timesReviewed: vocab.timesReviewed || 0,
    recentJudgeComposite,
  });
}

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const vocabularyId = searchParams.get("vocabularyId");
    const userId = searchParams.get("userId") || "anonymous";
    if (!vocabularyId) {
      return NextResponse.json({ success: false, message: "vocabularyId required" }, { status: 400 });
    }
    const vocab = await Vocabulary.findOne({ _id: vocabularyId, userId });
    if (!vocab) return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });

    const x = await featureVectorFor(vocab, userId);
    const dPrev = (vocab.lastRetrievalType ?? 0) as RetrievalType;
    const sched = calculateNextReviewDart({ featureVector: x, lastRetrievalType: dPrev, quality: 5 }, getDartWeights());
    return NextResponse.json({ success: true, schedule: sched, features: { recentJudgeComposite: x[5] } });
  } catch (error: any) {
    console.error("[DART Schedule GET Error]:", error);
    return NextResponse.json({ 
      success: false, 
      message: "Server error", 
      error: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined 
    }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();
    const { vocabularyId, userId = "anonymous", quality = 5, lastRetrievalType } = body || {};
    if (!vocabularyId) {
      return NextResponse.json({ success: false, message: "vocabularyId required" }, { status: 400 });
    }
    const vocab = await Vocabulary.findOne({ _id: vocabularyId, userId });
    if (!vocab) return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });

    const x = await featureVectorFor(vocab, userId);
    const dPrev = (lastRetrievalType ?? vocab.lastRetrievalType ?? 0) as RetrievalType;
    const sched = calculateNextReviewDart({ featureVector: x, lastRetrievalType: dPrev, quality }, getDartWeights());
    return NextResponse.json({ success: true, schedule: sched, features: { recentJudgeComposite: x[5] } });
  } catch (error: any) {
    console.error("[DART Schedule POST Error]:", error);
    return NextResponse.json({ 
      success: false, 
      message: "Server error", 
      error: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined 
    }, { status: 500 });
  }
}
