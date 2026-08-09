// __tests__/retrievalTaskGenerateRoute.test.ts
//
// Tests for the /api/retrieval-task/generate endpoint (built during Tuần 3 audit,
// 2026-08-09). We mock the LLM cache layer so tests stay hermetic.

// Mock the module BEFORE importing the route so the route captures our mock.
jest.mock("@/lib/retrievalTaskGenerator", () => ({
  generateRetrievalTask: jest.fn(async (word: string, ctx: string, type: number) => ({
    type,
    label: ["MCQ", "Cloze", "Gen", "Paraphrase"][type],
    prompt: `Mock prompt for "${word}" (type=${type})`,
    options: type === 0 ? ["A", "B", "C", "D"] : undefined,
    expectedAnswer: type === 0 ? "A" : word,
    raw: "{}",
  })),
}));

jest.mock("@/lib/participantAuth", () => ({
  verifyRequest: jest.fn((header: string | null) => {
    if (!header) return null;
    if (header === "Bearer VALID") return "P0042";
    return null;
  }),
}));

import { POST } from "@/app/api/retrieval-task/generate/route";
import { generateRetrievalTask } from "@/lib/retrievalTaskGenerator";
import { verifyRequest } from "@/lib/participantAuth";

function makeReq(body: any, headers: Record<string, string> = {}): any {
  return {
    json: async () => body,
    headers: {
      get: (k: string) => headers[k.toLowerCase()] ?? null,
    },
  };
}

describe("POST /api/retrieval-task/generate", () => {
  beforeEach(() => {
    (generateRetrievalTask as jest.Mock).mockClear();
    (verifyRequest as jest.Mock).mockClear();
  });

  it("401 when no Authorization header", async () => {
    const res = await POST(makeReq({ vocabularyId: "w1", word: "hi", retrievalType: 0 }));
    expect(res.status).toBe(401);
    const j = await res.json();
    expect(j.success).toBe(false);
  });

  it("401 on invalid token", async () => {
    const res = await POST(makeReq(
      { vocabularyId: "w1", word: "hi", retrievalType: 0 },
      { authorization: "Bearer BOGUS" },
    ));
    expect(res.status).toBe(401);
  });

  it("400 when vocabularyId missing", async () => {
    const res = await POST(makeReq(
      { word: "hi", retrievalType: 0 },
      { authorization: "Bearer VALID" },
    ));
    expect(res.status).toBe(400);
    const j = await res.json();
    expect(j.message).toMatch(/vocabularyId/i);
  });

  it("400 when word missing", async () => {
    const res = await POST(makeReq(
      { vocabularyId: "w1", retrievalType: 0 },
      { authorization: "Bearer VALID" },
    ));
    expect(res.status).toBe(400);
    const j = await res.json();
    expect(j.message).toMatch(/word/i);
  });

  it("400 when retrievalType out of range", async () => {
    for (const bad of [-1, 4, "0", null, undefined]) {
      const res = await POST(makeReq(
        { vocabularyId: "w1", word: "hi", retrievalType: bad },
        { authorization: "Bearer VALID" },
      ));
      expect(res.status).toBe(400);
    }
  });

  it("200 returns task for valid MCQ request", async () => {
    const res = await POST(makeReq(
      { vocabularyId: "w1", word: "resilient", context: "The bridge is resilient.", retrievalType: 0 },
      { authorization: "Bearer VALID" },
    ));
    expect(res.status).toBe(200);
    const j = await res.json();
    expect(j.success).toBe(true);
    expect(j.task.vocabularyId).toBe("w1");
    expect(j.task.retrievalType).toBe(0);
    expect(j.task.prompt).toContain("resilient");
    expect(Array.isArray(j.task.options)).toBe(true);
    expect(j.task.options).toHaveLength(4);
    expect(j.task.expectedAnswer).toBe("A");
    expect(j.participant).toBe("P0042");
  });

  it("200 returns task for cloze (no options)", async () => {
    const res = await POST(makeReq(
      { vocabularyId: "w2", word: "acknowledge", retrievalType: 1 },
      { authorization: "Bearer VALID" },
    ));
    expect(res.status).toBe(200);
    const j = await res.json();
    expect(j.task.retrievalType).toBe(1);
    expect(j.task.options).toBeUndefined();
    expect(j.task.expectedAnswer).toBe("acknowledge");
  });

  it("passes correct arguments to generateRetrievalTask", async () => {
    await POST(makeReq(
      { vocabularyId: "w3", word: "contribute", context: "She contributed.", retrievalType: 2 },
      { authorization: "Bearer VALID" },
    ));
    expect(generateRetrievalTask).toHaveBeenCalledWith("contribute", "She contributed.", 2);
  });

  it("400 on invalid JSON body", async () => {
    const badReq: any = {
      json: async () => { throw new Error("bad json"); },
      headers: { get: () => "Bearer VALID" },
    };
    const res = await POST(badReq);
    expect(res.status).toBe(400);
  });

  it("500 when generator throws", async () => {
    (generateRetrievalTask as jest.Mock).mockRejectedValueOnce(new Error("LLM down"));
    const res = await POST(makeReq(
      { vocabularyId: "w4", word: "diverse", retrievalType: 3 },
      { authorization: "Bearer VALID" },
    ));
    expect(res.status).toBe(500);
    const j = await res.json();
    expect(j.detail).toMatch(/LLM down/);
  });
});
