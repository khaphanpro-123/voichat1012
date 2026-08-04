import mongoose, { Schema, Document } from "mongoose";

/**
 * Người tham gia nghiên cứu (RCT DART vs HLR vs SM-2).
 * Tách khỏi collection `users` để không lẫn với người dùng ứng dụng thường,
 * và để pipeline nghiên cứu chỉ đọc `participants` khi export dữ liệu.
 *
 * Được tạo bởi endpoint `POST /api/research/enrol` sau khi người tham gia
 * ký consent điện tử và làm pretest CEFR.
 */
export interface IParticipant extends Document {
  participantCode: string;           // ẩn danh: "P0001", không dính userId app
  userId?: string;                   // liên kết nội bộ (đã salted-hash) để join log
  condition: "sm2" | "hlr" | "dart";
  cefrLevel: "A2" | "B1" | "B2";
  stratum: string;                   // khối tầng dùng khi assign (vd "B1")
  enrolledAt: Date;
  consentSignedAt: Date;
  consentDocHash: string;            // sha256 phiên bản consent người ký
  pretestScore: number;              // pretest CEFR 0–100
  pretestCompletedAt: Date;
  dropoutAt?: Date;                  // ngày ngừng tham gia (nếu có)
  dropoutReason?: string;
  finishedAt?: Date;                 // hoàn thành posttest trễ (tuần 10)

  // metadata theo dõi tuân thủ
  daysActive?: number;               // số ngày có ≥1 review
  totalReviews?: number;
  lastActiveAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ParticipantSchema = new Schema<IParticipant>({
  participantCode: { type: String, required: true, unique: true, index: true },
  userId: { type: String, index: { unique: true, sparse: true } },
  condition: { type: String, enum: ["sm2", "hlr", "dart"], required: true, index: true },
  cefrLevel: { type: String, enum: ["A2", "B1", "B2"], required: true },
  stratum: { type: String, required: true, index: true },
  enrolledAt: { type: Date, required: true, default: () => new Date() },
  consentSignedAt: { type: Date, required: true },
  consentDocHash: { type: String, required: true },
  pretestScore: { type: Number, required: true, min: 0, max: 100 },
  pretestCompletedAt: { type: Date, required: true },
  dropoutAt: { type: Date },
  dropoutReason: { type: String },
  finishedAt: { type: Date },
  daysActive: { type: Number, default: 0 },
  totalReviews: { type: Number, default: 0 },
  lastActiveAt: { type: Date },
}, { timestamps: true });

ParticipantSchema.index({ condition: 1, dropoutAt: 1 });
ParticipantSchema.index({ stratum: 1, condition: 1 });

export default (mongoose.models.Participant as mongoose.Model<IParticipant>) ||
  mongoose.model<IParticipant>("Participant", ParticipantSchema);
