// lib/mongodb.ts
import "server-only";
import { MongoClient, type Db } from "mongodb";

if (!process.env.MONGO_URI) {
  throw new Error('❌ Missing environment variable: "MONGO_URI"');
}

const uri = process.env.MONGO_URI;
const options = {};

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

if (process.env.NODE_ENV === "development") {
  const globalWithMongo = global as typeof globalThis & { _mongoClientPromise?: Promise<MongoClient> };
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

export default clientPromise;

export async function connectToDatabase(): Promise<{ client: MongoClient; db: Db }> {
  const client = await clientPromise;
  const db = client.db("vietpal"); // Database name
  return { client, db };
}
