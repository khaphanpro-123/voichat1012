// app/api/dart/weights/route.ts
// GET  → current DART weights + metadata (source path, mtime, trained flag).
// POST → invalidate cache; the next inference call reloads from disk.

import { NextRequest, NextResponse } from "next/server";
import { getDartWeights, getDartWeightsMeta, invalidateDartWeights } from "@/lib/dartWeights";

export async function GET() {
  const weights = getDartWeights();
  const meta = getDartWeightsMeta();
  return NextResponse.json({ success: true, weights, meta });
}

export async function POST(_req: NextRequest) {
  invalidateDartWeights();
  const weights = getDartWeights();
  return NextResponse.json({ success: true, reloaded: true, meta: getDartWeightsMeta(), weights });
}
