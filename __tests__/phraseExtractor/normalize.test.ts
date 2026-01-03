import {
  normalizeText,
  normalizePhrase,
  fixHyphenation,
  normalizeLigatures,
  collapseWhitespace,
  tokenize,
  isNumber,
  isSingleLetter,
} from "../../lib/phraseExtractor/normalize";

describe("Normalize Module", () => {
  describe("fixHyphenation", () => {
    it("should fix hyphenated words across line breaks", () => {
      expect(fixHyphenation("infor-\nmation")).toBe("information");
      expect(fixHyphenation("develop-\nment")).toBe("development");
    });

    it("should handle multiple hyphenations", () => {
      const text = "The infor-\nmation and develop-\nment are important.";
      expect(fixHyphenation(text)).toBe("The information and development are important.");
    });

    it("should not affect normal hyphens", () => {
      expect(fixHyphenation("well-known")).toBe("well-known");
      expect(fixHyphenation("self-aware")).toBe("self-aware");
    });
  });

  describe("normalizeLigatures", () => {
    it("should convert common ligatures", () => {
      expect(normalizeLigatures("\uFB01le")).toBe("file");
      expect(normalizeLigatures("\uFB02ow")).toBe("flow");
      expect(normalizeLigatures("e\uFB00ect")).toBe("effect");
    });

    it("should handle text without ligatures", () => {
      expect(normalizeLigatures("normal text")).toBe("normal text");
    });
  });

  describe("collapseWhitespace", () => {
    it("should collapse multiple spaces", () => {
      expect(collapseWhitespace("hello    world")).toBe("hello world");
    });

    it("should normalize line endings", () => {
      expect(collapseWhitespace("hello\r\nworld")).toBe("hello\nworld");
    });

    it("should limit consecutive newlines", () => {
      expect(collapseWhitespace("hello\n\n\n\nworld")).toBe("hello\n\nworld");
    });

    it("should replace tabs with spaces", () => {
      expect(collapseWhitespace("hello\tworld")).toBe("hello world");
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

    it("should remove punctuation", () => {
      expect(tokenize("Hello, world!")).toEqual(["hello", "world"]);
    });

    it("should filter empty tokens", () => {
      expect(tokenize("  hello   world  ")).toEqual(["hello", "world"]);
    });
  });

  describe("isNumber", () => {
    it("should detect integers", () => {
      expect(isNumber("123")).toBe(true);
      expect(isNumber("0")).toBe(true);
    });

    it("should detect decimals", () => {
      expect(isNumber("3.14")).toBe(true);
      expect(isNumber("100,000")).toBe(true);
    });

    it("should reject non-numbers", () => {
      expect(isNumber("abc")).toBe(false);
      expect(isNumber("12abc")).toBe(false);
    });
  });

  describe("isSingleLetter", () => {
    it("should detect single letters", () => {
      expect(isSingleLetter("a")).toBe(true);
      expect(isSingleLetter("Z")).toBe(true);
    });

    it("should reject multi-character strings", () => {
      expect(isSingleLetter("ab")).toBe(false);
      expect(isSingleLetter("")).toBe(false);
    });
  });
});
