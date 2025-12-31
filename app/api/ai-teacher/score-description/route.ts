import { NextRequest, NextResponse } from "next/server";
import { OpenAI } from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Production scoring interface
interface ScoringResult {
  accuracy: number;
  is_correct: boolean;
  explanation: string;
  correction: string;
  missing_details: string;
  wrong_details: string;
}

// PROMPT DÙNG TRONG PRODUCTION – CHẤM ĐIỂM MÔ TẢ ẢNH
const PRODUCTION_SCORING_PROMPT = `
Bạn là AI chấm điểm mô tả ảnh.

Đây là mô tả thật từ Vision Model:
[IMAGE_DESCRIPTION]

Đây là câu trả lời của người học:
[USER_DESCRIPTION]

Hãy phân tích và trả về OUTPUT JSON duy nhất:

{
 "accuracy": số từ 0-100,
 "is_correct": true hoặc false,
 "explanation": "giải thích vì sao đúng sai",
 "correction": "phiên bản mô tả đúng chuẩn",
 "missing_details": "những gì người học chưa nói đến",
 "wrong_details": "những gì người học nói sai"
}
`;

// Score user description against vision analysis
async function scoreUserDescription(
  imageDescription: string,
  userDescription: string
): Promise<ScoringResult> {
  try {
    const scoringPrompt = PRODUCTION_SCORING_PROMPT
      .replace('[IMAGE_DESCRIPTION]', imageDescription)
      .replace('[USER_DESCRIPTION]', userDescription);

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "Bạn là AI chấm điểm mô tả ảnh chuyên nghiệp. Luôn trả về JSON chính xác."
        },
        {
          role: "user",
          content: scoringPrompt
        }
      ],
      temperature: 0.2,
      max_tokens: 800,
    });

    const content = response.choices[0]?.message?.content;
    if (content) {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const result = JSON.parse(jsonMatch[0]);
          
          // Validate and sanitize result
          return {
            accuracy: Math.max(0, Math.min(100, result.accuracy || 0)),
            is_correct: result.accuracy >= 70, // Consider 70+ as correct
            explanation: result.explanation || "Không có giải thích",
            correction: result.correction || userDescription,
            missing_details: result.missing_details || "Không có chi tiết thiếu",
            wrong_details: result.wrong_details || "Không có chi tiết sai"
          };
        } catch (parseError) {
          console.error('Scoring JSON parse error:', parseError);
        }
      }
    }

    // Fallback scoring
    return generateFallbackScoring(imageDescription, userDescription);

  } catch (error) {
    console.error('Scoring error:', error);
    return generateFallbackScoring(imageDescription, userDescription);
  }
}

// Generate fallback scoring when AI fails
function generateFallbackScoring(imageDescription: string, userDescription: string): ScoringResult {
  // Simple keyword matching for fallback
  const imageWords = imageDescription.toLowerCase().split(/\s+/);
  const userWords = userDescription.toLowerCase().split(/\s+/);
  
  // Calculate basic similarity
  const commonWords = imageWords.filter(word => 
    userWords.some(userWord => userWord.includes(word) || word.includes(userWord))
  );
  
  const similarity = Math.round((commonWords.length / Math.max(imageWords.length, userWords.length)) * 100);
  const accuracy = Math.max(20, Math.min(80, similarity)); // Limit fallback range
  
  return {
    accuracy,
    is_correct: accuracy >= 70,
    explanation: `Độ tương đồng từ khóa: ${similarity}%. ${accuracy >= 70 ? 'Mô tả khá chính xác.' : 'Mô tả cần cải thiện thêm.'}`,
    correction: `Mô tả chính xác: ${imageDescription}`,
    missing_details: accuracy < 50 ? "Thiếu nhiều chi tiết quan trọng từ ảnh gốc" : "Một số chi tiết nhỏ có thể bổ sung",
    wrong_details: accuracy < 30 ? "Có một số thông tin không khớp với ảnh" : "Thông tin cơ bản đúng"
  };
}

// Enhanced scoring with context
async function enhancedScoring(
  imageDescription: string,
  userDescription: string,
  context?: {
    difficulty_level?: number;
    focus_areas?: string[];
    language_level?: string;
  }
): Promise<ScoringResult & { detailed_feedback: string; improvement_suggestions: string[] }> {
  try {
    const enhancedPrompt = `
Bạn là AI chấm điểm mô tả ảnh chuyên nghiệp với khả năng đánh giá chi tiết.

MÔ TẢ THẬT TỪ VISION MODEL:
${imageDescription}

CÂU TRẢ LỜI CỦA NGƯỜI HỌC:
${userDescription}

CONTEXT (nếu có):
${context ? JSON.stringify(context, null, 2) : 'Không có context đặc biệt'}

Hãy phân tích chi tiết và trả về JSON:

{
  "accuracy": số từ 0-100,
  "is_correct": true/false,
  "explanation": "giải thích chi tiết vì sao đúng/sai",
  "correction": "phiên bản mô tả đúng chuẩn",
  "missing_details": "những gì người học chưa nói đến",
  "wrong_details": "những gì người học nói sai",
  "detailed_feedback": "phản hồi chi tiết cho người học",
  "improvement_suggestions": ["gợi ý 1", "gợi ý 2", "gợi ý 3"]
}

QUAN TRỌNG: 
- Đánh giá dựa trên độ chính xác nội dung, không phải ngữ pháp
- Khuyến khích người học khi có điểm tích cực
- Đưa ra gợi ý cụ thể để cải thiện
- Chỉ trả về JSON, không kèm text khác
`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: enhancedPrompt
        }
      ],
      temperature: 0.3,
      max_tokens: 1000,
    });

    const content = response.choices[0]?.message?.content;
    if (content) {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const result = JSON.parse(jsonMatch[0]);
          
          return {
            accuracy: Math.max(0, Math.min(100, result.accuracy || 0)),
            is_correct: result.accuracy >= 70,
            explanation: result.explanation || "Không có giải thích",
            correction: result.correction || userDescription,
            missing_details: result.missing_details || "Không có chi tiết thiếu",
            wrong_details: result.wrong_details || "Không có chi tiết sai",
            detailed_feedback: result.detailed_feedback || "Không có phản hồi chi tiết",
            improvement_suggestions: result.improvement_suggestions || ["Thử mô tả chi tiết hơn"]
          };
        } catch (parseError) {
          console.error('Enhanced scoring JSON parse error:', parseError);
        }
      }
    }

    // Fallback to basic scoring
    const basicResult = await scoreUserDescription(imageDescription, userDescription);
    return {
      ...basicResult,
      detailed_feedback: basicResult.explanation,
      improvement_suggestions: ["Thử mô tả chi tiết hơn", "Chú ý đến các vật thể chính", "Mô tả màu sắc và vị trí"]
    };

  } catch (error) {
    console.error('Enhanced scoring error:', error);
    const basicResult = await scoreUserDescription(imageDescription, userDescription);
    return {
      ...basicResult,
      detailed_feedback: "Có lỗi trong quá trình chấm điểm chi tiết",
      improvement_suggestions: ["Thử lại với mô tả khác"]
    };
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { 
      image_description, 
      user_description, 
      scoring_type = "basic",
      context 
    } = body;

    if (!image_description || !user_description) {
      return NextResponse.json(
        { 
          success: false, 
          message: "image_description and user_description are required" 
        },
        { status: 400 }
      );
    }

    let result;
    
    if (scoring_type === "enhanced") {
      result = await enhancedScoring(image_description, user_description, context);
    } else {
      result = await scoreUserDescription(image_description, user_description);
    }
    
    return NextResponse.json({
      success: true,
      scoring_type,
      result
    });

  } catch (error) {
    console.error("Score description error:", error);
    return NextResponse.json(
      { 
        success: false, 
        message: "Scoring failed" 
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    message: "AI Teacher Scoring API - Production Image Description Scoring",
    description: "Score user descriptions against real Vision Model analysis",
    features: [
      "Production-Ready Scoring Prompt",
      "JSON-Only Output Format",
      "Detailed Accuracy Analysis",
      "Missing/Wrong Details Detection",
      "Correction Suggestions",
      "Enhanced Scoring with Context"
    ],
    scoring_types: {
      basic: "Standard accuracy scoring with explanation",
      enhanced: "Detailed feedback with improvement suggestions"
    },
    usage: {
      basic_scoring: "POST { image_description: '...', user_description: '...', scoring_type: 'basic' }",
      enhanced_scoring: "POST { image_description: '...', user_description: '...', scoring_type: 'enhanced', context: {...} }"
    },
    output_format: {
      accuracy: "0-100 score",
      is_correct: "true if accuracy >= 70%",
      explanation: "Why the score was given",
      correction: "Correct version of description",
      missing_details: "What user didn't mention",
      wrong_details: "What user got wrong"
    },
    production_prompt: "Embedded production-ready prompt for consistent scoring"
  });
}