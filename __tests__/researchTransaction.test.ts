import { runResearchTransaction } from "@/lib/researchTransaction";

describe("runResearchTransaction", () => {
  it("runs work inside one transaction and always releases the session", async () => {
    const session = {
      withTransaction: jest.fn(async (work: any) => work()),
      endSession: jest.fn(async () => {}),
    };
    const result = await runResearchTransaction({ startSession: async () => session }, async () => "committed");
    expect(result).toBe("committed");
    expect(session.withTransaction).toHaveBeenCalledTimes(1);
    expect(session.endSession).toHaveBeenCalledTimes(1);
  });

  it("releases the session when the transaction callback fails", async () => {
    const session = {
      withTransaction: jest.fn(async (work: any) => work()),
      endSession: jest.fn(async () => {}),
    };
    await expect(runResearchTransaction({ startSession: async () => session }, async () => {
      throw new Error("write failed");
    })).rejects.toThrow("write failed");
    expect(session.endSession).toHaveBeenCalledTimes(1);
  });
});

