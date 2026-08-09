// lib/aiBudget.ts
//
// Daily LLM cost cap + alert (Ngày 12 / D-013). Backing store: MongoDB
// (app/models/AIBudgetDaily.ts). Cost estimates use published $/1M-token
// prices — approximate, tuned for order-of-magnitude budget guarding, not
// billing reconciliation.
//
// Env:
//   AI_DAILY_BUDGET_USD  — cap in USD (default 5)
//   AI_BUDGET_ALERT_PCT  — warn when this % of cap reached (default 80)
//
// Usage:
//   const r = await chargeAI({ provider: "openai", model: "gpt-4o-mini", tokensIn: 800, tokensOut: 200 });
//   if (!r.allowed) throw new BudgetExceededError(r);

import type { Model } from "mongoose";
import DefaultBudget, { type IAIBudgetDaily } from "@/app/models/AIBudgetDaily";

// ─── Price table (USD per 1M tokens, approx early-2026) ───────────────────────
type Price = { in: number; out: number };
const PRICES: Record<string, Record<string, Price>> = {
  openai: {
    "gpt-4o-mini":     { in: 0.15,  out: 0.60 },
    "gpt-4o":          { in: 2.50,  out: 10.00 },
    "gpt-3.5-turbo":   { in: 0.50,  out: 1.50 },
  },
  groq: {
    // Groq's free tier — treat as $0 for budgeting
    "llama-3.3-70b-versatile": { in: 0.0, out: 0.0 },
    "llama-3.1-8b-instant":    { in: 0.0, out: 0.0 },
    "mixtral-8x7b-32768":      { in: 0.0, out: 0.0 },
  },
  cohere: {
    "command-r-plus-08-2024": { in: 2.50, out: 10.00 },
    "command-r-08-2024":      { in: 0.15, out: 0.60 },
    "command-light":          { in: 0.30, out: 0.60 },
  },
};

const UNKNOWN_PRICE: Price = { in: 1.0, out: 3.0 };  // conservative fallback

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ChargeInput {
  provider: "openai" | "groq" | "cohere";
  model: string;
  tokensIn: number;
  tokensOut: number;
}

export interface ChargeResult {
  allowed: boolean;
  chargedUsd: number;
  totalUsd: number;
  capUsd: number;
  alertLevel: "ok" | "warn" | "exceeded";
  dateKey: string;
}

export interface BudgetDeps {
  model?: Model<IAIBudgetDaily>;
  capUsd?: number;
  alertPct?: number;
  now?: () => Date;
}

export class BudgetExceededError extends Error {
  constructor(public info: ChargeResult) {
    super(`AI daily budget exceeded: $${info.totalUsd.toFixed(4)} / $${info.capUsd.toFixed(2)}`);
    this.name = "BudgetExceededError";
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function dateKeyUTC(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function estimateCostUsd(provider: string, model: string, tokensIn: number, tokensOut: number): number {
  const p = PRICES[provider]?.[model] ?? UNKNOWN_PRICE;
  return (tokensIn / 1e6) * p.in + (tokensOut / 1e6) * p.out;
}

function resolveDeps(deps?: BudgetDeps): Required<BudgetDeps> {
  return {
    model: (deps?.model ?? DefaultBudget) as Model<IAIBudgetDaily>,
    capUsd: deps?.capUsd ?? Number(process.env.AI_DAILY_BUDGET_USD ?? 5),
    alertPct: deps?.alertPct ?? Number(process.env.AI_BUDGET_ALERT_PCT ?? 80),
    now: deps?.now ?? (() => new Date()),
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Pre-check cap without charging. Used by wrappers that want to abort BEFORE
 * spending, so we don't charge for a call that would push us over.
 */
export async function currentSpend(deps?: BudgetDeps): Promise<{ totalUsd: number; capUsd: number; dateKey: string }> {
  const { model, capUsd, now } = resolveDeps(deps);
  const dateKey = dateKeyUTC(now());
  const doc = await model.findOne({ dateKey }).lean<IAIBudgetDaily>();
  return { totalUsd: doc?.totalUsd ?? 0, capUsd, dateKey };
}

/**
 * Record a charge and return whether the account is still under cap.
 * If the pre-charge total is already over cap, we do NOT charge and return
 * allowed=false so the caller can skip the LLM call.
 */
export async function chargeAI(input: ChargeInput, deps?: BudgetDeps): Promise<ChargeResult> {
  const { model, capUsd, alertPct, now } = resolveDeps(deps);
  const dateKey = dateKeyUTC(now());
  const costUsd = estimateCostUsd(input.provider, input.model, input.tokensIn, input.tokensOut);

  // Read current total first
  const before = await model.findOne({ dateKey }).lean<IAIBudgetDaily>();
  const beforeTotal = before?.totalUsd ?? 0;

  if (beforeTotal >= capUsd) {
    return {
      allowed: false,
      chargedUsd: 0,
      totalUsd: beforeTotal,
      capUsd,
      alertLevel: "exceeded",
      dateKey,
    };
  }

  // Atomically increment
  const providerKey = `byProvider.${input.provider}`;
  const upd = await model.findOneAndUpdate(
    { dateKey },
    {
      $inc: { totalUsd: costUsd, callCount: 1, [providerKey]: costUsd },
      $set: { updatedAt: now() },
      $setOnInsert: { dateKey, byProvider: {} },
    },
    { upsert: true, new: true },
  ).lean<IAIBudgetDaily>();

  const totalUsd = upd?.totalUsd ?? costUsd;
  const alertLevel: ChargeResult["alertLevel"] =
    totalUsd >= capUsd ? "exceeded" :
    totalUsd >= (capUsd * alertPct) / 100 ? "warn" : "ok";

  return { allowed: true, chargedUsd: costUsd, totalUsd, capUsd, alertLevel, dateKey };
}
