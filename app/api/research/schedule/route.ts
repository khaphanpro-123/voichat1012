import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Participant from "@/app/models/Participant";
import ReviewLog from "@/app/models/ReviewLog";
import ResearchDecisionReceipt from "@/app/models/ResearchDecisionReceipt";
import { verifyRequest } from "@/lib/participantAuth";
import { getWordById } from "@/lib/wordBank";
import { buildFeatureVector } from "@/lib/dart";
import { pickTaskType, type SchedulerName } from "@/lib/retrievalTasks/session";
import { generateRetrievalTask } from "@/lib/retrievalTaskGenerator";
import { getVersionStamp, hashPrompt } from "@/lib/researchVersion";
import { issueResearchDecisionReceipt } from "@/lib/researchDecisionReceipt";
import { sanitiseForClient } from "@/lib/experimentBlinding";

export const dynamic = "force-dynamic";

const CEFR_NUMBER: Record<string, number> = { A1: 0, A2: 1, B1: 2, B2: 3, C1: 4, C2: 5 };

function badRequest(message: string, status = 400) {
  return NextResponse.json({ success: false, message }, { status });
}

/**
 * Issue exactly one server-authoritative task decision. The client supplies
 * only a word-bank identifier: participant identity and arm always come from
 * the signed token and Participant record, never from request JSON.
 */
export async function POST(req: NextRequest) {
  const participantCode = verifyRequest(req.headers.get("authorization"));
  if (!participantCode) return badRequest("Missing or invalid Authorization: Bearer token", 401);

  let body: { vocabularyId?: unknown };
  try {
    body = await req.json();
  } catch {
    return badRequest("Invalid JSON");
  }
  if (!body || typeof body.vocabularyId !== "string") return badRequest("vocabularyId required");

  const word = getWordById(body.vocabularyId);
  if (!word || word.pilotStatus === "removed") return badRequest("Unknown or inactive study word", 404);

  try {
    await connectDB();
    const participant = await Participant.findOne({ participantCode }).lean();
    if (!participant) return badRequest("Unknown participant", 403);
    if ((participant as any).dropoutAt) return badRequest("Participant has withdrawn", 403);

    const condition = (participant as any).condition as SchedulerName;
    if (!["sm2", "hlr", "dart"].includes(condition)) {
      console.error(`[research/schedule] invalid stored condition for ${participantCode}`);
      return badRequest("Participant scheduling is unavailable", 403);
    }

    const history = await ReviewLog.find({
      userId: participantCode,
      vocabularyId: word.id,
      condition,
    }).sort({ createdAt: -1 }).select({ recall: 1, retrievalType: 1 }).lean();
    const reviewed = history.length;
    const accuracy = reviewed ? history.filter((row: any) => row.recall === 1).length / reviewed : 0.5;
    const featureVector = buildFeatureVector({
      cefr: CEFR_NUMBER[word.cefrBand] ?? 2,
      wordFrequency: 1000,
      userAverageAccuracy: accuracy,
      timesReviewed: reviewed,
    });
    const retrievalType = pickTaskType(
      {
        word: word.word,
        vocabularyId: word.id,
        cefrOfWord: word.cefrBand,
        timesReviewed: reviewed,
        userAvgAccuracy: accuracy,
      },
      {
        participantCefr: (participant as any).cefrLevel,
        scheduler: condition,
        // ε exploration belongs only to the DART arm; it is logged by the
        // receipt decision and is never controllable by the client.
        epsilonExplore: condition === "dart",
      },
    );

    const task = await generateRetrievalTask(word.word, word.sentences[0] ?? "", retrievalType);
    const version = getVersionStamp();
    const receipt = issueResearchDecisionReceipt();
    const issuedAt = new Date();
    await ResearchDecisionReceipt.create({
      receiptId: receipt.receiptId,
      participantCode,
      vocabularyId: word.id,
      word: word.word,
      condition,
      retrievalType,
      featureVector,
      schedulerVersion: version.schedulerVersion,
      weightsVersion: version.weightsVersion,
      taskPromptHash: hashPrompt(task.prompt),
      issuedAt,
      expiresAt: receipt.expiresAt,
    });

    // Do not include condition, scheduler version, weights version, or task
    // generation diagnostics in the participant response.
    return NextResponse.json(sanitiseForClient({
      success: true,
      scheduledAt: issuedAt.toISOString(),
      decisionReceipt: receipt.token,
      task: {
        vocabularyId: word.id,
        word: word.word,
        retrievalType: task.type,
        prompt: task.prompt,
        options: task.options,
        expectedAnswer: task.expectedAnswer,
        featureVector,
      },
    }));
  } catch (error) {
    console.error("[research/schedule] failed", error);
    return badRequest("Unable to schedule a study task", 500);
  }
}

