const generated = jest.fn();
const decided = jest.fn(() => ({ retrievalType: 1, heuristicRetrievalType: 1, epsilon: 0, explorationSelected: false }));
const issued = jest.fn(() => ({ receiptId: "receipt-1", token: "opaque.receipt", expiresAt: new Date("2026-10-16T00:20:00.000Z") }));
const created: any[] = [];

jest.mock("@/lib/db", () => ({ connectDB: jest.fn(async () => {}) }));
jest.mock("@/lib/participantAuth", () => ({ verifyRequest: jest.fn((header: string | null) => header === "Bearer VALID" ? "P0042" : null) }));
jest.mock("@/app/models/Participant", () => ({
  __esModule: true,
  default: { findOne: jest.fn(() => ({ lean: async () => ({ participantCode: "P0042", condition: "hlr", cefrLevel: "B1" }) })) },
}));
jest.mock("@/app/models/ReviewLog", () => ({
  __esModule: true,
  default: { find: jest.fn(() => ({ sort: () => ({ select: () => ({ lean: async () => [{ recall: 1, retrievalType: 0 }] }) }) })) },
}));
jest.mock("@/app/models/ResearchDecisionReceipt", () => ({
  __esModule: true,
  default: {
    updateMany: jest.fn(async () => ({})),
    findOne: jest.fn(() => ({ lean: async () => null })),
    create: jest.fn(async (doc: any) => { created.push(doc); return doc; }),
  },
}));
jest.mock("@/app/models/ResearchSm2State", () => ({
  __esModule: true,
  default: { findOne: jest.fn(() => ({ lean: async () => null })) },
}));
jest.mock("@/app/models/ResearchTimingState", () => ({
  __esModule: true,
  default: { findOne: jest.fn(() => ({ lean: async () => null })) },
}));
jest.mock("@/lib/retrievalTasks/session", () => ({
  decideTaskType: (...args: any[]) => decided(...args),
  RETRIEVAL_POLICY_VERSION: "retrieval-policy-v1",
}));
jest.mock("@/lib/retrievalTaskGenerator", () => ({ generateRetrievalTask: (...args: any[]) => generated(...args) }));
jest.mock("@/lib/researchVersion", () => ({ getVersionStamp: () => ({ schedulerVersion: "dart@test", weightsVersion: "default" }), hashPrompt: (prompt: string) => `hash:${prompt}` }));
jest.mock("@/lib/researchDecisionReceipt", () => ({ issueResearchDecisionReceipt: () => issued() }));

import { POST } from "@/app/api/research/schedule/route";

function request(body: any, authorization = "Bearer VALID"): any {
  return { json: async () => body, headers: { get: (key: string) => key === "authorization" ? authorization : null } };
}

describe("POST /api/research/schedule", () => {
  beforeEach(() => {
    created.length = 0;
    generated.mockResolvedValue({ type: 1, prompt: "Fill in ____.", expectedAnswer: "significant" });
    decided.mockClear();
  });

  it("uses the stored arm and returns an opaque receipt without leaking it", async () => {
    const res = await POST(request({ vocabularyId: "w_001" }));
    expect(res.status).toBe(200);
    expect(decided).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ scheduler: "hlr" }));
    expect(created).toHaveLength(1);
    expect(created[0]).toMatchObject({ participantCode: "P0042", vocabularyId: "w_001", condition: "hlr", retrievalType: 1, taskPolicyVersion: "retrieval-policy-v1", heuristicRetrievalType: 1, explorationEpsilon: 0, explorationSelected: false, taskPromptHash: "hash:Fill in ____.", expectedAnswer: "significant", isActive: true });
    const json = await res.json();
    expect(json).toMatchObject({ success: true, decisionReceipt: "opaque.receipt", task: { vocabularyId: "w_001", retrievalType: 1 } });
    expect(JSON.stringify(json)).not.toMatch(/hlr|schedulerVersion|weightsVersion/i);
    expect(JSON.stringify(json)).not.toMatch(/expectedAnswer/i);
    expect(json.task.expectedAnswer).toBeUndefined();
  });

  it("rejects a missing token, malformed input, and unknown word", async () => {
    expect((await POST(request({ vocabularyId: "w_001" }, "Bearer NO"))).status).toBe(401);
    expect((await POST(request({}))).status).toBe(400);
    expect((await POST(request({ vocabularyId: "not-a-word" }))).status).toBe(404);
  });

  it("fails closed if the task generator changes the persisted retrieval type", async () => {
    decided.mockReturnValueOnce({ retrievalType: 2, heuristicRetrievalType: 1, epsilon: 0.20, epsilonDraw: 0.1, explorationSelected: true, explorationEligibleTypes: [0, 1, 2, 3], explorationSelectionDraw: 0.7 });
    generated.mockResolvedValueOnce({ type: 1, prompt: "Fill in ____.", expectedAnswer: "significant" });
    expect((await POST(request({ vocabularyId: "w_001" }))).status).toBe(500);
    expect(created).toHaveLength(0);
  });
});

