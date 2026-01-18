/**
 * Advanced Vocabulary Extraction using TF-IDF, RAKE, and YAKE algorithms
 * For Vietnamese learners of English
 */

interface WordScore {
  word: string;
  score: number;
  method: 'tfidf' | 'rake' | 'yake' | 'combined';
  details?: {
    tf?: number;
    idf?: number;
    frequency?: number;
    position?: number;
    relatedness?: number;
    different?: number;
  };
}

interface ExtractionResult {
  vocabulary: string[];
  scores: WordScore[];
  stats: {
    totalWords: number;
    uniqueWords: number;
    sentences: number;
    method: string;
  };
}

/**
 * Tokenize text into words (basic English tokenization)
 */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2); // Filter out very short words
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
 * Calculate word frequency
 */
function calculateFrequency(words: string[]): Map<string, number> {
  const freq = new Map<string, number>();
  words.forEach(word => {
    freq.set(word, (freq.get(word) || 0) + 1);
  });
  return freq;
}

/**
 * TF-IDF Method
 * tf(t,d) = f(t,d) / max{f(w,d) : w ∈ d}
 * idf(t,D) = log(|D| / |{d ∈ D : t ∈ d}|)
 * score = TF * IDF
 */
export function extractWithTFIDF(documents: string[]): WordScore[] {
  const allWords: string[][] = documents.map(doc => tokenize(doc));
  const docCount = documents.length;
  
  // Calculate document frequency (how many documents contain each word)
  const docFreq = new Map<string, number>();
  allWords.forEach(words => {
    const uniqueWords = new Set(words);
    uniqueWords.forEach(word => {
      docFreq.set(word, (docFreq.get(word) || 0) + 1);
    });
  });

  const scores: WordScore[] = [];
  
  allWords.forEach((words, docIndex) => {
    const freq = calculateFrequency(words);
    const maxFreq = Math.max(...Array.from(freq.values()));
    
    freq.forEach((count, word) => {
      // TF: normalized frequency
      const tf = count / maxFreq;
      
      // IDF: inverse document frequency
      const df = docFreq.get(word) || 1;
      const idf = Math.log(docCount / df);
      
      // TF-IDF score
      const score = tf * idf;
      
      scores.push({
        word,
        score,
        method: 'tfidf',
        details: { tf, idf, frequency: count }
      });
    });
  });

  // Sort by score and remove duplicates
  const uniqueScores = new Map<string, WordScore>();
  scores.forEach(s => {
    if (!uniqueScores.has(s.word) || uniqueScores.get(s.word)!.score < s.score) {
      uniqueScores.set(s.word, s);
    }
  });

  return Array.from(uniqueScores.values())
    .sort((a, b) => b.score - a.score);
}

/**
 * RAKE Method (Rapid Automatic Keyword Extraction)
 * Based on word frequency and co-occurrence
 */
export function extractWithRAKE(text: string): WordScore[] {
  const sentences = splitSentences(text);
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'be',
    'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will',
    'would', 'should', 'could', 'may', 'might', 'must', 'can', 'this',
    'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they'
  ]);

  // Extract candidate phrases (sequences of non-stop words)
  const candidates: string[][] = [];
  sentences.forEach(sentence => {
    const words = tokenize(sentence);
    let currentPhrase: string[] = [];
    
    words.forEach(word => {
      if (!stopWords.has(word)) {
        currentPhrase.push(word);
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

  // Calculate word scores based on frequency and degree (co-occurrence)
  const wordFreq = new Map<string, number>();
  const wordDegree = new Map<string, number>();
  
  candidates.forEach(phrase => {
    const phraseLength = phrase.length;
    phrase.forEach(word => {
      wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
      wordDegree.set(word, (wordDegree.get(word) || 0) + phraseLength);
    });
  });

  // Calculate RAKE score: degree / frequency
  const scores: WordScore[] = [];
  wordFreq.forEach((freq, word) => {
    const degree = wordDegree.get(word) || 0;
    const score = degree / freq;
    
    scores.push({
      word,
      score,
      method: 'rake',
      details: { frequency: freq, relatedness: degree }
    });
  });

  return scores.sort((a, b) => b.score - a.score);
}

/**
 * YAKE Method (Yet Another Keyword Extractor)
 * Based on: case, position, frequency, relatedness, and sentence distribution
 */
export function extractWithYAKE(text: string, originalText: string): WordScore[] {
  const sentences = splitSentences(text);
  const words = tokenize(text);
  const originalWords = originalText.split(/\s+/);
  
  // Calculate statistics
  const wordFreq = calculateFrequency(words);
  const counts = Array.from(wordFreq.values());
  const meanCount = counts.reduce((a, b) => a + b, 0) / counts.length;
  const stdDev = Math.sqrt(
    counts.reduce((sum, c) => sum + Math.pow(c - meanCount, 2), 0) / counts.length
  );
  const maxCount = Math.max(...counts);

  // Track word positions and sentence occurrences
  const wordPositions = new Map<string, number[]>();
  const wordSentences = new Map<string, Set<number>>();
  
  words.forEach((word, index) => {
    if (!wordPositions.has(word)) wordPositions.set(word, []);
    wordPositions.get(word)!.push(index);
  });

  sentences.forEach((sentence, sentIndex) => {
    const sentWords = tokenize(sentence);
    sentWords.forEach(word => {
      if (!wordSentences.has(word)) wordSentences.set(word, new Set());
      wordSentences.get(word)!.add(sentIndex);
    });
  });

  const scores: WordScore[] = [];
  
  wordFreq.forEach((count, word) => {
    // Position score: position(w) = log(log(3 + Median(Sen(w))))
    const positions = wordPositions.get(word) || [];
    const medianPos = positions.length > 0 
      ? positions.sort((a, b) => a - b)[Math.floor(positions.length / 2)]
      : words.length;
    const positionScore = Math.log(Math.log(3 + medianPos));

    // Frequency score: frequency(w) = count / (mean + stdDev)
    const frequencyScore = count / (meanCount + stdDev);

    // Case score (check if word appears capitalized in original text)
    const caseScore = originalWords.some(w => 
      w.toLowerCase() === word && w[0] === w[0].toUpperCase()
    ) ? 2 : 1;

    // Relatedness score (simplified - based on context window)
    const leftContext = positions.map(p => words[p - 1]).filter(Boolean).length;
    const rightContext = positions.map(p => words[p + 1]).filter(Boolean).length;
    const relatednessScore = 1 + ((leftContext + rightContext) * count) / maxCount;

    // Different sentences score
    const sentCount = wordSentences.get(word)?.size || 1;
    const differentScore = sentCount / sentences.length;

    // YAKE score: d*b / (a + c/d + e/d)
    // where: a=case, b=position, c=frequency, d=relatedness, e=different
    const a = caseScore;
    const b = positionScore;
    const c = frequencyScore;
    const d = relatednessScore;
    const e = differentScore;
    
    const score = (d * b) / (a + (c / d) + (e / d));

    scores.push({
      word,
      score: 1 / score, // Invert because lower YAKE score = better
      method: 'yake',
      details: {
        position: positionScore,
        frequency: frequencyScore,
        relatedness: relatednessScore,
        different: differentScore
      }
    });
  });

  return scores.sort((a, b) => b.score - a.score);
}

/**
 * Combined extraction using all methods
 */
export function extractVocabularyAdvanced(
  text: string,
  options: {
    maxWords?: number;
    minWordLength?: number;
    methods?: ('tfidf' | 'rake' | 'yake')[];
  } = {}
): ExtractionResult {
  const {
    maxWords = 50,
    minWordLength = 3,
    methods = ['tfidf', 'rake', 'yake']
  } = options;

  // Preprocess
  const sentences = splitSentences(text);
  const words = tokenize(text);
  const uniqueWords = new Set(words);

  // Run selected methods
  const allScores: WordScore[] = [];
  
  if (methods.includes('tfidf')) {
    const tfidfScores = extractWithTFIDF([text]);
    allScores.push(...tfidfScores);
  }
  
  if (methods.includes('rake')) {
    const rakeScores = extractWithRAKE(text);
    allScores.push(...rakeScores);
  }
  
  if (methods.includes('yake')) {
    const yakeScores = extractWithYAKE(text, text);
    allScores.push(...yakeScores);
  }

  // Combine scores by averaging
  const combinedScores = new Map<string, { total: number; count: number; methods: Set<string> }>();
  
  allScores.forEach(({ word, score, method }) => {
    if (word.length < minWordLength) return;
    
    if (!combinedScores.has(word)) {
      combinedScores.set(word, { total: 0, count: 0, methods: new Set() });
    }
    
    const entry = combinedScores.get(word)!;
    entry.total += score;
    entry.count += 1;
    entry.methods.add(method);
  });

  // Calculate final scores
  const finalScores: WordScore[] = Array.from(combinedScores.entries())
    .map(([word, { total, count, methods: usedMethods }]) => ({
      word,
      score: total / count,
      method: 'combined' as const,
      details: {
        frequency: words.filter(w => w === word).length
      }
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, maxWords);

  return {
    vocabulary: finalScores.map(s => s.word),
    scores: finalScores,
    stats: {
      totalWords: words.length,
      uniqueWords: uniqueWords.size,
      sentences: sentences.length,
      method: methods.join('+')
    }
  };
}
