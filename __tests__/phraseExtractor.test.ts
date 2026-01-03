/**
 * Phrase Extractor Unit Tests
 */

import {
  normalizeText,
  normalizePhrase,
  fixHyphenation,
  normalizeLigatures,
  collapseWhitespace,
  tokenize,
  isNumber,
  isSingleLetter,
} from "../lib/phraseExtractor/normalize";

import { splitSentences, splitSentencesSimple } from "../lib/phraseExtractor/sentences";

import { extractPhrases } from "../lib/phraseExtractor/phraseExtractor";

import {
  PREPOSITIONAL_PHRASES,
  PHRASAL_VERBS,
  STOPWORDS,
} from "../lib/phraseExtractor/lists";

// NORMALIZE TESTS
describe("Normalize Module", () => {
  describe("fixHyphenation", () => {
    it("should fix hyphenated words across line breaks", () => {
      expect(fixHyphenation("infor-\nmation")).toBe("information");
      expect(fixHyphenation("develop-\nment")).toBe("development");
    });

    it("should not affect normal hyphens", () => {
      expect(fixHyphenation("well-known")).toBe("well-known");
    });
  });

  describe("normalizeLigatures", () => {
    it("should convert common ligatures", () => {
      expect(normalizeLigatures("\uFB01le")).toBe("file");
      expect(normalizeLigatures("\uFB02ow")).toBe("flow");
    });
  });

  describe("collapseWhitespace", () => {
    it("should collapse multiple spaces", () => {
      expect(collapseWhitespace("hello    world")).toBe("hello world");
    });

    it("should normalize line endings", () => {
      expect(collapseWhitespace("hello\r\nworld")).toBe("hello\nworld");
    });
  });

  describe("normalizeText", () => {
    it("should apply all normalizations", () => {
      const text = "The infor-\nmation is   important\t\tfor \uFB01les.";
      const result = normalizeText(text);
      expect(result).toBe("The information is important for files.");
    });
  });

  describe("normalizePhrase", () => {
    it("should lowercase and collapse spaces", () => {
      expect(normalizePhrase("In Terms Of")).toBe("in terms of");
      expect(normalizePhrase("  carry   out  ")).toBe("carry out");
    });
  });

  describe("tokenize", () => {
    it("should split text into lowercase tokens", () => {
      expect(tokenize("Hello World")).toEqual(["hello", "world"]);
    });

    it("should keep apostrophes", () => {
      expect(tokenize("don't it's")).toEqual(["don't", "it's"]);
    });
  });

  describe("isNumber and isSingleLetter", () => {
    it("should detect numbers", () => {
      expect(isNumber("123")).toBe(true);
      expect(isNumber("abc")).toBe(false);
    });

    it("should detect single letters", () => {
      expect(isSingleLetter("a")).toBe(true);
      expect(isSingleLetter("ab")).toBe(false);
    });
  });
});


// SENTENCES TESTS
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

    it("should handle empty input", () => {
      expect(splitSentences("")).toEqual([]);
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

// PHRASE EXTRACTOR TESTS
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

    it("should handle empty input", () => {
      const phrases = extractPhrases([]);
      expect(phrases).toEqual([]);
    });

    it("should calculate scores correctly", () => {
      const sentences = [
        "In terms of performance, this is excellent.",
        "In terms of quality, it meets standards.",
      ];
      const phrases = extractPhrases(sentences, { minFreq: 1 });
      
      phrases.forEach(p => {
        expect(p.score).toBeGreaterThan(0);
      });
    });
  });
});


// LISTS TESTS
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

// INTEGRATION TESTS
describe("Integration Tests", () => {
  it("should process a complete document flow", () => {
    const rawText = `
      In terms of software development, best practices are essential.
      Due to the complexity of modern systems, we need to carry out
      thorough testing. Risk management helps identify potential issues.
      
      According to recent studies, code quality improves with reviews.
      Teams should set up automated testing pipelines. In terms of
      efficiency, this approach saves time and reduces bugs.
    `;

    const normalized = normalizeText(rawText);
    expect(normalized.length).toBeGreaterThan(0);

    const sentences = splitSentences(normalized);
    expect(sentences.length).toBeGreaterThan(0);

    const phrases = extractPhrases(sentences, { minFreq: 1 });
    expect(phrases.length).toBeGreaterThan(0);

    const types = new Set(phrases.map(p => p.type));
    expect(types.size).toBeGreaterThan(0);
  });

  it("should handle academic text", () => {
    const academicText = `
      The research methodology was based on quantitative analysis.
      In accordance with ethical guidelines, participants gave consent.
      The results indicate that, in terms of statistical significance,
      the hypothesis was supported. Due to limitations in sample size,
      further research is recommended.
    `;

    const normalized = normalizeText(academicText);
    const sentences = splitSentences(normalized);
    const phrases = extractPhrases(sentences, { minFreq: 1 });

    expect(phrases.some(p => p.type === "prep_phrase")).toBe(true);
  });
});

// EDGE CASES
describe("Edge Cases", () => {
  it("should handle text with special characters", () => {
    const text = "The cost is $100. In terms of value, it's worth it!";
    const normalized = normalizeText(text);
    const sentences = splitSentences(normalized);
    
    expect(sentences.length).toBeGreaterThanOrEqual(1);
  });

  it("should handle unicode text", () => {
    const text = "The cafe serves coffee. In terms of quality, it's excellent.";
    const normalized = normalizeText(text);
    
    expect(normalized).toContain("cafe");
  });

  it("should handle mixed case", () => {
    const text = "IN TERMS OF PERFORMANCE, this is EXCELLENT.";
    const normalized = normalizeText(text);
    const sentences = splitSentences(normalized);
    const phrases = extractPhrases(sentences, { minFreq: 1 });

    const inTermsOf = phrases.find(p => p.normalized === "in terms of");
    expect(inTermsOf).toBeDefined();
  });
});
