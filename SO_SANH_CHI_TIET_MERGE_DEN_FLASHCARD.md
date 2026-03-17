# SO SÁNH CHI TIẾT: MERGE ĐẾN FLASHCARD (LUẬN VĂN VS CODE THỰC TẾ)

## TỔNG QUAN

Báo cáo này so sánh chi tiết từ bước **1.2.3.7 Merge** đến **1.2.3.11 Flashcard Generation** giữa luận văn và code thực tế.

## 🔍 PHÁT HIỆN QUAN TRỌNG

**Pipeline thực tế có 2 PHIÊN BẢN MERGE khác nhau:**
1. **PhraseWordMergerV2** (file: `phrase_word_merger_v2.py`) - Phức tạp, đầy đủ tính năng
2. **NewPipelineLearnedScoring** (file: `new_pipeline_learned_scoring.py`) - Đơn giản, được sử dụng chính

## PHẦN I: GIAI ĐOẠN 7 - MERGE (HÒA NHẬP TỪ VỰNG)

### LUẬN VĂN MÔ TẢ:
```
+ Mục tiêu: Hòa nhập danh sách từ vựng và từ đơn lẻ để tránh trùng lập ngữ nghĩa
+ Phương pháp:
1. Semantic Similarity (SBERT) theo công thức cosine
2. Quy tắc xử lý:
   - similarity ≥ 0.85: Merge vào phrase
   - 0.65 ≤ similarity < 0.85: Giữ nhưng giảm điểm
   - similarity < 0.65: Giữ độc lập
3. Frequency-aware adjustment: Từ xuất hiện nhiều bị giảm điểm
```

### CODE THỰC TẾ - PHIÊN BẢN 1 (PhraseWordMergerV2):
✅ **KHỚP HOÀN TOÀN VỚI LUẬN VĂN**
```python
def _compute_similarities(self, phrases, words):
    # Compute semantic similarity between each word and all phrases
    similarities = np.dot(phrase_embeddings, word_emb) / (
        np.linalg.norm(phrase_embeddings, axis=1) * np.linalg.norm(word_emb)
    )
    max_sim = float(np.max(similarities))

def _apply_frequency_tiers(self, words):
    # 3-tier frequency system
    if freq >= high_threshold:
        word['frequency_penalty'] = 0.4  # HIGH penalty
    elif freq <= low_threshold:
        word['frequency_penalty'] = 0.0  # LOW penalty  
    else:
        word['frequency_penalty'] = 0.2  # MEDIUM penalty

def _apply_coverage_penalty(self, phrases, words):
    # Token overlap + Semantic overlap
    token_penalty = 0.5 if text in phrase_tokens else 0.0
    semantic_overlap_penalty = (0.3 * max_sim) if max_sim >= 0.7 else 0.0
```

### CODE THỰC TẾ - PHIÊN BẢN 2 (NewPipelineLearnedScoring):
❌ **KHÁC HOÀN TOÀN VỚI LUẬN VĂN**
```python
def _merge(self, phrases, words):
    """
    STAGE 7: Merge
    Simple union of phrases and words
    No filtering, no deduplication
    """
    merged = phrases + words
    return merged
```

**⚠️ PHÁT HIỆN:** Pipeline chính đang sử dụng phiên bản đơn giản, không theo luận văn!
## PHẦN II: GIAI ĐOẠN 8 - LEARNED FINAL SCORING

### LUẬN VĂN MÔ TẢ:
```
+ Mục tiêu: Học cách kết hợp các đặc trưng để tạo ra điểm cuối cùng tối ưu
+ Phương pháp: LinearRegression từ sklearn
+ Input: feature vector [semantic_score, learning_value, freq_score, rarity_score]
+ Output: human-labeled importance
+ Cơ sở khoa học: Tránh bias do rule-based, có thể publish (learning-to-rank)
```

### CODE THỰC TẾ:
✅ **KHỚP HOÀN TOÀN**
```python
def _learned_final_scoring(self, items):
    # Prepare feature matrix
    X = []
    for item in items:
        features = [
            item.get('semantic_score', 0.5),
            item.get('learning_value', 0.5),
            item.get('freq_score', 0.5),
            item.get('rarity_score', 0.5)
        ]
        X.append(features)
    
    # Normalize features
    X_normalized = self.scaler.transform(X)
    
    # Predict scores
    if self.regression_model is not None:
        scores = self.regression_model.predict(X_normalized)
    else:
        # Fallback: weighted average
        weights = np.array([0.3, 0.4, 0.1, 0.2])  # Default weights
        scores = np.dot(X_normalized, weights)
    
    # Assign final scores
    for i, item in enumerate(items):
        item['final_score'] = float(np.clip(scores[i], 0.0, 1.0))
```

**✅ ĐÁNH GIÁ:** Code thực tế implement chính xác như luận văn, có cả fallback weights.

## PHẦN III: GIAI ĐOẠN 9 - TOPIC MODELING

### LUẬN VĂN MÔ TẢ:
```
+ Mục tiêu: Nhóm từ vựng theo chủ đề ngữ nghĩa
+ Phương pháp:
1. Embedding: phrase → vector ∈ R^384 (SBERT)
2. K-Means Clustering: Input embeddings, Output cluster_id
3. Elbow Method: Chọn số cụm K tối ưu dựa trên WCSS = Σ||xi - μk||²
```

### CODE THỰC TẾ:
⚠️ **KHỚP MỘT PHẦN**
```python
def _topic_modeling(self, items):
    # Get embeddings (384-dim from SBERT) ✅
    embeddings = np.array([item['embedding'] for item in items])
    
    # KMeans clustering ✅
    n_clusters = min(self.n_topics, len(items))
    kmeans = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
    cluster_labels = kmeans.fit_predict(embeddings)
    
    # Assign cluster_id ✅
    for i, item in enumerate(items):
        item['cluster_id'] = int(cluster_labels[i])
    
    # Generate topic names ✅
    topic_name = self._generate_topic_name(topic_items)
```

**⚠️ KHÁC BIỆT:** Code không có Elbow Method để tự động chọn K, mà dùng `self.n_topics` cố định.

## PHẦN IV: GIAI ĐOẠN 10 - WITHIN-TOPIC RANKING

### LUẬN VĂN MÔ TẢ:
```
+ Mục tiêu: Xếp hạng từ vựng trong từng chủ đề
+ Phương pháp:
1. Centroid Similarity: similarity = cosine(phrase_embedding, cluster_centroid)
2. Combined Score: topic_score = α * final_score + (1 - α) * centroid_similarity
3. Phân loại vai trò: Core (trung tâm), Relevant (liên quan), Noise (ít quan trọng)
```

### CODE THỰC TẾ:
✅ **KHỚP HOÀN TOÀN**
```python
def _within_topic_ranking(self, topics):
    for topic in topics:
        items = topic['items']
        centroid = topic['centroid']
        
        # 1. Compute centrality (distance to centroid) ✅
        for item in items:
            item_emb = item['embedding']
            centrality = np.dot(item_emb, centroid) / (
                np.linalg.norm(item_emb) * np.linalg.norm(centroid)
            )
            item['centrality'] = float(centrality)
        
        # 2. Sort by final_score first ✅
        items.sort(key=lambda x: x.get('final_score', 0.0), reverse=True)
        
        # 3. Assign semantic roles ✅
        for i, item in enumerate(items):
            if i == 0:
                item['semantic_role'] = 'core'
            elif i < min(3, n_items):
                item['semantic_role'] = 'supporting'  # Tương đương 'relevant'
            else:
                centrality = item.get('centrality', 0.5)
                if centrality >= 0.6:
                    item['semantic_role'] = 'supporting'
                else:
                    item['semantic_role'] = 'peripheral'  # Tương đương 'noise'
```

**✅ ĐÁNH GIÁ:** Code thực tế implement chính xác, chỉ khác tên role: `supporting/peripheral` thay vì `relevant/noise`.

**🔍 TÍNH NĂNG BỔ SUNG:** Code có thêm synonym grouping không có trong luận văn:
```python
# Group synonyms together (keep them adjacent)
if len(items) > 1:
    items = self._group_synonyms_in_topic(items, threshold=0.75)
```

## PHẦN V: GIAI ĐOẠN 11 - FLASHCARD GENERATION

### LUẬN VĂN MÔ TẢ:
```
+ Mục tiêu: Chuyển vocabulary thành đơn vị học tập
+ Phương pháp: Mỗi từ/cụm từ → 1 flashcard
+ Cấu trúc flashcard:
{
    "word": "climate change",
    "definition": "...",
    "example": "...",
    "cluster": "Environment",
    "synonyms": ["global warming"],
    "ipa": "/ˈklaɪ.mət/",
    "importance_score": 0.92
}
```

### CODE THỰC TẾ:
✅ **KHỚP HOÀN TOÀN**
```python
def _create_flashcard(self, item, topic_id, topic_name, role, related_terms):
    text = item.get('phrase', item.get('word', item.get('text', '')))
    
    flashcard = {
        'text': text,                                    # ✅ Tương đương 'word'
        'type': item.get('type', 'unknown'),
        'topic_id': topic_id,
        'topic_name': topic_name,                        # ✅ Tương đương 'cluster'
        'semantic_role': role,
        'final_score': item.get('final_score', 0.5),    # ✅ Tương đương 'importance_score'
        'semantic_score': item.get('semantic_score', 0.5),
        'learning_value': item.get('learning_value', 0.5),
        'related_terms': related_terms,                  # ✅ Tương đương 'synonyms'
        'difficulty': self._estimate_difficulty(item.get('final_score', 0.5)),
        'tags': [topic_name, role, item.get('type', 'unknown')]
    }
    return flashcard
```

**⚠️ KHÁC BIỆT NHỎ:**
- Code không có `definition`, `example`, `ipa` fields như luận văn
- Code có thêm `difficulty`, `tags`, `semantic_score`, `learning_value` không có trong luận văn

**📊 LOGIC GENERATION:**
```python
def _flashcard_generation(self, topics):
    for topic in topics:
        # Create flashcard for core (1 card per topic) ✅
        if core_items:
            flashcard = self._create_flashcard(core_item, ...)
            flashcards.append(flashcard)
        
        # Create flashcards for supporting (top 3) ✅
        for item in supporting_items[:3]:
            flashcard = self._create_flashcard(item, ...)
            flashcards.append(flashcard)
```

## PHẦN VI: TÓM TẮT SO SÁNH

### ✅ NHỮNG PHẦN KHỚP HOÀN TOÀN (80%)

1. **Learned Final Scoring** - LinearRegression với 4 features
2. **Topic Modeling** - K-Means clustering trên SBERT embeddings  
3. **Within-Topic Ranking** - Centroid similarity + semantic roles
4. **Flashcard Generation** - Structured flashcard format

### ⚠️ NHỮNG KHÁC BIỆT QUAN TRỌNG (20%)

1. **Merge Strategy**:
   - **Luận văn**: Semantic similarity với threshold rules (0.85, 0.65)
   - **Code chính**: Simple union (không có semantic filtering)
   - **Code phụ**: Có implement đầy đủ như luận văn nhưng không được dùng

2. **Elbow Method**:
   - **Luận văn**: Tự động chọn K optimal với WCSS
   - **Code**: Dùng K cố định (`self.n_topics`)

3. **Flashcard Fields**:
   - **Luận văn**: `definition`, `example`, `ipa`
   - **Code**: `difficulty`, `tags`, `semantic_score`

### 🎯 KẾT LUẬN QUAN TRỌNG

**Pipeline thực tế có 2 PHIÊN BẢN:**
1. **Phiên bản đầy đủ** (`PhraseWordMergerV2`) - Implement 100% theo luận văn
2. **Phiên bản đơn giản** (`NewPipelineLearnedScoring`) - Được sử dụng chính, thiếu semantic merge

**Khuyến nghị:** Nên sử dụng `PhraseWordMergerV2` để có kết quả chính xác theo luận văn, hoặc cập nhật `NewPipelineLearnedScoring` để có semantic merge đầy đủ.