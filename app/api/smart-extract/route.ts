// app/api/smart-extract/route.ts
// API cho hệ thống trích xuất từ vựng thông minh 3 bước

import { NextRequest, NextResponse } from "next/server";
import { analyzeDocumentContext, ContextAnalysis } from "@/lib/contextAnalyzer";
import { extractPhrasesWithContext, PhraseExtractionResult } from "@/lib/phraseExtractorAI";
import { generateFlashcardsFromPhrases, convertToVocabularyFormat } from "@/lib/flashcardGenerator";
import { connectDB } from "@/lib/db";
import Vocabulary from "@/app/models/Vocabulary";
import Document from "@/app/models/Document";

export async function POST(req: NextRequest) {
  try {
    const { action, text, documentId, userId = 'anonymous', context, phrases } = await req.json();

    // Step 1: Analyze Context
    if (action === 'analyze-context') {
      if (!text && !documentId) {
        return NextResponse.json({ success: false, message: "Text or documentId required" }, { status: 400 });
      }

      let extractText = text;
      if (documentId) {
        await connectDB();
        const doc = await Document.findById(documentId);
        if (!doc) return NextResponse.json({ success: false, message: "Document not found" }, { status: 404 });
        extractText = doc.extractedText;
      }

      if (!extractText || extractText.length < 50) {
        return NextResponse.json({ success: false, message: "Text too short for analysis" }, { status: 400 });
      }

      const contextAnalysis = await analyzeDocumentContext(extractText);
      
      return NextResponse.json({
        success: true,
        step: 1,
        data: {
          context: contextAnalysis,
          textLength: extractText.length,
          preview: extractText.slice(0, 500) + '...'
        }
      });
    }

    // Step 2: Extract Phrases
    if (action === 'extract-phrases') {
      if (!text && !documentId) {
        return NextResponse.json({ success: false, message: "Text or documentId required" }, { status: 400 });
      }
      if (!context) {
        return NextResponse.json({ success: false, message: "Context from step 1 required" }, { status: 400 });
      }

      let extractText = text;
      if (documentId) {
        await connectDB();
        const doc = await Document.findById(documentId);
        if (!doc) return NextResponse.json({ success: false, message: "Document not found" }, { status: 404 });
        extractText = doc.extractedText;
      }

      const phraseResult = await extractPhrasesWithContext(extractText, context as ContextAnalysis);
      
      return NextResponse.json({
        success: true,
        step: 2,
        data: {
          contextRef: phraseResult.contextRef,
          phrases: phraseResult.phrases,
          totalPhrases: phraseResult.phrases.length,
          categories: [...new Set(phraseResult.phrases.map(p => p.category))]
        }
      });
    }

    // Step 3: Generate Flashcards & Save
    if (action === 'generate-flashcards') {
      if (!phrases || !Array.isArray(phrases) || phrases.length === 0) {
        return NextResponse.json({ success: false, message: "Phrases from step 2 required" }, { status: 400 });
      }

      const flashcards = generateFlashcardsFromPhrases(phrases);
      
      // Save to database
      await connectDB();
      const savedVocabs = [];
      
      for (const flashcard of flashcards) {
        try {
          const vocabData = convertToVocabularyFormat(flashcard);
          
          // Check if exists
          const existing = await Vocabulary.findOne({ userId, word: vocabData.word });
          
          if (existing) {
            // Update
            Object.assign(existing, vocabData);
            await existing.save();
            savedVocabs.push(existing);
          } else {
            // Create new
            const newVocab = new Vocabulary({
              userId,
              ...vocabData,
              sourceDocument: documentId,
              easeFactor: 2.5,
              interval: 1,
              repetitions: 0,
              nextReviewDate: new Date(),
              timesReviewed: 0,
              timesCorrect: 0,
              timesIncorrect: 0,
              isLearned: false
            });
            await newVocab.save();
            savedVocabs.push(newVocab);
          }
        } catch (err) {
          console.error('Error saving vocab:', err);
        }
      }

      return NextResponse.json({
        success: true,
        step: 3,
        data: {
          flashcards,
          totalGenerated: flashcards.length,
          totalSaved: savedVocabs.length,
          savedIds: savedVocabs.map(v => v._id)
        }
      });
    }

    // Full pipeline (all 3 steps)
    if (action === 'full-pipeline') {
      if (!text && !documentId) {
        return NextResponse.json({ success: false, message: "Text or documentId required" }, { status: 400 });
      }

      let extractText = text;
      let sourceDoc = null;
      
      if (documentId) {
        await connectDB();
        sourceDoc = await Document.findById(documentId);
        if (!sourceDoc) return NextResponse.json({ success: false, message: "Document not found" }, { status: 404 });
        extractText = sourceDoc.extractedText;
      }

      if (!extractText || extractText.length < 50) {
        return NextResponse.json({ success: false, message: "Text too short" }, { status: 400 });
      }

      // Step 1
      const contextAnalysis = await analyzeDocumentContext(extractText);
      
      // Step 2
      const phraseResult = await extractPhrasesWithContext(extractText, contextAnalysis);
      
      // Step 3
      const flashcards = generateFlashcardsFromPhrases(phraseResult.phrases);
      
      // Save
      await connectDB();
      const savedVocabs = [];
      
      for (const flashcard of flashcards) {
        try {
          const vocabData = convertToVocabularyFormat(flashcard);
          const existing = await Vocabulary.findOne({ userId, word: vocabData.word });
          
          if (existing) {
            Object.assign(existing, vocabData);
            await existing.save();
            savedVocabs.push(existing);
          } else {
            const newVocab = new Vocabulary({
              userId,
              ...vocabData,
              sourceDocument: sourceDoc?._id,
              easeFactor: 2.5,
              interval: 1,
              repetitions: 0,
              nextReviewDate: new Date(),
              timesReviewed: 0,
              timesCorrect: 0,
              timesIncorrect: 0,
              isLearned: false
            });
            await newVocab.save();
            savedVocabs.push(newVocab);
          }
        } catch (err) {
          console.error('Error saving vocab:', err);
        }
      }

      return NextResponse.json({
        success: true,
        data: {
          context: contextAnalysis,
          phrases: phraseResult.phrases,
          flashcards,
          stats: {
            totalPhrases: phraseResult.phrases.length,
            totalFlashcards: flashcards.length,
            totalSaved: savedVocabs.length
          }
        }
      });
    }

    return NextResponse.json({ success: false, message: "Invalid action" }, { status: 400 });

  } catch (error: any) {
    console.error("Smart extract error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Processing failed" },
      { status: 500 }
    );
  }
}
