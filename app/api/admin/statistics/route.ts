import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { checkAdminAuth } from "@/lib/adminAuth";

export async function GET(req: NextRequest) {
  try {
    console.log("[Statistics API] GET - Starting...");
    
    const authCheck = await checkAdminAuth();
    console.log("[Statistics API] Auth check result:", authCheck);
    
    if (!authCheck.isAdmin) {
      return NextResponse.json(
        { success: false, message: authCheck.error },
        { status: authCheck.status }
      );
    }

    const { db } = await connectToDatabase();
    console.log("[Statistics API] Database connected");

    // Get overall statistics using MongoDB native
    const totalUsers = await db.collection("users").countDocuments({ role: "user" });
    const totalSessions = await db.collection("learning_sessions").countDocuments({});
    const totalVocabulary = await db.collection("vocabulary").countDocuments({});

    console.log("[Statistics API] ✅ Stats:", { totalUsers, totalSessions, totalVocabulary });

    // Get level distribution
    const levelDistribution = await db.collection("user_progress").aggregate([
      {
        $group: {
          _id: "$level",
          count: { $sum: 1 },
        },
      },
    ]).toArray();

    // Get recent activity (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentSessions = await db.collection("learning_sessions").countDocuments({
      createdAt: { $gte: sevenDaysAgo },
    });

    const recentUsers = await db.collection("users").countDocuments({
      createdAt: { $gte: sevenDaysAgo },
    });

    // Get most active users
    const activeUsers = await db.collection("learning_sessions").aggregate([
      {
        $group: {
          _id: "$userId",
          sessionCount: { $sum: 1 },
        },
      },
      { $sort: { sessionCount: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },
      {
        $project: {
          userId: "$_id",
          sessionCount: 1,
          username: "$user.username",
          fullName: "$user.fullName",
          email: "$user.email",
        },
      },
    ]).toArray();

    return NextResponse.json({
      success: true,
      statistics: {
        totalUsers,
        totalSessions,
        totalVocabulary,
        recentSessions,
        recentUsers,
        levelDistribution,
        activeUsers,
      },
    });
  } catch (error: any) {
    console.error("[Statistics API] ❌ Error:", error);
    return NextResponse.json(
      { success: false, message: "Server error: " + error.message },
      { status: 500 }
    );
  }
}
