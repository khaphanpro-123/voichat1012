// lib/baselines/index.ts
// Registry for all schedulers referenced by the paper (Sec 2.3 baselines + our
// two contributions). Used by the ablation endpoint to dispatch by name.

import { calculateNextReview } from "../spacedRepetition";
import { calculateNextReviewHlr } from "./hlr";
import { karlNext } from "./karl";
import { lectorSchedule } from "./lector";
import { calculateNextReviewDart } from "../spacedRepetition";

export type SchedulerName = "sm2" | "hlr" | "karl" | "lector" | "dart" | "carts";

export const SCHEDULER_NAMES: SchedulerName[] = ["sm2", "hlr", "karl", "lector", "dart", "carts"];

export const SchedulerRegistry = {
  sm2: calculateNextReview,
  hlr: calculateNextReviewHlr,
  karl: karlNext,
  lector: lectorSchedule,
  dart: calculateNextReviewDart,
  // 'carts' is served through /api/carts/schedule because it needs context pool + LLM.
};
