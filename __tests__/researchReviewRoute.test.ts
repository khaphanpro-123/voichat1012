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

jest.mock("@/lib/db", () => ({
  connectDB: jest.fn(async () => {}),
}));

jest.mock("@/lib/participantAuth", () => ({
  verifyRequest: jest.fn((header: string | null) => {
    if (header === "Bearer VALID") return "P0042";
    if (header === "Bearer DROPPED") return "P0099";
    return null;
  }),
}));

jest.mock("@/lib/researchVersion", () => ({
  SCHEDULER_VERSION: "dart@test",
  hashPrompt: (s: string) => `h(${s.length})`,
  isValidWeightsVersion: (v: string) => v === "default" || /^[0-9a-f]{12}$/.test(v),
  getWeightsVersion: () => "default",
}));

jest.mock("@/app/models/ReviewLog", () => {
  // Chainable Mongoose-ish query so `.sort().select().lean()` works.
  const chain = (val: any) => ({
    sort: () => chain(val),
    select: () => chain(val),
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
      create: jest.fn(async (doc: any) => {
        const row = { ...doc, _id: `id_${reviewLogs.length + 1}`, createdAt: new Date() };
        reviewLogs.push(row);
        return row;
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
          return chain({ participantCode: "P0042", condition: "DART", dropoutAt: null });
        }
        if (filter.participantCode === "P0099") {
          return chain({
            participantCode: "P0099",
            condition: "DART",
            dropoutAt: new Date("2026-08-01"),
          });
        }
        return chain(null);
      }),
      updateOne: jest.fn(() => ({ catch: (_: any) => undefined })),
    },
  };
});

import { POST } from "@/app/api/research/review/route";

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
  return {
    clientEventId: "evt-1",
    sessionId: "s1",
    vocabularyId: "v1",
    word: "ubiquitous",
    retrievalType: 1,
    featureVector: [0.1, 0.2, 0.3],
    servedWeightsVersion: "default",
    scheduledAt: "2026-08-11T08:00:00Z",
    servedAt: "2026-08-11T08:00:01Z",
    elapsedMs: 4200,
    recall: 1,
    responseTimeMs: 3800,
    ...overrides,
  };
}

describe("POST /api/research/review", () => {
  beforeEach(() => {
    reviewLogs.length = 0;
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

  it("400 when servedWeightsVersion is neither 'default' nor 12 hex", async () => {
    const res = await POST(makeReq(goodBody({ servedWeightsVersion: "nope" }), "Bearer VALID"));
    expect(res.status).toBe(400);
  });

  it("400 when retrievalType is outside 0..3", async () => {
    const res = await POST(makeReq(goodBody({ retrievalType: 4 }), "Bearer VALID"));
    expect(res.status).toBe(400);
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

  it("stamps schedulerVersion and echoes servedWeightsVersion (Ngày 9 provenance)", async () => {
    await POST(makeReq(goodBody({ clientEventId: "evt-stamp" }), "Bearer VALID"));
    expect(reviewLogs).toHaveLength(1);
    expect(reviewLogs[0].schedulerVersion).toBe("dart@test");
    expect(reviewLogs[0].weightsVersion).toBe("default");
    expect(reviewLogs[0].condition).toBe("DART");
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
