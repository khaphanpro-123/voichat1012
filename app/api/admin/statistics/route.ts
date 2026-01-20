import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/app/models/User";
import UserProgress from "@/app/models/UserProgress";
import LearningSession from "@/app/models/LearningSession";
import Vocabulary from "@/app/models/Vocabulary";
import { checkAdminAuth } from "@/lib/adminAuth";

export async function GET(req: NextRequest) {
  try {
    const authCheck = await checkAdminAuth();
    if (!authCheck.isAdmin) {
      return NextResponse.json(
        { success: false, message: authCheck.error },
        { status: authCheck.status }
      );
    }

    await connectDB();

    // Get overall statistics
    const totalUsers = await User.countDocuments({ role: "user" });
    const totalSessions = await LearningSession.countDocuments();
    const totalVocabulary = await Vocabulary.countDocuments();

    // Get level distribution
    const levelDistribution = await UserProgress.aggregate([
      {
        $group: {
          _id: "$level",
          count: { $sum: 1 },
        },
      },
    ]);

    // Get recent activity (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentSessions = await LearningSession.countDocuments({
      createdAt: { $gte: sevenDaysAgo },
    });

    const recentUsers = await User.countDocuments({
      createdAt: { $gte: sevenDaysAgo },
    });

    // Get most active users
    const activeUsers = await LearningSession.aggregate([
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
    ]);

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
    console.error("Get statistics error:", error);
    return NextResponse.json(
      { success: false, message: "Server error" },
      { status: 500 }
    );
  }
}
