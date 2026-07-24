// lib/experimentAssignment.ts
// Deterministic condition assignment for the 8-week ablation (paper Sec 2.4).
// Uses a stable FNV-1a hash on userId so:
//   - the same learner always sees the same scheduler,
//   - the assignment is uniform across the 6 conditions.

import { SchedulerName, SCHEDULER_NAMES } from "./baselines";

const FNV_OFFSET = 0x811c9dc5;
const FNV_PRIME = 0x01000193;

function fnv1a(s: string): number {
  let h = FNV_OFFSET;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, FNV_PRIME);
  }
  return h >>> 0;
}

export interface Assignment {
  userId: string;
  condition: SchedulerName;
  stratum?: string;              // e.g. CEFR band
  createdAt: string;
}

export function assignCondition(userId: string, stratum?: string): Assignment {
  const salt = stratum ? `${stratum}::${userId}` : userId;
  const bucket = fnv1a(salt) % SCHEDULER_NAMES.length;
  return {
    userId,
    condition: SCHEDULER_NAMES[bucket],
    stratum,
    createdAt: new Date().toISOString(),
  };
}
