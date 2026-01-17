/**
 * Metadata Filter for Document Text Processing
 * Removes technical metadata from PDF/Word documents before vocabulary extraction
 */

// Comprehensive list of metadata patterns to remove
const METADATA_PATTERNS = {
  // PDF metadata
  pdfMetadata: /\/Type|\/Font|\/Subtype|\/BaseFont|\/Encoding|\/ToUnicode|\/DescendantFonts|\/CIDSystemInfo/gi,
  pdfObjects: /\/XObject|\/Image|\/Form|\/Pattern|\/Shading|\/ExtGState/gi,
  pdfColors: /\/DeviceRGB|\/DeviceCMYK|\/DeviceGray|\/ICCBased|\/Indexed|\/Separation/gi,
  pdfCompression: /\/FlateDecode|\/DCTDecode|\/CCITTFaxDecode|\/LZWDecode/gi,
  pdfStructure: /\/Page|\/Pages|\/Catalog|\/Outlines|\/Names|\/Dests/gi,
  
  // Font names
  fontNames: /Times New Roman|Arial|Helvetica|Calibri|Courier|Verdana|Georgia|Tahoma|Comic Sans/gi,
  fontDescriptors: /FontDescriptor|FontFile|FontBBox|ItalicAngle|Ascent|Descent|CapHeight|StemV/gi,
  
  // Software metadata
  software: /Adobe|Acrobat|Distiller|Microsoft|Word|Excel|PowerPoint|Google Docs|LibreOffice/gi,
  
  // Technical terms
  technical: /BitsPerComponent|ColorSpace|Width|Height|Length|Filter|DecodeParms|Interpolate/gi,
  
  // Brackets and special chars
  brackets: /<<|>>|\{|\}|\[|\]/g,
  slashes: /\/[A-Za-z0-9]+/g,
  
  // All caps technical terms (3+ chars)
  allCaps: /\b[A-Z]{3,}\b/g,
};

// Common Vietnamese stop words (to keep)
const VIETNAMESE_STOP_WORDS = new Set([
  'và', 'của', 'có', 'là', 'được', 'trong', 'với', 'để', 'cho', 'từ',
  'này', 'đó', 'những', 'các', 'một', 'hai', 'ba', 'bốn', 'năm',
  'tôi', 'bạn', 'anh', 'chị', 'em', 'họ', 'chúng', 'ta', 'mình',
]);

/**
 * Clean text by removing metadata patterns
 */
export function cleanMetadata(text: string): string {
  if (!text) return '';
  
  let cleaned = text;
  
  // Remove all metadata patterns
  Object.values(METADATA_PATTERNS).forEach(pattern => {
    cleaned = cleaned.replace(pattern, ' ');
  });
  
  // Remove multiple spaces
  cleaned = cleaned.replace(/\s+/g, ' ');
  
  // Remove lines that are likely metadata (short lines with special chars)
  cleaned = cleaned
    .split('\n')
    .filter(line => {
      const trimmed = line.trim();
      // Keep lines that are longer and don't have too many special chars
      const specialCharRatio = (trimmed.match(/[\/\<\>\{\}\[\]]/g) || []).length / trimmed.length;
      return trimmed.length > 10 && specialCharRatio < 0.2;
    })
    .join('\n');
  
  return cleaned.trim();
}

/**
 * Extract meaningful words from text (post-AI filtering)
 */
export function filterMeaningfulWords(words: string[]): string[] {
  return words.filter(word => {
    const lower = word.toLowerCase();
    
    // Too short
    if (word.length < 2) return false;
    
    // Contains special characters
    if (/[\/\<\>\{\}\[\]@#$%^&*()+=]/.test(word)) return false;
    
    // All caps (likely metadata) - but keep Vietnamese stop words
    if (/^[A-Z]{3,}$/.test(word) && !VIETNAMESE_STOP_WORDS.has(lower)) return false;
    
    // Metadata keywords
    const metadataKeywords = [
      'cmyk', 'rgb', 'device', 'font', 'type', 'acrobat', 'distiller',
      'adobe', 'microsoft', 'encoding', 'colorspace', 'xobject',
      'descriptor', 'bitspercomponent', 'flatedecode', 'dctdecode'
    ];
    
    if (metadataKeywords.some(keyword => lower.includes(keyword))) return false;
    
    // Must contain at least one letter
    if (!/[a-zA-ZÀ-ỹ]/.test(word)) return false;
    
    return true;
  });
}

/**
 * Calculate TF-IDF score for words (simplified version)
 */
export function calculateTFIDF(text: string): Map<string, number> {
  const words = text.toLowerCase().split(/\s+/);
  const wordFreq = new Map<string, number>();
  
  // Calculate term frequency
  words.forEach(word => {
    if (word.length >= 3) {
      wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
    }
  });
  
  // Simple TF-IDF (without document corpus, just use frequency)
  const tfidf = new Map<string, number>();
  const maxFreq = Math.max(...Array.from(wordFreq.values()));
  
  wordFreq.forEach((freq, word) => {
    // Normalize by max frequency
    const tf = freq / maxFreq;
    // Boost words that appear multiple times but not too common
    const score = tf * Math.log(1 + freq);
    tfidf.set(word, score);
  });
  
  return tfidf;
}

/**
 * Pre-process document text before sending to AI
 */
export function preprocessDocumentText(rawText: string): {
  cleanedText: string;
  stats: {
    originalLength: number;
    cleanedLength: number;
    removedChars: number;
    estimatedMetadataRemoved: number;
  };
} {
  const originalLength = rawText.length;
  
  // Step 1: Clean metadata
  const cleaned = cleanMetadata(rawText);
  
  // Step 2: Remove duplicate lines (common in OCR)
  const lines = cleaned.split('\n');
  const uniqueLines = [...new Set(lines)];
  const deduplicated = uniqueLines.join('\n');
  
  // Step 3: Remove very short lines (likely noise)
  const meaningfulLines = deduplicated
    .split('\n')
    .filter(line => line.trim().length > 5)
    .join('\n');
  
  const cleanedLength = meaningfulLines.length;
  const removedChars = originalLength - cleanedLength;
  const estimatedMetadataRemoved = Math.floor((removedChars / originalLength) * 100);
  
  return {
    cleanedText: meaningfulLines,
    stats: {
      originalLength,
      cleanedLength,
      removedChars,
      estimatedMetadataRemoved,
    },
  };
}

/**
 * Validate if a word is likely meaningful vocabulary
 */
export function isMeaningfulVocabulary(word: string): boolean {
  const lower = word.toLowerCase().trim();
  
  // Basic checks
  if (lower.length < 2) return false;
  if (!/[a-zA-ZÀ-ỹ]/.test(lower)) return false;
  
  // Metadata patterns
  const metadataPatterns = [
    /^[A-Z]{3,}$/, // All caps
    /[\/\<\>\{\}\[\]]/,  // Special chars
    /cmyk|rgb|device|font|type|acrobat|distiller|adobe|microsoft/i,
    /encoding|colorspace|xobject|descriptor|bits|decode/i,
  ];
  
  return !metadataPatterns.some(pattern => pattern.test(lower));
}
