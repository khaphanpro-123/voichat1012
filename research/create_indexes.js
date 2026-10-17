#!/usr/bin/env node
/**
 * create_indexes.js — Ngày 6 migration. Tạo indexes bắt buộc trên research DB.
 *
 * Chạy: node research/create_indexes.js
 *
 * Idempotent: chạy nhiều lần OK, MongoDB createIndex bỏ qua nếu index tồn tại
 * với cùng spec. Chỉ FAIL nếu spec khác — khi đó cần drop tay và tạo lại.
 *
 * Bắt buộc phải chạy sau khi verify_env.js pass và trước khi mở endpoint enrol.
 */

const path = require("path");
const fs = require("fs");

// Load .env.research
const envPath = path.join(__dirname, "..", ".env.research");
if (!fs.existsSync(envPath)) {
  console.error("❌ .env.research not found. Run verify_env.js first.");
  process.exit(1);
}
const env = {};
for (const line of fs.readFileSync(envPath, "utf-8").split("\n")) {
  const s = line.trim();
  if (!s || s.startsWith("#")) continue;
  const eq = s.indexOf("=");
  if (eq < 0) continue;
  let v = s.slice(eq + 1).trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    v = v.slice(1, -1);
  }
  env[s.slice(0, eq).trim()] = v;
}
const uri = env.RESEARCH_MONGO_URI || env.MONGO_URI;
const dbName = env.RESEARCH_MONGO_DB || env.MONGO_DB || "viettalk_research";
if (!uri) { console.error("❌ MONGO_URI (or RESEARCH_MONGO_URI) missing in .env.research"); process.exit(1); }
if (dbName === "viettalk") { console.error("❌ Refusing to run on production DB (dbName=viettalk)"); process.exit(1); }

// Spec: mỗi collection → mảng { keys, options }
// Bám theo schema hiện có: app/models/ReviewLog.ts, Participant, TestResult, JudgeScore
const INDEXES = {
  reviewlogs: [
    { keys: { userId: 1, vocabularyId: 1, createdAt: -1 }, options: { name: "user_word_time" } },
    { keys: { clientEventId: 1 }, options: { name: "clientEventId_unique", unique: true, sparse: true } },
    { keys: { sessionId: 1 }, options: { name: "sessionId" } },
    { keys: { condition: 1, createdAt: -1 }, options: { name: "condition_time" } },
    { keys: { weightsVersion: 1 }, options: { name: "weightsVersion" } },
  ],
  participants: [
    { keys: { participantCode: 1 }, options: { name: "participantCode_unique", unique: true } },
    { keys: { hashedUserId: 1 }, options: { name: "hashedUserId_unique", unique: true, sparse: true } },
    { keys: { armLabel: 1, cefrBand: 1 }, options: { name: "arm_cefr" } },
    { keys: { enrolledAt: -1 }, options: { name: "enrolledAt" } },
  ],
  testresults: [
    { keys: { participantCode: 1, testType: 1 }, options: { name: "participant_test_unique", unique: true } },
    { keys: { submittedAt: -1 }, options: { name: "submittedAt" } },
  ],
  judgescores: [
    { keys: { testResultId: 1, itemId: 1, judgeId: 1 }, options: { name: "score_unique", unique: true } },
    { keys: { judgeId: 1, createdAt: -1 }, options: { name: "judge_time" } },
  ],
  familiarityresponses: [
    { keys: { screenerId: 1 }, options: { name: "screenerId_unique", unique: true } },
  ],
  researchsm2states: [
    { keys: { participantCode: 1, vocabularyId: 1 }, options: { name: "participant_word_unique", unique: true } },
    { keys: { participantCode: 1, nextReviewDate: 1 }, options: { name: "participant_due" } },
  ],
  researchdecisionreceipts: [
    { keys: { receiptId: 1 }, options: { name: "receiptId_unique", unique: true } },
    { keys: { participantCode: 1, vocabularyId: 1, consumedAt: 1 }, options: { name: "participant_word_consumed" } },
    { keys: { expiresAt: 1, consumedAt: 1 }, options: { name: "expiry_consumed" } },
    {
      keys: { participantCode: 1, vocabularyId: 1, isActive: 1 },
      options: {
        name: "one_active_task_per_word",
        unique: true,
        partialFilterExpression: { isActive: true },
      },
    },
  ],
};

(async () => {
  let mongoose;
  try { mongoose = require("mongoose"); }
  catch (e) { console.error("❌ mongoose not installed"); process.exit(2); }

  console.log(`Connecting to research DB: ${dbName}...`);
  const conn = await mongoose.createConnection(uri, {
    dbName,
    maxPoolSize: 1,
    serverSelectionTimeoutMS: 5000,
  }).asPromise();

  let created = 0, existed = 0, failed = 0;
  for (const [coll, specs] of Object.entries(INDEXES)) {
    const c = conn.db.collection(coll);
    console.log(`\n[${coll}]`);
    for (const spec of specs) {
      try {
        const res = await c.createIndex(spec.keys, spec.options);
        // createIndex returns the index name; if it existed, MongoDB no-ops silently.
        // We can't tell created vs existed from a single call, but existing indexes
        // don't throw on same-spec createIndex.
        console.log(`  ✅ ${res}`);
        created++;
      } catch (err) {
        if (String(err.message).match(/already exists with different options/i)) {
          console.error(`  ⚠️  ${spec.options.name}: spec conflict — drop tay và chạy lại`);
          failed++;
        } else {
          console.error(`  ❌ ${spec.options.name}: ${err.message}`);
          failed++;
        }
      }
    }
  }
  await conn.close();
  console.log(`\nDone. ${created} index calls succeeded, ${failed} failed.`);
  process.exit(failed > 0 ? 1 : 0);
})();

