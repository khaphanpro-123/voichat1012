# 🔧 FIX: Vấn đề chỉ trích xuất từ đơn

## ❌ VẤN ĐỀ

1. **Chỉ có 10 flashcards** - Giới hạn mặc định `max_cards=10`
2. **Toàn từ đơn (unigrams)** - Mất hết bigrams/phrases như "machine learning", "deep learning"

## 🔍 NGUYÊN NHÂN

### Vấn đề 1: Filter bigrams quá nghiêm

**File**: `ensemble_extractor.py` (line ~370)

```python
# Bigrams: keep if both words are meaningful
elif len(words) == 2:
    if all(len(w) >= 3 and w not in ENGLISH_STOPWORDS for w in words):
        filtered_candidates.add(c)
```

**Vấn đề**: 
- Yêu cầu cả 2 từ phải >= 3 ký tự
- Loại bỏ stopwords → mất phrases như "in healthcare", "of learning"

### Vấn đề 2: TF-IDF config

**File**: `ensemble_extractor.py` (line ~130)

```python
vectorizer = TfidfVectorizer(
    max_features=1000,
    ngram_range=(1, 2),      # OK
    min_df=2,                # Quá cao cho bigrams
    max_df=0.8,              # OK
    stop_words='english',    # Loại bỏ bigrams có stopwords
    norm='l2'
)
```

**Vấn đề**:
- `min_df=2`: Bigrams xuất hiện < 2 lần bị loại
- `stop_words='english'`: Loại cả bigrams chứa stopwords

### Vấn đề 3: Flashcard limit

**File**: `main.py` (line ~650)

```python
flashcards_result = rag_system.generate_flashcards(
    document_id=document_id,
    max_cards=min(10, len(vocabulary_contexts))  # Chỉ 10!
)
```

---

## ✅ GIẢI PHÁP

### Fix 1: Nới lỏng filter bigrams

**Thay đổi trong `ensemble_extractor.py`:**

```python
# Bigrams: keep if meaningful (nới lỏng hơn)
elif len(words) == 2:
    # Chỉ cần 1 trong 2 từ có nghĩa
    meaningful_words = [w for w in words if len(w) >= 3 and w not in ENGLISH_STOPWORDS]
    if len(meaningful_words) >= 1:  # Thay vì all()
        filtered_candidates.add(c)
```

### Fix 2: Tạo TF-IDF riêng cho n-grams

**Thêm vào `ensemble_extractor.py`:**

```python
def calculate_tfidf_ngrams(documents: List[str]) -> Dict[str, float]:
    """TF-IDF riêng cho n-grams, không filter stopwords"""
    vectorizer = TfidfVectorizer(
        max_features=500,
        ngram_range=(2, 3),      # Chỉ bigrams và trigrams
        min_df=1,                # Giảm xuống 1
        max_df=0.9,              # Nới lỏng
        # KHÔNG dùng stop_words để giữ phrases
        norm='l2'
    )
    
    try:
        tfidf_matrix = vectorizer.fit_transform(documents)
        feature_names = vectorizer.get_feature_names_out()
        scores = tfidf_matrix[0].toarray()[0]
        
        tfidf_scores = {}
        for idx, score in enumerate(scores):
            if score > 0:
                tfidf_scores[feature_names[idx]] = score
        
        return tfidf_scores
    except:
        return {}
```

### Fix 3: Tăng số flashcards

**Thay đổi trong `main.py`:**

```python
# Tăng từ 10 lên 20 hoặc tất cả
flashcards_result = rag_system.generate_flashcards(
    document_id=document_id,
    max_cards=min(20, len(vocabulary_contexts))  # Tăng lên 20
)
```

Hoặc cho phép user chọn:

```python
max_cards = request.max_cards if hasattr(request, 'max_cards') else 20
```

---

## 🚀 IMPLEMENT NGAY

Tôi sẽ implement 3 fixes này cho bạn!

---

## 📊 KẾT QUẢ MONG ĐỢI

### Trước fix:
```json
{
  "vocabulary": [
    {"word": "machine"},
    {"word": "learning"},
    {"word": "deep"},
    {"word": "healthcare"}
  ]
}
```

### Sau fix:
```json
{
  "vocabulary": [
    {"word": "machine learning"},
    {"word": "deep learning"},
    {"word": "healthcare system"},
    {"word": "medical image"},
    {"word": "diagnosis accuracy"}
  ]
}
```

---

## 🎯 PRIORITY

1. **HIGH**: Fix bigram filter (ngay lập tức)
2. **HIGH**: Tăng flashcard limit
3. **MEDIUM**: TF-IDF riêng cho n-grams

Bạn muốn tôi implement ngay không? 🚀
