import mongoose, { Schema, Document } from "mongoose";

export interface IVocabulary extends Document {
  userId: string;
  word: string;
  type: string; // danh từ, động từ, tính từ, etc.
  meaning: string;
  example: string;
  exampleTranslation: string;
  ipa?: string; // IPA pronunciation
  audioUrl?: string;
  imageUrl?: string;
  imagePrompt?: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  category?: string;
  source?: string; // Source of vocabulary: voice_chat, document, manual, etc.
  sourceDocument?: mongoose.Types.ObjectId;
  
  // Spaced Repetition System (legacy SM-2)
  easeFactor: number; // 2.5 default
  interval: number; // days until next review
  repetitions: number; // number of successful reviews
  nextReviewDate: Date;

  // DART / CARTS extensions (Alg 1-4 in x.pdf)
  halfLife?: number;               // h in DART (days)
  lastRetrievalType?: 0 | 1 | 2 | 3; // d_prev: 0=MCQ,1=cloze,2=constrained-gen,3=paraphrase
  nextRetrievalType?: 0 | 1 | 2 | 3;
  featureVector?: number[];        // learner feature vector x used by DART
  seenContextIds?: string[];       // contexts already shown (for max-min diversity)
  scheduler?: 'sm2' | 'dart' | 'carts';

  // Learning Progress
  timesReviewed: number;
  timesCorrect: number;
  timesIncorrect: number;
  lastReviewedAt?: Date;
  isLearned: boolean;

  createdAt: Date;
  updatedAt: Date;
}

const VocabularySchema = new Schema({
  userId: { type: String, required: true, index: true },
  word: { type: String, required: true, trim: true },
  type: { type: String, required: true }, // danh từ, động từ, tính từ
  meaning: { type: String, required: true },
  example: { type: String, required: true },
  exampleTranslation: { type: String, required: true },
  ipa: { type: String }, // IPA pronunciation
  audioUrl: { type: String },
  imageUrl: { type: String },
  imagePrompt: { type: String },
  level: { 
    type: String, 
    enum: ['beginner', 'intermediate', 'advanced'], 
    default: 'intermediate' 
  },
  category: { type: String },
  source: { type: String }, // Source: voice_chat, document, manual, etc.
  sourceDocument: { type: mongoose.Schema.Types.ObjectId, ref: 'Document' },
  
  // Spaced Repetition System (legacy SM-2)
  easeFactor: { type: Number, default: 2.5 },
  interval: { type: Number, default: 1 },
  repetitions: { type: Number, default: 0 },
  nextReviewDate: { type: Date, default: Date.now },

  // DART / CARTS extensions
  halfLife: { type: Number, default: 1 },
  lastRetrievalType: { type: Number, min: 0, max: 3, default: 0 },
  nextRetrievalType: { type: Number, min: 0, max: 3, default: 0 },
  featureVector: { type: [Number], default: [] },
  seenContextIds: { type: [String], default: [] },
  scheduler: { type: String, enum: ['sm2', 'dart', 'carts'], default: 'sm2' },
  
  // Learning Progress
  timesReviewed: { type: Number, default: 0 },
  timesCorrect: { type: Number, default: 0 },
  timesIncorrect: { type: Number, default: 0 },
  lastReviewedAt: { type: Date },
  isLearned: { type: Boolean, default: false },
}, {
  timestamps: true
});

// Compound index for efficient queries
VocabularySchema.index({ userId: 1, word: 1 }, { unique: true });
VocabularySchema.index({ userId: 1, nextReviewDate: 1 });
VocabularySchema.index({ userId: 1, isLearned: 1 });

export default mongoose.models.Vocabulary || mongoose.model<IVocabulary>("Vocabulary", VocabularySchema);