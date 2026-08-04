// app/api/research/review/route.ts
// Research-grade write path for a single retrieval attempt.
//
// DIFFERENT from /api/vocabulary-review — that endpoint runs the app's SRS
// scheduler (SM-2 fallback with DART inference for learners not in a study).
// This endpoint is called ONLY by learners enrolled in the RCT and is designed
// for scientific validity, not user experience:
//
//   - Idempotent: repeated POSTs with the same clientEventId are no-ops.
//     Client can safely retry on network flakes without double-logging.
//   - Server timestamps only: scheduledAt/servedAt come from the client, but
//     serverDeltaDays is recomputed from the Participant's last review in Mongo.
//     Client clocks lie; the paper's Δ is server-authoritative.
//   - Version stamped: schedulerVersion + weightsVersion on every row so we
//     can drop rows served by a buggy weights snapshot without losing all data.
//   - No mutation of Vocabulary: the RCT doesn't want app-level SRS state
//     drifting into research analysis. This endpoint writes ReviewLog only.
//
// Auth: expects x-participant-code header (set by the enrolled client). The
// research app is a separate build gated behind consent; this header comes from
// the participant's signed session, not from a public form.

import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import ReviewLog from "@/app/models/ReviewLog";
import Participant from "@/app/models/Participant";
import { SCHEDULER_VERSION, hashPrompt, isValidWeightsVersion, getWeightsVersion } from "@/lib/researchVersion";

export const dynamic = "force-dynamic";

interface ReviewRequest {
  clientEventId: string;         // UUIDv4 from client — idempotency key
  sessionId: string;             // groups a study session
  vocabularyId: string;
  word: string;

  // Retrieval task
  retrievalType: 0 | 1 | 2 | 3;  // d_i
  featureVector: number[];       // x_i (client sends what scheduler saw)
  taskPrompt?: string;           // full prompt shown to learner (hashed only)

  // Provenance from the decision that produced this task.
  // The client MUST echo the weightsVersion that /api/dart/schedule handed it,
  // so the row is attributed to the exact weights that served it — not to
  // whatever weights happen to be loaded at the moment the response arrives
  // (which can differ if retraining lands between decision and submit).
  servedWeightsVersion: string;

  // Timing (from client, we log but don't trust for Δ)
  scheduledAt: string;           // ISO
  servedAt: string;              // ISO
  elapsedMs: number;             // performance.now() delta

  // Outcome
  recall: 0 | 1;
  responseTimeMs: number;
  quality?: number;              // 0-5 if learner used self-rating

  // Metadata
  isCatchUp?: boolean;           // learner working through missed reviews
  contextId?: string;            // for CARTS
}

function badRequest(msg: string, status = 400) {
  return NextResponse.json({ success: false, message: msg }, { status });
}

export async function POST(req: NextRequest) {
  const participantCode = req.headers.get("x-participant-code");
  if (!participantCode) return badRequest("Missing x-participant-code header", 401);

  let body: ReviewRequest;
  try {
    body = await req.json();
  } catch {
    return badRequest("Invalid JSON");
  }

  // Required-field validation up-front — better a 400 now than a Mongo error later.
  const required = [
    "clientEventId", "sessionId", "vocabularyId", "word",
    "retrievalType", "featureVector", "servedWeightsVersion",
    "scheduledAt", "servedAt",
    "elapsedMs", "recall", "responseTimeMs",
  ] as const;
  for (const k of required) {
    if (body[k] === undefined || body[k] === null) return badRequest(`Missing field: ${k}`);
  }
  if (![0, 1, 2, 3].includes(body.retrievalType)) return badRequest("retrievalType must be 0..3");
  if (![0, 1].includes(body.recall)) return badRequest("recall must be 0 or 1");
  if (!Array.isArray(body.featureVector)) return badRequest("featureVector must be array");
  if (!isValidWeightsVersion(body.servedWeightsVersion)) {
    return badRequest("servedWeightsVersion must be 'default' or 12 hex chars");
  }

  try {
    await connectDB();

    // 1. Confirm participant is enrolled AND has not dropped out.
    const participant = await Participant.findOne({ participantCode }).lean();
    if (!participant) return badRequest("Unknown participant", 403);
    if ((participant as any).dropoutAt) return badRequest("Participant has withdrawn", 403);

    // 2. Idempotency: if clientEventId already logged, return the existing row.
    const existing = await ReviewLog.findOne({ clientEventId: body.clientEventId }).lean();
    if (existing) {
      return NextResponse.json({ success: true, deduplicated: true, id: (existing as any)._id });
    }

    // 3. Compute serverDeltaDays from the previous ReviewLog for this
    //    (participant, vocabulary, condition). Do NOT trust client's deltaDays.
    //    Filtering by condition prevents Δ from bridging across regimes if a
    //    participant's condition ever changes (protocol violation but possible
    //    during pilot); each condition maintains its own review history.
    const prev = await ReviewLog.findOne({
      userId: participantCode,
      vocabularyId: body.vocabularyId,
      condition: (participant as any).condition,
    })
      .sort({ createdAt: -1 })
      .select({ createdAt: 1 })
      .lean();
    const now = new Date();
    const serverDeltaDays = prev
      ? Math.max(0, (now.getTime() - new Date((prev as any).createdAt).getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    // 4. Version stamp — the client echoes the weightsVersion that /api/dart/schedule
    //    handed it at decision time; that is the truth for attribution. We also log
    //    the CURRENT server weightsVersion so we can detect drift (rows where the
    //    scheduler weights changed between decide and submit).
    const currentWeightsVersion = getWeightsVersion();
    const taskPromptHash = body.taskPrompt ? hashPrompt(body.taskPrompt) : undefined;

    const doc = await ReviewLog.create({
      userId: participantCode,
      vocabularyId: body.vocabularyId,
      word: body.word,
      deltaDays: serverDeltaDays,   // trusted version
      retrievalType: body.retrievalType,
      featureVector: body.featureVector,
      contextId: body.contextId,
      recall: body.recall,
      responseTimeMs: body.responseTimeMs,
      quality: body.quality,

      // research fields
      clientEventId: body.clientEventId,
      sessionId: body.sessionId,
      condition: (participant as any).condition,
      schedulerVersion: SCHEDULER_VERSION,
      weightsVersion: body.servedWeightsVersion,   // decision-time — trusted for audit
      scheduledAt: new Date(body.scheduledAt),
      servedAt: new Date(body.servedAt),
      elapsedMs: body.elapsedMs,
      serverDeltaDays,
      taskPromptHash,
      isCatchUp: body.isCatchUp ?? false,
    });

    const drift = body.servedWeightsVersion !== currentWeightsVersion;

    // 5. Update participant activity counters (fire-and-forget, best effort).
    Participant.updateOne(
      { participantCode },
      {
        $inc: { totalReviews: 1 },
        $set: { lastActiveAt: now },
      }
    ).catch((e) => console.warn("Participant counter update failed:", e));

    return NextResponse.json({
      success: true,
      id: doc._id,
      serverDeltaDays,
      weightsVersion: body.servedWeightsVersion,
      currentWeightsVersion,
      weightsDriftDetected: drift,
    });
  } catch (err: any) {
    // Duplicate clientEventId races through the unique index — treat as idempotent success.
    if (err?.code === 11000 && err?.keyPattern?.clientEventId) {
      return NextResponse.json({ success: true, deduplicated: true, raceCondition: true });
    }
    console.error("/api/research/review error:", err);
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}
