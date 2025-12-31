import { NextRequest, NextResponse } from "next/server";
import { getUserApiKeys } from "@/lib/getUserApiKey";
import { callAI, parseJsonFromAI } from "@/lib/aiProvider";

const SYSTEM_PROMPT = `Bạn là hệ thống xử lý văn bản OCR để tạo flashcards học ngoại ngữ. Nhiệm vụ của bạn:

1. Nhận input là text gốc (đã OCR).
2. Chuẩn hoá văn bản:
   - loại bỏ ký tự thừa, xuống dòng sai
   - sửa lỗi OCR thường gặp
3. Tách câu, đếm số câu, tách từ, đếm total words, unique words.
4. ƯU TIÊN TRÍCH CỤM TỪ thay vì từ đơn lẻ:
   - Cụm danh từ (noun phrases): "climate change", "social media"
   - Cụm động từ (phrasal verbs): "look forward to", "give up"
   - Collocations: "make a decision", "take responsibility"
5. Chỉ trích từ đơn khi là động từ/tính từ quan trọng đứng một mình

Trả về dạng JSON:
{
  "total_words": number,
  "unique_words": number,
  "sentences": string[],
  "important_words": string[],
  "noun_phrases": string[],
  "verb_phrases": string[],
  "collocations": string[],
  "suggested_flashcard_words": string[]
}

Các từ/cụm từ gợi ý cho flashcard phải sạch, không trùng lặp, không rác.
Ưu tiên cụm từ có nghĩa hoàn chỉnh, dễ hiểu trong ngữ cảnh.
Không bịa nội dung. Tất cả phải dựa trên chính văn bản OCR.`;

const VOCABULARY_EXTRACTION_PROMPT = `Bạn là hệ thống trích xuất từ vựng tiếng Anh cho người Việt học tiếng Anh.

Nhiệm vụ: Phân tích văn bản và trích xuất các từ vựng/cụm từ quan trọng cần học.

QUY TẮC QUAN TRỌNG - ƯU TIÊN CỤM TỪ:
1. ƯU TIÊN TRÍCH CỤM TỪ (phrases) thay vì từ đơn lẻ:
   - Cụm danh từ (noun phrases): "climate change", "social media", "artificial intelligence"
   - Cụm động từ (phrasal verbs): "look forward to", "give up", "take care of"
   - Collocations: "make a decision", "take responsibility", "pay attention"
   - Cụm tính từ: "highly recommended", "deeply concerned"
   
2. CHỈ TRÍCH TỪ ĐƠN khi:
   - Động từ chính quan trọng: "analyze", "implement", "achieve"
   - Tính từ/trạng từ đặc biệt: "significant", "effectively"
   - Danh từ chuyên ngành đứng một mình: "algorithm", "hypothesis"

3. KHÔNG TRÍCH:
   - Stopwords (the, a, an, is, are, was, were, have, has, etc.)
   - Từ quá đơn giản (good, bad, big, small, very, etc.)
   - Đại từ, giới từ đơn lẻ
   - Số, ký hiệu, tiếng Việt

4. Mỗi mục cần có: nghĩa tiếng Việt, loại từ, ví dụ trong ngữ cảnh
5. Tối đa 30 mục quan trọng nhất (ưu tiên cụm từ)

Trả về JSON (KHÔNG markdown):
{
  "vocabulary": [
    {
      "word": "take into account",
      "meaning": "xem xét, tính đến",
      "type": "phrasal verb",
      "example": "We need to take into account all the factors."
    },
    {
      "word": "climate change",
      "meaning": "biến đổi khí hậu",
      "type": "noun phrase",
      "example": "Climate change is a global issue."
    }
  ],
  "total_extracted": number
}`;

async function analyzeText(text: string, keys: { openaiKey?: string | null; groqKey?: string | null; cohereKey?: string | null }) {
  const prompt = `${SYSTEM_PROMPT}

Hãy phân tích đoạn văn sau (được trích từ OCR):

${text}

Trả về ONLY valid JSON (không markdown, không code blocks):`;

  const result = await callAI(prompt, keys, {
    temperature: 0.3,
    maxTokens: 2048
  });

  if (!result.success) {
    throw new Error(result.error || "AI API error");
  }

  const parsed = parseJsonFromAI(result.content);
  if (parsed) {
    return { ...parsed, provider: result.provider, model: result.model };
  }
  
  throw new Error("Invalid response format");
}

async function extractVocabulary(text: string, keys: { openaiKey?: string | null; groqKey?: string | null; cohereKey?: string | null }) {
  const prompt = `${VOCABULARY_EXTRACTION_PROMPT}

Văn bản cần trích xuất từ vựng:

${text.slice(0, 3000)}

Trả về ONLY valid JSON:`;

  const result = await callAI(prompt, keys, {
    temperature: 0.3,
    maxTokens: 2048
  });

  if (!result.success) {
    throw new Error(result.error || "AI API error");
  }

  const parsed = parseJsonFromAI(result.content);
  if (parsed) {
    return { ...parsed, provider: result.provider, model: result.model };
  }
  
  throw new Error("Invalid response format");
}

export async function POST(req: NextRequest) {
  try {
    const { text, userId = "anonymous", action } = await req.json();

    if (!text || text.trim().length === 0) {
      return NextResponse.json(
        { success: false, message: "Text is required" },
        { status: 400 }
      );
    }

    // Get user's API keys
    const keys = await getUserApiKeys(userId);

    if (!keys.openaiKey && !keys.groqKey && !keys.cohereKey) {
      return NextResponse.json(
        { success: false, message: "Chưa có API key nào. Vui lòng thêm OpenAI hoặc Groq key trong Settings." },
        { status: 400 }
      );
    }

    console.log("Analyzing text (user:", userId, ", action:", action || "default", ")");
    
    let result;
    if (action === 'extract_vocabulary') {
      result = await extractVocabulary(text, keys);
    } else {
      result = await analyzeText(text, keys);
    }

    return NextResponse.json({
      success: true,
      analysis: result,
      provider: result.provider,
      model: result.model
    });
  } catch (error: any) {
    console.error("Text analysis error:", error);
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to analyze text",
      },
      { status: 500 }
    );
  }
}
