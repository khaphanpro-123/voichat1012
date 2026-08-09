// app/api/carts/schedule/route.ts
// CARTS inference (rule-based CARTS-lite) — Algorithm 4 in x.pdf.
// Combines:
//   - DART for t_next (Step 2 memory estimator replaced by half-life)
//   - Greedy retrieval type from DART thresholds (Step 3 substitute)
//   - Max-min context diversity from lib/contextDiversity (Step 4)
//   - LLM call to lib/aiProvider for the retrieval task (Step 5)
//
// Note: full PPO-trained πθ / gω are trained in python-api/train_carts_ppo.py.
// Until those weights exist, this endpoint uses the DART-based fallback that
// still matches Alg 4's control flow.

import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Vocabulary from "@/app/models/Vocabulary";
import { calculateNextReviewDart } from "@/lib/spacedRepetition";
import { buildFeatureVector, RetrievalType } from "@/lib/dart";
import { getDartWeights } from "@/lib/dartWeights";
import { pickDiverseContext, ContextItem } from "@/lib/contextDiversity";
import { generateRetrievalTask } from "@/lib/retrievalTaskGenerator";
import { buildContextPool } from "@/lib/contextPool";

const CEFR_TABLE: Record<string, number> = { A1: 0, A2: 1, B1: 2, B2: 3, C1: 4, C2: 5 };
const RETRIEVAL_LABELS = ["recognition MCQ", "cloze completion", "constrained generation", "open paraphrase"] as const;

interface CartsBody {
  vocabularyId: string;
  userId?: string;
  contextPool?: ContextItem[] | "auto"; // "auto" → build from Pinecone / vocab examples
  seenContextIds?: string[];
  deltaMin?: number;
  targetRecall?: number;           // τ, default 0.9
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = (await req.json()) as CartsBody;
    const {
      vocabularyId,
      userId = "anonymous",
      contextPool,
      seenContextIds = [],
      deltaMin = 0.2,
      targetRecall = 0.9,
    } = body || ({} as CartsBody);

    if (!vocabularyId) {
      return NextResponse.json({ success: false, message: "vocabularyId required" }, { status: 400 });
    }

    // Validate ObjectId format (24-char hex string) for real MongoDB documents
    if (!vocabularyId.match(/^[0-9a-fA-F]{24}$/)) {
      return NextResponse.json({ 
        success: false, 
        message: "Invalid vocabularyId format. Must be a 24-character hex string (MongoDB ObjectId)." 
      }, { status: 400 });
    }

    const vocab = await Vocabulary.findOne({ _id: vocabularyId, userId });
    if (!vocab) return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });

    let pool: ContextItem[] = [];
    if (contextPool === "auto" || !contextPool) {
      const fallback = [vocab.example, vocab.exampleTranslation].filter(Boolean) as string[];
      pool = await buildContextPool({ word: vocab.word, fallbackSentences: fallback });
    } else if (Array.isArray(contextPool)) {
      pool = contextPool;
    }
    if (!pool.length) {
      return NextResponse.json({ success: false, message: "context pool empty" }, { status: 400 });
    }

    // Step 1-3: DART surrogate for state / memory / retrieval type.
    const cefr = CEFR_TABLE[(vocab.level || "").toUpperCase()] ?? 2;
    const acc = vocab.timesReviewed > 0 ? vocab.timesCorrect / vocab.timesReviewed : 0.5;
    const x = buildFeatureVector({
      cefr,
      wordFrequency: 1000,
      userAverageAccuracy: acc,
      timesReviewed: vocab.timesReviewed || 0,
    });
    const dPrev = (vocab.lastRetrievalType ?? 0) as RetrievalType;
    const sched = calculateNextReviewDart(
      { featureVector: x, lastRetrievalType: dPrev, quality: 5 },
      getDartWeights(),
      targetRecall,
    );

    // Step 4: max-min context diversity.
    const seen = pool.filter(c => seenContextIds.includes(c.id));
    const choice = pickDiverseContext(pool, seen, deltaMin);
    if (!choice) {
      return NextResponse.json({ success: false, message: "empty context pool" }, { status: 400 });
    }

    // Step 5: LLM generates the retrieval task via the shared template registry.
    const retrievalLabel = RETRIEVAL_LABELS[sched.nextRetrievalType];
    const task = await generateRetrievalTask(
      vocab.word,
      choice.chosen.text ?? "",
      sched.nextRetrievalType,
    ).catch(() => null);

    return NextResponse.json({
      success: true,
      schedule: {
        intervalDays: sched.interval,
        halfLife: sched.halfLife,
        nextRetrievalType: sched.nextRetrievalType,
        retrievalLabel,
        contextId: choice.chosen.id,
        contextScore: choice.score,
        fallbackUsed: choice.fallbackUsed,
      },
      task,
    });
  } catch (err) {
    console.error("CARTS schedule error:", err);
    return NextResponse.json({ success: false, message: "carts schedule failed" }, { status: 500 });
  }
}
