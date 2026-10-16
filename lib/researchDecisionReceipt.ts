import { createHmac, randomBytes, timingSafeEqual } from "crypto";

/** Receipts are intentionally short-lived; offline retries reuse the same one. */
export const RESEARCH_DECISION_RECEIPT_TTL_MS = 20 * 60 * 1000;

function secret(): string {
  const value = process.env.RESEARCH_SALT;
  if (!value || value.length < 32) {
    throw new Error("RESEARCH_SALT must be set (≥32 chars) before issuing research decision receipts");
  }
  return value;
}

function signature(receiptId: string, signingSecret: string): Buffer {
  return createHmac("sha256", signingSecret).update(`research-decision:${receiptId}`).digest();
}

/** A signed opaque wire token. The receipt facts themselves remain server-side. */
export function issueResearchDecisionReceipt(): { receiptId: string; token: string; expiresAt: Date } {
  const receiptId = randomBytes(24).toString("base64url");
  const sig = signature(receiptId, secret()).toString("base64url");
  return {
    receiptId,
    token: `${receiptId}.${sig}`,
    expiresAt: new Date(Date.now() + RESEARCH_DECISION_RECEIPT_TTL_MS),
  };
}

/** Returns the receipt id only when the opaque token has a valid HMAC. */
export function verifyResearchDecisionReceipt(token: unknown): string | null {
  if (typeof token !== "string") return null;
  const splitAt = token.lastIndexOf(".");
  if (splitAt <= 0 || splitAt === token.length - 1) return null;
  const receiptId = token.slice(0, splitAt);
  const supplied = token.slice(splitAt + 1);
  let expected: Buffer;
  let actual: Buffer;
  try {
    expected = signature(receiptId, secret());
    actual = Buffer.from(supplied, "base64url");
  } catch {
    return null;
  }
  if (actual.length !== expected.length) return null;
  return timingSafeEqual(actual, expected) ? receiptId : null;
}

