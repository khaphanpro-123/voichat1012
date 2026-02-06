"""
K-Means Clustering với Elbow Method
Cluster từ vựng thành nhóm dựa trên TF-IDF vectors
Bao gồm: Elbow Method, K-Means, Cluster Explanation
"""

import numpy as np
from sklearn.cluster import KMeans
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics import silhouette_score
from typing import List, Dict, Tuple
import matplotlib
matplotlib.use('Agg')  # Non-interactive backend
import matplotlib.pyplot as plt
import os

# Import cluster explanation
try:
    from cluster_explanation import explain_clusters, extract_cluster_keywords_combined
    CLUSTER_EXPLANATION_AVAILABLE = True
except ImportError:
    CLUSTER_EXPLANATION_AVAILABLE = False
    print("⚠️  cluster_explanation not available")


def calculate_elbow(tfidf_matrix: np.ndarray, max_k: int = 10) -> Tuple[int, List[float], List[int]]:
    """
    Elbow Method để tìm số cluster tối ưu
    
    Args:
        tfidf_matrix: TF-IDF matrix
        max_k: Số cluster tối đa để thử
    
    Returns:
        (optimal_k, inertias, k_values)
    """
    print(f"[Elbow] Testing K from 2 to {max_k}...")
    
    inertias = []
    k_values = list(range(2, min(max_k + 1, tfidf_matrix.shape[0])))
    
    for k in k_values:
        kmeans = KMeans(n_clusters=k, random_state=42, n_init=10)
        kmeans.fit(tfidf_matrix)
        inertias.append(kmeans.inertia_)
        print(f"[Elbow] K={k}, Inertia={kmeans.inertia_:.2f}")
    
    # Tìm elbow point (điểm gãy)
    # Sử dụng phương pháp "rate of change"
    if len(inertias) >= 3:
        changes = []
        for i in range(1, len(inertias)):
            change = abs(inertias[i] - inertias[i-1])
            changes.append(change)
        
        # Tìm điểm có sự thay đổi lớn nhất
        max_change_idx = changes.index(max(changes))
        optimal_k = k_values[max_change_idx + 1]
    else:
        optimal_k = k_values[0] if k_values else 2
    
    print(f"[Elbow] Optimal K = {optimal_k}")
    
    return optimal_k, inertias, k_values


def plot_elbow_curve(inertias: List[float], k_values: List[int], optimal_k: int, output_path: str = "elbow_curve.png"):
    """
    Vẽ đồ thị Elbow
    
    Args:
        inertias: Danh sách inertia values
        k_values: Danh sách K values
        optimal_k: K tối ưu
        output_path: Đường dẫn lưu hình (có thể chứa document_id)
    """
    plt.figure(figsize=(10, 6))
    plt.plot(k_values, inertias, 'bo-', linewidth=2, markersize=8)
    plt.axvline(x=optimal_k, color='r', linestyle='--', linewidth=2, label=f'Optimal K = {optimal_k}')
    plt.xlabel('Number of Clusters (K)', fontsize=12)
    plt.ylabel('Inertia (Within-cluster sum of squares)', fontsize=12)
    plt.title('Elbow Method for Optimal K', fontsize=14, fontweight='bold')
    plt.grid(True, alpha=0.3)
    plt.legend(fontsize=11)
    plt.tight_layout()
    
    # Tạo thư mục nếu chưa tồn tại
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    
    plt.savefig(output_path, dpi=150, bbox_inches='tight')
    plt.close()
    print(f"[Elbow] Saved plot to {output_path}")


def cluster_vocabulary_kmeans(
    vocabulary_list: List[Dict],
    text: str,
    n_clusters: int = None,
    use_elbow: bool = True,
    max_k: int = 10,
    document_id: str = None  # Thêm document_id
) -> Dict:
    """
    Cluster từ vựng sử dụng K-Means
    
    Args:
        vocabulary_list: Danh sách từ vựng với scores
        text: Văn bản gốc
        n_clusters: Số cluster (nếu None, dùng Elbow method)
        use_elbow: Có sử dụng Elbow method không
        max_k: Số cluster tối đa để thử (cho Elbow)
    
    Returns:
        Dictionary với clusters và statistics
    """
    print(f"[K-Means] Starting clustering for {len(vocabulary_list)} words...")
    
    if len(vocabulary_list) < 2:
        print("[K-Means] Not enough words for clustering")
        return {
            'clusters': [],
            'n_clusters': 0,
            'method': 'K-Means (skipped - too few words)'
        }
    
    # Bước 1: Tạo TF-IDF vectors cho từ vựng
    words = [v['word'] for v in vocabulary_list]
    
    # Tạo documents cho mỗi từ (câu chứa từ đó)
    from nltk.tokenize import sent_tokenize
    sentences = sent_tokenize(text)
    
    word_documents = []
    for word in words:
        # Tìm câu chứa từ này
        word_sentences = [s for s in sentences if word.lower() in s.lower()]
        if word_sentences:
            word_documents.append(' '.join(word_sentences[:3]))  # Lấy tối đa 3 câu
        else:
            word_documents.append(word)  # Fallback
    
    # Tạo TF-IDF matrix
    vectorizer = TfidfVectorizer(max_features=100, stop_words='english')
    try:
        tfidf_matrix = vectorizer.fit_transform(word_documents)
    except:
        print("[K-Means] Failed to create TF-IDF matrix")
        return {
            'clusters': [],
            'n_clusters': 0,
            'method': 'K-Means (failed)'
        }
    
    # Bước 2: Xác định số cluster
    if n_clusters is None and use_elbow:
        optimal_k, inertias, k_values = calculate_elbow(tfidf_matrix.toarray(), max_k)
        n_clusters = optimal_k
        
        # Vẽ đồ thị Elbow với tên file riêng cho mỗi document
        os.makedirs("cache", exist_ok=True)
        
        # Tạo tên file duy nhất cho mỗi document
        if document_id:
            plot_filename = f"cache/elbow_curve_{document_id}.png"
        else:
            from datetime import datetime
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            plot_filename = f"cache/elbow_curve_{timestamp}.png"
        
        plot_elbow_curve(inertias, k_values, optimal_k, plot_filename)
        
        elbow_data = {
            'optimal_k': optimal_k,
            'inertias': inertias,
            'k_values': k_values,
            'plot_path': plot_filename
        }
    else:
        if n_clusters is None:
            n_clusters = min(5, len(vocabulary_list) // 2)
        elbow_data = None
    
    # Đảm bảo n_clusters hợp lệ
    n_clusters = max(2, min(n_clusters, len(vocabulary_list) - 1))
    
    print(f"[K-Means] Using K = {n_clusters}")
    
    # Bước 3: Chạy K-Means
    kmeans = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
    cluster_labels = kmeans.fit_predict(tfidf_matrix)
    
    # Tính Silhouette Score
    if len(set(cluster_labels)) > 1:
        silhouette_avg = silhouette_score(tfidf_matrix, cluster_labels)
    else:
        silhouette_avg = 0.0
    
    print(f"[K-Means] Silhouette Score = {silhouette_avg:.3f}")
    
    # Bước 4: Tổ chức kết quả theo cluster
    clusters = {}
    cluster_documents = {}  # Lưu documents cho explanation
    
    for idx, label in enumerate(cluster_labels):
        if label not in clusters:
            clusters[label] = []
            cluster_documents[label] = []
        
        clusters[label].append({
            'word': vocabulary_list[idx]['word'],
            'score': vocabulary_list[idx]['score'],
            'cluster_id': int(label)
        })
        
        # Lưu document text cho cluster explanation
        cluster_documents[label].append(word_documents[idx])
    
    # Sắp xếp từ trong mỗi cluster theo score
    for label in clusters:
        clusters[label] = sorted(clusters[label], key=lambda x: x['score'], reverse=True)
    
    # Bước 5: CLUSTER EXPLANATION (MỚI)
    cluster_explanations = {}
    if CLUSTER_EXPLANATION_AVAILABLE:
        print(f"[K-Means] Generating cluster explanations...")
        try:
            explanations = explain_clusters(cluster_documents, method='combined', top_keywords=5)
            cluster_explanations = explanations
        except Exception as e:
            print(f"[K-Means] Cluster explanation failed: {e}")
    
    # Chọn đại diện cho mỗi cluster (từ có score cao nhất)
    cluster_representatives = []
    for label in sorted(clusters.keys()):
        representative = clusters[label][0]
        
        cluster_info = {
            'cluster_id': int(label),
            'representative_word': representative['word'],
            'representative_score': representative['score'],
            'cluster_size': len(clusters[label]),
            'words': [w['word'] for w in clusters[label][:5]]  # Top 5 words
        }
        
        # Thêm explanation nếu có
        if label in cluster_explanations:
            cluster_info['label'] = cluster_explanations[label]['label']
            cluster_info['keywords'] = cluster_explanations[label]['keywords']
            cluster_info['description'] = cluster_explanations[label]['description']
        
        cluster_representatives.append(cluster_info)
    
    print(f"[K-Means] Created {len(clusters)} clusters with explanations")
    
    return {
        'clusters': cluster_representatives,
        'n_clusters': n_clusters,
        'silhouette_score': silhouette_avg,
        'method': 'K-Means with TF-IDF + Cluster Explanation',
        'elbow_analysis': elbow_data,
        'all_clusters': {int(k): v for k, v in clusters.items()}
    }


# ============================================================================
# TESTING
# ============================================================================

if __name__ == "__main__":
    # Test data
    test_text = """
    Machine learning is a subset of artificial intelligence. Deep learning uses neural networks.
    Natural language processing helps computers understand text. Computer vision enables image recognition.
    Data science combines statistics and programming. Big data requires distributed computing.
    Cloud computing provides scalable infrastructure. DevOps automates software deployment.
    """
    
    test_vocabulary = [
        {'word': 'machine learning', 'score': 0.95},
        {'word': 'deep learning', 'score': 0.90},
        {'word': 'neural networks', 'score': 0.85},
        {'word': 'natural language', 'score': 0.80},
        {'word': 'computer vision', 'score': 0.75},
        {'word': 'data science', 'score': 0.70},
        {'word': 'big data', 'score': 0.65},
        {'word': 'cloud computing', 'score': 0.60},
        {'word': 'devops', 'score': 0.55},
    ]
    
    print("=" * 80)
    print("TESTING K-MEANS CLUSTERING WITH ELBOW METHOD")
    print("=" * 80)
    
    result = cluster_vocabulary_kmeans(
        test_vocabulary,
        test_text,
        use_elbow=True,
        max_k=5
    )
    
    print("\n📊 RESULTS:")
    print("-" * 80)
    print(f"Number of clusters: {result['n_clusters']}")
    print(f"Silhouette score: {result['silhouette_score']:.3f}")
    print(f"Method: {result['method']}")
    
    if result['elbow_analysis']:
        print(f"\n📈 Elbow Analysis:")
        print(f"  Optimal K: {result['elbow_analysis']['optimal_k']}")
        print(f"  Plot saved: {result['elbow_analysis']['plot_path']}")
    
    print(f"\n🎯 Cluster Representatives:")
    for cluster in result['clusters']:
        print(f"\nCluster {cluster['cluster_id']}:")
        print(f"  Representative: {cluster['representative_word']} (score: {cluster['representative_score']:.2f})")
        print(f"  Size: {cluster['cluster_size']} words")
        print(f"  Top words: {', '.join(cluster['words'])}")
    
    print("\n✅ Test completed!")
