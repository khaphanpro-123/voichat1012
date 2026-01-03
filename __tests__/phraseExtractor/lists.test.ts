import {
  PREPOSITIONAL_PHRASES,
  PHRASAL_VERBS,
  STOPWORDS,
} from "../../lib/phraseExtractor/lists";

describe("Lists Module", () => {
  describe("PREPOSITIONAL_PHRASES", () => {
    it("should contain common prepositional phrases", () => {
      expect(PREPOSITIONAL_PHRASES).toContain("in terms of");
      expect(PREPOSITIONAL_PHRASES).toContain("due to");
      expect(PREPOSITIONAL_PHRASES).toContain("according to");
    });

    it("should have reasonable count", () => {
      expect(PREPOSITIONAL_PHRASES.length).toBeGreaterThan(30);
    });
  });

  describe("PHRASAL_VERBS", () => {
    it("should contain common phrasal verbs", () => {
      expect(PHRASAL_VERBS).toContain("carry out");
      expect(PHRASAL_VERBS).toContain("set up");
      expect(PHRASAL_VERBS).toContain("come up with");
    });

    it("should have reasonable count", () => {
      expect(PHRASAL_VERBS.length).toBeGreaterThan(80);
    });
  });

  describe("STOPWORDS", () => {
    it("should contain common stopwords", () => {
      expect(STOPWORDS.has("the")).toBe(true);
      expect(STOPWORDS.has("and")).toBe(true);
      expect(STOPWORDS.has("is")).toBe(true);
    });

    it("should have reasonable count", () => {
      expect(STOPWORDS.size).toBeGreaterThan(100);
    });
  });
});
