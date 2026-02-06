"""
Sentence Clustering V2 - ĐÚNG CHUẨN HỌC THUẬT
Cluster SENTENCES (không phải words) thành các themes
"""

from typing import List, Dict, Tuple
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.cluster import KMeans
from sklearn.metrics import silhouette_score
from nltk.tokenize import sent_tokenize
import matplotlib.pyplot as plt


class SentenceClusteringV2:
    """
    Sentence Clustering V2 - Cluster sentences thành themes
    
    Pipeline:
    1. Split text → sentences
    2. TF-IDF vectorization
    3. Elbow Method → optimal K
    4. K-means clustering
    5. Extract representative phrases per cluster
    """
    
    def __init__(self):
        self.sentences = []
        self.vectorizer = None
        self.tfidf_matrix = None
        self.kmeans = None
        self.cluster_labels = None
    
    def cluster_sentences(
        self,
        text: str,
        use_elbow: bool = True,
        min_k: int = 2,
        max_k: int = 8,
        document_id: str = None
    ) -> Dict:
        """
        Cluster sentences thành themes
        
        Args:
            text: Input text
            use_elbow: Dùng Elbow Method để chọn K
            min_k: K tối thiểu
            max_k: K tối đa
            document_id: Document ID (for plot filename)
        
        Returns:
            {
                'n_clusters': 4,
                'clusters': [
                    {
                        'cluster_id': 0,
                        'theme': 'Personal_Development',
                        'sentences': [...],
                        'representative_phrases': [...]
                    }
                ]
            }
        """
        print(f"[SentenceClusteringV2] Starting clustering...")
        
        # BƯỚC 1: Split sentences
        self.sentences = self._split_sentences(text)
        
        if len(self.sentences) < min_k * 2:
            return {
                'error': f'Not enough sentences ({len(self.sentences)} < {min_k * 2})',
                'n_sentences': len(self.sentences)
            }
        
        print(f"[SentenceClusteringV2] Split into {len(self.sentences)} sentences")
        
        # BƯỚC 2: TF-IDF vectorization
        self._vectorize_sentences()
        
        # BƯỚC 3: Elbow Method
        if use_elbow:
            optimal_k, elbow_data = self._find_optimal_k(
                min_k=min_k,
                max_k=min(max_k, len(self.sentences) // 2),
                document_id=document_id
            )
        else:
            optimal_k = min(4, len(self.sentences) // 3)
            elbow_data = None
        
        print(f"[SentenceClusteringV2] Optimal K: {optimal_k}")
        
        # BƯỚC 4: K-means clustering
        self._cluster_with_kmeans(n_clusters=optimal_k)
        
        # BƯỚC 5: Build cluster results
        clusters = self._build_cluster_results()
        
        result = {
            'n_clusters': optimal_k,
            'n_sentences': len(self.sentences),
            'clusters': clusters,
            'method': 'K-Means on Sentence TF-IDF Vectors'
        }
        
        if elbow_data:
            result['elbow_analysis'] = elbow_data
        
        print(f"[SentenceClusteringV2] Clustering complete: {optimal_k} clusters")
        
        return result
    
    def _split_sentences(self, text: str) -> List[str]:
        """
        Split text thành sentences
        """
        sentences = sent_tokenize(text)
        
        # Filter sentences quá ngắn
        valid_sentences = []
        for sent in sentences:
            words = sent.split()
            if len(words) >= 5:  # Ít nhất 5 từ
                valid_sentences.append(sent.strip())
        
        return valid_sentences
    
    def _vectorize_sentences(self):
        """
        Vectorize sentences bằng TF-IDF
        """
        self.vectorizer = TfidfVectorizer(
            max_features=500,
            ngram_range=(1, 2),      # Unigram + Bigram
            min_df=1,
            max_df=0.9,
            stop_words='english',
            norm='l2'
        )
        
        self.tfidf_matrix = self.vectorizer.fit_transform(self.sentences)
        
        print(f"[SentenceClusteringV2] TF-IDF matrix shape: {self.tfidf_matrix.shape}")
    
    def _find_optimal_k(
        self,
        min_k: int,
        max_k: int,
        document_id: str = None
    ) -> Tuple[int, Dict]:
        """
        Tìm K tối ưu bằng Elbow Method
        
        Returns:
            (optimal_k, elbow_data)
        """
        print(f"[SentenceClusteringV2] Running Elbow Method (K={min_k} to {max_k})...")
        
        inertias = []
        k_values = list(range(min_k, max_k + 1))
        
        for k in k_values:
            kmeans = KMeans(n_clusters=k, random_state=42, n_init=10)
            kmeans.fit(self.tfidf_matrix)
            inertias.append(kmeans.inertia_)
        
        # Tìm elbow point
        optimal_k = self._find_elbow_point(inertias, k_values)
        
        # Plot elbow curve
        plot_path = self._plot_elbow_curve(
            k_values,
            inertias,
            optimal_k,
            document_id
        )
        
        elbow_data = {
            'optimal_k': optimal_k,
            'k_values': k_values,
            'inertias': inertias,
            'plot_path': plot_path
        }
        
        return optimal_k, elbow_data
    
    def _find_elbow_point(self, inertias: List[float], k_values: List[int]) -> int:
        """
        Tìm elbow point từ inertias
        """
        # Method: Tìm điểm có độ giảm lớn nhất
        diffs = np.diff(inertias)
        elbow_idx = np.argmax(np.abs(diffs))
        
        return k_values[elbow_idx + 1]
    
    def _plot_elbow_curve(
        self,
        k_values: List[int],
        inertias: List[float],
        optimal_k: int,
        document_id: str = None
    ) -> str:
        """
        Vẽ Elbow curve
        """
        plt.figure(figsize=(10, 6))
        plt.plot(k_values, inertias, 'bo-', linewidth=2, markersize=8)
        plt.axvline(x=optimal_k, color='r', linestyle='--', label=f'Optimal K={optimal_k}')
        plt.xlabel('Number of Clusters (K)', fontsize=12)
        plt.ylabel('Inertia (WCSS)', fontsize=12)
        plt.title('Elbow Method for Optimal K (Sentence Clustering)', fontsize=14)
        plt.grid(True, alpha=0.3)
        plt.legend()
        
        # Save plot
        if document_id:
            filename = f"elbow_curve_sentences_{document_id}.png"
        else:
            filename = "elbow_curve_sentences.png"
        
        plot_path = f"cache/{filename}"
        plt.savefig(plot_path, dpi=100, bbox_inches='tight')
        plt.close()
        
        print(f"[SentenceClusteringV2] Elbow curve saved: {plot_path}")
        
        return plot_path
    
    def _cluster_with_kmeans(self, n_clusters: int):
        """
        Cluster sentences với K-means
        """
        self.kmeans = KMeans(
            n_clusters=n_clusters,
            random_state=42,
            n_init=10,
            max_iter=300
        )
        
        self.cluster_labels = self.kmeans.fit_predict(self.tfidf_matrix)
        
        # Calculate silhouette score
        if n_clusters > 1 and len(self.sentences) > n_clusters:
            silhouette = silhouette_score(self.tfidf_matrix, self.cluster_labels)
            print(f"[SentenceClusteringV2] Silhouette score: {silhouette:.4f}")
    
    def _build_cluster_results(self) -> List[Dict]:
        """
        Build cluster results với representative phrases
        """
        clusters = []
        
        for cluster_id in range(self.kmeans.n_clusters):
            # Get sentences in this cluster
            cluster_indices = np.where(self.cluster_labels == cluster_id)[0]
            cluster_sentences = [self.sentences[i] for i in cluster_indices]
            
            # Extract representative phrases
            representative_phrases = self._extract_cluster_phrases(cluster_indices)
            
            # Generate theme name
            theme = self._generate_theme_name(representative_phrases)
            
            clusters.append({
                'cluster_id': int(cluster_id),
                'theme': theme,
                'n_sentences': len(cluster_sentences),
                'sentences': cluster_sentences,
                'representative_phrases': representative_phrases
            })
        
        return clusters
    
    def _extract_cluster_phrases(self, cluster_indices: np.ndarray, top_n: int = 5) -> List[Dict]:
        """
        Extract representative phrases cho cluster
        """
        # Get TF-IDF vectors for this cluster
        cluster_vectors = self.tfidf_matrix[cluster_indices]
        
        # Calculate mean TF-IDF
        mean_vector = cluster_vectors.mean(axis=0).A1
        
        # Get feature names
        feature_names = self.vectorizer.get_feature_names_out()
        
        # Get top features
        top_indices = mean_vector.argsort()[-top_n:][::-1]
        
        phrases = []
        for idx in top_indices:
            if mean_vector[idx] > 0:
                phrase = feature_names[idx]
                # Chỉ giữ phrases (có dấu cách)
                if ' ' in phrase:
                    phrases.append({
                        'phrase': phrase,
                        'tfidf_score': float(mean_vector[idx])
                    })
        
        return phrases
    
    def _generate_theme_name(self, phrases: List[Dict]) -> str:
        """
        Generate theme name từ representative phrases
        """
        if not phrases:
            return "General"
        
        # Lấy phrase đầu tiên
        top_phrase = phrases[0]['phrase']
        
        # Capitalize và format
        theme = top_phrase.title().replace(' ', '_')
        
        return theme


# ============================================================================
# TESTING
# ============================================================================

if __name__ == "__main__":
    test_text = """
    Machine learning is a subset of artificial intelligence that enables computers 
    to learn from data. Deep learning uses neural networks with multiple layers.
    Natural language processing helps computers understand human language.
    
    Studying abroad helps students improve soft skills like teamwork and communication.
    Job opportunities in big companies require strong technical skills.
    Leadership skills are essential for career advancement.
    
    Volunteer work provides valuable experience and helps develop social skills.
    Community service contributes to personal growth and development.
    Helping others brings satisfaction and builds character.
    
    Healthy lifestyle choices contribute to better mental and physical health.
    Regular exercise improves cardiovascular health and reduces stress.
    Balanced diet provides essential nutrients for body and mind.
    """
    
    print("=" * 80)
    print("TESTING SENTENCE CLUSTERING V2")
    print("=" * 80)
    
    clustering = SentenceClusteringV2()
    result = clustering.cluster_sentences(
        text=test_text,
        use_elbow=True,
        document_id="test_doc"
    )
    
    if 'error' in result:
        print(f"\n❌ Error: {result['error']}")
    else:
        print(f"\n📊 RESULTS:")
        print("-" * 80)
        print(f"Number of clusters: {result['n_clusters']}")
        print(f"Total sentences: {result['n_sentences']}\n")
        
        for cluster in result['clusters']:
            print(f"Cluster {cluster['cluster_id']}: {cluster['theme']}")
            print(f"  Sentences: {cluster['n_sentences']}")
            print(f"  Representative phrases:")
            for phrase in cluster['representative_phrases'][:3]:
                print(f"    - '{phrase['phrase']}' (score: {phrase['tfidf_score']:.4f})")
            print()
        
        if 'elbow_analysis' in result:
            print(f"Elbow plot saved: {result['elbow_analysis']['plot_path']}")
    
    print("\n✅ Test completed!")
