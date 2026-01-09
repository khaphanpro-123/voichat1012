// lib/phraseExtractorAI.ts
// Bước 2: Trích lọc cụm từ/từ vựng theo ngữ cảnh

import { OpenAI } from 'openai';
import { ContextAnalysis, shouldExcludeTerm } from './contextAnalyzer';

let openaiClient: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error('Missing OPENAI_API_KEY');
    openaiClient = new OpenAI({ apiKey });
  }
  return openaiClient;
}

export interface ExtractedPhrase {
  term: string;
  translation_vi: string;
  category: 'theory' | 'model' | 'method' | 'tool' | 'process' | 'principle' | 'dataset' | 'metric' | 'concept' | 'vocabulary';
  definition: string;
  example: string;
  source_span: string;
  confidence: number;
  tags: string[];
}

export interface PhraseExtractionResult {
  contextRef: {
    domains: string[];
    themes: string[];
  };
  phrases: ExtractedPhrase[];
}

export async function extractPhrasesWithContext(
  text: string, 
  context: ContextAnalysis
): Promise<PhraseExtractionResult> {
  const prompt = `Nhiệm vụ: Dựa trên ngữ cảnh đã phân tích và toàn văn bản, hãy trích lọc CỤM TỪ có ý nghĩa học tập (ưu tiên đa từ) để tạo flashcards.

NGỮ CẢNH ĐÃ PHÂN TÍCH:
- Lĩnh vực: ${context.domains.join(', ')}
- Chủ đề: ${context.themes.join(', ')}
- Thuật ngữ chính: ${context.keyTheories.map(t => t.term).join(', ')}
- Loại trừ: ${context.excludePatterns.join(', ')}

TIÊU CHÍ CHỌN CỤM TỪ:
- Ưu tiên cụm từ 2–5 từ: thuật ngữ, khái niệm, tên giả thuyết, mô hình, quy trình, công cụ học thuật
- Phù hợp với domains và themes đã xác định
- Loại bỏ các từ/cụm trong excludePatterns và mọi metadata/ký hiệu kỹ thuật
- Tránh từ đơn chung chung nếu không mang nghĩa chuyên ngành rõ ràng
- Bao gồm cả từ vựng tiếng Anh quan trọng trong văn bản

YÊU CẦU CHO MỖI MỤC:
- term: Cụm từ gốc (giữ nguyên ngôn ngữ gốc)
- translation_vi: Dịch tiếng Việt ngắn gọn, tự nhiên
- category: one of ["theory","model","method","tool","process","principle","concept","vocabulary"]
- definition: 1–2 câu, dựa vào ngữ cảnh văn bản
- example: 1 câu ví dụ minh họa cách dùng
- source_span: Mô tả ngắn đoạn trong văn bản nơi cụm từ xuất hiện
- confidence: số 0–1 (mức độ tin cậy)
- tags: mảng từ khóa liên quan

Định dạng đầu ra (JSON):
{
  "contextRef": { "domains": [...], "themes": [...] },
  "phrases": [
    {
      "term": "Input Hypothesis",
      "translation_vi": "Giả thuyết Đầu vào",
      "category": "theory",
      "definition": "Giả thuyết cho rằng người học thụ đắc ngôn ngữ khi tiếp xúc đầu vào hơi vượt quá trình độ hiện tại (i+1).",
      "example": "Trong voice-chat, hệ thống điều chỉnh hội thoại ở mức i+1 để phù hợp mức độ của người học.",
      "source_span": "Phần 2.1 – Voice-chat",
      "confidence": 0.92,
      "tags": ["SLA","Krashen","input","i+1"]
    }
  ]
}

GIỚI HẠN: Tổng số phrases: 30–60 (tùy độ dài văn bản)

VĂN BẢN:
${text.slice(0, 10000)}

Trả về JSON hợp lệ:`;

  try {
    const response = await getOpenAI().chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "Bạn là chuyên gia trích xuất từ vựng và cụm từ học thuật. Luôn trả về JSON hợp lệ." },
        { role: "user", content: prompt }
      ],
      temperature: 0.3,
      max_tokens: 4000,
    });

    const content = response.choices[0]?.message?.content || '';
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON in response');
    
    const result: PhraseExtractionResult = JSON.parse(jsonMatch[0]);
    
    // Filter out excluded terms
    result.phrases = result.phrases.filter(
      phrase => !shouldExcludeTerm(phrase.term, context.excludePatterns)
    );
    
    // Remove duplicates
    const seen = new Set<string>();
    result.phrases = result.phrases.filter(phrase => {
      const key = phrase.term.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    
    // Sort by confidence
    result.phrases.sort((a, b) => b.confidence - a.confidence);
    
    return result;
  } catch (error) {
    console.error('Phrase extraction error:', error);
    return {
      contextRef: { domains: context.domains, themes: context.themes },
      phrases: []
    };
  }
}
