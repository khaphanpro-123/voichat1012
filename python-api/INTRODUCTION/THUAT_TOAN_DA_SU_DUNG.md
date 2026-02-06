# 📊 THUẬT TOÁN ĐÃ SỬ DỤNG TRONG HỆ THỐNG

## ✅ ĐÃ CÓ (Đang hoạt động)

### 1. TF-IDF (Term Frequency-Inverse Document Frequency)
**File:** `ensemble_extractor.py`
**Dòng:** ~140-160

```python
def calculate_tfidf(documents: List[str]) -> Dict[str, float]:
    vectorizer = TfidfVectorizer(
        max_features=1000,
        ngram_range=(1, 3),
        stop_words='english'
    )
    tfidf_matrix = vectorizer.fit_transform(documents)
    feature_names = vectorizer.get_feature_names_out()
    scores = tfidf_matrix[0].toarray()[0]
```

**Chứng minh:**
- Response có `features.tfidf` score
- Ví dụ: `"tfidf": 0.85`

---

### 2. Bag of Words (Mô hình túi từ)
**File:** `ensemble_extractor.py`
**Dòng:** ~120-135

```python
def calculate_frequency(tokens: List[str]) -> Dict[str, float]:
    counter = Counter(tokens)
    total = len(tokens)
    freq_scores = {}
    for word, count in counter.items():
        freq_scores[word] = count / total
```

**Chứng minh:**
- Response có `features.frequency` score
- Ví dụ: `"frequency": 0.067`

---

### 3. RAKE (Rapid Automatic Keyword Extraction)
**File:** `ensemble_extractor.py`
**Dòng:** ~165-200

```python
def calculate_rake(text: str) -> Dict[str, float]:
    # Extract candidate phrases
    # Calculate word scores
    # RAKE score = degree(word) / frequency(word)
    rake_scores[word] = word_degree[word] / word_freq[word]
```

**Chứng minh:**
- Response có `features.rake` score
- Ví dụ: `"rake": 6.33`

---

### 4. YAKE (Yet Another Keyword Extractor)
**File:** `ensemble_extractor.py`
**Dòng:** ~205-240

```python
def calculate_yake(text: str) -> Dict[str, float]:
    # Position score
    # Frequency score
    # Relatedness
    yake_score = (relatedness * position_score) / (1 + freq_score)
```

**Chứng minh:**
- Response có `features.yake` score
- Ví dụ: `"yake": 14.96`

---

### 5. Knowledge Graph (Ontology)
**File:** `knowledge_graph.py`
**Dòng:** Toàn bộ file

```python
class Entity:
    entity_id: str
    entity_type: str  # 'vocabulary', 'document', 'sentence'
    properties: Dict

class Relationship:
    source_id: str
    target_id: str
    relationship_type: str  # 'appears_in', 'has_context', 'related_to'
```

**Chứng minh:**
- File `knowledge_graph_data/` chứa graph
- Endpoint `/api/knowledge-graph/statistics` trả về:
  ```json
  {
    "total_entities": 150,
    "total_relationships": 300,
    "entity_types": {
      "vocabulary": 100,
      "document": 10,
      "sentence": 40
    }
  }
  ```

---

### 6. RAG (Retrieval-Augmented Generation)
**File:** `rag_system.py`
**Dòng:** Toàn bộ file

```python
class RAGSystem:
    def __init__(self, knowledge_graph, llm_api_key, llm_model):
        self.knowledge_graph = knowledge_graph
        self.llm = OpenAI(api_key=llm_api_key)
    
    def generate_flashcards(self, document_id, max_cards):
        # 1. Retrieve từ Knowledge Graph
        vocab_terms = self.knowledge_graph.query_vocabulary_by_document(document_id)
        
        # 2. Augment với context
        context = self._build_context(vocab_terms)
        
        # 3. Generate với LLM
        response = self.llm.chat.completions.create(
            model=self.llm_model,
            messages=[{"role": "user", "content": prompt}]
        )
```

**Chứng minh:**
- Endpoint `/api/rag/generate-flashcards` hoạt động
- Response có `"method": "RAG with Knowledge Graph"`

---

## ❌ CHƯA CÓ (Cần bổ sung)

### 1. K-Means Clustering
**Trạng thái:** CHƯA TRIỂN KHAI

**Cần làm:**
- Cluster từ vựng thành nhóm
- Sử dụng TF-IDF vectors
- Chọn đại diện từ mỗi cluster

### 2. Elbow Method
**Trạng thái:** CHƯA TRIỂN KHAI

**Cần làm:**
- Tìm số cluster tối ưu
- Vẽ đồ thị Elbow
- Tự động chọn K

---

## 📈 CÁCH KIỂM TRA

### 1. Upload file và xem Response

```bash
POST /api/upload-document
```

**Response sẽ có:**
```json
{
  "vocabulary": [
    {
      "word": "learning",
      "finalScore": 1.013,
      "features": {
        "tfidf": 0.245,      ← TF-IDF ✅
        "frequency": 0.067,  ← Bag of Words ✅
        "rake": 6.33,        ← RAKE ✅
        "yake": 14.96        ← YAKE ✅
      }
    }
  ],
  "stats": {
    "method": "ensemble(freq+tfidf+rake+yake)"  ← Chứng minh ✅
  }
}
```

### 2. Kiểm tra Knowledge Graph

```bash
GET /api/knowledge-graph/statistics
```

**Response:**
```json
{
  "total_entities": 150,        ← Ontology ✅
  "total_relationships": 300,
  "entity_types": {
    "vocabulary": 100,
    "document": 10,
    "sentence": 40
  }
}
```

### 3. Kiểm tra RAG

```bash
POST /api/rag/generate-flashcards
```

**Response:**
```json
{
  "success": true,
  "method": "RAG with Knowledge Graph",  ← RAG ✅
  "results": [...]
}
```

---

## 🎯 TÓM TẮT

| Thuật toán | Trạng thái | File | Chứng minh |
|-----------|-----------|------|-----------|
| TF-IDF | ✅ Có | ensemble_extractor.py | `features.tfidf` |
| Bag of Words | ✅ Có | ensemble_extractor.py | `features.frequency` |
| RAKE | ✅ Có | ensemble_extractor.py | `features.rake` |
| YAKE | ✅ Có | ensemble_extractor.py | `features.yake` |
| Knowledge Graph (Ontology) | ✅ Có | knowledge_graph.py | `/api/knowledge-graph/statistics` |
| RAG | ✅ Có | rag_system.py | `/api/rag/generate-flashcards` |
| K-Means | ❌ Chưa | - | - |
| Elbow Method | ❌ Chưa | - | - |

---

## 📝 CÁCH TĂNG SỐ TỪ LÊN 100

Hiện tại giới hạn `max_words=100`. Để lấy 100 từ:

```bash
POST /api/upload-document
{
  "max_words": 100,  ← Tăng lên 100
  "language": "en"
}
```

**Lưu ý:** Với 100 từ, xử lý sẽ chậm hơn (~10-15 giây)
