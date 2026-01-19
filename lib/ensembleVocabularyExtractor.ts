/**
 * Ensemble Keyword Extraction with Scaling and Accuracy Boosts
 * Combines TF-IDF, RAKE, YAKE with weighted ensemble and normalization
 * 
 * Pipeline:
 * 1. Clean PDF metadata
 * 2. Preprocess text (lowercase, remove stopwords, lemmatization)
 * 3. Extract n-grams (bi/trigrams)
 * 4. Calculate 4 criteria scores: Frequency, TF-IDF, RAKE, YAKE
 * 5. Normalize features (Min-Max scaling)
 * 6. Weighted ensemble combination
 * 7. Rank and return top keywords
 */

interface WordScore {
  word: string;
  score: number;
  features: {
    frequency: number;
    tfidf: number;
    rake: number;
    yake: number;
  };
  normalized: {
    frequency: number;
    tfidf: number;
    rake: number;
    yake: number;
  };
  reason?: string; // Explanation for why this word was selected
  contextRelevance?: number; // Relevance score based on context
  isProperNoun?: boolean; // Flag for proper nouns
  isTechnical?: boolean; // Flag for technical terms
}

interface EnsembleResult {
  vocabulary: string[];
  scores: WordScore[];
  stats: {
    totalWords: number;
    uniqueWords: number;
    sentences: number;
    method: string;
    weights: Record<string, number>;
    filteredProperNouns?: number;
    filteredTechnical?: number;
  };
}

interface EnsembleOptions {
  maxWords?: number;
  minWordLength?: number;
  weights?: {
    frequency?: number;
    tfidf?: number;
    rake?: number;
    yake?: number;
  };
  includeNgrams?: boolean;
  filterProperNouns?: boolean; // Remove proper nouns (names, places)
  filterTechnical?: boolean; // Remove technical/metadata terms
  contextFiltering?: boolean; // Enable context-based filtering
}

// PDF metadata patterns to remove
const PDF_METADATA_PATTERNS = [
  /\b(startxref|endobj|xref|obj|trailer|colorspace|bitspercomponent|startstream|endstream)\b/gi,
  /\b(rgb|cmyk|devicegray|devicergb|devicecmyk)\b/gi,
  /\b(flatedecode|asciihexdecode|ascii85decode)\b/gi,
  /\b(catalog|pages|page|font|fontdescriptor|encoding)\b/gi,
];

// English stopwords
const STOPWORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'be',
  'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will',
  'would', 'should', 'could', 'may', 'might', 'must', 'can', 'this',
  'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they',
  'what', 'which', 'who', 'when', 'where', 'why', 'how', 'all', 'each',
  'every', 'both', 'few', 'more', 'most', 'other', 'some', 'such', 'no',
  'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 's',
  't', 'just', 'don', 'now', 'd', 'll', 'm', 'o', 're', 've', 'y', 'ain',
  'aren', 'couldn', 'didn', 'doesn', 'hadn', 'hasn', 'haven', 'isn', 'ma',
  'mightn', 'mustn', 'needn', 'shan', 'shouldn', 'wasn', 'weren', 'won', 'wouldn'
]);

// Technical/metadata terms to filter
const TECHNICAL_TERMS = new Set([
  'pdf', 'doc', 'docx', 'txt', 'file', 'document', 'page', 'section',
  'chapter', 'figure', 'table', 'appendix', 'reference', 'bibliography',
  'http', 'https', 'www', 'com', 'org', 'net', 'url', 'link',
  'copyright', 'isbn', 'doi', 'version', 'draft', 'revision',
  'metadata', 'header', 'footer', 'annotation', 'comment'
]);

// Common proper noun indicators (words that often appear before names)
const PROPER_NOUN_INDICATORS = new Set([
  'mr', 'mrs', 'ms', 'dr', 'prof', 'professor', 'sir', 'madam',
  'president', 'minister', 'director', 'ceo', 'cto', 'cfo'
]);

/**
 * Clean PDF metadata from text
 */
function cleanPDFMetadata(text: string): string {
  let cleaned = text;
  for (const pattern of PDF_METADATA_PATTERNS) {
    cleaned = cleaned.replace(pattern, ' ');
  }
  // Remove multiple spaces
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  return cleaned;
}

/**
 * Tokenize and preprocess text
 */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !STOPWORDS.has(w));
}

/**
 * Split text into sentences
 */
function splitSentences(text: string): string[] {
  return text
    .split(/[.!?]+/)
    .map(s => s.trim())
    .filter(s => s.length > 0);
}

/**
 * Generate n-grams from tokens
 */
function generateNgrams(tokens: string[], n: number): string[] {
  const ngrams: string[] = [];
  for (let i = 0; i <= tokens.length - n; i++) {
    ngrams.push(tokens.slice(i, i + n).join(' '));
  }
  return ngrams;
}

/**
 * Extract candidate phrases (unigrams + bigrams + trigrams)
 */
function extractCandidates(text: string, includeNgrams: boolean = true): Set<string> {
  const tokens = tokenize(text);
  const candidates = new Set<string>(tokens);
  
  if (includeNgrams) {
    // Add bigrams
    const bigrams = generateNgrams(tokens, 2);
    bigrams.forEach(bg => candidates.add(bg));
    
    // Add trigrams
    const trigrams = generateNgrams(tokens, 3);
    trigrams.forEach(tg => candidates.add(tg));
  }
  
  return candidates;
}

/**
 * Calculate word frequency scores
 */
function calculateFrequency(tokens: string[]): Map<string, number> {
  const freq = new Map<string, number>();
  tokens.forEach(token => {
    freq.set(token, (freq.get(token) || 0) + 1);
  });
  
  // Normalize by total count
  const total = tokens.length;
  freq.forEach((count, word) => {
    freq.set(word, count / total);
  });
  
  return freq;
}

/**
 * Calculate TF-IDF scores
 * TF(t,d) = f(t,d) / max{f(w,d) : w ∈ d}
 * IDF(t,D) = log(|D| / |{d ∈ D : t ∈ d}|)
 */
function calculateTFIDF(documents: string[]): Map<string, number> {
  const allTokens = documents.map(doc => tokenize(doc));
  const docCount = documents.length;
  
  // Calculate document frequency
  const docFreq = new Map<string, number>();
  allTokens.forEach(tokens => {
    const uniqueTokens = new Set(tokens);
    uniqueTokens.forEach(token => {
      docFreq.set(token, (docFreq.get(token) || 0) + 1);
    });
  });
  
  // Calculate TF-IDF for first document (main document)
  const tokens = allTokens[0];
  const termFreq = new Map<string, number>();
  tokens.forEach(token => {
    termFreq.set(token, (termFreq.get(token) || 0) + 1);
  });
  
  const maxFreq = Math.max(...Array.from(termFreq.values()));
  const tfidf = new Map<string, number>();
  
  termFreq.forEach((freq, term) => {
    const tf = freq / maxFreq;
    const df = docFreq.get(term) || 1;
    const idf = Math.log(docCount / df);
    tfidf.set(term, tf * idf);
  });
  
  return tfidf;
}

/**
 * Calculate RAKE scores (Rapid Automatic Keyword Extraction)
 * Based on word frequency and co-occurrence
 */
function calculateRAKE(text: string): Map<string, number> {
  const sentences = splitSentences(text);
  const candidates: string[][] = [];
  
  sentences.forEach(sentence => {
    const tokens = tokenize(sentence);
    let currentPhrase: string[] = [];
    
    tokens.forEach(token => {
      if (!STOPWORDS.has(token)) {
        currentPhrase.push(token);
      } else {
        if (currentPhrase.length > 0) {
          candidates.push([...currentPhrase]);
          currentPhrase = [];
        }
      }
    });
    
    if (currentPhrase.length > 0) {
      candidates.push(currentPhrase);
    }
  });
  
  // Calculate word scores
  const wordFreq = new Map<string, number>();
  const wordDegree = new Map<string, number>();
  
  candidates.forEach(phrase => {
    const phraseLength = phrase.length;
    phrase.forEach(word => {
      wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
      wordDegree.set(word, (wordDegree.get(word) || 0) + phraseLength);
    });
  });
  
  // RAKE score = degree / frequency
  const rakeScores = new Map<string, number>();
  wordFreq.forEach((freq, word) => {
    const degree = wordDegree.get(word) || 0;
    rakeScores.set(word, degree / freq);
  });
  
  return rakeScores;
}

/**
 * Calculate YAKE scores (Yet Another Keyword Extractor)
 * Based on: case, position, frequency, relatedness, sentence distribution
 */
function calculateYAKE(text: string, originalText: string): Map<string, number> {
  const sentences = splitSentences(text);
  const tokens = tokenize(text);
  const originalWords = originalText.split(/\s+/);
  
  // Calculate statistics
  const wordFreq = new Map<string, number>();
  tokens.forEach(token => {
    wordFreq.set(token, (wordFreq.get(token) || 0) + 1);
  });
  
  const counts = Array.from(wordFreq.values());
  const meanCount = counts.reduce((a, b) => a + b, 0) / counts.length;
  const stdDev = Math.sqrt(
    counts.reduce((sum, c) => sum + Math.pow(c - meanCount, 2), 0) / counts.length
  );
  const maxCount = Math.max(...counts);
  
  // Track word positions and sentence occurrences
  const wordPositions = new Map<string, number[]>();
  const wordSentences = new Map<string, Set<number>>();
  
  tokens.forEach((token, index) => {
    if (!wordPositions.has(token)) wordPositions.set(token, []);
    wordPositions.get(token)!.push(index);
  });
  
  sentences.forEach((sentence, sentIndex) => {
    const sentTokens = tokenize(sentence);
    sentTokens.forEach(token => {
      if (!wordSentences.has(token)) wordSentences.set(token, new Set());
      wordSentences.get(token)!.add(sentIndex);
    });
  });
  
  const yakeScores = new Map<string, number>();
  
  wordFreq.forEach((count, word) => {
    // Position score
    const positions = wordPositions.get(word) || [];
    const medianPos = positions.length > 0
      ? positions.sort((a, b) => a - b)[Math.floor(positions.length / 2)]
      : tokens.length;
    const positionScore = Math.log(Math.log(3 + medianPos));
    
    // Frequency score
    const frequencyScore = count / (meanCount + stdDev);
    
    // Case score (check if word appears capitalized)
    const caseScore = originalWords.some(w =>
      w.toLowerCase() === word && w[0] === w[0].toUpperCase()
    ) ? 2 : 1;
    
    // Relatedness score
    const leftContext = positions.map(p => tokens[p - 1]).filter(Boolean).length;
    const rightContext = positions.map(p => tokens[p + 1]).filter(Boolean).length;
    const relatednessScore = 1 + ((leftContext + rightContext) * count) / maxCount;
    
    // Different sentences score
    const sentCount = wordSentences.get(word)?.size || 1;
    const differentScore = sentCount / sentences.length;
    
    // YAKE score: d*b / (a + c/d + e/d)
    const a = caseScore;
    const b = positionScore;
    const c = frequencyScore;
    const d = relatednessScore;
    const e = differentScore;
    
    const score = (d * b) / (a + (c / d) + (e / d));
    
    // Invert because lower YAKE score = better
    yakeScores.set(word, 1 / (score + 0.0001));
  });
  
  return yakeScores;
}

/**
 * Min-Max normalization
 */
function minMaxNormalize(values: number[]): number[] {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min;
  
  if (range === 0) return values.map(() => 0.5);
  
  return values.map(v => (v - min) / range);
}

/**
 * Check if a word is likely a proper noun
 * Heuristics: starts with capital letter, appears after proper noun indicators
 */
function isLikelyProperNoun(word: string, originalText: string): boolean {
  // Check if word consistently appears capitalized in original text
  const regex = new RegExp(`\\b${word}\\b`, 'gi');
  const matches = originalText.match(regex) || [];
  
  if (matches.length === 0) return false;
  
  // Count how many times it appears capitalized
  const capitalizedCount = matches.filter(m => m[0] === m[0].toUpperCase()).length;
  const capitalizedRatio = capitalizedCount / matches.length;
  
  // If >70% capitalized and not at sentence start, likely proper noun
  return capitalizedRatio > 0.7;
}

/**
 * Check if a word is technical/metadata term
 */
function isTechnicalTerm(word: string): boolean {
  return TECHNICAL_TERMS.has(word.toLowerCase());
}

/**
 * Calculate context relevance score using simple co-occurrence
 * Words that appear together frequently are more contextually relevant
 */
function calculateContextRelevance(
  word: string, 
  allWords: string[], 
  windowSize: number = 5
): number {
  const positions: number[] = [];
  allWords.forEach((w, i) => {
    if (w === word) positions.push(i);
  });
  
  if (positions.length === 0) return 0;
  
  // Calculate average distance to other content words
  let totalRelevance = 0;
  let count = 0;
  
  positions.forEach(pos => {
    const start = Math.max(0, pos - windowSize);
    const end = Math.min(allWords.length, pos + windowSize + 1);
    const contextWords = allWords.slice(start, end);
    
    // Count non-stopwords in context
    const contentWords = contextWords.filter(w => !STOPWORDS.has(w) && w !== word);
    totalRelevance += contentWords.length;
    count++;
  });
  
  return count > 0 ? totalRelevance / count : 0;
}

/**
 * Generate explanation for why a word was selected
 */
function generateReason(wordScore: WordScore): string {
  const reasons: string[] = [];
  
  // Check which features contributed most
  const { normalized } = wordScore;
  const maxFeature = Math.max(
    normalized.frequency,
    normalized.tfidf,
    normalized.rake,
    normalized.yake
  );
  
  if (normalized.tfidf === maxFeature && normalized.tfidf > 0.7) {
    reasons.push("TF-IDF cao (từ đặc trưng cho tài liệu)");
  }
  
  if (normalized.rake === maxFeature && normalized.rake > 0.7) {
    reasons.push("RAKE cao (xuất hiện trong cụm từ quan trọng)");
  }
  
  if (normalized.yake === maxFeature && normalized.yake > 0.7) {
    reasons.push("YAKE cao (vị trí và ngữ cảnh tốt)");
  }
  
  if (normalized.frequency > 0.8) {
    reasons.push("tần suất xuất hiện cao");
  }
  
  if (wordScore.contextRelevance && wordScore.contextRelevance > 5) {
    reasons.push("liên quan mạnh với ngữ cảnh");
  }
  
  if (reasons.length === 0) {
    reasons.push("điểm tổng hợp cao từ nhiều tiêu chí");
  }
  
  return "Được chọn vì: " + reasons.join(", ");
}

/**
 * Ensemble vocabulary extraction with scaling and weighting
 */
export function extractVocabularyEnsemble(
  text: string,
  options: EnsembleOptions = {}
): EnsembleResult {
  const {
    maxWords = 50,
    minWordLength = 3,
    weights = {
      frequency: 0.15,
      tfidf: 0.35,
      rake: 0.25,
      yake: 0.25
    },
    includeNgrams = true,
    filterProperNouns = true,
    filterTechnical = true,
    contextFiltering = true
  } = options;
  
  // Step 1: Clean PDF metadata
  const cleanedText = cleanPDFMetadata(text);
  
  // Step 2: Preprocess
  const sentences = splitSentences(cleanedText);
  const tokens = tokenize(cleanedText);
  const candidates = extractCandidates(cleanedText, includeNgrams);
  
  // Filter by min length
  const filteredCandidates = Array.from(candidates).filter(c => c.length >= minWordLength);
  
  // Step 3: Calculate 4 criteria scores
  const freqScores = calculateFrequency(tokens);
  const tfidfScores = calculateTFIDF([cleanedText]);
  const rakeScores = calculateRAKE(cleanedText);
  const yakeScores = calculateYAKE(cleanedText, text);
  
  // Step 4: Build feature matrix
  const wordScores: WordScore[] = filteredCandidates.map(word => {
    const wordTokens = word.split(' ');
    const avgFreq = wordTokens.reduce((sum, t) => sum + (freqScores.get(t) || 0), 0) / wordTokens.length;
    const avgTfidf = wordTokens.reduce((sum, t) => sum + (tfidfScores.get(t) || 0), 0) / wordTokens.length;
    const avgRake = wordTokens.reduce((sum, t) => sum + (rakeScores.get(t) || 0), 0) / wordTokens.length;
    const avgYake = wordTokens.reduce((sum, t) => sum + (yakeScores.get(t) || 0), 0) / wordTokens.length;
    
    return {
      word,
      score: 0, // Will be calculated after normalization
      features: {
        frequency: avgFreq,
        tfidf: avgTfidf,
        rake: avgRake,
        yake: avgYake
      },
      normalized: {
        frequency: 0,
        tfidf: 0,
        rake: 0,
        yake: 0
      },
      isProperNoun: filterProperNouns ? isLikelyProperNoun(word, text) : false,
      isTechnical: filterTechnical ? isTechnicalTerm(word) : false,
      contextRelevance: contextFiltering ? calculateContextRelevance(word, tokens) : 0
    };
  });
  
  // Step 5: Normalize features (Min-Max scaling)
  const freqValues = wordScores.map(ws => ws.features.frequency);
  const tfidfValues = wordScores.map(ws => ws.features.tfidf);
  const rakeValues = wordScores.map(ws => ws.features.rake);
  const yakeValues = wordScores.map(ws => ws.features.yake);
  
  const normFreq = minMaxNormalize(freqValues);
  const normTfidf = minMaxNormalize(tfidfValues);
  const normRake = minMaxNormalize(rakeValues);
  const normYake = minMaxNormalize(yakeValues);
  
  // Step 6: Weighted ensemble
  wordScores.forEach((ws, i) => {
    ws.normalized.frequency = normFreq[i];
    ws.normalized.tfidf = normTfidf[i];
    ws.normalized.rake = normRake[i];
    ws.normalized.yake = normYake[i];
    
    // Calculate weighted score
    ws.score = 
      weights.frequency! * normFreq[i] +
      weights.tfidf! * normTfidf[i] +
      weights.rake! * normRake[i] +
      weights.yake! * normYake[i];
    
    // Boost score if high context relevance
    if (contextFiltering && ws.contextRelevance && ws.contextRelevance > 3) {
      ws.score *= (1 + ws.contextRelevance * 0.05); // 5% boost per context point
    }
  });
  
  // Step 7: Filter unwanted terms (Bước 4: Lọc ngữ cảnh)
  let filteredScores = wordScores;
  let filteredProperNounsCount = 0;
  let filteredTechnicalCount = 0;
  
  if (filterProperNouns) {
    const beforeCount = filteredScores.length;
    filteredScores = filteredScores.filter(ws => !ws.isProperNoun);
    filteredProperNounsCount = beforeCount - filteredScores.length;
  }
  
  if (filterTechnical) {
    const beforeCount = filteredScores.length;
    filteredScores = filteredScores.filter(ws => !ws.isTechnical);
    filteredTechnicalCount = beforeCount - filteredScores.length;
  }
  
  // Step 8: Sort and return top keywords
  const sortedScores = filteredScores
    .sort((a, b) => b.score - a.score)
    .slice(0, maxWords);
  
  // Step 9: Generate reasons (Bước 5: Xuất kết quả)
  sortedScores.forEach(ws => {
    ws.reason = generateReason(ws);
  });
  
  return {
    vocabulary: sortedScores.map(ws => ws.word),
    scores: sortedScores,
    stats: {
      totalWords: tokens.length,
      uniqueWords: new Set(tokens).size,
      sentences: sentences.length,
      method: 'ensemble(freq+tfidf+rake+yake)',
      weights: weights as Record<string, number>,
      filteredProperNouns: filteredProperNounsCount,
      filteredTechnical: filteredTechnicalCount
    }
  };
}
