// __tests__/researchReviewRoute.test.ts
//
// Tests for POST /api/research/review — the research-grade write path built
// for Ngày 8 of PLAN_45_DAYS.md.
//
// The acceptance criterion from the plan is:
//
//     "Xong khi: curl 3 lần cùng clientEventId → đúng 1 dòng trong reviewlogs."
//
// This file locks that in as an automated check so a future refactor can't
// silently regress idempotency. It also covers auth, validation, version stamp
// echo, and the dropout guard.
//
// Everything is mocked at the module boundary (Mongo, auth, version stamps).
// The point is to test the route's own logic, not Mongoose.

// ---- Mocks (must be defined BEFORE importing the route) ----

// In-memory reviewlogs store the mocked ReviewLog writes to. Reset per test.
const reviewLogs: any[] = [];
const consumedReceipts = new Set<string>();

jest.mock("@/lib/db", () => ({
  connectDB: jest.fn(async () => ({
    startSession: async () => ({
      withTransaction: async (work: any) => work(),
      endSession: async () => {},
    }),
  })),
}));

jest.mock("@/lib/participantAuth", () => ({
  verifyRequest: jest.fn((header: string | null) => {
    if (header === "Bearer VALID") return "P0042";
    if (header === "Bearer SM2") return "P0043";
    if (header === "Bearer DROPPED") return "P0099";
    return null;
  }),
}));

jest.mock("@/lib/researchVersion", () => ({
  hashPrompt: (s: string) => `h(${s.length})`,
  getWeightsVersion: () => "default",
}));

jest.mock("@/lib/researchDecisionReceipt", () => ({
  verifyResearchDecisionReceipt: (token: string) => token.startsWith("receipt-") ? token : null,
}));

jest.mock("@/app/models/ResearchDecisionReceipt", () => {
  const chain = (val: any) => ({
    select: () => chain(val),
    session: () => chain(val),
    lean: async () => val,
  });
  const record = (receiptId: string) => ({
    _id: receiptId,
    receiptId,
    participantCode: receiptId === "receipt-sm2" ? "P0043" : "P0042",
    vocabularyId: "v1",
    word: "ubiquitous",
    condition: receiptId === "receipt-sm2" ? "sm2" : "dart",
    retrievalType: receiptId === "receipt-sm2" ? 0 : 1,
    featureVector: [0.1, 0.2, 0.3],
    schedulerVersion: "dart@test",
    weightsVersion: "default",
    taskPromptHash: "h(16)",
    expectedAnswer: "correct choice",
    issuedAt: new Date("2026-08-11T08:00:00Z"),
    expiresAt: new Date("2099-01-01T00:00:00Z"),
  });
  return {
    __esModule: true,
    default: {
      findOne: jest.fn((filter: any) => chain(consumedReceipts.has(filter.receiptId) ? null : record(filter.receiptId))),
      findOneAndUpdate: jest.fn((filter: any) => {
        if (consumedReceipts.has(filter._id)) return chain(null);
        consumedReceipts.add(filter._id);
        return chain(record(filter._id));
      }),
    },
  };
});

jest.mock("@/app/models/ReviewLog", () => {
  // Chainable Mongoose-ish query so `.sort().select().lean()` works.
  const chain = (val: any) => ({
    sort: () => chain(val),
    select: () => chain(val),
    session: () => chain(val),
    lean: async () => val,
  });
  return {
    __esModule: true,
    default: {
      findOne: jest.fn((filter: any) => {
        // Idempotency lookup on clientEventId
        if (filter.clientEventId) {
          const existing = reviewLogs.find((r) => r.clientEventId === filter.clientEventId);
          return chain(existing ?? null);
        }
        // Previous-review lookup for serverDeltaDays
        const prev = reviewLogs
          .filter(
            (r) =>
              r.userId === filter.userId &&
              r.vocabularyId === filter.vocabularyId &&
              r.condition === filter.condition,
          )
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
        return chain(prev ?? null);
      }),
      create: jest.fn(async (docs: any[]) => {
        const row = { ...docs[0], _id: `id_${reviewLogs.length + 1}`, createdAt: new Date() };
        reviewLogs.push(row);
        return [row];
      }),
    },
  };
});

jest.mock("@/app/models/Participant", () => {
  const chain = (val: any) => ({ lean: async () => val });
  return {
    __esModule: true,
    default: {
      findOne: jest.fn((filter: any) => {
        if (filter.participantCode === "P0042") {
          return chain({ participantCode: "P0042", condition: "dart", dropoutAt: null });
        }
        if (filter.participantCode === "P0043") {
          return chain({ participantCode: "P0043", condition: "sm2", dropoutAt: null });
        }
        if (filter.participantCode === "P0099") {
          return chain({
            participantCode: "P0099",
            condition: "dart",
            dropoutAt: new Date("2026-08-01"),
          });
        }
        return chain(null);
      }),
      updateOne: jest.fn(async () => ({})),
    },
  };
});

jest.mock("@/app/models/ResearchSm2State", () => {
  const chain = (val: any) => ({ session: () => chain(val), lean: async () => val });
  return {
    __esModule: true,
    default: {
      findOne: jest.fn(() => chain(null)),
      findOneAndUpdate: jest.fn(() => chain({ _id: "sm2" })),
      create: jest.fn(async () => []),
    },
  };
});

jest.mock("@/app/models/ResearchTimingState", () => {
  const chain = (val: any) => ({ session: () => chain(val), lean: async () => val });
  return {
    __esModule: true,
    default: {
      findOne: jest.fn(() => chain(null)),
      findOneAndUpdate: jest.fn(() => chain({ _id: "timing" })),
      create: jest.fn(async () => []),
    },
  };
});

import { POST } from "@/app/api/research/review/route";
import ResearchSm2State from "@/app/models/ResearchSm2State";

function makeReq(body: any, authorization?: string): any {
  return {
    json: async () => body,
    headers: {
      get: (k: string) =>
        k.toLowerCase() === "authorization" ? authorization ?? null : null,
    },
  };
}

function goodBody(overrides: Partial<any> = {}): any {
  const body = {
    clientEventId: "evt-1",
    sessionId: "s1",
    vocabularyId: "v1",
    word: "ubiquitous",
    retrievalType: 1,
    featureVector: [0.1, 0.2, 0.3],
    taskPrompt: "The word is ___.",
    scheduledAt: "2026-08-11T08:00:00Z",
    servedAt: "2026-08-11T08:00:01Z",
    elapsedMs: 4200,
    recall: 1,
    responseTimeMs: 3800,
    quality: 4,
    answerText: "correct choice",
    ...overrides,
  };
  return { ...body, decisionReceipt: overrides.decisionReceipt ?? `receipt-${body.clientEventId}` };
}

describe("POST /api/research/review", () => {
  beforeEach(() => {
    reviewLogs.length = 0;
    consumedReceipts.clear();
    (ResearchSm2State.create as jest.Mock).mockClear();
  });

  it("401 with no Authorization header", async () => {
    const res = await POST(makeReq(goodBody()));
    expect(res.status).toBe(401);
    expect(reviewLogs).toHaveLength(0);
  });

  it("401 with invalid token", async () => {
    const res = await POST(makeReq(goodBody(), "Bearer BOGUS"));
    expect(res.status).toBe(401);
  });

  it("400 when a required field is missing", async () => {
    const body = goodBody();
    delete body.sessionId;
    const res = await POST(makeReq(body, "Bearer VALID"));
    expect(res.status).toBe(400);
    const j = await res.json();
    expect(j.message).toMatch(/sessionId/);
  });

  it("rejects a missing or forged decision receipt", async () => {
    const missing = goodBody();
    delete missing.decisionReceipt;
    expect((await POST(makeReq(missing, "Bearer VALID"))).status).toBe(400);
    expect((await POST(makeReq(goodBody({ decisionReceipt: "forged" }), "Bearer VALID"))).status).toBe(400);
  });

  it("400 when the required SM-2 self-rating is missing or invalid", async () => {
    const missing = goodBody();
    delete missing.quality;
    expect((await POST(makeReq(missing, "Bearer VALID"))).status).toBe(400);
    expect((await POST(makeReq(goodBody({ quality: 6 }), "Bearer VALID"))).status).toBe(400);
    expect((await POST(makeReq(goodBody({ quality: 2.5 }), "Bearer VALID"))).status).toBe(400);
  });

  it("403 when participant has withdrawn (dropoutAt set)", async () => {
    const res = await POST(makeReq(goodBody(), "Bearer DROPPED"));
    expect(res.status).toBe(403);
    const j = await res.json();
    expect(j.message).toMatch(/withdrawn/i);
    expect(reviewLogs).toHaveLength(0);
  });

  it("acceptance criterion Ngày 8: 3 POSTs same clientEventId → exactly 1 ReviewLog row", async () => {
    const body = goodBody({ clientEventId: "evt-idemp-1" });

    const r1 = await POST(makeReq(body, "Bearer VALID"));
    const r2 = await POST(makeReq(body, "Bearer VALID"));
    const r3 = await POST(makeReq(body, "Bearer VALID"));

    expect(r1.status).toBe(200);
    expect(r2.status).toBe(200);
    expect(r3.status).toBe(200);

    const j2 = await r2.json();
    const j3 = await r3.json();
    expect(j2.deduplicated).toBe(true);
    expect(j3.deduplicated).toBe(true);

    // Only ONE row in the store — the plan's acceptance criterion.
    expect(reviewLogs).toHaveLength(1);
    expect(reviewLogs[0].clientEventId).toBe("evt-idemp-1");
  });

  it("uses receipt provenance rather than client scheduler fields", async () => {
    const res = await POST(makeReq(goodBody({
      clientEventId: "evt-stamp", vocabularyId: "forged", word: "forged",
      retrievalType: 3, featureVector: [99], servedWeightsVersion: "nope",
    }), "Bearer VALID"));
    expect(res.status).toBe(200);
    expect(reviewLogs).toHaveLength(1);
    expect(reviewLogs[0].schedulerVersion).toBe("dart@test");
    expect(reviewLogs[0].weightsVersion).toBe("default");
    expect(reviewLogs[0]).toMatchObject({ vocabularyId: "v1", word: "ubiquitous", retrievalType: 1, featureVector: [0.1, 0.2, 0.3], condition: "dart" });
  });

  it("derives recall on the server instead of trusting a client-provided value", async () => {
    const res = await POST(makeReq(goodBody({ clientEventId: "evt-server-score", recall: 0, answerText: "correct choice" }), "Bearer VALID"));
    expect(res.status).toBe(200);
    expect(reviewLogs[0].recall).toBe(1);
  });

  it("commits a first SM-2 state with the receipt and log write", async () => {
    const res = await POST(makeReq(goodBody({
      clientEventId: "evt-sm2", decisionReceipt: "receipt-sm2", answerText: "correct choice",
    }), "Bearer SM2"));
    expect(res.status).toBe(200);
    expect(ResearchSm2State.create).toHaveBeenCalledWith(
      [expect.objectContaining({ participantCode: "P0043", vocabularyId: "v1", lastReceiptId: "receipt-sm2", revision: 0 })],
      expect.objectContaining({ session: expect.anything() }),
    );
  });

  it("computes serverDeltaDays from the previous review, ignoring client-supplied deltas", async () => {
    // First review lands, serverDelta = 0.
    await POST(makeReq(goodBody({ clientEventId: "evt-a" }), "Bearer VALID"));
    expect(reviewLogs[0].serverDeltaDays).toBe(0);

    // Back-date the first row by 3 days so the second call sees a real gap.
    reviewLogs[0].createdAt = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);

    await POST(makeReq(goodBody({ clientEventId: "evt-b" }), "Bearer VALID"));
    expect(reviewLogs).toHaveLength(2);
    // Should be ~3 days, allow a bit of jitter for test wall clock.
    expect(reviewLogs[1].serverDeltaDays).toBeGreaterThan(2.99);
    expect(reviewLogs[1].serverDeltaDays).toBeLessThan(3.01);
  });

  it("hashes taskPrompt rather than storing raw text (blinding + PII hygiene)", async () => {
    await POST(
      makeReq(
        goodBody({ clientEventId: "evt-hash", taskPrompt: "The word is ___." }),
        "Bearer VALID",
      ),
    );
    expect(reviewLogs[0].taskPromptHash).toBe("h(16)");
    // Raw taskPrompt must not leak into the log row.
    expect(reviewLogs[0].taskPrompt).toBeUndefined();
  });
});

