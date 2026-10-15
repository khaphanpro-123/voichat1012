// app/api/research/posttest/items/route.ts
// Serve the posttest item set for a participant.
//
// Auth: Bearer participant token.
// The item set is the same for all participants (condition-blind).
// Items are returned without server-only fields (correctIndex, correctAnswer).
//
// Query params:
//   ?form=immediate  (default) — Sections 1-3, for week-8 posttest
//   ?form=delayed    — Delayed word set, for week-10 posttest

import { NextRequest, NextResponse } from "next/server";
import {
  buildRecallItems,
  buildClozeItems,
  buildContextTransferItems,
  toPublicRecallItem,
  toPublicClozeItem,
  FORM_VERSION,
  DELAYED_WORD_IDS,
} from "@/lib/posttestBuilder";
import { getWordById } from "@/lib/wordBank";
import { buildCloze } from "@/lib/retrievalTasks/cloze";
import { buildMCQ } from "@/lib/retrievalTasks/mcq";
import { verifyRequest } from "@/lib/participantAuth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const participant = verifyRequest(req.headers.get("authorization"));
  if (!participant) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const form = new URL(req.url).searchParams.get("form") ?? "immediate";

  if (form !== "immediate" && form !== "delayed") {
    return NextResponse.json(
      { success: false, message: "Invalid posttest form" },
      { status: 400 },
    );
  }

  if (form === "delayed") {
    // Delayed posttest: 10 words, Recall (5 B1) + Cloze (5 B2)
    const delayedRecall = DELAYED_WORD_IDS.slice(0, 5).map((wordId) => {
      const entry = getWordById(wordId)!;
      const task = buildMCQ({
        word: entry.word, vocabularyId: wordId,
        correctDefinition: entry.definition, distractors: entry.distractors,
        context: entry.sentences[0], seed: `posttest_recall_${wordId}`,
      });
      const raw = { itemId: `recall_${wordId}`, section: "recall" as const, wordId, word: entry.word, options: task.options, correctIndex: task.correctIndex };
      return toPublicRecallItem(raw);
    });

    const delayedCloze = DELAYED_WORD_IDS.slice(5).map((wordId) => {
      const entry = getWordById(wordId)!;
      const task = buildCloze({ word: entry.word, vocabularyId: wordId, sentence: entry.sentences[1], acceptedVariants: entry.collocations });
      const raw = { itemId: `cloze_${wordId}`, section: "cloze" as const, wordId, word: entry.word, context: task.context, correctAnswer: task.correctAnswer };
      return toPublicClozeItem(raw);
    });

    return NextResponse.json({
      success: true,
      form: "delayed",
      formVersion: FORM_VERSION,
      sections: { recall: delayedRecall, cloze: delayedCloze },
      counts: { recall: delayedRecall.length, cloze: delayedCloze.length },
    });
  }

  // Immediate posttest (default)
  const recallItems = buildRecallItems().map(toPublicRecallItem);
  const clozeItems = buildClozeItems().map(toPublicClozeItem);
  const ctItems = buildContextTransferItems();

  return NextResponse.json({
    success: true,
    form: "immediate",
    formVersion: FORM_VERSION,
    sections: {
      recall: recallItems,
      cloze: clozeItems,
      contextTransfer: ctItems.map(({ section: _s, ...rest }) => rest),
    },
    counts: {
      recall: recallItems.length,
      cloze: clozeItems.length,
      contextTransfer: ctItems.length,
    },
    instructions: {
      recall: "Choose the best definition for each word.",
      cloze: "Fill in the blank with the correct word.",
      contextTransfer: "Write 2-3 sentences using the target word in the given situation.",
    },
  });
}

