// app/api/research/familiarity-screen/results/route.ts
//
// GET — Admin-only aggregate of familiarity screening results.
//       Returns per-word familiarity rate and flags words where ≥ threshold screeners
//       report already knowing the word.
//
// Admin-gated via middleware (role === "admin").

import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import FamiliarityResponse from "@/app/models/FamiliarityResponse";
import { getActiveWords } from "@/lib/wordBank";

export const dynamic = "force-dynamic";

/** Pre-registered threshold: flag word if ≥70% of screeners already know it */
const FAMILIARITY_THRESHOLD = 0.70;

export async function GET(req: NextRequest) {
  await connectDB();

  const responses = await FamiliarityResponse.find().lean();
  const nScreeners = responses.length;

  if (nScreeners === 0) {
    return NextResponse.json({
      success: true,
      nScreeners: 0,
      threshold: FAMILIARITY_THRESHOLD,
      message: "No familiarity responses yet. Share /research/familiarity-screen with H5 participants.",
      words: [],
      flagged: [],
    });
  }

  // Tally known counts per word
  const knownCounts: Record<string, number> = {};
  const activeWords = getActiveWords();

  for (const resp of responses) {
    const respMap = resp.responses as unknown as Record<string, boolean>;
    for (const [wordId, known] of Object.entries(respMap)) {
      if (known) knownCounts[wordId] = (knownCounts[wordId] ?? 0) + 1;
    }
  }

  // Build per-word result
  const wordResults = activeWords.map((w) => {
    const known = knownCounts[w.id] ?? 0;
    const rate = known / nScreeners;
    return {
      wordId: w.id,
      word: w.word,
      cefrBand: w.cefrBand,
      partOfSpeech: w.partOfSpeech,
      knownCount: known,
      nScreeners,
      familiarityRate: parseFloat(rate.toFixed(4)),
      flagged: rate >= FAMILIARITY_THRESHOLD,
    };
  });

  wordResults.sort((a, b) => b.familiarityRate - a.familiarityRate);

  const flagged = wordResults.filter((w) => w.flagged);

  // Screener-level summary
  const screenerSummary = responses.map((r) => {
    const respMap = r.responses as unknown as Record<string, boolean>;
    const known = Object.values(respMap).filter(Boolean).length;
    return {
      screenerId: r.screenerId,
      knownCount: known,
      submittedAt: r.submittedAt,
      durationSecs: r.metadata?.durationSecs,
    };
  });

  return NextResponse.json({
    success: true,
    nScreeners,
    threshold: FAMILIARITY_THRESHOLD,
    totalWords: wordResults.length,
    flaggedCount: flagged.length,
    ready: nScreeners >= 20,
    progressNote: nScreeners < 20 ? `${nScreeners}/20 screeners — need ${20 - nScreeners} more` : "Screening complete",
    words: wordResults,
    flagged: flagged.map((w) => ({ wordId: w.wordId, word: w.word, rate: w.familiarityRate })),
    screeners: screenerSummary,
  });
}
