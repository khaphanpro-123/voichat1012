import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Vocabulary from "@/app/models/Vocabulary";
import Document from "@/app/models/Document";
import { extractVocabularyFromText } from "@/lib/vocabularyExtractor";
import { getIPA } from "@/lib/ipaDict";

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    
    const { documentId, userId = 'anonymous', text } = await req.json();

    if (!text && !documentId) {
      return NextResponse.json(
        { success: false, message: "Text or documentId is required" },
        { status: 400 }
      );
    }

    let extractText = text;
    let sourceDoc = null;

    // If documentId provided, get text from document
    if (documentId) {
      sourceDoc = await Document.findById(documentId);
      if (!sourceDoc) {
        return NextResponse.json(
          { success: false, message: "Document not found" },
          { status: 404 }
        );
      }
      extractText = sourceDoc.extractedText;
    }

    if (!extractText || extractText.trim().length < 10) {
      return NextResponse.json(
        { success: false, message: "No text content to extract vocabulary from" },
        { status: 400 }
      );
    }

    // Extract vocabulary using AI
    const extractedVocabs = await extractVocabularyFromText(extractText);
    
    if (extractedVocabs.length === 0) {
      return NextResponse.json(
        { success: false, message: "No vocabulary could be extracted" },
        { status: 400 }
      );
    }

    // Save to database and generate images
    const savedVocabularies = [];
    const skippedWords = [];

    for (const vocab of extractedVocabs) {
      try {
        // Generate image for the vocabulary
        let imageUrl = null;
        try {
          const imageResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/generate-image`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              prompt: vocab.imagePrompt,
              word: vocab.word,
              meaning: vocab.meaning,
              type: vocab.type,
              example: vocab.example
            })
          });
          
          const imageData = await imageResponse.json();
          if (imageData.success) {
            imageUrl = imageData.imageUrl;
          }
        } catch (imageError) {
          console.error(`Error generating image for "${vocab.word}":`, imageError);
          // Fallback to Unsplash source
          imageUrl = `https://source.unsplash.com/400x300/?${encodeURIComponent(vocab.meaning || vocab.word)}`;
        }

        // Check if word already exists for this user
        const existingVocab = await Vocabulary.findOne({
          userId,
          word: vocab.word
        });

        // Get IPA pronunciation for English words in the meaning
        const englishWords = vocab.meaning.split(/\s+/).filter(w => /^[a-zA-Z]+$/.test(w));
        const ipaForWord = englishWords.length > 0 ? getIPA(englishWords[0]) : undefined;

        if (existingVocab) {
          // Update existing vocabulary with new information
          existingVocab.meaning = vocab.meaning;
          existingVocab.example = vocab.example;
          existingVocab.exampleTranslation = vocab.exampleTranslation;
          existingVocab.imagePrompt = vocab.imagePrompt;
          existingVocab.imageUrl = imageUrl;
          existingVocab.category = vocab.category;
          existingVocab.ipa = vocab.ipa || ipaForWord;
          if (sourceDoc) {
            existingVocab.sourceDocument = sourceDoc._id;
          }
          await existingVocab.save();
          savedVocabularies.push(existingVocab);
        } else {
          // Create new vocabulary entry
          const newVocab = new Vocabulary({
            userId,
            word: vocab.word,
            type: vocab.type,
            meaning: vocab.meaning,
            example: vocab.example,
            exampleTranslation: vocab.exampleTranslation,
            ipa: vocab.ipa || ipaForWord,
            level: vocab.level,
            category: vocab.category,
            imagePrompt: vocab.imagePrompt,
            imageUrl: imageUrl,
            sourceDocument: sourceDoc?._id,
            
            // Initialize SRS values
            easeFactor: 2.5,
            interval: 1,
            repetitions: 0,
            nextReviewDate: new Date(),
            
            // Initialize learning progress
            timesReviewed: 0,
            timesCorrect: 0,
            timesIncorrect: 0,
            isLearned: false
          });

          await newVocab.save();
          savedVocabularies.push(newVocab);
        }
      } catch (saveError) {
        console.error(`Error saving vocabulary "${vocab.word}":`, saveError);
        skippedWords.push(vocab.word);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Extracted ${savedVocabularies.length} vocabularies`,
      data: {
        vocabularies: savedVocabularies,
        totalExtracted: extractedVocabs.length,
        totalSaved: savedVocabularies.length,
        skippedWords,
        sourceDocument: sourceDoc?._id
      }
    });

  } catch (error) {
    console.error("Extract vocabulary error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to extract vocabulary" },
      { status: 500 }
    );
  }
}

// Get vocabularies for a user
export async function GET(req: NextRequest) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId') || 'anonymous';
    const limit = parseInt(searchParams.get('limit') || '50');
    const page = parseInt(searchParams.get('page') || '1');
    const category = searchParams.get('category');
    const level = searchParams.get('level');
    const dueOnly = searchParams.get('dueOnly') === 'true';
    
    const skip = (page - 1) * limit;
    
    // Build query
    const query: any = { userId };
    
    if (category && category !== 'all') {
      query.category = category;
    }
    
    if (level && level !== 'all') {
      query.level = level;
    }
    
    if (dueOnly) {
      query.nextReviewDate = { $lte: new Date() };
      query.isLearned = false;
    }

    const vocabularies = await Vocabulary.find(query)
      .sort({ nextReviewDate: 1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('sourceDocument', 'fileName')
      .lean();

    const total = await Vocabulary.countDocuments(query);
    
    // Get statistics
    const stats = await Vocabulary.aggregate([
      { $match: { userId } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          learned: { $sum: { $cond: ['$isLearned', 1, 0] } },
          due: { 
            $sum: { 
              $cond: [
                { 
                  $and: [
                    { $lte: ['$nextReviewDate', new Date()] },
                    { $eq: ['$isLearned', false] }
                  ]
                }, 
                1, 
                0 
              ] 
            } 
          },
          avgSuccessRate: { 
            $avg: { 
              $cond: [
                { $gt: ['$timesReviewed', 0] },
                { $divide: ['$timesCorrect', '$timesReviewed'] },
                0
              ]
            }
          }
        }
      }
    ]);

    return NextResponse.json({
      success: true,
      vocabularies,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      },
      stats: stats[0] || {
        total: 0,
        learned: 0,
        due: 0,
        avgSuccessRate: 0
      }
    });

  } catch (error) {
    console.error("Get vocabularies error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to get vocabularies" },
      { status: 500 }
    );
  }
}