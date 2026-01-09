import { NextRequest, NextResponse } from "next/server";
import { getUserApiKeys } from "@/lib/getUserApiKey";
import { callAI, parseJsonFromAI } from "@/lib/aiProvider";
import {
  extractVocabularyFromPDF,
  VOCABULARY_GENERATION_PROMPT,
  VocabularyItem,
  ExtractionLog,
} from "@/lib/pdfVocabularyExtractor";

/**
 * PDF Vocabulary Extraction API
 * 
 * Pipeline:
 * 1. Nhận text từ PDF (đã extract ở upload-ocr)
 * 2. Lọc metadata kỹ thuật
 * 3. NLP chunking (sentences, noun phrases, phrasal verbs)
 * 4. AI sinh nghĩa + ví dụ
 * 5. Trả về kết quả + logs để debug
 */

interface EnrichedVocabulary extends VocabularyItem {
  meaning: string;
  example: string;
  exampleTranslation: string;
  pronunciation: string;
  partOfSpeech: string;
  level: string;
}

async function enrichVocabularyWithAI(
  vocabulary: VocabularyItem[],
  keys: { openaiKey?: string | null; groqKey?: string | null; cohereKey?: string | null }
): Promise<{ enriched: EnrichedVocabulary[]; provider: string; model: string }> {
  
  const words = vocabulary.map(v => v.word);
  
  const prompt = `${VOCABULARY_GENERATION_PROMPT}

Danh sách từ vựng cần xử lý (${words.length} từ):
${words.join(", ")}

Trả về ONLY valid JSON array:`;

  const result = await callAI(prompt, keys, {
    temperature: 0.3,
    maxTokens: 3000,
  });

  if (!result.success) {
    throw new Error(result.error || "AI API error");
  }

  const parsed = parseJsonFromAI(result.content);
  
  if (!parsed || !Array.isArray(parsed)) {
    // Fallback: return vocabulary without AI enrichment
    return {
      enriched: vocabulary.map(v => ({
        ...v,
        meaning: "",
        example: "",
        exampleTranslation: "",
        pronunciation: "",
        partOfSpeech: v.type === "phrasal_verb" ? "phrasal verb" : "noun",
        level: "intermediate",
      })),
      provider: result.provider,
      model: result.model,
    };
  }

  // Merge AI results with original vocabulary
  const enriched: EnrichedVocabulary[] = vocabulary.map((v, index) => {
    const aiItem = parsed.find((p: any) => 
      p.word?.toLowerCase() === v.word.toLowerCase()
    ) || parsed[index] || {};
    
    return {
      ...v,
      meaning: aiItem.meaning || "",
      example: aiItem.example || "",
      exampleTranslation: aiItem.exampleTranslation || "",
      pronunciation: aiItem.pronunciation || "",
      partOfSpeech: aiItem.partOfSpeech || v.type,
      level: aiItem.level || "intermediate",
    };
  });

  return { enriched, provider: result.provider, model: result.model };
}

export async function POST(req: NextRequest) {
  try {
    const { text, userId = "anonymous", includeAI = true, debug = false } = await req.json();

    if (!text || text.trim().length === 0) {
      return NextResponse.json(
        { success: false, message: "Text is required" },
        { status: 400 }
      );
    }

    console.log(`[pdf-vocabulary] User: ${userId}, Text length: ${text.length}`);

    // Step 1-4: Extract vocabulary with logging
    const extraction = extractVocabularyFromPDF(text);

    if (!extraction.success) {
      return NextResponse.json({
        success: false,
        message: extraction.error || "Extraction failed",
        logs: debug ? extraction.logs : undefined,
        stats: extraction.stats,
      }, { status: 400 });
    }

    // Log intermediate results
    console.log(`[pdf-vocabulary] Extracted ${extraction.vocabulary.length} items`);
    console.log(`[pdf-vocabulary] Stats:`, extraction.stats);

    // Step 5: Enrich with AI (if requested and has API keys)
    let finalVocabulary: any[] = extraction.vocabulary;
    let provider = "none";
    let model = "none";

    if (includeAI && extraction.vocabulary.length > 0) {
      const keys = await getUserApiKeys(userId);
      
      if (keys.openaiKey || keys.groqKey || keys.cohereKey) {
        try {
          const aiResult = await enrichVocabularyWithAI(extraction.vocabulary, keys);
          finalVocabulary = aiResult.enriched;
          provider = aiResult.provider;
          model = aiResult.model;
          
          // Log AI result
          extraction.logs.push({
            step: "5_ai_enrichment",
            data: {
              provider,
              model,
              enrichedCount: finalVocabulary.length,
              sample: finalVocabulary.slice(0, 3),
            },
            timestamp: Date.now(),
          });
        } catch (aiError: any) {
          console.error("[pdf-vocabulary] AI enrichment failed:", aiError.message);
          extraction.logs.push({
            step: "5_ai_enrichment_error",
            data: { error: aiError.message },
            timestamp: Date.now(),
          });
        }
      } else {
        extraction.logs.push({
          step: "5_ai_skipped",
          data: { reason: "No API keys available" },
          timestamp: Date.now(),
        });
      }
    }

    return NextResponse.json({
      success: true,
      vocabulary: finalVocabulary,
      stats: extraction.stats,
      provider,
      model,
      logs: debug ? extraction.logs : undefined,
    });

  } catch (error: any) {
    console.error("[pdf-vocabulary] Error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Extraction failed" },
      { status: 500 }
    );
  }
}

/**
 * GET: Debug endpoint to test extraction without AI
 */
export async function GET(req: NextRequest) {
  const text = req.nextUrl.searchParams.get("text");
  
  if (!text) {
    return NextResponse.json({
      success: false,
      message: "Provide ?text=... parameter",
      example: "/api/pdf-vocabulary?text=Climate change is affecting global temperatures.",
    });
  }

  const extraction = extractVocabularyFromPDF(text);
  
  return NextResponse.json({
    success: extraction.success,
    vocabulary: extraction.vocabulary,
    stats: extraction.stats,
    logs: extraction.logs,
    error: extraction.error,
  });
}
