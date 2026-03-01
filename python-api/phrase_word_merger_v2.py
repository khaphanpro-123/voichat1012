"""
STAGE: WORD-PHRASE MERGER (ADVANCED VERSION)

Mục tiêu:
- Merge word + phrase với semantic-aware scoring
- SOFT FILTERING (không drop nhiều)
- Frequency-based scoring (3-tier)
- Semantic similarity để điều chỉnh, không hard remove
- Topic modeling sau merge
- Semantic layering trong mỗi topic

Nguyên tắc:
1. Phrase là semantic center
2. Word là support
3. Soft scoring thay vì hard drop
4. Topic-based organization
5. Core / Supporting / Peripheral layers

Author: Kiro AI
Date: 2026-02-28
"""

import numpy as np
from typing import List, Dict, Tuple, Optional
from collections import defaultdict
from sklearn.cluster import KMeans
from sklearn.preprocessing import MinMaxScaler

try:
    from embedding_utils import SentenceTransformer
    HAS_EMBEDDINGS = True
except:
    HAS_EMBEDDINGS = False
    print("⚠️  sentence-transformers not available. Using fallback mode.")


class PhraseWordMergerV2:
    """
    Advanced Word-Phrase Merger with:
    - Soft filtering (no hard drops except extreme overlap)
    - Frequency-based scoring (3-tier)
    - Topic modeling
    - Semantic layering
    """
    
    def __init__(
        self,
        hard_drop_threshold: float = 0.9,
        n_topics: int = 5
    ):
        """
        Initialize merger
        
        Args:
            hard_drop_threshold: Only drop if similarity >= this (default 0.9)
            n_topics: Number of topics for clustering
        """
        self.hard_drop_threshold = hard_drop_threshold
        self.n_topics = n_topics
        self.embedding_model = None
        self.scaler = MinMaxScaler()
    
    def merge(
        self,
        phrases: List[Dict],
        words: List[Dict]
    ) -> Dict:
        """
        Merge phrases and words with advanced scoring
        
        Args:
            phrases: List of phrase dicts with 'text', 'embedding', 'frequency', 'learning_value'
            words: List of word dicts with same structure
        
        Returns:
            {
                'merged_vocabulary': List[Dict],
                'topics': List[Dict]
            }
        """
        print(f"\n{'='*80}")
        print(f"WORD-PHRASE MERGER (ADVANCED VERSION)")
        print(f"{'='*80}\n")
        
        print(f"[INPUT]")
        print(f"  Phrases: {len(phrases)}")
        print(f"  Words: {len(words)}")
        print(f"  Hard drop threshold: {self.hard_drop_threshold}")
        print(f"  Number of topics: {self.n_topics}")
        
        # Load embedding model
        global HAS_EMBEDDINGS
        if HAS_EMBEDDINGS and self.embedding_model is None:
            try:
                from embedding_utils import SentenceTransformer
                self.embedding_model = SentenceTransformer('all-MiniLM-L6-v2')
                print(f"  ✓ Loaded embedding model")
            except Exception as e:
                print(f"  ⚠️  Could not load embedding model: {e}")
                HAS_EMBEDDINGS = False
        
        # ====================================================================
        # STEP 1: Semantic Similarity Calculation
        # ====================================================================
        print(f"\n[STEP 1] Computing semantic similarities...")
        
        word_similarities = self._compute_similarities(phrases, words)
        print(f"  ✓ Computed similarities for {len(words)} words")
        
        # ====================================================================
        # STEP 2: Semantic Filtering (SOFT - minimal drops)
        # ====================================================================
        print(f"\n[STEP 2] Semantic Filtering (SOFT)...")
        
        filtered_words = []
        hard_dropped = 0
        
        for i, word in enumerate(words):
            max_sim = word_similarities[i]
            
            # HARD DROP only if extremely similar (>= 0.9)
            if max_sim >= self.hard_drop_threshold:
                hard_dropped += 1
                continue
            
            # SEMANTIC PENALTY (not drop)
            if max_sim >= 0.8:
                semantic_penalty = 0.5
            elif max_sim >= 0.7:
                semantic_penalty = 0.3
            else:
                semantic_penalty = 0.0
            
            word['semantic_penalty'] = semantic_penalty
            word['max_phrase_similarity'] = float(max_sim)
            filtered_words.append(word)
        
        print(f"  ✓ Hard dropped: {hard_dropped} words (similarity >= {self.hard_drop_threshold})")
        print(f"  ✓ Kept: {len(filtered_words)} words with penalties")
        
        # ====================================================================
        # STEP 3: Frequency Tiering
        # ====================================================================
        print(f"\n[STEP 3] Frequency Tiering (3-tier)...")
        
        filtered_words = self._apply_frequency_tiers(filtered_words)
        print(f"  ✓ Applied frequency penalties")
        
        # ====================================================================
        # STEP 4: Coverage Penalty
        # ====================================================================
        print(f"\n[STEP 4] Coverage Penalty...")
        
        filtered_words = self._apply_coverage_penalty(phrases, filtered_words)
        print(f"  ✓ Applied coverage penalties")
        
        # ====================================================================
        # STEP 5: Final Scoring (SOFT MODEL)
        # ====================================================================
        print(f"\n[STEP 5] Final Scoring...")
        
        # Score phrases
        for phrase in phrases:
            phrase['final_score'] = phrase.get('learning_value', 0.5)
            phrase['type'] = 'phrase'
        
        # Score words
        for word in filtered_words:
            learning_value = word.get('learning_value', 0.5)
            semantic_penalty = word.get('semantic_penalty', 0.0)
            frequency_penalty = word.get('frequency_penalty', 0.0)
            coverage_penalty = word.get('coverage_penalty', 0.0)
            
            final_score = (
                learning_value
                - (semantic_penalty * 0.4)
                - (frequency_penalty * 0.3)
                - (coverage_penalty * 0.3)
            )
            
            word['final_score'] = max(0.0, final_score)  # Clamp to [0, 1]
            word['type'] = 'single_word'
        
        print(f"  ✓ Scored {len(phrases)} phrases")
        print(f"  ✓ Scored {len(filtered_words)} words")
        
        # ====================================================================
        # STEP 6: Merge Words + Phrases
        # ====================================================================
        print(f"\n[STEP 6] Merging vocabulary...")
        
        merged_vocabulary = phrases + filtered_words
        merged_vocabulary.sort(key=lambda x: x['final_score'], reverse=True)
        
        print(f"  ✓ Merged: {len(merged_vocabulary)} items")
        
        # ====================================================================
        # STEP 7: Topic Modeling
        # ====================================================================
        print(f"\n[STEP 7] Topic Modeling...")
        
        topics = self._create_topics(merged_vocabulary)
        
        print(f"  ✓ Created {len(topics)} topics")
        
        # ====================================================================
        # STEP 8: Assign Words to Topics
        # ====================================================================
        print(f"\n[STEP 8] Assigning words to topics...")
        
        topics = self._assign_words_to_topics(topics, merged_vocabulary)
        
        print(f"  ✓ Assigned all items to topics")
        
        # ====================================================================
        # STEP 9: Build Topic Structure with Semantic Layers
        # ====================================================================
        print(f"\n[STEP 9] Building topic structure...")
        
        topics = self._build_topic_structure(topics)
        
        print(f"  ✓ Built semantic layers for each topic")
        
        # ====================================================================
        # Result
        # ====================================================================
        result = {
            'merged_vocabulary': merged_vocabulary,
            'topics': topics,
            'statistics': {
                'total_items': len(merged_vocabulary),
                'phrases': len(phrases),
                'words': len(filtered_words),
                'hard_dropped': hard_dropped,
                'num_topics': len(topics)
            }
        }
        
        print(f"\n{'='*80}")
        print(f"MERGE COMPLETE")
        print(f"  Total vocabulary: {len(merged_vocabulary)}")
        print(f"  Phrases: {len(phrases)}")
        print(f"  Words: {len(filtered_words)}")
        print(f"  Hard dropped: {hard_dropped}")
        print(f"  Topics: {len(topics)}")
        print(f"{'='*80}\n")
        
        return result
    
    def _compute_similarities(
        self,
        phrases: List[Dict],
        words: List[Dict]
    ) -> List[float]:
        """
        STEP 1: Compute semantic similarity between each word and all phrases
        
        Returns:
            List of max similarities (one per word)
        """
        global HAS_EMBEDDINGS
        if not HAS_EMBEDDINGS or not phrases:
            return [0.0] * len(words)
        
        # Get phrase embeddings
        phrase_embeddings = []
        for phrase in phrases:
            if 'embedding' in phrase:
                phrase_embeddings.append(phrase['embedding'])
            else:
                # Generate embedding
                text = phrase.get('phrase', phrase.get('text', ''))
                emb = self.embedding_model.encode([text])[0]
                phrase['embedding'] = emb
                phrase_embeddings.append(emb)
        
        phrase_embeddings = np.array(phrase_embeddings)
        
        # Compute max similarity for each word
        max_similarities = []
        
        for word in words:
            if 'embedding' in word:
                word_emb = word['embedding']
            else:
                # Generate embedding
                text = word.get('word', word.get('text', ''))
                word_emb = self.embedding_model.encode([text])[0]
                word['embedding'] = word_emb
            
            # Cosine similarity with all phrases
            similarities = np.dot(phrase_embeddings, word_emb) / (
                np.linalg.norm(phrase_embeddings, axis=1) * np.linalg.norm(word_emb)
            )
            
            max_sim = float(np.max(similarities))
            max_similarities.append(max_sim)
        
        return max_similarities
    
    def _apply_frequency_tiers(self, words: List[Dict]) -> List[Dict]:
        """
        STEP 3: Apply frequency-based penalties (3-tier)
        
        HIGH (>75th percentile) → penalty 0.4
        MEDIUM (25th-75th) → penalty 0.2
        LOW (<25th percentile) → penalty 0.0
        """
        if not words:
            return words
        
        # Get frequencies
        frequencies = [w.get('frequency', 1) for w in words]
        
        # Compute percentiles
        low_threshold = np.percentile(frequencies, 25)
        high_threshold = np.percentile(frequencies, 75)
        
        # Assign penalties
        for word in words:
            freq = word.get('frequency', 1)
            
            if freq >= high_threshold:
                word['frequency_tier'] = 'HIGH'
                word['frequency_penalty'] = 0.4
            elif freq <= low_threshold:
                word['frequency_tier'] = 'LOW'
                word['frequency_penalty'] = 0.0
            else:
                word['frequency_tier'] = 'MEDIUM'
                word['frequency_penalty'] = 0.2
        
        return words
    
    def _apply_coverage_penalty(
        self,
        phrases: List[Dict],
        words: List[Dict]
    ) -> List[Dict]:
        """
        STEP 4: Apply coverage penalty
        
        Token overlap: if word in phrase → 0.5
        Semantic overlap: if similarity >= 0.7 → 0.3 * similarity
        """
        # Build phrase token set
        phrase_tokens = set()
        for phrase in phrases:
            text = phrase.get('phrase', phrase.get('text', ''))
            tokens = text.lower().split()
            phrase_tokens.update(tokens)
        
        # Apply penalties
        for word in words:
            text = word.get('word', word.get('text', '')).lower()
            
            # Token overlap
            token_penalty = 0.5 if text in phrase_tokens else 0.0
            
            # Semantic overlap
            max_sim = word.get('max_phrase_similarity', 0.0)
            semantic_overlap_penalty = (0.3 * max_sim) if max_sim >= 0.7 else 0.0
            
            # Total coverage penalty
            word['coverage_penalty'] = token_penalty + semantic_overlap_penalty
        
        return words
    
    def _create_topics(self, vocabulary: List[Dict]) -> List[Dict]:
        """
        STEP 7: Create topics using KMeans clustering
        """
        global HAS_EMBEDDINGS
        if not vocabulary or not HAS_EMBEDDINGS:
            # Fallback: single topic
            return [{
                'topic_id': 0,
                'items': vocabulary,
                'centroid': None
            }]
        
        # Get embeddings
        embeddings = []
        for item in vocabulary:
            if 'embedding' in item:
                embeddings.append(item['embedding'])
            else:
                # Should not happen, but handle gracefully
                embeddings.append(np.zeros(384))  # Default embedding size
        
        embeddings = np.array(embeddings)
        
        # KMeans clustering
        n_clusters = min(self.n_topics, len(vocabulary))
        
        if n_clusters < 2:
            # Too few items, single topic
            return [{
                'topic_id': 0,
                'items': vocabulary,
                'centroid': np.mean(embeddings, axis=0) if len(embeddings) > 0 else None
            }]
        
        kmeans = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
        cluster_labels = kmeans.fit_predict(embeddings)
        
        # Assign cluster_id to items
        for i, item in enumerate(vocabulary):
            item['cluster_id'] = int(cluster_labels[i])
        
        # Build topics
        topics = []
        for topic_id in range(n_clusters):
            topic_items = [
                item for i, item in enumerate(vocabulary)
                if cluster_labels[i] == topic_id
            ]
            
            topics.append({
                'topic_id': topic_id,
                'items': topic_items,
                'centroid': kmeans.cluster_centers_[topic_id]
            })
        
        return topics
    
    def _assign_words_to_topics(
        self,
        topics: List[Dict],
        vocabulary: List[Dict]
    ) -> List[Dict]:
        """
        STEP 8: Ensure all words are assigned to topics
        (Already done in _create_topics via clustering)
        """
        # Already assigned in _create_topics
        return topics
    
    def _build_topic_structure(self, topics: List[Dict]) -> List[Dict]:
        """
        STEP 9: Build topic structure with semantic layers
        
        For each topic:
        1. Select core phrase (highest score, closest to centroid)
        2. Group items into layers:
           - Core: phrases with highest scores
           - Supporting: 0.6 <= similarity < 0.85
           - Peripheral: similarity < 0.6
        """
        global HAS_EMBEDDINGS
        structured_topics = []
        
        for topic in topics:
            topic_id = topic['topic_id']
            items = topic['items']
            centroid = topic['centroid']
            
            if not items:
                continue
            
            # Separate phrases and words
            phrases = [item for item in items if item.get('type') == 'phrase']
            words = [item for item in items if item.get('type') == 'single_word']
            
            # Select core phrase
            core_phrase = None
            if phrases:
                # Find phrase with highest score and closest to centroid
                if centroid is not None and HAS_EMBEDDINGS:
                    phrase_scores = []
                    for phrase in phrases:
                        score = phrase.get('final_score', 0.0)
                        emb = phrase.get('embedding')
                        
                        if emb is not None:
                            # Distance to centroid
                            distance = np.linalg.norm(emb - centroid)
                            # Combined score (higher is better)
                            combined = score - (distance * 0.1)
                        else:
                            combined = score
                        
                        phrase_scores.append((phrase, combined))
                    
                    # Select best
                    phrase_scores.sort(key=lambda x: x[1], reverse=True)
                    core_phrase = phrase_scores[0][0]
                else:
                    # Fallback: highest score
                    core_phrase = max(phrases, key=lambda x: x.get('final_score', 0.0))
            
            # Semantic layering
            supporting_words = []
            peripheral_words = []
            
            if centroid is not None and HAS_EMBEDDINGS:
                for word in words:
                    emb = word.get('embedding')
                    if emb is not None:
                        # Similarity to centroid
                        similarity = np.dot(emb, centroid) / (
                            np.linalg.norm(emb) * np.linalg.norm(centroid)
                        )
                        
                        if 0.6 <= similarity < 0.85:
                            supporting_words.append(word)
                        else:
                            peripheral_words.append(word)
                    else:
                        peripheral_words.append(word)
            else:
                # Fallback: all words are supporting
                supporting_words = words
            
            # Build structured topic
            structured_topics.append({
                'topic_id': topic_id,
                'core_phrase': core_phrase.get('phrase', core_phrase.get('text', '')) if core_phrase else None,
                'phrases': phrases,
                'supporting_words': supporting_words,
                'peripheral_words': peripheral_words,
                'total_items': len(items)
            })
        
        return structured_topics


# ============================================================================
# TESTING
# ============================================================================

if __name__ == "__main__":
    print("=" * 80)
    print("TESTING WORD-PHRASE MERGER V2 (ADVANCED)")
    print("=" * 80)
    
    # Mock data
    test_phrases = [
        {
            'phrase': 'climate change',
            'text': 'climate change',
            'frequency': 10,
            'learning_value': 0.95
        },
        {
            'phrase': 'renewable energy',
            'text': 'renewable energy',
            'frequency': 8,
            'learning_value': 0.90
        },
        {
            'phrase': 'fossil fuels',
            'text': 'fossil fuels',
            'frequency': 7,
            'learning_value': 0.85
        }
    ]
    
    test_words = [
        {
            'word': 'sustainable',
            'text': 'sustainable',
            'frequency': 15,
            'learning_value': 0.80
        },
        {
            'word': 'renewable',
            'text': 'renewable',
            'frequency': 12,
            'learning_value': 0.75
        },
        {
            'word': 'mitigation',
            'text': 'mitigation',
            'frequency': 5,
            'learning_value': 0.85
        },
        {
            'word': 'biodiversity',
            'text': 'biodiversity',
            'frequency': 3,
            'learning_value': 0.82
        }
    ]
    
    # Initialize merger
    merger = PhraseWordMergerV2(
        hard_drop_threshold=0.9,
        n_topics=2
    )
    
    # Merge
    result = merger.merge(
        phrases=test_phrases,
        words=test_words
    )
    
    print("\n📊 RESULTS:")
    print("-" * 80)
    print(f"Total vocabulary: {result['statistics']['total_items']}")
    print(f"Phrases: {result['statistics']['phrases']}")
    print(f"Words: {result['statistics']['words']}")
    print(f"Hard dropped: {result['statistics']['hard_dropped']}")
    print(f"Topics: {result['statistics']['num_topics']}")
    
    print("\n📊 TOPICS:")
    print("-" * 80)
    for topic in result['topics']:
        print(f"\nTopic {topic['topic_id']}:")
        print(f"  Core phrase: {topic['core_phrase']}")
        print(f"  Phrases: {len(topic['phrases'])}")
        print(f"  Supporting words: {len(topic['supporting_words'])}")
        print(f"  Peripheral words: {len(topic['peripheral_words'])}")
        print(f"  Total items: {topic['total_items']}")
    
    print("\n✅ Test completed!")
