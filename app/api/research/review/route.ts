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
//     drifting into research analysis. The SM-2 control uses its own state
//     collection, committed atomically with the receipt and ReviewLog row.
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
import ResearchSm2State from "@/app/models/ResearchSm2State";
import { hashPrompt, getWeightsVersion } from "@/lib/researchVersion";
import { verifyRequest } from "@/lib/participantAuth";
import { verifyResearchDecisionReceipt } from "@/lib/researchDecisionReceipt";
import { initialResearchSm2State, transitionResearchSm2State } from "@/lib/researchSm2";
import { scoreResearchAnswer } from "@/lib/researchAnswerScoring";
import { runResearchTransaction } from "@/lib/researchTransaction";

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
  // `recall` is accepted only for legacy queued payload compatibility and is
  // ignored. The server derives the recorded outcome from answerText.
  recall?: 0 | 1;
  responseTimeMs: number;
  quality: number;               // required self-rated 0-5 SM-2 quality
  answerText: string;

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
    "elapsedMs", "responseTimeMs", "quality", "answerText",
  ] as const;
  for (const k of required) {
    if (body[k] === undefined || body[k] === null) return badRequest(`Missing field: ${k}`);
  }
  if (!Number.isInteger(body.quality) || body.quality < 0 || body.quality > 5) {
    return badRequest("quality must be an integer from 0 to 5");
  }
  if (typeof body.taskPrompt !== "string" || !body.taskPrompt) return badRequest("taskPrompt required");
  if (typeof body.answerText !== "string") return badRequest("answerText required");

  try {
    const connection = await connectDB();

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
    const outcome = await runResearchTransaction(connection, async (session) => {
      const now = new Date();
      const receipt = await ResearchDecisionReceipt.findOne({
        receiptId,
        participantCode,
        isActive: true,
        consumedAt: { $exists: false },
        expiresAt: { $gt: now },
      }).select("+expectedAnswer").session(session as any).lean();
      if (!receipt) throw new Error("RECEIPT_UNAVAILABLE");
      if ((receipt as any).condition !== (participant as any).condition) {
        console.error(`[research/review] receipt arm mismatch for ${participantCode}`);
        throw new Error("RECEIPT_UNAVAILABLE");
      }
      if (hashPrompt(body.taskPrompt) !== (receipt as any).taskPromptHash) {
        throw new Error("RECEIPT_PROMPT_MISMATCH");
      }

      const consumed = await ResearchDecisionReceipt.findOneAndUpdate(
        { _id: (receipt as any)._id, isActive: true, consumedAt: { $exists: false }, expiresAt: { $gt: now } },
        { $set: { consumedAt: now, consumedByClientEventId: body.clientEventId, isActive: false } },
        { new: true, session: session as any },
      ).lean();
      if (!consumed) throw new Error("RECEIPT_UNAVAILABLE");

      // Compute Δ from server-owned rows, never a client clock or payload.
      const prev = await ReviewLog.findOne({
        userId: participantCode,
        vocabularyId: (receipt as any).vocabularyId,
        condition: (receipt as any).condition,
      }).sort({ createdAt: -1 }).select({ createdAt: 1 }).session(session as any).lean();
      const serverDeltaDays = prev
        ? Math.max(0, (now.getTime() - new Date((prev as any).createdAt).getTime()) / (1000 * 60 * 60 * 24))
        : 0;
      const recall = scoreResearchAnswer({
        retrievalType: (receipt as any).retrievalType,
        expectedAnswer: (receipt as any).expectedAnswer,
        word: (receipt as any).word,
        answerText: body.answerText,
      });

      const [doc] = await ReviewLog.create([{
        userId: participantCode,
        vocabularyId: (receipt as any).vocabularyId,
        word: (receipt as any).word,
        deltaDays: serverDeltaDays,
        retrievalType: (receipt as any).retrievalType,
        featureVector: (receipt as any).featureVector,
        contextId: body.contextId,
        recall,
        responseTimeMs: body.responseTimeMs,
        quality: body.quality,
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
      }], { session: session as any });

      if ((receipt as any).condition === "sm2") {
        const stored = await ResearchSm2State.findOne({
          participantCode,
          vocabularyId: (receipt as any).vocabularyId,
        }).session(session as any).lean();
        const base = stored
          ? {
              stateVersion: (stored as any).stateVersion,
              easeFactor: (stored as any).easeFactor,
              interval: (stored as any).interval,
              repetitions: (stored as any).repetitions,
              nextReviewDate: new Date((stored as any).nextReviewDate),
            }
          : initialResearchSm2State(now);
        const next = transitionResearchSm2State(base as any, body.quality);
        const stateUpdate = {
          stateVersion: next.stateVersion,
          easeFactor: next.easeFactor,
          interval: next.interval,
          repetitions: next.repetitions,
          nextReviewDate: next.nextReviewDate,
          lastReceiptId: (receipt as any).receiptId,
        };
        if (stored) {
          const updated = await ResearchSm2State.findOneAndUpdate(
            { _id: (stored as any)._id, revision: (stored as any).revision ?? 0 },
            { $set: stateUpdate, $inc: { revision: 1 } },
            { new: true, session: session as any },
          ).lean();
          if (!updated) throw new Error("SM2_STATE_CONFLICT");
        } else {
          await ResearchSm2State.create([{ participantCode, vocabularyId: (receipt as any).vocabularyId, ...stateUpdate, revision: 0 }], { session: session as any });
        }
      }

      await Participant.updateOne(
        { participantCode },
        { $inc: { totalReviews: 1 }, $set: { lastActiveAt: now } },
        { session: session as any },
      );
      return { doc, recall, expectedAnswer: (receipt as any).expectedAnswer, serverDeltaDays, drift: (receipt as any).weightsVersion !== getWeightsVersion() };
    });

    // 7. Server-side observability: log drift for the researcher dashboard.
    //    Do NOT return drift/weightsVersion to the client — a participant who
    //    sees `default` for weeks then a 12-hex sha knows they were promoted
    //    to trained weights, breaking blinding.
    if (outcome.drift) {
      console.warn(
        `[research] weights drift: participant=${participantCode} ` +
          `served decision differs from the currently loaded weights`
      );
    }

    return NextResponse.json({
      success: true,
      id: outcome.doc._id,
      // serverDeltaDays is informational and does NOT leak the arm — it's
      // computed from the participant's own history, identical across arms.
      serverDeltaDays: outcome.serverDeltaDays,
      // The answer key is disclosed only after the response has been committed.
      recall: outcome.recall,
      expectedAnswer: outcome.expectedAnswer,
    });
  } catch (err: any) {
    // Duplicate clientEventId races through the unique index — treat as idempotent success.
    if (err?.code === 11000 && err?.keyPattern?.clientEventId) {
      return NextResponse.json({ success: true, deduplicated: true, raceCondition: true });
    }
    if (err?.message === "RECEIPT_UNAVAILABLE" || err?.message === "RECEIPT_PROMPT_MISMATCH") {
      return badRequest("Decision receipt is expired, consumed, or unavailable", 409);
    }
    console.error("/api/research/review error:", err);
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}

