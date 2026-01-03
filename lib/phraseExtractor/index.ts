/**
 * Phrase Extractor - Main Export
 * 
 * Production-ready phrase extraction for English learning
 * Extracts multi-word vocabulary from DOCX/PDF files:
 * - Prepositional phrases
 * - Phrasal verbs
 * - Collocations
 * - Noun phrases
 */

// Core extraction
export {
  extractPhrases,
  type ExtractedPhrase,
  type PhraseType,
  type ExtractionConfig,
} from "./phraseExtractor";

// Text extraction
export {
  extractText,
  extractFromDocx,
  extractFromPdf,
  validateFile,
  type TextExtractionResult,
} from "./textExtract";

// Text normalization
export {
  normalizeText,
  normalizePhrase,
  fixHyphenation,
  normalizeLigatures,
  collapseWhitespace,
  tokenize,
} from "./normalize";

// Sentence splitting
export { splitSentences, splitSentencesSimple } from "./sentences";

// Word lists
export {
  PREPOSITIONAL_PHRASES,
  PHRASAL_VERBS,
  STOPWORDS,
  NOUN_SUFFIXES,
  ADJECTIVE_SUFFIXES,
} from "./lists";

/**
 * Full extraction pipeline
 * Takes raw file buffer and returns extracted phrases
 */
import { extractText, validateFile } from "./textExtract";
import { normalizeText } from "./normalize";
import { splitSentences } from "./sentences";
import { extractPhrases, ExtractedPhrase, ExtractionConfig } from "./phraseExtractor";

export interface ExtractionResult {
  success: boolean;
  meta: {
    filename: string;
    fileType: string;
    bytes: number;
    extractedChars: number;
    sentencesCount: number;
    pageCount?: number;
  };
  phrases: ExtractedPhrase[];
  error?: string;
}

export async function extractPhrasesFromFile(
  buffer: Buffer,
  fileName: string,
  fileType: string,
  config?: Partial<ExtractionConfig>
): Promise<ExtractionResult> {
  // Validate file
  const validation = validateFile(fileName, buffer.length);
  if (!validation.valid) {
    return {
      success: false,
      meta: {
        filename: fileName,
        fileType,
        bytes: buffer.length,
        extractedChars: 0,
        sentencesCount: 0,
      },
      phrases: [],
      error: validation.error,
    };
  }

  // Extract text
  const extraction = await extractText(buffer, fileType);
  if (extraction.error || !extraction.text) {
    return {
      success: false,
      meta: {
        filename: fileName,
        fileType,
        bytes: buffer.length,
        extractedChars: 0,
        sentencesCount: 0,
        pageCount: extraction.pageCount,
      },
      phrases: [],
      error: extraction.error || "No text extracted from file",
    };
  }

  // Normalize text
  const normalizedText = normalizeText(extraction.text);

  // Split into sentences
  const sentences = splitSentences(normalizedText);

  // Extract phrases
  const phrases = extractPhrases(sentences, config);

  return {
    success: true,
    meta: {
      filename: fileName,
      fileType,
      bytes: buffer.length,
      extractedChars: normalizedText.length,
      sentencesCount: sentences.length,
      pageCount: extraction.pageCount,
    },
    phrases,
  };
}
