// __tests__/researchFamiliarityScreenRoute.test.ts
//
// Tests for GET + POST /api/research/familiarity-screen and
// GET /api/research/familiarity-screen/results.
//
// Familiarity screening (H5) is a PUBLIC endpoint — no auth required.
// External volunteers report which target words they already know.
// Results are admin-gated and aggregate per-word familiarity rates.
//
// Locks the following invariants:
//
//   (1) GET returns the full active word list with id, word, definition, cefrBand, partOfSpeech.
//   (2) POST validates: screenerId required, responses must be object of booleans,
//       at least 10 valid word IDs required.
//   (3) POST is idempotent per screenerId — duplicate returns 409.
//   (4) POST returns knownCount + unknownCount summary.
//   (5) Results GET returns per-word familiarity rates sorted desc, flags ≥70%.
//   (6) Results GET shows ready=true only when nScreeners ≥ 20.
//
// Everything mocked at module boundary. No real Mongo.

process.env.RESEARCH_SALT =
  "test-salt-abcdefghijklmnopqrstuvwxyz-0123456789-only-for-tests";

// ── In-memory store for FamiliarityResponse ─────────────────────────────────
const familiarityDocs: any[] = [];

jest.mock("@/lib/db", () => ({ connectDB: jest.fn(async () => {}) }));

jest.mock("@/app/models/FamiliarityResponse", () => {
  return {
    __esModule: true,
    default: {
      findOne: jest.fn(async (filter: any) => {
        return familiarityDocs.find(
          (d) => d.screenerId === filter.screenerId,
        ) ?? null;
      }),
      find: jest.fn(() => ({
        lean: async () => familiarityDocs,
      })),
      create: jest.fn(async (doc: any) => {
        const saved = {
          ...doc,
          submittedAt: new Date(),
          _id: `fam_${familiarityDocs.length + 1}`,
        };
        familiarityDocs.push(saved);
        return saved;
      }),
    },
  };
});

import { NextRequest } from "next/server";
import {
  GET as screenGET,
  POST as screenPOST,
} from "@/app/api/research/familiarity-screen/route";
import { GET as resultsGET } from "@/app/api/research/familiarity-screen/results/route";
import { getActiveWords } from "@/lib/wordBank";

// Helper: build a valid responses object with ≥10 active word IDs
function makeValidResponses(knownIds: string[] = []): Record<string, boolean> {
  const active = getActiveWords();
  const resp: Record<string, boolean> = {};
  for (let i = 0; i < Math.min(20, active.length); i++) {
    resp[active[i].id] = knownIds.includes(active[i].id);
  }
  return resp;
}

function postReq(body: any): NextRequest {
  return new NextRequest("http://x/api/research/familiarity-screen", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function getReq(url = "http://x/api/research/familiarity-screen"): NextRequest {
  return new NextRequest(url, { method: "GET" });
}

// ── Reset store between tests ───────────────────────────────────────────────
beforeEach(() => {
  familiarityDocs.length = 0;
});

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/research/familiarity-screen — public word list
// ═══════════════════════════════════════════════════════════════════════════════
describe("GET /api/research/familiarity-screen — public word list", () => {
  it("returns success with all active words", async () => {
    const res = await screenGET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.total).toBe(getActiveWords().length);
    expect(body.words.length).toBe(body.total);
  });

  it("each word has id, word, definition, cefrBand, partOfSpeech", async () => {
    const res = await screenGET();
    const { words } = await res.json();
    for (const w of words) {
      expect(w).toHaveProperty("id");
      expect(w).toHaveProperty("word");
      expect(w).toHaveProperty("definition");
      expect(w).toHaveProperty("cefrBand");
      expect(w).toHaveProperty("partOfSpeech");
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// POST /api/research/familiarity-screen — submit responses
// ═══════════════════════════════════════════════════════════════════════════════
describe("POST /api/research/familiarity-screen — validation", () => {
  it("rejects invalid JSON → 400", async () => {
    const req = new NextRequest("http://x/api/research/familiarity-screen", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "not-json{{{",
    });
    const res = await screenPOST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.message).toMatch(/Invalid JSON/i);
  });

  it("rejects missing screenerId → 400", async () => {
    const res = await screenPOST(postReq({ responses: makeValidResponses() }));
    expect(res.status).toBe(400);
    expect((await res.json()).message).toMatch(/screenerId/);
  });

  it("rejects empty string screenerId → 400", async () => {
    const res = await screenPOST(
      postReq({ screenerId: "  ", responses: makeValidResponses() }),
    );
    expect(res.status).toBe(400);
  });

  it("rejects missing responses → 400", async () => {
    const res = await screenPOST(postReq({ screenerId: "S001" }));
    expect(res.status).toBe(400);
    expect((await res.json()).message).toMatch(/responses/);
  });

  it("rejects array responses → 400", async () => {
    const res = await screenPOST(
      postReq({ screenerId: "S001", responses: [true, false] }),
    );
    expect(res.status).toBe(400);
  });

  it("rejects too few valid word IDs (<10) → 400", async () => {
    const res = await screenPOST(
      postReq({
        screenerId: "S001",
        responses: { fake_001: true, fake_002: false },
      }),
    );
    expect(res.status).toBe(400);
    expect((await res.json()).message).toMatch(/Too few valid/);
  });

  it("rejects non-boolean values in responses → 400", async () => {
    const active = getActiveWords();
    const resp: Record<string, any> = {};
    for (let i = 0; i < 15; i++) resp[active[i].id] = i < 10 ? true : "yes";
    const res = await screenPOST(
      postReq({ screenerId: "S001", responses: resp }),
    );
    expect(res.status).toBe(400);
    expect((await res.json()).message).toMatch(/boolean/);
  });
});

describe("POST /api/research/familiarity-screen — success + idempotency", () => {
  it("accepts valid submission and returns summary", async () => {
    const active = getActiveWords();
    const knownIds = active.slice(0, 5).map((w) => w.id);
    const responses = makeValidResponses(knownIds);

    const res = await screenPOST(
      postReq({ screenerId: "S001", responses, durationSecs: 120 }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.screenerId).toBe("S001");
    expect(body.knownCount).toBe(5);
    expect(body.unknownCount).toBe(15); // 20 total − 5 known
    expect(body.submittedAt).toBeDefined();
  });

  it("rejects duplicate screenerId → 409", async () => {
    const responses = makeValidResponses();
    await screenPOST(postReq({ screenerId: "S002", responses }));

    const res = await screenPOST(postReq({ screenerId: "S002", responses }));
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.message).toMatch(/already submitted/);
    expect(body.submittedAt).toBeDefined();
  });

  it("trims whitespace from screenerId", async () => {
    const responses = makeValidResponses();
    const res = await screenPOST(
      postReq({ screenerId: "  S003  ", responses }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.screenerId).toBe("S003");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/research/familiarity-screen/results — admin aggregate
// ═══════════════════════════════════════════════════════════════════════════════
describe("GET /api/research/familiarity-screen/results", () => {
  it("returns empty state when no responses exist", async () => {
    const res = await resultsGET(
      getReq("http://x/api/research/familiarity-screen/results"),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.nScreeners).toBe(0);
    expect(body.words).toHaveLength(0);
  });

  it("computes per-word familiarity rates and flags ≥70%", async () => {
    const active = getActiveWords();
    // Simulate 3 screeners: all know w_001, 2/3 know w_002, 1/3 knows w_003
    const w1 = active[0].id;
    const w2 = active[1].id;
    const w3 = active[2].id;

    // Build 3 FamiliarityResponse docs in the in-memory store
    for (let i = 0; i < 3; i++) {
      const responses: Record<string, boolean> = {};
      for (let j = 0; j < 20; j++) responses[active[j].id] = false;
      responses[w1] = true; // all 3 know w1
      if (i < 2) responses[w2] = true; // 2/3 know w2
      if (i === 0) responses[w3] = true; // 1/3 knows w3
      familiarityDocs.push({
        screenerId: `R${i + 1}`,
        responses,
        submittedAt: new Date(),
        metadata: { nWords: 20 },
      });
    }

    const res = await resultsGET(
      getReq("http://x/api/research/familiarity-screen/results"),
    );
    const body = await res.json();

    expect(body.nScreeners).toBe(3);
    expect(body.ready).toBe(false); // need ≥ 20

    // w1 rate = 1.0 → flagged
    const w1Result = body.words.find((w: any) => w.wordId === w1);
    expect(w1Result.familiarityRate).toBe(1.0);
    expect(w1Result.flagged).toBe(true);

    // w2 rate = 0.6667 → NOT flagged (< 0.70)
    const w2Result = body.words.find((w: any) => w.wordId === w2);
    expect(w2Result.familiarityRate).toBeCloseTo(0.6667, 2);
    expect(w2Result.flagged).toBe(false);

    // w3 rate = 0.3333 → NOT flagged
    const w3Result = body.words.find((w: any) => w.wordId === w3);
    expect(w3Result.familiarityRate).toBeCloseTo(0.3333, 2);

    // flagged array should contain only w1
    expect(body.flagged.length).toBe(1);
    expect(body.flagged[0].wordId).toBe(w1);

    // sorted descending by rate
    for (let i = 1; i < body.words.length; i++) {
      expect(body.words[i - 1].familiarityRate).toBeGreaterThanOrEqual(
        body.words[i].familiarityRate,
      );
    }
  });

  it("shows ready=true when nScreeners ≥ 20", async () => {
    const active = getActiveWords();
    for (let i = 0; i < 20; i++) {
      const responses: Record<string, boolean> = {};
      for (let j = 0; j < 15; j++) responses[active[j].id] = false;
      familiarityDocs.push({
        screenerId: `V${i + 1}`,
        responses,
        submittedAt: new Date(),
        metadata: { nWords: 15 },
      });
    }

    const res = await resultsGET(
      getReq("http://x/api/research/familiarity-screen/results"),
    );
    const body = await res.json();
    expect(body.ready).toBe(true);
    expect(body.nScreeners).toBe(20);
    expect(body.progressNote).toMatch(/complete/i);
  });
});
