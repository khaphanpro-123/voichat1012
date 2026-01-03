import { NextRequest, NextResponse } from "next/server";
import { getOpenAI } from '@/lib/openai';



interface FeedbackResult {
  feedback_text: string;
  next_question: string;
  practice_sentences: string[];
  pronunciation_tip?: string;
  status: "ok" | "error";
  error_message?: string;
}

// Teacher Module - Generate friendly Vietnamese feedback
async function generateTeacherFeedback(
  alignmentData: any,
  asrConfidence: number = 1.0
): Promise<FeedbackResult> {
  try {
    const teacherPrompt = `
SYSTEM: Bạn là một giáo viên AI thân thiện, chuyên chấm speaking. Input là JSON từ phần Alignment. Tạo phản hồi tiếng Việt với tông giọng khuyến khích, nhẹ nhàng, hướng dẫn.

ALIGNMENT DATA:
${JSON.stringify(alignmentData, null, 2)}
ASR_CONFIDENCE: ${asrConfidence}

NHIỆM VỤ: Tạo phản hồi với cấu trúc:
1. Điểm số và đánh giá tổng quan
2. Nhận xét về nội dung (nếu có lỗi factual) 
3. Sửa câu gợi ý (nếu cần)
4. Hai câu luyện tập follow-up
5. Ghi chú về phát âm (nếu asr_confidence < 0.6)

TEMPLATE MẪU:
"Điểm: {total_score}/100 (Nội dung: {content_score}/60 — Ngữ pháp: {language_score}/40)

Nhận xét: [Đánh giá tích cực trước] + [Chỉ ra lỗi nếu có] + [Giải thích tại sao]

Sửa câu gợi ý: '{suggest}'

Hãy thử nói lại hai câu sau:
1) '[Câu luyện tập 1 dựa trên nội dung ảnh thực tế]'
2) '[Câu luyện tập 2 mở rộng chủ đề]'

[Phát âm: ghi chú nếu ASR confidence thấp]"

TRẢ JSON:
{
  "feedback_text": "văn bản phản hồi đầy đủ theo template",
  "next_question": "câu hỏi tiếp theo để khuyến khích học sinh",
  "practice_sentences": ["câu 1", "câu 2"],
  "pronunciation_tip": "ghi chú phát âm nếu cần",
  "status": "ok"
}

VÍ DỤ CỤ THỂ:

Nếu MATCH (điểm cao):
"Tuyệt vời! Bạn đã mô tả chính xác những gì trong ảnh. Câu nói rất tự nhiên và đúng ngữ pháp."

Nếu MISMATCH (có lỗi factual):
"Câu của bạn đúng ngữ pháp nhưng KHÔNG KHỚP với ảnh: [giải thích cụ thể lỗi]. Trong ảnh thực tế có [những gì thật sự có]."

Nếu ASR confidence < 0.6:
"Phát âm: Hãy thử nói chậm hơn và rõ ràng hơn. Chú ý âm 'th' và nối từ."

Tạo feedback cho alignment data trên:`;

    const response = await getOpenAI().chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: teacherPrompt
        }
      ],
      temperature: 0.4,
      max_tokens: 800,
    });

    const content = response.choices[0]?.message?.content;
    if (content) {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const feedbackResult = JSON.parse(jsonMatch[0]);
          return {
            feedback_text: feedbackResult.feedback_text || generateFallbackFeedback(alignmentData),
            next_question: feedbackResult.next_question || "Bạn có thể mô tả thêm chi tiết về ảnh không?",
            practice_sentences: Array.isArray(feedbackResult.practice_sentences) 
              ? feedbackResult.practice_sentences 
              : ["Hãy thử nói lại câu vừa rồi.", "Bạn có thể thêm chi tiết không?"],
            pronunciation_tip: asrConfidence < 0.6 ? 
              (feedbackResult.pronunciation_tip || "Hãy nói chậm và rõ ràng hơn.") : 
              undefined,
            status: "ok"
          };
        } catch (parseError) {
          console.error('Feedback JSON parse error:', parseError);
        }
      }
    }

    // Fallback feedback generation
    return {
      feedback_text: generateFallbackFeedback(alignmentData),
      next_question: "Bạn có thể thử mô tả lại không?",
      practice_sentences: [
        "Hãy nói về những gì bạn thấy trong ảnh.",
        "Bạn có thể thêm chi tiết về màu sắc và vị trí không?"
      ],
      pronunciation_tip: asrConfidence < 0.6 ? "Hãy nói chậm và rõ ràng hơn." : undefined,
      status: "ok"
    };

  } catch (error) {
    console.error('Teacher feedback error:', error);
    return {
      feedback_text: "Có lỗi xử lý phản hồi. Hãy thử lại nhé!",
      next_question: "Bạn có thể thử lại không?",
      practice_sentences: ["Thử nói lại câu vừa rồi.", "Hãy mô tả những gì bạn th��y."],
      status: "error",
      error_message: error instanceof Error ? error.message : "Feedback generation failed"
    };
  }
}

// Generate fallback feedback based on alignment data
function generateFallbackFeedback(alignmentData: any): string {
  const { total_score, content_score, language_score, match, errors, suggest } = alignmentData;
  
  let feedback = `Điểm: ${total_score}/100 (Nội dung: ${content_score}/60 — Ngữ pháp: ${language_score}/40)\n\n`;
  
  if (match === "MATCH") {
    feedback += "Tuyệt vời! Bạn đã mô tả chính xác những gì trong ảnh. Câu nói rất tự nhiên và đúng ngữ pháp.";
  } else if (match === "PARTIAL") {
    feedback += "Khá tốt! Một số thông tin đúng nhưng còn thiếu chi tiết hoặc có vài lỗi nhỏ.";
  } else {
    feedback += "Câu của bạn có ngữ pháp ổn nhưng KHÔNG KHỚP với nội dung ảnh.";
    if (errors.length > 0) {
      feedback += ` Lỗi phát hiện: ${errors.join(', ')}.`;
    }
  }
  
  if (suggest && suggest !== alignmentData.user_text) {
    feedback += `\n\nSửa câu gợi ý: "${suggest}"`;
  }
  
  feedback += "\n\nHãy thử nói lại hai câu sau:\n1) 'Mô tả những gì bạn thấy rõ nhất trong ảnh.'\n2) 'Thêm chi tiết về màu sắc và vị trí.'";
  
  return feedback;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { alignment_json, asr_confidence = 1.0 } = body;

    if (!alignment_json) {
      return NextResponse.json(
        { 
          status: "error", 
          error_message: "alignment_json required" 
        },
        { status: 400 }
      );
    }

    const feedbackResult = await generateTeacherFeedback(alignment_json, asr_confidence);
    
    return NextResponse.json(feedbackResult);

  } catch (error) {
    console.error("Vision feedback error:", error);
    return NextResponse.json(
      { 
        status: "error", 
        error_message: "Feedback generation failed" 
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    message: "Teacher Feedback API - Friendly Vietnamese Learning Response",
    features: [
      "Encouraging, Educational Tone",
      "Structured Feedback Format",
      "Score Explanation & Analysis", 
      "Corrected Sentence Suggestions",
      "Practice Sentence Generation",
      "Pronunciation Tips (ASR-based)",
      "Factual Error Explanations"
    ],
    feedback_structure: [
      "1. Score Summary (content + language)",
      "2. Content Assessment (factual accuracy)",
      "3. Corrected Sentence (if needed)",
      "4. Two Practice Sentences",
      "5. Pronunciation Notes (if ASR confidence < 0.6)"
    ],
    schema: {
      input: "{ alignment_json, asr_confidence? }",
      output: "{ feedback_text, next_question, practice_sentences, pronunciation_tip? }"
    }
  });
}

