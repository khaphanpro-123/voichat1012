// lib/experimentBlinding.ts
//
// Blinding utilities for the RCT (Ngày 19 of PLAN_45_DAYS).
//
// The study is participant-blind (single-blind). To make blinding effective:
//   1. Nothing in the wire response ever contains the scheduler name.
//   2. Client code references conditions by opaque token, not "dart"/"sm2"/"hlr".
//   3. LLM-Judge prompts are stripped of arm info before being sent.
//   4. Any diagnostic/debug field that could leak is server-only.
//
// A participant with DevTools open should not be able to tell which arm they
// are in. If they can, that biases retention (people who think they're on the
// "smart" scheduler stay longer) and inflates the treatment effect.
//
// The mapping from real → opaque is deterministic across the study so we can
// invert it in analysis. It is NOT a secret (it's in this file, checked into
// git) — the point is not concealment from an adversary but avoiding
// accidental cues in the DOM, telemetry, and support tickets.

import { SchedulerName } from "./retrievalTasks/session";

/** Opaque labels served to the client. Order fixed for the whole study. */
const OPAQUE_LABELS: Record<SchedulerName, string> = {
  sm2: "A",
  hlr: "B",
  dart: "C",
};

const REVERSE_MAP: Record<string, SchedulerName> = Object.fromEntries(
  Object.entries(OPAQUE_LABELS).map(([k, v]) => [v, k as SchedulerName])
) as Record<string, SchedulerName>;

/** Public → opaque. Never send anything else to the client. */
export function toOpaque(condition: SchedulerName): string {
  return OPAQUE_LABELS[condition];
}

/** Opaque → public. Server-side only, for analytics dashboards. */
export function fromOpaque(label: string): SchedulerName | null {
  return REVERSE_MAP[label] ?? null;
}

/**
 * Sanitise any object shape before serialising to the client. Recursively
 * removes any field whose *value* matches a known scheduler name, and any
 * field whose *key* is one of the known telltale names.
 *
 * Use as a defence-in-depth: even if you forget to strip one field in a route
 * handler, this catches it.
 */
const TELLTALE_KEYS = new Set([
  "condition",
  "scheduler",
  "schedulerName",
  "schedulerVersion",   // includes "dart@1.0.0" → leaks
  "weightsVersion",     // could be inspected by attacker if they see "default" only when NOT dart
  "arm",
  "assignment",
]);

const TELLTALE_VALUES = new Set(["sm2", "hlr", "dart", "karl", "lector", "carts"]);

export function sanitiseForClient<T>(payload: T): T {
  return walk(payload) as T;
}

function walk(node: unknown): unknown {
  if (node === null || typeof node !== "object") {
    if (typeof node === "string" && TELLTALE_VALUES.has(node.toLowerCase())) {
      return "[redacted]";
    }
    return node;
  }
  if (Array.isArray(node)) return node.map(walk);
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
    if (TELLTALE_KEYS.has(k)) continue;              // drop the key entirely
    out[k] = walk(v);
  }
  return out;
}

/**
 * Strip an LLM-Judge prompt of any arm reference. Judges must not know which
 * arm produced the answer they grade — even if the LLM has no memory across
 * calls, references in the prompt itself can bias scoring.
 */
export function sanitiseJudgePrompt(prompt: string): string {
  let out = prompt;
  for (const name of TELLTALE_VALUES) {
    out = out.replace(new RegExp(`\\b${name}\\b`, "gi"), "[system]");
  }
  return out;
}

// ---------------- Verification helper (for tests / Ngày 21 self-test) ----------------

/**
 * Given a JSON response the server intends to send to a participant, return
 * a list of fields that would leak the arm. Empty list = pass.
 */
export function detectLeaks(payload: unknown, path = ""): string[] {
  const leaks: string[] = [];
  if (payload === null || typeof payload !== "object") {
    if (typeof payload === "string" && TELLTALE_VALUES.has(payload.toLowerCase())) {
      leaks.push(`${path} = "${payload}"`);
    }
    return leaks;
  }
  if (Array.isArray(payload)) {
    payload.forEach((v, i) => leaks.push(...detectLeaks(v, `${path}[${i}]`)));
    return leaks;
  }
  for (const [k, v] of Object.entries(payload as Record<string, unknown>)) {
    if (TELLTALE_KEYS.has(k)) leaks.push(`${path}.${k}`);
    leaks.push(...detectLeaks(v, `${path}.${k}`));
  }
  return leaks;
}
