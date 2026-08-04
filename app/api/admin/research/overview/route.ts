// app/api/admin/research/overview/route.ts
//
// Aggregated view for the researcher dashboard (Ngày 20).
// Server-side only; admin gate enforced by middleware.ts (role === "admin").
//
// Returns:
//   - per-arm counts (enrolled, active-7d, dropped)
//   - per-arm 7-day compliance rate
//   - list of stalled participants (≥5 days inactive, not dropped)
//   - retrievalType balance across the whole study
//   - LLM cost/day if tracked (skip if not)
//   - weightsVersion coverage
//
// This endpoint IS allowed to expose real condition names — it's for the
// researcher, not the participant. Do not import experimentBlinding here.

import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Participant from "@/app/models/Participant";
import ReviewLog from "@/app/models/ReviewLog";

export const dynamic = "force-dynamic";

const DAY_MS = 24 * 60 * 60 * 1000;

export async function GET(_req: NextRequest) {
  try {
    await connectDB();

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * DAY_MS);
    const fiveDaysAgo = new Date(now.getTime() - 5 * DAY_MS);

    // ---- Per-arm enrolment ------------------------------------------------
    const perArmAgg = await Participant.aggregate([
      {
        $group: {
          _id: "$condition",
          enrolled: { $sum: 1 },
          dropped: {
            $sum: { $cond: [{ $ifNull: ["$dropoutAt", false] }, 1, 0] },
          },
          active7d: {
            $sum: {
              $cond: [{ $gte: ["$lastActiveAt", sevenDaysAgo] }, 1, 0],
            },
          },
          totalReviews: { $sum: { $ifNull: ["$totalReviews", 0] } },
        },
      },
    ]);

    // ---- Stalled participants (>=5 days inactive, not dropped) ------------
    const stalled = await Participant.find({
      dropoutAt: { $exists: false },
      $or: [
        { lastActiveAt: { $lt: fiveDaysAgo } },
        { lastActiveAt: { $exists: false } },
      ],
    })
      .select({ participantCode: 1, condition: 1, lastActiveAt: 1, enrolledAt: 1 })
      .sort({ lastActiveAt: 1 })
      .limit(50)
      .lean();

    // ---- retrievalType balance -------------------------------------------
    const retrievalAgg = await ReviewLog.aggregate([
      { $group: { _id: "$retrievalType", count: { $sum: 1 } } },
    ]);
    const retrievalCounts: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0 };
    for (const r of retrievalAgg) retrievalCounts[r._id ?? -1] = r.count;
    const retrievalTotal = Object.values(retrievalCounts).reduce((a, b) => a + b, 0);

    // ---- weightsVersion coverage -----------------------------------------
    const weightsAgg = await ReviewLog.aggregate([
      { $group: { _id: "$weightsVersion", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]);

    // ---- 7-day per-arm reviews (compliance proxy) -------------------------
    const per7Agg = await ReviewLog.aggregate([
      { $match: { createdAt: { $gte: sevenDaysAgo } } },
      {
        $group: {
          _id: "$condition",
          reviewsLast7d: { $sum: 1 },
          uniqueLearners: { $addToSet: "$userId" },
        },
      },
      {
        $project: {
          reviewsLast7d: 1,
          activeLearners: { $size: "$uniqueLearners" },
        },
      },
    ]);

    return NextResponse.json({
      success: true,
      generatedAt: now.toISOString(),
      perArm: perArmAgg.map((a) => {
        const seven = per7Agg.find((x) => x._id === a._id);
        const compliance =
          a.enrolled > 0 ? (seven?.activeLearners ?? 0) / a.enrolled : 0;
        return {
          condition: a._id,
          enrolled: a.enrolled,
          dropped: a.dropped,
          active7d: a.active7d,
          totalReviews: a.totalReviews,
          reviewsLast7d: seven?.reviewsLast7d ?? 0,
          activeLast7d: seven?.activeLearners ?? 0,
          compliance7d: Math.round(compliance * 1000) / 1000,
        };
      }),
      stalled,
      retrieval: {
        counts: retrievalCounts,
        total: retrievalTotal,
        shares:
          retrievalTotal > 0
            ? {
                0: retrievalCounts[0] / retrievalTotal,
                1: retrievalCounts[1] / retrievalTotal,
                2: retrievalCounts[2] / retrievalTotal,
                3: retrievalCounts[3] / retrievalTotal,
              }
            : null,
        warning:
          retrievalTotal > 0 &&
          [0, 1, 2, 3].some((d) => retrievalCounts[d] / retrievalTotal < 0.1)
            ? "at_least_one_d_below_10pct"
            : null,
      },
      weights: weightsAgg.map((w) => ({ version: w._id ?? "unset", count: w.count })),
    });
  } catch (err) {
    console.error("/api/admin/research/overview error:", err);
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}
