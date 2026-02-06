# 📚 HƯỚNG DẪN LẤY 100 TỪ VỰNG VÀ CHỨNG MINH THUẬT TOÁN

## 🎯 MỤC TIÊU

1. Trích xuất **100 từ vựng** từ tài liệu
2. Chứng minh đã sử dụng các thuật toán:
   - ✅ TF-IDF
   - ✅ Bag of Words (mô hình túi từ)
   - ✅ K-Means
   - ✅ Elbow Method
   - ✅ Knowledge Graph (Ontology)
   - ✅ RAG

---

## 🚀 BƯỚC 1: UPLOAD TÀI LIỆU (100 TỪ)

### Swagger UI

1. Mở http://127.0.0.1:8000/docs
2. Tìm **POST /api/upload-document**
3. Click **"Try it out"**
4. Chọn file
5. Điền:
   ```
   max_words: 100  ← Quan trọng!
   language: en
   ```
6. Click **"Execute"**

### Response (Chứng minh TF-IDF + Bag of Words + RAKE + YAKE)

```json
{
  "vocabulary_count": 100,  ← 100 từ ✅
  "vocabulary": [
    {
      "word": "learning",
      "finalScore": 1.013,
      "features": {
        "tfidf": 0.245,      ← TF-IDF ✅
        "frequency": 0.067,  ← Bag of Words ✅
        "rake": 6.33,        ← RAKE ✅
        "yake": 14.96        ← YAKE ✅
      },
      "contextSentence": "Machine <b>learning</b> algorithms..."
    },
    ... (99 từ nữa)
  ],
  "stats": {
    "method": "ensemble(freq+tfidf+rake+yake)"  ← Chứng minh ✅
  }
}
```

**Lưu document_id:**
```json
{
  "document_id": "doc_20260203_162538"  ← Copy ID này
}
```

---

## 🔬 BƯỚC 2: K-MEANS CLUSTERING

### Swagger UI

1. Tìm **POST /api/kmeans-cluster**
2. Click **"Try it out"**
3. Request body:
   ```json
   {
     "text": "Paste toàn bộ nội dung tài liệu vào đây...",
     "max_words": 100,
     "language": "en"
   }
   ```
4. Click **"Execute"**

### Response (Chứng minh K-Means + Elbow)

```json
{
  "success": true,
  "vocabulary_count": 100,
  "clustering": {
    "n_clusters": 8,                    ← K-Means ✅
    "silhouette_score": 0.342,
    "method": "K-Means with TF-IDF",    ← Chứng minh ✅
    
    "elbow_analysis": {                 ← Elbow Method ✅
      "optimal_k": 8,                   ← K tối ưu
      "inertias": [120.5, 85.3, 62.1, 48.7, 40.2, 35.8, 32.1, 30.5],
      "k_values": [2, 3, 4, 5, 6, 7, 8, 9],
      "plot_path": "cache/elbow_curve.png"  ← Đồ thị Elbow
    },
    
    "clusters": [
      {
        "cluster_id": 0,
        "representative_word": "machine learning",
        "cluster_size": 15,
        "words": ["machine learning", "deep learning", "neural networks", "algorithms", "models"]
      },
      {
        "cluster_id": 1,
        "representative_word": "data science",
        "cluster_size": 12,
        "words": ["data science", "big data", "analytics", "statistics", "visualization"]
      },
      ... (6 clusters nữa)
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

**Xem đồ thị Elbow:**
```
File: python-api/cache/elbow_curve.png
```

Đồ thị sẽ hiển thị:
- Trục X: Số clusters (K)
- Trục Y: Inertia (within-cluster sum of squares)
- Đường đỏ: K tối ưu (điểm gãy)

---

## 🕸️ BƯỚC 3: KNOWLEDGE GRAPH (ONTOLOGY)

### Swagger UI

1. Tìm **GET /api/knowledge-graph/statistics**
2. Click **"Try it out"**
3. Click **"Execute"**

### Response (Chứng minh Ontology)

```json
{
  "success": true,
  "statistics": {
    "total_entities": 250,        ← Ontology Entities ✅
    "total_relationships": 500,   ← Ontology Relationships ✅
    
    "entity_types": {
      "vocabulary": 100,          ← 100 từ vựng
      "document": 10,             ← 10 documents
      "sentence": 140             ← 140 câu
    },
    
    "relationship_types": {
      "appears_in": 100,          ← Vocabulary → Document
      "has_context": 100,         ← Vocabulary → Sentence
      "related_to": 300           ← Vocabulary → Vocabulary
    }
  }
}
```

**Xem Knowledge Graph:**
```
File: python-api/knowledge_graph_data/graph.json
```

Cấu trúc:
```json
{
  "entities": [
    {
      "entity_id": "vocab_learning",
      "entity_type": "vocabulary",
      "properties": {
        "word": "learning",
        "score": 1.013
      }
    }
  ],
  "relationships": [
    {
      "source_id": "vocab_learning",
      "target_id": "doc_20260203_162538",
      "relationship_type": "appears_in"
    }
  ]
}
```

---

## 🤖 BƯỚC 4: RAG (RETRIEVAL-AUGMENTED GENERATION)

### Swagger UI

1. Tìm **POST /api/rag/generate-flashcards**
2. Click **"Try it out"**
3. Request body:
   ```json
   {
     "document_id": "doc_20260203_162538",  ← Dùng ID từ bước 1
     "max_cards": 20
   }
   ```
4. Click **"Execute"**

### Response (Chứng minh RAG)

```json
{
  "success": true,
  "count": 20,
  "method": "RAG with Knowledge Graph",  ← RAG ✅
  
  "results": [
    {
      "word": "learning",
      "definition": "The process of acquiring knowledge or skills through study, experience, or teaching",
      "example": "Machine learning enables computers to learn from data without explicit programming",
      "difficulty": "intermediate",
      "source": "Retrieved from Knowledge Graph + Generated by GPT-4"  ← RAG ✅
    },
    ... (19 flashcards nữa)
  ],
  
  "rag_pipeline": {
    "retrieval": "Knowledge Graph query",     ← Retrieval ✅
    "augmentation": "Context from document",  ← Augmentation ✅
    "generation": "OpenAI GPT-4"             ← Generation ✅
  }
}
```

---

## 📊 BẢNG CHỨNG MINH

| Thuật toán | Endpoint | Chứng minh trong Response |
|-----------|----------|---------------------------|
| TF-IDF | /api/upload-document | `features.tfidf` |
| Bag of Words | /api/upload-document | `features.frequency` |
| RAKE | /api/upload-document | `features.rake` |
| YAKE | /api/upload-document | `features.yake` |
| K-Means | /api/kmeans-cluster | `clustering.n_clusters` |
| Elbow Method | /api/kmeans-cluster | `elbow_analysis.optimal_k` |
| Ontology | /api/knowledge-graph/statistics | `total_entities`, `total_relationships` |
| RAG | /api/rag/generate-flashcards | `method: "RAG with Knowledge Graph"` |

---

## 🎓 GIẢI THÍCH THUẬT TOÁN

### 1. TF-IDF (Term Frequency-Inverse Document Frequency)
**Công thức:**
```
TF-IDF(t,d) = TF(t,d) × IDF(t)
TF(t,d) = (Số lần xuất hiện của t trong d) / (Tổng số từ trong d)
IDF(t) = log(Tổng số documents / Số documents chứa t)
```

**Ý nghĩa:** Từ xuất hiện nhiều trong document này nhưng ít trong documents khác → quan trọng

### 2. Bag of Words (Mô hình túi từ)
**Công thức:**
```
Frequency(t) = Count(t) / Total_words
```

**Ý nghĩa:** Đếm tần suất xuất hiện của từ, bỏ qua thứ tự

### 3. K-Means Clustering
**Thuật toán:**
```
1. Chọn K centroids ngẫu nhiên
2. Gán mỗi điểm vào cluster gần nhất
3. Cập nhật centroids = trung bình các điểm trong cluster
4. Lặp lại bước 2-3 cho đến khi hội tụ
```

**Ý nghĩa:** Nhóm từ vựng tương tự nhau vào cùng cluster

### 4. Elbow Method
**Thuật toán:**
```
1. Chạy K-Means với K = 2, 3, 4, ..., max_k
2. Tính Inertia cho mỗi K
3. Vẽ đồ thị K vs Inertia
4. Tìm điểm gãy (elbow point)
```

**Ý nghĩa:** Tìm số cluster tối ưu (điểm mà tăng K không giảm Inertia nhiều nữa)

### 5. Knowledge Graph (Ontology)
**Cấu trúc:**
```
Entities: Vocabulary, Document, Sentence
Relationships: appears_in, has_context, related_to
```

**Ý nghĩa:** Lưu trữ tri thức dưới dạng đồ thị, dễ truy vấn và mở rộng

### 6. RAG (Retrieval-Augmented Generation)
**Pipeline:**
```
1. Retrieval: Lấy thông tin từ Knowledge Graph
2. Augmentation: Bổ sung context từ document
3. Generation: Tạo nội dung mới bằng LLM
```

**Ý nghĩa:** Kết hợp tri thức có sẵn với khả năng sinh của LLM

---

## 🎉 HOÀN THÀNH!

Bạn đã:
- ✅ Trích xuất 100 từ vựng
- ✅ Chứng minh TF-IDF, Bag of Words, RAKE, YAKE
- ✅ Chứng minh K-Means, Elbow Method
- ✅ Chứng minh Knowledge Graph (Ontology)
- ✅ Chứng minh RAG

**Tất cả thuật toán đều có trong Response JSON, dễ dàng kiểm tra và chứng minh!**
