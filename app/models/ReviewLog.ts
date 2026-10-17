import mongoose, { Schema, Document } from "mongoose";

/**
 * Per-review log for training DART / CARTS.
 * Row shape follows H = {(w_i, Δ_i, d_i, x_i, r_i)} from Algorithm 1 (x.pdf).
 * We also store RT (response time) needed for CARTS reward (Alg 3, line 14).
 */
export interface IReviewLog extends Document {
  userId: string;
  // App vocabulary uses ObjectId; the frozen RCT word bank uses stable IDs
  // such as "w_001". Retaining both is necessary for an isolated research
  // log and avoids coercing a study identifier into a nonexistent document.
  vocabularyId: mongoose.Types.ObjectId | string;
  word: string;
  deltaDays: number;                 // Δ_i: elapsed days since last review
  retrievalType: 0 | 1 | 2 | 3;      // d_i
  taskPolicyVersion?: string;         // immutable server-side retrieval-policy version
  heuristicRetrievalType?: 0 | 1 | 2 | 3;
  explorationEpsilon?: number;       // 0 outside the DART exploration policy
  explorationDraw?: number;          // server PRNG draw used for epsilon branch
  explorationSelected?: boolean;
  explorationEligibleTypes?: Array<0 | 1 | 2 | 3>;
  explorationSelectionDraw?: number;
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

  // --- Amendment #A-002 (2026-08-09): judge composite feature ---
  judgeComposite?: number;           // ∈ [0, 1] = judge.composite / 10; feature x[5] input
  judge?: {                          // full LLM-Judge output mirrored here for RQ3 plots
    accuracy?: number;
    fluency?: number;
    appropriateness?: number;
    creativity?: number;
    composite?: number;              // ∈ [0, 10]
  };

  createdAt: Date;
}

const ReviewLogSchema = new Schema<IReviewLog>({
  userId: { type: String, required: true, index: true },
  vocabularyId: { type: Schema.Types.Mixed, required: true, index: true },
  word: { type: String, required: true },
  deltaDays: { type: Number, required: true },
  retrievalType: { type: Number, min: 0, max: 3, required: true },
  taskPolicyVersion: { type: String },
  heuristicRetrievalType: { type: Number, min: 0, max: 3 },
  explorationEpsilon: { type: Number, min: 0, max: 1 },
  explorationDraw: { type: Number, min: 0, max: 1 },
  explorationSelected: { type: Boolean },
  explorationEligibleTypes: { type: [Number], default: undefined },
  explorationSelectionDraw: { type: Number, min: 0, max: 1 },
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

  // --- Amendment #A-002 fields ---
  judgeComposite: { type: Number, min: 0, max: 1, index: true },
  judge: {
    accuracy: { type: Number, min: 0, max: 10 },
    fluency: { type: Number, min: 0, max: 10 },
    appropriateness: { type: Number, min: 0, max: 10 },
    creativity: { type: Number, min: 0, max: 10 },
    composite: { type: Number, min: 0, max: 10 },
  },
}, { timestamps: { createdAt: true, updatedAt: false } });

ReviewLogSchema.index({ userId: 1, createdAt: -1 });
ReviewLogSchema.index({ vocabularyId: 1, createdAt: -1 });
ReviewLogSchema.index({ condition: 1, createdAt: -1 });
ReviewLogSchema.index({ sessionId: 1, createdAt: 1 });

export default (mongoose.models.ReviewLog as mongoose.Model<IReviewLog>) ||
  mongoose.model<IReviewLog>("ReviewLog", ReviewLogSchema);

