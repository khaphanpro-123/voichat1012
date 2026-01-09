import { NextRequest, NextResponse } from "next/server";
import { getUserApiKeys } from "@/lib/getUserApiKey";
import { callAI, parseJsonFromAI } from "@/lib/aiProvider";
import { preprocessText, filterVocabulary, validateWord } from "@/lib/textPreprocessor";
import { extractVocabularyFromPDF, removeMetadata, validatePDFContent } from "@/lib/pdfVocabularyExtractor";

const SYSTEM_PROMPT = `Bạn là hệ thống xử lý văn bản để tạo flashcards học ngoại ngữ. 

QUAN TRỌNG - LOẠI BỎ METADATA:
- KHÔNG trích các chuỗi kỹ thuật: rdf, xmlns, xmp, adobe, uuid, checksum, moddate, base64
- KHÔNG trích các chuỗi vô nghĩa: w5m0mpceihzreszntzcex9d, rdfrdf, xxmpmeta
- KHÔNG trích DOI, URL, mã hex, mã hóa
- CHỈ trích từ/cụm từ tiếng Anh có nghĩa thực sự

Nhiệm vụ:
1. Chuẩn hoá văn bản: loại bỏ ký tự thừa, sửa lỗi OCR
2. Tách câu, đếm từ
3. ƯU TIÊN TRÍCH CỤM TỪ thay vì từ đơn lẻ:
   - Cụm danh từ: "climate change", "social media"
   - Cụm động từ: "look forward to", "give up"
   - Collocations: "make a decision", "take responsibility"
4. Chỉ trích từ đơn khi là động từ/tính từ quan trọng

Trả về JSON (KHÔNG markdown):
{
  "total_words": number,
  "unique_words": number,
  "sentences": string[],
  "vocabulary": string[],
  "noun_phrases": string[],
  "verb_phrases": string[],
  "collocations": string[]
}`;

const VOCABULARY_EXTRACTION_PROMPT = `Bạn là hệ thống trích xuất từ vựng tiếng Anh cho người Việt.

⚠️ QUAN TRỌNG - LOẠI BỎ HOÀN TOÀN:
- Metadata kỹ thuật: rdf, xmlns, xmp, adobe, pdf, uuid, checksum
- Chuỗi mã hóa: base64, hex, hash
- Chuỗi vô nghĩa: w5m0mpceihzreszntzcex9d, rdfrdf, xxmpmeta
- DOI, URL, đường dẫn file
- Từ không có trong từ điển tiếng Anh

✅ CHỈ TRÍCH:
1. CỤM TỪ có nghĩa (ưu tiên):
   - Noun phrases: "climate change", "artificial intelligence"
   - Phrasal verbs: "look forward to", "take care of"
   - Collocations: "make a decision", "pay attention"

2. TỪ ĐƠN quan trọng:
   - Động từ: "analyze", "implement"
   - Tính từ: "significant", "effective"
   - Danh từ chuyên ngành: "algorithm", "hypothesis"

3. KHÔNG TRÍCH:
   - Stopwords (the, a, is, are, have, etc.)
   - Từ quá đơn giản (good, bad, big, very)
   - Đại từ, giới từ đơn lẻ
   - Số, ký hiệu

Trả về JSON (KHÔNG markdown, tối đa 30 mục):
{
  "vocabulary": ["climate change", "take into account", "significant"],
  "total_extracted": number
}`;

async function analyzeText(text: string, keys: { openaiKey?: string | null; groqKey?: string | null; cohereKey?: string | null }) {
  // Preprocess text first
  const { cleanText, stats } = preprocessText(text);
  console.log(`[analyze-text] Preprocessed: ${stats.originalLength} -> ${stats.cleanLength} chars, removed ${stats.metadataRemoved} metadata, ${stats.noiseRemoved} noise`);

  const prompt = `${SYSTEM_PROMPT}

Văn bản đã được làm sạch:

${cleanText.slice(0, 4000)}

Trả về ONLY valid JSON:`;

  const result = await callAI(prompt, keys, { temperature: 0.3, maxTokens: 2048 });

  if (!result.success) {
    throw new Error(result.error || "AI API error");
  }

  const parsed = parseJsonFromAI(result.content);
  if (parsed) {
    // Post-filter vocabulary
    if (parsed.vocabulary) {
      const { valid } = filterVocabulary(parsed.vocabulary);
      parsed.vocabulary = valid;
    }
    return { ...parsed, provider: result.provider, model: result.model, preprocessStats: stats };
  }
  
  throw new Error("Invalid response format");
}

async function extractVocabulary(text: string, keys: { openaiKey?: string | null; groqKey?: string | null; cohereKey?: string | null }) {
  // Step 1: Validate content
  const validation = validatePDFContent(text);
  if (!validation.valid) {
    console.log(`[extract-vocab] Validation failed: ${validation.reason}`);
  }

  // Step 2: Use improved PDF extractor for pre-processing
  const pdfExtraction = extractVocabularyFromPDF(text);
  const preExtractedWords = pdfExtraction.vocabulary.map(v => v.word);
  
  console.log(`[extract-vocab] Pre-extracted ${preExtractedWords.length} items from NLP`);
  console.log(`[extract-vocab] Stats: ${JSON.stringify(pdfExtraction.stats)}`);

  // Step 3: Also preprocess with original preprocessor
  const { cleanText, stats } = preprocessText(text);
  console.log(`[extract-vocab] Preprocessed: ${stats.originalLength} -> ${stats.cleanLength} chars`);

  // Step 4: Use AI to refine and add more vocabulary
  const prompt = `${VOCABULARY_EXTRACTION_PROMPT}

Văn bản cần trích xuất (đã lọc metadata):

${cleanText.slice(0, 3000)}

Từ vựng đã trích sẵn bằng NLP (tham khảo): ${preExtractedWords.slice(0, 20).join(", ")}

Hãy bổ sung thêm từ vựng quan trọng và trả về ONLY valid JSON:`;

  const result = await callAI(prompt, keys, { temperature: 0.3, maxTokens: 2048 });

  if (!result.success) {
    // Fallback to pre-extracted vocabulary if AI fails
    console.log(`[extract-vocab] AI failed, using pre-extracted vocabulary`);
    return {
      vocabulary: preExtractedWords,
      total_extracted: preExtractedWords.length,
      provider: "nlp",
      model: "local",
      preprocessStats: stats,
      pdfExtractionLogs: pdfExtraction.logs,
    };
  }

  const parsed = parseJsonFromAI(result.content);
  if (parsed) {
    let vocabList: string[] = [];
    
    if (Array.isArray(parsed.vocabulary)) {
      vocabList = parsed.vocabulary;
    } else if (Array.isArray(parsed)) {
      vocabList = parsed;
    }

    // Merge AI results with pre-extracted vocabulary
    const mergedVocab = [...new Set([...vocabList, ...preExtractedWords])];

    // Filter out invalid words
    const { valid, rejected } = filterVocabulary(mergedVocab);
    
    if (rejected.length > 0) {
      console.log(`[extract-vocab] Rejected ${rejected.length} items:`, rejected.slice(0, 5));
    }

    return {
      vocabulary: valid,
      total_extracted: valid.length,
      provider: result.provider,
      model: result.model,
      preprocessStats: stats,
      pdfExtractionStats: pdfExtraction.stats,
      rejected: rejected.length,
    };
  }
  
  // Fallback to pre-extracted if AI response invalid
  return {
    vocabulary: preExtractedWords,
    total_extracted: preExtractedWords.length,
    provider: "nlp",
    model: "local",
    preprocessStats: stats,
  };
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
        { success: false, message: "Chưa có API key. Vui lòng thêm Groq hoặc OpenAI key trong Settings." },
        { status: 400 }
      );
    }

    console.log(`[analyze-text] User: ${userId}, Action: ${action || "default"}, Text length: ${text.length}`);
    
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
      model: result.model,
    });
  } catch (error: any) {
    console.error("[analyze-text] Error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to analyze text" },
      { status: 500 }
    );
  }
}
