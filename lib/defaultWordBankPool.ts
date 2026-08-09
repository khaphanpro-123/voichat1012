// lib/defaultWordBankPool.ts
// Extended cold-start wordbank pool. Loaded from data/wordbank_pool_seed.json.
//
// SCOPE:  Production only. NOT used by the research condition (DART/HLR/SM-2 arms
//         use the frozen 60-word bank in lib/wordBank.ts). Do not import this file
//         from research/* or from app/api/research/*.
//
// See research/WORDBANK_TWO_TIER_DESIGN.md for the full design rationale.

import poolData from "@/data/wordbank_pool_seed.json";

export type Cefr = "B1" | "B2";
export type Pos = "n" | "v" | "adj" | "adv";

export interface PoolWord {
  word: string;
  band: Cefr;
  pos: Pos;
  definition: string;
  viDefinition: string;
  /** 1 (rare) – 5 (very common). Used by the selector to bias toward higher-frequency words first. */
  commonness: number;
}

interface PoolFile {
  version: string;
  generated: string;
  source: string;
  license?: string;
  words: PoolWord[];
}

const RAW: PoolFile = poolData as PoolFile;

// Freeze the pool at import time so callers cannot mutate it accidentally.
export const POOL: readonly PoolWord[] = Object.freeze(RAW.words.map((w) => Object.freeze({ ...w })));

export const POOL_VERSION = RAW.version;
export const POOL_SOURCE = RAW.source;

/** Return all pool words matching a CEFR band. */
export function poolByBand(band: Cefr): readonly PoolWord[] {
  return POOL.filter((w) => w.band === band);
}

/** Return pool words matching a part of speech. */
export function poolByPos(pos: Pos): readonly PoolWord[] {
  return POOL.filter((w) => w.pos === pos);
}

/**
 * Generate 3 plausible distractor definitions for a target word by drawing from
 * other words of the same POS. Deterministic given `seed`.
 *
 * NOTE: This produces MCQ distractors adequate for a cold-start UX but noticeably
 * weaker than the hand-crafted distractors in lib/wordBank.ts. Do NOT use for the
 * research posttest.
 */
export function generateDistractors(
  targetWord: string,
  pos: Pos,
  seed: number,
): [string, string, string] {
  const same = POOL.filter((w) => w.pos === pos && w.word !== targetWord);
  if (same.length < 3) {
    // Fallback: mix POS if the target POS has < 3 other entries.
    const any = POOL.filter((w) => w.word !== targetWord);
    return pickThreeDefs(any, seed);
  }
  return pickThreeDefs(same, seed);
}

function pickThreeDefs(pool: readonly PoolWord[], seed: number): [string, string, string] {
  const rng = mulberry32(seed);
  const shuffled = [...pool];
  // Fisher-Yates with the seeded RNG.
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return [shuffled[0].definition, shuffled[1].definition, shuffled[2].definition];
}

/** Deterministic seeded PRNG (Bernstein / mulberry32). */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Small structured summary for debug endpoints / admin dashboards. */
export function poolSummary() {
  const bandCount: Record<Cefr, number> = { B1: 0, B2: 0 };
  const posCount: Record<Pos, number> = { n: 0, v: 0, adj: 0, adv: 0 };
  for (const w of POOL) {
    bandCount[w.band]++;
    posCount[w.pos]++;
  }
  return {
    version: POOL_VERSION,
    source: POOL_SOURCE,
    total: POOL.length,
    byBand: bandCount,
    byPos: posCount,
  };
}
