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
const { INDEXES } = require("./index_specs");

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

