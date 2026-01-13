import mongoose, { Schema, Document } from "mongoose";

export interface IGrammarError extends Document {
  userId: string;
  sentence: string;           // Câu gốc người dùng viết
  correctedSentence: string;  // Câu đã sửa
  errorType: string;          // Loại lỗi: subject_verb_agreement, article, etc.
  errorWord: string;          // Từ/cụm từ sai
  errorMessage: string;       // Mô tả lỗi tiếng Việt
  explanation: string;        // Giải thích chi tiết
  targetWord?: string;        // Từ vựng đang học (từ image-learning)
  source: string;             // Nguồn: image_learning, voice_chat, writing
  createdAt: Date;
}

const GrammarErrorSchema = new Schema<IGrammarError>({
  userId: { type: String, required: true, index: true },
  sentence: { type: String, required: true },
  correctedSentence: { type: String, required: true },
  errorType: { type: String, required: true, index: true },
  errorWord: { type: String, default: "" },
  errorMessage: { type: String, default: "" },
  explanation: { type: String, default: "" },
  targetWord: { type: String, default: "" },
  source: { type: String, default: "image_learning" },
  createdAt: { type: Date, default: Date.now, index: true }
});

// Index để query nhanh
GrammarErrorSchema.index({ userId: 1, createdAt: -1 });
GrammarErrorSchema.index({ userId: 1, errorType: 1 });

export default mongoose.models.GrammarError || 
  mongoose.model<IGrammarError>("GrammarError", GrammarErrorSchema);
