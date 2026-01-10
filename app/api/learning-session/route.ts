import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import LearningSession from "@/app/models/LearningSession";

// POST - Lưu phiên học mới
export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const { userId, sessionType, ...sessionData } = data;

    if (!userId || !sessionType) {
      return NextResponse.json(
        { success: false, message: "userId và sessionType là bắt buộc" },
        { status: 400 }
      );
    }

    await connectDB();

    // Tính số thứ tự phiên cho user này
    const lastSession = await LearningSession.findOne({ userId, sessionType })
      .sort({ sessionNumber: -1 })
      .select("sessionNumber");
    
    const sessionNumber = (lastSession?.sessionNumber || 0) + 1;

    // Tính tổng số lỗi
    const totalErrors = (sessionData.grammarErrors?.length || 0) + 
                       (sessionData.pronunciationErrors?.length || 0);

    const session = await LearningSession.create({
      userId,
      sessionType,
      sessionNumber,
      totalErrors,
      ...sessionData,
      createdAt: new Date()
    });

    return NextResponse.json({
      success: true,
      message: "Đã lưu phiên học",
      sessionId: session._id,
      sessionNumber
    });

  } catch (error) {
    console.error("Save learning session error:", error);
    return NextResponse.json(
      { success: false, message: "Lỗi lưu phiên học" },
      { status: 500 }
    );
  }
}

// PATCH - Cập nhật rating cho phiên học
export async function PATCH(req: NextRequest) {
  try {
    const { sessionId, rating } = await req.json();

    if (!sessionId || !rating) {
      return NextResponse.json(
        { success: false, message: "sessionId và rating là bắt buộc" },
        { status: 400 }
      );
    }

    if (rating < 1 || rating > 5) {
      return NextResponse.json(
        { success: false, message: "Rating phải từ 1-5" },
        { status: 400 }
      );
    }

    await connectDB();

    const session = await LearningSession.findByIdAndUpdate(
      sessionId,
      { rating },
      { new: true }
    );

    if (!session) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy phiên học" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Đã cập nhật đánh giá",
      session
    });

  } catch (error) {
    console.error("Update rating error:", error);
    return NextResponse.json(
      { success: false, message: "Lỗi cập nhật đánh giá" },
      { status: 500 }
    );
  }
}

// GET - Lấy lịch sử học tập
export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get("userId");
    const sessionType = req.nextUrl.searchParams.get("type");
    const limit = parseInt(req.nextUrl.searchParams.get("limit") || "20");
    const summary = req.nextUrl.searchParams.get("summary") === "true";

    if (!userId) {
      return NextResponse.json(
        { success: false, message: "userId là bắt buộc" },
        { status: 400 }
      );
    }

    await connectDB();

    // Build query
    const query: any = { userId };
    if (sessionType) query.sessionType = sessionType;

    // Nếu chỉ cần summary
    if (summary) {
      const stats = await LearningSession.aggregate([
        { $match: { userId } },
        {
          $group: {
            _id: "$sessionType",
            totalSessions: { $sum: 1 },
            avgScore: { $avg: "$overallScore" },
            avgPronunciation: { $avg: "$pronunciationScore" },
            avgGrammar: { $avg: "$grammarScore" },
            totalDuration: { $sum: "$duration" },
            totalWords: { $sum: "$wordsSpoken" }
          }
        }
      ]);

      // Lấy lỗi phổ biến nhất
      const recentSessions = await LearningSession.find({ userId })
        .sort({ createdAt: -1 })
        .limit(10)
        .select("pronunciationErrors grammarErrors");

      const commonPronErrors: Record<string, number> = {};
      const commonGramErrors: Record<string, number> = {};

      recentSessions.forEach(s => {
        s.pronunciationErrors?.forEach((e: any) => {
          commonPronErrors[e.word] = (commonPronErrors[e.word] || 0) + 1;
        });
        s.grammarErrors?.forEach((e: any) => {
          commonGramErrors[e.errorType] = (commonGramErrors[e.errorType] || 0) + 1;
        });
      });

      return NextResponse.json({
        success: true,
        summary: {
          byType: stats,
          commonPronunciationErrors: Object.entries(commonPronErrors)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([word, count]) => ({ word, count })),
          commonGrammarErrors: Object.entries(commonGramErrors)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([type, count]) => ({ type, count }))
        }
      });
    }

    // Lấy danh sách sessions
    const sessions = await LearningSession.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .select("-__v");

    return NextResponse.json({
      success: true,
      sessions,
      count: sessions.length
    });

  } catch (error) {
    console.error("Get learning sessions error:", error);
    return NextResponse.json(
      { success: false, message: "Lỗi lấy lịch sử học tập" },
      { status: 500 }
    );
  }
}
