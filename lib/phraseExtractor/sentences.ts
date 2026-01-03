/**
 * Sentence boundary detection
 */

// Simple but effective sentence splitter
// Handles common abbreviations and edge cases
const ABBREVIATIONS = new Set([
  "mr", "mrs", "ms", "dr", "prof", "sr", "jr", "vs", "etc", "inc", "ltd",
  "co", "corp", "st", "ave", "blvd", "rd", "dept", "univ", "assn", "bros",
  "ph.d", "m.d", "b.a", "m.a", "d.d.s", "e.g", "i.e", "cf", "al", "ed",
  "vol", "rev", "est", "approx", "govt", "no", "nos", "fig", "figs",
]);

export function splitSentences(text: string): string[] {
  const sentences: string[] = [];
  
  // Pre-process: protect abbreviations
  let processed = text;
  
  // Split on sentence-ending punctuation followed by space and capital letter
  // or end of string
  const sentencePattern = /[^.!?]*[.!?]+(?:\s+|$)/g;
  const matches = processed.match(sentencePattern);
  
  if (!matches) {
    // No sentence-ending punctuation found, return whole text as one sentence
    const trimmed = text.trim();
    return trimmed ? [trimmed] : [];
  }
  
  let currentSentence = "";
  
  for (const match of matches) {
    const trimmed = match.trim();
    if (!trimmed) continue;
    
    // Check if this ends with an abbreviation
    const words = trimmed.split(/\s+/);
    const lastWord = words[words.length - 1]?.toLowerCase().replace(/[.!?]+$/, "");
    
    if (ABBREVIATIONS.has(lastWord) && !trimmed.endsWith("?") && !trimmed.endsWith("!")) {
      // This is likely an abbreviation, not end of sentence
      currentSentence += (currentSentence ? " " : "") + trimmed;
    } else {
      currentSentence += (currentSentence ? " " : "") + trimmed;
      if (currentSentence.trim()) {
        sentences.push(currentSentence.trim());
      }
      currentSentence = "";
    }
  }
  
  // Add any remaining text
  if (currentSentence.trim()) {
    sentences.push(currentSentence.trim());
  }
  
  // Filter out very short "sentences" (likely noise)
  return sentences.filter((s) => s.length >= 10 && s.split(/\s+/).length >= 3);
}

// Alternative: more aggressive sentence splitting for cleaner results
export function splitSentencesSimple(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+(?=[A-Z])/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 10);
}
