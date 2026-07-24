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
}, { timestamps: { createdAt: true, updatedAt: false } });

ReviewLogSchema.index({ userId: 1, createdAt: -1 });
ReviewLogSchema.index({ vocabularyId: 1, createdAt: -1 });

export default (mongoose.models.ReviewLog as mongoose.Model<IReviewLog>) ||
  mongoose.model<IReviewLog>("ReviewLog", ReviewLogSchema);
