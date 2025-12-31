import { NextRequest, NextResponse } from "next/server";
import { OpenAI } from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface AudioComparisonResult {
  matching_score: number;
  text_similarity: number;
  pronunciation_errors: Array<{
    word: string;
    expected: string;
    actual: string;
    error_type: string;
    position: number;
  }>;
  timing_comparison: {
    sample_duration: number;
    user_duration: number;
    speed_ratio: number;
    pace_analysis: string;
  };
  missing_words: string[];
  extra_words: string[];
  suggestions: string[];
  overall_score: number;
  status: "ok" | "error";
  error_message?: string;
}

// Step 3: Real AI Audio Comparison (not mock)
async function compareAudioTranscripts(
  sampleData: any,
  userData: any
): Promise<AudioComparisonResult> {
  try {
    // Real AI comparison using GPT-4 with actual Whisper data
    const comparisonPrompt = `
Bạn là Media Learning Engine thật, sử dụng dữ liệu âm thanh thật từ người dùng.

SAMPLE AUDIO DATA (Whisper Analysis):
${JSON.stringify(sampleData, null, 2)}

USER AUDIO DATA (Whisper Analysis):
${JSON.stringify(userData, null, 2)}

Hãy phân tích bằng cách:
1. Dùng mô hình nhận dạng tiếng nói (Whisper) để tạo transcript từng audio.
2. So sánh transcript của người dùng với transcript mẫu.
3. Dùng scoring từ mô hình để đánh giá:
   - Sai phát âm (dựa trên confidence scores)
   - Từ thiếu
   - Từ được đọc sai âm vị
   - Âm cuối / âm đầu không rõ
   - Trọng âm sai
   - Tốc độ nhanh/chậm (dựa trên timestamps)
   - Ngắt nghỉ

4. Phân tích timing từ word-level timestamps thực tế.
5. Trả về kết quả phân tích thật, không dùng dữ liệu mẫu hay mock.

QUAN TRỌNG: Dựa trên dữ liệu Whisper thật để phân tích, không tự tạo ra kết quả.

Trả về JSON:
{
  "matching_score": số thực từ 0-1 (độ giống nhau tổng thể),
  "text_similarity": % giống transcript (0-100),
  "pronunciation_errors": [
    {
      "word": "từ bị sai",
      "expected": "phát âm đúng",
      "actual": "phát âm thực tế",
      "error_type": "missing_tone|wrong_vowel|unclear_consonant",
      "position": vị_trí_trong_câu
    }
  ],
  "timing_comparison": {
    "sample_duration": thời_gian_mẫu,
    "user_duration": thời_gian_user,
    "speed_ratio": tỉ_lệ_tốc_độ,
    "pace_analysis": "too_fast|too_slow|good_pace"
  },
  "missing_words": ["từ bị thiếu"],
  "extra_words": ["từ thừa"],
  "suggestions": ["gợi ý cải thiện cụ thể"],
  "overall_score": điểm_tổng_0_100
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: comparisonPrompt
        }
      ],
      temperature: 0.2,
      max_tokens: 1000,
    });

    const content = response.choices[0]?.message?.content;
    if (content) {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const result = JSON.parse(jsonMatch[0]);
          return {
            ...result,
            status: "ok"
          };
        } catch (parseError) {
          console.error('Comparison JSON parse error:', parseError);
        }
      }
    }

    // Fallback analysis using basic comparison
    return generateBasicComparison(sampleData, userData);

  } catch (error) {
    console.error('Audio comparison error:', error);
    return {
      matching_score: 0.5,
      text_similarity: 50,
      pronunciation_errors: [],
      timing_comparison: {
        sample_duration: sampleData.duration || 0,
        user_duration: userData.duration || 0,
        speed_ratio: 1.0,
        pace_analysis: "unknown"
      },
      missing_words: [],
      extra_words: [],
      suggestions: ["Có lỗi phân tích, hãy thử lại"],
      overall_score: 50,
      status: "error",
      error_message: error instanceof Error ? error.message : "Comparison failed"
    };
  }
}

// Basic comparison fallback using real Whisper data
function generateBasicComparison(sampleData: any, userData: any): AudioComparisonResult {
  const sampleWords = sampleData.words?.map((w: any) => w.word.toLowerCase()) || [];
  const userWords = userData.words?.map((w: any) => w.word.toLowerCase()) || [];
  
  // Calculate text similarity
  const sampleText = sampleData.transcript.toLowerCase();
  const userText = userData.transcript.toLowerCase();
  const textSimilarity = calculateTextSimilarity(sampleText, userText);
  
  // Find missing and extra words
  const missingWords = sampleWords.filter((word: string) => !userWords.includes(word));
  const extraWords = userWords.filter((word: string) => !sampleWords.includes(word));
  
  // Analyze timing
  const sampleDuration = sampleData.duration || 0;
  const userDuration = userData.duration || 0;
  const speedRatio = sampleDuration > 0 ? userDuration / sampleDuration : 1.0;
  
  let paceAnalysis = "good_pace";
  if (speedRatio < 0.7) paceAnalysis = "too_fast";
  else if (speedRatio > 1.3) paceAnalysis = "too_slow";
  
  // Identify pronunciation errors based on confidence scores
  const pronunciationErrors = userData.words?.filter((word: any) => word.confidence < 0.6)
    .map((word: any, index: number) => ({
      word: word.word,
      expected: word.word,
      actual: word.word,
      error_type: "low_confidence",
      position: index
    })) || [];
  
  // Calculate overall score
  const overallScore = Math.round(
    (textSimilarity * 0.4) + 
    ((1 - Math.abs(speedRatio - 1)) * 100 * 0.3) +
    (Math.max(0, 100 - pronunciationErrors.length * 10) * 0.3)
  );
  
  return {
    matching_score: textSimilarity / 100,
    text_similarity: textSimilarity,
    pronunciation_errors: pronunciationErrors,
    timing_comparison: {
      sample_duration: sampleDuration,
      user_duration: userDuration,
      speed_ratio: speedRatio,
      pace_analysis: paceAnalysis
    },
    missing_words: missingWords,
    extra_words: extraWords,
    suggestions: generateSuggestions(missingWords, extraWords, paceAnalysis, pronunciationErrors.length),
    overall_score: overallScore,
    status: "ok"
  };
}

// Calculate text similarity percentage
function calculateTextSimilarity(text1: string, text2: string): number {
  const words1 = text1.split(/\s+/);
  const words2 = text2.split(/\s+/);
  
  const maxLength = Math.max(words1.length, words2.length);
  if (maxLength === 0) return 100;
  
  let matches = 0;
  const used = new Set<number>();
  
  for (const word1 of words1) {
    for (let i = 0; i < words2.length; i++) {
      if (!used.has(i) && words2[i] === word1) {
        matches++;
        used.add(i);
        break;
      }
    }
  }
  
  return Math.round((matches / maxLength) * 100);
}

// Generate improvement suggestions
function generateSuggestions(
  missingWords: string[], 
  extraWords: string[], 
  paceAnalysis: string, 
  errorCount: number
): string[] {
  const suggestions: string[] = [];
  
  if (missingWords.length > 0) {
    suggestions.push(`Bạn đã bỏ qua ${missingWords.length} từ: ${missingWords.join(', ')}`);
  }
  
  if (extraWords.length > 0) {
    suggestions.push(`Bạn đã thêm ${extraWords.length} từ không cần thiết: ${extraWords.join(', ')}`);
  }
  
  if (paceAnalysis === "too_fast") {
    suggestions.push("Hãy nói chậm lại để phát âm rõ ràng hơn");
  } else if (paceAnalysis === "too_slow") {
    suggestions.push("Có thể nói nhanh hơn một chút để tự nhiên hơn");
  }
  
  if (errorCount > 3) {
    suggestions.push("Tập trung vào phát âm từng từ một cách rõ ràng");
  }
  
  if (suggestions.length === 0) {
    suggestions.push("Phát âm của bạn rất tốt! Hãy tiếp tục luyện tập");
  }
  
  return suggestions;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sample_audio_data, user_audio_data } = body;

    if (!sample_audio_data || !user_audio_data) {
      return NextResponse.json(
        { 
          status: "error", 
          error_message: "Both sample and user audio data required" 
        },
        { status: 400 }
      );
    }

    const comparisonResult = await compareAudioTranscripts(sample_audio_data, user_audio_data);
    
    return NextResponse.json(comparisonResult);

  } catch (error) {
    console.error("Audio compare error:", error);
    return NextResponse.json(
      { 
        status: "error", 
        error_message: "Audio comparison failed" 
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    message: "Audio Comparison API - Real Whisper Data Analysis",
    features: [
      "Real Whisper Transcript Comparison",
      "Word-level Pronunciation Analysis",
      "Timing & Pace Assessment",
      "Missing/Extra Word Detection",
      "Confidence-based Error Detection",
      "Personalized Improvement Suggestions"
    ],
    analysis_types: {
      text_similarity: "Percentage match between transcripts",
      pronunciation_errors: "Words with low confidence or mismatches",
      timing_comparison: "Speed and pacing analysis",
      suggestions: "Specific improvement recommendations"
    },
    schema: {
      input: "{ sample_audio_data: WhisperResult, user_audio_data: WhisperResult }",
      output: "{ matching_score, text_similarity, pronunciation_errors[], timing_comparison, suggestions[] }"
    }
  });
}