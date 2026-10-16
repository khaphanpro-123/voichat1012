import mongoose, { Schema, Document } from "mongoose";

/**
 * Per-participant, per-word state for the RCT SM-2 control arm.
 *
 * This collection is deliberately separate from Vocabulary so research
 * scheduling cannot mutate normal application data or inherit app history.
 */
export interface IResearchSm2State extends Document {
  participantCode: string;
  vocabularyId: string;
  stateVersion: string;
  easeFactor: number;
  interval: number;
  repetitions: number;
  nextReviewDate: Date;
  lastReceiptId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ResearchSm2StateSchema = new Schema<IResearchSm2State>({
  participantCode: { type: String, required: true, index: true },
  vocabularyId: { type: String, required: true },
  stateVersion: { type: String, required: true },
  easeFactor: { type: Number, required: true, min: 1.3 },
  interval: { type: Number, required: true, min: 1 },
  repetitions: { type: Number, required: true, min: 0 },
  nextReviewDate: { type: Date, required: true, index: true },
  lastReceiptId: { type: String },
}, { timestamps: true });

ResearchSm2StateSchema.index({ participantCode: 1, vocabularyId: 1 }, { unique: true });
ResearchSm2StateSchema.index({ participantCode: 1, nextReviewDate: 1 });

export default (mongoose.models.ResearchSm2State as mongoose.Model<IResearchSm2State>) ||
  mongoose.model<IResearchSm2State>("ResearchSm2State", ResearchSm2StateSchema);

