// lib/db.ts
import mongoose from "mongoose";

interface CachedConnection {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

let cached: CachedConnection = (global as any)._mongoose;
if (!cached) {
  cached = (global as any)._mongoose = { conn: null, promise: null };
}

// Optimized connection options
const connectionOptions = {
  dbName: process.env.MONGO_DB || undefined,
  maxPoolSize: 10, // Connection pool
  minPoolSize: 2,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  bufferCommands: true,
};

export async function connectDB(): Promise<typeof mongoose> {
  // Check MONGO_URI at runtime, not build time
  const MONGO_URI = process.env.MONGO_URI;
  if (!MONGO_URI) {
    throw new Error("Missing MONGO_URI environment variable");
  }

  // Return existing connection immediately
  if (cached.conn) {
    return cached.conn;
  }

  // Create new connection promise if not exists
  if (!cached.promise) {
    cached.promise = mongoose
      .connect(MONGO_URI, connectionOptions)
      .then((m) => {
        console.log("[DB] Connected to MongoDB");
        return m;
      })
      .catch((err) => {
        cached.promise = null; // Reset on error
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

// Check if connected (non-blocking)
export function isConnected(): boolean {
  return mongoose.connection.readyState === 1;
}
