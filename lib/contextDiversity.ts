// lib/contextDiversity.ts
// Implements Step 4 of Algorithm 4 (CARTS Inference) in x.pdf:
//   - Compute mean embedding of previously seen contexts.
//   - Filter pool by minimum cosine-distance to the mean (δ_min).
//   - Pick c* = argmax_c min_{c_i∈τ} (1 - cos(e_c, e_{c_i})).
// This is model-free — usable even before CARTS/PPO training is available.

export type Embedding = number[];

export interface ContextItem {
  id: string;
  text?: string;
  embedding: Embedding;
}

export function cosineSim(a: Embedding, b: Embedding): number {
  let dot = 0, na = 0, nb = 0;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom === 0 ? 0 : dot / denom;
}

export const cosineDist = (a: Embedding, b: Embedding) => 1 - cosineSim(a, b);

export function meanEmbedding(embs: Embedding[]): Embedding {
  if (!embs.length) return [];
  const D = embs[0].length;
  const mean = new Array(D).fill(0);
  for (const e of embs) for (let i = 0; i < D; i++) mean[i] += e[i];
  for (let i = 0; i < D; i++) mean[i] /= embs.length;
  return mean;
}

export interface DiversityChoice {
  chosen: ContextItem;
  score: number;             // min cosine-distance to seen set
  fallbackUsed: boolean;     // true if Cvalid was empty
}

/**
 * Alg 4 Step 4. `seen` may be empty (first review) — in that case any pool item
 * satisfies the constraint, so we pick the one farthest from itself trivially.
 */
export function pickDiverseContext(
  pool: ContextItem[],
  seen: ContextItem[],
  deltaMin = 0.2
): DiversityChoice | null {
  if (!pool.length) return null;

  const seenEmbs = seen.map(s => s.embedding);
  const seenMean = seenEmbs.length ? meanEmbedding(seenEmbs) : null;

  // Cvalid = { c ∈ C | 1 - cos(e_c, ē_τ) ≥ δ_min }
  const valid = seenMean
    ? pool.filter(c => cosineDist(c.embedding, seenMean) >= deltaMin)
    : pool.slice();

  const candidates = valid.length ? valid : pool;
  const fallbackUsed = valid.length === 0 && seenEmbs.length > 0;

  // c* = argmax_c min_{c_i∈τ} (1 - cos(e_c, e_{c_i}))
  let best = candidates[0];
  let bestScore = -Infinity;
  for (const c of candidates) {
    let minDist = Infinity;
    if (seenEmbs.length === 0) {
      minDist = 1; // no constraint yet
    } else {
      for (const s of seenEmbs) {
        const d = cosineDist(c.embedding, s);
        if (d < minDist) minDist = d;
      }
    }
    if (minDist > bestScore) { bestScore = minDist; best = c; }
  }
  return { chosen: best, score: bestScore, fallbackUsed };
}
