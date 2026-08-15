import mongoose, { Schema, Document } from "mongoose";

/**
 * Bản ghi mỗi lần chấm pretest CEFR server-side.
 *
 * Trước D-016: `/api/research/pretest/score` chỉ tính rồi echo về client,
 * client tự gửi `pretestScore` bịa vào `/api/research/enrol`.  LLT reviewer
 * hỏi "how do you verify the pretest was actually completed?" thì không có
 * bằng chứng.
 *
 * Sau D-016: mỗi POST hợp lệ tới `/pretest/score` sinh 1 dòng ở đây với
 * `submissionId` được trả về client.  `/enrol` bắt buộc gửi lại `pretestSubmissionId`
 * và server re-verify score bằng cách so với row đã lưu — không tin số client.
 *
 * `used = true` được set khi enrol đã tiêu thụ submission này (single-use),
 * để chặn cùng 1 submission enrol nhiều participantCode.
 */
export interface IPretestSubmission extends Document {
  submissionId: string;              // ULID/UUID, client-visible, 1 lần dùng
  score: number;                     // 0..100, server chấm từ answer key
  cefrLevel: "A2" | "B1" | "B2";
  correct: number;
  total: number;                     // ==20 hôm nay; snapshot cho versioning
  itemCount: number;                 // số câu client gửi (=total nếu hợp lệ)
  answersHash: string;               // sha256 chuỗi answers đã sort — audit tampering
  clientCompletedAt?: Date;          // ISO từ client (đã validate)
  serverScoredAt: Date;              // ts server
  used: boolean;                     // true sau khi được /enrol tiêu thụ
  usedByParticipantCode?: string;    // ai đã dùng
  usedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const PretestSubmissionSchema = new Schema<IPretestSubmission>(
  {
    submissionId: { type: String, required: true, unique: true, index: true },
    score: { type: Number, required: true, min: 0, max: 100 },
    cefrLevel: { type: String, enum: ["A2", "B1", "B2"], required: true },
    correct: { type: Number, required: true, min: 0 },
    total: { type: Number, required: true, min: 1 },
    itemCount: { type: Number, required: true, min: 0 },
    answersHash: { type: String, required: true },
    clientCompletedAt: { type: Date },
    serverScoredAt: { type: Date, required: true, default: () => new Date() },
    used: { type: Boolean, required: true, default: false, index: true },
    usedByParticipantCode: { type: String, index: true, sparse: true },
    usedAt: { type: Date },
  },
  { timestamps: true },
);

// TTL: giữ 60 ngày là quá đủ cho pilot + main study; hết hạn tự dọn.
PretestSubmissionSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 24 * 3600 });

export default (mongoose.models.PretestSubmission as mongoose.Model<IPretestSubmission>) ||
  mongoose.model<IPretestSubmission>("PretestSubmission", PretestSubmissionSchema);
