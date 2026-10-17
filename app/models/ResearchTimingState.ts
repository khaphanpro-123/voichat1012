import mongoose, { Schema, Document } from "mongoose";

/** Per-participant timing state for the HLR and DART RCT arms. */
export interface IResearchTimingState extends Document {
  participantCode: string;
  vocabularyId: string;
  condition: "hlr" | "dart";
  stateVersion: string;
  interval: number;
  nextReviewDate: Date;
  lastRetrievalType: 0 | 1 | 2 | 3;
  halfLife: number;
  predictedRecall: number;
  lastReceiptId?: string;
  revision: number;
  createdAt: Date;
  updatedAt: Date;
}

const ResearchTimingStateSchema = new Schema<IResearchTimingState>({
  participantCode: { type: String, required: true, index: true },
  vocabularyId: { type: String, required: true },
  condition: { type: String, enum: ["hlr", "dart"], required: true },
  stateVersion: { type: String, required: true },
  interval: { type: Number, required: true, min: 1 },
  nextReviewDate: { type: Date, required: true, index: true },
  lastRetrievalType: { type: Number, required: true, min: 0, max: 3 },
  halfLife: { type: Number, required: true, min: 0 },
  predictedRecall: { type: Number, required: true, min: 0, max: 1 },
  lastReceiptId: { type: String },
  revision: { type: Number, required: true, default: 0, min: 0 },
}, { timestamps: true });

ResearchTimingStateSchema.index(
  { participantCode: 1, vocabularyId: 1, condition: 1 },
  { unique: true },
);
ResearchTimingStateSchema.index({ participantCode: 1, condition: 1, nextReviewDate: 1 });

export default (mongoose.models.ResearchTimingState as mongoose.Model<IResearchTimingState>) ||
  mongoose.model<IResearchTimingState>("ResearchTimingState", ResearchTimingStateSchema);

