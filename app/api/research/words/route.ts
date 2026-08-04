// app/api/research/words/route.ts
// Serve the active target word list for the DART-RCT study.
//
// Auth: Bearer participant token OR admin cookie.
// The word list itself is not sensitive, but we gate it behind auth to prevent
// bots from scraping the exact item set before the study begins.
//
// Query params:
//   ?band=B1|B2   — filter by CEFR band
//   ?ids=w_001,w_002,...  — fetch specific IDs (comma-separated)

import { NextRequest, NextResponse } from "next/server";
import { WORD_BANK, getWordsByBand, getActiveWords, toPublicWordEntry } from "@/lib/wordBank";
import { verifyRequest } from "@/lib/participantAuth";
import { getAuthUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

function unauthorized() {
  return NextResponse.json(
    { success: false, message: "Unauthorized — participant token or admin session required" },
    { status: 401 }
  );
}

export async function GET(req: NextRequest) {
  // Auth: participant token or admin JWT
  const participant = verifyRequest(req.headers.get("authorization"));
  const adminUser = !participant ? await getAuthUser(req) : null;
  const isAdmin = adminUser && (adminUser as any).role === "admin";

  if (!participant && !isAdmin) return unauthorized();

  const { searchParams } = new URL(req.url);
  const bandFilter = searchParams.get("band") as "B1" | "B2" | null;
  const idsParam = searchParams.get("ids");

  let words = getActiveWords();

  if (idsParam) {
    const ids = new Set(idsParam.split(",").map((s) => s.trim()));
    words = words.filter((w) => ids.has(w.id));
  } else if (bandFilter === "B1" || bandFilter === "B2") {
    words = words.filter((w) => w.cefrBand === bandFilter);
  }

  return NextResponse.json({
    success: true,
    count: words.length,
    words: words.map(toPublicWordEntry),
  });
}
