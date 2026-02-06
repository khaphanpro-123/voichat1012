# 🧪 TEST V2 MODULES - HƯỚNG DẪN CHI TIẾT

## 🎯 MỤC TIÊU

Test 2 modules mới để verify:
1. ✅ TF-IDF hoạt động (score ≠ 0)
2. ✅ Trích xuất được phrases (không phải words)
3. ✅ Cluster sentences (không phải words)
4. ✅ Không có lỗi chính tả và tiếng Việt

---

## 🧪 TEST 1: PHRASE EXTRACTOR V2

### Chạy test

```bash
cd python-api
python phrase_extractor_v2.py
```

### Kết quả mong đợi

```
================================================================================
TESTING PHRASE EXTRACTOR V2
================================================================================
[PhraseExtractorV2] Starting extraction...
[PhraseExtractorV2] Split into 8 sentences
[PhraseExtractorV2] TF-IDF matrix shape: (8, 500)
[PhraseExtractorV2] Extracted 35 raw phrases
[PhraseExtractorV2] After filtering: 12 phrases
[PhraseExtractorV2] Returning top 10 phrases

📊 RESULTS:
--------------------------------------------------------------------------------
Total phrases extracted: 10

1. 'machine learning'
   TF-IDF: 0.4235
   Frequency: 1
   Appears in 1 sentences
   Context: Machine learning is a subset of artificial intelligence...

2. 'deep learning'
   TF-IDF: 0.3821
   Frequency: 1
   Appears in 1 sentences
   Context: Deep learning uses neural networks...

3. 'soft skills'
   TF-IDF: 0.3654
   Frequency: 1
   Appears in 1 sentences
   Context: Studying abroad helps students improve soft skills...

✅ Test completed!
```

### ✅ Verify checklist

- [ ] TF-IDF score > 0 (không phải 0!)
- [ ] Tất cả là phrases (có dấu cách)
- [ ] Không có từ đơn vô nghĩa ("lot", "lof")
- [ ] Không có tiếng Việt ("yeu", "nhan")
- [ ] Phrases có nghĩa ("soft skills", "machine learning")

---

## 🧪 TEST 2: SENTENCE CLUSTERING V2

### Chạy test

```bash
cd python-api
python sentence_clustering_v2.py
```

### Kết quả mong đợi

```
================================================================================
TESTING SENTENCE CLUSTERING V2
================================================================================
[SentenceClusteringV2] Starting clustering...
[SentenceClusteringV2] Split into 12 sentences
[SentenceClusteringV2] TF-IDF matrix shape: (12, 500)
[SentenceClusteringV2] Running Elbow Method (K=2 to 8)...
[SentenceClusteringV2] Optimal K: 4
[SentenceClusteringV2] Silhouette score: 0.3245
[SentenceClusteringV2] Clustering complete: 4 clusters

📊 RESULTS:
--------------------------------------------------------------------------------
Number of clusters: 4
Total sentences: 12

Cluster 0: Machine_Learning
  Sentences: 3
  Representative phrases:
    - 'machine learning' (score: 0.8500)
    - 'deep learning' (score: 0.7800)
    - 'neural networks' (score: 0.7200)

Cluster 1: Soft_Skills
  Sentences: 3
  Representative phrases:
    - 'soft skills' (score: 0.8200)
    - 'job opportunities' (score: 0.7500)
    - 'technical skills' (score: 0.7100)

Cluster 2: Volunteer_Work
  Sentences: 3
  Representative phrases:
    - 'volunteer work' (score: 0.7800)
    - 'social skills' (score: 0.7200)
    - 'personal growth' (score: 0.6800)

Cluster 3: Healthy_Lifestyle
  Sentences: 3
  Representative phrases:
    - 'healthy lifestyle' (score: 0.8100)
    - 'physical health' (score: 0.7400)
    - 'mental health' (score: 0.7200)

Elbow plot saved: cache/elbow_curve_sentences_test_doc.png

✅ Test completed!
```

### ✅ Verify checklist

- [ ] Cluster sentences (không phải words!)
- [ ] Mỗi cluster có theme rõ ràng
- [ ] Representative phrases có nghĩa
- [ ] Elbow curve được tạo
- [ ] Silhouette score > 0

---

## 📊 SO SÁNH V1 vs V2

### Test với cùng 1 document

**Document**: "DE Agree or disagree.docx"

#### ❌ V1 (Kết quả hiện tại)

```json
{
  "vocabulary": [
    {"word": "lot", "tfidf": 0, "score": 0.76},
    {"word": "lof", "tfidf": 0, "score": 0.58},
    {"word": "yeu", "tfidf": 0, "score": 0.51},
    {"word": "nhan", "tfidf": 0, "score": 0.51}
  ],
  "kmeans_clustering": {
    "clusters": [
      {
        "words": ["take", "part", "interesting"]
      }
    ]
  }
}
```

**Vấn đề**:
- ❌ Toàn từ đơn vô nghĩa
- ❌ TF-IDF = 0
- ❌ Có lỗi chính tả ("lof")
- ❌ Có tiếng Việt ("yeu", "nhan")
- ❌ Cluster words (sai)

---

#### ✅ V2 (Kết quả mong đợi)

```json
{
  "vocabulary": [
    {
      "phrase": "soft skills",
      "tfidf_score": 0.42,
      "frequency": 3,
      "cluster": "Personal_Development"
    },
    {
      "phrase": "job opportunities",
      "tfidf_score": 0.38,
      "frequency": 2,
      "cluster": "Career"
    },
    {
      "phrase": "volunteer work",
      "tfidf_score": 0.35,
      "frequency": 2,
      "cluster": "Social_Contribution"
    }
  ],
  "clustering": {
    "clusters": [
      {
        "theme": "Personal_Development",
        "sentences": [
          "Studying abroad helps students improve soft skills.",
          "Teamwork and communication skills are essential."
        ],
        "representative_phrases": [
          "soft skills",
          "communication skills"
        ]
      }
    ]
  }
}
```

**Cải thiện**:
- ✅ Phrases có nghĩa
- ✅ TF-IDF hoạt động (≠ 0)
- ✅ Không có lỗi chính tả
- ✅ Không có tiếng Việt
- ✅ Cluster sentences (đúng)
- ✅ Phrases gắn với themes

---

## 🔍 DEBUG TIPS

### Nếu TF-IDF vẫn = 0

**Nguyên nhân**: Không đủ sentences

**Giải pháp**:
```python
# Check số sentences
sentences = sent_tokenize(text)
print(f"Number of sentences: {len(sentences)}")

# Cần ít nhất 3 sentences
if len(sentences) < 3:
    print("❌ Not enough sentences for TF-IDF")
```

---

### Nếu không có phrases

**Nguyên nhân**: Filter quá nghiêm

**Giải pháp**:
```python
# Giảm min_phrase_length
phrases = extractor.extract_phrases(
    text=text,
    min_phrase_length=1  # Thay vì 2
)
```

---

### Nếu vẫn có tiếng Việt

**Nguyên nhân**: Thiếu từ trong VIETNAMESE_WORDS

**Giải pháp**:
```python
# Thêm vào phrase_extractor_v2.py
VIETNAMESE_WORDS = {
    'yeu', 'nhan', 'lof', 'thcih',
    # Thêm từ mới ở đây
    'toi', 'ban', 'cho', 'cua'
}
```

---

## 📈 METRICS ĐỂ ĐÁNH GIÁ

### Phrase Quality

```python
def evaluate_phrase_quality(phrases):
    """
    Đánh giá chất lượng phrases
    """
    metrics = {
        'total_phrases': len(phrases),
        'avg_tfidf': np.mean([p['tfidf_score'] for p in phrases]),
        'phrases_with_space': sum(1 for p in phrases if ' ' in p['phrase']),
        'single_words': sum(1 for p in phrases if ' ' not in p['phrase'])
    }
    
    # Quality score
    quality = metrics['phrases_with_space'] / metrics['total_phrases']
    metrics['quality_score'] = quality
    
    return metrics
```

**Mục tiêu**:
- `quality_score` > 0.8 (80% là phrases)
- `avg_tfidf` > 0.1 (TF-IDF hoạt động)
- `single_words` < 20% (ít từ đơn)

---

### Clustering Quality

```python
def evaluate_clustering_quality(clustering_result):
    """
    Đánh giá chất lượng clustering
    """
    metrics = {
        'n_clusters': clustering_result['n_clusters'],
        'avg_cluster_size': np.mean([
            c['n_sentences'] for c in clustering_result['clusters']
        ]),
        'phrases_per_cluster': np.mean([
            len(c['representative_phrases']) 
            for c in clustering_result['clusters']
        ])
    }
    
    return metrics
```

**Mục tiêu**:
- `n_clusters` = 3-6 (hợp lý)
- `avg_cluster_size` > 2 (mỗi cluster ít nhất 2 sentences)
- `phrases_per_cluster` > 2 (mỗi cluster ít nhất 2 phrases)

---

## ✅ ACCEPTANCE CRITERIA

### Phrase Extractor V2

- [ ] TF-IDF score > 0 cho tất cả phrases
- [ ] Ít nhất 80% là phrases (có dấu cách)
- [ ] Không có lỗi chính tả
- [ ] Không có tiếng Việt
- [ ] Phrases có nghĩa (không phải "lot", "lof")

### Sentence Clustering V2

- [ ] Cluster sentences (không phải words)
- [ ] Mỗi cluster có theme rõ ràng
- [ ] Representative phrases có nghĩa
- [ ] Elbow curve được tạo
- [ ] Silhouette score > 0.15

---

## 🚀 NEXT STEPS

Sau khi test PASS:

1. **Tích hợp vào main.py**
   - Tạo endpoint `/api/upload-document-v2`
   - Sử dụng 2 modules mới

2. **Viết LLM controlled generation**
   - Generate flashcards từ phrases
   - Kiểm soát từ vựng

3. **Test với document thật**
   - Upload "DE Agree or disagree.docx"
   - So sánh kết quả V1 vs V2

---

**Bạn đã sẵn sàng test chưa?** 🧪

```bash
# Test ngay
cd python-api
python phrase_extractor_v2.py
python sentence_clustering_v2.py
```
