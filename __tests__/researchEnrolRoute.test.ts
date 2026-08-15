// __tests__/researchEnrolRoute.test.ts
//
// Tests for POST /api/research/enrol — the RCT enrolment endpoint built for
// Ngày 10 of PLAN_45_DAYS.md and hardened per D-016 (2026-08-13).
//
// Acceptance criterion from the plan:
//   "Xong khi: enrol 200 user giả, phân bổ 3 nhánh đều nhau chấp nhận được."
//
// We lock the following invariants:
//
//   (1) Idempotency per participantCode. A second POST MUST return the
//       original assignment, never re-randomise.
//
//   (2) Stratified randomisation reaches all three LIVE_ARMS with balance
//       within ±35 % of the mean, over 200 synthetic codes.
//
//   (3) D-016: enrol REQUIRES a server-issued pretestSubmissionId, VERIFIES
//       it against the stored PretestSubmission, and marks it used. Client
//       cannot invent a submissionId, reuse one, or claim a different CEFR
//       level than what the server scored.
//
// Everything is mocked at the module boundary. RESEARCH_SALT is stubbed so
// participantAuth's HMAC never touches a real env var.

// ---- Mocks (MUST be defined BEFORE importing the route) ----

process.env.RESEARCH_SALT =
  "test-salt-abcdefghijklmnopqrstuvwxyz-0123456789-only-for-tests";

const participants: any[] = [];
const submissions: any[] = [];

jest.mock("@/lib/db", () => ({
  connectDB: jest.fn(async () => {}),
}));

jest.mock("@/app/models/Participant", () => {
  const chain = (val: any) => ({ lean: async () => val });
  return {
    __esModule: true,
    default: {
      findOne: jest.fn((filter: any) => {
        const hit = participants.find(
          (p) => p.participantCode === filter.participantCode,
        );
        return chain(hit ?? null);
      }),
      create: jest.fn(async (doc: any) => {
        if (participants.some((p) => p.participantCode === doc.participantCode)) {
          const e: any = new Error("dup");
          e.code = 11000;
          throw e;
        }
        const row = { ...doc, _id: `id_${participants.length + 1}` };
        participants.push(row);
        return row;
      }),
    },
  };
});

jest.mock("@/app/models/PretestSubmission", () => {
  return {
    __esModule: true,
    default: {
      findOne: jest.fn(async (filter: any) => {
        return submissions.find((s) => s.submissionId === filter.submissionId) ?? null;
      }),
      updateOne: jest.fn(async (filter: any, update: any) => {
        const s = submissions.find(
          (x) => x.submissionId === filter.submissionId && x.used === filter.used,
        );
        if (!s) return { matchedCount: 0, modifiedCount: 0 };
        Object.assign(s, update.$set);
        return { matchedCount: 1, modifiedCount: 1 };
      }),
    },
  };
});

import { POST } from "@/app/api/research/enrol/route";
import { LIVE_ARMS } from "@/lib/experimentAssignment";
import { toOpaque } from "@/lib/experimentBlinding";

function makeReq(body: any): any {
  return {
    json: async () => body,
    headers: { get: () => null },
  };
}

/** Seed a fresh valid submission for a given cefrLevel; returns its id. */
function seedSubmission(cefrLevel: "A2" | "B1" | "B2", score = 42): string {
  const submissionId = `ps_test_${submissions.length + 1}_${Math.random().toString(36).slice(2, 8)}`;
  submissions.push({
    submissionId,
    score,
    cefrLevel,
    correct: Math.round((score / 100) * 20),
    total: 20,
    used: false,
  });
  return submissionId;
}

function goodBody(overrides: Partial<any> = {}): any {
  const cefr: "A2" | "B1" | "B2" = overrides.cefrLevel ?? "B1";
  const submissionId = overrides.pretestSubmissionId ?? seedSubmission(cefr);
  return {
    participantCode: "P0042",
    cefrLevel: cefr,
    consentSignedAt: "2026-08-12T08:00:00Z",
    consentDocHash: "a".repeat(64),
    pretestSubmissionId: submissionId,
    pretestCompletedAt: "2026-08-12T08:15:00Z",
    ...overrides,
    // ensure the seeded id overrides after spread if caller didn't supply one
    pretestSubmissionId: overrides.pretestSubmissionId ?? submissionId,
    cefrLevel: cefr,
  };
}

describe("POST /api/research/enrol", () => {
  beforeEach(() => {
    participants.length = 0;
    submissions.length = 0;
  });

  it("400 when participantCode does not match /^P\\d{4}$/", async () => {
    const res = await POST(makeReq(goodBody({ participantCode: "42" })));
    expect(res.status).toBe(400);
    expect(participants).toHaveLength(0);
  });

  it("400 when cefrLevel is outside {A2,B1,B2}", async () => {
    const res = await POST(makeReq(goodBody({ cefrLevel: "C1" as any })));
    expect(res.status).toBe(400);
  });

  it("400 when consentDocHash is too short", async () => {
    const res = await POST(makeReq(goodBody({ consentDocHash: "short" })));
    expect(res.status).toBe(400);
  });

  it("400 when body is not JSON", async () => {
    const badReq: any = {
      json: async () => {
        throw new Error("not json");
      },
      headers: { get: () => null },
    };
    const res = await POST(badReq);
    expect(res.status).toBe(400);
  });

  it("400 when pretestSubmissionId is missing (D-016)", async () => {
    const body = goodBody();
    delete body.pretestSubmissionId;
    const res = await POST(makeReq(body));
    expect(res.status).toBe(400);
    const j = await res.json();
    expect(j.message).toMatch(/pretestSubmissionId required/);
  });

  it("400 when pretestSubmissionId does not exist (D-016)", async () => {
    const res = await POST(
      makeReq(goodBody({ pretestSubmissionId: "ps_never_issued" })),
    );
    expect(res.status).toBe(400);
    const j = await res.json();
    expect(j.message).toMatch(/not found/);
  });

  it("400 when pretestSubmissionId has already been used (D-016 single-use)", async () => {
    const subId = seedSubmission("B1");
    // First enrol consumes it
    const first = await POST(
      makeReq(goodBody({ participantCode: "P0001", pretestSubmissionId: subId })),
    );
    expect(first.status).toBe(200);
    // Second enrol with different code must be rejected
    const second = await POST(
      makeReq(goodBody({ participantCode: "P0002", pretestSubmissionId: subId })),
    );
    expect(second.status).toBe(400);
    const j = await second.json();
    expect(j.message).toMatch(/already used/);
  });

  it("400 when body.cefrLevel disagrees with server-scored cefrLevel (D-016)", async () => {
    const subId = seedSubmission("A2");  // server says A2
    const res = await POST(
      makeReq(goodBody({ cefrLevel: "B2", pretestSubmissionId: subId })),  // client lies B2
    );
    expect(res.status).toBe(400);
    const j = await res.json();
    expect(j.message).toMatch(/cefrLevel mismatch/);
    expect(participants).toHaveLength(0);
  });

  it("D-016: pretestScore persisted comes from server, not client", async () => {
    const subId = seedSubmission("B1", 73);  // server-scored 73
    // Client tries to inject 99
    const res = await POST(
      makeReq(goodBody({ pretestSubmissionId: subId, pretestScore: 99 })),
    );
    expect(res.status).toBe(200);
    expect(participants).toHaveLength(1);
    expect(participants[0].pretestScore).toBe(73);
  });

  it("D-016: submission is marked used after successful enrol", async () => {
    const subId = seedSubmission("B1");
    const res = await POST(makeReq(goodBody({ pretestSubmissionId: subId })));
    expect(res.status).toBe(200);
    const s = submissions.find((x) => x.submissionId === subId);
    expect(s.used).toBe(true);
    expect(s.usedByParticipantCode).toBe("P0042");
    expect(s.usedAt).toBeInstanceOf(Date);
  });

  it("happy path: writes 1 Participant row and returns opaque armLabel + token", async () => {
    const res = await POST(makeReq(goodBody()));
    expect(res.status).toBe(200);
    const j = await res.json();

    expect(j.success).toBe(true);
    expect(j.participantCode).toBe("P0042");
    expect(["A", "B", "C"]).toContain(j.armLabel);
    expect(LIVE_ARMS.map(toOpaque)).toContain(j.armLabel);
    expect(j.stratum).toBe("B1");
    expect(typeof j.participantToken).toBe("string");
    expect(j.participantToken.length).toBeGreaterThan(20);

    expect(participants).toHaveLength(1);
    expect(LIVE_ARMS).toContain(participants[0].condition);
  });

  it("idempotency: second POST with same participantCode does NOT re-randomise", async () => {
    const subId1 = seedSubmission("B1");
    const first = await POST(
      makeReq(goodBody({ pretestSubmissionId: subId1 })),
    );
    const j1 = await first.json();
    expect(participants).toHaveLength(1);

    // Subsequent POSTs use fresh submissions but same participantCode.
    // Idempotency check should short-circuit before D-016 verification.
    for (let i = 0; i < 5; i++) {
      const again = await POST(
        makeReq(goodBody({ pretestSubmissionId: seedSubmission("B1") })),
      );
      expect(again.status).toBe(200);
      const j = await again.json();
      expect(j.deduplicated).toBe(true);
      expect(j.armLabel).toBe(j1.armLabel);
      expect(j.stratum).toBe(j1.stratum);
      expect(j.participantToken).toBeTruthy();
    }
    expect(participants).toHaveLength(1);
  });

  it("race handling: 11000 dup key returns the winner's assignment (not 500)", async () => {
    participants.push({
      participantCode: "P0001",
      condition: LIVE_ARMS[1],
      cefrLevel: "A2",
      stratum: "A2",
    });

    const Participant = require("@/app/models/Participant").default;
    const original = Participant.findOne;
    let firstCall = true;
    Participant.findOne = jest.fn((filter: any) => {
      if (firstCall) {
        firstCall = false;
        return { lean: async () => null };
      }
      return original(filter);
    });

    const res = await POST(
      makeReq(goodBody({ participantCode: "P0001", cefrLevel: "A2" })),
    );
    Participant.findOne = original;

    expect(res.status).toBe(200);
    const j = await res.json();
    expect(j.deduplicated).toBe(true);
    expect(j.raceCondition).toBe(true);
    expect(j.armLabel).toBe(toOpaque(LIVE_ARMS[1]));
  });

  it("acceptance criterion Ngày 10: 200 synthetic codes, all three live arms hit, balance within ±35 % of mean", async () => {
    const strata: Array<"A2" | "B1" | "B2"> = ["A2", "B1", "B2"];
    for (let i = 1; i <= 200; i++) {
      const code = `P${String(i).padStart(4, "0")}`;
      const cefr = strata[i % 3];
      const res = await POST(
        makeReq(
          goodBody({
            participantCode: code,
            cefrLevel: cefr,
            pretestSubmissionId: seedSubmission(cefr),
          }),
        ),
      );
      expect(res.status).toBe(200);
    }
    expect(participants).toHaveLength(200);

    const counts: Record<string, number> = { sm2: 0, hlr: 0, dart: 0 };
    for (const p of participants) counts[p.condition]++;

    expect(counts.sm2).toBeGreaterThan(0);
    expect(counts.hlr).toBeGreaterThan(0);
    expect(counts.dart).toBeGreaterThan(0);

    const mean = 200 / 3;
    for (const arm of LIVE_ARMS) {
      const c = counts[arm];
      const dev = Math.abs(c - mean) / mean;
      expect(dev).toBeLessThan(0.35);
    }
  });
});
