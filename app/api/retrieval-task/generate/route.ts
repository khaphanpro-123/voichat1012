// app/api/retrieval-task/generate/route.ts
//
// Generate a retrieval task (MCQ / Cloze / Constrained gen / Paraphrase) for a
// given (word, context, retrievalType). Called by the study session runner
// (`app/dashboard-new/study/page.tsx`) after DART picks nextRetrievalType.
//
// Wired to the D-013 cache: two learners in the SAME arm asking for the same
// (word, context, retrievalType) receive the SAME LLM-generated task, keeping
// task-content noise out of the RCT.
//
// Auth: Bearer participant token (verifyRequest) — task content is not sensitive
// but gating prevents scraping the exact item set before study day.
//
// Request:
//   POST { vocabularyId, word, context?, retrievalType }
//
// Response:
//   200 { success: true, task: { vocabularyId, word, retrievalType, prompt,
//         options?, expectedAnswer, cached, provider, model } }
//   400 { success: false, message }
//   401 { success: false, message }
//   500 { success: false, message }

import { NextRequest, NextResponse } from "next/server";
import { generateRetrievalTask } from "@/lib/retrievalTaskGenerator";
import { verifyRequest } from "@/lib/participantAuth";
import type { RetrievalType } from "@/lib/dart";

export const dynamic = "force-dynamic";

interface GenerateRequest {
  vocabularyId: string;
  word: string;
  context?: string;
  retrievalType: RetrievalType;
}

function badRequest(msg: string, status = 400) {
  return NextResponse.json({ success: false, message: msg }, { status });
}

export async function POST(req: NextRequest) {
  // Auth first — cheapest reject
  const participant = verifyRequest(req.headers.get("authorization"));
  if (!participant) {
    return badRequest(
      "Missing or invalid Authorization: Bearer token. Re-enrol to obtain a valid token.",
      401,
    );
  }

  let body: GenerateRequest;
  try {
    body = await req.json();
  } catch {
    return badRequest("Invalid JSON");
  }

  const { vocabularyId, word, context = "", retrievalType } = body || ({} as GenerateRequest);
  if (!vocabularyId) return badRequest("vocabularyId required");
  if (!word) return badRequest("word required");
  if (![0, 1, 2, 3].includes(retrievalType as number)) {
    return badRequest("retrievalType must be 0, 1, 2, or 3");
  }

  try {
    const task = await generateRetrievalTask(word, context, retrievalType);
    return NextResponse.json({
      success: true,
      task: {
        vocabularyId,
        word: task.type === retrievalType ? word : word,
        retrievalType: task.type,
        label: task.label,
        prompt: task.prompt,
        options: task.options,
        expectedAnswer: task.expectedAnswer,
      },
      participant,
    });
  } catch (err: any) {
    console.error("[retrieval-task/generate] error:", err);
    return NextResponse.json(
      { success: false, message: "Task generation failed", detail: String(err?.message ?? err) },
      { status: 500 },
    );
  }
}
