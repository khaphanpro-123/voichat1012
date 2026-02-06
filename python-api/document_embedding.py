"""
Document Embedding System
Tạo semantic embeddings cho documents và hỗ trợ semantic search

Chạy SONG SONG với TF-IDF pipeline, không thay thế
"""

import numpy as np
from typing import List, Dict, Tuple
from sklearn.metrics.pairwise import cosine_similarity

# Try to import sentence-transformers
try:
    from sentence_transformers import SentenceTransformer
    SENTENCE_TRANSFORMERS_AVAILABLE = True
except ImportError:
    SENTENCE_TRANSFORMERS_AVAILABLE = False
    print("⚠️  sentence-transformers not installed. Run: pip install sentence-transformers")


# ============================================================================
# EMBEDDING CREATION
# ============================================================================

class DocumentEmbedder:
    """
    Tạo embeddings cho documents sử dụng Sentence-BERT
    
    Model: all-MiniLM-L6-v2
    - Kích thước: 384 dimensions
    - Nhanh và hiệu quả
    - Phù hợp cho semantic search
    """
    
    def __init__(self, model_name: str = 'all-MiniLM-L6-v2'):
        """
        Initialize embedder
        
        Args:
            model_name: Tên model Sentence-BERT
        """
        if not SENTENCE_TRANSFORMERS_AVAILABLE:
            raise ImportError(
                "sentence-transformers not installed. "
                "Run: pip install sentence-transformers"
            )
        
        print(f"[Embedding] Loading model: {model_name}...")
        self.model = SentenceTransformer(model_name)
        self.model_name = model_name
        print(f"[Embedding] Model loaded successfully")
    
    def encode_documents(
        self,
        documents: List[str],
        show_progress: bool = True
    ) -> np.ndarray:
        """
        Tạo embeddings cho danh sách documents
        
        Args:
            documents: Danh sách văn bản
            show_progress: Hiển thị progress bar
        
        Returns:
            numpy array shape (n_documents, embedding_dim)
        """
        print(f"[Embedding] Encoding {len(documents)} documents...")
        
        embeddings = self.model.encode(
            documents,
            show_progress_bar=show_progress,
            convert_to_numpy=True
        )
        
        print(f"[Embedding] Created embeddings: {embeddings.shape}")
        return embeddings
    
    def encode_query(self, query: str) -> np.ndarray:
        """
        Tạo embedding cho query
        
        Args:
            query: Câu query
        
        Returns:
            numpy array shape (1, embedding_dim)
        """
        embedding = self.model.encode([query], convert_to_numpy=True)
        return embedding


# ============================================================================
# SEMANTIC SEARCH
# ============================================================================

def semantic_search(
    query_embedding: np.ndarray,
    document_embeddings: np.ndarray,
    documents: List[str],
    top_k: int = 5,
    threshold: float = 0.0
) -> List[Dict]:
    """
    Tìm kiếm documents dựa trên semantic similarity
    
    Args:
        query_embedding: Embedding của query (1, dim)
        document_embeddings: Embeddings của documents (n, dim)
        documents: Danh sách văn bản gốc
        top_k: Số kết quả trả về
        threshold: Ngưỡng similarity tối thiểu
    
    Returns:
        List of {document, similarity, rank}
    """
    # Calculate cosine similarity
    similarities = cosine_similarity(query_embedding, document_embeddings)[0]
    
    # Get top-k indices
    top_indices = similarities.argsort()[-top_k:][::-1]
    
    # Build results
    results = []
    for rank, idx in enumerate(top_indices):
        similarity = float(similarities[idx])
        
        # Filter by threshold
        if similarity >= threshold:
            results.append({
                'document': documents[idx],
                'document_id': int(idx),
                'similarity': similarity,
                'rank': rank + 1
            })
    
    return results


def find_similar_documents(
    document_id: int,
    document_embeddings: np.ndarray,
    documents: List[str],
    top_k: int = 5,
    exclude_self: bool = True
) -> List[Dict]:
    """
    Tìm documents tương tự với document cho trước
    
    Args:
        document_id: ID của document cần tìm similar
        document_embeddings: Embeddings của tất cả documents
        documents: Danh sách văn bản gốc
        top_k: Số kết quả trả về
        exclude_self: Loại bỏ chính document đó
    
    Returns:
        List of {document, similarity, rank}
    """
    # Get embedding of target document
    target_embedding = document_embeddings[document_id:document_id+1]
    
    # Calculate similarities
    similarities = cosine_similarity(target_embedding, document_embeddings)[0]
    
    # Exclude self if needed
    if exclude_self:
        similarities[document_id] = -1
    
    # Get top-k
    top_indices = similarities.argsort()[-top_k:][::-1]
    
    results = []
    for rank, idx in enumerate(top_indices):
        if idx == document_id and exclude_self:
            continue
        
        results.append({
            'document': documents[idx],
            'document_id': int(idx),
            'similarity': float(similarities[idx]),
            'rank': rank + 1
        })
    
    return results


# ============================================================================
# DOCUMENT CLUSTERING USING EMBEDDINGS (OPTIONAL)
# ============================================================================

def cluster_documents_by_embedding(
    embeddings: np.ndarray,
    n_clusters: int,
    documents: List[str]
) -> Dict:
    """
    Phân cụm documents dựa trên embeddings
    
    LƯU Ý: Đây là phương pháp THAY THẾ cho TF-IDF clustering
    Chỉ dùng khi muốn clustering dựa trên ngữ nghĩa sâu
    
    Args:
        embeddings: Document embeddings
        n_clusters: Số clusters
        documents: Danh sách văn bản
    
    Returns:
        Dictionary với cluster assignments
    """
    from sklearn.cluster import KMeans
    
    print(f"[Embedding Clustering] Clustering {len(documents)} documents into {n_clusters} clusters...")
    
    # K-means on embeddings
    kmeans = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
    cluster_labels = kmeans.fit_predict(embeddings)
    
    # Organize by cluster
    clusters = {}
    for idx, label in enumerate(cluster_labels):
        if label not in clusters:
            clusters[label] = []
        
        clusters[label].append({
            'document': documents[idx],
            'document_id': idx
        })
    
    return {
        'clusters': clusters,
        'labels': cluster_labels.tolist(),
        'n_clusters': n_clusters,
        'method': 'K-Means on Embeddings'
    }


# ============================================================================
# UTILITY FUNCTIONS
# ============================================================================

def calculate_similarity_matrix(embeddings: np.ndarray) -> np.ndarray:
    """
    Tính ma trận similarity giữa tất cả documents
    
    Args:
        embeddings: Document embeddings (n, dim)
    
    Returns:
        Similarity matrix (n, n)
    """
    return cosine_similarity(embeddings)


def get_embedding_statistics(embeddings: np.ndarray) -> Dict:
    """
    Thống kê về embeddings
    
    Args:
        embeddings: Document embeddings
    
    Returns:
        Dictionary với statistics
    """
    return {
        'n_documents': embeddings.shape[0],
        'embedding_dim': embeddings.shape[1],
        'mean_norm': float(np.linalg.norm(embeddings, axis=1).mean()),
        'std_norm': float(np.linalg.norm(embeddings, axis=1).std())
    }


# ============================================================================
# TESTING
# ============================================================================

if __name__ == "__main__":
    print("=" * 80)
    print("TESTING DOCUMENT EMBEDDING SYSTEM")
    print("=" * 80)
    
    # Test documents
    documents = [
        "Machine learning is a subset of artificial intelligence",
        "Deep learning uses neural networks with multiple layers",
        "Natural language processing helps computers understand text",
        "Football is a popular sport played worldwide",
        "Basketball players need good coordination and teamwork"
    ]
    
    # Create embedder
    try:
        embedder = DocumentEmbedder()
        
        # Encode documents
        doc_embeddings = embedder.encode_documents(documents, show_progress=False)
        print(f"\n✅ Document embeddings created: {doc_embeddings.shape}")
        
        # Test semantic search
        query = "AI and machine learning applications"
        query_embedding = embedder.encode_query(query)
        
        print(f"\n🔍 Searching for: '{query}'")
        results = semantic_search(
            query_embedding,
            doc_embeddings,
            documents,
            top_k=3
        )
        
        print("\n📊 Search Results:")
        for result in results:
            print(f"  Rank {result['rank']}: {result['document'][:60]}...")
            print(f"    Similarity: {result['similarity']:.4f}")
        
        # Test similar documents
        print(f"\n🔗 Finding documents similar to document 0...")
        similar = find_similar_documents(
            0,
            doc_embeddings,
            documents,
            top_k=3
        )
        
        print("\n📊 Similar Documents:")
        for result in similar:
            print(f"  Rank {result['rank']}: {result['document'][:60]}...")
            print(f"    Similarity: {result['similarity']:.4f}")
        
        # Statistics
        stats = get_embedding_statistics(doc_embeddings)
        print(f"\n📈 Embedding Statistics:")
        print(f"  Documents: {stats['n_documents']}")
        print(f"  Dimensions: {stats['embedding_dim']}")
        print(f"  Mean norm: {stats['mean_norm']:.4f}")
        
        print("\n✅ All tests passed!")
        
    except ImportError as e:
        print(f"\n❌ Error: {e}")
        print("Install sentence-transformers: pip install sentence-transformers")
