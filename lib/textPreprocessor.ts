/**
 * Text Preprocessor - Lọc metadata kỹ thuật và chuẩn hóa văn bản OCR
 * Loại bỏ XMP, RDF, XML tags, mã hóa, và các chuỗi không có nghĩa ngôn ngữ
 */

// Patterns để nhận diện metadata kỹ thuật
const TECHNICAL_PATTERNS = [
  // XMP/RDF/XML metadata
  /<\?xpacket[^>]*\?>[\s\S]*?<\?xpacket[^>]*\?>/gi,
  /<x:xmpmeta[^>]*>[\s\S]*?<\/x:xmpmeta>/gi,
  /<rdf:RDF[^>]*>[\s\S]*?<\/rdf:RDF>/gi,
  /<[^>]*xmlns[^>]*>[^<]*<\/[^>]+>/gi,
  // XML/HTML tags
  /<\/?[a-z][a-z0-9]*[^>]*>/gi,
  // Adobe/PDF metadata
  /\/[A-Z][a-z]+\s*\([^)]+\)/g,
  /\/[A-Z][a-z]+\s*<[^>]+>/g,
  // UUID, checksum, hash
  /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
  /[0-9a-f]{32,}/gi,
  // Base64 encoded strings (long alphanumeric)
  /[A-Za-z0-9+/=]{50,}/g,
  // Hex encoded
  /\\x[0-9a-f]{2}/gi,
  /0x[0-9a-f]+/gi,
];

// Từ khóa metadata cần loại bỏ
const METADATA_KEYWORDS = [
  'xmp', 'rdf', 'xmlns', 'adobe', 'photoshop', 'illustrator', 'indesign',
  'moddate', 'createdate', 'metadatadate', 'producer', 'creator',
  'xmpmeta', 'xpacket', 'stref', 'stevt', 'xmpgimg',
  'uuid', 'checksum', 'instanceid', 'documentid', 'originaldocumentid',
  'pdf', 'pdfx', 'pdfaid', 'pdfa', 'pdfua',
];

// Patterns cho chuỗi vô nghĩa (OCR errors, random strings)
const NOISE_PATTERNS = [
  // Chuỗi ký tự lặp lại
  /(.)\1{4,}/g,
  // Chuỗi không có nguyên âm (không phải từ thật)
  /\b[bcdfghjklmnpqrstvwxz]{5,}\b/gi,
  // Chuỗi số + chữ hỗn hợp vô nghĩa
  /\b[a-z]*\d+[a-z]+\d+[a-z]*\b/gi,
  // DOI patterns
  /doi:?\s*10\.\d{4,}\/[^\s]+/gi,
  /10\.\d{4,}\/[^\s]+/g,
];

// Stopwords tiếng Anh (không trích làm từ vựng)
const ENGLISH_STOPWORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been',
  'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
  'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'dare', 'ought',
  'used', 'it', 'its', 'this', 'that', 'these', 'those', 'i', 'you', 'he',
  'she', 'we', 'they', 'me', 'him', 'her', 'us', 'them', 'my', 'your',
  'his', 'our', 'their', 'mine', 'yours', 'hers', 'ours', 'theirs',
  'what', 'which', 'who', 'whom', 'whose', 'where', 'when', 'why', 'how',
  'all', 'each', 'every', 'both', 'few', 'more', 'most', 'other', 'some',
  'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too',
  'very', 'just', 'also', 'now', 'here', 'there', 'then', 'once',
]);

export interface PreprocessResult {
  cleanText: string;
  removedMetadata: string[];
  removedNoise: string[];
  stats: {
    originalLength: number;
    cleanLength: number;
    metadataRemoved: number;
    noiseRemoved: number;
  };
}

export interface WordValidation {
  word: string;
  label: 'valid' | 'technical' | 'noise' | 'stopword' | 'unknown';
  reason?: string;
}

/**
 * Loại bỏ metadata kỹ thuật (XMP, RDF, XML, etc.)
 */
function removeMetadata(text: string): { text: string; removed: string[] } {
  const removed: string[] = [];
  let result = text;

  // Remove technical patterns
  for (const pattern of TECHNICAL_PATTERNS) {
    const matches = result.match(pattern);
    if (matches) {
      removed.push(...matches.slice(0, 5)); // Limit stored matches
      result = result.replace(pattern, ' ');
    }
  }

  // Remove lines containing metadata keywords
  const lines = result.split('\n');
  const cleanLines = lines.filter(line => {
    const lowerLine = line.toLowerCase();
    const hasMetadata = METADATA_KEYWORDS.some(kw => lowerLine.includes(kw));
    if (hasMetadata && line.length < 200) {
      removed.push(line.trim().slice(0, 100));
      return false;
    }
    return true;
  });

  return { text: cleanLines.join('\n'), removed };
}

/**
 * Loại bỏ noise (OCR errors, random strings)
 */
function removeNoise(text: string): { text: string; removed: string[] } {
  const removed: string[] = [];
  let result = text;

  for (const pattern of NOISE_PATTERNS) {
    const matches = result.match(pattern);
    if (matches) {
      removed.push(...matches.slice(0, 5));
      result = result.replace(pattern, ' ');
    }
  }

  return { text: result, removed };
}

/**
 * Chuẩn hóa văn bản OCR
 */
function normalizeText(text: string): string {
  return text
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    // Remove control characters
    .replace(/[\x00-\x1F\x7F]/g, '')
    // Fix common OCR errors
    .replace(/['']/g, "'")
    .replace(/[""]/g, '"')
    .replace(/…/g, '...')
    .replace(/–/g, '-')
    .replace(/—/g, ' - ')
    // Remove excessive punctuation
    .replace(/([.!?]){3,}/g, '$1$1$1')
    // Trim
    .trim();
}

/**
 * Kiểm tra xem một từ có phải là từ tiếng Anh hợp lệ không
 */
function isValidEnglishWord(word: string): boolean {
  // Phải có ít nhất 2 ký tự
  if (word.length < 2) return false;
  // Phải chứa nguyên âm (trừ một số từ đặc biệt)
  if (!/[aeiou]/i.test(word) && word.length > 3) return false;
  // Không được toàn số
  if (/^\d+$/.test(word)) return false;
  // Không được có quá nhiều số
  if ((word.match(/\d/g) || []).length > word.length / 2) return false;
  // Không được có ký tự đặc biệt (trừ hyphen)
  if (/[^a-zA-Z0-9\-']/.test(word)) return false;
  return true;
}

/**
 * Validate và gắn nhãn cho từ/cụm từ
 */
export function validateWord(word: string): WordValidation {
  const lowerWord = word.toLowerCase().trim();
  
  // Check stopword
  if (ENGLISH_STOPWORDS.has(lowerWord)) {
    return { word, label: 'stopword', reason: 'Common stopword' };
  }

  // Check technical/metadata
  if (METADATA_KEYWORDS.some(kw => lowerWord.includes(kw))) {
    return { word, label: 'technical', reason: 'Contains metadata keyword' };
  }

  // Check noise patterns
  for (const pattern of NOISE_PATTERNS) {
    if (pattern.test(word)) {
      return { word, label: 'noise', reason: 'Matches noise pattern' };
    }
  }

  // Check if valid English
  if (!isValidEnglishWord(lowerWord.replace(/\s+/g, ''))) {
    return { word, label: 'unknown', reason: 'Not a valid word structure' };
  }

  return { word, label: 'valid' };
}

/**
 * Main preprocessing function
 */
export function preprocessText(rawText: string): PreprocessResult {
  const originalLength = rawText.length;

  // Step 1: Remove metadata
  const { text: noMetadata, removed: removedMetadata } = removeMetadata(rawText);

  // Step 2: Remove noise
  const { text: noNoise, removed: removedNoise } = removeNoise(noMetadata);

  // Step 3: Normalize
  const cleanText = normalizeText(noNoise);

  return {
    cleanText,
    removedMetadata,
    removedNoise,
    stats: {
      originalLength,
      cleanLength: cleanText.length,
      metadataRemoved: removedMetadata.length,
      noiseRemoved: removedNoise.length,
    },
  };
}

/**
 * Filter vocabulary list - chỉ giữ lại từ valid
 */
export function filterVocabulary(words: string[]): { valid: string[]; rejected: WordValidation[] } {
  const valid: string[] = [];
  const rejected: WordValidation[] = [];

  for (const word of words) {
    const validation = validateWord(word);
    if (validation.label === 'valid') {
      valid.push(word);
    } else {
      rejected.push(validation);
    }
  }

  return { valid, rejected };
}
