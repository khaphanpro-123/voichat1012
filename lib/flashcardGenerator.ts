// lib/flashcardGenerator.ts
// Bước 3: Tạo flashcards từ cụm từ đã trích

import { ExtractedPhrase } from './phraseExtractorAI';

export interface SmartFlashcard {
  id: string;
  front: string;
  back: string;
  extra: {
    tags: string[];
    category: string;
    source_span: string;
  };
  difficulty: number; // 1-5
  review_hint: string;
  term: string;
  translation_vi: string;
  definition: string;
  example: string;
}

export function generateFlashcardsFromPhrases(phrases: ExtractedPhrase[]): SmartFlashcard[] {
  return phrases.map((phrase, index) => {
    // Calculate difficulty based on category and term length
    let difficulty = 3;
    if (phrase.category === 'theory' || phrase.category === 'model') difficulty = 4;
    if (phrase.category === 'principle') difficulty = 5;
    if (phrase.category === 'vocabulary') difficulty = 2;
    if (phrase.term.split(' ').length > 3) difficulty = Math.min(5, difficulty + 1);
    
    // Generate review hint
    const hint = generateReviewHint(phrase);
    
    // Format front with domain context
    const domainTag = phrase.tags[0] ? `[${phrase.tags[0]}]` : '';
    const front = `${domainTag} ${phrase.term}`.trim();
    
    // Format back with all info
    const back = `${phrase.translation_vi} — ${phrase.definition}\n\nVí dụ: ${phrase.example}`;
    
    return {
      id: `fc_${Date.now()}_${index}`,
      front,
      back,
      extra: {
        tags: phrase.tags,
        category: phrase.category,
        source_span: phrase.source_span
      },
      difficulty,
      review_hint: hint,
      term: phrase.term,
      translation_vi: phrase.translation_vi,
      definition: phrase.definition,
      example: phrase.example
    };
  });
}

function generateReviewHint(phrase: ExtractedPhrase): string {
  const hints: Record<string, string> = {
    theory: `Nhớ: Đây là lý thuyết về "${phrase.translation_vi}"`,
    model: `Mô hình này giải thích: ${phrase.translation_vi}`,
    method: `Phương pháp: ${phrase.translation_vi}`,
    tool: `Công cụ: ${phrase.translation_vi}`,
    process: `Quy trình: ${phrase.translation_vi}`,
    principle: `Nguyên tắc: ${phrase.translation_vi}`,
    concept: `Khái niệm: ${phrase.translation_vi}`,
    vocabulary: `Từ vựng: ${phrase.translation_vi}`
  };
  
  return hints[phrase.category] || `Ghi nhớ: ${phrase.translation_vi}`;
}

// Convert to format compatible with existing Vocabulary model
export function convertToVocabularyFormat(flashcard: SmartFlashcard) {
  return {
    word: flashcard.term,
    type: mapCategoryToType(flashcard.extra.category),
    meaning: flashcard.translation_vi,
    example: flashcard.example,
    exampleTranslation: flashcard.definition,
    level: mapDifficultyToLevel(flashcard.difficulty),
    category: flashcard.extra.category,
    imagePrompt: `illustration of ${flashcard.term}, ${flashcard.translation_vi}, educational style, clear and simple`,
    tags: flashcard.extra.tags
  };
}

function mapCategoryToType(category: string): string {
  const mapping: Record<string, string> = {
    theory: 'danh từ',
    model: 'danh từ',
    method: 'danh từ',
    tool: 'danh từ',
    process: 'danh từ',
    principle: 'danh từ',
    concept: 'danh từ',
    vocabulary: 'từ vựng'
  };
  return mapping[category] || 'danh từ';
}

function mapDifficultyToLevel(difficulty: number): 'beginner' | 'intermediate' | 'advanced' {
  if (difficulty <= 2) return 'beginner';
  if (difficulty <= 4) return 'intermediate';
  return 'advanced';
}
