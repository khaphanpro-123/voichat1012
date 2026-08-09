// app/models/JudgeJob.ts
//
// Async queue for LLM-Judge (Ngày 11 of PLAN_45_DAYS.md).
//
// Purpose: /api/context-transfer/judge previously called the LLM synchronously
// (2–8s per call) → would time out Vercel's 10s limit under concurrent load.
// This model backs a MongoDB-based queue: POST enqueues, worker processes,
// client polls GET /status.
//
// Decision reference: docs/DECISIONS.md D-008 (MongoDB queue + piggyback worker).
//
// Deliberate isolation from lib/async-queue-db.ts (which is hard-typed for the
// document-upload pipeline). Different lifecycle, different fields.

import mongoose, { Schema, Document } from "mongoose";

export type JudgeJobStatus = "queued" | "processing" | "completed" | "failed";

export interface IJudgeJob extends Document {
  jobId: string;                    // uuid v4-ish, unique
  userId: string;
  word: string;
  learnerSentence: string;
  targetContext?: string;
  reference?: string;
  reviewLogId?: string;             // if present, judge scores also mirrored into ReviewLog.judge.*
  status: JudgeJobStatus;
  scores?: {
    accuracy: number;
    fluency: number;
    appropriateness: number;
    creativity: number;
    composite: number;
    rationale?: string;
  };
  error?: string;
  retryCount: number;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}

const JudgeJobSchema = new Schema<IJudgeJob>({
  jobId: { type: String, required: true, unique: true, index: true },
  userId: { type: String, required: true, index: true },
  word: { type: String, required: true },
  learnerSentence: { type: String, required: true },
  targetContext: { type: String },
  reference: { type: String },
  reviewLogId: { type: String, index: true },
  status: {
    type: String,
    enum: ["queued", "processing", "completed", "failed"],
    required: true,
    default: "queued",
    index: true,
  },
  scores: {
    accuracy: { type: Number, min: 0, max: 10 },
    fluency: { type: Number, min: 0, max: 10 },
    appropriateness: { type: Number, min: 0, max: 10 },
    creativity: { type: Number, min: 0, max: 10 },
    composite: { type: Number, min: 0, max: 10 },
    rationale: { type: String },
  },
  error: { type: String },
  retryCount: { type: Number, required: true, default: 0 },
  createdAt: { type: Date, required: true, default: () => new Date(), index: true },
  startedAt: { type: Date },
  completedAt: { type: Date },
}, { timestamps: false });

// Compound index for the dequeue query: findOneAndUpdate({status:'queued'}) sorted by createdAt
JudgeJobSchema.index({ status: 1, createdAt: 1 });

export default (mongoose.models.JudgeJob as mongoose.Model<IJudgeJob>) ||
  mongoose.model<IJudgeJob>("JudgeJob", JudgeJobSchema);
