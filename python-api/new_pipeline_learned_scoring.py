"""
NEW PIPELINE - LEARNED SCORING VERSION

Pipeline Flow:
1. Text → Sentence
2. Sentence → Heading
3. Heading → Context mapping
4. Context → Phrase extraction
5. Context → Single word extraction
6. Independent scoring (multi-factor)
7. Merge (phrase + word)
8. Learned final scoring (regression model)
9. Topic modeling (KMeans/BERTopic)
10. Within-topic ranking
11. Flashcard generation

Key Differences from Old Pipeline:
- NO hard filtering (stages 9-11 removed)
- Independent scoring for each item
- Learned weights via regression
- Topic-based organization
- Within-topic structuring

Author: Kiro AI
Date: 2026-02-28
"""

import numpy as np
from typing import List, Dict, Optional, Tuple
from collections import defaultdict
from sklearn.linear_model import LinearRegression, Ridge
from sklearn.cluster import KMeans
from sklearn.preprocessing import MinMaxScaler
import pickle
import os

try:
    from embedding_utils import SentenceTransformer
    HAS_EMBEDDINGS = True
except:
    HAS_EMBEDDINGS = False
    print("⚠️  sentence-transformers not available")

try:
    import spacy
    HAS_SPACY = True
except:
    HAS_SPACY = False
    print("⚠️  spaCy not available")


class NewPipelineLearnedScoring:
    """
    New pipeline with learned scoring and topic modeling
    
    Stages:
    1-5: Same as before (text → phrases + words)
    6: Independent scoring
    7: Merge
    8: Learned final scoring
    9: Topic modeling
    10: Within-topic ranking
    11: Flashcard generation
    """
    
    def __init__(
        self,
        n_topics: int = 5,
        model_path: str = "final_scorer_model.pkl"
    ):
        """
        Initialize pipeline
        
        Args:
            n_topics: Number of topics for clustering
            model_path: Path to save/load trained model
        """
        self.n_topics = n_topics
        self.model_path = model_path
        self.regression_model = None
        self.scaler = MinMaxScaler()
        self.embedding_model = None
        
        # Load model if exists
        self._load_model()
        
        # Load embedding model
        if HAS_EMBEDDINGS:
            try:
                from embedding_utils import SentenceTransformer
                self.embedding_model = SentenceTransformer('all-MiniLM-L6-v2')
                print("✅ Loaded embedding model")
            except Exception as e:
                print(f"⚠️  Could not load embedding model: {e}")
    
    def process(
        self,
        phrases: List[Dict],
        words: List[Dict],
        document_text: str = ""
    ) -> Dict:
        """
        Process phrases and words through new pipeline
        
        Args:
            phrases: List of phrase dicts from phrase extraction
            words: List of word dicts from word extraction
            document_text: Original document text (for centroid)
        
        Returns:
            {
                'vocabulary': List[Dict],
                'topics': List[Dict],
                'flashcards': List[Dict]
            }
        """
        print(f"\n{'='*80}")
        print(f"NEW PIPELINE - LEARNED SCORING")
        print(f"{'='*80}\n")
        
        print(f"[INPUT]")
        print(f"  Phrases: {len(phrases)}")
        print(f"  Words: {len(words)}")
        
        # ====================================================================
        # STAGE 6: Independent Scoring
        # ====================================================================
        print(f"\n[STAGE 6] Independent Scoring...")
        
        phrases_scored = self._independent_scoring(phrases, document_text, item_type='phrase')
        words_scored = self._independent_scoring(words, document_text, item_type='word')
        
        print(f"  ✓ Scored {len(phrases_scored)} phrases")
        print(f"  ✓ Scored {len(words_scored)} words")
        
        # ====================================================================
        # STAGE 7: Merge
        # ====================================================================
        print(f"\n[STAGE 7] Merge...")
        
        merged = self._merge(phrases_scored, words_scored)
        
        print(f"  ✓ Merged: {len(merged)} items")
        
        # ====================================================================
        # STAGE 8: Learned Final Scoring
        # ====================================================================
        print(f"\n[STAGE 8] Learned Final Scoring...")
        
        merged = self._learned_final_scoring(merged)
        
        print(f"  ✓ Applied final scoring")
        
        # ====================================================================
        # STAGE 9: Topic Modeling
        # ====================================================================
        print(f"\n[STAGE 9] Topic Modeling...")
        
        topics = self._topic_modeling(merged)
        
        print(f"  ✓ Created {len(topics)} topics")
        
        # ====================================================================
        # STAGE 10: Within-Topic Ranking
        # ====================================================================
        print(f"\n[STAGE 10] Within-Topic Ranking...")
        
        topics = self._within_topic_ranking(topics)
        
        print(f"  ✓ Ranked items within topics")
        
        # ====================================================================
        # STAGE 11: Flashcard Generation
        # ====================================================================
        print(f"\n[STAGE 11] Flashcard Generation...")
        
        flashcards = self._flashcard_generation(topics)
        
        print(f"  ✓ Generated {len(flashcards)} flashcards")
        
        # ====================================================================
        # Result
        # ====================================================================
        result = {
            'vocabulary': merged,
            'topics': topics,
            'flashcards': flashcards,
            'statistics': {
                'total_items': len(merged),
                'phrases': len(phrases_scored),
                'words': len(words_scored),
                'num_topics': len(topics),
                'num_flashcards': len(flashcards)
            }
        }
        
        print(f"\n{'='*80}")
        print(f"PIPELINE COMPLETE")
        print(f"  Total vocabulary: {len(merged)}")
        print(f"  Topics: {len(topics)}")
        print(f"  Flashcards: {len(flashcards)}")
        print(f"{'='*80}\n")
        
        return result
    
    def _independent_scoring(
        self,
        items: List[Dict],
        document_text: str,
        item_type: str
    ) -> List[Dict]:
        """
        STAGE 6: Independent Scoring
        
        Compute 4 signals for each item:
        1. semantic_score: Cosine similarity with document
        2. learning_value: Academic potential
        3. freq_score: Log-scaled frequency
        4. rarity_score: IDF-based rarity
        """
        if not items:
            return items
        
        # Get document embedding (centroid)
        doc_embedding = None
        if self.embedding_model and document_text:
            doc_embedding = self.embedding_model.encode([document_text])[0]
        
        # Compute signals
        for item in items:
            # Get text
            text = item.get('phrase', item.get('word', item.get('text', '')))
            
            # 1. Semantic Score
            if self.embedding_model:
                if 'embedding' not in item:
                    item['embedding'] = self.embedding_model.encode([text])[0]
                
                if doc_embedding is not None:
                    item_emb = item['embedding']
                    semantic_score = np.dot(item_emb, doc_embedding) / (
                        np.linalg.norm(item_emb) * np.linalg.norm(doc_embedding)
                    )
                    item['semantic_score'] = float(max(0.0, semantic_score))
                else:
                    item['semantic_score'] = 0.5
            else:
                item['semantic_score'] = 0.5
            
            # 2. Learning Value (from existing importance_score or compute)
            if 'learning_value' not in item:
                # Use importance_score if available
                item['learning_value'] = item.get('importance_score', 0.5)
            
            # 3. Frequency Score (log-scaled)
            frequency = item.get('frequency', 1)
            freq_score = np.log1p(frequency)  # log(1 + freq)
            item['freq_score'] = freq_score
            
            # 4. Rarity Score (IDF-based)
            idf = item.get('idf_score', 1.0)
            item['rarity_score'] = idf
            
            # Mark type
            item['type'] = item_type
        
        # Normalize freq_score and rarity_score to [0, 1]
        if items:
            freq_scores = [item.get('freq_score', 0.0) for item in items]
            rarity_scores = [item.get('rarity_score', 0.0) for item in items]
            
            # Remove NaN values before finding max
            freq_scores = [f for f in freq_scores if not np.isnan(f)]
            rarity_scores = [r for r in rarity_scores if not np.isnan(r)]
            
            max_freq = max(freq_scores) if freq_scores else 1.0
            max_rarity = max(rarity_scores) if rarity_scores else 1.0
            
            for item in items:
                freq = item.get('freq_score', 0.0)
                rarity = item.get('rarity_score', 0.0)
                
                # Handle NaN and division by zero
                if np.isnan(freq) or max_freq == 0:
                    item['freq_score'] = 0.0
                else:
                    item['freq_score'] = freq / max_freq
                
                if np.isnan(rarity) or max_rarity == 0:
                    item['rarity_score'] = 0.0
                else:
                    item['rarity_score'] = rarity / max_rarity
        
        return items
    
    def _merge(
        self,
        phrases: List[Dict],
        words: List[Dict]
    ) -> List[Dict]:
        """
        STAGE 7: Merge
        
        Simple union of phrases and words
        No filtering, no deduplication
        """
        merged = phrases + words
        return merged
    
    def _learned_final_scoring(self, items: List[Dict]) -> List[Dict]:
        """
        STAGE 8: Learned Final Scoring
        
        Use regression model to predict final_score from:
        - semantic_score
        - learning_value
        - freq_score
        - rarity_score
        """
        if not items:
            return items
        
        # Prepare feature matrix
        X = []
        for item in items:
            features = [
                item.get('semantic_score', 0.5),
                item.get('learning_value', 0.5),
                item.get('freq_score', 0.5),
                item.get('rarity_score', 0.5)
            ]
            # Replace NaN with default value
            features = [0.5 if np.isnan(f) or f is None else f for f in features]
            X.append(features)
        
        X = np.array(X)
        
        # Additional NaN check
        if np.any(np.isnan(X)):
            print("  ⚠️  Found NaN values in features, replacing with 0.5")
            X = np.nan_to_num(X, nan=0.5)
        
        # Normalize features
        try:
            X_normalized = self.scaler.transform(X)
        except:
            # Scaler not fitted, fit now
            X_normalized = self.scaler.fit_transform(X)
        
        # Predict scores
        if self.regression_model is not None:
            scores = self.regression_model.predict(X_normalized)
        else:
            # Fallback: weighted average
            print("  ⚠️  No trained model, using default weights")
            weights = np.array([0.3, 0.4, 0.1, 0.2])  # Default weights
            scores = np.dot(X_normalized, weights)
        
        # Assign scores
        for i, item in enumerate(items):
            item['final_score'] = float(np.clip(scores[i], 0.0, 1.0))
        
        return items
    
    def _topic_modeling(self, items: List[Dict]) -> List[Dict]:
        """
        STAGE 9: Topic Modeling
        
        Use KMeans to cluster items into topics
        """
        if not items or not self.embedding_model:
            # Fallback: single topic
            return [{
                'topic_id': 0,
                'topic_name': 'General',
                'items': items,
                'centroid': None
            }]
        
        # Get embeddings
        embeddings = []
        for item in items:
            if 'embedding' in item:
                embeddings.append(item['embedding'])
            else:
                # Should not happen
                embeddings.append(np.zeros(384))
        
        embeddings = np.array(embeddings)
        
        # KMeans clustering
        n_clusters = min(self.n_topics, len(items))
        
        if n_clusters < 2:
            return [{
                'topic_id': 0,
                'topic_name': 'General',
                'items': items,
                'centroid': np.mean(embeddings, axis=0) if len(embeddings) > 0 else None
            }]
        
        kmeans = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
        cluster_labels = kmeans.fit_predict(embeddings)
        
        # Assign cluster_id
        for i, item in enumerate(items):
            item['cluster_id'] = int(cluster_labels[i])
        
        # Build topics
        topics = []
        for topic_id in range(n_clusters):
            topic_items = [
                item for i, item in enumerate(items)
                if cluster_labels[i] == topic_id
            ]
            
            # Generate topic name from top items
            topic_name = self._generate_topic_name(topic_items)
            
            topics.append({
                'topic_id': topic_id,
                'topic_name': topic_name,
                'items': topic_items,
                'centroid': kmeans.cluster_centers_[topic_id]
            })
        
        return topics
    
    def _within_topic_ranking(self, topics: List[Dict]) -> List[Dict]:
        """
        STAGE 10: Within-Topic Ranking
        
        For each topic:
        1. Compute centrality (distance to centroid)
        2. Assign semantic roles: core / supporting / peripheral
        3. Sort by final_score
        """
        for topic in topics:
            items = topic['items']
            centroid = topic['centroid']
            
            if not items:
                continue
            
            # Compute centrality
            for item in items:
                if centroid is not None and 'embedding' in item:
                    item_emb = item['embedding']
                    centrality = np.dot(item_emb, centroid) / (
                        np.linalg.norm(item_emb) * np.linalg.norm(centroid)
                    )
                    item['centrality'] = float(centrality)
                else:
                    item['centrality'] = 0.5
            
            # Sort by final_score
            items.sort(key=lambda x: x.get('final_score', 0.0), reverse=True)
            
            # Assign semantic roles
            n_items = len(items)
            for i, item in enumerate(items):
                if i == 0:
                    item['semantic_role'] = 'core'
                elif i < min(3, n_items):
                    item['semantic_role'] = 'supporting'
                else:
                    # Check centrality
                    centrality = item.get('centrality', 0.5)
                    if centrality >= 0.6:
                        item['semantic_role'] = 'supporting'
                    else:
                        item['semantic_role'] = 'peripheral'
            
            topic['items'] = items
        
        return topics
    
    def _flashcard_generation(self, topics: List[Dict]) -> List[Dict]:
        """
        STAGE 11: Flashcard Generation
        
        Generate flashcards from topics
        Each topic creates flashcards for:
        - Core term
        - Supporting terms
        - Peripheral terms (optional)
        """
        flashcards = []
        
        for topic in topics:
            topic_id = topic['topic_id']
            topic_name = topic['topic_name']
            items = topic['items']
            
            # Group by semantic role
            core_items = [item for item in items if item.get('semantic_role') == 'core']
            supporting_items = [item for item in items if item.get('semantic_role') == 'supporting']
            peripheral_items = [item for item in items if item.get('semantic_role') == 'peripheral']
            
            # Create flashcard for core
            if core_items:
                core_item = core_items[0]
                flashcard = self._create_flashcard(
                    item=core_item,
                    topic_id=topic_id,
                    topic_name=topic_name,
                    role='core',
                    related_terms=[
                        item.get('phrase', item.get('word', item.get('text', '')))
                        for item in supporting_items[:5]
                    ]
                )
                flashcards.append(flashcard)
            
            # Create flashcards for supporting (top 3)
            for item in supporting_items[:3]:
                flashcard = self._create_flashcard(
                    item=item,
                    topic_id=topic_id,
                    topic_name=topic_name,
                    role='supporting',
                    related_terms=[]
                )
                flashcards.append(flashcard)
        
        return flashcards
    
    def _create_flashcard(
        self,
        item: Dict,
        topic_id: int,
        topic_name: str,
        role: str,
        related_terms: List[str]
    ) -> Dict:
        """
        Create a flashcard from an item
        """
        text = item.get('phrase', item.get('word', item.get('text', '')))
        
        flashcard = {
            'text': text,
            'type': item.get('type', 'unknown'),
            'topic_id': topic_id,
            'topic_name': topic_name,
            'semantic_role': role,
            'final_score': item.get('final_score', 0.5),
            'semantic_score': item.get('semantic_score', 0.5),
            'learning_value': item.get('learning_value', 0.5),
            'related_terms': related_terms,
            'difficulty': self._estimate_difficulty(item.get('final_score', 0.5)),
            'tags': [topic_name, role, item.get('type', 'unknown')]
        }
        
        return flashcard
    
    def _generate_topic_name(self, items: List[Dict]) -> str:
        """
        Generate topic name from top items
        """
        if not items:
            return "General"
        
        # Get top 3 items by score
        top_items = sorted(items, key=lambda x: x.get('final_score', 0.0), reverse=True)[:3]
        
        # Use first item as topic name
        if top_items:
            text = top_items[0].get('phrase', top_items[0].get('word', top_items[0].get('text', 'General')))
            return text.title()
        
        return "General"
    
    def _estimate_difficulty(self, score: float) -> str:
        """
        Estimate difficulty from score
        """
        if score >= 0.8:
            return "advanced"
        elif score >= 0.6:
            return "intermediate"
        else:
            return "beginner"
    
    def train_model(
        self,
        training_data: List[Dict]
    ):
        """
        Train regression model from labeled data
        
        Args:
            training_data: List of dicts with features + human_importance
                [
                    {
                        'semantic_score': 0.8,
                        'learning_value': 0.9,
                        'freq_score': 0.5,
                        'rarity_score': 0.7,
                        'human_importance': 0.85  # Label
                    }
                ]
        """
        print(f"\n[TRAINING] Training regression model...")
        
        # Prepare data
        X = []
        y = []
        
        for item in training_data:
            features = [
                item.get('semantic_score', 0.5),
                item.get('learning_value', 0.5),
                item.get('freq_score', 0.5),
                item.get('rarity_score', 0.5)
            ]
            X.append(features)
            y.append(item.get('human_importance', 0.5))
        
        X = np.array(X)
        y = np.array(y)
        
        # Fit scaler
        X_normalized = self.scaler.fit_transform(X)
        
        # Train model
        self.regression_model = Ridge(alpha=1.0)  # Ridge for stability
        self.regression_model.fit(X_normalized, y)
        
        # Save model
        self._save_model()
        
        print(f"  ✓ Model trained with {len(training_data)} examples")
        print(f"  ✓ Coefficients: {self.regression_model.coef_}")
        print(f"  ✓ Intercept: {self.regression_model.intercept_}")
    
    def _save_model(self):
        """Save trained model"""
        try:
            with open(self.model_path, 'wb') as f:
                pickle.dump({
                    'model': self.regression_model,
                    'scaler': self.scaler
                }, f)
            print(f"  ✓ Model saved to {self.model_path}")
        except Exception as e:
            print(f"  ⚠️  Could not save model: {e}")
    
    def _load_model(self):
        """Load trained model"""
        if os.path.exists(self.model_path):
            try:
                with open(self.model_path, 'rb') as f:
                    data = pickle.load(f)
                    self.regression_model = data['model']
                    self.scaler = data['scaler']
                print(f"  ✓ Model loaded from {self.model_path}")
            except Exception as e:
                print(f"  ⚠️  Could not load model: {e}")


# ============================================================================
# TESTING
# ============================================================================

if __name__ == "__main__":
    print("=" * 80)
    print("TESTING NEW PIPELINE - LEARNED SCORING")
    print("=" * 80)
    
    # Mock data
    test_phrases = [
        {
            'phrase': 'machine learning',
            'importance_score': 0.95,
            'frequency': 10,
            'idf_score': 3.5
        },
        {
            'phrase': 'neural network',
            'importance_score': 0.90,
            'frequency': 8,
            'idf_score': 3.8
        }
    ]
    
    test_words = [
        {
            'word': 'algorithm',
            'importance_score': 0.85,
            'frequency': 15,
            'idf_score': 2.5
        },
        {
            'word': 'optimization',
            'importance_score': 0.80,
            'frequency': 5,
            'idf_score': 4.0
        }
    ]
    
    document_text = "Machine learning and neural networks are fundamental to modern AI. Algorithms and optimization techniques are essential."
    
    # Initialize pipeline
    pipeline = NewPipelineLearnedScoring(n_topics=2)
    
    # Process
    result = pipeline.process(
        phrases=test_phrases,
        words=test_words,
        document_text=document_text
    )
    
    print("\n📊 RESULTS:")
    print("-" * 80)
    print(f"Total vocabulary: {result['statistics']['total_items']}")
    print(f"Topics: {result['statistics']['num_topics']}")
    print(f"Flashcards: {result['statistics']['num_flashcards']}")
    
    print("\n📊 TOPICS:")
    for topic in result['topics']:
        print(f"\nTopic {topic['topic_id']}: {topic['topic_name']}")
        print(f"  Items: {len(topic['items'])}")
        
        # Show top 3
        for item in topic['items'][:3]:
            text = item.get('phrase', item.get('word', 'unknown'))
            score = item.get('final_score', 0.0)
            role = item.get('semantic_role', 'unknown')
            print(f"    - {text} (score: {score:.3f}, role: {role})")
    
    print("\n✅ Test completed!")
