// __tests__/participantAuth.test.ts
// Tests for lib/participantAuth — HMAC token issuance and verification.
//
// These are security-critical paths. Every branch that could let a forged token
// through must have a test.

import {
  issueParticipantToken,
  verifyParticipantToken,
  extractBearerToken,
  verifyRequest,
  TOKEN_TTL_SECS,
} from "@/lib/participantAuth";

// RESEARCH_SALT must be set for the module to work.
const MOCK_SALT = "mock-research-salt-that-is-long-enough-to-be-valid-32chars";
const VALID_CODE = "P0042";

beforeEach(() => {
  process.env.RESEARCH_SALT = MOCK_SALT;
});

afterEach(() => {
  delete process.env.RESEARCH_SALT;
});

// ── issuance ──────────────────────────────────────────────────────────────────
describe("issueParticipantToken", () => {
  it("returns a non-empty string with a dot separator", () => {
    const token = issueParticipantToken(VALID_CODE);
    expect(typeof token).toBe("string");
    expect(token.length).toBeGreaterThan(20);
    // must have exactly one period (payload.sig)
    const parts = token.split(".");
    expect(parts.length).toBe(2);
  });

  it("different calls produce different tokens (different iat)", () => {
    // Issue two tokens 1ms apart — iat is same-second granularity so they may
    // be identical, but they should at minimum be structurally valid.
    const t1 = issueParticipantToken(VALID_CODE);
    const t2 = issueParticipantToken(VALID_CODE);
    // Both should verify
    expect(verifyParticipantToken(t1)).toBe(VALID_CODE);
    expect(verifyParticipantToken(t2)).toBe(VALID_CODE);
  });

  it("throws when RESEARCH_SALT is missing", () => {
    delete process.env.RESEARCH_SALT;
    expect(() => issueParticipantToken(VALID_CODE)).toThrow(/RESEARCH_SALT/);
  });

  it("throws when RESEARCH_SALT is too short", () => {
    process.env.RESEARCH_SALT = "short";
    expect(() => issueParticipantToken(VALID_CODE)).toThrow(/RESEARCH_SALT/);
  });
});

// ── verification — happy path ─────────────────────────────────────────────────
describe("verifyParticipantToken — valid tokens", () => {
  it("returns participantCode for a freshly issued token", () => {
    const token = issueParticipantToken(VALID_CODE);
    expect(verifyParticipantToken(token)).toBe(VALID_CODE);
  });

  it("returns the correct code for different participant codes", () => {
    for (const code of ["P0001", "P0099", "P9999"]) {
      const token = issueParticipantToken(code);
      expect(verifyParticipantToken(token)).toBe(code);
    }
  });
});

// ── verification — rejection ──────────────────────────────────────────────────
describe("verifyParticipantToken — invalid inputs", () => {
  it("returns null for empty string", () => {
    expect(verifyParticipantToken("")).toBeNull();
  });

  it("returns null for null/undefined", () => {
    expect(verifyParticipantToken(null as any)).toBeNull();
    expect(verifyParticipantToken(undefined as any)).toBeNull();
  });

  it("returns null for a token with no dot", () => {
    expect(verifyParticipantToken("nodothere")).toBeNull();
  });

  it("returns null when signature is tampered", () => {
    const token = issueParticipantToken(VALID_CODE);
    const tampered = token.slice(0, -4) + "0000";
    expect(verifyParticipantToken(tampered)).toBeNull();
  });

  it("returns null when payload is tampered (different participant)", () => {
    const token = issueParticipantToken("P0001");
    // Try to swap payload to P0002 — sig won't match
    const [, sig] = token.split(".");
    const forgery = Buffer.from(JSON.stringify({ p: "P0002", iat: Math.floor(Date.now() / 1000) }))
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
    expect(verifyParticipantToken(`${forgery}.${sig}`)).toBeNull();
  });

  it("returns null when token is expired", () => {
    const token = issueParticipantToken(VALID_CODE);
    // Decode payload, rewrite iat to be TTL+1 seconds in the past, re-sign
    const [payloadB64, _sig] = token.split(".");
    const payload = JSON.parse(Buffer.from(payloadB64, "base64").toString("utf-8"));
    payload.iat = Math.floor(Date.now() / 1000) - TOKEN_TTL_SECS - 1;
    const newPayload = Buffer.from(JSON.stringify(payload))
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
    // Re-sign with valid secret so signature check passes but TTL fails
    const { createHmac } = require("crypto");
    const newSig = createHmac("sha256", MOCK_SALT).update(newPayload).digest("hex");
    expect(verifyParticipantToken(`${newPayload}.${newSig}`)).toBeNull();
  });

  it("returns null when RESEARCH_SALT is missing (can't verify)", () => {
    const token = issueParticipantToken(VALID_CODE);
    delete process.env.RESEARCH_SALT;
    expect(verifyParticipantToken(token)).toBeNull();
  });

  it("returns null for a garbage base64 payload", () => {
    expect(verifyParticipantToken("!!!notbase64.00000000")).toBeNull();
  });

  it("returns null for a future-dated token (iat > now)", () => {
    const token = issueParticipantToken(VALID_CODE);
    const [payloadB64, _] = token.split(".");
    const payload = JSON.parse(Buffer.from(payloadB64, "base64").toString("utf-8"));
    payload.iat = Math.floor(Date.now() / 1000) + 9999; // far future
    const newPayload = Buffer.from(JSON.stringify(payload))
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
    const { createHmac } = require("crypto");
    const newSig = createHmac("sha256", MOCK_SALT).update(newPayload).digest("hex");
    expect(verifyParticipantToken(`${newPayload}.${newSig}`)).toBeNull();
  });
});

// ── extractBearerToken ────────────────────────────────────────────────────────
describe("extractBearerToken", () => {
  it("extracts token from standard header", () => {
    expect(extractBearerToken("Bearer abc123")).toBe("abc123");
  });

  it("is case-insensitive on 'Bearer'", () => {
    expect(extractBearerToken("bearer abc123")).toBe("abc123");
    expect(extractBearerToken("BEARER abc123")).toBe("abc123");
  });

  it("returns null for null header", () => {
    expect(extractBearerToken(null)).toBeNull();
  });

  it("returns null for non-Bearer auth header", () => {
    expect(extractBearerToken("Basic dXNlcjpwYXNz")).toBeNull();
  });

  it("returns null for empty Bearer", () => {
    expect(extractBearerToken("Bearer ")).toBeNull();
  });
});

// ── verifyRequest (end-to-end) ────────────────────────────────────────────────
describe("verifyRequest", () => {
  it("verifies a full Authorization header round-trip", () => {
    const token = issueParticipantToken(VALID_CODE);
    const header = `Bearer ${token}`;
    expect(verifyRequest(header)).toBe(VALID_CODE);
  });

  it("returns null for missing header", () => {
    expect(verifyRequest(null)).toBeNull();
  });

  it("returns null for tampered token in header", () => {
    const token = issueParticipantToken(VALID_CODE);
    const tampered = `Bearer ${token.slice(0, -3)}XXX`;
    expect(verifyRequest(tampered)).toBeNull();
  });
});
