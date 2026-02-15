"""
Embedding utilities with fallback support
Railway-optimized: NO torch, NO transformers, uses TF-IDF fallback
"""

import numpy as np
from typing import List, Union
from sklearn.feature_extraction.text import TfidfVectorizer

# Try to import sentence-transformers first (preferred, but not on Railway)
try:
    from sentence_transformers import SentenceTransformer as ST
    HAS_SENTENCE_TRANSFORMERS = True
    print("✅ Using sentence-transformers (full support)")
except ImportError:
    HAS_SENTENCE_TRANSFORMERS = False
    print("⚠️  sentence-transformers not available, using TF-IDF fallback")


class EmbeddingModel:
    """
    Unified embedding model with TF-IDF fallback
    
    Priority:
    1. sentence-transformers (best quality, heavy) - LOCAL ONLY
    2. TF-IDF (good quality, lightweight) - RAILWAY
    """
    
    def __init__(self, model_name: str = 'all-MiniLM-L6-v2'):
        self.model_name = model_name
        self.model = None
        self.embedding_dim = 384  # Default for all-MiniLM-L6-v2
        self.use_tfidf = False
        self.tfidf_vectorizer = None
        self.tfidf_corpus = []
        
        if HAS_SENTENCE_TRANSFORMERS:
            self._init_sentence_transformers()
        else:
            self._init_tfidf()
    
    def _init_sentence_transformers(self):
        """Initialize sentence-transformers (preferred, local only)"""
        try:
            self.model = ST(self.model_name)
            self.embedding_dim = self.model.get_sentence_embedding_dimension()
            print(f"✅ Loaded sentence-transformers: {self.model_name}")
        except Exception as e:
            print(f"❌ Failed to load sentence-transformers: {e}")
            self._init_tfidf()
    
    def _init_tfidf(self):
        """Initialize TF-IDF fallback (Railway-compatible)"""
        print("✅ Using TF-IDF embeddings (Railway-compatible)")
        self.use_tfidf = True
        self.embedding_dim = 300  # TF-IDF dimension
        self.tfidf_vectorizer = TfidfVectorizer(
            max_features=self.embedding_dim,
            ngram_range=(1, 2),
            min_df=1
        )
    
    def encode(
        self,
        sentences: Union[str, List[str]],
        show_progress_bar: bool = False,
        batch_size: int = 32
    ) -> np.ndarray:
        """
        Encode sentences to embeddings
        
        Args:
            sentences: Single sentence or list of sentences
            show_progress_bar: Show progress (ignored in TF-IDF mode)
            batch_size: Batch size for encoding
        
        Returns:
            Embeddings as numpy array
        """
        # Handle single sentence
        if isinstance(sentences, str):
            sentences = [sentences]
        
        # sentence-transformers mode (local only)
        if HAS_SENTENCE_TRANSFORMERS and self.model is not None:
            return self.model.encode(
                sentences,
                show_progress_bar=show_progress_bar,
                batch_size=batch_size
            )
        
        # TF-IDF mode (Railway)
        elif self.use_tfidf:
            return self._encode_with_tfidf(sentences)
        
        # Fallback: random embeddings (should never happen)
        else:
            print("⚠️  WARNING: Using random embeddings (no model available)")
            return np.random.randn(len(sentences), self.embedding_dim).astype(np.float32)
    
    def _encode_with_tfidf(self, sentences: List[str]) -> np.ndarray:
        """
        Encode using TF-IDF (Railway-compatible)
        
        This is a lightweight alternative to sentence-transformers
        """
        # Add to corpus
        self.tfidf_corpus.extend(sentences)
        
        # Fit or transform
        if not hasattr(self.tfidf_vectorizer, 'vocabulary_') or self.tfidf_vectorizer.vocabulary_ is None:
            # First time: fit
            embeddings = self.tfidf_vectorizer.fit_transform(self.tfidf_corpus).toarray()
            # Return only the new sentences
            return embeddings[-len(sentences):]
        else:
            # Already fitted: transform only
            return self.tfidf_vectorizer.transform(sentences).toarray()
    
    def get_sentence_embedding_dimension(self) -> int:
        """Get embedding dimension"""
        return self.embedding_dim


# Global model instance (lazy loading)
_global_model = None

def get_embedding_model(model_name: str = 'all-MiniLM-L6-v2') -> EmbeddingModel:
    """
    Get global embedding model instance (singleton)
    
    Args:
        model_name: Model name
    
    Returns:
        EmbeddingModel instance
    """
    global _global_model
    
    if _global_model is None:
        _global_model = EmbeddingModel(model_name)
    
    return _global_model


# Compatibility layer for sentence-transformers
class SentenceTransformer:
    """
    Drop-in replacement for sentence_transformers.SentenceTransformer
    Uses TF-IDF on Railway, sentence-transformers locally
    """
    
    def __init__(self, model_name: str = 'all-MiniLM-L6-v2'):
        self.model = EmbeddingModel(model_name)
    
    def encode(self, sentences, show_progress_bar=False, batch_size=32):
        return self.model.encode(sentences, show_progress_bar, batch_size)
    
    def get_sentence_embedding_dimension(self):
        return self.model.get_sentence_embedding_dimension()


if __name__ == "__main__":
    # Test
    print("\n" + "="*80)
    print("TESTING EMBEDDING UTILS")
    print("="*80 + "\n")
    
    model = get_embedding_model()
    
    test_sentences = [
        "This is a test sentence.",
        "Another test sentence for embeddings.",
        "Climate change is a global issue."
    ]
    
    embeddings = model.encode(test_sentences)
    
    print(f"✅ Encoded {len(test_sentences)} sentences")
    print(f"   Embedding shape: {embeddings.shape}")
    print(f"   Embedding dim: {model.get_sentence_embedding_dimension()}")
    print(f"   Sample embedding (first 5 dims): {embeddings[0][:5]}")
    
    print("\n✅ Test completed!")
