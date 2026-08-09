// lib/wordBankSelector.ts
// Cold-start selector for the production vocabulary flow.
//
// Policy (see research/WORDBANK_TWO_TIER_DESIGN.md):
//
//   If today's review queue has ≥ MIN_QUEUE due cards → review only, do not seed new.
//   Else if user has fewer than N_MIN personal words → 100% new from pool.
//   Else → 80% new from personal, 20% from pool.
//
// NOT used by the research condition. Production only.

import { POOL, PoolWord, Cefr, poolByBand } from "./defaultWordBankPool";

export const N_MIN = 30;
export const MIN_QUEUE = 8;
export const POOL_RATIO_AFTER = 0.2;

export type WordBankMode = "cold-start" | "personalized";

export interface PersonalWord {
  id: string;
  word: string;
  band: Cefr;
  /** whatever your pipeline emits — treated opaquely */
  source: "document" | "chat" | "manual";
}

export interface SelectorInput {
  /** Words already known by the user (from prior pipeline extraction). */
  personalCount: number;
  /** Words due today from the SRS scheduler. */
  reviewQueueSize: number;
  /** Number of new cards the user wants to add today. */
  newCardsTarget: number;
  /** User's preferred band; falls back to B1 if unknown. */
  preferredBand?: Cefr;
  /** Deterministic seed (userId hash + date) for reproducibility. */
  seed: number;
  /** Personal word candidates (if any). */
  personalCandidates?: PersonalWord[];
  /** Words the user already has cards for — these must be excluded from new selection. */
  alreadyStudied: Set<string>;
}

export interface SelectorOutput {
  mode: WordBankMode;
  fromPool: PoolWord[];
  fromPersonal: PersonalWord[];
  reasoning: string;
}

/**
 * Decide whether the user is in cold-start or personalized mode based on
 * how many personal words they have accumulated.
 */
export function computeMode(personalCount: number): WordBankMode {
  return personalCount >= N_MIN ? "personalized" : "cold-start";
}

/**
 * Main entry point: return the set of words to serve to the user today,
 * split between the shared pool and the user's personal collection.
 */
export function selectWords(input: SelectorInput): SelectorOutput {
  const {
    personalCount,
    reviewQueueSize,
    newCardsTarget,
    preferredBand = "B1",
    seed,
    personalCandidates = [],
    alreadyStudied,
  } = input;

  const mode = computeMode(personalCount);

  // Rule 1: if the review queue is already full enough, skip introducing new words.
  if (reviewQueueSize >= MIN_QUEUE) {
    return {
      mode,
      fromPool: [],
      fromPersonal: [],
      reasoning: `Review queue has ${reviewQueueSize} due cards (≥ ${MIN_QUEUE}) — no new words added today.`,
    };
  }

  if (newCardsTarget <= 0) {
    return { mode, fromPool: [], fromPersonal: [], reasoning: "newCardsTarget is 0." };
  }

  // Rule 2: cold-start users get 100% pool words.
  if (mode === "cold-start") {
    const pool = pickPoolWords(newCardsTarget, preferredBand, seed, alreadyStudied);
    return {
      mode,
      fromPool: pool,
      fromPersonal: [],
      reasoning: `Cold-start (${personalCount} < ${N_MIN} personal words): pulled ${pool.length} words from the shared pool.`,
    };
  }

  // Rule 3: personalized users get 80% personal, 20% pool.
  const poolCount = Math.max(1, Math.round(newCardsTarget * POOL_RATIO_AFTER));
  const personalCountNeeded = newCardsTarget - poolCount;

  const personal = pickPersonalWords(personalCandidates, personalCountNeeded, alreadyStudied, seed);
  const pool = pickPoolWords(poolCount, preferredBand, seed + 1, alreadyStudied);

  return {
    mode,
    fromPool: pool,
    fromPersonal: personal,
    reasoning: `Personalized (${personalCount} ≥ ${N_MIN} personal): ${personal.length} personal + ${pool.length} pool (${Math.round(POOL_RATIO_AFTER * 100)}% pool anchor).`,
  };
}

function pickPoolWords(
  n: number,
  band: Cefr,
  seed: number,
  exclude: Set<string>,
): PoolWord[] {
  const candidates = poolByBand(band).filter((w) => !exclude.has(w.word.toLowerCase()));

  // Bias: prefer higher `commonness` first, then random within tie.
  const rng = seededRng(seed);
  const scored = candidates.map((w) => ({
    w,
    score: w.commonness + rng() * 0.5, // small random tie-breaker
  }));
  scored.sort((a, b) => b.score - a.score);

  return scored.slice(0, n).map((s) => s.w);
}

function pickPersonalWords(
  candidates: PersonalWord[],
  n: number,
  exclude: Set<string>,
  seed: number,
): PersonalWord[] {
  const filtered = candidates.filter((w) => !exclude.has(w.word.toLowerCase()));
  const rng = seededRng(seed);
  const shuffled = [...filtered];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, n);
}

function seededRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Convenience: derive a deterministic seed from a userId string + date.
 * Same user + same day → same seed → reproducible session composition.
 */
export function seedFromUserAndDate(userId: string, dateISO: string): number {
  let h = 5381;
  const s = `${userId}::${dateISO}`;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  }
  return h >>> 0;
}
