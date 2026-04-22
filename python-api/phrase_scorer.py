import numpy as np
from typing import List, Dict, Tuple, Optional
from sklearn.linear_model import LinearRegression
from sklearn.cluster import AgglomerativeClustering
from sklearn.metrics.pairwise import cosine_similarity
import pickle
import os
class PhraseScorer:
    def __init__(
        self,
        embedding_model=None,
        weights: Optional[Dict[str, float]] = None,
        model_path: str = "phrase_scorer_model.pkl"
    ):
        self.embedding_model = embedding_model
        self.model_path = model_path
        self.regression_model = None
        
        # Default weights (fallback if no training data)
        self.weights = weights or {
            'semantic': 0.5,
            'frequency': 0.3,
            'length': 0.2
        }
        
        # Try to load pre-trained model
        self._load_model()
    
    def compute_scores(
        self,
        phrases: List[Dict],
        document_text: str,
        document_embedding: Optional[np.ndarray] = None
    ) -> List[Dict]:
        print(f"[SCORER] Computing scores for {len(phrases)} phrases...")
        
        # Step 1: Semantic scoring
        phrases = self._compute_semantic_scores(
            phrases, document_text, document_embedding
        )
        
        # Step 2: Frequency scoring
        phrases = self._compute_frequency_scores(phrases, document_text)
        
        # Step 3: Length scoring
        phrases = self._compute_length_scores(phrases)
        
        print(f" Computed semantic, frequency, and length scores")
        
        return phrases
    
    def _compute_semantic_scores(
        self,
        phrases: List[Dict],
        document_text: str,
        document_embedding: Optional[np.ndarray] = None
    ) -> List[Dict]:
        try:
            # Load embedding model if not provided
            if self.embedding_model is None:
                from embedding_utils import SentenceTransformer
                self.embedding_model = SentenceTransformer('all-MiniLM-L6-v2')
            
            # Encode document if not provided
            if document_embedding is None:
                document_embedding = self.embedding_model.encode(
                    [document_text], show_progress_bar=False
                )[0]
            
            # Encode all phrases
            phrase_texts = [p['phrase'] for p in phrases]
            phrase_embeddings = self.embedding_model.encode(
                phrase_texts, show_progress_bar=False
            )
            
            # Compute cosine similarity
            for i, phrase in enumerate(phrases):
                phrase_emb = phrase_embeddings[i].reshape(1, -1)
                doc_emb = document_embedding.reshape(1, -1)
                
                similarity = cosine_similarity(phrase_emb, doc_emb)[0][0]
                phrase['semantic_score'] = float(similarity)
                phrase['embedding'] = phrase_embeddings[i].tolist()
            
        except Exception as e:
            print(f"   Semantic scoring failed: {e}")
            # Fallback: assign default score
            for phrase in phrases:
                phrase['semantic_score'] = 0.5
        
        return phrases
    
    def _compute_frequency_scores(
        self,
        phrases: List[Dict],
        document_text: str
    ) -> List[Dict]:
        # Normalize document text
        doc_lower = document_text.lower()
        
        # Count occurrences
        freq_map = {}
        for phrase in phrases:
            phrase_lower = phrase['phrase'].lower()
            freq = doc_lower.count(phrase_lower)
            freq_map[phrase['phrase']] = freq
        
        # Find max frequency
        max_freq = max(freq_map.values()) if freq_map else 1
        
        # Compute scores
        for phrase in phrases:
            freq = freq_map.get(phrase['phrase'], 1)
            
            # Option A: Log normalization
            freq_score = np.log(1 + freq) / np.log(1 + max_freq)
            
            phrase['frequency'] = freq
            phrase['freq_score'] = float(freq_score)
        
        return phrases
    
    def _compute_length_scores(self, phrases: List[Dict]) -> List[Dict]:
        for phrase in phrases:
            words = phrase['phrase'].split()
            length_score = min(len(words) / 5.0, 1.0)
            phrase['length_score'] = float(length_score)
        
        return phrases
    
    def train_weights(
        self,
        phrases: List[Dict],
        labels: List[float]
    ) -> Dict[str, float]:
        print(f"[SCORER] Training weights with {len(phrases)} labeled examples...")
        
        # Prepare features with NaN handling
        X = []
        for p in phrases:
            features = [
                p.get('semantic_score', 0.5),
                p.get('freq_score', 0.5),
                p.get('length_score', 0.5)
            ]
            # Replace NaN with default value
            features = [0.5 if np.isnan(f) or f is None else f for f in features]
            X.append(features)
        
        X = np.array(X)
        y = np.array(labels)
        
        # Additional NaN check
        if np.any(np.isnan(X)):
            print("   Found NaN values in features, replacing with 0.5")
            X = np.nan_to_num(X, nan=0.5)
        
        if np.any(np.isnan(y)):
            print("   Found NaN values in labels, replacing with 0.5")
            y = np.nan_to_num(y, nan=0.5)
        
        # Train linear regression
        self.regression_model = LinearRegression()
        self.regression_model.fit(X, y)
        
        # Extract weights
        coefficients = self.regression_model.coef_
        self.weights = {
            'semantic': float(coefficients[0]),
            'frequency': float(coefficients[1]),
            'length': float(coefficients[2])
        }
        
        print(f"  Trained weights: {self.weights}")
        
        # Save model
        self._save_model()
        
        return self.weights
    
    def rank_phrases(
        self,
        phrases: List[Dict],
        top_k: Optional[int] = None
    ) -> List[Dict]:
        print(f"[SCORER] Ranking {len(phrases)} phrases...")
        
        # Compute final scores
        for phrase in phrases:
            if self.regression_model is not None:
                # Use trained model
                features = [
                    phrase.get('semantic_score', 0.5),
                    phrase.get('freq_score', 0.5),
                    phrase.get('length_score', 0.5)
                ]
                # Replace NaN with default value
                features = [0.5 if np.isnan(f) or f is None else f for f in features]
                
                X = np.array([features])
                
                # Additional NaN check
                if np.any(np.isnan(X)):
                    X = np.nan_to_num(X, nan=0.5)
                
                final_score = self.regression_model.predict(X)[0]
            else:
                # Use manual weights
                semantic = phrase.get('semantic_score', 0.5)
                freq = phrase.get('freq_score', 0.5)
                length = phrase.get('length_score', 0.5)
                
                # Handle NaN in manual calculation
                semantic = 0.5 if np.isnan(semantic) else semantic
                freq = 0.5 if np.isnan(freq) else freq
                length = 0.5 if np.isnan(length) else length
                
                final_score = (
                    self.weights['semantic'] * semantic +
                    self.weights['frequency'] * freq +
                    self.weights['length'] * length
                )
            
            phrase['final_score'] = float(final_score)
        
        # Sort by final score
        phrases.sort(key=lambda x: x['final_score'], reverse=True)
        
        # Keep top_k if specified
        if top_k is not None:
            phrases = phrases[:top_k]
        
        print(f" Ranked phrases (kept top {len(phrases)})")
        
        return phrases
    
    def cluster_phrases(
        self,
        phrases: List[Dict],
        threshold: float = 0.4,
        linkage: str = 'average'
    ) -> Tuple[List[Dict], List[Dict]]:
        print(f"[SCORER] Clustering {len(phrases)} phrases...")
        
        if len(phrases) < 2:
            # Not enough phrases to cluster
            for phrase in phrases:
                phrase['cluster_id'] = 0
            return phrases, [{
                'cluster_id': 0,
                'phrases': [p['phrase'] for p in phrases],
                'top_phrase': phrases[0]['phrase'] if phrases else '',
                'semantic_theme': 'General'
            }]
        
        try:
            # Extract embeddings
            embeddings = []
            for phrase in phrases:
                if 'embedding' in phrase:
                    embeddings.append(phrase['embedding'])
                else:
                    # Fallback: zero embedding
                    embeddings.append([0.0] * 384)
            
            embeddings = np.array(embeddings)
            
            # Agglomerative clustering
            clustering = AgglomerativeClustering(
                n_clusters=None,
                distance_threshold=threshold,
                linkage=linkage,
                metric='cosine'
            )
            
            cluster_labels = clustering.fit_predict(embeddings)
            
            # Assign cluster IDs
            for i, phrase in enumerate(phrases):
                phrase['cluster_id'] = int(cluster_labels[i])
            
            # Build cluster info
            clusters = {}
            for phrase in phrases:
                cid = phrase['cluster_id']
                if cid not in clusters:
                    clusters[cid] = []
                clusters[cid].append(phrase)
            
            cluster_info = []
            for cid, cluster_phrases in clusters.items():
                # Find top phrase (highest final_score)
                top_phrase = max(cluster_phrases, key=lambda x: x.get('final_score', 0))
                
                cluster_info.append({
                    'cluster_id': cid,
                    'phrases': [p['phrase'] for p in cluster_phrases],
                    'top_phrase': top_phrase['phrase'],
                    'centroid_phrase': top_phrase['phrase'],
                    'semantic_theme': self._infer_theme(cluster_phrases)
                })
            
            print(f"  ✓ Created {len(cluster_info)} clusters")
            
            return phrases, cluster_info
            
        except Exception as e:
            print(f"  Clustering failed: {e}")
            # Fallback: single cluster
            for phrase in phrases:
                phrase['cluster_id'] = 0
            return phrases, [{
                'cluster_id': 0,
                'phrases': [p['phrase'] for p in phrases],
                'top_phrase': phrases[0]['phrase'] if phrases else '',
                'semantic_theme': 'General'
            }]
    
    def _infer_theme(self, cluster_phrases: List[Dict]) -> str:
        # Simple heuristic: use top 2 words from top phrase
        if not cluster_phrases:
            return "Unknown"
        
        top_phrase = max(cluster_phrases, key=lambda x: x.get('final_score', 0))
        words = top_phrase['phrase'].split()[:2]
        theme = ' '.join(word.capitalize() for word in words)
        
        return theme
    
    def _save_model(self):
        """Save trained regression model"""
        if self.regression_model is not None:
            try:
                with open(self.model_path, 'wb') as f:
                    pickle.dump({
                        'model': self.regression_model,
                        'weights': self.weights
                    }, f)
                print(f"   Saved model to {self.model_path}")
            except Exception as e:
                print(f"    Failed to save model: {e}")
    
    def _load_model(self):
        """Load pre-trained regression model"""
        if os.path.exists(self.model_path):
            try:
                with open(self.model_path, 'rb') as f:
                    data = pickle.load(f)
                    self.regression_model = data['model']
                    self.weights = data['weights']
                print(f"   Loaded model from {self.model_path}")
            except Exception as e:
                print(f"   Failed to load model: {e}")
def example_usage():
    # Sample data
    phrases = [
        {'phrase': 'climate change', 'position': 0, 'sentence_id': 0},
        {'phrase': 'global warming', 'position': 10, 'sentence_id': 1},
        {'phrase': 'renewable energy', 'position': 20, 'sentence_id': 2},
    ]
    
    document_text = """
    Climate change is one of the most pressing issues. 
    Global warming affects ecosystems. 
    Renewable energy is the solution.
    """
    
    # Initialize scorer
    scorer = PhraseScorer()
    
    # Step 1-3: Compute scores
    phrases = scorer.compute_scores(phrases, document_text)
    
    # Step 4: Train weights (optional, if you have labels)
    # labels = [0.9, 0.85, 0.8]  # Human-labeled importance
    # scorer.train_weights(phrases, labels)
    
    # Step 5: Rank phrases
    phrases = scorer.rank_phrases(phrases, top_k=10)
    
    # Step 6: Cluster phrases
    phrases, clusters = scorer.cluster_phrases(phrases, threshold=0.4)
    
    # Output
    print("\n=== RESULTS ===")
    for phrase in phrases:
        print(f"Phrase: {phrase['phrase']}")
        print(f"  Semantic: {phrase['semantic_score']:.3f}")
        print(f"  Frequency: {phrase['freq_score']:.3f}")
        print(f"  Length: {phrase['length_score']:.3f}")
        print(f"  Final: {phrase['final_score']:.3f}")
        print(f"  Cluster: {phrase['cluster_id']}")
    
    print("\n=== CLUSTERS ===")
    for cluster in clusters:
        print(f"Cluster {cluster['cluster_id']}: {cluster['semantic_theme']}")
        print(f"  Top phrase: {cluster['top_phrase']}")
        print(f"  Phrases: {cluster['phrases']}")


if __name__ == "__main__":
    example_usage()
