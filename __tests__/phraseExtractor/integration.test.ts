import { normalizeText } from "../../lib/phraseExtractor/normalize";
import { splitSentences } from "../../lib/phraseExtractor/sentences";
import { extractPhrases } from "../../lib/phraseExtractor/phraseExtractor";

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

  it("should handle business text", () => {
    const businessText = `
      The company needs to carry out a market analysis.
      In order to increase revenue, we should set up new partnerships.
      According to the quarterly report, profits have increased.
      The team will look into cost reduction strategies.
    `;

    const normalized = normalizeText(businessText);
    const sentences = splitSentences(normalized);
    const phrases = extractPhrases(sentences, { minFreq: 1 });

    expect(phrases.length).toBeGreaterThan(0);
  });
});

describe("Edge Cases", () => {
  it("should handle text with special characters", () => {
    const text = "The cost is $100. In terms of value, it is worth it!";
    const normalized = normalizeText(text);
    const sentences = splitSentences(normalized);
    
    expect(sentences.length).toBeGreaterThanOrEqual(1);
  });

  it("should handle unicode text", () => {
    const text = "The cafe serves coffee. In terms of quality, it is excellent.";
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

  it("should handle very long sentences", () => {
    const longSentence = "In terms of " + "very ".repeat(100) + "long sentences, we handle them.";
    const sentences = splitSentences(longSentence);
    const phrases = extractPhrases(sentences, { minFreq: 1 });

    expect(phrases.some(p => p.normalized === "in terms of")).toBe(true);
  });
});
