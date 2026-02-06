# 📋 BÁO CÁO AUDIT PIPELINE XỬ LÝ TÀI LIỆU

**Ngày audit**: 2026-02-03  
**Auditor**: Kiro AI Assistant  
**Hệ thống**: Visual Language Tutor - Python API

---

## 🎯 TỔNG QUAN

Audit hệ thống theo checklist pipeline chuẩn:
- OCR → Text Preprocessing → TF-IDF → Elbow → K-means → Keyword Extraction → Embedding

---

## ✅ KẾT QUẢ TỔNG THỂ

| Tiêu chí | Trạng thái | Ghi chú |
|----------|------------|---------|
| **OCR trước NLP** | ✅ ĐÚNG | OCR trong upload endpoint |
| **TF-IDF có n-gram** | ✅ ĐÚNG | ngram_range=(1,3) |
| **Elbow chọn K** | ✅ ĐÚNG | Có implement đầy đủ |
| **K-means trên TF-IDF** | ✅ ĐÚNG | Sử dụng TF-IDF matrix |
| **Giải thích cluster** | ⚠️ THIẾU | Chưa có bước này |
| **Embedding cho search** | ⚠️ THIẾU | Chưa implement |
| **Không trộn vai trò** | ✅ ĐÚNG | Logic rõ ràng |

**Điểm tổng**: 5/7 ✅ | 2/7 ⚠️

---

## 📊 CHI TIẾT TỪNG BƯỚC

### 🔷 1. Giai đoạn INPUT & OCR

#### ✔️ Dữ liệu đầu vào

**File**: `python-api/main.py` (line 550+)

```python
@app.post("/api/upload-document")
async def upload_document(
    file: UploadFile = File(...),
    max_words: int = Form(20),
    language: str = Form("en")
):
```

**✅ ĐÚNG:**
- Upload PDF scan / image / text
- Lưu metadata (filename, timestamp)
- Tạo document_id unique

#### ✔️ OCR

**File**: `python-api/main.py` (line 520+)

```python
def extract_text_from_file(file_path: str) -> str:
    """Extract text from uploaded file"""
    file_ext = Path(file_path).suffix.lower()
    
    if file_ext == '.txt':
        with open(file_path, 'r', encoding='utf-8') as f:
            return f.read()
    
    elif file_ext == '.pdf' and PDF_SUPPORT:
        text = ""
        with open(file_path, 'rb') as f:
            pdf_reader = PyPDF2.PdfReader(f)
            for page in pdf_reader.pages:
                text += page.extract_text() + "\n"
        return text
    
    elif file_ext in ['.docx', '.doc'] and PDF_SUPPORT:
        doc = docx.Document(file_path)
        text = "\n".join([paragraph.text for paragraph in doc.paragraphs])
        return text
```

**✅ ĐÚNG:**
- Dùng PyPDF2 cho PDF
- Dùng python-docx cho DOCX
- OCR chạy TRƯỚC tất cả NLP
- Output là raw text

**📌 Lưu ý:**
- PyPDF2 không phải OCR thực sự (chỉ extract text layer)
- Nếu cần OCR cho ảnh scan → cần thêm Tesseract/PaddleOCR

---

### 🔷 2. Text Preprocessing

**File**: `python-api/ensemble_extractor.py` (line 60+)

```python
def tokenize_text(text: str, remove_stopwords: bool = True) -> List[str]:
    """Tokenize và làm sạch text"""
    # Lowercase và tokenize
    tokens = word_tokenize(text.lower())
    
    # Remove punctuation và short words
    tokens = [t for t in tokens if t.isalnum() and len(t) > 2]
    
    # Remove stopwords
    if remove_stopwords:
        tokens = [t for t in tokens if t not in ENGLISH_STOPWORDS]
    
    return tokens
```

**✅ ĐÚNG:**
- ✅ Lowercase
- ✅ Remove punctuation
- ✅ Remove stopwords (English)
- ✅ Remove short tokens (< 3 chars)

**⚠️ THIẾU:**
- ❌ Lemmatization (chưa thấy sử dụng)
- ❌ Remove numbers (có thể cần)

**📌 Đánh giá:**
- Preprocessing cơ bản đã có
- Nên thêm lemmatization để chuẩn hóa tốt hơn

---

### 🔷 3. TF-IDF Feature Extraction

**File**: `python-api/ensemble_extractor.py` (line 130+)

```python
def calculate_tfidf(documents: List[str]) -> Dict[str, float]:
    """Tính TF-IDF scores"""
    vectorizer = TfidfVectorizer(
        max_features=1000,
        ngram_range=(1, 3),      # ✅ ĐÚNG: unigram + bigram + trigram
        stop_words='english'     # ✅ ĐÚNG: loại stopwords
    )
    
    tfidf_matrix = vectorizer.fit_transform(documents)
    feature_names = vectorizer.get_feature_names_out()
```

**✅ ĐÚNG:**
- ✅ Dùng TF-IDF (không phải CountVectorizer)
- ✅ Có n-gram: (1, 3) - unigram, bigram, trigram
- ✅ stop_words='english'
- ✅ max_features=1000 (giới hạn features)

**⚠️ CẦN CẢI THIỆN:**
- ❌ Thiếu `min_df` (nên có min_df=2)
- ❌ Thiếu `max_df` (nên có max_df=0.8)
- ❌ Thiếu `norm='l2'` (quan trọng cho K-means)

**📌 Đề xuất:**
```python
vectorizer = TfidfVectorizer(
    ngram_range=(1, 2),      # Giảm xuống (1,2) cho hiệu quả
    min_df=2,                # ✅ THÊM: loại cụm quá hiếm
    max_df=0.8,              # ✅ THÊM: loại cụm quá phổ biến
    stop_words='english',
    norm='l2',               # ✅ THÊM: chuẩn hóa cho K-means
    max_features=1000
)
```

---

### 🔷 4. Elbow Method

**File**: `python-api/kmeans_clustering.py` (line 15+)

```python
def calculate_elbow(tfidf_matrix: np.ndarray, max_k: int = 10) -> Tuple[int, List[float], List[int]]:
    """
    Elbow Method để tìm số cluster tối ưu
    """
    print(f"[Elbow] Testing K from 2 to {max_k}...")
    
    inertias = []
    k_values = list(range(2, min(max_k + 1, tfidf_matrix.shape[0])))
    
    for k in k_values:
        kmeans = KMeans(n_clusters=k, random_state=42, n_init=10)
        kmeans.fit(tfidf_matrix)
        inertias.append(kmeans.inertia_)
        print(f"[Elbow] K={k}, Inertia={kmeans.inertia_:.2f}")
    
    # Tìm elbow point
    if len(inertias) >= 3:
        changes = []
        for i in range(1, len(inertias)):
            change = abs(inertias[i] - inertias[i-1])
            changes.append(change)
        
        max_change_idx = changes.index(max(changes))
        optimal_k = k_values[max_change_idx + 1]
```

**✅ ĐÚNG:**
- ✅ Chạy K-means với nhiều K (2-10)
- ✅ Tính WCSS/inertia cho mỗi K
- ✅ Vẽ đồ thị Elbow (có function `plot_elbow_curve`)
- ✅ Chọn K tại điểm giảm mạnh nhất
- ✅ Có ghi chú Elbow là heuristic

**📌 Đánh giá:**
- Implementation hoàn hảo ✅
- Có visualization
- Logic chọn K hợp lý

---

### 🔷 5. K-means Clustering

**File**: `python-api/kmeans_clustering.py` (line 90+)

```python
def cluster_vocabulary_kmeans(
    vocabulary_list: List[Dict],
    text: str,
    n_clusters: int = None,
    use_elbow: bool = True,
    max_k: int = 10,
    document_id: str = None
) -> Dict:
    """Cluster từ vựng sử dụng K-Means"""
    
    # Tạo TF-IDF vectors cho từ vựng
    words = [v['word'] for v in vocabulary_list]
    
    # Tạo documents cho mỗi từ
    from nltk.tokenize import sent_tokenize
    sentences = sent_tokenize(text)
    
    word_documents = []
    for word in words:
        word_sentences = [s for s in sentences if word.lower() in s.lower()]
        if word_sentences:
            word_documents.append(' '.join(word_sentences[:3]))
        else:
            word_documents.append(word)
    
    # Tạo TF-IDF matrix
    vectorizer = TfidfVectorizer(max_features=100, stop_words='english')
    tfidf_matrix = vectorizer.fit_transform(word_documents)
    
    # Xác định số cluster
    if n_clusters is None and use_elbow:
        optimal_k, inertias, k_values = calculate_elbow(tfidf_matrix.toarray(), max_k)
        n_clusters = optimal_k
    
    # Chạy K-means
    kmeans = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
    cluster_labels = kmeans.fit_predict(tfidf_matrix)
```

**✅ ĐÚNG:**
- ✅ Dùng K-means (scikit-learn)
- ✅ Input là TF-IDF matrix
- ✅ K từ Elbow Method
- ✅ Mỗi document thuộc 1 cluster

**⚠️ VẤN ĐỀ:**
- ⚠️ Tạo TF-IDF matrix MỚI trong clustering (không dùng TF-IDF từ ensemble)
- ⚠️ Có thể gây inconsistency

**📌 Lưu ý:**
- Logic đúng nhưng có 2 TF-IDF riêng biệt:
  1. TF-IDF trong `ensemble_extractor` (cho scoring)
  2. TF-IDF trong `kmeans_clustering` (cho clustering)
- Nên thống nhất hoặc giải thích rõ

---

### 🔷 6. Giải thích & Đặt tên cluster

**File**: `python-api/kmeans_clustering.py` (line 150+)

```python
# Bước 4: Tổ chức kết quả theo cluster
clusters = {}
for idx, label in enumerate(cluster_labels):
    if label not in clusters:
        clusters[label] = []
    
    clusters[label].append({
        'word': vocabulary_list[idx]['word'],
        'score': vocabulary_list[idx]['score'],
        'cluster_id': int(label)
    })

# Sắp xếp từ trong mỗi cluster theo score
for label in clusters:
    clusters[label] = sorted(clusters[label], key=lambda x: x['score'], reverse=True)

# Chọn đại diện cho mỗi cluster
cluster_representatives = []
for label in sorted(clusters.keys()):
    representative = clusters[label][0]
    cluster_representatives.append({
        'cluster_id': int(label),
        'representative_word': representative['word'],
        'representative_score': representative['score'],
        'cluster_size': len(clusters[label]),
        'words': [w['word'] for w in clusters[label][:5]]  # Top 5 words
    })
```

**⚠️ THIẾU:**
- ❌ Không có bước trích keyword/phrase cho cluster
- ❌ Không có label/mô tả cluster
- ❌ Chỉ chọn representative word (từ có score cao nhất)

**✅ CÓ:**
- ✅ Tổ chức theo cluster
- ✅ Chọn top words trong cluster

**📌 Đề xuất:**
Cần thêm function:
```python
def extract_cluster_keywords(cluster_documents, top_n=5):
    """Trích top keywords cho cluster bằng TF-IDF"""
    vectorizer = TfidfVectorizer(ngram_range=(1,2), max_features=50)
    tfidf = vectorizer.fit_transform(cluster_documents)
    
    # Get top features
    avg_tfidf = tfidf.mean(axis=0).A1
    top_indices = avg_tfidf.argsort()[-top_n:][::-1]
    feature_names = vectorizer.get_feature_names_out()
    
    return [feature_names[i] for i in top_indices]
```

---

### 🔷 7. Embedding (CHẠY SONG SONG)

**Tìm kiếm trong code...**

**❌ KHÔNG TÌM THẤY:**
- Không có implementation Sentence-BERT
- Không có OpenAI Embedding
- Không có semantic search

**📌 Đánh giá:**
- Hệ thống CHƯA có embedding
- Đây là gap lớn trong pipeline

**📌 Đề xuất:**
Cần thêm:
```python
from sentence_transformers import SentenceTransformer

def create_embeddings(documents):
    """Create semantic embeddings"""
    model = SentenceTransformer('all-MiniLM-L6-v2')
    embeddings = model.encode(documents)
    return embeddings

def semantic_search(query, documents, embeddings, top_k=5):
    """Search using embeddings"""
    model = SentenceTransformer('all-MiniLM-L6-v2')
    query_embedding = model.encode([query])
    
    from sklearn.metrics.pairwise import cosine_similarity
    similarities = cosine_similarity(query_embedding, embeddings)[0]
    
    top_indices = similarities.argsort()[-top_k:][::-1]
    return [(documents[i], similarities[i]) for i in top_indices]
```

---

### 🔷 8. Ứng dụng cuối

**File**: `python-api/main.py`

**✅ CÓ:**
- ✅ Upload document endpoint
- ✅ Vocabulary extraction
- ✅ K-means clustering
- ✅ Response JSON với clusters

**❌ THIẾU:**
- ❌ Semantic search endpoint
- ❌ Document similarity
- ❌ Recommendation

---

## 🔍 KIỂM TRA LOGIC TỔNG THỂ

### ✅ Clustering ≠ Keyword Extraction

**ĐÚNG** ✅

- Clustering: `kmeans_clustering.py` - gom documents
- Keyword: `ensemble_extractor.py` - trích từ vựng
- Vai trò rõ ràng, không trộn lẫn

### ✅ TF-IDF ≠ Embedding

**ĐÚNG** ✅ (nhưng thiếu embedding)

- TF-IDF: Có implement đầy đủ
- Embedding: Chưa có
- Không trộn lẫn (vì chưa có embedding)

### ✅ Elbow ≠ Thuật toán tối ưu tuyệt đối

**ĐÚNG** ✅

- Có comment: "Elbow là heuristic"
- Có thể kết hợp domain knowledge

### ✅ Pipeline có thể giải thích

**ĐÚNG** ✅

- Code có comment rõ ràng
- Có documentation đầy đủ
- Logic dễ hiểu

---

## 🟢 CHECKLIST TỔNG KẾT NHANH

| Câu hỏi | Trả lời | Ghi chú |
|---------|---------|---------|
| **OCR trước NLP?** | ✅ CÓ | Extract text trước khi NLP |
| **TF-IDF có n-gram?** | ✅ CÓ | ngram_range=(1,3) |
| **Elbow chọn K?** | ✅ CÓ | Có đầy đủ |
| **K-means chạy trên TF-IDF?** | ✅ CÓ | Đúng input |
| **Có giải thích cluster?** | ⚠️ THIẾU | Chỉ có representative |
| **Embedding cho search?** | ❌ KHÔNG | Chưa implement |
| **Không trộn vai trò?** | ✅ CÓ | Logic rõ ràng |

**Kết quả**: 5/7 ✅

---

## 📝 ĐÁNH GIÁ TỔNG THỂ

### 🟢 Điểm mạnh

1. **Pipeline cơ bản đúng** ✅
   - OCR → Preprocessing → TF-IDF → Elbow → K-means
   - Thứ tự logic đúng

2. **TF-IDF implementation tốt** ✅
   - Có n-gram (1,3)
   - Có stopwords filtering
   - Code rõ ràng

3. **Elbow Method hoàn hảo** ✅
   - Logic đúng
   - Có visualization
   - Có documentation

4. **K-means đúng** ✅
   - Sử dụng TF-IDF matrix
   - Có Silhouette Score
   - Có cluster organization

5. **Documentation xuất sắc** ✅
   - Nhiều file MD chi tiết
   - Code có comment
   - Dễ hiểu

### 🟡 Điểm cần cải thiện

1. **TF-IDF configuration** ⚠️
   - Thiếu `min_df`, `max_df`
   - Thiếu `norm='l2'`
   - Nên cải thiện

2. **Preprocessing** ⚠️
   - Thiếu lemmatization
   - Có thể tốt hơn

3. **Cluster explanation** ⚠️
   - Chỉ có representative word
   - Chưa có top keywords/phrases
   - Chưa có label

### 🔴 Gap lớn

1. **Embedding HOÀN TOÀN THIẾU** ❌
   - Không có Sentence-BERT
   - Không có semantic search
   - Không có similarity
   - Đây là gap nghiêm trọng

2. **OCR thực sự** ⚠️
   - PyPDF2 không phải OCR
   - Cần Tesseract cho ảnh scan

---

## 🎯 ĐỀ XUẤT HÀNH ĐỘNG

### Ưu tiên CAO (Bắt buộc)

1. **Thêm Embedding** 🔴
   ```python
   # Cài đặt
   pip install sentence-transformers
   
   # Implement
   - create_embeddings()
   - semantic_search()
   - document_similarity()
   ```

2. **Cải thiện TF-IDF config** 🟡
   ```python
   TfidfVectorizer(
       ngram_range=(1, 2),
       min_df=2,           # THÊM
       max_df=0.8,         # THÊM
       norm='l2',          # THÊM
       stop_words='english'
   )
   ```

3. **Thêm Cluster Explanation** 🟡
   ```python
   def get_cluster_keywords(cluster_docs, top_n=5):
       # Extract top TF-IDF phrases
       pass
   ```

### Ưu tiên TRUNG (Nên có)

4. **Thêm Lemmatization** 🟡
   ```python
   from nltk.stem import WordNetLemmatizer
   lemmatizer = WordNetLemmatizer()
   tokens = [lemmatizer.lemmatize(t) for t in tokens]
   ```

5. **Thêm OCR thực sự** 🟡
   ```python
   import pytesseract
   # For image files
   text = pytesseract.image_to_string(image)
   ```

### Ưu tiên THẤP (Nice to have)

6. **Thống nhất TF-IDF** 🟢
   - Dùng chung 1 TF-IDF matrix
   - Tránh tạo 2 lần

7. **Thêm tests** 🟢
   - Unit tests cho từng function
   - Integration tests cho pipeline

---

## 📊 ĐIỂM SỐ CUỐI CÙNG

| Tiêu chí | Điểm | Tối đa |
|----------|------|--------|
| OCR & Input | 8 | 10 |
| Preprocessing | 7 | 10 |
| TF-IDF | 8 | 10 |
| Elbow Method | 10 | 10 |
| K-means | 9 | 10 |
| Cluster Explanation | 4 | 10 |
| Embedding | 0 | 10 |
| Documentation | 10 | 10 |

**TỔNG ĐIỂM**: **56/80** (70%)

**ĐÁNH GIÁ**: 🟡 **KHÁ** - Cần cải thiện

---

## ✅ KẾT LUẬN

### Hệ thống hiện tại:

✅ **Pipeline cơ bản ĐÚNG**  
✅ **TF-IDF + K-means hoạt động tốt**  
✅ **Elbow Method hoàn hảo**  
✅ **Documentation xuất sắc**  

⚠️ **Thiếu Embedding (gap lớn)**  
⚠️ **Thiếu Cluster Explanation**  
⚠️ **TF-IDF config cần cải thiện**  

### Khuyến nghị:

1. **THÊM EMBEDDING NGAY** - Đây là gap nghiêm trọng
2. Cải thiện TF-IDF configuration
3. Thêm cluster explanation
4. Thêm lemmatization

### Có thể bảo vệ được không?

**CÓ** ✅ - Nhưng cần giải thích:
- Tại sao chưa có embedding (future work)
- Tập trung vào TF-IDF + K-means
- Có roadmap để thêm embedding

---

**Người audit**: Kiro AI Assistant  
**Ngày**: 2026-02-03  
**Version**: 1.0  
**Status**: ✅ HOÀN THÀNH
