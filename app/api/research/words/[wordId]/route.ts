// app/api/research/words/[wordId]/route.ts
// Single word detail — used by the session runner to build task inputs.
//
// Auth: participant token OR admin session.

import { NextRequest, NextResponse } from "next/server";
import { getWordById, toPublicWordEntry } from "@/lib/wordBank";
import { verifyRequest } from "@/lib/participantAuth";
import { getAuthUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { wordId: string } }
) {
  const participant = verifyRequest(req.headers.get("authorization"));
  const adminUser = !participant ? await getAuthUser(req) : null;
  const isAdmin = adminUser && (adminUser as any).role === "admin";

  if (!participant && !isAdmin) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const word = getWordById(params.wordId);
  if (!word) {
    return NextResponse.json({ success: false, message: `Word ${params.wordId} not found` }, { status: 404 });
  }

  return NextResponse.json({ success: true, word: toPublicWordEntry(word) });
}
