"""Add STEP 3B methods to phrase_centric_extractor.py"""

step3b_methods = '''
    # ========================================================================
    # STEP 3B: Statistical + Semantic Refinement Methods
    # ========================================================================
    
    def _compute_tfidf_scores(self, phrases: List[Dict], text: str) -> List[Dict]:
        """
        Compute TF-IDF scores for phrases using n-grams (2-5)
        """
        # Extract all phrases
        phrase_texts = [p['phrase'] for p in phrases]
        
        if not phrase_texts:
            return phrases
        
        # Create TF-IDF vectorizer for n-grams (2-5 words)
        vectorizer = TfidfVectorizer(
            ngram_range=(2, 5),
            lowercase=True,
            token_pattern=r'\\b\\w+\\b'
        )
        
        try:
            # Fit on document text
            vectorizer.fit([text])
            
            # Transform phrases
            tfidf_matrix = vectorizer.transform(phrase_texts)
            
            # Get max TF-IDF score for each phrase
            for i, phrase_dict in enumerate(phrases):
                if tfidf_matrix[i].nnz > 0:  # Has non-zero values
                    phrase_dict['tfidf_score'] = float(tfidf_matrix[i].max())
                else:
                    phrase_dict['tfidf_score'] = 0.0
        except:
            # Fallback: assign default scores
            for phrase_dict in phrases:
                phrase_dict['tfidf_score'] = 0.5
        
        return phrases
    
    def _compute_phrase_embeddings(self, phrases: List[Dict]) -> Tuple[List[Dict], np.ndarray]:
        """
        Compute SBERT embeddings for phrases
        Returns: (phrases, embeddings_matrix)
        """
        # Load embedding model if not loaded
        if self.embedding_model is None:
            try:
                self.embedding_model = SentenceTransformer('all-MiniLM-L6-v2')
            except:
                print("  ⚠️  SBERT model not available, using fallback")
                # Return dummy embeddings
                dummy_embeddings = np.random.rand(len(phrases), 384)
                return phrases, dummy_embeddings
        
        # Extract phrase texts
        phrase_texts = [p['phrase'] for p in phrases]
        
        # Encode phrases
        embeddings = self.embedding_model.encode(phrase_texts, show_progress_bar=False)
        
        return phrases, embeddings
    
    def _cluster_phrases_with_elbow(
        self, 
        phrases: List[Dict], 
        embeddings: np.ndarray,
        min_k: int = 3,
        max_k: int = 10
    ) -> Tuple[int, List[Dict]]:
        """
        Use Elbow method to find optimal K and cluster phrases
        Returns: (optimal_k, phrases_with_cluster_ids)
        """
        if len(phrases) < min_k:
            # Too few phrases, assign all to cluster 0
            for phrase_dict in phrases:
                phrase_dict['cluster_id'] = 0
            return 1, phrases
        
        # Limit max_k to number of phrases
        max_k = min(max_k, len(phrases))
        
        # Compute inertia for different K values
        inertias = []
        k_range = range(min_k, max_k + 1)
        
        for k in k_range:
            kmeans = KMeans(n_clusters=k, random_state=42, n_init=10)
            kmeans.fit(embeddings)
            inertias.append(kmeans.inertia_)
        
        # Find elbow using rate of change
        if len(inertias) >= 2:
            # Calculate rate of change
            rates = []
            for i in range(1, len(inertias)):
                rate = (inertias[i-1] - inertias[i]) / inertias[i-1]
                rates.append(rate)
            
            # Find elbow: where rate of change drops significantly
            if rates:
                # Use threshold: elbow is where rate drops below 10% of max rate
                max_rate = max(rates)
                threshold = 0.1 * max_rate
                
                optimal_idx = 0
                for i, rate in enumerate(rates):
                    if rate < threshold:
                        optimal_idx = i
                        break
                
                optimal_k = list(k_range)[optimal_idx]
            else:
                optimal_k = min_k
        else:
            optimal_k = min_k
        
        # Cluster with optimal K
        kmeans = KMeans(n_clusters=optimal_k, random_state=42, n_init=10)
        cluster_labels = kmeans.fit_predict(embeddings)
        
        # Assign cluster IDs to phrases
        for i, phrase_dict in enumerate(phrases):
            phrase_dict['cluster_id'] = int(cluster_labels[i])
            phrase_dict['cluster_centroid'] = kmeans.cluster_centers_[cluster_labels[i]]
        
        return optimal_k, phrases
    
    def _select_cluster_representatives(
        self,
        phrases: List[Dict],
        embeddings: np.ndarray,
        top_k_per_cluster: int = 3
    ) -> List[Dict]:
        """
        Select representative phrases per cluster
        - Keep ALL 'core' phrases
        - Keep top-k closest to centroid per cluster
        """
        # Group phrases by cluster
        clusters = defaultdict(list)
        for i, phrase_dict in enumerate(phrases):
            cluster_id = phrase_dict.get('cluster_id', 0)
            clusters[cluster_id].append((i, phrase_dict))
        
        selected_phrases = []
        
        for cluster_id, cluster_phrases in clusters.items():
            # Always keep 'core' phrases
            core_phrases = [
                (idx, p) for idx, p in cluster_phrases 
                if p.get('semantic_role') == 'core'
            ]
            
            # Get centroid for this cluster
            if cluster_phrases:
                centroid = cluster_phrases[0][1].get('cluster_centroid')
                
                if centroid is not None:
                    # Calculate distance to centroid for all phrases in cluster
                    cluster_indices = [idx for idx, _ in cluster_phrases]
                    cluster_embeddings = embeddings[cluster_indices]
                    
                    # Cosine similarity to centroid
                    similarities = cosine_similarity(cluster_embeddings, [centroid]).flatten()
                    
                    # Rank phrases by similarity
                    ranked_cluster = sorted(
                        zip(cluster_phrases, similarities),
                        key=lambda x: x[1],
                        reverse=True
                    )
                    
                    # Add cluster_rank metadata
                    for rank, ((idx, phrase_dict), sim) in enumerate(ranked_cluster, 1):
                        phrase_dict['cluster_rank'] = rank
                        phrase_dict['centroid_similarity'] = float(sim)
                    
                    # Select top-k per cluster (excluding already selected core phrases)
                    core_indices = {idx for idx, _ in core_phrases}
                    non_core_ranked = [
                        (idx, p) for (idx, p), sim in ranked_cluster 
                        if idx not in core_indices
                    ]
                    
                    # Take top-k non-core phrases
                    top_k_non_core = non_core_ranked[:top_k_per_cluster]
                    
                    # Combine core + top-k
                    selected_phrases.extend([p for _, p in core_phrases])
                    selected_phrases.extend([p for _, p in top_k_non_core])
                else:
                    # No centroid, keep all
                    selected_phrases.extend([p for _, p in cluster_phrases])
            else:
                # Empty cluster
                pass
        
        return selected_phrases

'''

with open('phrase_centric_extractor.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Find the position to insert (before "# ============================================================================")
marker = "# ============================================================================\n# TESTING\n# ============================================================================"

if marker in content:
    parts = content.split(marker)
    new_content = parts[0] + step3b_methods + "\n\n" + marker + parts[1]
    
    with open('phrase_centric_extractor.py', 'w', encoding='utf-8') as f:
        f.write(new_content)
    
    print("✅ Added STEP 3B methods successfully")
else:
    print("❌ Marker not found, trying alternative...")
    # Try alternative marker
    marker2 = "if __name__ == \"__main__\":"
    if marker2 in content:
        parts = content.split(marker2)
        new_content = parts[0] + step3b_methods + "\n\n" + marker2 + parts[1]
        
        with open('phrase_centric_extractor.py', 'w', encoding='utf-8') as f:
            f.write(new_content)
        
        print("✅ Added STEP 3B methods successfully (alternative method)")
    else:
        print("❌ Could not find insertion point")
