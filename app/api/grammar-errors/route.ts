import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import GrammarError from "@/app/models/GrammarError";

// GET - Lấy danh sách lỗi sai của user
export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get("userId");
    const limit = parseInt(req.nextUrl.searchParams.get("limit") || "100");
    const errorType = req.nextUrl.searchParams.get("errorType");

    if (!userId) {
      return NextResponse.json({ success: false, message: "userId required" }, { status: 400 });
    }

    await connectDB();

    // Build query - exclude punctuation errors (not important)
    const query: any = { userId, errorType: { $ne: "punctuation" } };
    if (errorType && errorType !== "punctuation") query.errorType = errorType;

    // Lấy danh sách lỗi (exclude punctuation)
    const errors = await GrammarError.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    // Thống kê theo loại lỗi (exclude punctuation)
    const errorStats = await GrammarError.aggregate([
      { $match: { userId, errorType: { $ne: "punctuation" } } },
      { 
        $group: { 
          _id: "$errorType", 
          count: { $sum: 1 },
          examples: { $push: { sentence: "$sentence", corrected: "$correctedSentence", errorWord: "$errorWord", errorMessage: "$errorMessage", explanation: "$explanation" } }
        } 
      },
      { $sort: { count: -1 } }
    ]);

    // Format stats với examples giới hạn 3
    const formattedStats = errorStats.map(stat => ({
      errorType: stat._id,
      count: stat.count,
      examples: stat.examples.slice(0, 3)
    }));

    // Tổng số lỗi
    const totalErrors = errors.length;

    return NextResponse.json({
      success: true,
      totalErrors,
      errorsByType: formattedStats,
      recentErrors: errors.slice(0, 20)
    });

  } catch (error: any) {
    console.error("Get grammar errors error:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

// POST - Lưu lỗi sai mới
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, sentence, correctedSentence, errorType, errorWord, errorMessage, explanation, targetWord, source } = body;

    if (!userId || userId === "anonymous") {
      return NextResponse.json({ success: false, message: "Cần đăng nhập để lưu lỗi" }, { status: 401 });
    }

    if (!sentence || !correctedSentence || !errorType) {
      return NextResponse.json({ success: false, message: "Thiếu thông tin lỗi" }, { status: 400 });
    }

    await connectDB();

    // Kiểm tra xem lỗi này đã tồn tại chưa (tránh duplicate)
    const existing = await GrammarError.findOne({
      userId,
      sentence: sentence.toLowerCase().trim(),
      errorType
    });

    if (existing) {
      return NextResponse.json({ success: true, message: "Lỗi đã được ghi nhận trước đó", duplicate: true });
    }

    // Lưu lỗi mới
    await GrammarError.create({
      userId,
      sentence,
      correctedSentence,
      errorType,
      errorWord: errorWord || "",
      errorMessage: errorMessage || "",
      explanation: explanation || "",
      targetWord: targetWord || "",
      source: source || "image_learning"
    });

    return NextResponse.json({ success: true, message: "Đã lưu lỗi" });

  } catch (error: any) {
    console.error("Save grammar error:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

// DELETE - Xóa lỗi (nếu user muốn)
export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, errorId, clearAll, sentence, errorType } = body;

    if (!userId) {
      return NextResponse.json({ success: false, message: "userId required" }, { status: 400 });
    }

    await connectDB();

    if (clearAll) {
      await GrammarError.deleteMany({ userId });
      return NextResponse.json({ success: true, message: "Đã xóa tất cả lỗi" });
    }

    if (errorId) {
      await GrammarError.findOneAndDelete({ _id: errorId, userId });
      return NextResponse.json({ success: true, message: "Đã xóa lỗi" });
    }

    // Delete by sentence + errorType (for practice fix feature)
    if (sentence && errorType) {
      await GrammarError.findOneAndDelete({ 
        userId, 
        sentence: { $regex: new RegExp(`^${sentence.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
        errorType 
      });
      return NextResponse.json({ success: true, message: "Đã xóa lỗi sau khi sửa đúng" });
    }

    return NextResponse.json({ success: false, message: "Cần errorId, clearAll, hoặc sentence+errorType" }, { status: 400 });

  } catch (error: any) {
    console.error("Delete grammar error:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
