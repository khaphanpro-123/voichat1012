import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import LearningSession from "@/app/models/LearningSession";
import { getUserApiKeys } from "@/lib/getUserApiKey";
import { callAI, parseJsonFromAI } from "@/lib/aiProvider";

const ANALYSIS_PROMPT = `Bạn là chuyên gia phân tích học tập tiếng Anh cho người Việt.

Phân tích dữ liệu học tập và đưa ra:
1. Tổng hợp lỗi theo loại (phát âm, ngữ pháp, từ vựng)
2. Xu hướng tiến bộ (so sánh các phiên gần đây)
3. Gợi ý khắc phục cụ thể cho từng loại lỗi
4. Flashcard gợi ý cho từ vựng cần ôn
5. Bài tập luyện tập phù hợp

Trả về JSON:
{
  "summary": {
    "totalSessions": number,
    "avgScore": number,
    "trend": "improving" | "stable" | "declining",
    "trendPercent": number
  },
  "errorAnalysis": {
    "pronunciation": {
      "count": number,
      "commonErrors": [{ "sound": string, "words": string[], "tip": string }],
      "exercises": string[]
    },
    "grammar": {
      "count": number,
      "commonErrors": [{ "type": string, "examples": string[], "rule": string, "ruleVi": string }],
      "exercises": string[]
    },
    "vocabulary": {
      "count": number,
      "wordsToReview": string[]
    }
  },
  "recommendations": {
    "flashcards": [{ "word": string, "meaning": string, "example": string }],
    "practiceAreas": string[],
    "nextSteps": string[]
  },
  "strengths": string[],
  "weeklyGoal": string
}`;

interface SessionData {
  sessionNumber: number;
  sessionType: string;
  overallScore: number;
  pronunciationScore: number;
  grammarScore: number;
  pronunciationErrors: any[];
  grammarErrors: any[];
  learnedVocabulary: any[];
  createdAt: Date;
}

async function analyzeWithAI(sessions: SessionData[], keys: any) {
  // Prepare data for AI
  const sessionSummaries = sessions.map(s => ({
    session: s.sessionNumber,
    type: s.sessionType,
    score: s.overallScore,
    pronScore: s.pronunciationScore,
    gramScore: s.grammarScore,
    pronErrors: s.pronunciationErrors?.map(e => e.word) || [],
    gramErrors: s.grammarErrors?.map(e => ({ type: e.errorType, original: e.original })) || [],
    date: new Date(s.createdAt).toLocaleDateString()
  }));

  const prompt = `${ANALYSIS_PROMPT}

Dữ liệu học tập (${sessions.length} phiên gần nhất):
${JSON.stringify(sessionSummaries, null, 2)}

Phân tích và trả về JSON:`;

  const result = await callAI(prompt, keys, { temperature: 0.3, maxTokens: 2048 });
  
  if (!result.success) {
    throw new Error(result.error || "AI analysis failed");
  }

  return parseJsonFromAI(result.content);
}

function calculateBasicStats(sessions: SessionData[]) {
  if (sessions.length === 0) return null;

  const totalSessions = sessions.length;
  const avgScore = Math.round(sessions.reduce((sum, s) => sum + s.overallScore, 0) / totalSessions);
  
  // Calculate trend (compare first half vs second half)
  const midpoint = Math.floor(totalSessions / 2);
  const recentAvg = sessions.slice(0, midpoint).reduce((sum, s) => sum + s.overallScore, 0) / (midpoint || 1);
  const olderAvg = sessions.slice(midpoint).reduce((sum, s) => sum + s.overallScore, 0) / (totalSessions - midpoint || 1);
  
  const trendPercent = Math.round(((recentAvg - olderAvg) / (olderAvg || 1)) * 100);
  const trend = trendPercent > 5 ? "improving" : trendPercent < -5 ? "declining" : "stable";

  // Collect all errors
  const allPronErrors: string[] = [];
  const allGramErrors: { type: string; original: string }[] = [];
  const allVocab: string[] = [];

  sessions.forEach(s => {
    s.pronunciationErrors?.forEach(e => allPronErrors.push(e.word));
    s.grammarErrors?.forEach(e => allGramErrors.push({ type: e.errorType, original: e.original }));
    s.learnedVocabulary?.forEach(v => allVocab.push(v.word));
  });

  // Count error frequencies
  const pronErrorCounts: Record<string, number> = {};
  allPronErrors.forEach(w => { pronErrorCounts[w] = (pronErrorCounts[w] || 0) + 1; });

  const gramErrorCounts: Record<string, number> = {};
  allGramErrors.forEach(e => { gramErrorCounts[e.type] = (gramErrorCounts[e.type] || 0) + 1; });

  return {
    totalSessions,
    avgScore,
    trend,
    trendPercent,
    pronunciationErrors: {
      total: allPronErrors.length,
      common: Object.entries(pronErrorCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([word, count]) => ({ word, count }))
    },
    grammarErrors: {
      total: allGramErrors.length,
      common: Object.entries(gramErrorCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([type, count]) => ({ type, count }))
    },
    vocabularyLearned: [...new Set(allVocab)].length
  };
}

export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get("userId");
    const useAI = req.nextUrl.searchParams.get("ai") === "true";
    const limit = parseInt(req.nextUrl.searchParams.get("limit") || "20");
    const days = parseInt(req.nextUrl.searchParams.get("days") || "365");

    if (!userId) {
      return NextResponse.json({ success: false, message: "userId required" }, { status: 400 });
    }

    await connectDB();

    // Build date filter
    const dateFilter = days < 365 ? {
      createdAt: { $gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000) }
    } : {};

    // Fetch recent sessions
    const sessions = await LearningSession.find({ userId, ...dateFilter })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean() as unknown as SessionData[];

    if (sessions.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No learning sessions found",
        analysis: null,
        sessions: []
      });
    }

    // Calculate basic stats
    const basicStats = calculateBasicStats(sessions);

    // If AI analysis requested
    if (useAI) {
      const keys = await getUserApiKeys(userId);
      if (!keys.openaiKey && !keys.groqKey && !keys.cohereKey) {
        return NextResponse.json({
          success: true,
          analysis: basicStats,
          aiAnalysis: null,
          sessions,
          message: "Add API key in Settings for AI analysis"
        });
      }

      try {
        const aiAnalysis = await analyzeWithAI(sessions, keys);
        return NextResponse.json({
          success: true,
          analysis: basicStats,
          aiAnalysis,
          sessions
        });
      } catch (aiError: any) {
        console.error("AI analysis error:", aiError);
        return NextResponse.json({
          success: true,
          analysis: basicStats,
          aiAnalysis: null,
          sessions,
          aiError: aiError.message
        });
      }
    }

    return NextResponse.json({
      success: true,
      analysis: basicStats,
      sessions
    });

  } catch (error: any) {
    console.error("Analyze learning error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Analysis failed" },
      { status: 500 }
    );
  }
}
