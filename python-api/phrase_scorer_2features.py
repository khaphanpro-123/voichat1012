import numpy as np
from typing import List, Dict, Optional
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from nltk import word_tokenize, sent_tokenize
class PhraseScorer2Features:
    
    def __init__(
        self,
        w1: float = 0.6,
        w2: float = 0.4,
        embedding_model=None
    ):
        self.w1 = w1
        self.w2 = w2
        self.embedding_model = embedding_model
        
        # Validate weights
        if abs(w1 + w2 - 1.0) > 0.01:
            print(f"  Warning: w1 + w2 = {w1 + w2} != 1.0")
        
        print(f"   PhraseScorer2Features initialized")
        print(f"   Weights: TF-IDF={w1}, Cohesion={w2}")
    
    def compute_scores(
        self,
        phrases: List[Dict],
        document_text: str
    ) -> List[Dict]:
        print(f"[SCORER] Computing 2 features for {len(phrases)} phrases...")
        
        # Load embedding model if needed
        if self.embedding_model is None:
            try:
                from sentence_transformers import SentenceTransformer
                self.embedding_model = SentenceTransformer('all-MiniLM-L6-v2')
                print("  ✓ Loaded SBERT model")
            except Exception as e:
                print(f"  Failed to load SBERT: {e}")
        
        # Feature 1: TF-IDF
        phrases = self._compute_tfidf_scores(phrases, document_text)
        
        # Feature 2: Semantic Cohesion
        phrases = self._compute_cohesion_scores(phrases)
        
        # Compute importance_score
        phrases = self._compute_importance_scores(phrases)
        
        print(f"  ✓ Computed TF-IDF and Cohesion scores")
        
        return phrases
    
    def _compute_tfidf_scores(
        self,
        phrases: List[Dict],
        document_text: str
    ) -> List[Dict]:
        # Tokenize document into sentences
        sentences = sent_tokenize(document_text)
        
        if not sentences:
            # Fallback: use whole document
            sentences = [document_text]
        
        # Create TF-IDF vectorizer
        vectorizer = TfidfVectorizer()
        
        try:
            # Fit on sentences
            tfidf_matrix = vectorizer.fit_transform(sentences)
            feature_names = vectorizer.get_feature_names_out()
            
            # Compute TF-IDF for each phrase
            for phrase_dict in phrases:
                phrase = phrase_dict['phrase']
                
                # Tokenize phrase
                phrase_words = word_tokenize(phrase.lower())
                
                # Get TF-IDF scores for each word
                tfidf_scores = []
                for word in phrase_words:
                    if word in feature_names:
                        idx = list(feature_names).index(word)
                        # Average TF-IDF across all sentences
                        word_tfidf = tfidf_matrix[:, idx].mean()
                        tfidf_scores.append(word_tfidf)
                    else:
                        tfidf_scores.append(0.0)
                
                # Average TF-IDF of all words
                if tfidf_scores:
                    avg_tfidf = sum(tfidf_scores) / len(tfidf_scores)
                else:
                    avg_tfidf = 0.0
                
                phrase_dict['tfidf_score'] = float(avg_tfidf)
        
        except Exception as e:
            print(f"  TF-IDF computation failed: {e}")
            # Fallback: assign default score
            for phrase_dict in phrases:
                phrase_dict['tfidf_score'] = 0.5
        
        # Normalize TF-IDF scores to [0, 1]
        tfidf_scores = [p.get('tfidf_score', 0.0) for p in phrases]
        max_tfidf = max(tfidf_scores) if tfidf_scores else 1.0
        
        if max_tfidf > 0:
            for phrase_dict in phrases:
                phrase_dict['tfidf_score_normalized'] = phrase_dict['tfidf_score'] / max_tfidf
        else:
            for phrase_dict in phrases:
                phrase_dict['tfidf_score_normalized'] = 0.5
        
        return phrases
    
    def _compute_cohesion_scores(self, phrases: List[Dict]) -> List[Dict]:
        if self.embedding_model is None:
            # Fallback: assign default score
            for phrase_dict in phrases:
                phrase_dict['cohesion_score'] = 0.5
            return phrases
        
        try:
            for phrase_dict in phrases:
                phrase = phrase_dict['phrase']
                
                # Tokenize phrase
                words = phrase.split()
                n = len(words)
                
                # Special case: single word
                if n == 1:
                    phrase_dict['cohesion_score'] = 1.0
                    continue
                
                # Encode each word
                word_embeddings = self.embedding_model.encode(words)
                
                # Compute pairwise cosine similarities
                similarities = []
                for i in range(n):
                    for j in range(i + 1, n):
                        emb_i = word_embeddings[i].reshape(1, -1)
                        emb_j = word_embeddings[j].reshape(1, -1)
                        sim = cosine_similarity(emb_i, emb_j)[0][0]
                        similarities.append(sim)
                
                # Average similarity
                if similarities:
                    avg_similarity = sum(similarities) / len(similarities)
                else:
                    avg_similarity = 0.0
                cohesion_score = (avg_similarity + 1.0) / 2.0
                
                phrase_dict['cohesion_score'] = float(cohesion_score)
        
        except Exception as e:
            print(f"    Cohesion computation failed: {e}")
            # Fallback: assign default score
            for phrase_dict in phrases:
                phrase_dict['cohesion_score'] = 0.5
        
        return phrases
    
    def _compute_importance_scores(self, phrases: List[Dict]) -> List[Dict]:
        for phrase_dict in phrases:
            tfidf = phrase_dict.get('tfidf_score_normalized', 0.5)
            cohesion = phrase_dict.get('cohesion_score', 0.5)
            
            # Compute weighted sum
            importance_score = self.w1 * tfidf + self.w2 * cohesion
            
            # Clamp to [0, 1]
            importance_score = max(0.0, min(1.0, importance_score))
            
            phrase_dict['importance_score'] = float(importance_score)
        
        return phrases
    
    def rank_phrases(
        self,
        phrases: List[Dict],
        top_k: Optional[int] = None
    ) -> List[Dict]:
        # Sort by importance_score
        phrases.sort(key=lambda x: x.get('importance_score', 0.0), reverse=True)
        
        # Keep top_k
        if top_k is not None:
            phrases = phrases[:top_k]
        
        return phrases
def example_usage():
    
    # Sample document
    document_text = """
    Machine learning is a subset of artificial intelligence. Neural networks 
    are fundamental to deep learning. Machine learning algorithms learn from data.
    Backpropagation is used for training neural networks.
    """
    
    # Sample phrases
    phrases = [
        {'phrase': 'machine learning'},
        {'phrase': 'neural network'},
        {'phrase': 'deep learning'},
        {'phrase': 'artificial intelligence'},
        {'phrase': 'backpropagation algorithm'}
    ]
    
    # Initialize scorer
    scorer = PhraseScorer2Features(w1=0.6, w2=0.4)
    
    # Compute scores
    phrases = scorer.compute_scores(phrases, document_text)
    
    # Rank phrases
    ranked = scorer.rank_phrases(phrases, top_k=5)
    
    # Display results
    print("\n" + "="*80)
    print("TOP 5 PHRASES")
    print("="*80)
    print(f"{'Rank':<6} {'Phrase':<30} {'Score':<8} {'TF-IDF':<10} {'Cohesion':<10}")
    print("-"*80)
    
    for i, phrase in enumerate(ranked, 1):
        print(f"{i:<6} {phrase['phrase']:<30} {phrase['importance_score']:.3f}    "
              f"{phrase['tfidf_score_normalized']:.3f}      "
              f"{phrase['cohesion_score']:.3f}")
    
    print("\n" + "="*80)
    print("DONE")
    print("="*80)


if __name__ == "__main__":
    example_usage()
