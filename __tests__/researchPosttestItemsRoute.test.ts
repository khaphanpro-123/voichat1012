// __tests__/researchPosttestItemsRoute.test.ts
//
// Tests for GET /api/research/posttest/items — the blinded posttest item
// server (Ngày 24 / posttest UI, closed in Ngày 6 audit).
//
// Locks the following invariants — all of which are LLT-reviewer risk
// surfaces flagged in the Ngày 10 audit log:
//
//   (1) Auth: Bearer participant token REQUIRED, else 401.
//   (2) Blinding: server-only fields (`correctIndex`, `correctAnswer`) MUST
//       NOT leak in the JSON payload for either form.
//   (3) Form=immediate returns all three sections with expected counts and
//       instructions block.
//   (4) Form=delayed returns Recall + Cloze only (Context Transfer omitted
//       per protocol — delayed retention uses first 10 words only).
//   (5) DOCUMENTED GAP: unknown ?form values silently fall through to
//       immediate. This test PINS current behaviour so a future allowlist
//       fix (see Ngày 10 log "Phát hiện") flips the test intentionally.
//
// Everything is mocked at the module boundary. No real Mongo, no real LLM.

process.env.RESEARCH_SALT =
  "test-salt-abcdefghijklmnopqrstuvwxyz-0123456789-only-for-tests";

jest.mock("@/lib/db", () => ({ connectDB: jest.fn(async () => {}) }));

// After mocks — safe to import route + token helper.
import { NextRequest } from "next/server";
import { issueParticipantToken } from "@/lib/participantAuth";
import { GET } from "@/app/api/research/posttest/items/route";

function makeReq(url: string, headers: Record<string, string> = {}): NextRequest {
  return new NextRequest(url, { method: "GET", headers });
}

const AUTH = () => ({ authorization: `Bearer ${issueParticipantToken("P0042")}` });

describe("GET /api/research/posttest/items — auth & blinding", () => {
  it("returns 401 when Authorization header is missing", async () => {
    const res = await GET(makeReq("http://x/api/research/posttest/items"));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  it("returns 401 when Bearer token is invalid", async () => {
    const res = await GET(
      makeReq("http://x/api/research/posttest/items", {
        authorization: "Bearer not-a-real-token.deadbeef",
      }),
    );
    expect(res.status).toBe(401);
  });
});

describe("GET /api/research/posttest/items — form=immediate (default)", () => {
  it("returns 3 sections with counts and instructions, no leaked answers", async () => {
    const res = await GET(makeReq("http://x/api/research/posttest/items", AUTH()));
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.success).toBe(true);
    expect(body.form).toBe("immediate");
    expect(typeof body.formVersion).toBe("string");
    expect(body.formVersion.length).toBeGreaterThan(0);

    // Sections present
    expect(Array.isArray(body.sections.recall)).toBe(true);
    expect(Array.isArray(body.sections.cloze)).toBe(true);
    expect(Array.isArray(body.sections.contextTransfer)).toBe(true);

    // Counts match array lengths
    expect(body.counts.recall).toBe(body.sections.recall.length);
    expect(body.counts.cloze).toBe(body.sections.cloze.length);
    expect(body.counts.contextTransfer).toBe(body.sections.contextTransfer.length);

    // Non-empty (spec: 20 + 20 + 10 per posttestBuilder)
    expect(body.sections.recall.length).toBeGreaterThan(0);
    expect(body.sections.cloze.length).toBeGreaterThan(0);
    expect(body.sections.contextTransfer.length).toBeGreaterThan(0);

    // Instructions block present
    expect(body.instructions).toEqual(
      expect.objectContaining({
        recall: expect.any(String),
        cloze: expect.any(String),
        contextTransfer: expect.any(String),
      }),
    );

    // BLINDING — server-only fields must not leak
    for (const it of body.sections.recall) {
      expect(it).not.toHaveProperty("correctIndex");
      expect(it).not.toHaveProperty("correctAnswer");
      expect(it.itemId).toMatch(/^recall_/);
      expect(Array.isArray(it.options)).toBe(true);
    }
    for (const it of body.sections.cloze) {
      expect(it).not.toHaveProperty("correctAnswer");
      expect(it).not.toHaveProperty("correctIndex");
      expect(it.itemId).toMatch(/^cloze_/);
      expect(typeof it.context).toBe("string");
    }
    for (const it of body.sections.contextTransfer) {
      // Section already excludes "section" field via destructure in route
      expect(it).not.toHaveProperty("section");
      expect(typeof it.scenario).toBe("string");
      expect(typeof it.prompt).toBe("string");
      expect(typeof it.minWords).toBe("number");
      expect(typeof it.maxWords).toBe("number");
    }
  });
});

describe("GET /api/research/posttest/items — form=delayed", () => {
  it("returns Recall + Cloze only, 5 items each, no contextTransfer", async () => {
    const res = await GET(
      makeReq("http://x/api/research/posttest/items?form=delayed", AUTH()),
    );
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.success).toBe(true);
    expect(body.form).toBe("delayed");
    expect(body.sections.recall.length).toBe(5);
    expect(body.sections.cloze.length).toBe(5);
    expect(body.sections.contextTransfer).toBeUndefined();
    expect(body.counts).toEqual({ recall: 5, cloze: 5 });

    // Blinding also holds for delayed form
    for (const it of body.sections.recall) {
      expect(it).not.toHaveProperty("correctIndex");
      expect(it).not.toHaveProperty("correctAnswer");
    }
    for (const it of body.sections.cloze) {
      expect(it).not.toHaveProperty("correctAnswer");
    }
  });
});

describe("GET /api/research/posttest/items — form allowlist", () => {
  // From Ngày 10 log: "posttest/items (form=delayed) không validate ?form values
  // khác — mọi query khác 'delayed' silent fall về immediate. LLT-strict thì
  // thêm allowlist ['immediate','delayed']." Invalid values must fail closed.
  it("rejects an unknown form rather than silently serving immediate items", async () => {
    const res = await GET(
      makeReq("http://x/api/research/posttest/items?form=nonsense", AUTH()),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.message).toBe("Invalid posttest form");
  });
});

