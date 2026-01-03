/**
 * Core phrase extraction logic
 * Extracts noun phrases, collocations, phrasal verbs, and prepositional phrases
 */

import {
  PREPOSITIONAL_PHRASES,
  PHRASAL_VERBS,
  STOPWORDS,
  NOUN_SUFFIXES,
  ADJECTIVE_SUFFIXES,
} from "./lists";
import { normalizePhrase, tokenize, isNumber, isSingleLetter } from "./normalize";

export type PhraseType = "noun_phrase" | "collocation" | "phrasal_verb" | "prep_phrase";

export interface ExtractedPhrase {
  text: string;
  normalized: string;
  type: PhraseType;
  score: number;
  frequency: number;
  examples: string[];
}

export interface ExtractionConfig {
  minFreq: number;
  maxPhrases: number;
  maxExamplesPerPhrase: number;
  minNgramSize: number;
  maxNgramSize: number;
}

const DEFAULT_CONFIG: ExtractionConfig = {
  minFreq: 2,
  maxPhrases: 200,
  maxExamplesPerPhrase: 3,
  minNgramSize: 2,
  maxNgramSize: 5,
};

interface PhraseCandidate {
  text: string;
  normalized: string;
  type: PhraseType;
  frequency: number;
  examples: Set<string>;
}

// Check if word is a stopword
function isStopword(word: string): boolean {
  return STOPWORDS.has(word.toLowerCase());
}

// Check if word looks like a noun (heuristic)
function looksLikeNoun(word: string): boolean {
  const lower = word.toLowerCase();
  
  // Check noun suffixes
  for (const suffix of NOUN_SUFFIXES) {
    if (lower.endsWith(suffix) && lower.length > suffix.length + 2) {
      return true;
    }
  }
  
  // TitleCase words are often nouns
  if (/^[A-Z][a-z]+$/.test(word)) {
    return true;
  }
  
  return false;
}

// Check if word looks like an adjective (heuristic)
function looksLikeAdjective(word: string): boolean {
  const lower = word.toLowerCase();
  
  for (const suffix of ADJECTIVE_SUFFIXES) {
    if (lower.endsWith(suffix) && lower.length > suffix.length + 2) {
      return true;
    }
  }
  
  return false;
}

// Generate n-grams from tokens
function generateNgrams(tokens: string[], n: number): string[][] {
  const ngrams: string[][] = [];
  for (let i = 0; i <= tokens.length - n; i++) {
    ngrams.push(tokens.slice(i, i + n));
  }
  return ngrams;
}

// Extract prepositional phrases
function extractPrepPhrases(
  sentences: string[],
  candidates: Map<string, PhraseCandidate>
): void {
  for (const sentence of sentences) {
    for (const phrase of PREPOSITIONAL_PHRASES) {
      // Match with word boundaries
      const regex = new RegExp(`\\b${phrase.replace(/\s+/g, "\\s+")}\\b`, "gi");
      const matches = sentence.match(regex);
      
      if (matches) {
        for (const matchedText of matches) {
          const normalized = normalizePhrase(matchedText);
          const existing = candidates.get(normalized);
          
          if (existing) {
            existing.frequency++;
            if (existing.examples.size < DEFAULT_CONFIG.maxExamplesPerPhrase) {
              existing.examples.add(sentence);
            }
          } else {
            candidates.set(normalized, {
              text: matchedText,
              normalized,
              type: "prep_phrase",
              frequency: 1,
              examples: new Set([sentence]),
            });
          }
        }
      }
    }
  }
}

// Extract phrasal verbs
function extractPhrasalVerbs(
  sentences: string[],
  candidates: Map<string, PhraseCandidate>
): void {
  for (const sentence of sentences) {
    for (const phrasal of PHRASAL_VERBS) {
      // Match phrasal verb with word boundaries, allowing for object insertion
      // e.g., "carry out" matches "carry out", "carry it out", "carried out"
      const words = phrasal.split(" ");
      let pattern: string;
      
      if (words.length === 2) {
        // Allow verb conjugation and optional object between
        const verb = words[0];
        const particle = words[1];
        pattern = `\\b(${verb}(?:s|ed|ing|es)?)\\s+(?:\\w+\\s+)?(${particle})\\b`;
      } else {
        // 3-word phrasal verbs - match more strictly
        pattern = `\\b${phrasal.replace(/\s+/g, "\\s+")}\\b`;
      }
      
      const regex = new RegExp(pattern, "gi");
      const matches = sentence.match(regex);
      
      if (matches) {
        for (const _match of matches) {
          const normalized = normalizePhrase(phrasal); // Use canonical form
          const existing = candidates.get(normalized);
          
          if (existing) {
            existing.frequency++;
            if (existing.examples.size < DEFAULT_CONFIG.maxExamplesPerPhrase) {
              existing.examples.add(sentence);
            }
          } else {
            candidates.set(normalized, {
              text: phrasal,
              normalized,
              type: "phrasal_verb",
              frequency: 1,
              examples: new Set([sentence]),
            });
          }
        }
      }
    }
  }
}

// Extract collocations using statistical n-grams
function extractCollocations(
  sentences: string[],
  config: ExtractionConfig,
  candidates: Map<string, PhraseCandidate>
): void {
  // Build frequency maps
  const unigramFreq = new Map<string, number>();
  const ngramFreq = new Map<string, { tokens: string[]; freq: number; sentences: Set<string> }>();
  let totalTokens = 0;
  
  for (const sentence of sentences) {
    const tokens = tokenize(sentence);
    totalTokens += tokens.length;
    
    // Count unigrams
    for (const token of tokens) {
      unigramFreq.set(token, (unigramFreq.get(token) || 0) + 1);
    }
    
    // Generate and count n-grams
    for (let n = config.minNgramSize; n <= config.maxNgramSize; n++) {
      const ngrams = generateNgrams(tokens, n);
      
      for (const ngram of ngrams) {
        // Filter: must have at least one content word
        const hasContentWord = ngram.some((t) => !isStopword(t) && !isNumber(t));
        if (!hasContentWord) continue;
        
        // Filter: cannot start or end with stopword
        if (isStopword(ngram[0]) || isStopword(ngram[ngram.length - 1])) continue;
        
        // Filter: no numbers or single letters
        if (ngram.some((t) => isNumber(t) || isSingleLetter(t))) continue;
        
        const key = ngram.join(" ");
        const existing = ngramFreq.get(key);
        
        if (existing) {
          existing.freq++;
          if (existing.sentences.size < config.maxExamplesPerPhrase) {
            existing.sentences.add(sentence);
          }
        } else {
          ngramFreq.set(key, {
            tokens: ngram,
            freq: 1,
            sentences: new Set([sentence]),
          });
        }
      }
    }
  }
  
  // Calculate PMI-like scores and filter
  const N = totalTokens;
  
  for (const [key, data] of ngramFreq) {
    if (data.freq < config.minFreq) continue;
    
    // Skip if already exists as higher-priority type
    const normalized = normalizePhrase(key);
    if (candidates.has(normalized)) continue;
    
    // Calculate simplified PMI score
    const tokens = data.tokens;
    let score: number;
    
    if (tokens.length === 2) {
      // Bigram PMI
      const f1 = unigramFreq.get(tokens[0]) || 1;
      const f2 = unigramFreq.get(tokens[1]) || 1;
      score = Math.log2((data.freq * N) / (f1 * f2 + 1));
    } else {
      // For longer n-grams, use average pairwise PMI
      let pmiSum = 0;
      let pairCount = 0;
      
      for (let i = 0; i < tokens.length - 1; i++) {
        const f1 = unigramFreq.get(tokens[i]) || 1;
        const f2 = unigramFreq.get(tokens[i + 1]) || 1;
        pmiSum += Math.log2((data.freq * N) / (f1 * f2 + 1));
        pairCount++;
      }
      
      score = pairCount > 0 ? pmiSum / pairCount : 0;
    }
    
    // Only keep positive PMI (indicates association)
    if (score > 0) {
      candidates.set(normalized, {
        text: key,
        normalized,
        type: "collocation",
        frequency: data.freq,
        examples: data.sentences,
      });
    }
  }
}

// Extract noun-phrase-like candidates (heuristic)
function extractNounPhrases(
  sentences: string[],
  config: ExtractionConfig,
  candidates: Map<string, PhraseCandidate>
): void {
  const nounPhraseFreq = new Map<string, { text: string; freq: number; sentences: Set<string> }>();
  
  for (const sentence of sentences) {
    const tokens = tokenize(sentence);
    
    // Generate n-grams of size 2-6
    for (let n = 2; n <= Math.min(6, config.maxNgramSize); n++) {
      const ngrams = generateNgrams(tokens, n);
      
      for (const ngram of ngrams) {
        // Last token should not be a stopword
        if (isStopword(ngram[ngram.length - 1])) continue;
        
        // Must contain at least one noun-ish word
        const hasNoun = ngram.some((t) => looksLikeNoun(t));
        if (!hasNoun) continue;
        
        // Allow adjective-ish tokens
        const validTokens = ngram.every(
          (t) => !isStopword(t) || looksLikeAdjective(t) || looksLikeNoun(t)
        );
        if (!validTokens) continue;
        
        // No numbers or single letters
        if (ngram.some((t) => isNumber(t) || isSingleLetter(t))) continue;
        
        const key = ngram.join(" ");
        const existing = nounPhraseFreq.get(key);
        
        if (existing) {
          existing.freq++;
          if (existing.sentences.size < config.maxExamplesPerPhrase) {
            existing.sentences.add(sentence);
          }
        } else {
          nounPhraseFreq.set(key, {
            text: key,
            freq: 1,
            sentences: new Set([sentence]),
          });
        }
      }
    }
  }
  
  // Add noun phrases that aren't already captured
  for (const [key, data] of nounPhraseFreq) {
    if (data.freq < config.minFreq) continue;
    
    const normalized = normalizePhrase(key);
    if (candidates.has(normalized)) continue;
    
    candidates.set(normalized, {
      text: key,
      normalized,
      type: "noun_phrase",
      frequency: data.freq,
      examples: data.sentences,
    });
  }
}

// Main extraction function
export function extractPhrases(
  sentences: string[],
  config: Partial<ExtractionConfig> = {}
): ExtractedPhrase[] {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const candidates = new Map<string, PhraseCandidate>();
  
  // Extract in priority order (higher priority types won't be overwritten)
  extractPrepPhrases(sentences, candidates);
  extractPhrasalVerbs(sentences, candidates);
  extractCollocations(sentences, cfg, candidates);
  extractNounPhrases(sentences, cfg, candidates);
  
  // Convert to output format and calculate final scores
  const results: ExtractedPhrase[] = [];
  
  for (const candidate of candidates.values()) {
    if (candidate.frequency < cfg.minFreq) continue;
    
    // Calculate score based on type priority, frequency, and length
    const typePriority: Record<PhraseType, number> = {
      prep_phrase: 4,
      phrasal_verb: 3,
      noun_phrase: 2,
      collocation: 1,
    };
    
    const lengthBonus = candidate.text.split(" ").length * 0.3;
    const freqBonus = Math.log2(candidate.frequency + 1);
    const score = typePriority[candidate.type] + lengthBonus + freqBonus;
    
    results.push({
      text: candidate.text,
      normalized: candidate.normalized,
      type: candidate.type,
      score: Math.round(score * 100) / 100,
      frequency: candidate.frequency,
      examples: Array.from(candidate.examples).slice(0, cfg.maxExamplesPerPhrase),
    });
  }
  
  // Sort by score desc, then frequency desc
  results.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return b.frequency - a.frequency;
  });
  
  // Return top N phrases
  return results.slice(0, cfg.maxPhrases);
}
