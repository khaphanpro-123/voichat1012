/**
 * Smart Vocabulary Extraction API with Context Intelligence
 * 
 * Pipeline:
 * STAGE 1: Extract vocabulary using ensemble methods
 * STAGE 2: Select best context sentences for each word
 * STAGE 3: Generate flashcards with context
 */

import { NextRequest, NextResponse } from "next/server";
import { extractVocabularyEnsemble } from "@/lib/ensembleVocabularyExtractor";
import { selectVocabularyContexts, VocabularyContext } from "@/lib/sentenceContextSelector";
import { preprocessDocumentText } from "@/lib/metadataFilter";
import { getUserApiKeys } from "@/lib/getUserApiKey";

interface SmartVocabularyResult {
  word: string;
  score: number;
  context: string;
  contextSentence: string;
  sentenceId: string;
  sentenceScore: number;
  explanation: string;
  features?: {
    frequency: number;
    tfidf: number;
    rake: number;
    yake: number;
  };
}

export async function POST(req: NextRequest) {
  try {
    const { text, maxWords = 50, userId = 'anonymous' } = await req.json();

    if (!text || text.trim().length < 50) {
      return NextResponse.json(
        { success: false, message: "Text quá ngắn (cần ít nhất 50 ký tự)" },
        { status: 400 }
      );
    }

    console.log('[Smart Vocabulary] Starting extraction...');
    console.log(`[Smart Vocabulary] Input text length: ${text.length} chars`);

    // ========================================================================
    // STAGE 1: Extract Vocabulary using Ensemble Methods
    // ========================================================================
    console.log('[STAGE 1] Extracting vocabulary with ensemble methods...');
    
    const ensembleResult = extractVocabularyEnsemble(text, {
      maxWords,
      minWordLength: 3,
      weights: {
        frequency: 0.15,
        tfidf: 0.35,
        rake: 0.25,
        yake: 0.25
      },
      includeNgrams: true,
      filterProperNouns: true,
      filterTechnical: true,
      contextFiltering: true
    });

    console.log(`[STAGE 1] Extracted ${ensembleResult.vocabulary.length} vocabulary words`);
    console.log(`[STAGE 1] Stats:`, ensembleResult.stats);

    // Prepare vocabulary list with scores
    const vocabularyList = ensembleResult.scores.map(ws => ({
      word: ws.word,
      score: ws.score,
      features: ws.features
    }));

    // ========================================================================
    // STAGE 2: Select Best Context Sentences
    // ========================================================================
    console.log('[STAGE 2] Selecting best context sentences...');
    
    // Clean text for context selection
    const { cleanedText } = preprocessDocumentText(text);
    
    const contexts = selectVocabularyContexts(cleanedText, vocabularyList, {
      minSentenceWords: 5,
      maxSentenceWords: 35,
      optimalMinWords: 8,
      optimalMaxWords: 20,
      requireVerb: true,
      weights: {
        keywordDensity: 0.4,
        lengthScore: 0.3,
        positionScore: 0.2,
        clarityScore: 0.1
      }
    });

    console.log(`[STAGE 2] Selected ${contexts.length} contexts`);

    // ========================================================================
    // STAGE 3: Combine Results
    // ========================================================================
    const results: SmartVocabularyResult[] = contexts.map(ctx => {
      const vocabItem = vocabularyList.find(v => v.word === ctx.word);
      
      return {
        word: ctx.word,
        score: ctx.finalScore,
        context: ctx.contextSentence, // Highlighted sentence
        contextSentence: ctx.contextSentence.replace(/<\/?b>/g, ''), // Plain text
        sentenceId: ctx.sentenceId,
        sentenceScore: ctx.sentenceScore,
        explanation: ctx.explanation || '',
        features: vocabItem?.features
      };
    });

    // ========================================================================
    // Return Results
    // ========================================================================
    return NextResponse.json({
      success: true,
      vocabulary: results,
      count: results.length,
      stats: {
        stage1: ensembleResult.stats,
        stage2: {
          totalContexts: contexts.length,
          avgSentenceScore: contexts.reduce((sum, c) => sum + c.sentenceScore, 0) / contexts.length
        }
      },
      pipeline: 'STAGE 1 (Ensemble) + STAGE 2 (Context Intelligence)'
    });

  } catch (error) {
    console.error('[Smart Vocabulary] Error:', error);
    const message = error instanceof Error ? error.message : 'Extraction failed';
    return NextResponse.json(
      { success: false, message, error: String(error) },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    message: "Smart Vocabulary Extraction API with Context Intelligence",
    pipeline: [
      "STAGE 1: Ensemble Vocabulary Extraction (TF-IDF + RAKE + YAKE)",
      "STAGE 2: Context Intelligence Engine (Sentence Scoring & Selection)",
      "STAGE 3: Flashcard Generation with Context"
    ],
    features: [
      "✅ Rule-based, deterministic output",
      "✅ Explainable scoring logic",
      "✅ Context-aware sentence selection",
      "✅ Automatic word highlighting",
      "✅ Quality filtering (proper nouns, technical terms)"
    ],
    usage: {
      method: "POST",
      body: {
        text: "Document text to extract vocabulary from",
        maxWords: "Maximum number of words to extract (default: 50)",
        userId: "User ID for API key lookup (optional)"
      }
    }
  });
}
