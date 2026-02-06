# STAGE 3 – Learning Feedback Loop (Giả Huấn Luyện)

## 📖 Tổng quan

STAGE 3 là hệ thống **adaptive learning** cho phép trọng số ensemble tự điều chỉnh dựa trên phản hồi người dùng, **không cần supervised training**.

## 🎯 Mục tiêu

1. **Khai thác hành vi** lựa chọn từ vựng của người học
2. **Điều chỉnh trọng số** các thành phần trong mô hình ensemble
3. Tạo cơ chế **"giả huấn luyện"** (pseudo-training) không cần dữ liệu gán nhãn
4. **Nâng cao tính cá nhân hóa** và khả năng thích ứng

## 🔄 Pipeline

```
User Feedback → Feedback Memory → Analysis → Weight Adjustment → Better Extraction
     ↑                                                                    ↓
     └────────────────────────────────────────────────────────────────────┘
                            Continuous Improvement Loop
```

## 📊 Các bước chi tiết

### BƯỚC 3.1 – Thu thập phản hồi người dùng

**Hành vi được ghi nhận:**
- ✅ **Keep**: Giữ từ (từ hữu ích)
- ❌ **Drop**: Loại bỏ từ (từ không cần thiết)
- ⭐ **Star**: Đánh dấu quan trọng (từ rất quan trọng)

**Dữ liệu lưu trữ:**
```python
{
  "feedback_id": "fb_20260202_143052_123456",
  "word": "ontology",
  "document_id": "doc_01",
  "user_id": "user_01",
  "scores": {
    "tfidf": 0.85,
    "frequency": 0.45,
    "yake": 0.75,
    "rake": 0.65
  },
  "final_score": 0.82,
  "user_action": "keep",
  "timestamp": "2026-02-02T14:30:52",
  "weights_used": {
    "tfidf": 0.25,
    "frequency": 0.25,
    "yake": 0.25,
    "rake": 0.25
  }
}
```

**Code:**
```python
from feedback_loop import FeedbackCollector

collector = FeedbackCollector(storage_path="feedback_data")

feedback = collector.collect_feedback(
    word="ontology",
    document_id="doc_01",
    user_id="user_01",
    scores={'tfidf': 0.85, 'frequency': 0.45, 'yake': 0.75, 'rake': 0.65},
    final_score=0.82,
    user_action="keep",
    weights_used={'tfidf': 0.25, 'frequency': 0.25, 'yake': 0.25, 'rake': 0.25}
)
```

---

### BƯỚC 3.2 – Tổ chức kho phản hồi (Feedback Memory)

**Mục tiêu:** Xây dựng bộ nhớ phản hồi để phục vụ điều chỉnh mô hình

**Features:**
- Load tất cả feedback
- Filter theo user_id
- Filter theo action (keep/drop/star)
- Thống kê feedback

**Code:**
```python
from feedback_loop import FeedbackMemory

memory = FeedbackMemory(storage_path="feedback_data")

# Load all feedback
all_feedback = memory.load_all_feedback()

# Get statistics
stats = memory.get_statistics()
# Output: {'total': 150, 'keep': 80, 'drop': 50, 'star': 20}

# Filter by user
user_feedback = memory.get_feedback_by_user("user_01")

# Filter by action
keep_feedback = memory.get_feedback_by_action("keep")
```

---

### BƯỚC 3.3 – Phân tích phản hồi (Core Logic)

**Nguyên tắc:**
- Nếu từ được **keep** và có **TF-IDF cao** → TF-IDF có giá trị
- Nếu từ bị **drop** nhưng **frequency cao** → frequency gây nhiễu

**Logic:**
```python
# Words kept with high TF-IDF
keep_words: tfidf=high, yake=high → increase tfidf, yake weights

# Words dropped with high frequency
drop_words: frequency=high → decrease frequency weight
```

**Code:**
```python
from feedback_loop import FeedbackAnalyzer

analyzer = FeedbackAnalyzer()

# Analyze feedback patterns
analysis = analyzer.analyze_feedback(all_feedback)

# Output:
# {
#   'keep': {'tfidf': 0.85, 'frequency': 0.40, 'yake': 0.78, 'rake': 0.65},
#   'drop': {'tfidf': 0.15, 'frequency': 0.92, 'yake': 0.20, 'rake': 0.18}
# }

# Identify positive methods
positive = analyzer.identify_positive_methods(analysis)
# Output: ['tfidf', 'yake', 'rake']

# Identify negative methods
negative = analyzer.identify_negative_methods(analysis)
# Output: ['frequency']
```

---

### BƯỚC 3.4 – Điều chỉnh trọng số (Pseudo-Training)

**Trọng số ban đầu:**
```python
{
  "tfidf": 0.25,
  "frequency": 0.25,
  "yake": 0.25,
  "rake": 0.25
}
```

**Luật cập nhật:**
```python
if user_action == "keep":
    # Increase weights of high-scoring methods
    for method in ['tfidf', 'frequency', 'yake', 'rake']:
        if scores[method] > threshold:
            weights[method] += learning_rate * scores[method]

if user_action == "drop":
    # Decrease weights of high-scoring methods
    for method in ['tfidf', 'frequency', 'yake', 'rake']:
        if scores[method] > threshold:
            weights[method] -= learning_rate * scores[method]

# Normalize weights to sum to 1.0
normalize(weights)
```

**Ví dụ sau điều chỉnh:**
```python
{
  "tfidf": 0.32,      # ↑ Increased (good for keep)
  "frequency": 0.18,  # ↓ Decreased (causes drop)
  "yake": 0.28,       # ↑ Increased
  "rake": 0.22        # → Stable
}
```

**Code:**
```python
from feedback_loop import WeightAdjuster

adjuster = WeightAdjuster(learning_rate=0.1)

# Get current weights
current = adjuster.get_current_weights()

# Adjust based on analysis
new_weights = adjuster.adjust_weights(analysis, feedback_count=150)

print(f"TF-IDF: {current.tfidf:.3f} → {new_weights.tfidf:.3f}")
print(f"Frequency: {current.frequency:.3f} → {new_weights.frequency:.3f}")
```

---

### BƯỚC 3.5 – Áp dụng trọng số mới

**Mục tiêu:** Tài liệu xử lý sau sẽ được trích xuất từ vựng tốt hơn

**Công thức ensemble mới:**
```python
finalScore = w1 * tfidf + w2 * frequency + w3 * yake + w4 * rake
```
Trong đó `w1...w4` được cập nhật động từ feedback.

**Code:**
```python
from ensemble_extractor import extract_vocabulary_ensemble
from feedback_loop import FeedbackLoop

loop = FeedbackLoop()

# Get adaptive weights
adaptive_weights = loop.get_current_weights()
# Output: {'tfidf': 0.32, 'frequency': 0.18, 'yake': 0.28, 'rake': 0.22}

# Extract with adaptive weights
result = extract_vocabulary_ensemble(
    text,
    max_words=50,
    weights=adaptive_weights  # ✅ Use adaptive weights
)
```

---

### BƯỚC 3.6 – Lưu dấu vết học tập (Traceability)

**Mục tiêu:** Đảm bảo tính giải thích (explainability)

**Mỗi extraction lưu:**
```python
{
  "word": "ontology",
  "finalScore": 0.84,
  "weightsUsed": {
    "tfidf": 0.32,
    "frequency": 0.18,
    "yake": 0.28,
    "rake": 0.22
  },
  "weightsVersion": 5,
  "feedbackCount": 150
}
```

**Explanation generation:**
```python
def generate_explanation(old_weights, new_weights, analysis):
    """
    Tạo explanation cho việc thay đổi trọng số
    
    Example output:
    "Điều chỉnh trọng số: TF-IDF tăng 0.25→0.32 (keep=0.85 > drop=0.15); 
     Frequency giảm 0.25→0.18 (drop=0.92 > keep=0.40)"
    """
```

---

## 🔧 API Endpoints

### 1. Submit Feedback
```http
POST /api/vocabulary-feedback
Content-Type: application/json

{
  "word": "ontology",
  "document_id": "doc_01",
  "user_id": "user_01",
  "scores": {
    "tfidf": 0.85,
    "frequency": 0.45,
    "yake": 0.75,
    "rake": 0.65
  },
  "final_score": 0.82,
  "user_action": "keep"
}
```

**Response:**
```json
{
  "success": true,
  "feedback_saved": true,
  "weights_updated": true,
  "new_weights": {
    "tfidf": 0.32,
    "frequency": 0.18,
    "yake": 0.28,
    "rake": 0.22
  },
  "explanation": "Điều chỉnh trọng số: TF-IDF tăng 0.25→0.32..."
}
```

### 2. Get Statistics
```http
GET /api/vocabulary-feedback/statistics?user_id=user_01
```

**Response:**
```json
{
  "success": true,
  "statistics": {
    "feedback_stats": {
      "total": 150,
      "keep": 80,
      "drop": 50,
      "star": 20
    },
    "current_weights": {
      "tfidf": 0.32,
      "frequency": 0.18,
      "yake": 0.28,
      "rake": 0.22
    },
    "weights_version": 5,
    "last_updated": "2026-02-02T14:30:52"
  }
}
```

### 3. Get Current Weights
```http
GET /api/vocabulary-feedback/weights
```

### 4. Extract with Adaptive Weights
```http
POST /api/smart-vocabulary-extract-adaptive
Content-Type: application/json

{
  "text": "Your document text...",
  "max_words": 50,
  "language": "en"
}
```

**Response includes adaptive weights info:**
```json
{
  "success": true,
  "vocabulary": [...],
  "adaptive_weights": {
    "weights": {"tfidf": 0.32, "frequency": 0.18, ...},
    "version": 5,
    "feedback_count": 150
  },
  "pipeline": "STAGE 1 (Adaptive) + STAGE 2 (Context) + STAGE 3 (Feedback)"
}
```

---

## 🧪 Testing

```bash
# Run comprehensive tests
python test_feedback_loop.py
```

**Tests cover:**
- ✅ Feedback collection
- ✅ Feedback memory
- ✅ Feedback analysis
- ✅ Weight adjustment
- ✅ Full feedback loop
- ✅ Traceability

---

## 📊 Example Scenario

### Initial State
```python
Weights: {tfidf: 0.25, frequency: 0.25, yake: 0.25, rake: 0.25}
```

### User Feedback (10 words)
```
Keep: ontology (tfidf=0.9), semantic (tfidf=0.85), knowledge (tfidf=0.82)
Drop: the (freq=0.98), and (freq=0.95), is (freq=0.92)
Star: AI (tfidf=0.95), ML (tfidf=0.93)
```

### After Analysis
```
Keep words: avg tfidf=0.88, avg frequency=0.40
Drop words: avg tfidf=0.12, avg frequency=0.95

→ TF-IDF is positive (high in keep, low in drop)
→ Frequency is negative (high in drop, low in keep)
```

### Weight Update
```python
New weights: {tfidf: 0.32, frequency: 0.18, yake: 0.28, rake: 0.22}

Explanation:
"TF-IDF tăng 0.25→0.32 (keep=0.88 > drop=0.12)
 Frequency giảm 0.25→0.18 (drop=0.95 > keep=0.40)"
```

### Next Document
```
Uses new weights → Better vocabulary extraction!
Academic words ranked higher, common words ranked lower.
```

---

## ✅ CHECKLIST - STAGE 3

- [x] **Hệ thống thu thập được phản hồi người học**
  - FeedbackCollector class
  - 3 actions: keep, drop, star
  - Lưu vào JSON files

- [x] **Phản hồi được lưu dưới dạng dữ liệu có cấu trúc**
  - VocabularyFeedback dataclass
  - Có đầy đủ metadata (scores, weights_used, timestamp)

- [x] **Trọng số ensemble không còn cố định**
  - EnsembleWeights class
  - Tự động điều chỉnh dựa trên feedback
  - Lưu version và history

- [x] **Tài liệu xử lý sau cho kết quả tốt hơn tài liệu trước**
  - Adaptive weights được áp dụng cho extraction tiếp theo
  - Test cases chứng minh improvement

- [x] **Giải thích được vì sao trọng số thay đổi**
  - generate_explanation() function
  - Breakdown analysis (keep vs drop scores)
  - Traceability đầy đủ

- [x] **Không sử dụng mô hình ML huấn luyện sẵn**
  - 100% rule-based
  - Chỉ dùng statistics và heuristics
  - Không có neural networks, gradient descent, etc.

- [x] **Có thể mô tả đây là adaptive learning system**
  - Continuous improvement loop
  - Self-adjusting based on user behavior
  - Pseudo-training without labeled data

**🎯 STAGE 3 ĐẠT YÊU CẦU: 7/7**

---

## 🚀 Production Deployment

### Storage Options

**Option 1: File-based (Current)**
```python
FeedbackLoop(storage_path="feedback_data")
```
- Simple, no database needed
- Good for small-medium scale

**Option 2: Database (Recommended for production)**
```python
# MongoDB example
from pymongo import MongoClient

class FeedbackMemoryDB:
    def __init__(self, mongo_uri):
        self.client = MongoClient(mongo_uri)
        self.db = self.client.vocabulary_feedback
        self.collection = self.db.feedbacks
    
    def save_feedback(self, feedback):
        self.collection.insert_one(asdict(feedback))
    
    def load_all_feedback(self):
        return list(self.collection.find())
```

### Scaling Considerations

1. **Batch Updates**: Update weights every N feedbacks (default: 10)
2. **User-specific Weights**: Maintain separate weights per user
3. **A/B Testing**: Compare fixed vs adaptive weights
4. **Monitoring**: Track weight changes over time

---

## 📚 References

- **Weak Supervision**: Using user behavior as weak labels
- **Online Learning**: Continuous model updates
- **Reinforcement Learning**: Reward (keep) vs Penalty (drop)
- **Adaptive Systems**: Self-adjusting based on feedback

---

## 🤝 Integration with STAGE 1 & 2

```python
# Complete pipeline
from ensemble_extractor import extract_vocabulary_ensemble
from context_intelligence import select_vocabulary_contexts
from feedback_loop import FeedbackLoop

# Initialize
loop = FeedbackLoop()

# STAGE 1: Extract with adaptive weights
adaptive_weights = loop.get_current_weights()
vocab_result = extract_vocabulary_ensemble(text, weights=adaptive_weights)

# STAGE 2: Select contexts
contexts = select_vocabulary_contexts(text, vocab_result['scores'])

# User reviews and provides feedback
for ctx in contexts:
    user_action = get_user_feedback(ctx)  # keep/drop/star
    
    # STAGE 3: Process feedback
    loop.process_feedback(
        word=ctx['word'],
        scores=ctx['features'],
        user_action=user_action,
        ...
    )

# Next document will use improved weights!
```

---

**Ngày tạo:** 2026-02-02  
**Version:** 1.0.0  
**Status:** ✅ Production Ready
