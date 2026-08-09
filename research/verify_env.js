#!/usr/bin/env node
/**
 * verify_env.js — Sanity-check .env.research without leaking values.
 *
 * Chạy: node research/verify_env.js
 *
 * Kiểm tra:
 *   1. RESEARCH_MONGO_URI có tồn tại + format đúng
 *   2. dbName trong URI KHÔNG phải "viettalk" (production)
 *   3. RESEARCH_SALT tồn tại, ≥ 32 ký tự hex
 *   4. Ping MongoDB thành công (connect + ping + list collections)
 *   5. (Tuỳ chọn) UPSTASH_REDIS_REST_URL/TOKEN có format hợp lệ
 *
 * KHÔNG in secret nào ra stdout. Chỉ in mask (số ký tự).
 */

const path = require("path");
const fs = require("fs");

const envPath = path.join(__dirname, "..", ".env.research");
if (!fs.existsSync(envPath)) {
  console.error(`❌ Không thấy ${envPath}`);
  console.error(`   Tạo file này với ít nhất: RESEARCH_MONGO_URI, RESEARCH_MONGO_DB, RESEARCH_SALT`);
  process.exit(1);
}

// Parse .env manually to avoid dotenv dependency
const raw = fs.readFileSync(envPath, "utf-8");
const env = {};
for (const line of raw.split("\n")) {
  const s = line.trim();
  if (!s || s.startsWith("#")) continue;
  const eq = s.indexOf("=");
  if (eq < 0) continue;
  const k = s.slice(0, eq).trim();
  let v = s.slice(eq + 1).trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    v = v.slice(1, -1);
  }
  env[k] = v;
}

let failed = 0;
const ok = (msg) => console.log(`✅ ${msg}`);
const fail = (msg) => { console.error(`❌ ${msg}`); failed++; };
const warn = (msg) => console.warn(`⚠️  ${msg}`);

// --- Check 1: MONGO_URI (or RESEARCH_MONGO_URI) ---
// .env.research is loaded in isolation, so plain MONGO_URI here does NOT
// collide with production. Both names accepted; RESEARCH_MONGO_URI takes precedence.
const uri = env.RESEARCH_MONGO_URI || env.MONGO_URI;
const uriKey = env.RESEARCH_MONGO_URI ? "RESEARCH_MONGO_URI" : "MONGO_URI";
if (!uri) {
  fail("MONGO_URI (or RESEARCH_MONGO_URI) missing in .env.research");
} else if (!/^mongodb(\+srv)?:\/\//.test(uri)) {
  fail(`${uriKey} does not start with mongodb:// or mongodb+srv://`);
} else {
  ok(`${uriKey} present (${uri.length} chars, scheme=${uri.split("://")[0]})`);
}

// --- Check 2: not production DB ---
const dbName = env.RESEARCH_MONGO_DB || env.MONGO_DB;
if (!dbName) {
  warn("RESEARCH_MONGO_DB not set — will default to 'viettalk_research'");
} else if (dbName === "viettalk") {
  fail("RESEARCH_MONGO_DB = 'viettalk' — this IS the production DB! Use 'viettalk_research'");
} else if (!dbName.includes("research")) {
  warn(`RESEARCH_MONGO_DB = '${dbName}' — recommend a name containing 'research'`);
} else {
  ok(`RESEARCH_MONGO_DB = '${dbName}' (isolated from production)`);
}
if (uri && /\/viettalk(\?|$)/.test(uri) && !uri.includes("viettalk_research")) {
  fail("URI path points to /viettalk — will hit production. Change to /viettalk_research");
}

// --- Check 3: RESEARCH_SALT ---
const salt = env.RESEARCH_SALT;
if (!salt) {
  fail("RESEARCH_SALT missing");
} else if (salt.length < 32) {
  fail(`RESEARCH_SALT only ${salt.length} chars — need ≥ 32 (recommend 64 hex from openssl rand -hex 32)`);
} else if (!/^[0-9a-fA-F]+$/.test(salt)) {
  warn(`RESEARCH_SALT is ${salt.length} chars but not pure hex — OK but hex is recommended`);
} else {
  ok(`RESEARCH_SALT present (${salt.length} hex chars)`);
}

// --- Check 4: Upstash Redis (optional) ---
const redisUrl = env.UPSTASH_REDIS_REST_URL;
const redisToken = env.UPSTASH_REDIS_REST_TOKEN;
if (!redisUrl && !redisToken) {
  warn("Upstash Redis not configured — Ngày 11 (LLM-Judge queue) sẽ bị chặn");
} else if (redisUrl && redisToken) {
  if (!/^https:\/\/.*\.upstash\.io/.test(redisUrl)) {
    warn(`UPSTASH_REDIS_REST_URL format lạ (${redisUrl.length} chars) — verify tay`);
  } else {
    ok(`Upstash Redis configured (url=${redisUrl.length} chars, token=${redisToken.length} chars)`);
  }
} else {
  fail("Upstash Redis phải có cả URL và TOKEN, hoặc bỏ cả hai");
}

if (failed > 0) {
  console.error(`\n❌ ${failed} check(s) failed — sửa trước khi ping DB.`);
  process.exit(1);
}

// --- Check 5: Ping MongoDB (only if all format checks pass) ---
console.log("\nPinging MongoDB (5s timeout)...");
const effectiveDb = dbName || "viettalk_research";

(async () => {
  let mongoose;
  try {
    mongoose = require("mongoose");
  } catch (e) {
    console.error("❌ mongoose not installed — run `npm install` first");
    process.exit(2);
  }
  try {
    const conn = await mongoose.createConnection(uri, {
      dbName: effectiveDb,
      maxPoolSize: 1,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 5000,
    }).asPromise();
    const admin = conn.db.admin();
    await admin.ping();
    const collections = await conn.db.listCollections().toArray();
    console.log(`✅ Ping OK. Collections in '${conn.db.databaseName}': ${collections.length}`);
    if (collections.length > 0) {
      console.log(`   Names: ${collections.map((c) => c.name).sort().join(", ")}`);
    } else {
      console.log("   (empty DB — expected for fresh research setup)");
    }
    await conn.close();
    console.log("\n✅ Ngày 6 pre-check: PASS. Sẵn sàng chạy migration create_indexes.js");
    process.exit(0);
  } catch (err) {
    console.error(`❌ Ping failed: ${err.message}`);
    console.error("   Check: IP allowlist (Atlas Network Access), password rotated after leak?, cluster running?");
    process.exit(3);
  }
})();
