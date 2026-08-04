// lib/participantAuth.ts
// HMAC-signed participant tokens for research endpoints (Ngày 22 — Risk 4 fix).
//
// Replaces the x-participant-code header (trivially enumerable P0001–P9999) with
// a short-lived signed token issued at enrolment. An attacker who guesses a code
// still cannot forge a valid token without the RESEARCH_SALT secret.
//
// Format: base64url(payload) "." hex(HMAC-SHA256(secret, base64url(payload)))
// where payload = JSON { p: participantCode, iat: unixSeconds }
//
// Secret: RESEARCH_SALT env var (≥32 chars). Same salt as userId hashing.
// TTL:    70 days (8-week study + 2-week posttest buffer).
//
// NOT a full JWT library — intentionally zero new dependencies.

import { createHmac } from "crypto";

// 70 days: covers 8-week study + 2-week delayed posttest + small buffer.
export const TOKEN_TTL_SECS = 70 * 24 * 60 * 60;

function getSecret(): string {
  const s = process.env.RESEARCH_SALT;
  if (!s || s.length < 32) {
    throw new Error(
      "RESEARCH_SALT must be set (≥32 chars) before issuing participant tokens. " +
        "Add it to .env.research and restart."
    );
  }
  return s;
}

function b64url(str: string): string {
  return Buffer.from(str)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function sign(payloadB64: string, secret: string): string {
  return createHmac("sha256", secret).update(payloadB64).digest("hex");
}

/**
 * Issue a signed participant token. Called once per participant at enrolment.
 * The client stores it (e.g. localStorage) and sends it as "Authorization: Bearer <token>".
 */
export function issueParticipantToken(participantCode: string): string {
  const payload = b64url(
    JSON.stringify({ p: participantCode, iat: Math.floor(Date.now() / 1000) })
  );
  const sig = sign(payload, getSecret());
  return `${payload}.${sig}`;
}

/**
 * Verify a token. Returns the participantCode on success, null on any failure.
 * Constant-time comparison on the HMAC bytes to resist timing attacks.
 */
export function verifyParticipantToken(token: string): string | null {
  if (!token || typeof token !== "string") return null;

  const dotIdx = token.lastIndexOf(".");
  if (dotIdx <= 0) return null;
  const payloadB64 = token.slice(0, dotIdx);
  const receivedSig = token.slice(dotIdx + 1);

  // Parse payload
  let payload: { p?: unknown; iat?: unknown };
  try {
    payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf-8"));
  } catch {
    // base64url might not be available in older Node — fall back
    try {
      payload = JSON.parse(
        Buffer.from(payloadB64.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf-8")
      );
    } catch {
      return null;
    }
  }

  if (typeof payload.p !== "string" || !payload.p) return null;
  if (typeof payload.iat !== "number") return null;

  // TTL
  const age = Math.floor(Date.now() / 1000) - payload.iat;
  if (age < 0 || age > TOKEN_TTL_SECS) return null;

  // Signature: constant-time char comparison
  let secret: string;
  try {
    secret = getSecret();
  } catch {
    return null; // RESEARCH_SALT not configured
  }
  const expectedSig = sign(payloadB64, secret);

  if (receivedSig.length !== expectedSig.length) return null;
  let diff = 0;
  for (let i = 0; i < expectedSig.length; i++) {
    diff |= receivedSig.charCodeAt(i) ^ expectedSig.charCodeAt(i);
  }
  if (diff !== 0) return null;

  return payload.p;
}

/**
 * Extract the raw token from an "Authorization: Bearer <token>" header value.
 */
export function extractBearerToken(authHeader: string | null): string | null {
  if (!authHeader) return null;
  const m = authHeader.match(/^Bearer\s+(\S+)$/i);
  return m ? m[1] : null;
}

/**
 * Convenience: parse Authorization header from a Request and verify in one call.
 * Returns participantCode or null.
 */
export function verifyRequest(authHeader: string | null): string | null {
  return verifyParticipantToken(extractBearerToken(authHeader) ?? "");
}
