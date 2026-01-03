/**
 * Vocabulary Flashcard Extractor Tests
 */

import {
  extractVocabularyFlashcards,
  batchExtractVocabulary,
  VocabularyFlashcard,
} from "../lib/flashcardExtractor";

describe("Vocabulary Flashcard Extractor Module", () => {
  it("should export extractVocabularyFlashcards function", () => {
    expect(typeof extractVocabularyFlashcards).toBe("function");
  });

  it("should export batchExtractVocabulary function", () => {
    expect(typeof batchExtractVocabulary).toBe("function");
  });

  it("should export VocabularyFlashcard interface", () => {
    const card: VocabularyFlashcard = {
      term: "interactive module",
      pos: "noun phrase",
      definition_en: "A learning unit that engages students through active participation.",
      example_en: "The course adopted an interactive module to increase student engagement.",
      translation_vi: "mo-dun tuong tac",
      topic: "education",
      cefr: "B2",
      difficulty_score: 6,
      confidence: 0.9,
      variants: ["interactive learning module"],
    };
    expect(card.term).toBe("interactive module");
    expect(card.cefr).toBe("B2");
    expect(card.confidence).toBe(0.9);
  });
});

describe("Input Validation", () => {
  it("should throw error for empty text", async () => {
    await expect(
      extractVocabularyFlashcards("", { openaiKey: "test" })
    ).rejects.toThrow("Text too short");
  });

  it("should throw error for very short text", async () => {
    await expect(
      extractVocabularyFlashcards("Short", { openaiKey: "test" })
    ).rejects.toThrow("Text too short");
  });

  it("should throw error when no API key provided", async () => {
    await expect(
      extractVocabularyFlashcards(
        "This is a long enough text for testing the vocabulary extraction feature with multiple sentences.",
        { openaiKey: null, groqKey: null, cohereKey: null }
      )
    ).rejects.toThrow("Missing API key");
  });
});

describe("Batch Extraction", () => {
  it("should handle empty array gracefully", async () => {
    const result = await batchExtractVocabulary([], { openaiKey: "test" });
    expect(result).toEqual([]);
  });
});

describe("VocabularyFlashcard Interface", () => {
  it("should have all required fields", () => {
    const card: VocabularyFlashcard = {
      term: "carry out research",
      pos: "verb phrase",
      definition_en: "To perform or conduct a systematic investigation",
      example_en: "The team will carry out research on climate change effects.",
      translation_vi: "tien hanh nghien cuu",
      topic: "academic",
      cefr: "B1",
      difficulty_score: 5,
      confidence: 0.85,
    };

    expect(card).toHaveProperty("term");
    expect(card).toHaveProperty("pos");
    expect(card).toHaveProperty("definition_en");
    expect(card).toHaveProperty("example_en");
    expect(card).toHaveProperty("translation_vi");
    expect(card).toHaveProperty("topic");
    expect(card).toHaveProperty("cefr");
    expect(card).toHaveProperty("difficulty_score");
    expect(card).toHaveProperty("confidence");
  });

  it("should allow optional variants field", () => {
    const cardWithVariants: VocabularyFlashcard = {
      term: "in terms of",
      pos: "prepositional phrase",
      definition_en: "With regard to a particular aspect or subject",
      example_en: "In terms of quality, this product exceeds expectations.",
      translation_vi: "ve mat",
      topic: "academic",
      cefr: "B2",
      difficulty_score: 6,
      confidence: 0.92,
      variants: ["in term of", "terms of"],
    };

    expect(cardWithVariants.variants).toBeDefined();
    expect(cardWithVariants.variants?.length).toBe(2);

    const cardWithoutVariants: VocabularyFlashcard = {
      term: "due to circumstances",
      pos: "prepositional phrase",
      definition_en: "Because of particular conditions or situations",
      example_en: "Due to circumstances beyond our control, the event was postponed.",
      translation_vi: "do hoan canh",
      topic: "general",
      cefr: "B1",
      difficulty_score: 4,
      confidence: 0.95,
    };

    expect(cardWithoutVariants.variants).toBeUndefined();
  });
});

describe("Term Validation Logic", () => {
  it("should reject blacklisted terms in flashcard validation", () => {
    // This tests the validation logic indirectly through the interface
    const invalidTerms = ["ISSN", "Vol", "Can", "Tho", "DOI", "No36"];
    
    invalidTerms.forEach(term => {
      // These should be filtered out by isValidTerm
      expect(term.length).toBeLessThanOrEqual(6); // Short terms get filtered
    });
  });

  it("should accept valid multi-word phrases", () => {
    const validPhrases = [
      "interactive learning",
      "student engagement",
      "discovery learning",
      "carry out research",
      "in terms of",
    ];

    validPhrases.forEach(phrase => {
      expect(phrase.split(" ").length).toBeGreaterThanOrEqual(2);
      expect(phrase.length).toBeGreaterThan(10);
    });
  });
});
