import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/app/models/User";
import UserProgress from "@/app/models/UserProgress";
import LearningSession from "@/app/models/LearningSession";
import Vocabulary from "@/app/models/Vocabulary";
import { checkAdminAuth } from "@/lib/adminAuth";

export async function GET(
  req: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const authCheck = await checkAdminAuth();
    if (!authCheck.isAdmin) {
      return NextResponse.json(
        { success: false, message: authCheck.error },
        { status: authCheck.status }
      );
    }

    const { userId } = params;

    await connectDB();

    // Get user info
    const user = await User.findById(userId).select("-password");
    if (!user) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    // Get user progress
    const progress = await UserProgress.findOne({ userId });

    // Get learning sessions
    const sessions = await LearningSession.find({ userId })
      .sort({ createdAt: -1 })
      .limit(20);

    // Get vocabulary
    const vocabulary = await Vocabulary.find({ userId })
      .sort({ createdAt: -1 })
      .limit(50);

    // Calculate statistics
    const totalSessions = await LearningSession.countDocuments({ userId });
    const totalVocabulary = await Vocabulary.countDocuments({ userId });

    // Get session activity by date (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const sessionsByDate = await LearningSession.aggregate([
      {
        $match: {
          userId: user._id,
          createdAt: { $gte: thirtyDaysAgo },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    return NextResponse.json({
      success: true,
      user: {
        ...user.toObject(),
        progress,
        stats: {
          totalSessions,
          totalVocabulary,
          level: progress?.level || "Beginner",
          lastActive: progress?.updatedAt || user.createdAt,
        },
      },
      sessions,
      vocabulary,
      sessionsByDate,
    });
  } catch (error: any) {
    console.error("Get user statistics error:", error);
    return NextResponse.json(
      { success: false, message: "Server error" },
      { status: 500 }
    );
  }
}
