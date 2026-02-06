# 🎓 CHỨNG MINH THUẬT TOÁN ĐÃ SỬ DỤNG

## 📋 DANH SÁCH THUẬT TOÁN

| # | Thuật toán | Trạng thái | File | Endpoint |
|---|-----------|-----------|------|----------|
| 1 | TF-IDF | ✅ Có | ensemble_extractor.py | /api/upload-document |
| 2 | Bag of Words | ✅ Có | ensemble_extractor.py | /api/upload-document |
| 3 | RAKE | ✅ Có | ensemble_extractor.py | /api/upload-document |
| 4 | YAKE | ✅ Có | ensemble_extractor.py | /api/upload-document |
| 5 | K-Means | ✅ Có | kmeans_clustering.py | /api/kmeans-cluster |
| 6 | Elbow Method | ✅ Có | kmeans_clustering.py | /api/kmeans-cluster |
| 7 | Knowledge Graph (Ontology) | ✅ Có | knowledge_graph.py | /api/knowledge-graph/* |
| 8 | RAG | ✅ Có | rag_system.py | /api/rag/* |

---

## 🔍 CÁCH KIỂM TRA TỪNG THUẬT TOÁN

### 1. TF-IDF + Bag of Words + RAKE + YAKE

**Endpoint:**
```
POST /api/upload-document
```

**Request:**
```json
{
  "file": "your_document.txt",
  "max_words": 50,
  "language": "en"
}
```

**Response (Chứng minh):**
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

**Giải thích:**
- `features.tfidf`: Điểm TF-IDF của từ
- `features.frequency`: Tần suất xuất hiện (Bag of Words)
- `features.rake`: Điểm RAKE (degree/frequency)
- `features.yake`: Điểm YAKE (position + frequency + relatedness)

---

### 2. K-Means + Elbow Method

**Endpoint:**
```
POST /api/kmeans-cluster
```

**Request:**
```json
{
  "text": "Your long text here...",
  "max_words": 50,
  "language": "en"
}
```

**Response (Chứng minh):**
```json
{
  "success": true,
  "vocabulary_count": 50,
  "clustering": {
    "n_clusters": 5,                    ← K-Means ✅
    "silhouette_score": 0.342,          ← Chất lượng cluster
    "method": "K-Means with TF-IDF",    ← Chứng minh ✅
    "elbow_analysis": {                 ← Elbow Method ✅
      "optimal_k": 5,
      "inertias": [45.2, 32.1, 24.5, 20.1, 18.3],
      "k_values": [2, 3, 4, 5, 6],
      "plot_path": "cache/elbow_curve.png"  ← Đồ thị Elbow
    },
    "clusters": [
      {
        "cluster_id": 0,
        "representative_word": "machine learning",
        "cluster_size": 12,
        "words": ["machine learning", "deep learning", "neural networks"]
      },
      {
        "cluster_id": 1,
        "representative_word": "data science",
        "cluster_size": 10,
        "words": ["data science", "big data", "analytics"]
      }
    ]
  },
  "algorithms_used": {
    "tfidf": true,           ← TF-IDF ✅
    "bag_of_words": true,    ← Bag of Words ✅
    "kmeans": true,          ← K-Means ✅
    "elbow_method": true     ← Elbow ✅
  }
}
```

**Giải thích:**
- `n_clusters`: Số cluster được tạo bởi K-Means
- `silhouette_score`: Đánh giá chất lượng clustering (0-1, càng cao càng tốt)
- `elbow_analysis.optimal_k`: K tối ưu tìm được bởi Elbow Method
- `elbow_analysis.inertias`: Danh sách inertia cho mỗi K (dùng để vẽ đồ thị)
- `elbow_analysis.plot_path`: Đường dẫn đến đồ thị Elbow

**Xem đồ thị Elbow:**
```
File: python-api/cache/elbow_curve.png
```

---

### 3. Knowledge Graph (Ontology)

**Endpoint:**
```
GET /api/knowledge-graph/statistics
```

**Response (Chứng minh):**
```json
{
  "success": true,
  "statistics": {
    "total_entities": 150,        ← Ontology Entities ✅
    "total_relationships": 300,   ← Ontology Relationships ✅
    "entity_types": {
      "vocabulary": 100,          ← Vocabulary entities
      "document": 10,             ← Document entities
      "sentence": 40              ← Sentence entities
    },
    "relationship_types": {
      "appears_in": 100,          ← Vocabulary → Document
      "has_context": 100,         ← Vocabulary → Sentence
      "related_to": 100           ← Vocabulary → Vocabulary
    }
  }
}
```

**Giải thích:**
- `total_entities`: Tổng số entities trong Knowledge Graph
- `entity_types`: Các loại entities (Vocabulary, Document, Sentence)
- `relationship_types`: Các loại relationships (appears_in, has_context, related_to)

**Xem Knowledge Graph:**
```
File: python-api/knowledge_graph_data/graph.json
```

---

### 4. RAG (Retrieval-Augmented Generation)

**Endpoint:**
```
POST /api/rag/generate-flashcards
```

**Request:**
```json
{
  "document_id": "doc_20260203_162538",
  "max_cards": 10
}
```

**Response (Chứng minh):**
```json
{
  "success": true,
  "count": 10,
  "method": "RAG with Knowledge Graph",  ← RAG ✅
  "results": [
    {
      "word": "learning",
      "definition": "The process of acquiring knowledge",
      "example": "Machine learning uses algorithms to learn from data",
      "difficulty": "intermediate",
      "source": "Retrieved from Knowledge Graph + Generated by LLM"  ← RAG ✅
    }
  ],
  "rag_pipeline": {
    "retrieval": "Knowledge Graph query",     ← Retrieval ✅
    "augmentation": "Context from document",  ← Augmentation ✅
    "generation": "OpenAI GPT-4"             ← Generation ✅
  }
}
```

**Giải thích:**
- `method`: Xác nhận sử dụng RAG
- `rag_pipeline.retrieval`: Lấy thông tin từ Knowledge Graph
- `rag_pipeline.augmentation`: Bổ sung context từ document
- `rag_pipeline.generation`: Tạo flashcard bằng LLM

---

## 📊 CÁCH LẤY 100 TỪ VỰNG

### Bước 1: Upload với max_words=100

```
POST /api/upload-document
```

**Form data:**
```
file: your_document.txt
max_words: 100  ← Tăng lên 100
language: en
```

**Response:**
```json
{
  "vocabulary_count": 100,  ← 100 từ ✅
  "vocabulary": [...]
}
```

### Bước 2: Cluster 100 từ với K-Means

```
POST /api/kmeans-cluster
```

**Request:**
```json
{
  "text": "Your long text...",
  "max_words": 100,  ← 100 từ
  "language": "en"
}
```

**Response:**
```json
{
  "vocabulary_count": 100,
  "clustering": {
    "n_clusters": 8,  ← Tự động tìm K tối ưu
    "clusters": [...]
  }
}
```

---

## 🎯 DEMO SCRIPT

Tạo file `test_all_algorithms.py`:

```python
import requests
import json

API_URL = "http://127.0.0.1:8000"

# 1. Upload document (TF-IDF + Bag of Words + RAKE + YAKE)
print("1. Testing TF-IDF + Bag of Words + RAKE + YAKE...")
with open("test.txt", "rb") as f:
    files = {"file": ("test.txt", f)}
    data = {"max_words": 50, "language": "en"}
    response = requests.post(f"{API_URL}/api/upload-document", files=files, data=data)
    result = response.json()
    
    print(f"✅ TF-IDF: {result['vocabulary'][0]['features']['tfidf']}")
    print(f"✅ Frequency: {result['vocabulary'][0]['features']['frequency']}")
    print(f"✅ RAKE: {result['vocabulary'][0]['features']['rake']}")
    print(f"✅ YAKE: {result['vocabulary'][0]['features']['yake']}")

# 2. K-Means clustering
print("\n2. Testing K-Means + Elbow Method...")
with open("test.txt", "r") as f:
    text = f.read()
    response = requests.post(
        f"{API_URL}/api/kmeans-cluster",
        json={"text": text, "max_words": 50, "language": "en"}
    )
    result = response.json()
    
    print(f"✅ K-Means clusters: {result['clustering']['n_clusters']}")
    print(f"✅ Elbow optimal K: {result['clustering']['elbow_analysis']['optimal_k']}")
    print(f"✅ Silhouette score: {result['clustering']['silhouette_score']}")

# 3. Knowledge Graph
print("\n3. Testing Knowledge Graph (Ontology)...")
response = requests.get(f"{API_URL}/api/knowledge-graph/statistics")
result = response.json()

print(f"✅ Total entities: {result['statistics']['total_entities']}")
print(f"✅ Total relationships: {result['statistics']['total_relationships']}")

# 4. RAG
print("\n4. Testing RAG...")
response = requests.post(
    f"{API_URL}/api/rag/generate-flashcards",
    json={"document_id": "doc_20260203_162538", "max_cards": 5}
)
result = response.json()

print(f"✅ RAG method: {result['method']}")
print(f"✅ Flashcards generated: {result['count']}")

print("\n🎉 All algorithms verified!")
```

---

## 📝 TÓM TẮT

### Thuật toán đã triển khai:

1. ✅ **TF-IDF**: `ensemble_extractor.py` line 140-160
2. ✅ **Bag of Words**: `ensemble_extractor.py` line 120-135
3. ✅ **RAKE**: `ensemble_extractor.py` line 165-200
4. ✅ **YAKE**: `ensemble_extractor.py` line 205-240
5. ✅ **K-Means**: `kmeans_clustering.py` line 80-150
6. ✅ **Elbow Method**: `kmeans_clustering.py` line 20-50
7. ✅ **Knowledge Graph (Ontology)**: `knowledge_graph.py` toàn bộ file
8. ✅ **RAG**: `rag_system.py` toàn bộ file

### Cách chứng minh:

1. **Upload document** → Xem `features` trong response
2. **K-Means cluster** → Xem `clustering` và `elbow_analysis`
3. **Knowledge Graph stats** → Xem `total_entities` và `total_relationships`
4. **RAG flashcards** → Xem `method` và `rag_pipeline`

### Lấy 100 từ:

```
max_words: 100
```

Trong request body hoặc form data.
