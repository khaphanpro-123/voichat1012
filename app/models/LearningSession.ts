import mongoose, { Schema, Document } from "mongoose";

// Lỗi phát âm
interface PronunciationError {
  word: string;
  userPronunciation: string;
  correctPronunciation: string;
  feedback: string;
}

// Lỗi ngữ pháp
interface GrammarError {
  original: string;
  corrected: string;
  errorType: string; // "tense", "article", "preposition", "word_order", etc.
  explanation: string;
  explanationVi?: string;
}

// Từ vựng mới học
interface LearnedVocabulary {
  word: string;
  meaning: string;
  context: string;
}

// Tin nhắn trong phiên
interface SessionMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  hasError?: boolean;
}

export interface ILearningSession extends Document {
  userId: string;
  sessionNumber: number; // Số thứ tự phiên của user
  sessionType: "voice_chat" | "pronunciation" | "vocabulary" | "debate" | "image_describe";
  startTime: Date;
  endTime: Date;
  duration: number; // seconds
  
  // Điểm số tổng quan
  overallScore: number; // 0-100
  pronunciationScore: number;
  grammarScore: number;
  fluencyScore: number;
  
  // Chi tiết lỗi
  pronunciationErrors: PronunciationError[];
  grammarErrors: GrammarError[];
  
  // Từ vựng
  learnedVocabulary: LearnedVocabulary[];
  
  // Lịch sử tin nhắn
  messages: SessionMessage[];
  
  // Thống kê
  totalMessages: number;
  userMessages: number;
  wordsSpoken: number;
  totalErrors: number;
  
  // Feedback tổng hợp
  strengths: string[];
  areasToImprove: string[];
  suggestions: string[];
  
  // Metadata
  topic?: string;
  level?: string;
  rating?: number; // 1-5 star rating from user
  createdAt: Date;
}

const LearningSessionSchema = new Schema<ILearningSession>({
  userId: { type: String, required: true, index: true },
  sessionNumber: { type: Number, default: 1 },
  sessionType: { 
    type: String, 
    enum: ["voice_chat", "pronunciation", "vocabulary", "debate", "image_describe"],
    required: true 
  },
  startTime: { type: Date, required: true },
  endTime: { type: Date, required: true },
  duration: { type: Number, default: 0 },
  
  overallScore: { type: Number, default: 0, min: 0, max: 100 },
  pronunciationScore: { type: Number, default: 0, min: 0, max: 100 },
  grammarScore: { type: Number, default: 0, min: 0, max: 100 },
  fluencyScore: { type: Number, default: 0, min: 0, max: 100 },
  
  pronunciationErrors: [{
    word: String,
    userPronunciation: String,
    correctPronunciation: String,
    feedback: String
  }],
  
  grammarErrors: [{
    original: String,
    corrected: String,
    errorType: String,
    explanation: String,
    explanationVi: String
  }],
  
  learnedVocabulary: [{
    word: String,
    meaning: String,
    context: String
  }],
  
  messages: [{
    role: { type: String, enum: ["user", "assistant"] },
    content: String,
    timestamp: { type: Date, default: Date.now },
    hasError: { type: Boolean, default: false }
  }],
  
  totalMessages: { type: Number, default: 0 },
  userMessages: { type: Number, default: 0 },
  wordsSpoken: { type: Number, default: 0 },
  totalErrors: { type: Number, default: 0 },
  
  strengths: [String],
  areasToImprove: [String],
  suggestions: [String],
  
  topic: String,
  level: String,
  rating: { type: Number, min: 1, max: 5 },
  createdAt: { type: Date, default: Date.now }
});

// Index để query nhanh
LearningSessionSchema.index({ userId: 1, createdAt: -1 });
LearningSessionSchema.index({ userId: 1, sessionType: 1 });

export default mongoose.models.LearningSession || 
  mongoose.model<ILearningSession>("LearningSession", LearningSessionSchema);
