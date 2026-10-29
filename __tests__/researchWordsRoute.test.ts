// __tests__/researchWordsRoute.test.ts
//
// Tests for:
//   GET /api/research/words        — list target words (auth required)
//   GET /api/research/words/[wordId] — single word detail (auth required)
//
// Locks the following invariants:
//
//   (1) Auth: participant token OR admin session required, else 401.
//   (2) Default GET returns all active words with count.
//   (3) ?band=B1 filters to B1 words only.
//   (4) ?ids=w_001,w_002 filters to specific IDs.
//   (5) [wordId] returns single word or 404.
//   (6) Response shape uses toPublicWordEntry (no pilotRemovalReason).
//
// Everything mocked at module boundary. No real Mongo, no real auth DB.

process.env.RESEARCH_SALT =
  "test-salt-abcdefghijklmnopqrstuvwxyz-0123456789-only-for-tests";

jest.mock("@/lib/db", () => ({ connectDB: jest.fn(async () => {}) }));

// Mock getAuthUser to simulate admin sessions
let mockAdminUser: any = null;
jest.mock("@/lib/auth", () => ({
  getAuthUser: jest.fn(async () => mockAdminUser),
}));

import { NextRequest } from "next/server";
import { issueParticipantToken } from "@/lib/participantAuth";
import { GET as wordsGET } from "@/app/api/research/words/route";
import { GET as wordByIdGET } from "@/app/api/research/words/[wordId]/route";
import { getActiveWords, getWordsByBand } from "@/lib/wordBank";

const PARTICIPANT_TOKEN = issueParticipantToken("P0099");
const AUTH_HEADER = { authorization: `Bearer ${PARTICIPANT_TOKEN}` };

function makeReq(
  url: string,
  headers: Record<string, string> = {},
): NextRequest {
  return new NextRequest(url, { method: "GET", headers });
}

beforeEach(() => {
  mockAdminUser = null;
});

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/research/words — auth
// ═══════════════════════════════════════════════════════════════════════════════
describe("GET /api/research/words — auth", () => {
  it("returns 401 when no auth provided", async () => {
    const res = await wordsGET(makeReq("http://x/api/research/words"));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  it("returns 401 with invalid Bearer token", async () => {
    const res = await wordsGET(
      makeReq("http://x/api/research/words", {
        authorization: "Bearer bogus.token",
      }),
    );
    expect(res.status).toBe(401);
  });

  it("succeeds with valid participant token", async () => {
    const res = await wordsGET(
      makeReq("http://x/api/research/words", AUTH_HEADER),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.count).toBe(getActiveWords().length);
  });

  it("succeeds with admin session (no participant token)", async () => {
    mockAdminUser = { _id: "admin1", role: "admin" };
    const res = await wordsGET(makeReq("http://x/api/research/words"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/research/words — filters
// ═══════════════════════════════════════════════════════════════════════════════
describe("GET /api/research/words — filters", () => {
  it("returns all active words when no filter", async () => {
    const res = await wordsGET(
      makeReq("http://x/api/research/words", AUTH_HEADER),
    );
    const body = await res.json();
    expect(body.count).toBe(getActiveWords().length);
    expect(body.words.length).toBe(body.count);
  });

  it("?band=B1 returns only B1 words", async () => {
    const res = await wordsGET(
      makeReq("http://x/api/research/words?band=B1", AUTH_HEADER),
    );
    const body = await res.json();
    const b1Count = getActiveWords().filter((w) => w.cefrBand === "B1").length;
    expect(body.count).toBe(b1Count);
    for (const w of body.words) {
      expect(w.cefrBand).toBe("B1");
    }
  });

  it("?band=B2 returns only B2 words", async () => {
    const res = await wordsGET(
      makeReq("http://x/api/research/words?band=B2", AUTH_HEADER),
    );
    const body = await res.json();
    const b2Count = getActiveWords().filter((w) => w.cefrBand === "B2").length;
    expect(body.count).toBe(b2Count);
    for (const w of body.words) {
      expect(w.cefrBand).toBe("B2");
    }
  });

  it("?ids=w_001,w_002 returns only those IDs", async () => {
    const res = await wordsGET(
      makeReq("http://x/api/research/words?ids=w_001,w_002", AUTH_HEADER),
    );
    const body = await res.json();
    expect(body.count).toBe(2);
    const ids = body.words.map((w: any) => w.id);
    expect(ids).toContain("w_001");
    expect(ids).toContain("w_002");
  });

  it("?ids with unknown ID returns only matching words", async () => {
    const res = await wordsGET(
      makeReq(
        "http://x/api/research/words?ids=w_001,w_999_fake",
        AUTH_HEADER,
      ),
    );
    const body = await res.json();
    expect(body.count).toBe(1);
    expect(body.words[0].id).toBe("w_001");
  });

  it("response shape has no pilotRemovalReason field", async () => {
    const res = await wordsGET(
      makeReq("http://x/api/research/words?ids=w_001", AUTH_HEADER),
    );
    const body = await res.json();
    expect(body.words[0]).not.toHaveProperty("pilotRemovalReason");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/research/words/[wordId]
// ═══════════════════════════════════════════════════════════════════════════════
describe("GET /api/research/words/[wordId]", () => {
  const callWordById = (wordId: string, headers: Record<string, string> = {}) =>
    wordByIdGET(
      makeReq(`http://x/api/research/words/${wordId}`, headers),
      { params: { wordId } } as any,
    );

  it("returns 401 without auth", async () => {
    const res = await callWordById("w_001");
    expect(res.status).toBe(401);
  });

  it("returns word detail with valid participant token", async () => {
    const res = await callWordById("w_001", AUTH_HEADER);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.word.id).toBe("w_001");
    expect(body.word.word).toBeDefined();
    expect(body.word.definition).toBeDefined();
  });

  it("returns 404 for unknown wordId", async () => {
    const res = await callWordById("w_999_nonexistent", AUTH_HEADER);
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.message).toMatch(/not found/);
  });

  it("succeeds with admin session", async () => {
    mockAdminUser = { _id: "admin1", role: "admin" };
    const res = await callWordById("w_001");
    expect(res.status).toBe(200);
  });
});
