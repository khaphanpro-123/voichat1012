// app/models/AIBudgetDaily.ts
//
// Daily LLM cost tracking (Ngày 12 / D-013). One document per (date UTC).
// Provides the persistence layer for lib/aiBudget.ts which enforces cap +
// emits alerts.

import mongoose, { Schema, Document } from "mongoose";

export interface IAIBudgetDaily extends Document {
  dateKey: string;                    // "YYYY-MM-DD" in UTC
  totalUsd: number;                    // running total
  byProvider: Record<string, number>;  // { openai: 1.23, groq: 0, cohere: 0.05 }
  callCount: number;
  updatedAt: Date;
}

const AIBudgetDailySchema = new Schema<IAIBudgetDaily>({
  dateKey: { type: String, required: true, unique: true, index: true },
  totalUsd: { type: Number, required: true, default: 0 },
  byProvider: { type: Schema.Types.Mixed, required: true, default: {} },
  callCount: { type: Number, required: true, default: 0 },
  updatedAt: { type: Date, required: true, default: () => new Date() },
}, { timestamps: false });

export default (mongoose.models.AIBudgetDaily as mongoose.Model<IAIBudgetDaily>) ||
  mongoose.model<IAIBudgetDaily>("AIBudgetDaily", AIBudgetDailySchema);
