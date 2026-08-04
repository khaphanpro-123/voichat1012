import mongoose, { Schema, Document } from "mongoose";

/**
 * Điểm chấm rubric cho từng item của TestResult.
 * Chấm bởi (a) 2 giáo viên độc lập cho subset ICC, (b) LLM-Judge cho phần còn lại
 * sau khi validate ICC LLM–người ≥ 0.70 (Ngày 39–40).
 *
 * Rubric 4 chiều (dựa trên Nation 2001, Read 2000 cho L2 vocabulary):
 *   - form: đúng chính tả / hình thái
 *   - meaning: nghĩa đúng trong ngữ cảnh
 *   - use: dùng đúng ngữ pháp và collocation
 *   - context_fit: phù hợp ngữ cảnh mới (chỉ chấm cho context_transfer)
 */
export interface IJudgeScore extends Document {
  testResultId: mongoose.Types.ObjectId;
  itemId: string;                   // trùng với TestResult.items[].itemId
  judgeType: "human" | "llm";
  judgeId: string;                  // "teacher_01" hoặc "gpt4o-2026-06"
  rubric: {
    form: number;                   // 0–2
    meaning: number;                // 0–2
    use: number;                    // 0–2
    contextFit?: number;            // 0–2, chỉ context_transfer
  };
  totalScore: number;               // 0–6 hoặc 0–8
  rationale?: string;               // LLM tự viết; human tuỳ chọn
  gradedAt: Date;
  gradingDurationMs?: number;       // để đánh giá tốc độ LLM vs human
  isCalibrationItem: boolean;       // item nằm trong bộ ICC (dual-graded)
  createdAt: Date;
}

const JudgeScoreSchema = new Schema<IJudgeScore>({
  testResultId: { type: Schema.Types.ObjectId, ref: "TestResult", required: true, index: true },
  itemId: { type: String, required: true },
  judgeType: { type: String, enum: ["human", "llm"], required: true, index: true },
  judgeId: { type: String, required: true, index: true },
  rubric: {
    form: { type: Number, required: true, min: 0, max: 2 },
    meaning: { type: Number, required: true, min: 0, max: 2 },
    use: { type: Number, required: true, min: 0, max: 2 },
    contextFit: { type: Number, min: 0, max: 2 },
  },
  totalScore: { type: Number, required: true },
  rationale: { type: String },
  gradedAt: { type: Date, required: true, default: () => new Date() },
  gradingDurationMs: { type: Number },
  isCalibrationItem: { type: Boolean, required: true, default: false, index: true },
}, { timestamps: { createdAt: true, updatedAt: false } });

// Một judge chỉ chấm 1 lần cho 1 item
JudgeScoreSchema.index({ testResultId: 1, itemId: 1, judgeId: 1 }, { unique: true });

export default (mongoose.models.JudgeScore as mongoose.Model<IJudgeScore>) ||
  mongoose.model<IJudgeScore>("JudgeScore", JudgeScoreSchema);
