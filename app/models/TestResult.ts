import mongoose, { Schema, Document } from "mongoose";

/**
 * Kết quả pretest / posttest / posttest trễ của từng participant.
 * Biến phụ thuộc chính (`posttest_delayed_recall`) nằm ở đây.
 *
 * Tách khỏi ReviewLog để:
 *  - Không lẫn với dữ liệu SRS thường ngày
 *  - Dễ chấm mù (blind grading) và join với JudgeScore
 */
export interface ITestResult extends Document {
  participantCode: string;
  testType:
    | "pretest_cefr"
    | "posttest_immediate"     // ngay sau tuần 8
    | "posttest_delayed"       // tuần 10 — biến phụ thuộc chính
    | "context_transfer";

  // Từng câu (để chấm rubric riêng biệt cho ContextTransfer)
  items: Array<{
    itemId: string;             // id câu hỏi trong bộ đề
    section: "recall" | "cloze" | "context_transfer";
    prompt: string;
    correctAnswer: string;
    userAnswer: string;
    autoScore?: number;         // exact-match hoặc regex
    judgeScoreIds?: mongoose.Types.ObjectId[];  // ref JudgeScore (rubric)
    responseTimeMs?: number;
  }>;

  totalScore: number;            // 0–100
  sectionScores: {
    recall?: number;
    cloze?: number;
    contextTransfer?: number;
  };
  administeredAt: Date;
  administeredBy?: string;       // ai chấm (nếu human-graded)
  formVersion: string;           // "posttest_v1", "posttest_v1_reshuffle"
  isBlindGraded: boolean;

  createdAt: Date;
  updatedAt: Date;
}

const TestResultSchema = new Schema<ITestResult>({
  participantCode: { type: String, required: true, index: true },
  testType: {
    type: String,
    enum: ["pretest_cefr", "posttest_immediate", "posttest_delayed", "context_transfer"],
    required: true,
    index: true,
  },
  items: [{
    itemId: { type: String, required: true },
    section: { type: String, enum: ["recall", "cloze", "context_transfer"], required: true },
    prompt: { type: String, required: true },
    correctAnswer: { type: String, required: true },
    userAnswer: { type: String, required: true },
    autoScore: { type: Number },
    judgeScoreIds: [{ type: Schema.Types.ObjectId, ref: "JudgeScore" }],
    responseTimeMs: { type: Number },
  }],
  totalScore: { type: Number, required: true, min: 0, max: 100 },
  sectionScores: {
    recall: { type: Number },
    cloze: { type: Number },
    contextTransfer: { type: Number },
  },
  administeredAt: { type: Date, required: true },
  administeredBy: { type: String },
  formVersion: { type: String, required: true },
  isBlindGraded: { type: Boolean, required: true, default: true },
}, { timestamps: true });

TestResultSchema.index({ participantCode: 1, testType: 1 }, { unique: true });

export default (mongoose.models.TestResult as mongoose.Model<ITestResult>) ||
  mongoose.model<ITestResult>("TestResult", TestResultSchema);
