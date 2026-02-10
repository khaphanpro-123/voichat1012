"""
STAGE 5 – BM25 Lexical Filtering

Mục tiêu:
- Sử dụng BM25 để đánh giá lexical relevance
- Filter phrases dựa trên BM25 score
- Không hiểu nghĩa, chỉ đánh giá term matching

BM25 Formula:
score(D, Q) = Σ IDF(qi) * (f(qi, D) * (k1 + 1)) / (f(qi, D) + k1 * (1 - b + b * |D| / avgdl))

Where:
- f(qi, D): frequency of term qi in document D
- |D|: length of document D
- avgdl: average document length
- k1, b: tuning parameters (default: k1=1.5, b=0.75)
"""

import math
from typing import List, Dict, Tuple
from collections import Counter
import numpy as np


class BM25:
    """
    BM25 (Best Matching 25) - Probabilistic relevance framework
    
    Cải tiến của TF-IDF, tốt hơn cho information retrieval
    """
    
    def __init__(self, corpus: List[str], k1: float = 1.5, b: float = 0.75):
        """
        Initialize BM25
        
        Args:
            corpus: List of documents (sentences)
            k1: Term frequency saturation parameter (default: 1.5)
            b: Length normalization parameter (default: 0.75)
        """
        self.k1 = k1
        self.b = b
        self.corpus = corpus
        self.corpus_size = len(corpus)
        
        # Tokenize corpus
        self.tokenized_corpus = [doc.lower().split() for doc in corpus]
        
        # Calculate document lengths
        self.doc_lengths = [len(doc) for doc in self.tokenized_corpus]
        self.avgdl = sum(self.doc_lengths) / self.corpus_size if self.corpus_size > 0 else 0
        
        # Calculate IDF for each term
        self.idf = self._calculate_idf()
        
        print(f"[BM25] Initialized with {self.corpus_size} documents, avgdl={self.avgdl:.2f}")
    
    def _calculate_idf(self) -> Dict[str, float]:
        """
        Calculate IDF (Inverse Document Frequency) for all terms
        
        IDF(qi) = log((N - df(qi) + 0.5) / (df(qi) + 0.5) + 1)
        
        Where:
        - N: total number of documents
        - df(qi): number of documents containing term qi
        """
        # Count document frequency for each term
        df = Counter()
        
        for doc in self.tokenized_corpus:
            unique_terms = set(doc)
            for term in unique_terms:
                df[term] += 1
        
        # Calculate IDF
        idf = {}
        for term, doc_freq in df.items():
            idf[term] = math.log(
                (self.corpus_size - doc_freq + 0.5) / (doc_freq + 0.5) + 1
            )
        
        return idf
    
    def get_scores(self, query: str) -> np.ndarray:
        """
        Calculate BM25 scores for query against all documents
        
        Args:
            query: Query string
        
        Returns:
            Array of BM25 scores for each document
        """
        query_terms = query.lower().split()
        scores = np.zeros(self.corpus_size)
        
        for doc_idx, doc in enumerate(self.tokenized_corpus):
            doc_len = self.doc_lengths[doc_idx]
            doc_term_freq = Counter(doc)
            
            score = 0.0
            
            for term in query_terms:
                if term not in self.idf:
                    continue
                
                # Term frequency in document
                tf = doc_term_freq.get(term, 0)
                
                # BM25 formula
                numerator = tf * (self.k1 + 1)
                denominator = tf + self.k1 * (1 - self.b + self.b * doc_len / self.avgdl)
                
                score += self.idf[term] * (numerator / denominator)
            
            scores[doc_idx] = score
        
        return scores
    
    def get_top_n(self, query: str, n: int = 5) -> List[Tuple[int, float]]:
        """
        Get top N documents for query
        
        Returns:
            List of (doc_index, score) tuples
        """
        scores = self.get_scores(query)
        top_indices = scores.argsort()[-n:][::-1]
        
        return [(int(idx), float(scores[idx])) for idx in top_indices]


class BM25Filter:
    """
    Filter phrases using BM25 scoring
    
    Pipeline:
    1. BM25(phrase, sentence) - phrase relevance to its sentence
    2. BM25(phrase, heading) - phrase relevance to heading
    3. Threshold filtering
    """
    
    def __init__(
        self,
        sentences: List[str],
        headings: List[str] = None,
        k1: float = 1.5,
        b: float = 0.75
    ):
        """
        Initialize BM25 Filter
        
        Args:
            sentences: List of sentences from document
            headings: List of heading texts (optional)
            k1: BM25 parameter
            b: BM25 parameter
        """
        self.sentences = sentences
        self.headings = headings or []
        
        # Initialize BM25 for sentences
        self.bm25_sentences = BM25(sentences, k1, b)
        
        # Initialize BM25 for headings (if available)
        if self.headings:
            self.bm25_headings = BM25(headings, k1, b)
        else:
            self.bm25_headings = None
        
        print(f"[BM25Filter] Initialized with {len(sentences)} sentences, "
              f"{len(self.headings)} headings")
    
    def score_phrase_to_sentence(
        self,
        phrase: str,
        sentence_id: str,
        sentence_text: str
    ) -> float:
        """
        Score phrase relevance to its sentence using BM25
        
        Args:
            phrase: Phrase to score
            sentence_id: Sentence ID
            sentence_text: Sentence text
        
        Returns:
            BM25 score
        """
        # Find sentence index
        try:
            sent_idx = self.sentences.index(sentence_text)
        except ValueError:
            return 0.0
        
        # Calculate BM25 score
        scores = self.bm25_sentences.get_scores(phrase)
        
        return float(scores[sent_idx])
    
    def score_phrase_to_heading(
        self,
        phrase: str,
        heading_text: str
    ) -> float:
        """
        Score phrase relevance to heading using BM25
        
        Args:
            phrase: Phrase to score
            heading_text: Heading text
        
        Returns:
            BM25 score
        """
        if not self.bm25_headings:
            return 0.0
        
        # Find heading index
        try:
            heading_idx = self.headings.index(heading_text)
        except ValueError:
            return 0.0
        
        # Calculate BM25 score
        scores = self.bm25_headings.get_scores(phrase)
        
        return float(scores[heading_idx])
    
    def filter_phrases(
        self,
        phrases: List[Dict],
        sentence_threshold: float = 0.5,
        heading_threshold: float = 0.3,
        combine_scores: bool = True
    ) -> List[Dict]:
        """
        Filter phrases using BM25 thresholds
        
        Args:
            phrases: List of phrase dicts with 'word', 'sentence_id', 'sentence_text'
            sentence_threshold: Minimum BM25 score for sentence
            heading_threshold: Minimum BM25 score for heading
            combine_scores: Combine sentence + heading scores
        
        Returns:
            Filtered list of phrases with BM25 scores
        """
        filtered = []
        
        for phrase_dict in phrases:
            phrase = phrase_dict['word']
            sentence_text = phrase_dict.get('contextSentence', '').replace('<b>', '').replace('</b>', '')
            
            # Score phrase to sentence
            sent_score = self.score_phrase_to_sentence(
                phrase,
                phrase_dict.get('sentenceId', ''),
                sentence_text
            )
            
            # Score phrase to heading (if available)
            heading_score = 0.0
            if 'heading_text' in phrase_dict and self.bm25_headings:
                heading_score = self.score_phrase_to_heading(
                    phrase,
                    phrase_dict['heading_text']
                )
            
            # Combined score
            if combine_scores:
                combined_score = 0.7 * sent_score + 0.3 * heading_score
            else:
                combined_score = sent_score
            
            # Apply thresholds
            if sent_score >= sentence_threshold:
                if not self.bm25_headings or heading_score >= heading_threshold:
                    phrase_dict['bm25_sentence'] = sent_score
                    phrase_dict['bm25_heading'] = heading_score
                    phrase_dict['bm25_combined'] = combined_score
                    
                    filtered.append(phrase_dict)
        
        print(f"[BM25Filter] Filtered {len(phrases)} → {len(filtered)} phrases")
        
        return filtered
    
    def rerank_phrases(
        self,
        phrases: List[Dict],
        weight_bm25: float = 0.2,
        weight_original: float = 0.8
    ) -> List[Dict]:
        """
        Re-rank phrases combining original score + BM25 score
        
        ⚠️ IMPORTANT: BM25 is SECONDARY SIGNAL ONLY (weight ≤ 0.2)
        
        Role of BM25:
        - Sanity check for keyword presence
        - NOT for primary ranking
        - Helps retain numbers, definitions, technical terms
        - Penalizes semantic hallucination
        
        Args:
            phrases: List of phrase dicts with 'finalScore' and BM25 scores
            weight_bm25: Weight for BM25 score (DEFAULT: 0.2, MAX: 0.2)
            weight_original: Weight for original score (DEFAULT: 0.8, MIN: 0.8)
        
        Returns:
            Re-ranked list of phrases
        """
        # Enforce BM25 weight limit
        if weight_bm25 > 0.2:
            print(f"  ⚠️  BM25 weight {weight_bm25} exceeds limit 0.2, capping to 0.2")
            weight_bm25 = 0.2
            weight_original = 0.8
        for phrase_dict in phrases:
            original_score = phrase_dict.get('finalScore', 0.0)
            bm25_score = phrase_dict.get('bm25_combined', 0.0)
            
            # Normalize BM25 score to [0, 1]
            # Assuming BM25 scores typically range [0, 10]
            bm25_normalized = min(bm25_score / 10.0, 1.0)
            
            # Combined score
            combined = weight_original * original_score + weight_bm25 * bm25_normalized
            
            phrase_dict['finalScore'] = combined
            phrase_dict['originalScore'] = original_score
            phrase_dict['bm25Normalized'] = bm25_normalized
        
        # Sort by new score
        phrases.sort(key=lambda x: x['finalScore'], reverse=True)
        
        return phrases


# ============================================================================
# UTILITY FUNCTIONS
# ============================================================================

def calculate_bm25_statistics(
    phrases: List[Dict],
    bm25_filter: BM25Filter
) -> Dict:
    """Calculate BM25 statistics for phrases"""
    sent_scores = []
    heading_scores = []
    
    for phrase_dict in phrases:
        if 'bm25_sentence' in phrase_dict:
            sent_scores.append(phrase_dict['bm25_sentence'])
        if 'bm25_heading' in phrase_dict:
            heading_scores.append(phrase_dict['bm25_heading'])
    
    stats = {
        'sentence_scores': {
            'mean': np.mean(sent_scores) if sent_scores else 0.0,
            'std': np.std(sent_scores) if sent_scores else 0.0,
            'min': np.min(sent_scores) if sent_scores else 0.0,
            'max': np.max(sent_scores) if sent_scores else 0.0
        }
    }
    
    if heading_scores:
        stats['heading_scores'] = {
            'mean': np.mean(heading_scores),
            'std': np.std(heading_scores),
            'min': np.min(heading_scores),
            'max': np.max(heading_scores)
        }
    
    return stats


# ============================================================================
# TESTING
# ============================================================================

if __name__ == "__main__":
    print("=" * 80)
    print("TESTING BM25 FILTER")
    print("=" * 80)
    
    # Test corpus
    sentences = [
        "Machine learning is a subset of artificial intelligence.",
        "Deep learning uses neural networks with multiple layers.",
        "Natural language processing helps computers understand text.",
        "Contrastive learning improves representation quality.",
        "The model achieves 95% accuracy on the test set."
    ]
    
    headings = [
        "Introduction",
        "Background",
        "Methodology",
        "Results"
    ]
    
    # Initialize BM25 Filter
    bm25_filter = BM25Filter(sentences, headings)
    
    # Test phrases
    test_phrases = [
        {
            'word': 'machine learning',
            'sentenceId': 's1',
            'contextSentence': sentences[0],
            'finalScore': 0.85,
            'heading_text': 'Introduction'
        },
        {
            'word': 'deep learning',
            'sentenceId': 's2',
            'contextSentence': sentences[1],
            'finalScore': 0.80,
            'heading_text': 'Background'
        },
        {
            'word': 'contrastive learning',
            'sentenceId': 's4',
            'contextSentence': sentences[3],
            'finalScore': 0.90,
            'heading_text': 'Methodology'
        }
    ]
    
    print("\n📊 BM25 SCORES:")
    print("-" * 80)
    
    for phrase in test_phrases:
        sent_score = bm25_filter.score_phrase_to_sentence(
            phrase['word'],
            phrase['sentenceId'],
            phrase['contextSentence']
        )
        
        heading_score = bm25_filter.score_phrase_to_heading(
            phrase['word'],
            phrase['heading_text']
        )
        
        print(f"\nPhrase: '{phrase['word']}'")
        print(f"  BM25 (sentence): {sent_score:.4f}")
        print(f"  BM25 (heading): {heading_score:.4f}")
        print(f"  Original score: {phrase['finalScore']:.4f}")
    
    # Test filtering
    print("\n📊 FILTERING:")
    print("-" * 80)
    
    filtered = bm25_filter.filter_phrases(test_phrases, sentence_threshold=0.5)
    print(f"Filtered: {len(test_phrases)} → {len(filtered)} phrases")
    
    # Test re-ranking
    print("\n📊 RE-RANKING:")
    print("-" * 80)
    
    reranked = bm25_filter.rerank_phrases(filtered)
    for phrase in reranked:
        print(f"\n'{phrase['word']}':")
        print(f"  Original: {phrase['originalScore']:.4f}")
        print(f"  BM25: {phrase['bm25Normalized']:.4f}")
        print(f"  Final: {phrase['finalScore']:.4f}")
    
    print("\n✅ Test completed!")
