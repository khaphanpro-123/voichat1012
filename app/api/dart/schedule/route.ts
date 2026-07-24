// app/api/dart/schedule/route.ts
// DART inference endpoint — Algorithm 2 in x.pdf.
// GET  /api/dart/schedule?vocabularyId=...&userId=...
// POST /api/dart/schedule  body: { vocabularyId, userId, quality?, lastRetrievalType? }

import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Vocabulary from "@/app/models/Vocabulary";
import { calculateNextReviewDart } from "@/lib/spacedRepetition";
import { buildFeatureVector, RetrievalType } from "@/lib/dart";
import { getDartWeights } from "@/lib/dartWeights";

const CEFR_TABLE: Record<string, number> = { A1: 0, A2: 1, B1: 2, B2: 3, C1: 4, C2: 5 };

async function featureVectorFor(vocab: any) {
  const cefr = CEFR_TABLE[vocab.level?.toUpperCase?.()] ?? 2;
  const acc =
    vocab.timesReviewed > 0 ? vocab.timesCorrect / vocab.timesReviewed : 0.5;
  return buildFeatureVector({
    cefr,
    wordFrequency: 1000, // TODO: plug real corpus frequency when available
    userAverageAccuracy: acc,
    timesReviewed: vocab.timesReviewed || 0,
  });
}

export async function GET(req: NextRequest) {
  await connectDB();
  const { searchParams } = new URL(req.url);
  const vocabularyId = searchParams.get("vocabularyId");
  const userId = searchParams.get("userId") || "anonymous";
  if (!vocabularyId) {
    return NextResponse.json({ success: false, message: "vocabularyId required" }, { status: 400 });
  }
  const vocab = await Vocabulary.findOne({ _id: vocabularyId, userId });
  if (!vocab) return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });

  const x = await featureVectorFor(vocab);
  const dPrev = (vocab.lastRetrievalType ?? 0) as RetrievalType;
  const sched = calculateNextReviewDart({ featureVector: x, lastRetrievalType: dPrev, quality: 5 }, getDartWeights());
  return NextResponse.json({ success: true, schedule: sched });
}

export async function POST(req: NextRequest) {
  await connectDB();
  const body = await req.json();
  const { vocabularyId, userId = "anonymous", quality = 5, lastRetrievalType } = body || {};
  if (!vocabularyId) {
    return NextResponse.json({ success: false, message: "vocabularyId required" }, { status: 400 });
  }
  const vocab = await Vocabulary.findOne({ _id: vocabularyId, userId });
  if (!vocab) return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });

  const x = await featureVectorFor(vocab);
  const dPrev = (lastRetrievalType ?? vocab.lastRetrievalType ?? 0) as RetrievalType;
  const sched = calculateNextReviewDart({ featureVector: x, lastRetrievalType: dPrev, quality }, getDartWeights());
  return NextResponse.json({ success: true, schedule: sched });
}
