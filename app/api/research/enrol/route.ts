// app/api/research/enrol/route.ts
// One-shot enrolment for the RCT.
//
// Called after the participant has:
//   1. Signed the electronic consent form (client hashes the signed doc)
//   2. Completed the pretest CEFR
//
// This endpoint is idempotent per (participantCode). If a Participant row
// already exists, we return the existing assignment — never re-randomise.
// Re-randomising after enrolment would break the assignment-preserving
// analysis and is a common source of retraction.
//
// Auth: the enrolment form itself is public but requires a captcha and the
// consent hash. We trust the client only to have completed consent honestly;
// the pretest score is server-verifiable by re-scoring items.

import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Participant from "@/app/models/Participant";
import PretestSubmission from "@/app/models/PretestSubmission";
import { assignCondition, LIVE_ARMS } from "@/lib/experimentAssignment";
import { toOpaque } from "@/lib/experimentBlinding";
import { issueParticipantToken } from "@/lib/participantAuth";

export const dynamic = "force-dynamic";

interface EnrolRequest {
  participantCode: string;         // "P0001" — client-generated, we enforce format
  cefrLevel: "A2" | "B1" | "B2";
  consentSignedAt: string;         // ISO
  consentDocHash: string;          // sha256 of the exact consent PDF signed
  pretestSubmissionId: string;     // D-016: server-issued, verified server-side
  pretestScore?: number;           // deprecated; kept for backward-compat but overwritten by server
  pretestCompletedAt: string;      // ISO
}

const PCODE = /^P\d{4}$/;

function bad(msg: string, status = 400) {
  return NextResponse.json({ success: false, message: msg }, { status });
}

export async function POST(req: NextRequest) {
  let body: EnrolRequest;
  try {
    body = await req.json();
  } catch {
    return bad("Invalid JSON");
  }

  if (!body.participantCode || !PCODE.test(body.participantCode)) {
    return bad("participantCode must match /^P\\d{4}$/");
  }
  if (!["A2", "B1", "B2"].includes(body.cefrLevel)) return bad("cefrLevel must be A2, B1, or B2");
  if (!body.consentDocHash || body.consentDocHash.length < 32) return bad("consentDocHash required");
  if (!body.pretestSubmissionId || typeof body.pretestSubmissionId !== "string") {
    return bad("pretestSubmissionId required (issued by /api/research/pretest/score)");
  }
  // Validate ISO timestamps — Mongo will silently store Invalid Date otherwise,
  // corrupting downstream consent-timing and pretest-timing analyses.
  if (
    typeof body.consentSignedAt !== "string" ||
    Number.isNaN(new Date(body.consentSignedAt).getTime())
  ) {
    return bad("consentSignedAt must be a valid ISO date string");
  }
  if (
    typeof body.pretestCompletedAt !== "string" ||
    Number.isNaN(new Date(body.pretestCompletedAt).getTime())
  ) {
    return bad("pretestCompletedAt must be a valid ISO date string");
  }

  try {
    await connectDB();

    // Idempotency: if this participant already enroled, return existing.
    const existing = await Participant.findOne({ participantCode: body.participantCode }).lean();
    if (existing) {
      return NextResponse.json({
        success: true,
        deduplicated: true,
        participantCode: body.participantCode,
        armLabel: toOpaque((existing as any).condition),  // blinded: "A"/"B"/"C"
        stratum: (existing as any).stratum,
        // Re-issue token so the client can recover after e.g. clearing localStorage.
        participantToken: issueParticipantToken(body.participantCode),
      });
    }

    // D-016: verify pretest submission server-side.
    // - Must exist (client can't invent submissionIds; the score route mints them).
    // - Must be unused (single-use — one submission = one enrolment).
    // - Server-recorded cefrLevel must match what the client claims (defence
    //   against a client mutating cefrLevel after seeing the score).
    const submission = await PretestSubmission.findOne({ submissionId: body.pretestSubmissionId });
    if (!submission) {
      return bad("pretestSubmissionId not found — complete the pretest first");
    }
    if ((submission as any).used) {
      return bad("pretestSubmissionId already used for another enrolment");
    }
    if ((submission as any).cefrLevel !== body.cefrLevel) {
      return bad(
        `cefrLevel mismatch: submission recorded ${(submission as any).cefrLevel} but body claims ${body.cefrLevel}`,
      );
    }

    // Trust server-side score, not the client-supplied value.
    const verifiedPretestScore: number = (submission as any).score;

    // Stratified assignment using the same deterministic helper the app uses.
    const stratum = body.cefrLevel;
    const assignment = assignCondition(body.participantCode, stratum);

    // Sanity: we only let live arms through. If EXPERIMENT_ARMS was misconfigured
    // to serve an offline arm to real learners, refuse — that's a study protocol
    // violation.
    if (!LIVE_ARMS.includes(assignment.condition)) {
      return bad(
        `Assignment produced non-live arm ${assignment.condition}; refuse to enrol. ` +
          `Check EXPERIMENT_ARMS env.`,
        500
      );
    }

    const doc = await Participant.create({
      participantCode: body.participantCode,
      condition: assignment.condition,
      cefrLevel: body.cefrLevel,
      stratum,
      enrolledAt: new Date(),
      consentSignedAt: new Date(body.consentSignedAt),
      consentDocHash: body.consentDocHash,
      pretestScore: verifiedPretestScore,  // D-016: server-verified
      pretestCompletedAt: new Date(body.pretestCompletedAt),
    });

    // Mark submission consumed. Do it after Participant.create so a race that
    // dup-keys on participantCode doesn't burn the submission (winner's own
    // path already fired this update; loser goes through the 11000 branch and
    // does NOT re-mark).
    await PretestSubmission.updateOne(
      { submissionId: body.pretestSubmissionId, used: false },
      { $set: { used: true, usedByParticipantCode: body.participantCode, usedAt: new Date() } },
    );

    return NextResponse.json({
      success: true,
      participantCode: doc.participantCode,
      armLabel: toOpaque(doc.condition),   // blinded — never send real condition
      stratum: doc.stratum,
      enrolledAt: doc.enrolledAt,
      // Signed token for subsequent research API calls.
      // Client stores this and sends as "Authorization: Bearer <token>".
      participantToken: issueParticipantToken(doc.participantCode),
    });
  } catch (err: any) {
    // Race on unique participantCode: re-fetch the winner's assignment so the
    // race-loser client still gets its condition — otherwise the frontend can't
    // render the arm and the participant is silently stuck.
    if (err?.code === 11000) {
      const winner = await Participant.findOne({ participantCode: body.participantCode }).lean();
      if (winner) {
        return NextResponse.json({
          success: true,
          deduplicated: true,
          raceCondition: true,
          participantCode: body.participantCode,
          armLabel: toOpaque((winner as any).condition),
          stratum: (winner as any).stratum,
          participantToken: issueParticipantToken(body.participantCode),
        });
      }
      // 11000 without a findable row means the race winner's write hasn't
      // committed yet on this secondary; instruct client to retry.
      return NextResponse.json(
        { success: false, retryable: true, message: "Race in progress, retry" },
        { status: 409 }
      );
    }
    console.error("/api/research/enrol error:", err);
    return bad("Server error", 500);
  }
}
