# Context Intelligence Engine - Documentation

## 📖 Tổng quan

Context Intelligence Engine là hệ thống chọn câu ngữ cảnh tốt nhất cho mỗi từ vựng, được implement bằng Python với các thư viện NLP chuyên nghiệp.

## 🎯 Mục tiêu

Cho mỗi từ vựng được trích xuất, hệ thống sẽ:
1. Tìm tất cả câu chứa từ đó
2. Lọc bỏ câu không hợp lệ
3. Chấm điểm các câu còn lại
4. Chọn câu tốt nhất
5. Highlight từ vựng trong câu

## 🔧 Pipeline

### STAGE 1: Ensemble Vocabulary Extraction
```
Input: Raw text
↓
Clean metadata → Tokenize → Extract candidates
↓
Calculate features: TF-IDF, RAKE, YAKE, Frequency
↓
Normalize & Weight → Filter → Rank
↓
Output: Top N vocabulary words with scores
```

### STAGE 2: Context Intelligence Engine
```
Input: Text + Vocabulary list
↓
Build Sentence objects (with metadata)
↓
Map words → sentences
↓
Filter invalid sentences
↓
Score sentences (multi-criteria)
↓
Select best sentence per word
↓
Highlight word in sentence
↓
Output: Vocabulary with context
```

## 📊 Scoring Formula

### Sentence Score
```python
score = 0.4 × keyword_density +
        0.3 × length_score +
        0.2 × position_score +
        0.1 × clarity_score
```

### Components

#### 1. Keyword Density (40%)
```python
keyword_density = count(vocabulary_words_in_sentence) / total_words
```
- Đo lường mật độ từ khóa quan trọng
- Cao hơn = nhiều từ vựng hơn trong câu

#### 2. Length Score (30%)
```python
if 8 ≤ word_count ≤ 20:
    length_score = 1.0  # Perfect
elif word_count < 8:
    length_score = word_count / 8  # Linear penalty
else:
    length_score = exp(-(word_count - 20) / 10)  # Exponential penalty
```
- Câu 8-20 từ là lý tưởng
- Quá ngắn hoặc quá dài bị phạt điểm

#### 3. Position Score (20%)
```python
position_score = exp(-position / (total_sentences × 0.3))
```
- Câu xuất hiện sớm hơn → quan trọng hơn
- Exponential decay

#### 4. Clarity Score (10%)
```python
score = 0
if has_verb: score += 0.5
if comma_ratio < 0.15: score += 0.3
if not starts_with_bullet: score += 0.2
```
- Có động từ
- Không phải list
- Câu tự nhiên

## 🛠️ Thư viện sử dụng

### spaCy
```python
import spacy
nlp = spacy.load("en_core_web_sm")

# POS tagging
doc = nlp(text)
for token in doc:
    print(token.text, token.pos_)

# Verb detection
has_verb = any(token.pos_ == "VERB" for token in doc)
```

### NLTK
```python
from nltk.tokenize import sent_tokenize, word_tokenize
from nltk.corpus import stopwords

# Sentence tokenization
sentences = sent_tokenize(text)

# Word tokenization
words = word_tokenize(text)

# Stopwords
stop_words = set(stopwords.words('english'))
```

### scikit-learn
```python
from sklearn.feature_extraction.text import TfidfVectorizer

# TF-IDF
vectorizer = TfidfVectorizer(ngram_range=(1, 3))
tfidf_matrix = vectorizer.fit_transform([text])
```

## 📝 Ví dụ sử dụng

### Python Code
```python
from ensemble_extractor import extract_vocabulary_ensemble
from context_intelligence import select_vocabulary_contexts

# STAGE 1: Extract vocabulary
text = "Your document text here..."
ensemble_result = extract_vocabulary_ensemble(
    text,
    max_words=50,
    weights={
        'frequency': 0.15,
        'tfidf': 0.35,
        'rake': 0.25,
        'yake': 0.25
    }
)

# Prepare vocabulary list
vocabulary_list = [
    {'word': score['word'], 'score': score['score']}
    for score in ensemble_result['scores']
]

# STAGE 2: Select contexts
contexts = select_vocabulary_contexts(
    text,
    vocabulary_list,
    language="en",
    min_words=5,
    max_words=35,
    require_verb=True
)

# Print results
for ctx in contexts:
    print(f"Word: {ctx['word']}")
    print(f"Context: {ctx['contextSentence']}")
    print(f"Score: {ctx['sentenceScore']:.3f}")
    print(f"Explanation: {ctx['explanation']}")
```

### API Call
```bash
curl -X POST http://localhost:8000/api/smart-vocabulary-extract \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Machine learning is a subset of artificial intelligence...",
    "max_words": 20,
    "language": "en"
  }'
```

### Response
```json
{
  "success": true,
  "vocabulary": [
    {
      "word": "machine learning",
      "score": 0.856,
      "context": "<b>Machine learning</b> is a subset of artificial intelligence.",
      "contextPlain": "Machine learning is a subset of artificial intelligence.",
      "sentenceId": "s1",
      "sentenceScore": 0.823,
      "explanation": "Được chọn vì: mật độ từ khóa cao (15.2%), độ dài tối ưu (9 từ). Score: 0.823",
      "features": {
        "frequency": 0.045,
        "tfidf": 0.678,
        "rake": 4.5,
        "yake": 0.234
      }
    }
  ],
  "count": 15,
  "stats": {...}
}
```

## ✅ Quality Checkpoints

### 1. Explainable Scoring
Mỗi câu được chọn đều có explanation rõ ràng:
```
"Được chọn vì: mật độ từ khóa cao (15.2%), độ dài tối ưu (9 từ), 
xuất hiện sớm trong tài liệu, câu rõ ràng có động từ. Score: 0.823"
```

### 2. Deterministic Output
Cùng input → cùng output (không random)

### 3. Readable Contexts
- Câu đủ dài (5-35 từ)
- Có động từ
- Không phải list hoặc tiêu đề
- Từ vựng được highlight rõ ràng

## 🧪 Testing

```bash
# Run all tests
python test_context_intelligence.py

# Test individual stages
python -c "from ensemble_extractor import extract_vocabulary_ensemble; ..."
python -c "from context_intelligence import select_vocabulary_contexts; ..."
```

## 🎓 Lý thuyết

### TF-IDF (Term Frequency-Inverse Document Frequency)
```
TF(t,d) = f(t,d) / max{f(w,d) : w ∈ d}
IDF(t,D) = log(|D| / |{d ∈ D : t ∈ d}|)
TF-IDF(t,d,D) = TF(t,d) × IDF(t,D)
```

### RAKE (Rapid Automatic Keyword Extraction)
```
RAKE_score(word) = degree(word) / frequency(word)
```
- degree = tổng số từ trong các cụm chứa từ đó
- frequency = số lần xuất hiện

### YAKE (Yet Another Keyword Extractor)
```
YAKE_score = (relatedness × position) / (case + frequency + different_sentences)
```
- Kết hợp nhiều features: vị trí, tần suất, ngữ cảnh

## 🔍 Filtering Rules

### Invalid Sentences
- Quá ngắn: < 5 từ
- Quá dài: > 35 từ
- Không có động từ
- Toàn chữ hoa (tiêu đề)
- Bắt đầu bằng bullet point

### Unwanted Terms
- Proper nouns (tên riêng)
- Technical metadata (pdf, doc, http, etc.)
- Pure numbers
- Very short terms (< 3 chars)

## 📈 Performance

| Stage | Time | Memory |
|-------|------|--------|
| STAGE 1 (1000 words) | ~2-3s | ~50MB |
| STAGE 2 (50 vocab) | ~1-2s | ~30MB |
| **Total** | **~3-5s** | **~80MB** |

## 🚀 Optimization Tips

1. **Batch Processing**: Process multiple documents together
2. **Caching**: Cache TF-IDF vectors for similar documents
3. **Parallel Processing**: Use multiprocessing for large documents
4. **Model Loading**: Load spaCy model once at startup

## 📚 References

- [spaCy Documentation](https://spacy.io/)
- [NLTK Documentation](https://www.nltk.org/)
- [scikit-learn TF-IDF](https://scikit-learn.org/stable/modules/feature_extraction.html#tfidf-term-weighting)
- [RAKE Paper](https://www.researchgate.net/publication/227988510_Automatic_Keyword_Extraction_from_Individual_Documents)
- [YAKE Paper](https://repositorio.inesctec.pt/handle/123456789/7623)

## 🤝 Contributing

Contributions welcome! Please:
1. Fork the repository
2. Create feature branch
3. Add tests
4. Submit pull request

## 📄 License

MIT License
