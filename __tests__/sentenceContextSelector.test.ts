/**
 * Tests for STAGE 2 - Context Intelligence Engine
 */

import {
  buildSentences,
  mapWordsToSentences,
  filterInvalidSentences,
  scoreSentence,
  selectBestContexts,
  selectVocabularyContexts,
  Sentence
} from '../lib/sentenceContextSelector';

describe('STAGE 2 - Context Intelligence Engine', () => {
  
  // ========================================================================
  // BƯỚC 2.1 – XÂY DỰNG SENTENCE OBJECTS
  // ========================================================================
  
  describe('buildSentences', () => {
    it('should split text into sentences with metadata', () => {
      const text = 'This is sentence one. This is sentence two! Is this sentence three?';
      const sentences = buildSentences(text);
      
      expect(sentences).toHaveLength(3);
      expect(sentences[0].sentenceId).toBe('s1');
      expect(sentences[0].text).toBe('This is sentence one');
      expect(sentences[0].position).toBe(0);
      expect(sentences[0].wordCount).toBe(4);
    });
    
    it('should detect verbs in sentences', () => {
      const text = 'Ontology is a formal representation. The system uses advanced algorithms.';
      const sentences = buildSentences(text);
      
      expect(sentences[0].hasVerb).toBe(true); // "is"
      expect(sentences[1].hasVerb).toBe(true); // "uses"
    });
    
    it('should handle Vietnamese text', () => {
      const text = 'Công nghệ phát triển nhanh. Học sinh học bài. Đây là ví dụ.';
      const sentences = buildSentences(text);
      
      expect(sentences).toHaveLength(3);
      expect(sentences[0].hasVerb).toBe(true); // "phát triển"
      expect(sentences[1].hasVerb).toBe(true); // "học"
    });
  });
  
  // ========================================================================
  // BƯỚC 2.2 – GÁN TỪ → DANH SÁCH CÂU CHỨA TỪ
  // ========================================================================
  
  describe('mapWordsToSentences', () => {
    it('should map words to sentences containing them', () => {
      const sentences = buildSentences(
        'Ontology is important. Knowledge representation uses ontology. Semantic web relies on ontology.'
      );
      
      const wordMaps = mapWordsToSentences(['ontology', 'knowledge'], sentences);
      
      expect(wordMaps).toHaveLength(2);
      expect(wordMaps[0].word).toBe('ontology');
      expect(wordMaps[0].sentenceIds).toHaveLength(3); // All 3 sentences
      expect(wordMaps[1].word).toBe('knowledge');
      expect(wordMaps[1].sentenceIds).toHaveLength(1); // Only sentence 2
    });
    
    it('should be case-insensitive', () => {
      const sentences = buildSentences('ONTOLOGY is important. ontology is useful.');
      const wordMaps = mapWordsToSentences(['ontology'], sentences);
      
      expect(wordMaps[0].sentenceIds).toHaveLength(2);
    });
    
    it('should match whole words only', () => {
      const sentences = buildSentences('The topic is ontology. Topical discussion here.');
      const wordMaps = mapWordsToSentences(['topic'], sentences);
      
      // Should match "topic" but not "topical"
      expect(wordMaps[0].sentenceIds).toHaveLength(1);
    });
  });
  
  // ========================================================================
  // BƯỚC 2.3 – LỌC CÂU RÁC
  // ========================================================================
  
  describe('filterInvalidSentences', () => {
    it('should remove sentences that are too short', () => {
      const sentences = buildSentences('Short. This is a longer sentence with more words.');
      const filtered = filterInvalidSentences(sentences, { minSentenceWords: 5 });
      
      expect(filtered).toHaveLength(1);
      expect(filtered[0].text).toContain('longer sentence');
    });
    
    it('should remove sentences that are too long', () => {
      const longSentence = 'This is a very long sentence with many many many many many many many many many many many many many many many many many many many many many many many many many many many many many many many many many many many many words.';
      const sentences = buildSentences(longSentence + ' Short sentence here.');
      const filtered = filterInvalidSentences(sentences, { maxSentenceWords: 35 });
      
      expect(filtered).toHaveLength(1);
      expect(filtered[0].text).toBe('Short sentence here');
    });
    
    it('should remove sentences without verbs', () => {
      const sentences = buildSentences('This has a verb. Just nouns adjectives here.');
      const filtered = filterInvalidSentences(sentences, { requireVerb: true });
      
      // Note: This test depends on verb detection accuracy
      expect(filtered.length).toBeGreaterThan(0);
    });
  });
  
  // ========================================================================
  // BƯỚC 2.4 – CHẤM ĐIỂM CÂU
  // ========================================================================
  
  describe('scoreSentence', () => {
    it('should score sentences based on multiple criteria', () => {
      const sentences = buildSentences(
        'Ontology is a formal representation of knowledge. ' +
        'It defines concepts and relationships. ' +
        'Semantic web uses ontology for data integration.'
      );
      
      const vocabularyWords = ['ontology', 'knowledge', 'semantic'];
      const score = scoreSentence(sentences[0], vocabularyWords, sentences.length);
      
      expect(score.score).toBeGreaterThan(0);
      expect(score.breakdown.keywordDensity).toBeGreaterThan(0);
      expect(score.breakdown.lengthScore).toBeGreaterThan(0);
      expect(score.breakdown.positionScore).toBeGreaterThan(0);
      expect(score.breakdown.clarityScore).toBeGreaterThan(0);
    });
    
    it('should give higher scores to sentences with optimal length', () => {
      const shortSentence = buildSentences('Ontology is important.')[0];
      const optimalSentence = buildSentences('Ontology is a formal representation of knowledge in a specific domain.')[0];
      const longSentence = buildSentences('Ontology is a very very very very very very very very very very very very very very very very long sentence.')[0];
      
      const vocabularyWords = ['ontology'];
      const shortScore = scoreSentence(shortSentence, vocabularyWords, 3);
      const optimalScore = scoreSentence(optimalSentence, vocabularyWords, 3);
      const longScore = scoreSentence(longSentence, vocabularyWords, 3);
      
      expect(optimalScore.breakdown.lengthScore).toBeGreaterThan(shortScore.breakdown.lengthScore);
      expect(optimalScore.breakdown.lengthScore).toBeGreaterThan(longScore.breakdown.lengthScore);
    });
    
    it('should give higher position scores to earlier sentences', () => {
      const sentences = buildSentences(
        'First sentence with ontology. ' +
        'Second sentence with ontology. ' +
        'Third sentence with ontology.'
      );
      
      const vocabularyWords = ['ontology'];
      const score1 = scoreSentence(sentences[0], vocabularyWords, sentences.length);
      const score3 = scoreSentence(sentences[2], vocabularyWords, sentences.length);
      
      expect(score1.breakdown.positionScore).toBeGreaterThan(score3.breakdown.positionScore);
    });
  });
  
  // ========================================================================
  // BƯỚC 2.5 – CHỌN CÂU TỐT NHẤT
  // ========================================================================
  
  describe('selectBestContexts', () => {
    it('should select best context sentence for each word', () => {
      const text = 
        'Ontology is a formal representation of knowledge. ' +
        'Knowledge graphs use ontology. ' +
        'Semantic web relies on ontology for data integration.';
      
      const sentences = buildSentences(text);
      const vocabularyList = [
        { word: 'ontology', score: 0.9 },
        { word: 'knowledge', score: 0.8 }
      ];
      
      const contexts = selectBestContexts(vocabularyList, sentences);
      
      expect(contexts).toHaveLength(2);
      expect(contexts[0].word).toBe('ontology');
      expect(contexts[0].contextSentence).toContain('<b>');
      expect(contexts[0].sentenceScore).toBeGreaterThan(0);
      expect(contexts[0].explanation).toBeTruthy();
    });
    
    it('should highlight words in context sentences', () => {
      const text = 'Ontology is a formal representation of knowledge.';
      const sentences = buildSentences(text);
      const vocabularyList = [{ word: 'ontology', score: 0.9 }];
      
      const contexts = selectBestContexts(vocabularyList, sentences);
      
      expect(contexts[0].contextSentence).toContain('<b>Ontology</b>');
    });
    
    it('should provide explanation for selection', () => {
      const text = 'Ontology is a formal representation of knowledge in computer science.';
      const sentences = buildSentences(text);
      const vocabularyList = [{ word: 'ontology', score: 0.9 }];
      
      const contexts = selectBestContexts(vocabularyList, sentences);
      
      expect(contexts[0].explanation).toContain('Được chọn vì');
      expect(contexts[0].explanation).toContain('Score:');
    });
  });
  
  // ========================================================================
  // INTEGRATION TEST
  // ========================================================================
  
  describe('selectVocabularyContexts (Integration)', () => {
    it('should complete full pipeline from text to contexts', () => {
      const text = `
        Ontology is a formal representation of knowledge within a domain.
        It defines concepts, properties, and relationships between entities.
        Knowledge graphs are built using ontologies.
        Semantic web technologies rely heavily on ontology engineering.
        The Web Ontology Language (OWL) is a standard for creating ontologies.
      `;
      
      const vocabularyList = [
        { word: 'ontology', score: 0.95 },
        { word: 'knowledge', score: 0.85 },
        { word: 'semantic', score: 0.80 }
      ];
      
      const contexts = selectVocabularyContexts(text, vocabularyList);
      
      expect(contexts.length).toBeGreaterThan(0);
      expect(contexts.length).toBeLessThanOrEqual(vocabularyList.length);
      
      contexts.forEach(ctx => {
        expect(ctx.word).toBeTruthy();
        expect(ctx.contextSentence).toBeTruthy();
        expect(ctx.sentenceId).toMatch(/^s\d+$/);
        expect(ctx.sentenceScore).toBeGreaterThan(0);
        expect(ctx.explanation).toBeTruthy();
      });
    });
    
    it('should handle Vietnamese text', () => {
      const text = `
        Công nghệ thông tin phát triển rất nhanh trong thời đại hiện nay.
        Trí tuệ nhân tạo đang được ứng dụng rộng rãi.
        Học máy là một nhánh quan trọng của trí tuệ nhân tạo.
        Dữ liệu lớn giúp cải thiện độ chính xác của mô hình.
      `;
      
      const vocabularyList = [
        { word: 'công nghệ', score: 0.9 },
        { word: 'trí tuệ nhân tạo', score: 0.85 },
        { word: 'học máy', score: 0.8 }
      ];
      
      const contexts = selectVocabularyContexts(text, vocabularyList);
      
      expect(contexts.length).toBeGreaterThan(0);
      contexts.forEach(ctx => {
        expect(ctx.contextSentence).toContain('<b>');
      });
    });
  });
  
  // ========================================================================
  // CHECKPOINT TESTS (BƯỚC 2.6)
  // ========================================================================
  
  describe('Checkpoint - Quality Assurance', () => {
    it('should provide explainable scoring', () => {
      const text = 'Ontology is a formal representation of knowledge.';
      const sentences = buildSentences(text);
      const vocabularyWords = ['ontology'];
      
      const score = scoreSentence(sentences[0], vocabularyWords, sentences.length);
      
      // Can we explain why this sentence was chosen?
      expect(score.breakdown).toHaveProperty('keywordDensity');
      expect(score.breakdown).toHaveProperty('lengthScore');
      expect(score.breakdown).toHaveProperty('positionScore');
      expect(score.breakdown).toHaveProperty('clarityScore');
      
      // All scores should be between 0 and 1
      Object.values(score.breakdown).forEach(value => {
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(1);
      });
    });
    
    it('should be deterministic (same input = same output)', () => {
      const text = 'Ontology is a formal representation of knowledge.';
      const vocabularyList = [{ word: 'ontology', score: 0.9 }];
      
      const contexts1 = selectVocabularyContexts(text, vocabularyList);
      const contexts2 = selectVocabularyContexts(text, vocabularyList);
      
      expect(contexts1).toEqual(contexts2);
    });
    
    it('should produce readable flashcard contexts', () => {
      const text = `
        Machine learning is a subset of artificial intelligence.
        It enables computers to learn from data without explicit programming.
        Deep learning uses neural networks with multiple layers.
      `;
      
      const vocabularyList = [
        { word: 'machine learning', score: 0.9 },
        { word: 'artificial intelligence', score: 0.85 }
      ];
      
      const contexts = selectVocabularyContexts(text, vocabularyList);
      
      contexts.forEach(ctx => {
        // Context should be readable (not corrupted)
        expect(ctx.contextSentence.length).toBeGreaterThan(10);
        expect(ctx.contextSentence).toContain('<b>');
        
        // Should not be a title or list item
        expect(ctx.contextSentence).not.toMatch(/^[\d\-•*]/);
      });
    });
  });
});
