// __tests__/researchPretestScoreRoute.test.ts
//
// Tests for POST /api/research/pretest/score — server-side CEFR placement scoring.
//
// The scoring itself lives in lib/pretestItems.ts and is already deterministic;
// this suite locks the request-validation layer that gates score inputs before
// they reach the enrolment endpoint. Two invariants matter most for LLT review:
//
//   (1) Completeness gate — partial submissions must be rejected. Without it a
//       client sending {} silently scores 0/A2 and can still enrol into the A2
//       stratum. That would let a participant bypass the CEFR placement, and an
//       LLT reviewer looking at CONSORT flow would flag it.
//
//   (2) administeredAt / completedAt ISO validity — dates that parse to NaN
//       persist as "Invalid Date" downstream (see enrol route, same pattern).
//       We reject them at the boundary.
//
// Auth: none (pre-enrolment). No DB. Pure route logic.

// D-016: mock DB + PretestSubmission BEFORE importing the route.
const persistedSubmissions: any[] = [];

jest.mock("@/lib/db", () => ({
  connectDB: jest.fn(async () => {}),
}));

jest.mock("@/app/models/PretestSubmission", () => ({
  __esModule: true,
  default: {
    create: jest.fn(async (doc: any) => {
      persistedSubmissions.push(doc);
      return doc;
    }),
  },
}));

import { POST } from "@/app/api/research/pretest/score/route";
import { PRETEST_ITEMS } from "@/lib/pretestItems";

beforeEach(() => {
  persistedSubmissions.length = 0;
});

function makeReq(body: any, opts: { badJson?: boolean } = {}): any {
  return {
    json: async () => {
      if (opts.badJson) throw new Error("not JSON");
      return body;
    },
  };
}

/** Build a full-correct answer sheet from the server-side key. */
function allCorrectAnswers(): Record<string, number> {
  const out: Record<string, number> = {};
  for (const it of PRETEST_ITEMS) out[it.id] = it.correctIndex;
  return out;
}

/** Build a full-incorrect answer sheet (offset by 1 mod 4). */
function allWrongAnswers(): Record<string, number> {
  const out: Record<string, number> = {};
  for (const it of PRETEST_ITEMS) out[it.id] = (it.correctIndex + 1) % 4;
  return out;
}

describe("POST /api/research/pretest/score", () => {
  it("rejects non-JSON body with 400", async () => {
    const res = await POST(makeReq(null, { badJson: true }));
    expect(res.status).toBe(400);
    const j = await res.json();
    expect(j.success).toBe(false);
    expect(j.message).toMatch(/Invalid JSON/);
  });

  it("rejects missing answers with 400", async () => {
    const res = await POST(makeReq({ completedAt: "2026-08-13T08:00:00Z" }));
    expect(res.status).toBe(400);
  });

  it("rejects answers-is-array with 400", async () => {
    const res = await POST(makeReq({ answers: [1, 2, 3] }));
    expect(res.status).toBe(400);
  });

  it("rejects unknown itemId with 400", async () => {
    const answers = allCorrectAnswers();
    answers["pt_XX"] = 0;
    const res = await POST(makeReq({ answers }));
    expect(res.status).toBe(400);
    const j = await res.json();
    expect(j.message).toMatch(/Unknown item id/);
  });

  it("rejects out-of-range picked index with 400", async () => {
    const answers = allCorrectAnswers();
    answers[PRETEST_ITEMS[0].id] = 7;
    const res = await POST(makeReq({ answers }));
    expect(res.status).toBe(400);
    const j = await res.json();
    expect(j.message).toMatch(/must be integer 0–3/);
  });

  it("rejects non-integer picked index with 400", async () => {
    const answers = allCorrectAnswers();
    answers[PRETEST_ITEMS[0].id] = 1.5;
    const res = await POST(makeReq({ answers }));
    expect(res.status).toBe(400);
  });

  // ── The main completeness invariant ──────────────────────────────────────

  it("REJECTS an empty answers object — no silent-A2 path", async () => {
    const res = await POST(makeReq({ answers: {} }));
    expect(res.status).toBe(400);
    const j = await res.json();
    expect(j.message).toMatch(/Incomplete submission/);
    expect(j.message).toMatch(/20 items must be answered/);
  });

  it("REJECTS partial submission (19 of 20 answered)", async () => {
    const answers = allCorrectAnswers();
    delete answers[PRETEST_ITEMS[3].id];
    const res = await POST(makeReq({ answers }));
    expect(res.status).toBe(400);
    const j = await res.json();
    expect(j.message).toMatch(/Incomplete/);
  });

  // ── administeredAt / completedAt validation ─────────────────────────────

  it("rejects a garbage completedAt string", async () => {
    const res = await POST(
      makeReq({ answers: allCorrectAnswers(), completedAt: "not-a-date" }),
    );
    expect(res.status).toBe(400);
    const j = await res.json();
    expect(j.message).toMatch(/valid ISO date/);
  });

  it("accepts a valid completedAt", async () => {
    const res = await POST(
      makeReq({
        answers: allCorrectAnswers(),
        completedAt: "2026-08-13T08:00:00Z",
      }),
    );
    expect(res.status).toBe(200);
  });

  it("allows completedAt to be omitted (echoes now())", async () => {
    const before = Date.now();
    const res = await POST(makeReq({ answers: allCorrectAnswers() }));
    expect(res.status).toBe(200);
    const j = await res.json();
    expect(typeof j.completedAt).toBe("string");
    const echoed = new Date(j.completedAt).getTime();
    expect(echoed).toBeGreaterThanOrEqual(before - 1000);
  });

  // ── Happy paths — full sheet, verified score bands ──────────────────────

  it("scores a full-correct sheet as 100 / B2", async () => {
    const res = await POST(
      makeReq({
        answers: allCorrectAnswers(),
        completedAt: "2026-08-13T08:00:00Z",
      }),
    );
    expect(res.status).toBe(200);
    const j = await res.json();
    expect(j.success).toBe(true);
    expect(j.score).toBe(100);
    expect(j.cefrLevel).toBe("B2");
    expect(j.correct).toBe(PRETEST_ITEMS.length);
    expect(j.total).toBe(PRETEST_ITEMS.length);
  });

  // ── D-016: submission persistence ───────────────────────────────────────

  it("D-016: returns a submissionId + persists a PretestSubmission row", async () => {
    const res = await POST(
      makeReq({
        answers: allCorrectAnswers(),
        completedAt: "2026-08-13T08:00:00Z",
      }),
    );
    expect(res.status).toBe(200);
    const j = await res.json();
    expect(typeof j.submissionId).toBe("string");
    expect(j.submissionId.length).toBeGreaterThan(10);
    expect(j.persisted).toBe(true);

    expect(persistedSubmissions).toHaveLength(1);
    const row = persistedSubmissions[0];
    expect(row.submissionId).toBe(j.submissionId);
    expect(row.score).toBe(100);
    expect(row.cefrLevel).toBe("B2");
    expect(row.used).toBe(false);
    expect(typeof row.answersHash).toBe("string");
    expect(row.answersHash.length).toBe(64);  // sha256 hex
  });

  it("D-016: two different sheets produce two different submissionIds + answersHashes", async () => {
    const r1 = await POST(makeReq({ answers: allCorrectAnswers() }));
    const r2 = await POST(makeReq({ answers: allWrongAnswers() }));
    const j1 = await r1.json();
    const j2 = await r2.json();
    expect(j1.submissionId).not.toBe(j2.submissionId);
    expect(persistedSubmissions).toHaveLength(2);
    expect(persistedSubmissions[0].answersHash).not.toBe(
      persistedSubmissions[1].answersHash,
    );
  });

  it("D-016: DB failure still returns score but with persisted=false", async () => {
    const Model = require("@/app/models/PretestSubmission").default;
    const original = Model.create;
    Model.create = jest.fn(async () => {
      throw new Error("mongo down");
    });
    const res = await POST(makeReq({ answers: allCorrectAnswers() }));
    Model.create = original;
    expect(res.status).toBe(200);
    const j = await res.json();
    expect(j.persisted).toBe(false);
    expect(j.submissionId).toBeTruthy();
  });

  it("scores a full-wrong sheet as 0 / A2", async () => {
    const res = await POST(
      makeReq({
        answers: allWrongAnswers(),
        completedAt: "2026-08-13T08:00:00Z",
      }),
    );
    expect(res.status).toBe(200);
    const j = await res.json();
    expect(j.score).toBe(0);
    expect(j.cefrLevel).toBe("A2");
    expect(j.correct).toBe(0);
  });
});
