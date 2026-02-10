"""Insert STEP 3B call into extract_vocabulary method"""

step3b_code = '''
        # ====================================================================
        # STEP 3B: Statistical + Semantic Refinement (NEW)
        # ====================================================================
        print(f"\\n[STEP 3B] Statistical + Semantic Refinement...")
        print(f"  ℹ️  Input: {len(filtered_phrases)} phrases from linguistic filtering")
        
        # 3B.1: TF-IDF Scoring
        print(f"\\n  [3B.1] Computing TF-IDF scores...")
        filtered_phrases = self._compute_tfidf_scores(filtered_phrases, text)
        print(f"  ✓ Added TF-IDF scores to {len(filtered_phrases)} phrases")
        
        # 3B.2: SBERT Embeddings
        print(f"\\n  [3B.2] Computing SBERT embeddings...")
        filtered_phrases, embeddings = self._compute_phrase_embeddings(filtered_phrases)
        print(f"  ✓ Generated embeddings for {len(filtered_phrases)} phrases")
        
        # 3B.3: K-Means Clustering with Elbow Method
        print(f"\\n  [3B.3] K-Means clustering with Elbow method...")
        if len(filtered_phrases) >= 3:
            optimal_k, filtered_phrases = self._cluster_phrases_with_elbow(
                filtered_phrases, 
                embeddings,
                min_k=min(3, len(filtered_phrases)),
                max_k=min(10, len(filtered_phrases))
            )
            print(f"  ✓ Optimal K = {optimal_k} clusters")
            
            # 3B.4: Select Representative Phrases per Cluster
            print(f"\\n  [3B.4] Selecting representative phrases per cluster...")
            filtered_phrases = self._select_cluster_representatives(
                filtered_phrases,
                embeddings,
                top_k_per_cluster=3
            )
            print(f"  ✓ Selected {len(filtered_phrases)} representative phrases")
        else:
            print(f"  ⚠️  Too few phrases ({len(filtered_phrases)}) for clustering, skipping")
        
        print(f"\\n  ✅ STEP 3B complete: {len(filtered_phrases)} phrases after refinement")
        
'''

with open('phrase_centric_extractor.py', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Find the line with "# STEP 3.3: Phrase Rarity Filter - DISABLED"
new_lines = []
inserted = False

for i, line in enumerate(lines):
    if '# STEP 3.3: Phrase Rarity Filter - DISABLED' in line and not inserted:
        # Insert STEP 3B code before STEP 3.3
        new_lines.append(step3b_code)
        inserted = True
    new_lines.append(line)

if inserted:
    with open('phrase_centric_extractor.py', 'w', encoding='utf-8') as f:
        f.writelines(new_lines)
    print("✅ Inserted STEP 3B call into extract_vocabulary")
else:
    print("❌ Could not find insertion point")
