import mongoose, { Schema, Document } from "mongoose";

/**
 * Per-review log for training DART / CARTS.
 * Row shape follows H = {(w_i, Δ_i, d_i, x_i, r_i)} from Algorithm 1 (x.pdf).
 * We also store RT (response time) needed for CARTS reward (Alg 3, line 14).
 */
export interface IReviewLog extends Document {
  userId: string;
  vocabularyId: mongoose.Types.ObjectId;
  word: string;
  deltaDays: number;                 // Δ_i: elapsed days since last review
  retrievalType: 0 | 1 | 2 | 3;      // d_i
  featureVector: number[];           // x_i
  contextId?: string;                // c_i for CARTS
  recall: 0 | 1;                     // r_i
  responseTimeMs?: number;           // RT_i
  quality?: number;                  // 0-5 legacy quality mapping

  // --- Research extensions (Ngày 4) ---
  clientEventId?: string;            // idempotency key sinh phía client (UUIDv4)
  sessionId?: string;                // gom lượt review thành phiên học
  condition?: "sm2" | "hlr" | "dart" | "karl" | "lector" | "carts";
  schedulerVersion?: string;         // "dart@1.0.0"
  weightsVersion?: string;           // sha256 12 ký tự của dart_weights.json
  scheduledAt?: Date;                // thời điểm scheduler quyết định show
  servedAt?: Date;                   // thời điểm client thực sự render
  elapsedMs?: number;                // performance.now() phía client — thời gian trả lời
  serverDeltaDays?: number;          // Δ server tính lại, không tin client
  taskPromptHash?: string;           // sha256 prompt để verify version bộ đề
  isCatchUp?: boolean;               // true nếu người học làm bù lượt bỏ lỡ

  createdAt: Date;
}

const ReviewLogSchema = new Schema<IReviewLog>({
  userId: { type: String, required: true, index: true },
  vocabularyId: { type: Schema.Types.ObjectId, ref: "Vocabulary", required: true, index: true },
  word: { type: String, required: true },
  deltaDays: { type: Number, required: true },
  retrievalType: { type: Number, min: 0, max: 3, required: true },
  featureVector: { type: [Number], default: [] },
  contextId: { type: String },
  recall: { type: Number, enum: [0, 1], required: true },
  responseTimeMs: { type: Number },
  quality: { type: Number, min: 0, max: 5 },

  // --- Research extensions (Ngày 4) ---
  clientEventId: { type: String, index: { unique: true, sparse: true } },
  sessionId: { type: String, index: true },
  condition: { type: String, enum: ["sm2", "hlr", "dart", "karl", "lector", "carts"] },
  schedulerVersion: { type: String },
  weightsVersion: { type: String },
  scheduledAt: { type: Date },
  servedAt: { type: Date },
  elapsedMs: { type: Number },
  serverDeltaDays: { type: Number },
  taskPromptHash: { type: String },
  isCatchUp: { type: Boolean, default: false },
}, { timestamps: { createdAt: true, updatedAt: false } });

ReviewLogSchema.index({ userId: 1, createdAt: -1 });
ReviewLogSchema.index({ vocabularyId: 1, createdAt: -1 });
ReviewLogSchema.index({ condition: 1, createdAt: -1 });
ReviewLogSchema.index({ sessionId: 1, createdAt: 1 });

export default (mongoose.models.ReviewLog as mongoose.Model<IReviewLog>) ||
  mongoose.model<IReviewLog>("ReviewLog", ReviewLogSchema);
