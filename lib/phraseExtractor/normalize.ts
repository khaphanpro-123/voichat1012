/**
 * Text normalization utilities
 */

// Fix hyphenation across line breaks: "infor-\nmation" => "information"
export function fixHyphenation(text: string): string {
  // Match word-hyphen-newline-word pattern
  return text.replace(/(\w+)-\s*\n\s*(\w+)/g, "$1$2");
}

// Normalize ligatures
export function normalizeLigatures(text: string): string {
  const ligatureMap: Record<string, string> = {
    "\uFB01": "fi", // ﬁ
    "\uFB02": "fl", // ﬂ
    "\uFB00": "ff", // ﬀ
    "\uFB03": "ffi", // ﬃ
    "\uFB04": "ffl", // ﬄ
    "\u0132": "IJ", // Ĳ
    "\u0133": "ij", // ĳ
    "\u0152": "OE", // Œ
    "\u0153": "oe", // œ
    "\u00C6": "AE", // Æ
    "\u00E6": "ae", // æ
  };

  let result = text;
  for (const [ligature, replacement] of Object.entries(ligatureMap)) {
    result = result.replace(new RegExp(ligature, "g"), replacement);
  }
  return result;
}

// Collapse excessive whitespace while preserving sentence structure
export function collapseWhitespace(text: string): string {
  return text
    .replace(/\r\n/g, "\n") // Normalize line endings
    .replace(/\t/g, " ") // Replace tabs with spaces
    .replace(/ +/g, " ") // Collapse multiple spaces
    .replace(/\n{3,}/g, "\n\n") // Max 2 newlines
    .trim();
}

// Full text normalization pipeline
export function normalizeText(text: string): string {
  let result = text;
  result = fixHyphenation(result);
  result = normalizeLigatures(result);
  result = collapseWhitespace(result);
  return result;
}

// Normalize phrase for deduplication (lowercase, collapse spaces)
export function normalizePhrase(phrase: string): string {
  return phrase.toLowerCase().replace(/\s+/g, " ").trim();
}

// Tokenize text into words (keep apostrophes, drop most punctuation)
export function tokenize(text: string): string[] {
  // Keep words with apostrophes (don't, it's, etc.)
  return text
    .toLowerCase()
    .replace(/[^\w\s'-]/g, " ") // Remove punctuation except apostrophe and hyphen
    .split(/\s+/)
    .filter((token) => token.length > 0 && !/^[-']+$/.test(token));
}

// Check if token looks like a number
export function isNumber(token: string): boolean {
  return /^\d+([.,]\d+)?$/.test(token);
}

// Check if token is single letter
export function isSingleLetter(token: string): boolean {
  return token.length === 1;
}
