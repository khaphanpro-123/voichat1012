// lib/vocabularyExtractor.ts
import { OpenAI } from 'openai';
import { preprocessDocumentText, isMeaningfulVocabulary } from './metadataFilter';

// Lazy-load OpenAI client to avoid build-time errors
let openaiClient: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('Missing OPENAI_API_KEY environment variable');
    }
    openaiClient = new OpenAI({ apiKey });
  }
  return openaiClient;
}

export interface ExtractedVocabulary {
  word: string;
  type: string; // danh từ, động từ, tính từ, etc.
  meaning: string;
  example: string;
  exampleTranslation: string;
  ipa?: string; // IPA pronunciation
  level: 'beginner' | 'intermediate' | 'advanced';
  category: string;
  imagePrompt: string;
}

export async function extractVocabularyFromText(text: string): Promise<ExtractedVocabulary[]> {
  if (!text || text.trim().length < 10) {
    return [];
  }

  try {
    // Pre-process text to remove metadata
    const { cleanedText, stats } = preprocessDocumentText(text);
    
    console.log('[Vocabulary Extraction] Pre-processing stats:', stats);
    console.log(`[Vocabulary Extraction] Removed ${stats.estimatedMetadataRemoved}% metadata`);
    
    // If too much was removed, the text might be mostly metadata
    if (stats.estimatedMetadataRemoved > 90) {
      console.warn('[Vocabulary Extraction] Text appears to be mostly metadata');
      return [];
    }

    const prompt = `
Bạn là chuyên gia trích xuất từ vựng tiếng Việt với khả năng lọc metadata kỹ thuật.

NHIỆM VỤ: Trích xuất từ vựng có nghĩa từ văn bản, LOẠI BỎ hoàn toàn metadata kỹ thuật.

QUY TẮC LỌC METADATA (BẮT BUỘC):
1. LOẠI BỎ hoàn toàn:
   - Metadata PDF: CMYK, RGB, DeviceCMYK, BitsPerComponent, Colorspace, XObject, FontDescriptor, Distiller, Acrobat
   - Tên font: Times New Roman, Arial, Helvetica, Calibri, v.v.
   - Ký tự kỹ thuật: /Type, << >>, {}, [], /, <, >
   - Từ toàn chữ hoa không phải tên riêng có nghĩa (CMYK, RGB, PDF, OCR)
   - Số liệu kỹ thuật: encoding, compression, resolution
   - Tên phần mềm: Adobe, Microsoft, Google Docs

2. CHỈ GIỮ LẠI:
   - Danh từ có nghĩa rõ ràng (người, vật, khái niệm)
   - Động từ hành động cụ thể
   - Tính từ mô tả tính chất
   - Từ xuất hiện trong ngữ cảnh học tập/nội dung chính

3. PHÂN TÍCH NGỮ CẢNH:
   - Ưu tiên từ xuất hiện nhiều lần trong nội dung chính
   - Loại bỏ từ chỉ xuất hiện 1 lần và không có ngữ cảnh rõ ràng
   - Kiểm tra xem từ có ý nghĩa trong câu hay chỉ là metadata

4. CHUẨN HÓA:
   - Viết đúng chính tả tiếng Việt (có dấu)
   - Lemmatization: đưa về dạng gốc (ví dụ: "học sinh" thay vì "các học sinh")
   - Loại bỏ dấu câu thừa

YÊU CẦU OUTPUT:
- Trích tối đa 110 từ vựng CÓ NGHĨA
- Phân loại cấp độ: beginner (cơ bản), intermediate (trung cấp), advanced (nâng cao)
- Tạo câu ví dụ tự nhiên, có ngữ cảnh rõ ràng
- Phân loại category: công nghệ/giáo dục/y tế/kinh doanh/đời sống/khác

ĐỊNH DẠNG JSON:
{
  "vocabularies": [
    {
      "word": "từ vựng có nghĩa",
      "type": "danh từ/động từ/tính từ/trạng từ/giới từ",
      "meaning": "nghĩa tiếng Anh chính xác",
      "example": "câu ví dụ tiếng Việt tự nhiên",
      "exampleTranslation": "bản dịch tiếng Anh của câu ví dụ",
      "level": "beginner/intermediate/advanced",
      "category": "công nghệ/giáo dục/y tế/kinh doanh/đời sống/khác",
      "imagePrompt": "mô tả hình ảnh cụ thể, realistic style, no text"
    }
  ]
}

VÍ DỤ LỌC:
❌ LOẠI BỎ: "CMYK", "DeviceCMYK", "Times New Roman", "FontDescriptor", "/Type", "Acrobat Distiller"
✅ GIỮ LẠI: "cam" (orange), "học sinh" (student), "công nghệ" (technology), "phát triển" (develop)

VĂN BẢN CẦN TRÍCH XUẤT (đã được làm sạch metadata):
${cleanedText}

Hãy phân tích kỹ và chỉ trả về từ vựng CÓ NGHĨA, loại bỏ hoàn toàn metadata. Trả về JSON hợp lệ:`;

    const response = await getOpenAI().chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "Bạn là chuyên gia trích xuất từ vựng tiếng Việt với khả năng lọc metadata kỹ thuật mạnh mẽ. Luôn loại bỏ metadata PDF/Word và chỉ giữ từ vựng có nghĩa. Luôn trả về JSON hợp lệ."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.2, // Lower temperature for more consistent filtering
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
    
    // Additional client-side filtering for safety
    const filtered = (result.vocabularies || []).filter((vocab: ExtractedVocabulary) => {
      return isMeaningfulVocabulary(vocab.word);
    });
    
    console.log(`[Vocabulary Extraction] Extracted ${filtered.length} meaningful words`);
    
    return filtered;

  } catch (error) {
    console.error('Error extracting vocabulary:', error);
    
    // Fallback: simple extraction with metadata filtering
    return extractVocabularyFallback(text);
  }
}

function extractVocabularyFallback(text: string): ExtractedVocabulary[] {
  // Pre-process text first
  const { cleanedText } = preprocessDocumentText(text);
  
  // Extract words
  const words = cleanedText
    .split(/\s+/)
    .filter(w => w.length >= 3 && /[\p{L}]/u.test(w))
    .map(w => w.replace(/[.,;:!?]/g, ""))
    .filter(w => isMeaningfulVocabulary(w));

  const uniqueWords = [...new Set(words)].slice(0, 50);

  return uniqueWords.map(word => ({
    word,
    type: "danh từ",
    meaning: `meaning of ${word}`,
    example: `Đây là ví dụ với từ "${word}".`,
    exampleTranslation: `This is an example with the word "${word}".`,
    level: 'intermediate' as const,
    category: 'khác',
    imagePrompt: `illustration of ${word}, realistic style, clear and simple, no text`
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