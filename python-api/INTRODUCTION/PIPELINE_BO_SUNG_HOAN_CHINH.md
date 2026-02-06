# 🎯 QUY TRÌNH BỔ SUNG HOÀN CHỈNH CHO HỆ THỐNG

## 📋 HIỆN TRẠNG VÀ ĐÁNH GIÁ

### ✅ ĐÃ CÓ (Đang hoạt động):
- [x] Text extraction (OCR/PDF/DOCX)
- [x] Preprocessing cơ bản (lemmatization, stopwords)
- [x] TF-IDF với n-gram (1,2)
- [x] RAKE, YAKE extraction
- [x] K-means clustering (nhưng SAI đối tượng)
- [x] Embedding system (document_embedding.py)
- [x] RAG system với LLM

### ❌ THIẾU/SAI (Cần bổ sung):
- [ ] **Sentence/chunk splitting** - THIẾU HOÀN TOÀN
- [ ] **K-means cluster SENTENCE** - Đang cluster WORDS (SAI)
- [ ] **Phrase extraction per cluster** - Chưa gắn với cluster
- [ ] **Embedding refinement** - Chưa dùng đúng vai trò
- [ ] **LLM có kiểm soát từ vựng** - LLM đang tự do
- [ ] **Điều kiện chạy pipeline** - Chạy mù không kiểm tra

---

## 🔄 PIPELINE HOÀN CHỈNH SAU KHI BỔ SUNG

```
Upload file
    ↓
Extract text (OCR / PDF / DOCX)
    ↓
⭐ [BỔ SUNG 1] Sentence / Chunk Splitting
    ↓
Preprocessing (giữ phrase, lemmatization nhẹ)
    ↓
⭐ [BỔ SUNG 2] TF-IDF n-gram (2-3) trên SENTENCES
    ↓
⭐ [SỬA 3] K-means cluster SENTENCES (không phải words)
    ↓
⭐ [BỔ SUNG 4] Phrase extraction PER CLUSTER
    ↓
⭐ [BỔ SUNG 5] Embedding refinement (lọc + gộp phrases)
    ↓
⭐ [BỔ SUNG 6] LLM sinh câu CÓ KIỂM SOÁT từ vựng
    ↓
JSON output
```

---

## 📝 CHI TIẾT TỪNG BƯỚC BỔ SUNG

### 🟢 BƯỚC 1: SENTENCE / CHUNK SPLITTING

#### ❌ Vấn đề hiện tại:
```python
# Hiện tại: 1 file = 1 document
text = extract_text_from_file(file_path)
tfidf_matrix = vectorizer.fit_transform([text])  # Chỉ 1 document!
```

**Hậu quả**:
- TF-IDF không có nghĩa (chỉ 1 document)
- K-means không cluster được (cần nhiều documents)
- IDF = 0 cho tất cả terms

#### ✅ Giải pháp:

**File mới**: `python-api/sentence_splitter.py`

```python
"""
Sentence / Chunk Splitting
Chia document thành các đơn vị nhỏ để phân tích
"""

from typing import List, Dict
from nltk.tokenize import sent_tokenize
import re

def split_into_sentences(text: str, min_length: int = 20) -> List[Dict]:
    """
    Chia text thành sentences
    
    Args:
        text: Raw text
        min_length: Độ dài tối thiểu của sentence
    
    Returns:
        List of sentence dicts với metadata
    """
    sentences = sent_tokenize(text)
    
    results = []
    for idx, sent in enumerate(sentences):
        # Loại sentences quá ngắn
        if len(sent.strip()) < min_length:
            continue
        
        results.append({
            'id': idx,
            'text': sent.strip(),
            'length': len(sent.strip()),
            'word_count': len(sent.split())
        })
    
    return results


def split_into_chunks(text: str, chunk_size: int = 200, overlap: int = 50) -> List[Dict]:
    """
    Chia text thành chunks với overlap
    
    Args:
        text: Raw text
        chunk_size: Số từ mỗi chunk
        overlap: Số từ overlap giữa chunks
    
    Returns:
        List of chunk dicts
    """
    words = text.split()
    chunks = []
    
    start = 0
    chunk_id = 0
    
    while start < len(words):
        end = min(start + chunk_size, len(words))
        chunk_text = ' '.join(words[start:end])
        
        chunks.append({
            'id': chunk_id,
            'text': chunk_text,
            'start': start,
            'end': end,
            'word_count': end - start
        })
        
        chunk_id += 1
        start += (chunk_size - overlap)
    
    return chunks


def smart_split(text: str, strategy: str = 'sentence') -> List[Dict]:
    """
    Smart splitting với nhiều strategies
    
    Args:
        text: Raw text
        strategy: 'sentence', 'chunk', hoặc 'hybrid'
    
    Returns:
        List of text units
    """
    if strategy == 'sentence':
        return split_into_sentences(text)
    elif strategy == 'chunk':
        return split_into_chunks(text)
    elif strategy == 'hybrid':
        # Chia thành chunks, sau đó chia mỗi chunk thành sentences
        chunks = split_into_chunks(text, chunk_size=500)
        all_sentences = []
        
        for chunk in chunks:
            sentences = split_into_sentences(chunk['text'])
            for sent in sentences:
                sent['chunk_id'] = chunk['id']
                all_sentences.append(sent)
        
        return all_sentences
    else:
        raise ValueError(f"Unknown strategy: {strategy}")
```

**Tích hợp vào ensemble_extractor.py**:

```python
from sentence_splitter import smart_split

def extract_vocabulary_ensemble_v2(
    text: str,
    max_words: int = 50,
    split_strategy: str = 'sentence'  # NEW
):
    # BƯỚC 1: Split thành sentences/chunks
    text_units = smart_split(text, strategy=split_strategy)
    
    print(f"[Ensemble] Split into {len(text_units)} text units")
    
    # BƯỚC 2: TF-IDF trên text units (không phải toàn bộ text)
    documents = [unit['text'] for unit in text_units]
    tfidf_scores = calculate_tfidf(documents)  # Nhiều documents!
    
    # ... rest of pipeline
```

---

### 🟢 BƯỚC 2: TF-IDF N-GRAM TRÊN SENTENCES

#### ✅ Đã có n-gram (1,2) nhưng cần mở rộng:

```python
def calculate_tfidf_v2(documents: List[str]) -> Dict[str, float]:
    """
    TF-IDF với n-gram (2-3) trên nhiều documents
    """
    vectorizer = TfidfVectorizer(
        max_features=1000,
        ngram_range=(2, 3),      # Bigram + Trigram (không cần unigram)
        min_df=2,                # Xuất hiện ít nhất 2 documents
        max_df=0.8,              # Không quá phổ biến
        stop_words='english',
        norm='l2'
    )
    
    tfidf_matrix = vectorizer.fit_transform(documents)
    feature_names = vectorizer.get_feature_names_out()
    
    # Aggregate scores across all documents
    mean_scores = tfidf_matrix.mean(axis=0).A1
    
    tfidf_scores = {}
    for idx, score in enumerate(mean_scores):
        if score > 0:
            tfidf_scores[feature_names[idx]] = score
    
    return tfidf_scores
```

---

### 🟢 BƯỚC 3: K-MEANS CLUSTER SENTENCES (SỬA SAI)

#### ❌ Hiện tại (SAI):
```python
# kmeans_clustering.py - Đang cluster WORDS
def cluster_vocabulary_kmeans(vocabulary_list, text, ...):
    # Tạo TF-IDF cho WORDS
    words = [v['word'] for v in vocabulary_list]
    # Cluster words → SAI!
```

#### ✅ Sửa thành cluster SENTENCES:

**File mới**: `python-api/sentence_clustering.py`

```python
"""
Sentence Clustering với K-means
Cluster sentences thành các chủ đề
"""

from typing import List, Dict
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.cluster import KMeans
from sklearn.metrics import silhouette_score
import numpy as np
import matplotlib.pyplot as plt

def cluster_sentences_kmeans(
    sentences: List[Dict],
    use_elbow: bool = True,
    max_k: int = 10,
    min_k: int = 2
) -> Dict:
    """
    Cluster sentences thành các chủ đề
    
    Args:
        sentences: List of sentence dicts từ sentence_splitter
        use_elbow: Dùng Elbow Method để chọn K
        max_k: K tối đa
        min_k: K tối thiểu
    
    Returns:
        Clustering results với cluster labels
    """
    # Extract sentence texts
    texts = [s['text'] for s in sentences]
    
    if len(texts) < min_k:
        return {
            'error': f'Not enough sentences ({len(texts)} < {min_k})',
            'n_sentences': len(texts)
        }
    
    # TF-IDF vectorization
    vectorizer = TfidfVectorizer(
        max_features=500,
        ngram_range=(1, 2),
        min_df=2,
        max_df=0.8,
        stop_words='english'
    )
    
    tfidf_matrix = vectorizer.fit_transform(texts)
    
    # Elbow Method để chọn K
    if use_elbow:
        optimal_k = find_optimal_k_elbow(
            tfidf_matrix,
            max_k=min(max_k, len(texts) // 2)
        )
    else:
        optimal_k = min(5, len(texts) // 3)
    
    # K-means clustering
    kmeans = KMeans(
        n_clusters=optimal_k,
        random_state=42,
        n_init=10
    )
    
    cluster_labels = kmeans.fit_predict(tfidf_matrix)
    
    # Gán cluster labels cho sentences
    for idx, sent in enumerate(sentences):
        sent['cluster'] = int(cluster_labels[idx])
    
    # Group sentences by cluster
    clusters = {}
    for sent in sentences:
        cluster_id = sent['cluster']
        if cluster_id not in clusters:
            clusters[cluster_id] = []
        clusters[cluster_id].append(sent)
    
    return {
        'n_clusters': optimal_k,
        'n_sentences': len(sentences),
        'sentences': sentences,
        'clusters': clusters,
        'cluster_sizes': {k: len(v) for k, v in clusters.items()},
        'vectorizer': vectorizer,
        'tfidf_matrix': tfidf_matrix
    }


def find_optimal_k_elbow(tfidf_matrix, max_k: int = 10) -> int:
    """
    Tìm K tối ưu bằng Elbow Method
    """
    wcss = []
    k_range = range(2, max_k + 1)
    
    for k in k_range:
        kmeans = KMeans(n_clusters=k, random_state=42, n_init=10)
        kmeans.fit(tfidf_matrix)
        wcss.append(kmeans.inertia_)
    
    # Tìm elbow point
    optimal_k = find_elbow_point(wcss, k_range)
    
    return optimal_k


def find_elbow_point(wcss: List[float], k_range: range) -> int:
    """
    Tìm elbow point từ WCSS curve
    """
    # Simple method: tìm điểm có độ giảm lớn nhất
    diffs = np.diff(wcss)
    elbow_idx = np.argmax(np.abs(diffs)) + 1
    
    return list(k_range)[elbow_idx]
```

---

### 🟢 BƯỚC 4: PHRASE EXTRACTION PER CLUSTER

#### ✅ Trích xuất phrases THEO CLUSTER:

**Thêm vào `sentence_clustering.py`**:

```python
def extract_phrases_per_cluster(
    clustering_result: Dict,
    top_n: int = 10
) -> Dict:
    """
    Trích xuất top phrases cho mỗi cluster
    
    Args:
        clustering_result: Kết quả từ cluster_sentences_kmeans
        top_n: Số phrases mỗi cluster
    
    Returns:
        Dict mapping cluster_id -> top phrases
    """
    clusters = clustering_result['clusters']
    vectorizer = clustering_result['vectorizer']
    tfidf_matrix = clustering_result['tfidf_matrix']
    
    cluster_phrases = {}
    
    for cluster_id, sentences in clusters.items():
        # Lấy indices của sentences trong cluster
        sentence_indices = [s['id'] for s in sentences]
        
        # Lấy TF-IDF vectors của cluster
        cluster_vectors = tfidf_matrix[sentence_indices]
        
        # Tính mean TF-IDF cho cluster
        mean_vector = cluster_vectors.mean(axis=0).A1
        
        # Lấy top features
        feature_names = vectorizer.get_feature_names_out()
        top_indices = mean_vector.argsort()[-top_n:][::-1]
        
        top_phrases = [
            {
                'phrase': feature_names[idx],
                'score': float(mean_vector[idx])
            }
            for idx in top_indices
            if mean_vector[idx] > 0
        ]
        
        cluster_phrases[cluster_id] = top_phrases
    
    return cluster_phrases
```

---

### 🟢 BƯỚC 5: EMBEDDING REFINEMENT

#### ✅ Dùng embedding để lọc và gộp phrases:

**File mới**: `python-api/phrase_refinement.py`

```python
"""
Phrase Refinement với Embedding
Lọc phrases chung chung và gộp phrases tương tự
"""

from typing import List, Dict
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np

class PhraseRefiner:
    def __init__(self):
        self.model = SentenceTransformer('all-MiniLM-L6-v2')
    
    def filter_generic_phrases(
        self,
        phrases: List[Dict],
        generic_threshold: float = 0.7
    ) -> List[Dict]:
        """
        Lọc bỏ phrases quá chung chung
        
        Args:
            phrases: List of phrase dicts
            generic_threshold: Ngưỡng similarity với generic terms
        
        Returns:
            Filtered phrases
        """
        # Generic terms để so sánh
        generic_terms = [
            "important thing", "good idea", "main point",
            "key factor", "significant aspect", "crucial element"
        ]
        
        # Encode
        phrase_texts = [p['phrase'] for p in phrases]
        phrase_embeddings = self.model.encode(phrase_texts)
        generic_embeddings = self.model.encode(generic_terms)
        
        # Tính similarity
        similarities = cosine_similarity(phrase_embeddings, generic_embeddings)
        max_similarities = similarities.max(axis=1)
        
        # Lọc
        filtered = []
        for idx, phrase in enumerate(phrases):
            if max_similarities[idx] < generic_threshold:
                phrase['generic_score'] = float(max_similarities[idx])
                filtered.append(phrase)
        
        return filtered
    
    def merge_similar_phrases(
        self,
        phrases: List[Dict],
        similarity_threshold: float = 0.85
    ) -> List[Dict]:
        """
        Gộp phrases tương tự nhau
        
        Args:
            phrases: List of phrase dicts
            similarity_threshold: Ngưỡng để gộp
        
        Returns:
            Merged phrases
        """
        if len(phrases) <= 1:
            return phrases
        
        # Encode
        phrase_texts = [p['phrase'] for p in phrases]
        embeddings = self.model.encode(phrase_texts)
        
        # Tính similarity matrix
        sim_matrix = cosine_similarity(embeddings)
        
        # Gộp phrases
        merged = []
        used = set()
        
        for i in range(len(phrases)):
            if i in used:
                continue
            
            # Tìm phrases tương tự
            similar_indices = np.where(sim_matrix[i] > similarity_threshold)[0]
            similar_indices = [idx for idx in similar_indices if idx not in used and idx != i]
            
            if similar_indices:
                # Gộp: lấy phrase có score cao nhất
                group = [phrases[i]] + [phrases[idx] for idx in similar_indices]
                best_phrase = max(group, key=lambda x: x['score'])
                
                # Đánh dấu variants
                best_phrase['variants'] = [p['phrase'] for p in group if p != best_phrase]
                merged.append(best_phrase)
                
                used.add(i)
                used.update(similar_indices)
            else:
                merged.append(phrases[i])
                used.add(i)
        
        return merged
    
    def refine_cluster_phrases(
        self,
        cluster_phrases: Dict[int, List[Dict]]
    ) -> Dict[int, List[Dict]]:
        """
        Refine phrases cho tất cả clusters
        
        Args:
            cluster_phrases: Dict từ extract_phrases_per_cluster
        
        Returns:
            Refined cluster phrases
        """
        refined = {}
        
        for cluster_id, phrases in cluster_phrases.items():
            # Bước 1: Lọc generic
            filtered = self.filter_generic_phrases(phrases)
            
            # Bước 2: Gộp similar
            merged = self.merge_similar_phrases(filtered)
            
            refined[cluster_id] = merged
        
        return refined
```

---

### 🟢 BƯỚC 6: LLM SINH CÂU CÓ KIỂM SOÁT

#### ❌ Hiện tại: LLM tự do sinh câu

#### ✅ Sửa: LLM chỉ dùng từ vựng cho trước

**Sửa trong `rag_system.py`**:

```python
def generate_controlled_sentence(
    self,
    word: str,
    allowed_vocabulary: List[str],
    context: str = ""
) -> str:
    """
    Sinh câu với từ vựng được kiểm soát
    
    Args:
        word: Từ cần sinh câu
        allowed_vocabulary: Danh sách từ vựng được phép dùng
        context: Ngữ cảnh từ cluster
    
    Returns:
        Generated sentence
    """
    prompt = f"""
Generate an example sentence using the word "{word}".

STRICT RULES:
1. You MUST use ONLY words from this vocabulary list: {', '.join(allowed_vocabulary)}
2. DO NOT use any words outside this list
3. The sentence must be natural and grammatically correct
4. The sentence should demonstrate the meaning of "{word}"

Context: {context}

Example sentence:
"""
    
    response = self.llm_client.chat.completions.create(
        model=self.llm_model,
        messages=[
            {"role": "system", "content": "You are a vocabulary teacher. Generate sentences using ONLY the provided vocabulary."},
            {"role": "user", "content": prompt}
        ],
        temperature=0.7,
        max_tokens=100
    )
    
    sentence = response.choices[0].message.content.strip()
    
    # Verify: Kiểm tra sentence chỉ dùng allowed vocabulary
    if not self._verify_vocabulary(sentence, allowed_vocabulary):
        # Fallback: Dùng template
        sentence = self._generate_template_sentence(word, context)
    
    return sentence


def _verify_vocabulary(self, sentence: str, allowed_vocab: List[str]) -> bool:
    """
    Kiểm tra sentence chỉ dùng từ trong allowed_vocab
    """
    words = sentence.lower().split()
    allowed_set = set(v.lower() for v in allowed_vocab)
    
    for word in words:
        # Remove punctuation
        clean_word = word.strip('.,!?;:')
        if clean_word and clean_word not in allowed_set:
            # Allow common function words
            if clean_word not in ['the', 'a', 'an', 'is', 'are', 'was', 'were', 'to', 'of', 'in', 'on', 'at']:
                return False
    
    return True


def _generate_template_sentence(self, word: str, context: str) -> str:
    """
    Fallback: Sinh câu bằng template
    """
    templates = [
        f"The {word} is important in this context.",
        f"We can see {word} in the example.",
        f"This demonstrates {word} clearly."
    ]
    
    return templates[0]
```

---

### 🟢 BƯỚC 7: ĐIỀU KIỆN CHẠY PIPELINE

#### ✅ Thêm validation logic:

**Thêm vào `main.py`**:

```python
def should_run_clustering(text_units: List[Dict]) -> bool:
    """
    Kiểm tra có nên chạy clustering không
    
    Args:
        text_units: Sentences/chunks từ splitting
    
    Returns:
        True nếu đủ điều kiện
    """
    MIN_SENTENCES = 10
    MIN_WORDS_PER_SENTENCE = 5
    
    # Kiểm tra số lượng
    if len(text_units) < MIN_SENTENCES:
        return False
    
    # Kiểm tra chất lượng
    valid_units = [
        u for u in text_units
        if u['word_count'] >= MIN_WORDS_PER_SENTENCE
    ]
    
    return len(valid_units) >= MIN_SENTENCES


@app.post("/api/upload-document-v2")
async def upload_document_v2(
    file: UploadFile = File(...),
    max_words: int = Form(50),
    enable_clustering: bool = Form(True)
):
    """
    Upload với pipeline hoàn chỉnh
    """
    # Extract text
    text = extract_text_from_file(file_path)
    
    # BƯỚC 1: Sentence splitting
    text_units = smart_split(text, strategy='sentence')
    
    # BƯỚC 2: Kiểm tra điều kiện
    can_cluster = should_run_clustering(text_units)
    
    if can_cluster and enable_clustering:
        # BƯỚC 3: Cluster sentences
        clustering_result = cluster_sentences_kmeans(text_units)
        
        # BƯỚC 4: Extract phrases per cluster
        cluster_phrases = extract_phrases_per_cluster(clustering_result)
        
        # BƯỚC 5: Refine với embedding
        refiner = PhraseRefiner()
        refined_phrases = refiner.refine_cluster_phrases(cluster_phrases)
        
        # BƯỚC 6: LLM sinh câu có kiểm soát
        all_vocabulary = []
        for phrases in refined_phrases.values():
            all_vocabulary.extend([p['phrase'] for p in phrases])
        
        flashcards = []
        for word in all_vocabulary[:max_words]:
            sentence = rag_system.generate_controlled_sentence(
                word=word,
                allowed_vocabulary=all_vocabulary,
                context=""
            )
            flashcards.append({
                'word': word,
                'sentence': sentence
            })
        
        return {
            'success': True,
            'clustering_enabled': True,
            'n_clusters': clustering_result['n_clusters'],
            'vocabulary': all_vocabulary,
            'flashcards': flashcards
        }
    else:
        # Fallback: Pipeline cũ
        return await upload_document(file, max_words)
```

---

## ✅ CHECKLIST HOÀN THÀNH

### Bổ sung code:

- [ ] `sentence_splitter.py` - Sentence/chunk splitting
- [ ] `sentence_clustering.py` - K-means cluster sentences
- [ ] `phrase_refinement.py` - Embedding refinement
- [ ] Sửa `rag_system.py` - LLM có kiểm soát
- [ ] Sửa `main.py` - Điều kiện chạy pipeline
- [ ] Sửa `ensemble_extractor.py` - Tích hợp sentence splitting

### Testing:

- [ ] Test sentence splitting
- [ ] Test sentence clustering
- [ ] Test phrase extraction per cluster
- [ ] Test embedding refinement
- [ ] Test LLM controlled generation
- [ ] Test full pipeline

### Documentation:

- [ ] Viết README cho từng module
- [ ] Cập nhật COMPLETE_PIPELINE_PROPOSAL.md
- [ ] Viết thesis documentation

---

## 🎯 KẾT QUẢ MONG ĐỢI

### Trước khi bổ sung:
- ❌ Cluster words (sai đối tượng)
- ❌ Phrases rời rạc
- ❌ LLM tự do
- ❌ Không kiểm tra điều kiện

### Sau khi bổ sung:
- ✅ Cluster sentences (đúng đối tượng)
- ✅ Phrases theo cluster (có ngữ cảnh)
- ✅ Embedding refine (lọc + gộp)
- ✅ LLM có kiểm soát (chỉ dùng từ cho phép)
- ✅ Có điều kiện chạy (không chạy mù)

---

## 📚 GIẢI THÍCH CHO KHÓA LUẬN

### Tại sao cluster sentences thay vì words?

> **Sai**: Cluster words → Không có ngữ cảnh, không biết chủ đề
> 
> **Đúng**: Cluster sentences → Mỗi cluster = 1 chủ đề, phrases có ngữ cảnh
>
> Ví dụ:
> - Cluster 1: Medical diagnosis (phrases: "medical image", "diagnosis accuracy")
> - Cluster 2: Treatment planning (phrases: "treatment planning", "patient care")

### Tại sao cần embedding refinement?

> Embedding không thay thế TF-IDF, mà bổ sung:
>
> 1. **TF-IDF**: Trích xuất phrases dựa trên tần suất
> 2. **Embedding**: Lọc phrases chung chung, gộp phrases tương tự
>
> → Kết hợp cả 2 cho kết quả tốt nhất

### Tại sao LLM cần kiểm soát?

> **Không kiểm soát**: LLM sinh câu với từ bất kỳ → Không đồng nhất với vocabulary
>
> **Có kiểm soát**: LLM chỉ dùng từ trong danh sách → Đồng nhất, có thể học được

---

**Bước tiếp theo**: Bạn muốn tôi implement từng bước không? 🚀
