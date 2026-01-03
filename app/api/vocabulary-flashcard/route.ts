import { NextRequest, NextResponse } from "next/server";
import {
  extractVocabularyFlashcards,
  ExtractionConfig,
  ExtractionOptions,
  VocabularyFlashcard,
} from "@/lib/flashcardExtractor";
import { getUserApiKeys } from "@/lib/getUserApiKey";
import { extractText } from "@/lib/phraseExtractor/textExtract";
import { normalizeText } from "@/lib/phraseExtractor/normalize";

/**
 * POST /api/vocabulary-flashcard
 *
 * Extract vocabulary flashcards from text or uploaded file
 * Uses GPT to generate contextual flashcards with definitions, examples, and translations
 */
export async function POST(req: NextRequest) {
  const startTime = Date.now();

  try {
    const contentType = req.headers.get("content-type") || "";

    let text = "";
    let userId = "anonymous";
    const options: ExtractionOptions = {
      maxTerms: 20,
      minConfidence: 0.6,
      targetCEFR: ["A2", "B1", "B2", "C1"],
      topic: undefined,
    };

    // Handle multipart form data (file upload)
    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      userId = (formData.get("userId") as string) || "anonymous";

      // Parse options from form data
      const maxTerms = formData.get("maxTerms");
      const minConfidence = formData.get("minConfidence");
      const targetCEFR = formData.get("targetCEFR");
      const topic = formData.get("topic");

      if (maxTerms) options.maxTerms = parseInt(maxTerms as string, 10);
      if (minConfidence)
        options.minConfidence = parseFloat(minConfidence as string);
      if (targetCEFR)
        options.targetCEFR = (targetCEFR as string).split(",").map((s) => s.trim());
      if (topic) options.topic = topic as string;

      if (!file) {
        return NextResponse.json(
          { success: false, error: "No file uploaded" },
          { status: 400 }
        );
      }

      // Validate file
      const fileName = file.name.toLowerCase();
      if (!fileName.endsWith(".pdf") && !fileName.endsWith(".docx")) {
        return NextResponse.json(
          { success: false, error: "Only PDF and DOCX files are supported" },
          { status: 400 }
        );
      }

      // Extract text from file
      const buffer = Buffer.from(await file.arrayBuffer());
      const fileType = fileName.endsWith(".pdf")
        ? "application/pdf"
        : "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

      const extraction = await extractText(buffer, fileType);
      if (extraction.error || !extraction.text) {
        return NextResponse.json(
          {
            success: false,
            error: extraction.error || "Failed to extract text from file",
          },
          { status: 422 }
        );
      }

      text = normalizeText(extraction.text);
    } else {
      // Handle JSON request
      const body = await req.json();
      text = body.text || "";
      userId = body.userId || "anonymous";

      if (body.maxTerms) options.maxTerms = body.maxTerms;
      if (body.minConfidence) options.minConfidence = body.minConfidence;
      if (body.targetCEFR) options.targetCEFR = body.targetCEFR;
      if (body.topic) options.topic = body.topic;
    }

    if (!text || text.trim().length < 50) {
      return NextResponse.json(
        {
          success: false,
          error: "Text is too short. Minimum 50 characters required.",
        },
        { status: 400 }
      );
    }

    // Get user API keys
    const keys = await getUserApiKeys(userId);

    const config: ExtractionConfig = {
      openaiKey: keys.openaiKey || null,
      groqKey: keys.groqKey || null,
      cohereKey: keys.cohereKey || null,
    };

    if (!config.openaiKey && !config.groqKey && !config.cohereKey) {
      return NextResponse.json(
        {
          success: false,
          error:
            "No API keys configured. Please add your OpenAI, Groq, or Cohere API key in settings.",
        },
        { status: 401 }
      );
    }

    // Extract vocabulary flashcards
    const flashcards: VocabularyFlashcard[] = await extractVocabularyFlashcards(
      text,
      config,
      options
    );

    const processingTime = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      flashcards,
      meta: {
        totalExtracted: flashcards.length,
        processingTime,
        provider: config.groqKey ? "groq" : "openai",
        model: config.groqKey ? "llama-3.3-70b-versatile" : "gpt-4o-mini",
      },
    });
  } catch (error) {
    console.error("[vocabulary-flashcard] Error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}


/**
 * GET /api/vocabulary-flashcard
 * Returns API documentation
 */
export async function GET() {
  return NextResponse.json({
    endpoint: "/api/vocabulary-flashcard",
    method: "POST",
    description: "Extract vocabulary flashcards from text or documents using AI",
    request: {
      json: {
        text: "Plain text to extract vocabulary from (required)",
        userId: "User ID for API keys (optional, default: anonymous)",
        maxTerms: "Maximum terms to extract (optional, default: 20)",
        minConfidence: "Minimum confidence threshold 0-1 (optional, default: 0.6)",
        targetCEFR: "Array of target CEFR levels (optional, default: ['A2', 'B1', 'B2', 'C1'])",
        topic: "Topic filter: education, technology, business, science, etc. (optional)",
      },
      multipart: {
        file: "PDF or DOCX file (required)",
        userId: "User ID for API keys (optional)",
        maxTerms: "Maximum terms to extract (optional)",
        minConfidence: "Minimum confidence threshold (optional)",
        targetCEFR: "Comma-separated CEFR levels (optional)",
        topic: "Topic filter (optional)",
      },
    },
    response: {
      success: "boolean",
      flashcards: [
        {
          term: "vocabulary term or phrase",
          pos: "part of speech (noun phrase, verb phrase, etc.)",
          definition_en: "English definition",
          example_en: "Example sentence in English",
          translation_vi: "Vietnamese translation",
          topic: "Topic category",
          cefr: "CEFR level (A1-C2)",
          difficulty_score: "1-10 difficulty rating",
          confidence: "0-1 extraction confidence",
          variants: "Optional array of term variants",
        },
      ],
      meta: {
        totalExtracted: "number of flashcards extracted",
        processingTime: "processing time in ms",
        provider: "AI provider used (openai, groq)",
        model: "AI model used",
      },
    },
    examples: {
      curl_json: `curl -X POST http://localhost:3000/api/vocabulary-flashcard -H "Content-Type: application/json" -d '{"text": "Your text here...", "userId": "user123", "maxTerms": 15}'`,
      curl_file: `curl -X POST http://localhost:3000/api/vocabulary-flashcard -F "file=@document.pdf" -F "userId=user123" -F "maxTerms=20"`,
    },
  });
}
