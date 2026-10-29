// __tests__/researchPretestItemsRoute.test.ts
//
// Tests for GET /api/research/pretest/items — the public CEFR placement test
// item server (no auth required).
//
// Locks the following invariants:
//   (1) Returns 20 items with expected shape.
//   (2) Blinding: `correctIndex` MUST NOT leak in any item.
//   (3) Each item has 4 options.
//   (4) Band distribution: 8 A2 + 6 B1 + 6 B2 = 20.
//   (5) All item IDs are unique and follow "pt_XX" format.

import { GET } from "@/app/api/research/pretest/items/route";

describe("GET /api/research/pretest/items", () => {
  it("returns 20 items with success:true", async () => {
    const res = GET();
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.success).toBe(true);
    expect(body.totalItems).toBe(20);
    expect(body.items).toHaveLength(20);
  });

  it("does not leak correctIndex (blinding)", async () => {
    const body = await GET().json();

    for (const item of body.items) {
      expect(item).not.toHaveProperty("correctIndex");
    }
  });

  it("every item has id, word, options (4 each), and band", async () => {
    const body = await GET().json();

    for (const item of body.items) {
      expect(item.id).toMatch(/^pt_\d{2}$/);
      expect(typeof item.word).toBe("string");
      expect(item.word.length).toBeGreaterThan(0);
      expect(item.options).toHaveLength(4);
      for (const opt of item.options) {
        expect(typeof opt).toBe("string");
      }
      expect(["A2", "B1", "B2"]).toContain(item.band);
    }
  });

  it("has correct band distribution: 8 A2 + 6 B1 + 6 B2", async () => {
    const body = await GET().json();
    const counts = { A2: 0, B1: 0, B2: 0 };
    for (const item of body.items) {
      counts[item.band as keyof typeof counts]++;
    }
    expect(counts.A2).toBe(8);
    expect(counts.B1).toBe(6);
    expect(counts.B2).toBe(6);
  });

  it("has unique item IDs", async () => {
    const body = await GET().json();
    const ids = body.items.map((i: { id: string }) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("includes scoring rubric description", async () => {
    const body = await GET().json();
    expect(body.scoring).toBeDefined();
    expect(typeof body.scoring.description).toBe("string");
  });
});
