// __tests__/experimentBlinding.test.ts

import {
  toOpaque,
  fromOpaque,
  sanitiseForClient,
  sanitiseJudgePrompt,
  detectLeaks,
} from "@/lib/experimentBlinding";

describe("opaque mapping", () => {
  it("maps sm2/hlr/dart → A/B/C", () => {
    expect(toOpaque("sm2")).toBe("A");
    expect(toOpaque("hlr")).toBe("B");
    expect(toOpaque("dart")).toBe("C");
  });

  it("inverse recovers original", () => {
    expect(fromOpaque("A")).toBe("sm2");
    expect(fromOpaque("B")).toBe("hlr");
    expect(fromOpaque("C")).toBe("dart");
  });

  it("fromOpaque returns null for unknown labels", () => {
    expect(fromOpaque("Z")).toBeNull();
    expect(fromOpaque("")).toBeNull();
  });
});

describe("sanitiseForClient", () => {
  it("drops telltale keys at any depth", () => {
    const payload = {
      user: "u1",
      condition: "dart",
      nested: { scheduler: "hlr", weightsVersion: "abc123def456" },
      items: [{ arm: "sm2", ok: true }],
    };
    const clean = sanitiseForClient(payload) as any;
    expect(clean.condition).toBeUndefined();
    expect(clean.nested.scheduler).toBeUndefined();
    expect(clean.nested.weightsVersion).toBeUndefined();
    expect(clean.items[0].arm).toBeUndefined();
    expect(clean.items[0].ok).toBe(true);
    expect(clean.user).toBe("u1");
  });

  it("redacts telltale VALUES when the ENTIRE string matches", () => {
    // Whole-word match: value === telltale → redacted
    expect((sanitiseForClient({ picked: "dart" }) as any).picked).toBe("[redacted]");
    expect((sanitiseForClient({ picked: "HLR" }) as any).picked).toBe("[redacted]");
    // Non-match: string CONTAINS the arm name but isn't equal
    // Current limitation: this is NOT redacted. Route handlers must not embed
    // arm names in longer strings — the type system doesn't catch this.
    const containing = { hint: "you are on dart" };
    expect((sanitiseForClient(containing) as any).hint).toBe("you are on dart");
  });

  it("returns primitives unchanged when non-telltale", () => {
    expect(sanitiseForClient("hello")).toBe("hello");
    expect(sanitiseForClient(42)).toBe(42);
    expect(sanitiseForClient(null)).toBeNull();
  });
});

describe("sanitiseJudgePrompt", () => {
  it("replaces arm names with [system]", () => {
    const p = "The dart scheduler said this; hlr disagreed.";
    const clean = sanitiseJudgePrompt(p);
    expect(clean.toLowerCase()).not.toContain("dart");
    expect(clean.toLowerCase()).not.toContain("hlr");
    expect(clean).toContain("[system]");
  });

  it("is case-insensitive", () => {
    expect(sanitiseJudgePrompt("SM2 chose this")).not.toMatch(/sm2/i);
  });
});

describe("detectLeaks", () => {
  it("returns empty list for clean payload", () => {
    expect(detectLeaks({ safe: "hello", n: 1 })).toEqual([]);
  });

  it("flags telltale keys", () => {
    const leaks = detectLeaks({ condition: "dart", inner: { scheduler: "sm2" } });
    expect(leaks.length).toBeGreaterThanOrEqual(2);
    expect(leaks.some((l) => l.includes("condition"))).toBe(true);
    expect(leaks.some((l) => l.includes("scheduler"))).toBe(true);
  });

  it("flags telltale VALUES in arrays", () => {
    const leaks = detectLeaks({ tags: ["ok", "dart"] });
    expect(leaks.length).toBe(1);
    expect(leaks[0]).toContain("tags[1]");
  });
});
