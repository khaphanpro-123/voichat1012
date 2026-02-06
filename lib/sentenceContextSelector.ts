/**
 * STAGE 2 – Context Intelligence Engine
 * 
 * Mục tiêu: Chọn câu ngữ cảnh tốt nhất cho mỗi từ vựng
 * 
 * Pipeline:
 * 1. Build Sentence objects với metadata
 * 2. Map từ vựng → danh sách câu chứa từ
 * 3. Lọc câu không hợp lệ (quá ngắn/dài, không có động từ)
 * 4. Chấm điểm câu theo công thức weighted
 * 5. Chọn câu tốt nhất cho mỗi từ
 * 6. Highlight từ vựng trong câu
 */

// ============================================================================
// INTERFACES
// ============================================================================

export interface Sentence {
  sentenceId: string;
  text: string;
  position: number;           // Thứ tự xuất hiện trong tài liệu
  paragraphId?: string;
  sectionTitle?: string;
  wordCount: number;
  hasVerb: boolean;
}

export interface WordSentenceMap {
  word: string;
  sentenceIds: string[];
}

export interface SentenceScore {
  sentenceId: string;
  score: number;
  breakdown: {
    keywordDensity: number;
    lengthScore: number;
    positionScore: number;
    clarityScore: number;
  };
}

export interface VocabularyContext {
  word: string;
  finalScore: number;         // Score từ vocabulary extraction
  contextSentence: string;    // Câu ngữ cảnh với từ được highlight
  sentenceId: string;
  sentenceScore: number;      // Score của câu được chọn
  explanation?: string;       // Giải thích tại sao chọn câu này
}

export interface ContextSelectionOptions {
  minSentenceWords?: number;  // Default: 5
  maxSentenceWords?: number;  // Default: 35
  optimalMinWords?: number;   // Default: 8
  optimalMaxWords?: number;   // Default: 20
  requireVerb?: boolean;      // Default: true
  weights?: {
    keywordDensity?: number;  // Default: 0.4
    lengthScore?: number;     // Default: 0.3
    positionScore?: number;   // Default: 0.2
    clarityScore?: number;    // Default: 0.1
  };
}

// ============================================================================
// BƯỚC 2.1 – XÂY DỰNG SENTENCE OBJECTS
// ============================================================================

/**
 * Tách văn bản thành các câu và tạo Sentence objects
 */
export function buildSentences(text: string): Sentence[] {
  // Tách câu theo dấu câu
  const rawSentences = text
    .split(/[.!?]+/)
    .map(s => s.trim())
    .filter(s => s.length > 0);

  const sentences: Sentence[] = [];
  
  rawSentences.forEach((sentenceText, index) => {
    const words = sentenceText.split(/\s+/).filter(w => w.length > 0);
    const wordCount = words.length;
    
    // Kiểm tra có động từ không (heuristic đơn giản)
    const hasVerb = detectVerb(sentenceText);
    
    sentences.push({
      sentenceId: `s${index + 1}`,
      text: sentenceText,
      position: index,
      wordCount,
      hasVerb,
      paragraphId: `p${Math.floor(index / 5) + 1}`, // Giả định mỗi đoạn ~5 câu
      sectionTitle: 'Unknown' // Có thể enhance sau
    });
  });
  
  return sentences;
}

/**
 * Phát hiện động từ trong câu (heuristic đơn giản)
 * Kiểm tra các động từ tiếng Việt phổ biến và pattern
 */
function detectVerb(sentence: string): boolean {
  const lowerSentence = sentence.toLowerCase();
  
  // Danh sách động từ tiếng Việt phổ biến
  const commonVerbs = [
    'là', 'có', 'được', 'làm', 'đi', 'đến', 'về', 'ra', 'vào', 'lên', 'xuống',
    'cho', 'lấy', 'đưa', 'mang', 'cầm', 'nói', 'kể', 'hỏi', 'trả lời',
    'nghĩ', 'biết', 'hiểu', 'học', 'dạy', 'viết', 'đọc', 'nghe', 'nhìn', 'thấy',
    'ăn', 'uống', 'ngủ', 'thức', 'chơi', 'làm việc', 'nghỉ', 'chạy', 'đứng', 'ngồi',
    'phát triển', 'tạo', 'xây dựng', 'thiết kế', 'thực hiện', 'áp dụng', 'sử dụng',
    'nghiên cứu', 'phân tích', 'đánh giá', 'kiểm tra', 'thử nghiệm', 'cải thiện'
  ];
  
  // Kiểm tra động từ
  for (const verb of commonVerbs) {
    if (lowerSentence.includes(verb)) {
      return true;
    }
  }
  
  // Pattern: từ kết thúc bằng các hậu tố động từ tiếng Việt
  const verbSuffixes = ['hóa', 'hoá', 'ize', 'ise'];
  const words = lowerSentence.split(/\s+/);
  for (const word of words) {
    for (const suffix of verbSuffixes) {
      if (word.endsWith(suffix)) {
        return true;
      }
    }
  }
  
  return false;
}

// ============================================================================
// BƯỚC 2.2 – GÁN TỪ → DANH SÁCH CÂU CHỨA TỪ
// ============================================================================

/**
 * Tạo map từ vựng → danh sách câu chứa từ đó
 * Case-insensitive, whole-word matching
 */
export function mapWordsToSentences(
  vocabularyWords: string[],
  sentences: Sentence[]
): WordSentenceMap[] {
  const wordMaps: WordSentenceMap[] = [];
  
  for (const word of vocabularyWords) {
    const sentenceIds: string[] = [];
    const wordLower = word.toLowerCase();
    
    // Tạo regex cho whole-word matching
    const wordRegex = new RegExp(`\\b${escapeRegex(wordLower)}\\b`, 'i');
    
    for (const sentence of sentences) {
      if (wordRegex.test(sentence.text)) {
        sentenceIds.push(sentence.sentenceId);
      }
    }
    
    wordMaps.push({
      word,
      sentenceIds
    });
  }
  
  return wordMaps;
}

/**
 * Escape special regex characters
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ============================================================================
// BƯỚC 2.3 – LỌC CÂU RÁC
// ============================================================================

/**
 * Lọc các câu không hợp lệ
 */
export function filterInvalidSentences(
  sentences: Sentence[],
  options: ContextSelectionOptions = {}
): Sentence[] {
  const {
    minSentenceWords = 5,
    maxSentenceWords = 35,
    requireVerb = true
  } = options;
  
  return sentences.filter(sentence => {
    // Loại bỏ câu quá ngắn
    if (sentence.wordCount < minSentenceWords) {
      return false;
    }
    
    // Loại bỏ câu quá dài
    if (sentence.wordCount > maxSentenceWords) {
      return false;
    }
    
    // Loại bỏ câu không có động từ
    if (requireVerb && !sentence.hasVerb) {
      return false;
    }
    
    // Loại bỏ câu chỉ là tiêu đề (toàn chữ hoa hoặc không có dấu câu)
    const upperCaseRatio = (sentence.text.match(/[A-Z]/g) || []).length / sentence.text.length;
    if (upperCaseRatio > 0.7) {
      return false;
    }
    
    return true;
  });
}

// ============================================================================
// BƯỚC 2.4 – CHẤM ĐIỂM CÂU (CORE LOGIC)
// ============================================================================

/**
 * Tính keyword density: tỷ lệ từ quan trọng trong câu
 */
function calculateKeywordDensity(
  sentence: Sentence,
  vocabularyWords: string[]
): number {
  const sentenceLower = sentence.text.toLowerCase();
  let keywordCount = 0;
  
  for (const word of vocabularyWords) {
    const wordRegex = new RegExp(`\\b${escapeRegex(word.toLowerCase())}\\b`, 'g');
    const matches = sentenceLower.match(wordRegex);
    if (matches) {
      keywordCount += matches.length;
    }
  }
  
  return keywordCount / sentence.wordCount;
}

/**
 * Tính length score: câu 8-20 từ là tốt nhất
 */
function calculateLengthScore(
  sentence: Sentence,
  optimalMin: number = 8,
  optimalMax: number = 20
): number {
  const wordCount = sentence.wordCount;
  
  if (wordCount >= optimalMin && wordCount <= optimalMax) {
    return 1.0; // Perfect length
  }
  
  if (wordCount < optimalMin) {
    // Too short: linear penalty
    return wordCount / optimalMin;
  }
  
  // Too long: exponential penalty
  const excess = wordCount - optimalMax;
  return Math.exp(-excess / 10);
}

/**
 * Tính position score: câu xuất hiện sớm hơn → quan trọng hơn
 */
function calculatePositionScore(
  sentence: Sentence,
  totalSentences: number
): number {
  // Exponential decay: câu đầu tiên = 1.0, giảm dần
  return Math.exp(-sentence.position / (totalSentences * 0.3));
}

/**
 * Tính clarity score: có động từ, không phải list
 */
function calculateClarityScore(sentence: Sentence): number {
  let score = 0;
  
  // Có động từ: +0.5
  if (sentence.hasVerb) {
    score += 0.5;
  }
  
  // Không phải list (ít dấu phẩy, không có bullet points)
  const commaCount = (sentence.text.match(/,/g) || []).length;
  const commaRatio = commaCount / sentence.wordCount;
  
  if (commaRatio < 0.15) {
    score += 0.3; // Câu tự nhiên
  } else if (commaRatio < 0.3) {
    score += 0.15; // Câu hơi nhiều phẩy
  }
  
  // Không có bullet points hoặc numbering
  if (!/^[\d\-•*]/.test(sentence.text.trim())) {
    score += 0.2;
  }
  
  return Math.min(score, 1.0);
}

/**
 * Chấm điểm một câu theo công thức weighted
 */
export function scoreSentence(
  sentence: Sentence,
  vocabularyWords: string[],
  totalSentences: number,
  options: ContextSelectionOptions = {}
): SentenceScore {
  const {
    optimalMinWords = 8,
    optimalMaxWords = 20,
    weights = {
      keywordDensity: 0.4,
      lengthScore: 0.3,
      positionScore: 0.2,
      clarityScore: 0.1
    }
  } = options;
  
  const keywordDensity = calculateKeywordDensity(sentence, vocabularyWords);
  const lengthScore = calculateLengthScore(sentence, optimalMinWords, optimalMaxWords);
  const positionScore = calculatePositionScore(sentence, totalSentences);
  const clarityScore = calculateClarityScore(sentence);
  
  const finalScore = 
    weights.keywordDensity! * keywordDensity +
    weights.lengthScore! * lengthScore +
    weights.positionScore! * positionScore +
    weights.clarityScore! * clarityScore;
  
  return {
    sentenceId: sentence.sentenceId,
    score: finalScore,
    breakdown: {
      keywordDensity,
      lengthScore,
      positionScore,
      clarityScore
    }
  };
}

// ============================================================================
// BƯỚC 2.5 – CHỌN CÂU TỐT NHẤT & HIGHLIGHT
// ============================================================================

/**
 * Chọn câu tốt nhất cho mỗi từ vựng
 */
export function selectBestContexts(
  vocabularyList: Array<{ word: string; score: number }>,
  sentences: Sentence[],
  options: ContextSelectionOptions = {}
): VocabularyContext[] {
  // Bước 1: Lọc câu hợp lệ
  const validSentences = filterInvalidSentences(sentences, options);
  
  if (validSentences.length === 0) {
    console.warn('[Context Selector] No valid sentences found');
    return [];
  }
  
  // Bước 2: Map từ → câu
  const vocabularyWords = vocabularyList.map(v => v.word);
  const wordMaps = mapWordsToSentences(vocabularyWords, validSentences);
  
  // Bước 3: Chọn câu tốt nhất cho mỗi từ
  const contexts: VocabularyContext[] = [];
  
  for (let i = 0; i < vocabularyList.length; i++) {
    const vocabItem = vocabularyList[i];
    const wordMap = wordMaps[i];
    
    if (wordMap.sentenceIds.length === 0) {
      console.warn(`[Context Selector] No sentences found for word: ${vocabItem.word}`);
      continue;
    }
    
    // Lấy các câu chứa từ này
    const candidateSentences = validSentences.filter(s => 
      wordMap.sentenceIds.includes(s.sentenceId)
    );
    
    // Chấm điểm các câu
    const sentenceScores = candidateSentences.map(sentence =>
      scoreSentence(sentence, vocabularyWords, validSentences.length, options)
    );
    
    // Chọn câu có điểm cao nhất
    const bestScore = sentenceScores.reduce((best, current) =>
      current.score > best.score ? current : best
    );
    
    const bestSentence = candidateSentences.find(s => 
      s.sentenceId === bestScore.sentenceId
    )!;
    
    // Highlight từ vựng trong câu
    const highlightedSentence = highlightWord(bestSentence.text, vocabItem.word);
    
    // Tạo explanation
    const explanation = generateExplanation(bestScore, bestSentence);
    
    contexts.push({
      word: vocabItem.word,
      finalScore: vocabItem.score,
      contextSentence: highlightedSentence,
      sentenceId: bestScore.sentenceId,
      sentenceScore: bestScore.score,
      explanation
    });
  }
  
  return contexts;
}

/**
 * Highlight từ vựng trong câu bằng HTML <b> tags
 */
function highlightWord(sentence: string, word: string): string {
  const wordRegex = new RegExp(`\\b(${escapeRegex(word)})\\b`, 'gi');
  return sentence.replace(wordRegex, '<b>$1</b>');
}

/**
 * Tạo explanation cho việc chọn câu
 */
function generateExplanation(
  sentenceScore: SentenceScore,
  sentence: Sentence
): string {
  const { breakdown } = sentenceScore;
  const reasons: string[] = [];
  
  if (breakdown.keywordDensity > 0.15) {
    reasons.push(`mật độ từ khóa cao (${(breakdown.keywordDensity * 100).toFixed(1)}%)`);
  }
  
  if (breakdown.lengthScore > 0.8) {
    reasons.push(`độ dài tối ưu (${sentence.wordCount} từ)`);
  }
  
  if (breakdown.positionScore > 0.7) {
    reasons.push('xuất hiện sớm trong tài liệu');
  }
  
  if (breakdown.clarityScore > 0.7) {
    reasons.push('câu rõ ràng, có động từ');
  }
  
  if (reasons.length === 0) {
    reasons.push('điểm tổng hợp cao');
  }
  
  return `Được chọn vì: ${reasons.join(', ')}. Score: ${sentenceScore.score.toFixed(3)}`;
}

// ============================================================================
// MAIN EXPORT FUNCTION
// ============================================================================

/**
 * STAGE 2 Main Function: Chọn ngữ cảnh tốt nhất cho từ vựng
 */
export function selectVocabularyContexts(
  cleanedText: string,
  vocabularyList: Array<{ word: string; score: number }>,
  options: ContextSelectionOptions = {}
): VocabularyContext[] {
  console.log('[Context Selector] Starting context selection...');
  console.log(`[Context Selector] Input: ${vocabularyList.length} vocabulary words`);
  
  // Bước 1: Build sentences
  const sentences = buildSentences(cleanedText);
  console.log(`[Context Selector] Built ${sentences.length} sentences`);
  
  // Bước 2-5: Select best contexts
  const contexts = selectBestContexts(vocabularyList, sentences, options);
  console.log(`[Context Selector] Selected ${contexts.length} contexts`);
  
  return contexts;
}
