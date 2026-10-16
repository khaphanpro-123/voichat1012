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
// Auth: expects "Authorization: Bearer <participantToken>" header.
// The token is an HMAC-SHA256-signed blob issued at enrolment (lib/participantAuth.ts).
// This closes Risk 4 from the batch-2 code review: x-participant-code was trivially
// enumerable (P0001–P9999), allowing an attacker to inject reviews for any participant.

import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import ReviewLog from "@/app/models/ReviewLog";
import Participant from "@/app/models/Participant";
import ResearchDecisionReceipt from "@/app/models/ResearchDecisionReceipt";
import { hashPrompt, getWeightsVersion } from "@/lib/researchVersion";
import { verifyRequest } from "@/lib/participantAuth";
import { verifyResearchDecisionReceipt } from "@/lib/researchDecisionReceipt";

export const dynamic = "force-dynamic";

interface ReviewRequest {
  clientEventId: string;         // UUIDv4 from client — idempotency key
  sessionId: string;             // groups a study session
  decisionReceipt: string;       // opaque server-signed scheduling decision
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
  servedWeightsVersion?: string; // legacy client field; ignored when receipt is valid

  // Timing (from client, we log but don't trust for Δ)
  scheduledAt: string;           // ISO
  servedAt: string;              // ISO
  elapsedMs: number;             // performance.now() delta

  // Outcome
  recall: 0 | 1;
  responseTimeMs: number;
  quality: number;               // required self-rated 0-5 SM-2 quality

  // Metadata
  isCatchUp?: boolean;           // learner working through missed reviews
  contextId?: string;            // for CARTS
}

function badRequest(msg: string, status = 400) {
  return NextResponse.json({ success: false, message: msg }, { status });
}

export async function POST(req: NextRequest) {
  const participantCode = verifyRequest(req.headers.get("authorization"));
  if (!participantCode) {
    return badRequest(
      "Missing or invalid Authorization: Bearer token. " +
        "Re-enrol to obtain a valid token.",
      401
    );
  }

  let body: ReviewRequest;
  try {
    body = await req.json();
  } catch {
    return badRequest("Invalid JSON");
  }

  // Required-field validation up-front — better a 400 now than a Mongo error later.
  const required = [
    "clientEventId", "sessionId", "decisionReceipt", "taskPrompt", "servedAt",
    "elapsedMs", "recall", "responseTimeMs", "quality",
  ] as const;
  for (const k of required) {
    if (body[k] === undefined || body[k] === null) return badRequest(`Missing field: ${k}`);
  }
  if (![0, 1].includes(body.recall)) return badRequest("recall must be 0 or 1");
  if (!Number.isInteger(body.quality) || body.quality < 0 || body.quality > 5) {
    return badRequest("quality must be an integer from 0 to 5");
  }
  if (typeof body.taskPrompt !== "string" || !body.taskPrompt) return badRequest("taskPrompt required");

  try {
    await connectDB();

    // 1. Confirm participant is enrolled AND has not dropped out.
    const participant = await Participant.findOne({ participantCode }).lean();
    if (!participant) return badRequest("Unknown participant", 403);
    if ((participant as any).dropoutAt) return badRequest("Participant has withdrawn", 403);

    // 2. Idempotency precedes receipt consumption: an offline retry after a
    // successful write returns the original outcome even though its receipt was
    // consumed by that first write.
    const existing = await ReviewLog.findOne({ clientEventId: body.clientEventId }).lean();
    if (existing) {
      return NextResponse.json({ success: true, deduplicated: true, id: (existing as any)._id });
    }

    const receiptId = verifyResearchDecisionReceipt(body.decisionReceipt);
    if (!receiptId) return badRequest("Invalid decision receipt");
    const now = new Date();
    const receipt = await ResearchDecisionReceipt.findOne({
      receiptId,
      participantCode,
      consumedAt: { $exists: false },
      expiresAt: { $gt: now },
    }).lean();
    if (!receipt) return badRequest("Decision receipt is expired, consumed, or unavailable", 409);
    if ((receipt as any).condition !== (participant as any).condition) {
      console.error(`[research/review] receipt arm mismatch for ${participantCode}`);
      return badRequest("Decision receipt is unavailable", 409);
    }
    if (hashPrompt(body.taskPrompt) !== (receipt as any).taskPromptHash) {
      return badRequest("Task does not match the issued decision receipt", 409);
    }
    const consumed = await ResearchDecisionReceipt.findOneAndUpdate(
      { _id: (receipt as any)._id, consumedAt: { $exists: false }, expiresAt: { $gt: now } },
      { $set: { consumedAt: now, consumedByClientEventId: body.clientEventId } },
      { new: true },
    ).lean();
    if (!consumed) return badRequest("Decision receipt has already been consumed", 409);

    // 3. Compute serverDeltaDays from the previous ReviewLog for this
    //    (participant, vocabulary, condition). Do NOT trust client's deltaDays.
    //    Filtering by condition prevents Δ from bridging across regimes if a
    //    participant's condition ever changes (protocol violation but possible
    //    during pilot); each condition maintains its own review history.
    const prev = await ReviewLog.findOne({
      userId: participantCode,
      vocabularyId: body.vocabularyId,
      condition: (receipt as any).condition,
    })
      .sort({ createdAt: -1 })
      .select({ createdAt: 1 })
      .lean();
    const serverDeltaDays = prev
      ? Math.max(0, (now.getTime() - new Date((prev as any).createdAt).getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    // 4. Attribute the event to the server-issued decision, never client echo.
    const currentWeightsVersion = getWeightsVersion();

    const doc = await ReviewLog.create({
      userId: participantCode,
      vocabularyId: (receipt as any).vocabularyId,
      word: (receipt as any).word,
      deltaDays: serverDeltaDays,   // trusted version
      retrievalType: (receipt as any).retrievalType,
      featureVector: (receipt as any).featureVector,
      contextId: body.contextId,
      recall: body.recall,
      responseTimeMs: body.responseTimeMs,
      quality: body.quality,

      // research fields
      clientEventId: body.clientEventId,
      sessionId: body.sessionId,
      condition: (receipt as any).condition,
      schedulerVersion: (receipt as any).schedulerVersion,
      weightsVersion: (receipt as any).weightsVersion,
      scheduledAt: new Date((receipt as any).issuedAt),
      servedAt: new Date(body.servedAt),
      elapsedMs: body.elapsedMs,
      serverDeltaDays,
      taskPromptHash: (receipt as any).taskPromptHash,
      isCatchUp: body.isCatchUp ?? false,
    });

    const drift = (receipt as any).weightsVersion !== currentWeightsVersion;

    // 6. Update participant activity counters (fire-and-forget, best effort).
    Participant.updateOne(
      { participantCode },
      {
        $inc: { totalReviews: 1 },
        $set: { lastActiveAt: now },
      }
    ).catch((e) => console.warn("Participant counter update failed:", e));

    // 7. Server-side observability: log drift for the researcher dashboard.
    //    Do NOT return drift/weightsVersion to the client — a participant who
    //    sees `default` for weeks then a 12-hex sha knows they were promoted
    //    to trained weights, breaking blinding.
    if (drift) {
      console.warn(
        `[research] weights drift: participant=${participantCode} ` +
          `served=${(receipt as any).weightsVersion} current=${currentWeightsVersion}`
      );
    }

    return NextResponse.json({
      success: true,
      id: doc._id,
      // serverDeltaDays is informational and does NOT leak the arm — it's
      // computed from the participant's own history, identical across arms.
      serverDeltaDays,
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

