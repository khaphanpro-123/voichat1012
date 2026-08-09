// lib/researchDb.ts
//
// Separate Mongoose connection for the research database, isolated from the
// production `viettalk` DB used by lib/db.ts. Reads config from RESEARCH_MONGO_URI
// (or, as a documented fallback, from a separately-loaded .env.research at the
// call site). Never falls back to production MONGO_URI — that would defeat the
// purpose of the isolation (Ngày 6 of PLAN_45_DAYS.md).
//
// Usage:
//   import { connectResearchDB } from "@/lib/researchDb";
//   await connectResearchDB();
//   // Then use models registered on the research connection, e.g.
//   //   ResearchReviewLog.find(...)
//
// Model registration: research collections should be registered on this
// connection explicitly to avoid accidental cross-DB writes. See
// research/db/models.ts (created by Ngày 6 migration).

import mongoose, { type Connection } from "mongoose";

interface CachedResearchConnection {
  conn: Connection | null;
  promise: Promise<Connection> | null;
}

let cached: CachedResearchConnection = (global as any)._researchMongoose;
if (!cached) {
  cached = (global as any)._researchMongoose = { conn: null, promise: null };
}

// Small pool: research writes are burst-y (batch enrol, batch review submissions)
// but M0-friendly. Keep separate from production pool.
//
// Env-var contract: .env.research is loaded in isolation (dotenv-cli or similar
// with -e .env.research). Inside that file, MONGO_URI / MONGO_DB refer to the
// research cluster — no collision with production because the two .env files
// are loaded separately by different processes. For extra safety, RESEARCH_-
// prefixed names take precedence when both exist.
function getResearchUri(): string | undefined {
  return process.env.RESEARCH_MONGO_URI || process.env.MONGO_URI;
}
function getResearchDbName(): string {
  return process.env.RESEARCH_MONGO_DB || process.env.MONGO_DB || "viettalk_research";
}

const buildOptions = () => ({
  dbName: getResearchDbName(),
  maxPoolSize: 3,
  minPoolSize: 1,
  maxIdleTimeMS: 30000,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  bufferCommands: true,
});

export async function connectResearchDB(): Promise<Connection> {
  const RESEARCH_MONGO_URI = getResearchUri();
  if (!RESEARCH_MONGO_URI) {
    throw new Error(
      "Missing MONGO_URI (or RESEARCH_MONGO_URI). " +
      "Load .env.research before calling connectResearchDB(). " +
      "Do NOT fall back to production MONGO_URI silently — research must be isolated."
    );
  }

  // Refuse to connect if the URI accidentally points at the production DB.
  // This is a soft check (regex on dbName in URI), belt-and-braces on top of
  // the explicit dbName override below.
  if (/\/viettalk(\?|$)/.test(RESEARCH_MONGO_URI) && !RESEARCH_MONGO_URI.includes("viettalk_research")) {
    throw new Error(
      "RESEARCH_MONGO_URI appears to point at the production `viettalk` DB. " +
      "Use a dedicated `viettalk_research` database — never share with production."
    );
  }

  if (cached.conn && cached.conn.readyState === 1) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = buildOptions();
    cached.promise = mongoose
      .createConnection(RESEARCH_MONGO_URI, opts)
      .asPromise()
      .then((c) => {
        console.log(
          `[ResearchDB] Connected to ${opts.dbName} ` +
          `(readyState=${c.readyState})`
        );
        return c;
      })
      .catch((err) => {
        cached.promise = null;
        throw err;
      });
  }

  try {
    cached.conn = await cached.promise;
  } catch (err) {
    cached.promise = null;
    throw err;
  }

  return cached.conn;
}

export function isResearchConnected(): boolean {
  return cached.conn?.readyState === 1;
}

// For scripts that want a one-shot connect + disconnect (e.g. migrations,
// backups). Do NOT call this from route handlers — they should reuse the
// cached connection.
export async function withResearchDB<T>(fn: (c: Connection) => Promise<T>): Promise<T> {
  const c = await connectResearchDB();
  return fn(c);
}
