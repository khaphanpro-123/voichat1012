// app/models/FamiliarityResponse.ts
// Records whether a pre-pilot screener (H5) already knows each target word.
// One document per screener. screenerId is self-reported (e.g. "S001").

import mongoose, { Schema, Document } from "mongoose";

export interface IFamiliarityResponse extends Document {
  screenerId: string;
  /** wordId → true if screener reports already knowing this word well */
  responses: Map<string, boolean>;
  submittedAt: Date;
  metadata?: {
    userAgent?: string;
    durationSecs?: number;
    nWords?: number;
  };
}

const FamiliarityResponseSchema = new Schema<IFamiliarityResponse>(
  {
    screenerId: { type: String, required: true, trim: true, maxlength: 20 },
    responses: { type: Map, of: Boolean, required: true },
    submittedAt: { type: Date, default: () => new Date() },
    metadata: {
      userAgent: { type: String, maxlength: 300 },
      durationSecs: { type: Number },
      nWords: { type: Number },
    },
  },
  { collection: "familiarityresponses" }
);

FamiliarityResponseSchema.index({ screenerId: 1 }, { unique: true });

export default mongoose.models.FamiliarityResponse ||
  mongoose.model<IFamiliarityResponse>(
    "FamiliarityResponse",
    FamiliarityResponseSchema
  );
