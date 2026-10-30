// __tests__/researchPosttestSubmitRoute.test.ts
//
// Tests for POST /api/research/posttest/submit — the blind-graded posttest
// scoring endpoint (Ngày 24 / posttestBuilder, route built Day 6–10).
//
// Locks these invariants:
//
//   (1) Auth: Bearer participant token REQUIRED, else 401.
//   (2) Validation: testType must be posttest_immediate|posttest_delayed,
//       answers must be an object, administeredAt must be a valid ISO date.
//   (3) Participant guard: unknown → 403, withdrawn (dropoutAt set) → 403.
//   (4) Idempotency: duplicate submission → 409, alreadySubmitted=true.
//   (5) Scoring: recall MCQ auto-scored, cloze auto-scored, context transfer
//       items marked needsJudge=true. Section scores + totalScore returned.
//   (6) Response shape: success, id, formVersion, scores, breakdown, note.
//
// Everything mocked at module boundary. No real Mongo, no real LLM.

process.env.RESEARCH_SALT =
  "test-salt-abcdefghijklmnopqrstuvwxyz-0123456789-only-for-tests";

// ── In-memory stores ────────────────────────────────────────────────────────

const participants: any[] = [];
const testResults: any[] = [];

beforeEach(() => {
  participants.length = 0;
  testResults.length = 0;
});

// ── Mocks ───────────────────────────────────────────────────────────────────

jest.mock("@/lib/db", () => ({ connectDB: jest.fn(async () => {}) }));

jest.mock("@/app/models/Participant", () => {
  const chain = (val: any) => ({ lean: async () => val });
  return {
    __esModule: true,
    default: {
      findOne: jest.fn((filter: any) =>
        chain(participants.find((p) => p.participantCode === filter.participantCode) ?? null),
      ),
      updateOne: jest.fn(async () => ({ modifiedCount: 1 })),
    },
  };
});

jest.mock("@/app/models/TestResult", () => {
  return {
    __esModule: true,
    default: {
      findOne: jest.fn((filter: any) => ({
        lean: async () =>
          testResults.find(
            (r) =>
              r.participantCode === filter.participantCode &&
              r.testType === filter.testType,
          ) ?? null,
      })),
      create: jest.fn(async (doc: any) => {
        // Simulate unique index violation
        if (
          testResults.some(
            (r) =>
              r.participantCode === doc.participantCode &&
              r.testType === doc.testType,
          )
        ) {
          const e: any = new Error("dup");
          e.code = 11000;
          throw e;
        }
        const row = { ...doc, _id: `tr_${testResults.length + 1}` };
        testResults.push(row);
        return row;
      }),
    },
  };
});

// ── Imports (after mocks) ───────────────────────────────────────────────────

import { NextRequest } from "next/server";
import { issueParticipantToken } from "@/lib/participantAuth";
import { POST } from "@/app/api/research/posttest/submit/route";
import {
  RECALL_WORD_IDS, CLOZE_WORD_IDS, CONTEXT_TRANSFER_ITEMS,
  buildRecallItems, buildClozeItems, FORM_VERSION,
} from "@/lib/posttestBuilder";

// ── Helpers ─────────────────────────────────────────────────────────────────

const TOKEN = issueParticipantToken("P0042");
const AUTH = { authorization: `Bearer ${TOKEN}` };

function makeReq(body: any, headers: Record<string, string> = AUTH): NextRequest {
  return new NextRequest("http://x/api/research/posttest/submit", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

/** Build an answers object where all recall/cloze are wrong and CT is empty. */
function emptyAnswers() {
  const recall: Record<string, string> = {};
  RECALL_WORD_IDS.forEach((id) => { recall[`recall_${id}`] = "99"; });

  const cloze: Record<string, string> = {};
  CLOZE_WORD_IDS.forEach((id) => { cloze[`cloze_${id}`] = ""; });

  const contextTransfer: Record<string, string> = {};
  CONTEXT_TRANSFER_ITEMS.forEach((item) => { contextTransfer[item.itemId] = ""; });

  return { recall, cloze, contextTransfer };
}

/** Build an answers object where all recall are correct. */
function perfectRecallAnswers() {
  const recallItems = buildRecallItems();
  const recall: Record<string, string> = {};
  recallItems.forEach((item) => { recall[item.itemId] = String(item.correctIndex); });

  const cloze: Record<string, string> = {};
  CLOZE_WORD_IDS.forEach((id) => { cloze[`cloze_${id}`] = ""; });

  const contextTransfer: Record<string, string> = {};
  CONTEXT_TRANSFER_ITEMS.forEach((item) => { contextTransfer[item.itemId] = ""; });

  return { recall, cloze, contextTransfer };
}

/** Build answers with all recall correct + all cloze correct. */
function perfectAutoAnswers() {
  const recallItems = buildRecallItems();
  const clozeItems = buildClozeItems();

  const recall: Record<string, string> = {};
  recallItems.forEach((item) => { recall[item.itemId] = String(item.correctIndex); });

  const cloze: Record<string, string> = {};
  clozeItems.forEach((item) => { cloze[item.itemId] = item.correctAnswer; });

  const contextTransfer: Record<string, string> = {};
  CONTEXT_TRANSFER_ITEMS.forEach((item) => { contextTransfer[item.itemId] = ""; });

  return { recall, cloze, contextTransfer };
}

function seedParticipant(code = "P0042", extra: any = {}) {
  participants.push({ participantCode: code, ...extra });
}

const VALID_BODY = () => ({
  testType: "posttest_immediate" as const,
  answers: emptyAnswers(),
  administeredAt: new Date().toISOString(),
});

// ── Tests ───────────────────────────────────────────────────────────────────

describe("POST /api/research/posttest/submit — auth", () => {
  it("returns 401 when Authorization header is missing", async () => {
    const res = await POST(makeReq(VALID_BODY(), {}));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  it("returns 401 when Bearer token is invalid", async () => {
    const res = await POST(
      makeReq(VALID_BODY(), { authorization: "Bearer fake.deadbeef" }),
    );
    expect(res.status).toBe(401);
  });
});

describe("POST /api/research/posttest/submit — validation", () => {
  it("rejects invalid JSON body", async () => {
    const req = new NextRequest("http://x/api/research/posttest/submit", {
      method: "POST",
      headers: { "content-type": "application/json", ...AUTH },
      body: "not json{{{",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.message).toMatch(/Invalid JSON/i);
  });

  it("rejects unknown testType", async () => {
    seedParticipant();
    const res = await POST(
      makeReq({ ...VALID_BODY(), testType: "posttest_surprise" }),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.message).toMatch(/testType/);
  });

  it("rejects missing answers", async () => {
    seedParticipant();
    const { answers: _, ...rest } = VALID_BODY();
    const res = await POST(makeReq({ ...rest, answers: null }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.message).toMatch(/answers/);
  });

  it("rejects array as answers", async () => {
    seedParticipant();
    const res = await POST(makeReq({ ...VALID_BODY(), answers: [1, 2, 3] }));
    expect(res.status).toBe(400);
  });

  it("rejects missing administeredAt", async () => {
    seedParticipant();
    const { administeredAt: _, ...rest } = VALID_BODY();
    const res = await POST(makeReq(rest));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.message).toMatch(/administeredAt/);
  });

  it("rejects invalid administeredAt (non-ISO string)", async () => {
    seedParticipant();
    const res = await POST(
      makeReq({ ...VALID_BODY(), administeredAt: "not-a-date" }),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.message).toMatch(/valid ISO date/i);
  });
});

describe("POST /api/research/posttest/submit — participant guard", () => {
  it("returns 403 for unknown participant", async () => {
    // No participant seeded
    const res = await POST(makeReq(VALID_BODY()));
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.message).toMatch(/Unknown participant/);
  });

  it("returns 403 for withdrawn participant (dropoutAt set)", async () => {
    seedParticipant("P0042", { dropoutAt: new Date() });
    const res = await POST(makeReq(VALID_BODY()));
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.message).toMatch(/withdrawn/i);
  });
});

describe("POST /api/research/posttest/submit — idempotency", () => {
  it("returns 409 alreadySubmitted when TestResult already exists", async () => {
    seedParticipant();
    testResults.push({
      participantCode: "P0042",
      testType: "posttest_immediate",
      _id: "existing_1",
    });
    const res = await POST(makeReq(VALID_BODY()));
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.alreadySubmitted).toBe(true);
  });

  it("allows posttest_delayed after posttest_immediate (different testType)", async () => {
    seedParticipant();
    testResults.push({
      participantCode: "P0042",
      testType: "posttest_immediate",
      _id: "existing_imm",
    });
    const res = await POST(
      makeReq({ ...VALID_BODY(), testType: "posttest_delayed" }),
    );
    // Should succeed (200) — different testType
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });
});

describe("POST /api/research/posttest/submit — scoring", () => {
  it("returns 0 recall, 0 cloze when all answers are wrong/empty", async () => {
    seedParticipant();
    const res = await POST(makeReq(VALID_BODY()));
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.success).toBe(true);
    expect(body.scores.recall).toBe(0);
    expect(body.scores.cloze).toBe(0);
    expect(body.scores.contextTransfer).toBeNull(); // pending judge
    expect(body.breakdown.recallCorrect).toBe(0);
    expect(body.breakdown.clozeCorrect).toBe(0);
    expect(body.breakdown.recallTotal).toBe(RECALL_WORD_IDS.length);
    expect(body.breakdown.clozeTotal).toBe(CLOZE_WORD_IDS.length);
    expect(body.breakdown.contextTransferPending).toBe(CONTEXT_TRANSFER_ITEMS.length);
  });

  it("scores perfect recall correctly (100%)", async () => {
    seedParticipant();
    const res = await POST(
      makeReq({ ...VALID_BODY(), answers: perfectRecallAnswers() }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.scores.recall).toBe(100);
    expect(body.breakdown.recallCorrect).toBe(RECALL_WORD_IDS.length);
    expect(body.scores.cloze).toBe(0); // cloze still empty
  });

  it("scores perfect recall + cloze correctly", async () => {
    seedParticipant();
    const res = await POST(
      makeReq({ ...VALID_BODY(), answers: perfectAutoAnswers() }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.scores.recall).toBe(100);
    expect(body.scores.cloze).toBe(100);
    // totalAuto = 70% * 100 + 30% * 0 = 70
    expect(body.scores.totalAuto).toBe(70);
  });

  it("contextTransfer section is always null (pending judge)", async () => {
    seedParticipant();
    const res = await POST(makeReq(VALID_BODY()));
    const body = await res.json();
    expect(body.scores.contextTransfer).toBeNull();
    expect(body.note).toMatch(/judge/i);
  });
});

describe("POST /api/research/posttest/submit — response shape", () => {
  it("returns id, formVersion, scores, breakdown, note", async () => {
    seedParticipant();
    const res = await POST(makeReq(VALID_BODY()));
    expect(res.status).toBe(200);
    const body = await res.json();

    // Shape
    expect(body).toHaveProperty("id");
    expect(body.formVersion).toBe(FORM_VERSION);
    expect(body).toHaveProperty("scores");
    expect(body).toHaveProperty("breakdown");
    expect(body).toHaveProperty("note");

    // Scores sub-object
    expect(body.scores).toHaveProperty("recall");
    expect(body.scores).toHaveProperty("cloze");
    expect(body.scores).toHaveProperty("contextTransfer");
    expect(body.scores).toHaveProperty("totalAuto");

    // Breakdown sub-object
    expect(body.breakdown).toHaveProperty("recallCorrect");
    expect(body.breakdown).toHaveProperty("recallTotal");
    expect(body.breakdown).toHaveProperty("clozeCorrect");
    expect(body.breakdown).toHaveProperty("clozeTotal");
    expect(body.breakdown).toHaveProperty("contextTransferPending");
  });
});
