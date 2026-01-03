import { NextRequest, NextResponse } from "next/server";
import { extractPhrasesFromFile, ExtractionConfig } from "@/lib/phraseExtractor";

/**
 * POST /api/extract-phrases
 * 
 * Extract multi-word vocabulary from uploaded DOCX/PDF files
 * 
 * Request: multipart/form-data
 * - file: PDF or DOCX file (max 5MB)
 * - minFreq?: minimum frequency threshold (default: 2)
 * - maxPhrases?: maximum phrases to return (default: 200)
 * 
 * Response: JSON with extracted phrases
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    // Validate file presence
    if (!file) {
      return NextResponse.json(
        {
          success: false,
          error: "No file uploaded. Please provide a PDF or DOCX file.",
        },
        { status: 400 }
      );
    }

    // Validate file type by extension
    const fileName = file.name.toLowerCase();
    const validExtensions = [".pdf", ".docx"];
    const hasValidExtension = validExtensions.some((ext) => fileName.endsWith(ext));

    if (!hasValidExtension) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid file type: ${file.name}. Only PDF and DOCX files are supported.`,
        },
        { status: 400 }
      );
    }

    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        {
          success: false,
          error: `File too large: ${Math.round(file.size / 1024 / 1024)}MB. Maximum size is 5MB.`,
        },
        { status: 400 }
      );
    }

    if (file.size === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "File is empty.",
        },
        { status: 400 }
      );
    }

    // Parse optional config from form data
    const minFreqStr = formData.get("minFreq") as string | null;
    const maxPhrasesStr = formData.get("maxPhrases") as string | null;
    const maxExamplesStr = formData.get("maxExamples") as string | null;

    const config: Partial<ExtractionConfig> = {};
    if (minFreqStr) {
      const minFreq = parseInt(minFreqStr, 10);
      if (!isNaN(minFreq) && minFreq >= 1) config.minFreq = minFreq;
    }
    if (maxPhrasesStr) {
      const maxPhrases = parseInt(maxPhrasesStr, 10);
      if (!isNaN(maxPhrases) && maxPhrases >= 1) config.maxPhrases = maxPhrases;
    }
    if (maxExamplesStr) {
      const maxExamples = parseInt(maxExamplesStr, 10);
      if (!isNaN(maxExamples) && maxExamples >= 1) config.maxExamplesPerPhrase = maxExamples;
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Extract phrases
    const result = await extractPhrasesFromFile(
      buffer,
      file.name,
      file.type || (fileName.endsWith(".pdf") ? "application/pdf" : "application/vnd.openxmlformats-officedocument.wordprocessingml.document"),
      config
    );

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
          meta: result.meta,
        },
        { status: 422 }
      );
    }

    // Return successful response
    return NextResponse.json({
      success: true,
      meta: result.meta,
      phrases: result.phrases,
    });
  } catch (error) {
    console.error("[extract-phrases] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error during phrase extraction.",
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/extract-phrases
 * Returns API documentation
 */
export async function GET() {
  return NextResponse.json({
    endpoint: "/api/extract-phrases",
    method: "POST",
    description: "Extract multi-word vocabulary from PDF/DOCX files for English learning",
    request: {
      contentType: "multipart/form-data",
      fields: {
        file: "PDF or DOCX file (required, max 5MB)",
        minFreq: "Minimum frequency threshold (optional, default: 2)",
        maxPhrases: "Maximum phrases to return (optional, default: 200)",
        maxExamples: "Maximum example sentences per phrase (optional, default: 3)",
      },
    },
    response: {
      success: "boolean",
      meta: {
        filename: "string",
        fileType: "string",
        bytes: "number",
        extractedChars: "number",
        sentencesCount: "number",
        pageCount: "number (PDF only)",
      },
      phrases: [
        {
          text: "original phrase text",
          normalized: "lowercase normalized form",
          type: "prep_phrase | phrasal_verb | noun_phrase | collocation",
          score: "relevance score (higher = better)",
          frequency: "occurrence count in document",
          examples: ["up to 3 example sentences"],
        },
      ],
    },
    phraseTypes: {
      prep_phrase: "Multi-word prepositions (e.g., 'in terms of', 'due to')",
      phrasal_verb: "Verb + particle combinations (e.g., 'carry out', 'come up with')",
      noun_phrase: "Noun-based phrases (e.g., 'risk management', 'learning process')",
      collocation: "Statistically significant word combinations",
    },
  });
}
