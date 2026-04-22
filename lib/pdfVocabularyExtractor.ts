
const METADATA_PATTERNS = [
  // XMP/RDF/XML metadata
  /<\?xpacket[^>]*\?>[\s\S]*?<\?xpacket[^>]*\?>/gi,
  /<x:xmpmeta[^>]*>[\s\S]*?<\/x:xmpmeta>/gi,
  /<rdf:RDF[^>]*>[\s\S]*?<\/rdf:RDF>/gi,
  /<[^>]*xmlns[^>]*>[^<]*<\/[^>]+>/gi,
  /<\/?[a-z][a-z0-9]*[^>]*>/gi,
  // Adobe/PDF metadata
  /\/[A-Z][a-z]+\s*\([^)]+\)/g,
  /\/[A-Z][a-z]+\s*<[^>]+>/g,
  // UUID, checksum, hash
  /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
  /[0-9a-f]{32,}/gi,
  // Base64 encoded strings
  /[A-Za-z0-9+/=]{50,}/g,
  // Hex encoded
  /\\x[0-9a-f]{2}/gi,
  /0x[0-9a-f]+/gi,
  // DOI patterns
  /doi:?\s*10\.\d{4,}\/[^\s]+/gi,
  /10\.\d{4,}\/[^\s]+/g,
];

// Keywords that indicate metadata lines
const METADATA_KEYWORDS = [
  'xmp', 'rdf', 'xmlns', 'adobe', 'photoshop', 'illustrator', 'indesign',
  'moddate', 'createdate', 'metadatadate', 'producer', 'creator',
  'xmpmeta', 'xpacket', 'stref', 'stevt', 'xmpgimg', 'xxmpmeta',
  'uuid', 'checksum', 'instanceid', 'documentid', 'originaldocumentid',
  'pdf', 'pdfx', 'pdfaid', 'pdfa', 'pdfua', 'endstream', 'endobj',
];

// Common English stopwords
const STOPWORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been',
  'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
  'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'it', 'its',
  'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'we', 'they',
  'me', 'him', 'her', 'us', 'them', 'my', 'your', 'his', 'our', 'their',
  'what', 'which', 'who', 'whom', 'whose', 'where', 'when', 'why', 'how',
  'all', 'each', 'every', 'both', 'few', 'more', 'most', 'other', 'some',
  'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too',
  'very', 'just', 'also', 'now', 'here', 'there', 'then', 'once', 'if',
]);

// Common phrasal verbs patterns
const PHRASAL_VERB_PARTICLES = ['up', 'down', 'in', 'out', 'on', 'off', 'over', 'away', 'back', 'through', 'around', 'about', 'along', 'forward'];

export interface ExtractionLog {
  step: string;
  data: any;
  timestamp: number;
}

export interface VocabularyItem {
  word: string;
  type: 'phrase' | 'noun_phrase' | 'phrasal_verb' | 'collocation' | 'single_word';
  meaning?: string;
  example?: string;
  exampleTranslation?: string;
  pronunciation?: string;
  partOfSpeech?: string;
  level?: string;
}

export interface ExtractionResult {
  success: boolean;
  vocabulary: VocabularyItem[];
  logs: ExtractionLog[];
  stats: {
    originalLength: number;
    cleanedLength: number;
    sentenceCount: number;
    extractedCount: number;
    metadataRemoved: number;
  };
  error?: string;
}

/**
 * Step 1: Validate PDF content - check if it has real text
 */
export function validatePDFContent(text: string): { valid: boolean; reason?: string } {
  if (!text || text.trim().length < 50) {
    return { valid: false, reason: "Văn bản quá ngắn hoặc rỗng" };
  }

  // Count actual words vs technical strings
  const words = text.split(/\s+/);
  const technicalCount = words.filter(w => 
    /^[0-9a-f]{20,}$/i.test(w) || 
    METADATA_KEYWORDS.some(kw => w.toLowerCase().includes(kw)) ||
    /^[^aeiouAEIOU]{8,}$/.test(w)
  ).length;

  const technicalRatio = technicalCount / words.length;
  
  if (technicalRatio > 0.5) {
    return { valid: false, reason: "Nội dung chủ yếu là metadata kỹ thuật, không có văn bản ngôn ngữ tự nhiên" };
  }

  // Check for readable sentences
  const sentences = text.match(/[A-Z][^.!?]*[.!?]/g) || [];
  if (sentences.length < 2) {
    return { valid: false, reason: "Không tìm thấy câu văn có nghĩa" };
  }

  return { valid: true };
}

/**
 * Step 2: Remove metadata and technical strings
 */
export function removeMetadata(text: string): { cleaned: string; removedCount: number } {
  let cleaned = text;
  let removedCount = 0;

  // Apply regex patterns
  for (const pattern of METADATA_PATTERNS) {
    const matches = cleaned.match(pattern);
    if (matches) {
      removedCount += matches.length;
      cleaned = cleaned.replace(pattern, ' ');
    }
  }

  // Remove lines containing metadata keywords
  const lines = cleaned.split('\n');
  const cleanedLines = lines.filter(line => {
    const lowerLine = line.toLowerCase();
    const hasMetadata = METADATA_KEYWORDS.some(kw => lowerLine.includes(kw));
    if (hasMetadata && line.length < 200) {
      removedCount++;
      return false;
    }
    return true;
  });
  cleaned = cleanedLines.join('\n');

  // Remove tokens >20 chars without spaces that don't look like words
  cleaned = cleaned.replace(/\b[^\s]{21,}\b/g, (match) => {
    // Keep if it looks like a compound word with hyphens
    if (match.includes('-') && /^[a-zA-Z-]+$/.test(match)) return match;
    // Keep if it's a URL (we'll handle separately)
    if (match.startsWith('http')) return '';
    // Remove if no vowels (likely technical string)
    if (!/[aeiouAEIOU]/.test(match)) {
      removedCount++;
      return '';
    }
    return match;
  });

  // Normalize whitespace
  cleaned = cleaned.replace(/\s+/g, ' ').trim();

  return { cleaned, removedCount };
}
export function chunkText(text: string): {
  sentences: string[];
  nounPhrases: string[];
  phrasalVerbs: string[];
  importantWords: string[];
} {
  // Split into sentences
  const sentences = text
    .split(/(?<=[.!?])\s+/)
    .map(s => s.trim())
    .filter(s => s.length > 10 && /[a-zA-Z]/.test(s));

  // Extract noun phrases (simple pattern: adj* + noun+)
  const nounPhrasePattern = /\b(?:the\s+)?(?:[a-z]+(?:ly|ed|ing)?\s+)*(?:[a-z]+(?:tion|ment|ness|ity|ance|ence|er|or|ist|ism)\b)/gi;
  const nounPhrases: string[] = [];
  
  // Also look for capitalized phrases (proper nouns, titles)
  const capitalizedPattern = /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+\b/g;
  
  // Common noun phrase patterns
  const commonNPPatterns = [
    /\b(?:climate|social|artificial|machine|deep|natural|public|mental|physical)\s+[a-z]+\b/gi,
    /\b[a-z]+\s+(?:change|media|intelligence|learning|language|health|policy|system|process)\b/gi,
  ];

  sentences.forEach(sentence => {
    // Extract noun phrases
    const npMatches = sentence.match(nounPhrasePattern) || [];
    nounPhrases.push(...npMatches.filter(np => np.length > 5 && !STOPWORDS.has(np.toLowerCase())));
    
    // Extract capitalized phrases
    const capMatches = sentence.match(capitalizedPattern) || [];
    nounPhrases.push(...capMatches);
    
    // Extract common patterns
    commonNPPatterns.forEach(pattern => {
      const matches = sentence.match(pattern) || [];
      nounPhrases.push(...matches);
    });
  });

  // Extract phrasal verbs
  const phrasalVerbs: string[] = [];
  const verbPattern = /\b([a-z]+)\s+(up|down|in|out|on|off|over|away|back|through|around|about|along|forward)(?:\s+(?:to|with|for))?\b/gi;
  
  sentences.forEach(sentence => {
    let match;
    while ((match = verbPattern.exec(sentence)) !== null) {
      const verb = match[1].toLowerCase();
      const particle = match[2].toLowerCase();
      // Filter out common non-phrasal combinations
      if (!['be', 'is', 'are', 'was', 'were', 'go', 'come'].includes(verb)) {
        phrasalVerbs.push(`${verb} ${particle}`);
      }
    }
  });
  const importantWords: string[] = [];
  const wordPattern = /\b[a-zA-Z]{4,}\b/g;
  
  sentences.forEach(sentence => {
    const words = sentence.match(wordPattern) || [];
    words.forEach(word => {
      const lower = word.toLowerCase();
      if (!STOPWORDS.has(lower) && !importantWords.includes(lower)) {
        // Check if it's likely a content word
        if (
          /(?:tion|ment|ness|ity|ance|ence|ive|ous|ful|less|able|ible|al|ic|ly|ed|ing|er|or|ist|ism)$/.test(lower) ||
          word.length >= 6
        ) {
          importantWords.push(lower);
        }
      }
    });
  });

  return {
    sentences,
    nounPhrases: [...new Set(nounPhrases)].slice(0, 30),
    phrasalVerbs: [...new Set(phrasalVerbs)].slice(0, 15),
    importantWords: [...new Set(importantWords)].slice(0, 30),
  };
}
export function combineVocabulary(chunks: ReturnType<typeof chunkText>): VocabularyItem[] {
  const vocabulary: VocabularyItem[] = [];
  const seen = new Set<string>();

  // Add noun phrases first (highest priority)
  chunks.nounPhrases.forEach(phrase => {
    const normalized = phrase.toLowerCase().trim();
    if (!seen.has(normalized) && normalized.length > 3) {
      seen.add(normalized);
      vocabulary.push({ word: phrase, type: 'noun_phrase' });
    }
  });

  // Add phrasal verbs
  chunks.phrasalVerbs.forEach(pv => {
    const normalized = pv.toLowerCase().trim();
    if (!seen.has(normalized)) {
      seen.add(normalized);
      vocabulary.push({ word: pv, type: 'phrasal_verb' });
    }
  });

  // Add important single words (if not already part of a phrase)
  chunks.importantWords.forEach(word => {
    const normalized = word.toLowerCase().trim();
    // Check if this word is already part of an existing phrase
    const isPartOfPhrase = [...seen].some(existing => 
      existing.includes(normalized) && existing !== normalized
    );
    if (!isPartOfPhrase && !seen.has(normalized)) {
      seen.add(normalized);
      vocabulary.push({ word, type: 'single_word' });
    }
  });

  return vocabulary.slice(0, 50); // Limit to 50 items
}

/**
 * Main extraction function with logging
 */
export function extractVocabularyFromPDF(rawText: string): ExtractionResult {
  const logs: ExtractionLog[] = [];
  const startTime = Date.now();

  // Log 1: Original text
  logs.push({
    step: "1_original_text",
    data: {
      length: rawText.length,
      preview: rawText.slice(0, 500),
      wordCount: rawText.split(/\s+/).length,
    },
    timestamp: Date.now() - startTime,
  });

  // Step 1: Validate content
  const validation = validatePDFContent(rawText);
  if (!validation.valid) {
    return {
      success: false,
      vocabulary: [],
      logs,
      stats: {
        originalLength: rawText.length,
        cleanedLength: 0,
        sentenceCount: 0,
        extractedCount: 0,
        metadataRemoved: 0,
      },
      error: validation.reason,
    };
  }

  // Step 2: Remove metadata
  const { cleaned, removedCount } = removeMetadata(rawText);
  
  // Log 2: After metadata removal
  logs.push({
    step: "2_after_metadata_removal",
    data: {
      length: cleaned.length,
      preview: cleaned.slice(0, 500),
      removedCount,
      reductionPercent: Math.round((1 - cleaned.length / rawText.length) * 100),
    },
    timestamp: Date.now() - startTime,
  });

  // Step 3: Chunk text
  const chunks = chunkText(cleaned);
  
  // Log 3: After NLP chunking
  logs.push({
    step: "3_after_nlp_chunking",
    data: {
      sentenceCount: chunks.sentences.length,
      nounPhrases: chunks.nounPhrases.slice(0, 10),
      phrasalVerbs: chunks.phrasalVerbs.slice(0, 10),
      importantWords: chunks.importantWords.slice(0, 10),
    },
    timestamp: Date.now() - startTime,
  });

  // Step 4: Combine vocabulary
  const vocabulary = combineVocabulary(chunks);
  
  // Log 4: Final vocabulary list
  logs.push({
    step: "4_final_vocabulary",
    data: {
      count: vocabulary.length,
      items: vocabulary.slice(0, 20).map(v => ({ word: v.word, type: v.type })),
    },
    timestamp: Date.now() - startTime,
  });

  return {
    success: true,
    vocabulary,
    logs,
    stats: {
      originalLength: rawText.length,
      cleanedLength: cleaned.length,
      sentenceCount: chunks.sentences.length,
      extractedCount: vocabulary.length,
      metadataRemoved: removedCount,
    },
  };
}

/**
 * GPT Prompt for generating vocabulary details
 */
export const VOCABULARY_GENERATION_PROMPT = `Bạn là hệ thống trích lọc từ vựng từ văn bản PDF cho người Việt học tiếng Anh.

⚠️ QUAN TRỌNG - ĐÃ LỌC METADATA:
Danh sách từ vựng dưới đây đã được lọc sạch metadata kỹ thuật. Hãy sinh nghĩa và ví dụ cho từng từ/cụm từ.

📝 YÊU CẦU OUTPUT:
Với mỗi từ/cụm từ, trả về:
1. meaning: Nghĩa tiếng Việt (chính xác, phổ biến)
2. example: Câu ví dụ tiếng Anh (đơn giản, A2-B1)
3. exampleTranslation: Dịch câu ví dụ sang tiếng Việt
4. pronunciation: Phiên âm IPA
5. partOfSpeech: Loại từ (noun/verb/adjective/adverb/phrase)
6. level: Độ khó (beginner/intermediate/advanced)

Trả về ONLY valid JSON array (không markdown):
[
  {
    "word": "climate change",
    "meaning": "biến đổi khí hậu",
    "example": "Climate change affects everyone on Earth.",
    "exampleTranslation": "Biến đổi khí hậu ảnh hưởng đến mọi người trên Trái Đất.",
    "pronunciation": "/ˈklaɪmət tʃeɪndʒ/",
    "partOfSpeech": "noun phrase",
    "level": "intermediate"
  }
]`;
