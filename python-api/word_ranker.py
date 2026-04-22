import re
import math
from typing import List, Dict, Optional
from collections import Counter
import numpy as np
class WordRanker:
    
    def __init__(self):
        """Initialize simplified word ranker"""
        # Stopwords (comprehensive list)
        self.stopwords = self._build_stopwords()
        
        # Weights (scientifically justified)
        self.w1 = 0.6   # TF-IDF (highest)
        self.w2 = 0.1   # Word Length (lowest)
        self.w3 = 0.3   # Morphological (medium)
        self.w4 = -0.5  # Coverage Penalty (negative)
        
        print(" WordRanker initialized (4 features - Simplified)")
        print(f"Weights: TF-IDF={self.w1}, Length={self.w2}, Morph={self.w3}, Coverage={self.w4}")

    def preprocess_text(self, text: str) -> List[Dict]:
        from nltk import word_tokenize, pos_tag, sent_tokenize
        from nltk.stem import WordNetLemmatizer
        
        lemmatizer = WordNetLemmatizer()
        
        tokens = []
        word_freq = Counter()
        word_sentences = {}
        
        # Split into sentences
        sentences = sent_tokenize(text)
        
        for sent_text in sentences:
            # Tokenize and POS tag
            sent_tokens = word_tokenize(sent_text)
            pos_tags = pos_tag(sent_tokens)
            
            for word, pos in pos_tags:
                word_lower = word.lower()
                
                # Skip short words
                if len(word_lower) < 3:
                    continue
                
                # Skip numbers
                if any(c.isdigit() for c in word_lower):
                    continue
                
                # Lemmatize (simplified)
                lemma = lemmatizer.lemmatize(word_lower)
                
                # Store
                tokens.append({
                    'word': lemma,
                    'original': word,
                    'pos': pos,
                    'sentence': sent_text
                })
                
                # Count frequency
                word_freq[lemma] += 1
                
                # Store sentences
                if lemma not in word_sentences:
                    word_sentences[lemma] = []
                word_sentences[lemma].append(sent_text)
        
        # Add frequency and sentences to tokens
        for token in tokens:
            word = token['word']
            token['frequency'] = word_freq[word]
            token['sentences'] = word_sentences[word][:3]  # Top 3
        
        return tokens
    def filter_candidates(self, tokens: List[Dict]) -> List[Dict]:
        candidates = []
        seen = set()
        
        for token in tokens:
            word = token['word']
            pos = token['pos']
            
            # Skip duplicates
            if word in seen:
                continue
            
            # POS filter
            if not (pos.startswith('NN') or pos.startswith('VB') or pos.startswith('JJ')):
                continue
            
            # Stopword filter
            if word in self.stopwords:
                continue
            
            # Add to candidates
            candidates.append(token)
            seen.add(word)
        
        return candidates
    def extract_features(
        self,
        candidates: List[Dict],
        text: str,
        phrases: List[Dict] = None
    ) -> List[Dict]:
        print(f"[FEATURE] Extracting 4 features for {len(candidates)} candidates...")
        # Extract features
        for candidate in candidates:
            word = candidate['word']
            
            # Feature 1: TF-IDF
            candidate['tfidf_score'] = self._compute_tfidf(
                word, text, candidates
            )
            
            # Feature 2: Word length
            candidate['word_length'] = self._compute_word_length(word)
            
            # Feature 3: Morphological score
            candidate['morphological_score'] = self._compute_morphological_score(word)
            
            # Feature 4: Coverage penalty
            candidate['coverage_penalty'] = self._compute_coverage_penalty(
                word, phrases
            )
        
        print(f"   Extracted 4 features per candidate")
        
        return candidates
    
    def _compute_tfidf(
        self,
        word: str,
        text: str,
        candidates: List[Dict]
    ) -> float:
        from nltk import sent_tokenize, word_tokenize
        # Compute TF
        all_words = word_tokenize(text.lower())
        word_count = all_words.count(word)
        total_words = len(all_words)
        tf = word_count / total_words if total_words > 0 else 0.0
        
        # Compute IDF
        sentences = [sent.lower() for sent in sent_tokenize(text)]
        N = len(sentences)
        df = sum(1 for sent in sentences if word in sent)
        
        if df > 0:
            idf = math.log(N / df)
        else:
            idf = 0.0
        
        # TF-IDF
        tfidf = tf * idf
        
        return tfidf
    
    def _compute_word_length(self, word: str) -> float:
        return min(len(word) / 15.0, 1.0)
    
    def _compute_morphological_score(self, word: str) -> float:
        syllables = len(re.findall(r'[aeiou]+', word.lower()))
        
        valuable_suffixes = [
            'tion', 'sion', 'ment', 'ness', 'ity',
            'ance', 'ence', 'ism', 'ology', 'graphy',
            'able', 'ible', 'ful', 'less', 'ous'
        ]
        
        has_suffix = any(word.endswith(suffix) for suffix in valuable_suffixes)
        
        if has_suffix:
            return 0.9
        elif syllables >= 3:
            return 0.7
        elif syllables == 2:
            return 0.5
        else:
            return 0.3
    
    def _compute_coverage_penalty(
        self,
        word: str,
        phrases: List[Dict] = None
    ) -> float:
        if not phrases:
            return 0.0
        
        # Check token overlap
        for phrase_dict in phrases:
            phrase = phrase_dict.get('phrase', phrase_dict.get('word', ''))
            score = phrase_dict.get('importance_score', phrase_dict.get('final_score', 0))
            
            if score >= 0.5 and word in phrase.lower().split():
                return 0.5  # Moderate penalty
        
        return 0.0
    def rank(
        self,
        candidates: List[Dict],
        top_k: Optional[int] = None
    ) -> List[Dict]:
        print(f"[RANK] Ranking {len(candidates)} candidates...")
        
        # Compute final scores
        for candidate in candidates:
            final_score = (
                self.w1 * candidate.get('tfidf_score', 0.0) +
                self.w2 * candidate.get('word_length', 0.0) +
                self.w3 * candidate.get('morphological_score', 0.0) +
                self.w4 * candidate.get('coverage_penalty', 0.0)
            )
            
            # Clamp to [0, 1]
            candidate['final_score'] = max(0.0, min(1.0, final_score))
            candidate['importance_score'] = candidate['final_score']  # Compatibility
        
        # Sort by score
        candidates.sort(key=lambda x: x['final_score'], reverse=True)
        
        # Keep top_k
        if top_k is not None:
            candidates = candidates[:top_k]
        
        print(f"   Ranked {len(candidates)} words")
        
        return candidates
    def _build_stopwords(self) -> set:
        """Build comprehensive stopword list"""
        return {
            # Articles
            'the', 'a', 'an',
            # Prepositions
            'of', 'in', 'for', 'with', 'on', 'at', 'to', 'from', 'by', 'about',
            'as', 'into', 'through', 'during', 'before', 'after', 'above', 'below',
            'between', 'under', 'over', 'among', 'against', 'within', 'without',
            # Conjunctions
            'and', 'or', 'but', 'nor', 'so', 'yet', 'for',
            # Auxiliary verbs
            'be', 'am', 'is', 'are', 'was', 'were', 'been', 'being',
            'have', 'has', 'had', 'having',
            'do', 'does', 'did', 'doing',
            # Modal verbs
            'can', 'could', 'may', 'might', 'must', 'shall', 'should',
            'will', 'would', 'ought',
            # Pronouns
            'i', 'you', 'he', 'she', 'it', 'we', 'they',
            'me', 'him', 'her', 'us', 'them',
            'my', 'your', 'his', 'her', 'its', 'our', 'their',
            'mine', 'yours', 'hers', 'ours', 'theirs',
            'this', 'that', 'these', 'those',
            'who', 'whom', 'whose', 'which', 'what',
            # Discourse markers
            'well', 'may', 'even', 'another', 'lot', 'instead', 'spending',
            'prefer', 'many', 'much', 'very', 'really', 'quite', 'rather',
            'however', 'moreover', 'furthermore', 'therefore', 'thus',
            'hence', 'consequently', 'accordingly', 'besides', 'meanwhile',
            # Generic words
            'make', 'take', 'give', 'get', 'put', 'set', 'go', 'come',
            'provide', 'offer', 'present', 'show', 'indicate', 'suggest',
            'thing', 'stuff', 'way', 'manner', 'method', 'approach',
            'issue', 'problem', 'matter', 'aspect', 'factor', 'element'
        }
def example_usage():
    # Sample text
    text = """
    Climate change mitigation requires urgent action. Renewable energy sources
    like solar and wind power are essential. Deforestation contributes to
    carbon emissions. Biodiversity loss threatens ecosystems. Sustainable
    development is crucial for future generations.
    """
    # Sample phrases (from phrase extraction)
    phrases = [
        {'phrase': 'climate change', 'importance_score': 0.9},
        {'phrase': 'renewable energy', 'importance_score': 0.85},
        {'phrase': 'solar power', 'importance_score': 0.8}
    ]

    # Initialize ranker
    ranker = WordRanker()

    # Step 1: Preprocess
    print("\n[STEP 1] Preprocessing...")
    tokens = ranker.preprocess_text(text)
    print(f"  ✓ Extracted {len(tokens)} tokens")

    # Step 2: Filter candidates
    print("\n[STEP 2] Filtering candidates...")
    candidates = ranker.filter_candidates(tokens)
    print(f"  ✓ Filtered to {len(candidates)} candidates")

    # Step 3: Extract features (4 features)
    print("\n[STEP 3] Extracting 4 features...")
    candidates = ranker.extract_features(candidates, text, phrases)
    print(f"  ✓ Extracted features for {len(candidates)} candidates")

    # Step 4: Rank
    print("\n[STEP 4] Ranking...")
    ranked = ranker.rank(candidates, top_k=10)

    # Output
    print("\n=== TOP 10 WORDS ===")
    for i, word in enumerate(ranked[:10], 1):
        print(f"{i:2d}. {word['word']:20s} | Score: {word['final_score']:.3f}")
        print(f"    TF-IDF: {word['tfidf_score']:.4f} | "
              f"Length: {word['word_length']:.2f} | "
              f"Morph: {word['morphological_score']:.2f} | "
              f"Coverage: {word['coverage_penalty']:.2f}")




if __name__ == "__main__":
    example_usage()
