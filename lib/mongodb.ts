// lib/mongodb.ts
import "server-only";
import { MongoClient, type Db } from "mongodb";

const options = {};

let client: MongoClient | null = null;
let clientPromise: Promise<MongoClient> | null = null;

function getClientPromise(): Promise<MongoClient> {
  // Check MONGO_URI at runtime, not build time
  const uri = process.env.MONGO_URI;
  if (!uri) {
    throw new Error('❌ Missing environment variable: "MONGO_URI"');
  }

  if (clientPromise) {
    return clientPromise;
  }

  if (process.env.NODE_ENV === "development") {
    const globalWithMongo = global as typeof globalThis & {
      _mongoClientPromise?: Promise<MongoClient>;
    };
    if (!globalWithMongo._mongoClientPromise) {
      client = new MongoClient(uri, options);
      globalWithMongo._mongoClientPromise = client.connect().then((c) => {
        console.log("✅ Connected to MongoDB (dev)");
        return c;
      });
    }
    clientPromise = globalWithMongo._mongoClientPromise;
  } else {
    client = new MongoClient(uri, options);
    clientPromise = client.connect().then((c) => {
      console.log("✅ Connected to MongoDB (prod)");
      return c;
    });
  }

  return clientPromise;
}

export default getClientPromise;

export async function connectToDatabase(): Promise<{
  client: MongoClient;
  db: Db;
}> {
  const mongoClient = await getClientPromise();
  const db = mongoClient.db("vietpal"); // Database name
  return { client: mongoClient, db };
}
