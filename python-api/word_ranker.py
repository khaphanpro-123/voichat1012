"""
Single Word Extraction - Learning-to-Rank Version
Replaces rule-based scoring with supervised learning

Author: Kiro AI
Date: 2026-02-27
Version: 2.0.0
"""

import re
import math
import pickle
import os
from typing import List, Dict, Tuple, Optional
from collections import Counter
import numpy as np
from sklearn.linear_model import LinearRegression
from sklearn.preprocessing import MinMaxScaler

try:
    from embedding_utils import SentenceTransformer
    HAS_EMBEDDINGS = True
except:
    HAS_EMBEDDINGS = False
    print("⚠️  sentence-transformers not available. Semantic features disabled.")


class WordRanker:
    """
    Learning-to-Rank system for single word extraction
    
    Pipeline:
    1. Text preprocessing (tokenization, POS tagging, lemmatization)
    2. Candidate filtering (POS + stopwords)
    3. Feature engineering (7 features)
    4. Training model (LinearRegression)
    5. Ranking & output
    """
    
    def __init__(
        self,
        model_path: str = "word_ranker_model.pkl",
        embedding_model=None
    ):
        """
        Initialize word ranker
        
        Args:
            model_path: Path to save/load trained model
            embedding_model: Pre-loaded embedding model (optional)
        """
        self.model_path = model_path
        self.embedding_model = embedding_model
        self.regression_model = None
        self.scaler = MinMaxScaler()
        
        # Stopwords (comprehensive list)
        self.stopwords = self._build_stopwords()
        
        # Technical whitelist
        self.technical_whitelist = {
            'co2', 'gdp', 'dna', 'rna', 'api', 'cpu', 'gpu', 'sql', 'html',
            'deforestation', 'biodiversity', 'sustainability', 'photosynthesis',
            'globalization', 'urbanization', 'industrialization', 'democratization',
            'algorithm', 'database', 'network', 'protocol', 'encryption',
            'metabolism', 'ecosystem', 'chromosome', 'neuron', 'antibody'
        }
        
        # Try to load pre-trained model
        self._load_model()
    
    # ========================================================================
    # STEP 1: TEXT PREPROCESSING
    # ========================================================================
    
    def preprocess_text(self, text: str) -> List[Dict]:
        """
        STEP 1: Text preprocessing
        
        - Tokenization
        - POS tagging
        - Lemmatization
        
        Returns:
            List of tokens with POS tags
        """
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
    
    # ========================================================================
    # STEP 2: CANDIDATE FILTERING
    # ========================================================================
    
    def filter_candidates(self, tokens: List[Dict]) -> List[Dict]:
        """
        STEP 2: Candidate filtering (HARD FILTER)
        
        Keep only:
        - NOUN (NN*)
        - VERB (VB*)
        - ADJ (JJ*)
        - PROPN (NNP*)
        
        Remove:
        - Stopwords
        - Punctuation
        - Numbers
        - Length < 3
        
        Returns:
            Filtered candidates
        """
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
    
    # ========================================================================
    # STEP 3: FEATURE ENGINEERING
    # ========================================================================
    
    def extract_features(
        self,
        candidates: List[Dict],
        text: str,
        phrases: List[Dict] = None,
        headings: List[Dict] = None,
        document_embedding: Optional[np.ndarray] = None
    ) -> List[Dict]:
        """
        STEP 3: Feature engineering
        
        Extract 7 features for each candidate:
        1. semantic_score: Cosine similarity with document (SBERT)
        2. frequency_score: Normalized frequency
        3. learning_value: Concreteness + domain specificity + morphology
        4. rarity_penalty: IDF-based rarity
        5. coverage_penalty: Overlap with phrases
        6. word_length: Normalized word length
        7. morphological_score: Suffix patterns + syllables
        
        Returns:
            Candidates with features
        """
        print(f"[FEATURE] Extracting features for {len(candidates)} candidates...")
        
        # Load embedding model if needed
        if self.embedding_model is None and HAS_EMBEDDINGS:
            try:
                self.embedding_model = SentenceTransformer('all-MiniLM-L6-v2')
            except:
                print("  ⚠️  Embedding model not available")
        
        # Encode document
        if document_embedding is None and self.embedding_model:
            document_embedding = self.embedding_model.encode([text])[0]
        
        # Extract features
        for candidate in candidates:
            word = candidate['word']
            
            # Feature 1: Semantic score
            candidate['semantic_score'] = self._compute_semantic_score(
                word, document_embedding
            )
            
            # Feature 2: Frequency score
            candidate['frequency_score'] = self._compute_frequency_score(
                candidate, candidates
            )
            
            # Feature 3: Learning value
            candidate['learning_value'] = self._compute_learning_value(
                word, headings
            )
            
            # Feature 4: Rarity penalty
            candidate['rarity_penalty'] = self._compute_rarity_penalty(
                word, text
            )
            
            # Feature 5: Coverage penalty
            candidate['coverage_penalty'] = self._compute_coverage_penalty(
                word, phrases
            )
            
            # Feature 6: Word length
            candidate['word_length'] = self._compute_word_length(word)
            
            # Feature 7: Morphological score
            candidate['morphological_score'] = self._compute_morphological_score(word)
        
        print(f"  ✓ Extracted 7 features per candidate")
        
        return candidates
    
    def _compute_semantic_score(
        self,
        word: str,
        document_embedding: Optional[np.ndarray]
    ) -> float:
        """
        Feature 1: Semantic score
        
        Cosine similarity between word and document
        """
        if not self.embedding_model or document_embedding is None:
            return 0.5  # Default
        
        try:
            word_emb = self.embedding_model.encode([word])[0]
            doc_emb = document_embedding
            
            similarity = np.dot(word_emb, doc_emb) / (
                np.linalg.norm(word_emb) * np.linalg.norm(doc_emb)
            )
            
            return float(similarity)
        except:
            return 0.5
    
    def _compute_frequency_score(
        self,
        candidate: Dict,
        all_candidates: List[Dict]
    ) -> float:
        """
        Feature 2: Frequency score
        
        Normalized frequency: word_count / max_count
        """
        freq = candidate.get('frequency', 1)
        max_freq = max(c.get('frequency', 1) for c in all_candidates)
        
        return freq / max_freq if max_freq > 0 else 0.0
    
    def _compute_learning_value(
        self,
        word: str,
        headings: List[Dict] = None
    ) -> float:
        """
        Feature 3: Learning value
        
        Combines:
        - Concreteness (0-1)
        - Domain specificity (0-1)
        - Morphological richness (0-1)
        - Generality penalty (0-1)
        
        Formula: (concreteness + domain + morph) / 3 - generality
        """
        # Concreteness
        if word in self.technical_whitelist:
            concreteness = 1.0
        elif len(word) > 8:
            concreteness = 0.8
        elif len(word) > 5:
            concreteness = 0.6
        else:
            concreteness = 0.4
        
        # Domain specificity
        domain_spec = 0.5
        if headings:
            heading_texts = ' '.join([h.get('text', '') for h in headings]).lower()
            if word in heading_texts:
                domain_spec = 1.0
        
        # Morphological richness
        syllables = len(re.findall(r'[aeiou]+', word.lower()))
        morph_rich = min(syllables / 4.0, 1.0)
        
        # Generality penalty
        generic_words = {
            'important', 'significant', 'major', 'good', 'bad',
            'impact', 'effect', 'result', 'cause', 'factor'
        }
        generality = 0.8 if word in generic_words else 0.0
        
        # Combined
        learning_value = (concreteness + domain_spec + morph_rich) / 3.0 - generality
        
        return max(0.0, min(1.0, learning_value))
    
    def _compute_rarity_penalty(self, word: str, text: str) -> float:
        """
        Feature 4: Rarity penalty
        
        IDF-based: 1 - normalized_idf
        Rare words (high IDF) → low penalty
        Common words (low IDF) → high penalty
        """
        from nltk import sent_tokenize
        
        sentences = [sent.lower() for sent in sent_tokenize(text)]
        N = len(sentences)
        
        # Technical whitelist → no penalty
        if word in self.technical_whitelist:
            return 0.0
        
        # Calculate IDF
        df = sum(1 for sent in sentences if word in sent)
        
        if df > 0:
            idf = math.log(N / df)
        else:
            idf = 0.0
        
        # Normalize to [0, 1]
        max_idf = math.log(N) if N > 0 else 1.0
        normalized_idf = idf / max_idf if max_idf > 0 else 0.0
        
        # Penalty: 1 - normalized_idf
        return 1.0 - normalized_idf
    
    def _compute_coverage_penalty(
        self,
        word: str,
        phrases: List[Dict] = None
    ) -> float:
        """
        Feature 5: Coverage penalty
        
        If word appears in high-scoring phrases → penalty
        """
        if not phrases:
            return 0.0
        
        # Check token overlap
        for phrase_dict in phrases:
            phrase = phrase_dict.get('phrase', phrase_dict.get('word', ''))
            score = phrase_dict.get('importance_score', phrase_dict.get('final_score', 0))
            
            if score >= 0.5 and word in phrase.lower().split():
                return 0.5  # Moderate penalty
        
        return 0.0
    
    def _compute_word_length(self, word: str) -> float:
        """
        Feature 6: Word length
        
        Normalized to [0, 1]
        """
        return min(len(word) / 15.0, 1.0)
    
    def _compute_morphological_score(self, word: str) -> float:
        """
        Feature 7: Morphological score
        
        Based on:
        - Syllable count
        - Valuable suffixes
        """
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
    
    # ========================================================================
    # STEP 4: TRAIN MODEL
    # ========================================================================
    
    def train(
        self,
        candidates: List[Dict],
        labels: List[float]
    ) -> Dict[str, float]:
        """
        STEP 4: Train Learning-to-Rank model
        
        Args:
            candidates: Candidates with features
            labels: Human-labeled importance scores (0-1)
        
        Returns:
            Model coefficients (weights)
        """
        print(f"[TRAIN] Training model with {len(candidates)} labeled examples...")
        
        # Prepare features
        X = self._prepare_feature_matrix(candidates)
        y = np.array(labels)
        
        # Normalize features
        X_normalized = self.scaler.fit_transform(X)
        
        # Train linear regression
        self.regression_model = LinearRegression()
        self.regression_model.fit(X_normalized, y)
        
        # Extract coefficients
        coefficients = {
            'semantic_score': float(self.regression_model.coef_[0]),
            'frequency_score': float(self.regression_model.coef_[1]),
            'learning_value': float(self.regression_model.coef_[2]),
            'rarity_penalty': float(self.regression_model.coef_[3]),
            'coverage_penalty': float(self.regression_model.coef_[4]),
            'word_length': float(self.regression_model.coef_[5]),
            'morphological_score': float(self.regression_model.coef_[6]),
            'intercept': float(self.regression_model.intercept_)
        }
        
        print(f"  ✓ Model trained")
        print(f"  ✓ Coefficients: {coefficients}")
        
        # Save model
        self._save_model()
        
        return coefficients
    
    def _prepare_feature_matrix(self, candidates: List[Dict]) -> np.ndarray:
        """
        Prepare feature matrix for training/prediction
        
        Returns:
            X: (n_samples, 7) feature matrix
        """
        X = []
        
        for candidate in candidates:
            features = [
                candidate.get('semantic_score', 0.5),
                candidate.get('frequency_score', 0.5),
                candidate.get('learning_value', 0.5),
                candidate.get('rarity_penalty', 0.5),
                candidate.get('coverage_penalty', 0.0),
                candidate.get('word_length', 0.5),
                candidate.get('morphological_score', 0.5)
            ]
            X.append(features)
        
        return np.array(X)
    
    # ========================================================================
    # STEP 5: INFERENCE & RANKING
    # ========================================================================
    
    def rank(
        self,
        candidates: List[Dict],
        top_k: Optional[int] = None
    ) -> List[Dict]:
        """
        STEP 5: Rank candidates by predicted score
        
        Args:
            candidates: Candidates with features
            top_k: Number of top words to return (optional)
        
        Returns:
            Ranked candidates
        """
        print(f"[RANK] Ranking {len(candidates)} candidates...")
        
        # Prepare features
        X = self._prepare_feature_matrix(candidates)
        
        # Check if scaler is fitted
        from sklearn.exceptions import NotFittedError
        try:
            # Try to transform (will fail if not fitted)
            X_normalized = self.scaler.transform(X)
        except NotFittedError:
            # Scaler not fitted yet, fit it now
            print("  ⚠️  Scaler not fitted, fitting now...")
            X_normalized = self.scaler.fit_transform(X)
        
        # Predict scores
        if self.regression_model is not None:
            scores = self.regression_model.predict(X_normalized)
        else:
            # Fallback: use default weights
            print("  ⚠️  No trained model, using default weights")
            scores = self._predict_with_default_weights(X_normalized)
        
        # Add scores to candidates
        for i, candidate in enumerate(candidates):
            candidate['final_score'] = float(scores[i])
            candidate['importance_score'] = float(scores[i])  # Compatibility
        
        # Sort by score
        candidates.sort(key=lambda x: x['final_score'], reverse=True)
        
        # Keep top_k
        if top_k is not None:
            candidates = candidates[:top_k]
        
        print(f"  ✓ Ranked {len(candidates)} words")
        
        return candidates
    
    def _predict_with_default_weights(self, X_normalized: np.ndarray) -> np.ndarray:
        """
        Fallback prediction with default weights
        
        Default weights (heuristic):
        - semantic_score: 0.3
        - frequency_score: 0.1
        - learning_value: 0.4
        - rarity_penalty: -0.1
        - coverage_penalty: -0.2
        - word_length: 0.1
        - morphological_score: 0.2
        
        Note: X_normalized is already normalized by scaler
        """
        weights = np.array([0.3, 0.1, 0.4, -0.1, -0.2, 0.1, 0.2])
        intercept = 0.0
        
        return X_normalized @ weights + intercept
    
    # ========================================================================
    # MODEL PERSISTENCE
    # ========================================================================
    
    def _save_model(self):
        """Save trained model to disk"""
        if self.regression_model is not None:
            try:
                with open(self.model_path, 'wb') as f:
                    pickle.dump({
                        'model': self.regression_model,
                        'scaler': self.scaler
                    }, f)
                print(f"  ✓ Model saved to {self.model_path}")
            except Exception as e:
                print(f"  ⚠️  Failed to save model: {e}")
    
    def _load_model(self):
        """Load pre-trained model from disk"""
        if os.path.exists(self.model_path):
            try:
                with open(self.model_path, 'rb') as f:
                    data = pickle.load(f)
                    self.regression_model = data['model']
                    self.scaler = data['scaler']
                print(f"  ✓ Model loaded from {self.model_path}")
            except Exception as e:
                print(f"  ⚠️  Failed to load model: {e}")
    
    # ========================================================================
    # HELPER METHODS
    # ========================================================================
    
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


# ============================================================================
# EXAMPLE USAGE
# ============================================================================

def example_usage():
    """Example usage of WordRanker"""
    
    # Sample text
    text = """
    Climate change mitigation requires urgent action. Renewable energy sources
    like solar and wind power are essential. Deforestation contributes to
    carbon emissions. Sustainable development is crucial for future generations.
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
    
    # Step 3: Extract features
    print("\n[STEP 3] Extracting features...")
    candidates = ranker.extract_features(candidates, text, phrases)
    print(f"  ✓ Extracted features for {len(candidates)} candidates")
    
    # Step 4: Train (optional - if you have labels)
    # labels = [0.9, 0.85, 0.7, ...]  # Human-labeled importance
    # ranker.train(candidates, labels)
    
    # Step 5: Rank
    print("\n[STEP 5] Ranking...")
    ranked = ranker.rank(candidates, top_k=10)
    
    # Output
    print("\n=== TOP 10 WORDS ===")
    for i, word in enumerate(ranked[:10], 1):
        print(f"{i:2d}. {word['word']:20s} | Score: {word['final_score']:.3f}")
        print(f"    Semantic: {word['semantic_score']:.3f} | "
              f"Freq: {word['frequency_score']:.3f} | "
              f"Learning: {word['learning_value']:.3f}")


if __name__ == "__main__":
    example_usage()
