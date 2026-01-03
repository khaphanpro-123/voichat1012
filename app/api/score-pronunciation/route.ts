import { NextRequest, NextResponse } from "next/server";
import { getOpenAI } from '@/lib/openai';



const SYSTEM_PROMPT = `Bạn là chuyên gia đánh giá phát âm tiếng Việt.

Nhận input gồm:
- text_target: từ hoặc câu phải phát âm
- text_user: transcript giọng người dùng (từ mô hình Whisper)

Hãy phân tích các lỗi sau:
- lỗi âm cuối
- lỗi thiếu dấu
- sai nguyên âm / phụ âm
- tốc độ quá nhanh/chậm

Trả về JSON:
{
  "score": 0–100,
  "errors": [
    {"type": "missing_tone", "target":"ngôn", "user":"ngon"},
    {"type": "vowel_error", "target":"uyện", "user":"uyên"}
  ],
  "suggestions": ["Hãy kéo dài âm 'ô'", "Giữ hơi ở âm cuối 'n'"]
}`;

interface PronunciationError {
  type: string;
  target: string;
  user: string;
}

interface PronunciationResult {
  score: number;
  errors: PronunciationError[];
  suggestions: string[];
}

export async function POST(req: NextRequest) {
  try {
    const { text_target, text_user } = await req.json();

    if (!text_target || !text_user) {
      return NextResponse.json(
        { success: false, message: "Both text_target and text_user are required" },
        { status: 400 }
      );
    }

    const USER_PROMPT = `Đánh giá phát âm:

Target (chuẩn): "${text_target}"
User (thực tế): "${text_user}"

Hãy phân tích chi tiết các lỗi phát âm và đưa ra điểm số từ 0-100.`;

    const completion = await getOpenAI().chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: USER_PROMPT },
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
    });

    const result: PronunciationResult = JSON.parse(
      completion.choices[0].message.content || "{}"
    );

    // Calculate similarity score as fallback
    const similarity = calculateSimilarity(text_target, text_user);

    return NextResponse.json({
      success: true,
      score: result.score || similarity,
      errors: result.errors || [],
      suggestions: result.suggestions || [],
      target: text_target,
      user: text_user,
      usage: {
        prompt_tokens: completion.usage?.prompt_tokens,
        completion_tokens: completion.usage?.completion_tokens,
        total_tokens: completion.usage?.total_tokens,
      },
    });
  } catch (error: any) {
    console.error("Pronunciation scoring error:", error);

    // Fallback to simple similarity
    const { text_target, text_user } = await req.json();
    const similarity = calculateSimilarity(text_target, text_user);

    return NextResponse.json({
      success: true,
      score: similarity,
      errors: [],
      suggestions: ["Continue practicing!"],
      fallback: true,
    });
  }
}

// Simple similarity calculation (Levenshtein-based)
function calculateSimilarity(target: string, user: string): number {
  const distance = levenshteinDistance(
    target.toLowerCase(),
    user.toLowerCase()
  );
  const maxLength = Math.max(target.length, user.length);
  const similarity = ((maxLength - distance) / maxLength) * 100;
  return Math.round(similarity);
}

function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[str2.length][str1.length];
}


