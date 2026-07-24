import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Vocabulary from "@/app/models/Vocabulary";
import ReviewLog from "@/app/models/ReviewLog";
import { calculateNextReview, calculateNextReviewDart, shouldPromoteToLearned } from "@/lib/spacedRepetition";
import { buildFeatureVector, RetrievalType } from "@/lib/dart";

const CEFR_TABLE: Record<string, number> = { A1: 0, A2: 1, B1: 2, B2: 3, C1: 4, C2: 5 };

// Submit a vocabulary review result
export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const {
      vocabularyId,
      quality,
      userId = 'anonymous',
      // DART / CARTS extensions (optional, backward-compat with SM-2 clients)
      retrievalType,
      responseTimeMs,
      contextId,
      scheduler,
    } = await req.json();

    if (!vocabularyId || quality === undefined) {
      return NextResponse.json(
        { success: false, message: "VocabularyId and quality are required" },
        { status: 400 }
      );
    }

    if (quality < 0 || quality > 5) {
      return NextResponse.json(
        { success: false, message: "Quality must be between 0 and 5" },
        { status: 400 }
      );
    }

    const vocabulary = await Vocabulary.findOne({
      _id: vocabularyId,
      userId
    });

    if (!vocabulary) {
      return NextResponse.json(
        { success: false, message: "Vocabulary not found" },
        { status: 404 }
      );
    }

    // Compute Δ (days since last review) for the log — Algorithm 1 input.
    const lastAt = vocabulary.lastReviewedAt ? new Date(vocabulary.lastReviewedAt).getTime() : Date.now();
    const deltaDays = Math.max(0, (Date.now() - lastAt) / (1000 * 60 * 60 * 24));

    // Build feature vector x (kept in sync with lib/dart.ts featureNames).
    const cefr = CEFR_TABLE[(vocabulary.level || "").toUpperCase()] ?? 2;
    const acc = vocabulary.timesReviewed > 0 ? vocabulary.timesCorrect / vocabulary.timesReviewed : 0.5;
    const x = buildFeatureVector({
      cefr,
      wordFrequency: 1000,
      userAverageAccuracy: acc,
      timesReviewed: vocabulary.timesReviewed || 0,
    });

    const dPrev = (retrievalType ?? vocabulary.lastRetrievalType ?? 0) as RetrievalType;
    const useDart = (scheduler ?? vocabulary.scheduler ?? "sm2") !== "sm2";

    let nextSRS: any;
    if (useDart) {
      // DART inference (Algorithm 2 in x.pdf)
      nextSRS = calculateNextReviewDart({ featureVector: x, lastRetrievalType: dPrev, quality });
      vocabulary.halfLife = nextSRS.halfLife;
      vocabulary.nextRetrievalType = nextSRS.nextRetrievalType;
      vocabulary.featureVector = x;
      vocabulary.scheduler = scheduler ?? vocabulary.scheduler ?? "dart";
    } else {
      // Legacy SM-2 path
      const currentSRS = {
        easeFactor: vocabulary.easeFactor,
        interval: vocabulary.interval,
        repetitions: vocabulary.repetitions,
        nextReviewDate: vocabulary.nextReviewDate,
      };
      nextSRS = calculateNextReview(currentSRS, quality);
    }

    // Update vocabulary with new SRS data and review statistics
    vocabulary.easeFactor = nextSRS.easeFactor;
    vocabulary.interval = nextSRS.interval;
    vocabulary.repetitions = nextSRS.repetitions;
    vocabulary.nextReviewDate = nextSRS.nextReviewDate;
    vocabulary.lastRetrievalType = dPrev;

    vocabulary.timesReviewed += 1;
    vocabulary.lastReviewedAt = new Date();

    if (quality >= 3) {
      vocabulary.timesCorrect += 1;
    } else {
      vocabulary.timesIncorrect += 1;
    }

    // Persist raw log for offline DART / CARTS training.
    try {
      await ReviewLog.create({
        userId,
        vocabularyId: vocabulary._id,
        word: vocabulary.word,
        deltaDays,
        retrievalType: dPrev,
        featureVector: x,
        contextId,
        recall: quality >= 3 ? 1 : 0,
        responseTimeMs,
        quality,
      });
    } catch (logErr) {
      console.warn("ReviewLog insert failed (non-fatal):", logErr);
    }

    // Check if word should be promoted to "learned"
    vocabulary.isLearned = shouldPromoteToLearned(vocabulary);

    await vocabulary.save();

    return NextResponse.json({
      success: true,
      vocabulary,
      nextReview: {
        date: nextSRS.nextReviewDate,
        interval: nextSRS.interval,
        isLearned: vocabulary.isLearned
      },
      message: vocabulary.isLearned 
        ? 'Congratulations! You have learned this word!' 
        : `Next review in ${nextSRS.interval} day(s)`
    });

  } catch (error) {
    console.error("Vocabulary review error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to submit review" },
      { status: 500 }
    );
  }
}

// Get due vocabularies for review
export async function GET(req: NextRequest) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId') || 'anonymous';
    const limit = parseInt(searchParams.get('limit') || '20');
    const includeNew = searchParams.get('includeNew') === 'true';

    // Get due vocabularies (not learned and due for review)
    const query: any = {
      userId,
      isLearned: false,
      nextReviewDate: { $lte: new Date() }
    };

    // If including new words, also get words never reviewed
    if (includeNew) {
      query.$or = [
        { nextReviewDate: { $lte: new Date() } },
        { timesReviewed: 0 }
      ];
    }

    const dueVocabularies = await Vocabulary.find(query)
      .sort({ 
        timesReviewed: 1, // Prioritize new words
        nextReviewDate: 1, // Then by due date
        timesCorrect: 1 // Then by success rate (ascending = harder words first)
      })
      .limit(limit)
      .lean();

    // Calculate priority scores for better ordering
    const vocabulariesWithPriority = dueVocabularies.map(vocab => {
      const daysSinceLastReview = vocab.lastReviewedAt 
        ? Math.floor((Date.now() - new Date(vocab.lastReviewedAt).getTime()) / (1000 * 60 * 60 * 24))
        : 999;
      
      const successRate = vocab.timesReviewed > 0 
        ? vocab.timesCorrect / vocab.timesReviewed 
        : 0;
      
      const priority = daysSinceLastReview * (1 - successRate) * 100;
      
      return {
        ...vocab,
        priority,
        successRate,
        daysSinceLastReview
      };
    });

    // Sort by priority (highest first)
    vocabulariesWithPriority.sort((a, b) => b.priority - a.priority);

    return NextResponse.json({
      success: true,
      vocabularies: vocabulariesWithPriority,
      count: vocabulariesWithPriority.length,
      message: vocabulariesWithPriority.length > 0 
        ? `${vocabulariesWithPriority.length} words ready for review`
        : 'No words due for review'
    });

  } catch (error) {
    console.error("Get due vocabularies error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to get due vocabularies" },
      { status: 500 }
    );
  }
}