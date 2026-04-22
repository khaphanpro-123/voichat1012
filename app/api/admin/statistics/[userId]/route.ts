import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import getClientPromise, { connectToDatabase } from "@/lib/mongodb";
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

    // Validate userId format
    if (!ObjectId.isValid(userId)) {
      return NextResponse.json(
        { success: false, message: "Invalid user ID" },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();
    const userObjectId = new ObjectId(userId);

    // Get user info
    const user = await db.collection("users").findOne({ _id: userObjectId });
    if (!user) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    // Get vocabulary count and list
    const totalVocabulary = await db
      .collection("vocabulary")
      .countDocuments({ userId: userObjectId });

    const vocabulary = await db
      .collection("vocabulary")
      .find({ userId: userObjectId })
      .sort({ createdAt: -1 })
      .limit(50)
      .toArray();

    // Get learning sessions count and list
    const totalSessions = await db
      .collection("learning_sessions")
      .countDocuments({ userId: userObjectId });

    const sessions = await db
      .collection("learning_sessions")
      .find({ userId: userObjectId })
      .sort({ createdAt: -1 })
      .limit(20)
      .toArray();

    // Get user progress
    const progress = await db
      .collection("user_progress")
      .findOne({ userId: userObjectId });

    // Get session activity by date (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const sessionsByDate = await db
      .collection("learning_sessions")
      .aggregate([
        {
          $match: {
            userId: userObjectId,
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
      ])
      .toArray();

    return NextResponse.json({
      success: true,
      user: {
        ...user,
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
