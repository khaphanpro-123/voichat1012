// Vocabulary Flashcard Extractor Module
// Extracts contextual vocabulary phrases from academic/educational documents

export interface VocabularyFlashcard {
  term: string;
  pos: string;
  definition_en: string;
  example_en: string;
  translation_vi: string;
  topic: string;
  cefr: string;
  difficulty_score: number;
  confidence: number;
  variants?: string[];
}

export interface ExtractionConfig {
  openaiKey?: string | null;
  groqKey?: string | null;
  cohereKey?: string | null;
}

export interface ExtractionOptions {
  maxTerms?: number;
  minConfidence?: number;
  targetCEFR?: string[];
  topic?: string; // Optional topic filter
}

// Blacklist of terms to filter out
const BLACKLIST_TERMS = new Set([
  "issn", "isbn", "doi", "vol", "no", "pp", "et", "al", "fig", "table",
  "can", "tho", "jl", "no36", "http", "https", "www", "com", "org", "edu",
  "pdf", "doc", "docx", "xlsx", "ppt", "jpg", "png", "gif",
  "january", "february", "march", "april", "may", "june",
  "july", "august", "september", "october", "november", "december",
  "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday",
]);

// Patterns to clean from text before sending to AI
const METADATA_PATTERNS: RegExp[] = [
  /ISSN[\s:]*[\d-]+/gi,
  /ISBN[\s:]*[\d-]+/gi,
  /DOI[\s:]*[\w./-]+/gi,
  /Vol\.?\s*\d+/gi,
  /No\.?\s*\d+/gi,
  /pp\.?\s*\d+[-–]\d+/gi,
  /©\s*\d{4}/gi,
  /\b\d{4}\s*[-–]\s*\d{4}\b/g, // Year ranges
  /https?:\/\/[^\s]+/gi, // URLs
  /\b[A-Z][a-z]+\s+University\b/gi, // University names
  /\b[A-Z][a-z]+\s+College\b/gi, // College names
];


/**
 * Clean text by removing metadata, URLs, and other noise
 */
function cleanText(text: string): string {
  let cleaned = text;
  for (const pattern of METADATA_PATTERNS) {
    cleaned = cleaned.replace(pattern, " ");
  }
  // Collapse whitespace
  return cleaned.replace(/\s+/g, " ").trim();
}

/**
 * Validate if a term is worth keeping
 */
function isValidTerm(term: string): boolean {
  if (!term || typeof term !== "string") return false;
  
  const normalized = term.toLowerCase().trim();
  
  // Too short (less than 4 chars) or too long (more than 50 chars)
  if (normalized.length < 4 || normalized.length > 50) return false;
  
  // Single word that's too short
  const words = normalized.split(/\s+/);
  if (words.length === 1 && normalized.length < 5) return false;
  
  // In blacklist
  if (BLACKLIST_TERMS.has(normalized)) return false;
  
  // Any word in blacklist
  if (words.some(w => BLACKLIST_TERMS.has(w))) return false;
  
  // Pure numbers or codes
  if (/^\d+$/.test(normalized)) return false;
  if (/^[a-z]\d+$/i.test(normalized)) return false;
  if (/^\d+[a-z]$/i.test(normalized)) return false;
  
  // Contains only special characters
  if (/^[^a-zA-Z]+$/.test(normalized)) return false;
  
  // Looks like a code (e.g., "ABC123", "No36")
  if (/^[A-Z]{2,}\d+$/i.test(normalized)) return false;
  
  // Contains email-like patterns
  if (/@/.test(normalized)) return false;
  
  // Contains URL-like patterns
  if (/\.(com|org|edu|net|gov)/i.test(normalized)) return false;
  
  return true;
}

/**
 * Validate flashcard has all required fields with reasonable values
 */
function isValidFlashcard(card: VocabularyFlashcard): boolean {
  if (!isValidTerm(card.term)) return false;
  
  // Must have meaningful definition (at least 10 chars)
  if (!card.definition_en || card.definition_en.length < 10) return false;
  
  // Must have example sentence (at least 15 chars)
  if (!card.example_en || card.example_en.length < 15) return false;
  
  // Must have Vietnamese translation
  if (!card.translation_vi || card.translation_vi.length < 2) return false;
  
  // Confidence must be reasonable
  if (typeof card.confidence !== "number" || card.confidence < 0.5) return false;
  
  // CEFR must be valid
  const validCEFR = ["A1", "A2", "B1", "B2", "C1", "C2"];
  if (!validCEFR.includes(card.cefr)) return false;
  
  return true;
}


/**
 * Build improved prompt for contextual vocabulary extraction
 */
function buildPrompt(text: string, maxTerms: number, topic?: string): string {
  const truncated = text.substring(0, 4000);
  const topicHint = topic ? `Focus on vocabulary related to: ${topic}.` : "";
  
  return `You are an expert NLP system specialized in creating educational flashcards from academic documents.

TASK: Analyze the text below and extract ${maxTerms} meaningful vocabulary PHRASES (not single words) that are valuable for English learners.

REQUIREMENTS:
1. Extract MULTI-WORD phrases: noun phrases, collocations, phrasal verbs, idiomatic expressions
   - Good examples: "interactive module", "student interest", "discovery learning", "carry out research", "in terms of"
   - Bad examples: "ISSN", "Vol", "Can", "Tho", "2024", single common words

2. SKIP these completely:
   - Metadata: ISSN, ISBN, DOI, Vol, No, pp, page numbers
   - Proper nouns: person names, city names, university names
   - Codes and numbers: No36, ABC123, dates
   - Single common words: "the", "is", "have", "make"

3. For each phrase, provide:
   - term: the exact phrase as it appears (2-5 words preferred)
   - pos: "noun phrase" | "verb phrase" | "phrasal verb" | "collocation" | "prepositional phrase" | "idiom"
   - definition_en: clear, concise English definition (15-50 words)
   - example_en: a natural example sentence using the phrase IN CONTEXT from the document
   - translation_vi: accurate Vietnamese translation
   - topic: category (education, technology, business, science, health, etc.)
   - cefr: difficulty level (A1, A2, B1, B2, C1, C2)
   - difficulty_score: 1-10 (1=easiest, 10=hardest)
   - confidence: 0.6-1.0 (how confident you are this is a useful phrase)
   - variants: array of related forms if any

${topicHint}

TEXT TO ANALYZE:
"""
${truncated}
"""

IMPORTANT: Return ONLY a valid JSON array. No explanations, no markdown, just the array.
Example format:
[
  {
    "term": "interactive learning",
    "pos": "noun phrase",
    "definition_en": "A teaching approach where students actively participate rather than passively receive information",
    "example_en": "The course uses interactive learning to engage students in problem-solving activities.",
    "translation_vi": "học tập tương tác",
    "topic": "education",
    "cefr": "B2",
    "difficulty_score": 6,
    "confidence": 0.9,
    "variants": ["interactive teaching", "interactive education"]
  }
]`;
}


/**
 * Call OpenAI API
 */
async function callOpenAI(prompt: string, apiKey: string): Promise<string> {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are an expert vocabulary extraction system. Always return valid JSON arrays only.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.3,
      max_tokens: 3000,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error ${response.status}: ${error}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
}

/**
 * Call Groq API (free, fast)
 */
async function callGroq(prompt: string, apiKey: string): Promise<string> {
  const response = await fetch(
    "https://api.groq.com/openai/v1/chat/completions",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content: "You are an expert vocabulary extraction system. Always return valid JSON arrays only.",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.3,
        max_tokens: 3000,
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Groq API error ${response.status}: ${error}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
}

/**
 * Parse JSON response from AI, handling various formats
 */
function parseJsonResponse(content: string): VocabularyFlashcard[] {
  // Remove markdown code blocks
  let cleaned = content
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/g, "")
    .trim();

  // Try to extract JSON array
  const arrayMatch = cleaned.match(/\[[\s\S]*\]/);
  if (arrayMatch) {
    try {
      return JSON.parse(arrayMatch[0]);
    } catch (e) {
      console.log("[parseJsonResponse] Failed to parse array match:", e);
    }
  }

  // Try parsing whole content
  try {
    const parsed = JSON.parse(cleaned);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.log("[parseJsonResponse] Failed to parse content:", e);
    return [];
  }
}


/**
 * Post-process and filter flashcards
 */
function postProcessFlashcards(
  cards: VocabularyFlashcard[],
  options?: ExtractionOptions
): VocabularyFlashcard[] {
  let filtered = cards;

  // Step 1: Validate each card
  filtered = filtered.filter(isValidFlashcard);

  // Step 2: Filter by minimum confidence
  const minConf = options?.minConfidence ?? 0.6;
  filtered = filtered.filter((f) => f.confidence >= minConf);

  // Step 3: Filter by target CEFR levels
  if (options?.targetCEFR && options.targetCEFR.length > 0) {
    filtered = filtered.filter((f) => options.targetCEFR!.includes(f.cefr));
  }

  // Step 4: Filter by topic if specified
  if (options?.topic) {
    const topicLower = options.topic.toLowerCase();
    filtered = filtered.filter(
      (f) => f.topic.toLowerCase().includes(topicLower)
    );
  }

  // Step 5: Remove duplicates by normalized term
  const seen = new Set<string>();
  filtered = filtered.filter((f) => {
    const key = f.term.toLowerCase().trim();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Step 6: Sort by confidence (highest first)
  filtered.sort((a, b) => b.confidence - a.confidence);

  // Step 7: Limit to maxTerms
  const maxTerms = options?.maxTerms ?? 20;
  return filtered.slice(0, maxTerms);
}

/**
 * Main extraction function
 */
export async function extractVocabularyFlashcards(
  text: string,
  config: ExtractionConfig,
  options?: ExtractionOptions
): Promise<VocabularyFlashcard[]> {
  // Validate input
  if (!text || text.length < 50) {
    throw new Error("Text too short for vocabulary extraction");
  }

  const hasKey = config.openaiKey || config.groqKey || config.cohereKey;
  if (!hasKey) {
    throw new Error("Missing API key (OpenAI, Groq, or Cohere required)");
  }

  // Clean and prepare text
  const cleanedText = cleanText(text);
  if (cleanedText.length < 30) {
    throw new Error("Text too short after cleaning");
  }

  // Request more terms than needed to account for filtering
  const requestTerms = Math.min((options?.maxTerms || 20) * 2, 40);
  const prompt = buildPrompt(cleanedText, requestTerms, options?.topic);

  let content = "";
  let provider = "";

  // Try Groq first (free and fast), then OpenAI
  if (config.groqKey) {
    try {
      content = await callGroq(prompt, config.groqKey);
      provider = "groq";
    } catch (err) {
      console.log("[VocabExtractor] Groq failed:", err);
    }
  }

  if (!content && config.openaiKey) {
    try {
      content = await callOpenAI(prompt, config.openaiKey);
      provider = "openai";
    } catch (err) {
      console.log("[VocabExtractor] OpenAI failed:", err);
      throw new Error("All AI providers failed");
    }
  }

  if (!content) {
    throw new Error("No AI response received");
  }

  console.log(`[VocabExtractor] Using provider: ${provider}`);

  // Parse response
  const parsed = parseJsonResponse(content);
  console.log(`[VocabExtractor] Parsed ${parsed.length} raw flashcards`);

  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error("Failed to parse AI response as JSON array");
  }

  // Post-process and filter
  const result = postProcessFlashcards(parsed, options);
  console.log(`[VocabExtractor] Returning ${result.length} filtered flashcards`);

  return result;
}

/**
 * Batch extract from multiple text chunks
 */
export async function batchExtractVocabulary(
  texts: string[],
  config: ExtractionConfig,
  options?: ExtractionOptions
): Promise<VocabularyFlashcard[]> {
  if (texts.length === 0) return [];

  const results = await Promise.all(
    texts.map((t) =>
      extractVocabularyFlashcards(t, config, options).catch((err) => {
        console.log("[batchExtract] Chunk failed:", err);
        return [] as VocabularyFlashcard[];
      })
    )
  );

  const flat = results.flat();

  // Remove duplicates across all chunks
  const unique = Array.from(
    new Map(flat.map((f) => [f.term.toLowerCase(), f])).values()
  );

  // Sort by confidence and limit
  unique.sort((a, b) => b.confidence - a.confidence);
  return unique.slice(0, options?.maxTerms || 40);
}
