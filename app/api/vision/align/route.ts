import { NextRequest, NextResponse } from "next/server";
import { getOpenAI } from '@/lib/openai';



interface AlignmentJSON {
  image_id: string;
  user_text: string;
  match: "MATCH" | "PARTIAL" | "MISMATCH";
  content_score: number;
  language_score: number;
  total_score: number;
  errors: string[];
  suggest: string;
  status: "ok" | "error";
  error_message?: string;
}

// Alignment Module - Compare user text with vision data
async function alignUserResponseWithVision(
  visionData: any, 
  userText: string, 
  asrConfidence: number = 1.0
): Promise<AlignmentJSON> {
  try {
    // Enhanced alignment prompt with explicit rules
    const alignmentPrompt = `
SYSTEM: Bạn là Alignment Module: nhiệm vụ so sánh user_text với vision_data và trả JSON theo schema.

INPUT:
vision_data = ${JSON.stringify(visionData, null, 2)}
user_text = "${userText}"
asr_confidence = ${asrConfidence}

TASK:
1) Nếu user_text đề cập đến một object phải kiểm tra object đó xuất hiện trong vision_data.objects (confidence>0.4) để coi là "present".

2) Quy tắc content_score (0-60):
   - MATCH: >=45 (phần lớn thông tin chính khớp)
   - PARTIAL: 20-44 (một số phần khớp, vài lỗi nhỏ)  
   - MISMATCH: <=19 (thông tin chính sai)

3) language_score (0-40): đánh giá ngữ pháp/fluency; nếu asr_confidence <0.6 giảm tối thiểu 10 điểm.

4) Phát hiện factual errors:
   - Nếu user nói có object X nhưng vision_data không có → "mentions_X_but_not_present"
   - Nếu user nói sai số lượng → "incorrect_quantity"
   - Nếu user nói sai vị trí/scene → "incorrect_location"

5) Tạo câu suggest: sửa lỗi factual + cải thiện ngữ pháp dựa trên vision_data thực tế.

TRẢ JSON (KHÔNG KÈM TEXT KHÁC):
{
  "image_id": "${visionData.image_id}",
  "user_text": "${userText}",
  "match": "MATCH|PARTIAL|MISMATCH",
  "content_score": int,
  "language_score": int,
  "total_score": int,
  "errors": ["error1", "error2"],
  "suggest": "corrected sentence based on actual vision_data",
  "status": "ok"
}

IMPORTANT: Base ALL judgments only on vision_data and user_text. Do not hallucinate.

FEW-SHOT EXAMPLES:

Example 1 - MATCH:
vision_data: {"objects":[{"name":"person","confidence":0.98}], "summary":"A woman reading in cafe"}
user_text: "Một người phụ nữ đang đọc sách trong quán cà phê"
→ {"match":"MATCH","content_score":55,"language_score":38,"total_score":93,"errors":[],"suggest":"Câu của bạn rất chính xác!"}

Example 2 - MISMATCH:
vision_data: {"objects":[{"name":"person","confidence":0.95}], "notes":"no_train_detected"}
user_text: "Có một chiếc xe lửa trong ảnh"
→ {"match":"MISMATCH","content_score":8,"language_score":30,"total_score":38,"errors":["mentions_train_but_not_present"],"suggest":"Mình thấy một người đứng trong ảnh, không có xe lửa."}

Now analyze the actual input:`;

    const response = await getOpenAI().chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: alignmentPrompt
        }
      ],
      temperature: 0.1,
      max_tokens: 600,
    });

    const content = response.choices[0]?.message?.content;
    if (content) {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const alignmentResult = JSON.parse(jsonMatch[0]);
          
          // Validate and ensure proper structure
          return {
            image_id: alignmentResult.image_id || visionData.image_id,
            user_text: alignmentResult.user_text || userText,
            match: alignmentResult.match || "PARTIAL",
            content_score: Math.max(0, Math.min(60, alignmentResult.content_score || 30)),
            language_score: Math.max(0, Math.min(40, alignmentResult.language_score || 25)),
            total_score: Math.max(0, Math.min(100, alignmentResult.total_score || 55)),
            errors: Array.isArray(alignmentResult.errors) ? alignmentResult.errors : [],
            suggest: alignmentResult.suggest || "Hãy thử mô tả lại những gì bạn thấy trong ảnh.",
            status: "ok"
          };
        } catch (parseError) {
          console.error('Alignment JSON parse error:', parseError);
        }
      }
    }

    // Fallback alignment with basic rules
    const hasMatchingObjects = checkObjectMatches(visionData, userText);
    const basicLanguageScore = Math.max(20, 40 - (asrConfidence < 0.6 ? 15 : 0));
    
    return {
      image_id: visionData.image_id,
      user_text: userText,
      match: hasMatchingObjects ? "PARTIAL" : "MISMATCH",
      content_score: hasMatchingObjects ? 35 : 15,
      language_score: basicLanguageScore,
      total_score: (hasMatchingObjects ? 35 : 15) + basicLanguageScore,
      errors: hasMatchingObjects ? [] : ["content_mismatch_detected"],
      suggest: "Hãy mô tả những gì bạn thực sự thấy trong ảnh.",
      status: "ok"
    };

  } catch (error) {
    console.error('Alignment error:', error);
    return {
      image_id: visionData.image_id || "unknown",
      user_text: userText,
      match: "MISMATCH",
      content_score: 0,
      language_score: 20,
      total_score: 20,
      errors: ["alignment_processing_error"],
      suggest: "Có lỗi xử lý, hãy thử lại.",
      status: "error",
      error_message: error instanceof Error ? error.message : "Alignment failed"
    };
  }
}

// Helper function to check basic object matches
function checkObjectMatches(visionData: any, userText: string): boolean {
  if (!visionData.objects || !Array.isArray(visionData.objects)) return false;
  
  const detectedObjects = visionData.objects
    .filter((obj: any) => obj.confidence > 0.4)
    .map((obj: any) => obj.name.toLowerCase());
  
  const userTextLower = userText.toLowerCase();
  
  // Check for common Vietnamese object mentions
  const objectMentions = [
    { vietnamese: ['người', 'người phụ nữ', 'người đàn ông', 'con người'], english: 'person' },
    { vietnamese: ['xe lửa', 'tàu hỏa', 'tàu'], english: 'train' },
    { vietnamese: ['xe hơi', 'ô tô', 'xe'], english: 'car' },
    { vietnamese: ['cây thông', 'cây'], english: 'christmas_tree' },
    { vietnamese: ['bàn'], english: 'table' },
    { vietnamese: ['ghế'], english: 'chair' }
  ];
  
  for (const mapping of objectMentions) {
    const mentionedInText = mapping.vietnamese.some(vn => userTextLower.includes(vn));
    const presentInVision = detectedObjects.includes(mapping.english);
    
    if (mentionedInText && presentInVision) return true;
    if (mentionedInText && !presentInVision) return false; // Factual error
  }
  
  return true; // No clear mismatch found
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { vision_json, transcript, asr_confidence = 1.0 } = body;

    if (!vision_json || !transcript) {
      return NextResponse.json(
        { 
          status: "error", 
          error_message: "vision_json and transcript required" 
        },
        { status: 400 }
      );
    }

    const alignmentResult = await alignUserResponseWithVision(
      vision_json, 
      transcript, 
      asr_confidence
    );
    
    return NextResponse.json(alignmentResult);

  } catch (error) {
    console.error("Vision align error:", error);
    return NextResponse.json(
      { 
        status: "error", 
        error_message: "Alignment processing failed" 
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    message: "Vision Alignment API - Content vs Image Accuracy",
    features: [
      "Content Accuracy Scoring (0-60)",
      "Language Quality Scoring (0-40)", 
      "MATCH/PARTIAL/MISMATCH Classification",
      "Factual Error Detection",
      "ASR Confidence Integration",
      "Corrected Sentence Generation"
    ],
    scoring_rules: {
      content_score: "MATCH ≥45, PARTIAL 20-44, MISMATCH ≤19",
      language_score: "Grammar + fluency, reduced if ASR confidence < 0.6",
      total_score: "content_score + language_score (max 100)"
    },
    schema: {
      input: "{ vision_json, transcript, asr_confidence? }",
      output: "AlignmentJSON with scores and corrections"
    }
  });
}

