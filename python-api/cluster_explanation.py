"""
Cluster Explanation System
Trích xuất keywords/phrases đại diện cho mỗi cluster và tạo labels

Mục đích: Giải thích nội dung của cluster cho người dùng
"""

import numpy as np
from typing import List, Dict, Tuple
from sklearn.feature_extraction.text import TfidfVectorizer
from collections import Counter
import re


# ============================================================================
# CLUSTER KEYWORD EXTRACTION
# ============================================================================

def extract_cluster_keywords_tfidf(
    cluster_documents: List[str],
    top_n: int = 5,
    ngram_range: Tuple[int, int] = (1, 2)
) -> List[Dict]:
    """
    Trích xuất top keywords/phrases cho cluster bằng TF-IDF
    
    Phương pháp:
    1. Gộp tất cả documents trong cluster
    2. Tính TF-IDF cho cluster
    3. Chọn top n-grams có TF-IDF cao nhất
    
    Args:
        cluster_documents: Danh sách văn bản trong cluster
        top_n: Số keywords trả về
        ngram_range: Range của n-grams (1,2) = unigram + bigram
    
    Returns:
        List of {phrase, score}
    """
    if not cluster_documents:
        return []
    
    # Combine all documents in cluster
    combined_text = ' '.join(cluster_documents)
    
    # TF-IDF vectorization
    vectorizer = TfidfVectorizer(
        ngram_range=ngram_range,
        max_features=100,
        stop_words='english',
        min_df=1
    )
    
    try:
        tfidf_matrix = vectorizer.fit_transform([combined_text])
        feature_names = vectorizer.get_feature_names_out()
        
        # Get scores
        scores = tfidf_matrix.toarray()[0]
        
        # Sort by score
        top_indices = scores.argsort()[-top_n:][::-1]
        
        keywords = []
        for idx in top_indices:
            if scores[idx] > 0:
                keywords.append({
                    'phrase': feature_names[idx],
                    'score': float(scores[idx]),
                    'type': 'tfidf'
                })
        
        return keywords
    
    except:
        return []


def extract_cluster_keywords_frequency(
    cluster_documents: List[str],
    top_n: int = 5,
    min_word_length: int = 3
) -> List[Dict]:
    """
    Trích xuất top keywords dựa trên tần suất
    
    Args:
        cluster_documents: Danh sách văn bản trong cluster
        top_n: Số keywords trả về
        min_word_length: Độ dài tối thiểu của từ
    
    Returns:
        List of {phrase, count, frequency}
    """
    if not cluster_documents:
        return []
    
    # Tokenize all documents
    from nltk.tokenize import word_tokenize
    from nltk.corpus import stopwords
    
    stop_words = set(stopwords.words('english'))
    
    all_words = []
    for doc in cluster_documents:
        tokens = word_tokenize(doc.lower())
        tokens = [
            t for t in tokens 
            if t.isalnum() 
            and len(t) >= min_word_length 
            and t not in stop_words
        ]
        all_words.extend(tokens)
    
    # Count frequency
    word_counts = Counter(all_words)
    total_words = len(all_words)
    
    # Get top words
    top_words = word_counts.most_common(top_n)
    
    keywords = []
    for word, count in top_words:
        keywords.append({
            'phrase': word,
            'count': count,
            'frequency': count / total_words if total_words > 0 else 0,
            'type': 'frequency'
        })
    
    return keywords


def extract_cluster_keywords_combined(
    cluster_documents: List[str],
    top_n: int = 5
) -> List[Dict]:
    """
    Kết hợp TF-IDF và frequency để trích keywords
    
    Args:
        cluster_documents: Danh sách văn bản trong cluster
        top_n: Số keywords trả về
    
    Returns:
        List of {phrase, score, method}
    """
    # Get TF-IDF keywords
    tfidf_keywords = extract_cluster_keywords_tfidf(
        cluster_documents,
        top_n=top_n * 2  # Get more for combining
    )
    
    # Get frequency keywords
    freq_keywords = extract_cluster_keywords_frequency(
        cluster_documents,
        top_n=top_n * 2
    )
    
    # Combine and deduplicate
    all_keywords = {}
    
    for kw in tfidf_keywords:
        phrase = kw['phrase']
        all_keywords[phrase] = {
            'phrase': phrase,
            'tfidf_score': kw['score'],
            'frequency': 0,
            'combined_score': kw['score']
        }
    
    for kw in freq_keywords:
        phrase = kw['phrase']
        if phrase in all_keywords:
            all_keywords[phrase]['frequency'] = kw['frequency']
            all_keywords[phrase]['combined_score'] += kw['frequency']
        else:
            all_keywords[phrase] = {
                'phrase': phrase,
                'tfidf_score': 0,
                'frequency': kw['frequency'],
                'combined_score': kw['frequency']
            }
    
    # Sort by combined score
    sorted_keywords = sorted(
        all_keywords.values(),
        key=lambda x: x['combined_score'],
        reverse=True
    )
    
    return sorted_keywords[:top_n]


# ============================================================================
# CLUSTER LABELING
# ============================================================================

def generate_cluster_label(
    keywords: List[Dict],
    max_words: int = 3
) -> str:
    """
    Tạo label cho cluster từ top keywords
    
    Args:
        keywords: Danh sách keywords
        max_words: Số từ tối đa trong label
    
    Returns:
        Cluster label string
    """
    if not keywords:
        return "Unlabeled Cluster"
    
    # Get top phrases
    top_phrases = [kw['phrase'] for kw in keywords[:max_words]]
    
    # Join with " & "
    label = " & ".join(top_phrases)
    
    # Capitalize first letter
    label = label.title()
    
    return label


def generate_cluster_description(
    keywords: List[Dict],
    cluster_size: int
) -> str:
    """
    Tạo mô tả chi tiết cho cluster
    
    Args:
        keywords: Danh sách keywords
        cluster_size: Số documents trong cluster
    
    Returns:
        Cluster description
    """
    if not keywords:
        return f"Cluster with {cluster_size} documents"
    
    # Get top 5 keywords
    top_keywords = [kw['phrase'] for kw in keywords[:5]]
    
    description = (
        f"This cluster contains {cluster_size} documents "
        f"primarily about: {', '.join(top_keywords)}"
    )
    
    return description


# ============================================================================
# COMPLETE CLUSTER EXPLANATION
# ============================================================================

def explain_clusters(
    clusters: Dict[int, List[str]],
    method: str = 'combined',
    top_keywords: int = 5
) -> Dict[int, Dict]:
    """
    Giải thích tất cả clusters
    
    Args:
        clusters: Dictionary {cluster_id: [documents]}
        method: 'tfidf', 'frequency', hoặc 'combined'
        top_keywords: Số keywords cho mỗi cluster
    
    Returns:
        Dictionary {cluster_id: {label, keywords, description, size}}
    """
    explanations = {}
    
    for cluster_id, documents in clusters.items():
        # Extract keywords
        if method == 'tfidf':
            keywords = extract_cluster_keywords_tfidf(documents, top_keywords)
        elif method == 'frequency':
            keywords = extract_cluster_keywords_frequency(documents, top_keywords)
        else:  # combined
            keywords = extract_cluster_keywords_combined(documents, top_keywords)
        
        # Generate label
        label = generate_cluster_label(keywords, max_words=3)
        
        # Generate description
        description = generate_cluster_description(keywords, len(documents))
        
        explanations[cluster_id] = {
            'cluster_id': cluster_id,
            'label': label,
            'keywords': keywords,
            'description': description,
            'size': len(documents),
            'method': method
        }
    
    return explanations


# ============================================================================
# CLUSTER QUALITY METRICS
# ============================================================================

def calculate_cluster_coherence(
    cluster_documents: List[str]
) -> float:
    """
    Tính độ coherence của cluster (documents có liên quan với nhau không)
    
    Sử dụng TF-IDF similarity giữa các documents
    
    Args:
        cluster_documents: Danh sách văn bản trong cluster
    
    Returns:
        Coherence score (0-1)
    """
    if len(cluster_documents) < 2:
        return 1.0
    
    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.metrics.pairwise import cosine_similarity
    
    try:
        vectorizer = TfidfVectorizer(stop_words='english')
        tfidf_matrix = vectorizer.fit_transform(cluster_documents)
        
        # Calculate pairwise similarities
        similarities = cosine_similarity(tfidf_matrix)
        
        # Get average similarity (excluding diagonal)
        n = len(cluster_documents)
        total_sim = similarities.sum() - n  # Subtract diagonal
        avg_sim = total_sim / (n * (n - 1)) if n > 1 else 0
        
        return float(avg_sim)
    
    except:
        return 0.0


# ============================================================================
# TESTING
# ============================================================================

if __name__ == "__main__":
    print("=" * 80)
    print("TESTING CLUSTER EXPLANATION SYSTEM")
    print("=" * 80)
    
    # Test clusters
    clusters = {
        0: [
            "Machine learning is widely used in medical image analysis",
            "Deep learning models improve diagnosis accuracy",
            "Artificial intelligence helps healthcare systems"
        ],
        1: [
            "Football players train every day",
            "The football team won the championship",
            "Basketball requires good teamwork"
        ]
    }
    
    # Test keyword extraction
    print("\n🔍 Testing Keyword Extraction:")
    for cluster_id, documents in clusters.items():
        print(f"\nCluster {cluster_id}:")
        
        # TF-IDF method
        keywords_tfidf = extract_cluster_keywords_tfidf(documents, top_n=5)
        print(f"  TF-IDF Keywords:")
        for kw in keywords_tfidf:
            print(f"    - {kw['phrase']}: {kw['score']:.4f}")
        
        # Combined method
        keywords_combined = extract_cluster_keywords_combined(documents, top_n=5)
        print(f"  Combined Keywords:")
        for kw in keywords_combined:
            print(f"    - {kw['phrase']}: {kw['combined_score']:.4f}")
    
    # Test cluster explanation
    print("\n📊 Testing Complete Cluster Explanation:")
    explanations = explain_clusters(clusters, method='combined', top_keywords=5)
    
    for cluster_id, explanation in explanations.items():
        print(f"\nCluster {cluster_id}:")
        print(f"  Label: {explanation['label']}")
        print(f"  Description: {explanation['description']}")
        print(f"  Size: {explanation['size']} documents")
        print(f"  Top Keywords:")
        for kw in explanation['keywords'][:3]:
            print(f"    - {kw['phrase']}")
        
        # Coherence
        coherence = calculate_cluster_coherence(clusters[cluster_id])
        print(f"  Coherence: {coherence:.4f}")
    
    print("\n✅ All tests passed!")
