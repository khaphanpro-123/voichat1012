import { extractPhrases } from "../../lib/phraseExtractor/phraseExtractor";

describe("Phrase Extractor Module", () => {
  describe("extractPhrases", () => {
    it("should extract prepositional phrases", () => {
      const sentences = [
        "In terms of performance, this is excellent.",
        "Due to the weather, we stayed home.",
        "In terms of quality, it meets standards.",
      ];
      const phrases = extractPhrases(sentences, { minFreq: 1 });
      
      const prepPhrases = phrases.filter(p => p.type === "prep_phrase");
      expect(prepPhrases.length).toBeGreaterThan(0);
      expect(prepPhrases.some(p => p.normalized === "in terms of")).toBe(true);
    });

    it("should extract phrasal verbs", () => {
      const sentences = [
        "We need to carry out the experiment.",
        "They carried out the plan successfully.",
        "Please set up the equipment.",
      ];
      const phrases = extractPhrases(sentences, { minFreq: 1 });
      
      const phrasalVerbs = phrases.filter(p => p.type === "phrasal_verb");
      expect(phrasalVerbs.length).toBeGreaterThan(0);
    });

    it("should respect minFreq config", () => {
      const sentences = [
        "In terms of quality, this is good.",
        "Due to rain, we left early.",
      ];
      const phrases = extractPhrases(sentences, { minFreq: 2 });
      
      const singleOccurrence = phrases.filter(p => p.frequency < 2);
      expect(singleOccurrence.length).toBe(0);
    });

    it("should respect maxPhrases config", () => {
      const sentences = Array(50).fill("In terms of quality and due to circumstances, we proceed.");
      const phrases = extractPhrases(sentences, { maxPhrases: 5 });
      
      expect(phrases.length).toBeLessThanOrEqual(5);
    });

    it("should include example sentences", () => {
      const sentences = [
        "In terms of performance, this is excellent.",
        "In terms of quality, it meets standards.",
      ];
      const phrases = extractPhrases(sentences, { minFreq: 1 });
      
      const inTermsOf = phrases.find(p => p.normalized === "in terms of");
      if (inTermsOf) {
        expect(inTermsOf.examples.length).toBeGreaterThan(0);
      }
    });

    it("should handle empty input", () => {
      const phrases = extractPhrases([]);
      expect(phrases).toEqual([]);
    });

    it("should calculate scores correctly", () => {
      const sentences = [
        "In terms of performance, this is excellent.",
        "In terms of quality, it meets standards.",
        "In terms of cost, it is affordable.",
      ];
      const phrases = extractPhrases(sentences, { minFreq: 1 });
      
      phrases.forEach(p => {
        expect(p.score).toBeGreaterThan(0);
      });
    });
  });
});
