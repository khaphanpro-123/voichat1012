// lib/mongodb.ts
import "server-only";
import { MongoClient, type Db } from "mongodb";

// Connection pool options - critical for M0 free tier (500 connection limit)
// With many serverless instances, keep pool small per instance
const options = {
  maxPoolSize: 5,        // Max 5 connections per serverless instance
  minPoolSize: 1,        // Keep 1 connection alive
  maxIdleTimeMS: 30000,  // Close idle connections after 30s
  serverSelectionTimeoutMS: 5000,
  connectTimeoutMS: 10000,
  socketTimeoutMS: 45000,
};

// Use global to persist connection across hot reloads (dev) and across
// invocations within the same serverless instance (prod)
const globalWithMongo = global as typeof globalThis & {
  _mongoClientPromise?: Promise<MongoClient>;
};

function getClientPromise(): Promise<MongoClient> {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    throw new Error('❌ Missing environment variable: "MONGO_URI"');
  }

  // Reuse existing promise if available (same serverless instance)
  if (globalWithMongo._mongoClientPromise) {
    return globalWithMongo._mongoClientPromise;
  }

  const client = new MongoClient(uri, options);
  globalWithMongo._mongoClientPromise = client.connect().then((c) => {
    console.log("✅ MongoDB connected");
    return c;
  }).catch((err) => {
    // Reset on failure so next request retries
    globalWithMongo._mongoClientPromise = undefined;
    throw err;
  });

  return globalWithMongo._mongoClientPromise;
}

export default getClientPromise;

export async function connectToDatabase(): Promise<{
  client: MongoClient;
  db: Db;
}> {
  const mongoClient = await getClientPromise();
  const db = mongoClient.db("vietpal");
  return { client: mongoClient, db };
}
