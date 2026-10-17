import mongoose, { Schema, Document } from "mongoose";

/** Immutable, server-authoritative decision behind one study task. */
export interface IResearchDecisionReceipt extends Document {
  receiptId: string;
  participantCode: string;
  vocabularyId: string;
  word: string;
  condition: "sm2" | "hlr" | "dart";
  retrievalType: 0 | 1 | 2 | 3;
  featureVector: number[];
  schedulerVersion: string;
  weightsVersion: string;
  taskPromptHash: string;
  expectedAnswer: string;
  issuedAt: Date;
  expiresAt: Date;
  isActive: boolean;
  consumedAt?: Date;
  consumedByClientEventId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ResearchDecisionReceiptSchema = new Schema<IResearchDecisionReceipt>({
  receiptId: { type: String, required: true, unique: true, index: true },
  participantCode: { type: String, required: true, index: true },
  vocabularyId: { type: String, required: true, index: true },
  word: { type: String, required: true },
  condition: { type: String, enum: ["sm2", "hlr", "dart"], required: true },
  retrievalType: { type: Number, required: true, min: 0, max: 3 },
  featureVector: { type: [Number], required: true },
  schedulerVersion: { type: String, required: true },
  weightsVersion: { type: String, required: true },
  taskPromptHash: { type: String, required: true },
  // Never selected into a client response. It is retained only long enough
  // for the server to compute the deterministic review score.
  expectedAnswer: { type: String, required: true, select: false },
  issuedAt: { type: Date, required: true, default: () => new Date() },
  expiresAt: { type: Date, required: true, index: true },
  isActive: { type: Boolean, required: true, default: true, index: true },
  consumedAt: { type: Date },
  consumedByClientEventId: { type: String },
}, { timestamps: true });

ResearchDecisionReceiptSchema.index({ participantCode: 1, vocabularyId: 1, consumedAt: 1 });
ResearchDecisionReceiptSchema.index({ expiresAt: 1, consumedAt: 1 });
// At most one live task for a participant–word pair. Expired rows are closed
// before issuing a replacement; the partial unique index also closes races.
ResearchDecisionReceiptSchema.index(
  { participantCode: 1, vocabularyId: 1, isActive: 1 },
  { unique: true, partialFilterExpression: { isActive: true }, name: "one_active_task_per_word" },
);

export default (mongoose.models.ResearchDecisionReceipt as mongoose.Model<IResearchDecisionReceipt>) ||
  mongoose.model<IResearchDecisionReceipt>("ResearchDecisionReceipt", ResearchDecisionReceiptSchema);

