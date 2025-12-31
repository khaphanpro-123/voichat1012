import mongoose, { Schema, Document } from "mongoose";

export interface IVocabulary extends Document {
  userId: string;
  word: string;
  type: string; // danh từ, động từ, tính từ, etc.
  meaning: string;
  example: string;
  exampleTranslation: string;
  audioUrl?: string;
  imageUrl?: string;
  imagePrompt?: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  category?: string;
  sourceDocument?: mongoose.Types.ObjectId;
  
  // Spaced Repetition System
  easeFactor: number; // 2.5 default
  interval: number; // days until next review
  repetitions: number; // number of successful reviews
  nextReviewDate: Date;
  
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
  audioUrl: { type: String },
  imageUrl: { type: String },
  imagePrompt: { type: String },
  level: { 
    type: String, 
    enum: ['beginner', 'intermediate', 'advanced'], 
    default: 'intermediate' 
  },
  category: { type: String },
  sourceDocument: { type: mongoose.Schema.Types.ObjectId, ref: 'Document' },
  
  // Spaced Repetition System
  easeFactor: { type: Number, default: 2.5 },
  interval: { type: Number, default: 1 },
  repetitions: { type: Number, default: 0 },
  nextReviewDate: { type: Date, default: Date.now },
  
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