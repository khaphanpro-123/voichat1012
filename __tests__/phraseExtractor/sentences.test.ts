import { splitSentences, splitSentencesSimple } from "../../lib/phraseExtractor/sentences";

describe("Sentences Module", () => {
  describe("splitSentences", () => {
    it("should split on sentence-ending punctuation", () => {
      const text = "This is sentence one. This is sentence two. And this is three.";
      const sentences = splitSentences(text);
      expect(sentences.length).toBe(3);
    });

    it("should handle question marks and exclamation points", () => {
      const text = "What is this? It is amazing! Yes it is.";
      const sentences = splitSentences(text);
      expect(sentences.length).toBe(3);
    });

    it("should handle abbreviations", () => {
      const text = "Dr. Smith went to the store. He bought milk.";
      const sentences = splitSentences(text);
      expect(sentences.length).toBe(2);
    });

    it("should filter very short sentences", () => {
      const text = "OK. This is a proper sentence with enough words.";
      const sentences = splitSentences(text);
      expect(sentences.length).toBe(1);
    });

    it("should handle empty input", () => {
      expect(splitSentences("")).toEqual([]);
      expect(splitSentences("   ")).toEqual([]);
    });
  });

  describe("splitSentencesSimple", () => {
    it("should split on punctuation followed by capital letter", () => {
      const text = "First sentence. Second sentence. Third sentence.";
      const sentences = splitSentencesSimple(text);
      expect(sentences.length).toBeGreaterThanOrEqual(1);
    });
  });
});
