// app/api/research/pretest/items/route.ts
// Serve the public (answer-stripped) CEFR pretest items.
// No auth required — the test itself is public; only the scoring is server-side.

import { NextResponse } from "next/server";
import { toPublicPretestItems } from "@/lib/pretestItems";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({
    success: true,
    items: toPublicPretestItems(),
    totalItems: toPublicPretestItems().length,
    // Client-visible scoring rubric (does not reveal answer key)
    scoring: {
      description: "Score 0–100. CEFR level determined by B1/B2 band performance.",
    },
  });
}
