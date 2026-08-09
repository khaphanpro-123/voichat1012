// app/models/AICache.ts
//
// Content-addressed cache for LLM responses (Ngày 12 / D-013).
//
// Cache key = SHA-256(prompt + modelHint + params). If the same (word, retrievalType,
// contextId) generates the same prompt, we get a hit → no LLM call → save cost AND
// guarantee equivalent tasks across learners in the same arm (internal validity).
//
// TTL default 7 days — long enough for a pilot cohort to share cache, short enough
// to refresh if we tweak prompts.

import mongoose, { Schema, Document } from "mongoose";

export interface IAICache extends Document {
  cacheKey: string;             // SHA-256 hex
  response: {
    content: string;
    provider: "openai" | "groq" | "cohere";
    model: string;
  };
  createdAt: Date;
  expiresAt: Date;              // TTL enforced via MongoDB TTL index
  hitCount: number;             // for cache-quality metrics
  lastHitAt?: Date;
}

const AICacheSchema = new Schema<IAICache>({
  cacheKey: { type: String, required: true, unique: true, index: true },
  response: {
    content: { type: String, required: true },
    provider: { type: String, enum: ["openai", "groq", "cohere"], required: true },
    model: { type: String, required: true },
  },
  createdAt: { type: Date, required: true, default: () => new Date() },
  expiresAt: { type: Date, required: true, index: { expires: 0 } }, // TTL: doc removed when expiresAt < now
  hitCount: { type: Number, required: true, default: 0 },
  lastHitAt: { type: Date },
}, { timestamps: false });

export default (mongoose.models.AICache as mongoose.Model<IAICache>) ||
  mongoose.model<IAICache>("AICache", AICacheSchema);
