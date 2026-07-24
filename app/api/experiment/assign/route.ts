// app/api/experiment/assign/route.ts
// Assigns (or returns) the scheduler condition for a learner in the ablation.
// GET  /api/experiment/assign?userId=...&stratum=B1
// POST /api/experiment/assign     body: { userId, stratum? }

import { NextRequest, NextResponse } from "next/server";
import { assignCondition } from "@/lib/experimentAssignment";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  const stratum = searchParams.get("stratum") ?? undefined;
  if (!userId) return NextResponse.json({ success: false, message: "userId required" }, { status: 400 });
  return NextResponse.json({ success: true, assignment: assignCondition(userId, stratum) });
}

export async function POST(req: NextRequest) {
  const { userId, stratum } = await req.json();
  if (!userId) return NextResponse.json({ success: false, message: "userId required" }, { status: 400 });
  return NextResponse.json({ success: true, assignment: assignCondition(userId, stratum) });
}
