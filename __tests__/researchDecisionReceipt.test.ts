import {
  RESEARCH_DECISION_RECEIPT_TTL_MS,
  issueResearchDecisionReceipt,
  verifyResearchDecisionReceipt,
} from "@/lib/researchDecisionReceipt";

describe("research decision receipt signing", () => {
  const oldSalt = process.env.RESEARCH_SALT;

  beforeEach(() => {
    process.env.RESEARCH_SALT = "test-only-research-salt-that-is-at-least-32-characters";
  });

  afterAll(() => {
    if (oldSalt === undefined) delete process.env.RESEARCH_SALT;
    else process.env.RESEARCH_SALT = oldSalt;
  });

  it("issues an opaque signed receipt with a short expiry", () => {
    const before = Date.now();
    const receipt = issueResearchDecisionReceipt();
    expect(receipt.receiptId).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(receipt.token).toContain(".");
    expect(verifyResearchDecisionReceipt(receipt.token)).toBe(receipt.receiptId);
    expect(receipt.expiresAt.getTime()).toBeGreaterThanOrEqual(before + RESEARCH_DECISION_RECEIPT_TTL_MS - 50);
  });

  it("rejects a modified, malformed, or unsigned token", () => {
    const receipt = issueResearchDecisionReceipt();
    expect(verifyResearchDecisionReceipt(`${receipt.token}x`)).toBeNull();
    expect(verifyResearchDecisionReceipt(receipt.receiptId)).toBeNull();
    expect(verifyResearchDecisionReceipt(null)).toBeNull();
  });
});

