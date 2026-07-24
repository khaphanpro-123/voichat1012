// lib/contextPool.ts
// Build a context pool (C in Alg 4) from Pinecone by retrieving top-K candidate
// sentences related to the target word, each carrying its embedding.
//
// If Pinecone / Cohere are unreachable, we return a compact fallback pool made
// from the vocab item's own example sentences so CARTS can still run.

import { Pinecone } from "@pinecone-database/pinecone";
import { CohereClient } from "cohere-ai";
import { ContextItem } from "./contextDiversity";

let pineconeClient: Pinecone | null = null;
let cohereClient: CohereClient | null = null;

function pinecone(): Pinecone | null {
  if (!process.env.PINECONE_API_KEY) return null;
  if (!pineconeClient) pineconeClient = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
  return pineconeClient;
}

function cohere(): CohereClient | null {
  if (!process.env.COHERE_API_KEY) return null;
  if (!cohereClient) cohereClient = new CohereClient({ token: process.env.COHERE_API_KEY });
  return cohereClient;
}

async function embedQuery(text: string): Promise<number[] | null> {
  const co = cohere();
  if (!co) return null;
  try {
    const r = await co.embed({
      model: "embed-multilingual-v3.0",
      texts: [text],
      input_type: "search_query" as any,
    });
    return (r.embeddings as number[][])[0] ?? null;
  } catch {
    return null;
  }
}

export interface BuildPoolOptions {
  word: string;
  fallbackSentences?: string[];   // vocab.example etc.
  topK?: number;
  namespace?: string;
}

export async function buildContextPool(opts: BuildPoolOptions): Promise<ContextItem[]> {
  const { word, fallbackSentences = [], topK = 16, namespace } = opts;

  const pc = pinecone();
  const indexName = process.env.PINECONE_INDEX;
  if (pc && indexName) {
    try {
      const emb = await embedQuery(word);
      if (emb) {
        const idx = namespace ? pc.index(indexName).namespace(namespace) : pc.index(indexName);
        const res = await idx.query({ vector: emb, topK, includeMetadata: true, includeValues: true } as any);
        const items: ContextItem[] = (res.matches || [])
          .filter((m: any) => Array.isArray(m.values))
          .map((m: any) => ({
            id: String(m.id),
            text: String(m.metadata?.text ?? m.metadata?.chunk ?? ""),
            embedding: m.values as number[],
          }));
        if (items.length) return items;
      }
    } catch (err) {
      console.warn("Pinecone context pool fetch failed, using fallback:", err);
    }
  }

  // Fallback — embed the vocab's own example sentences with Cohere if available,
  // otherwise use a tiny random projection so cosine-distance still means something.
  if (fallbackSentences.length) {
    const co = cohere();
    if (co) {
      try {
        const r = await co.embed({
          model: "embed-multilingual-v3.0",
          texts: fallbackSentences,
          input_type: "search_document" as any,
        });
        return (r.embeddings as number[][]).map((e, i) => ({
          id: `fallback-${i}`,
          text: fallbackSentences[i],
          embedding: e,
        }));
      } catch {
        /* fall through */
      }
    }
    // Deterministic hash-based pseudo-embedding, only useful for tests.
    return fallbackSentences.map((s, i) => ({
      id: `hash-${i}`,
      text: s,
      embedding: hashEmbed(s, 32),
    }));
  }
  return [];
}

function hashEmbed(s: string, dim: number): number[] {
  const v = new Array(dim).fill(0);
  for (let i = 0; i < s.length; i++) {
    v[i % dim] += (s.charCodeAt(i) % 17) - 8;
  }
  const norm = Math.sqrt(v.reduce((a, b) => a + b * b, 0)) || 1;
  return v.map(x => x / norm);
}
