// lib/vocabularyExtractor.ts
import { OpenAI } from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface ExtractedVocabulary {
  word: string;
  type: string; // danh từ, động từ, tính từ, etc.
  meaning: string;
  example: string;
  exampleTranslation: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  category: string;
  imagePrompt: string;
}

export async function extractVocabularyFromText(text: string): Promise<ExtractedVocabulary[]> {
  if (!text || text.trim().length < 10) {
    return [];
  }

  try {
    const prompt = `
Bạn là chuyên gia giảng dạy tiếng Việt. Hãy trích xuất từ vựng từ đoạn văn bản sau và tạo danh sách học từ vựng.

YÊU CẦU:
1. Trích tối đa 110 từ vựng có ý nghĩa
2. Loại bỏ: từ thừa, ký tự đặc biệt, tên riêng không cần thiết
3. Chỉ lấy từ có nghĩa rõ ràng, phục vụ học tiếng Việt
4. Chuẩn hóa: có dấu tiếng Việt, viết đúng chính tả
5. Phân loại cấp độ: beginner (cơ bản), intermediate (trung cấp), advanced (nâng cao)
6. Tạo câu ví dụ có ngữ cảnh rõ ràng, từ vựng xuất hiện tự nhiên trong câu

ĐỊNH DẠNG OUTPUT (JSON):
{
  "vocabularies": [
    {
      "word": "từ vựng",
      "type": "danh từ/động từ/tính từ/trạng từ/giới từ",
      "meaning": "nghĩa tiếng Anh chính xác",
      "example": "câu ví dụ tiếng Việt tự nhiên, có ngữ cảnh rõ ràng",
      "exampleTranslation": "bản dịch tiếng Anh chính xác của câu ví dụ",
      "level": "beginner/intermediate/advanced",
      "category": "công nghệ/giáo dục/y tế/kinh doanh/đời sống/khác",
      "imagePrompt": "mô tả hình ảnh cụ thể, rõ ràng, realistic style, no text, educational illustration"
    }
  ]
}

NGUYÊN TẮC TẠO IMAGE PROMPT:
- Động từ → minh họa hành động cụ thể
- Danh từ → vật thể, đối tượng rõ ràng
- Tính từ → cảnh/tình huống thể hiện tính chất đó
- Không mô tả mơ hồ, không vẽ chữ
- Phong cách: realistic, clear, professional

VĂN BẢN CẦN TRÍCH XUẤT:
${text}

Hãy trả về JSON hợp lệ:`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "Bạn là chuyên gia trích xuất từ vựng tiếng Việt. Luôn trả về JSON hợp lệ."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 4000,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from OpenAI');
    }

    // Parse JSON response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    const result = JSON.parse(jsonMatch[0]);
    return result.vocabularies || [];

  } catch (error) {
    console.error('Error extracting vocabulary:', error);
    
    // Fallback: simple extraction
    return extractVocabularyFallback(text);
  }
}

function extractVocabularyFallback(text: string): ExtractedVocabulary[] {
  // Simple fallback extraction
  const words = text
    .split(/\s+/)
    .filter(w => w.length >= 3 && /[\p{L}]/u.test(w))
    .map(w => w.replace(/[.,;:!?]/g, ""))
    .filter(w => w.length >= 3);

  const uniqueWords = [...new Set(words)].slice(0, 50);

  return uniqueWords.map(word => ({
    word,
    type: "danh từ",
    meaning: `meaning of ${word}`,
    example: `Đây là ví dụ với từ "${word}".`,
    exampleTranslation: `This is an example with the word "${word}".`,
    level: 'intermediate' as const,
    category: 'khác',
    imagePrompt: `illustration of ${word}, realistic style, clear and simple`
  }));
}

export function calculateWordLevel(word: string, context: string): 'beginner' | 'intermediate' | 'advanced' {
  // Simple heuristic for word difficulty
  const commonWords = [
    'là', 'có', 'được', 'này', 'một', 'người', 'tôi', 'bạn', 'chúng', 'họ',
    'làm', 'đi', 'đến', 'về', 'trong', 'ngoài', 'trên', 'dưới', 'với', 'cho'
  ];
  
  const intermediateWords = [
    'phát triển', 'công nghệ', 'thông tin', 'hệ thống', 'ứng dụng', 'giải pháp',
    'quản lý', 'kinh doanh', 'marketing', 'dịch vụ', 'sản phẩm'
  ];

  if (commonWords.includes(word.toLowerCase())) {
    return 'beginner';
  } else if (word.length > 8 || intermediateWords.some(w => word.includes(w))) {
    return 'advanced';
  } else {
    return 'intermediate';
  }
}