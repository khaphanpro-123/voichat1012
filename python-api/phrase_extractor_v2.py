"""
Phrase Extractor V2 - ĐÚNG CHUẨN HỌC THUẬT
Trích xuất PHRASES (không phải words) từ sentences bằng TF-IDF n-gram
"""

import re
from typing import List, Dict, Tuple
from collections import Counter
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from nltk.tokenize import sent_tokenize, word_tokenize
from nltk.corpus import stopwords
import nltk

# Download NLTK data
try:
    nltk.data.find('tokenizers/punkt')
except LookupError:
    nltk.download('punkt')

try:
    nltk.data.find('corpora/stopwords')
except LookupError:
    nltk.download('stopwords')

ENGLISH_STOPWORDS = set(stopwords.words('english'))

# Vietnamese words to filter
VIETNAMESE_WORDS = {
    'yeu', 'nhan', 'lof', 'thcih', 'toi', 'ban', 'cho', 'cua', 'voi',
    'trong', 'ngoai', 'tren', 'duoi', 'giua', 'sau', 'truoc'
}


class PhraseExtractorV2:
    """
    Phrase Extractor V2 - Trích xuất phrases từ sentences
    
    Pipeline:
    1. Split text → sentences
    2. TF-IDF n-gram (2-3) trên sentences
    3. Filter phrases (loại stopwords, Vietnamese, errors)
    4. Return top phrases với scores
    """
    
    def __init__(self):
        self.vectorizer = None
        self.sentences = []
        self.tfidf_matrix = None
    
    def extract_phrases(
        self,
        text: str,
        max_phrases: int = 50,
        min_phrase_length: int = 2,
        ngram_range: Tuple[int, int] = (2, 3)
    ) -> List[Dict]:
        """
        Extract phrases từ text
        
        Args:
            text: Input text
            max_phrases: Số phrases tối đa
            min_phrase_length: Độ dài tối thiểu (số từ)
            ngram_range: N-gram range (default: bigram + trigram)
        
        Returns:
            List of phrase dicts:
            [
                {
                    'phrase': 'soft skills',
                    'tfidf_score': 0.42,
                    'frequency': 3,
                    'sentences': [12, 15, 23]
                }
            ]
        """
        print(f"[PhraseExtractorV2] Starting extraction...")
        
        # BƯỚC 1: Split thành sentences
        self.sentences = self._split_sentences(text)
        
        if len(self.sentences) < 3:
            print(f"[PhraseExtractorV2] Not enough sentences ({len(self.sentences)})")
            return []
        
        print(f"[PhraseExtractorV2] Split into {len(self.sentences)} sentences")
        
        # BƯỚC 2: TF-IDF n-gram trên sentences
        phrases_with_scores = self._extract_tfidf_phrases(
            ngram_range=ngram_range,
            max_features=max_phrases * 3  # Extract more for filtering
        )
        
        print(f"[PhraseExtractorV2] Extracted {len(phrases_with_scores)} raw phrases")
        
        # BƯỚC 3: Filter phrases
        filtered_phrases = self._filter_phrases(
            phrases_with_scores,
            min_phrase_length=min_phrase_length
        )
        
        print(f"[PhraseExtractorV2] After filtering: {len(filtered_phrases)} phrases")
        
        # BƯỚC 4: Add metadata (frequency, sentence IDs)
        enriched_phrases = self._enrich_phrases(filtered_phrases, text)
        
        # BƯỚC 5: Sort và return top phrases
        sorted_phrases = sorted(
            enriched_phrases,
            key=lambda x: x['tfidf_score'],
            reverse=True
        )[:max_phrases]
        
        print(f"[PhraseExtractorV2] Returning top {len(sorted_phrases)} phrases")
        
        return sorted_phrases
    
    def _split_sentences(self, text: str) -> List[str]:
        """
        Split text thành sentences
        """
        # Clean text trước
        text = self._clean_text(text)
        
        # Tokenize sentences
        sentences = sent_tokenize(text)
        
        # Filter sentences quá ngắn
        valid_sentences = []
        for sent in sentences:
            words = word_tokenize(sent)
            if len(words) >= 5:  # Ít nhất 5 từ
                valid_sentences.append(sent)
        
        return valid_sentences
    
    def _clean_text(self, text: str) -> str:
        """
        Clean text: loại metadata, ký tự đặc biệt
        """
        # Remove URLs
        text = re.sub(r'http\S+|www\S+', '', text)
        
        # Remove email
        text = re.sub(r'\S+@\S+', '', text)
        
        # Remove multiple spaces
        text = re.sub(r'\s+', ' ', text)
        
        return text.strip()
    
    def _extract_tfidf_phrases(
        self,
        ngram_range: Tuple[int, int],
        max_features: int
    ) -> List[Dict]:
        """
        Extract phrases bằng TF-IDF n-gram
        
        Returns:
            [{'phrase': 'soft skills', 'tfidf_score': 0.42}]
        """
        # TF-IDF vectorizer với n-gram
        self.vectorizer = TfidfVectorizer(
            max_features=max_features,
            ngram_range=ngram_range,
            min_df=2,                # Xuất hiện ít nhất 2 sentences
            max_df=0.8,              # Không quá phổ biến
            stop_words='english',
            norm='l2',
            lowercase=True
        )
        
        try:
            # Fit trên NHIỀU sentences (không phải 1 document!)
            self.tfidf_matrix = self.vectorizer.fit_transform(self.sentences)
            feature_names = self.vectorizer.get_feature_names_out()
            
            # Aggregate scores across all sentences
            mean_scores = self.tfidf_matrix.mean(axis=0).A1
            
            # Build phrase list
            phrases = []
            for idx, score in enumerate(mean_scores):
                if score > 0:
                    phrase = feature_names[idx]
                    phrases.append({
                        'phrase': phrase,
                        'tfidf_score': float(score)
                    })
            
            return phrases
            
        except Exception as e:
            print(f"[PhraseExtractorV2] TF-IDF error: {e}")
            return []
    
    def _filter_phrases(
        self,
        phrases: List[Dict],
        min_phrase_length: int
    ) -> List[Dict]:
        """
        Filter phrases:
        - Loại stopwords đơn
        - Loại Vietnamese words
        - Loại lỗi chính tả
        - Loại phrases quá ngắn
        """
        filtered = []
        
        for phrase_dict in phrases:
            phrase = phrase_dict['phrase']
            
            # Check 1: Độ dài
            words = phrase.split()
            if len(words) < min_phrase_length:
                continue
            
            # Check 2: Không phải toàn stopwords
            if all(w in ENGLISH_STOPWORDS for w in words):
                continue
            
            # Check 3: Không chứa Vietnamese words
            if any(w in VIETNAMESE_WORDS for w in words):
                continue
            
            # Check 4: Chỉ chứa ký tự ASCII
            if not all(ord(c) < 128 or c.isspace() for c in phrase):
                continue
            
            # Check 5: Không phải toàn số
            if phrase.replace(' ', '').replace('.', '').isdigit():
                continue
            
            # Check 6: Ít nhất 1 từ có nghĩa (không phải stopword)
            meaningful_words = [w for w in words if w not in ENGLISH_STOPWORDS and len(w) >= 3]
            if len(meaningful_words) < 1:
                continue
            
            filtered.append(phrase_dict)
        
        return filtered
    
    def _enrich_phrases(self, phrases: List[Dict], text: str) -> List[Dict]:
        """
        Enrich phrases với metadata:
        - Frequency (số lần xuất hiện)
        - Sentence IDs (xuất hiện ở sentences nào)
        """
        text_lower = text.lower()
        
        for phrase_dict in phrases:
            phrase = phrase_dict['phrase']
            
            # Count frequency
            frequency = text_lower.count(phrase)
            phrase_dict['frequency'] = frequency
            
            # Find sentence IDs
            sentence_ids = []
            for idx, sent in enumerate(self.sentences):
                if phrase in sent.lower():
                    sentence_ids.append(idx)
            
            phrase_dict['sentences'] = sentence_ids
            phrase_dict['n_sentences'] = len(sentence_ids)
        
        return phrases
    
    def get_phrase_context(self, phrase: str, max_contexts: int = 3) -> List[str]:
        """
        Lấy context sentences cho phrase
        
        Args:
            phrase: Phrase cần tìm context
            max_contexts: Số contexts tối đa
        
        Returns:
            List of sentences chứa phrase
        """
        contexts = []
        
        for sent in self.sentences:
            if phrase in sent.lower():
                contexts.append(sent)
                if len(contexts) >= max_contexts:
                    break
        
        return contexts


# ============================================================================
# TESTING
# ============================================================================

if __name__ == "__main__":
    test_text = """
    Machine learning is a subset of artificial intelligence that enables computers 
    to learn from data. Deep learning uses neural networks with multiple layers.
    
    Natural language processing helps computers understand human language. 
    Computer vision allows machines to interpret visual information.
    
    Studying abroad helps students improve soft skills like teamwork and communication.
    Job opportunities in big companies require strong technical skills.
    
    Volunteer work provides valuable experience and helps develop leadership skills.
    Healthy lifestyle choices contribute to better mental and physical health.
    """
    
    print("=" * 80)
    print("TESTING PHRASE EXTRACTOR V2")
    print("=" * 80)
    
    extractor = PhraseExtractorV2()
    phrases = extractor.extract_phrases(
        text=test_text,
        max_phrases=10,
        ngram_range=(2, 3)
    )
    
    print("\n📊 RESULTS:")
    print("-" * 80)
    print(f"Total phrases extracted: {len(phrases)}\n")
    
    for i, phrase_dict in enumerate(phrases, 1):
        print(f"{i}. '{phrase_dict['phrase']}'")
        print(f"   TF-IDF: {phrase_dict['tfidf_score']:.4f}")
        print(f"   Frequency: {phrase_dict['frequency']}")
        print(f"   Appears in {phrase_dict['n_sentences']} sentences")
        
        # Show context
        contexts = extractor.get_phrase_context(phrase_dict['phrase'], max_contexts=1)
        if contexts:
            print(f"   Context: {contexts[0][:80]}...")
        print()
    
    print("✅ Test completed!")
