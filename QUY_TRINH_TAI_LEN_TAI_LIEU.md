# QUY TRÌNH TẢI LÊN TÀI LIỆU - PYTHON API

## TỔNG QUAN HỆ THỐNG

Hệ thống tải lên tài liệu trong `python-api` là một pipeline hoàn chỉnh gồm **6 STAGES** xử lý từ việc upload file đến tạo flashcards và phân cụm từ vựng.

### Công nghệ sử dụng:
- **FastAPI**: Web framework
- **scikit-learn**: TF-IDF, K-Means clustering
- **spaCy**: NLP processing, POS tagging
- **NLTK**: Tokenization, stopwords
- **PyPDF2 & python-docx**: Đọc file PDF/DOCX
- **matplotlib**: Vẽ đồ thị Elbow
- **sentence-transformers** (optional): Semantic embeddings

---

## ENDPOINT CHÍNH

### `/api/upload-document` (POST)

**Mục đích**: Upload tài liệu và trích xuất từ vựng tự động

**Parameters**:
- `file`: File upload (`.txt`, `.pdf`, `.docx`)
- `max_words`: Số từ vựng tối đa (default: 50, max: 100)
- `language`: Ngôn ngữ (`en` hoặc `vi`)
- `max_flashcards`: Số flashcards tối đa (default: 30)

**Response**:
```json
{
  "success": true,
  "document_id": "doc_20260205_123456",
  "filename": "example.docx",
  "vocabulary": [...],
  "flashcards": [...],
  "stats": {...},
  "kmeans_clustering": {...}
}
```

---

## QUY TRÌNH CHI TIẾT - 6 STAGES

### **BƯỚC 1: UPLOAD & EXTRACT TEXT**

#### 1.1. Nhận file từ client
```python
file: UploadFile = File(...)
```

#### 1.2. Validate file
- Kiểm tra file extension: `.txt`, `.pdf`, `.docx`, `.doc`
- Kiểm tra thư viện hỗ trợ (PyPDF2, python-docx)

#### 1.3. Lưu file vào thư mục `uploads/`
```python
timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
safe_filename = f"{timestamp}_{file.filename}"
file_path = os.path.join("uploads", safe_filename)
```

#### 1.4. Trích xuất text từ file
**Function**: `extract_text_from_file(file_path)`

**Xử lý theo loại file**:
- **TXT**: Đọc trực tiếp với encoding UTF-8
- **PDF**: Sử dụng `PyPDF2.PdfReader`, extract từng page
- **DOCX**: Sử dụng `python-docx`, extract từng paragraph

**Validate**: Text phải có ít nhất 50 ký tự

---

### **STAGE 1: ENSEMBLE VOCABULARY EXTRACTION**

**Module**: `ensemble_extractor.py`

**Function**: `extract_vocabulary_ensemble(text, max_words, weights)`

#### 1.1. Làm sạch text
```python
cleaned_text = clean_pdf_metadata(text)
```
- Loại bỏ metadata PDF (startxref, endobj, xref...)
- Loại bỏ technical terms (rgb, cmyk, flatedecode...)
- Chuẩn hóa khoảng trắng

#### 1.2. Tokenization
```python
tokens = tokenize_text(cleaned_text, remove_stopwords=True, lemmatize=True)
```
- Lowercase
- Loại bỏ punctuation
- **Lemmatization**: Chuẩn hóa từ về dạng gốc (running → run)
- Loại bỏ stopwords

#### 1.3. Trích xuất N-grams
```python
bigrams = extract_ngrams(tokens, 2)
trigrams = extract_ngrams(tokens, 3)
candidates = set(tokens) + bigrams + trigrams
```

#### 1.4. Tính điểm từ 4 thuật toán

**a) Frequency Score**
```python
freq_scores = calculate_frequency(tokens)
# freq = count / total_tokens
```

**b) TF-IDF Score**
```python
tfidf_scores = calculate_tfidf([cleaned_text])
# Sử dụng scikit-learn TfidfVectorizer
# Cấu hình: max_features=1000, ngram_range=(1,2), norm='l2'
```

**c) RAKE Score** (Rapid Automatic Keyword Extraction)
```python
rake_scores = calculate_rake(text)
# RAKE = degree(word) / frequency(word)
# degree = tổng độ dài các phrases chứa word
```

**d) YAKE Score** (Yet Another Keyword Extractor)
```python
yake_scores = calculate_yake(text)
# YAKE = (relatedness * position_score) / (1 + freq_score)
# Điểm thấp hơn = tốt hơn → invert
```

#### 1.5. Normalization
```python
# Min-Max normalize mỗi feature về [0, 1]
norm_freq = min_max_normalize(freq_values)
norm_tfidf = min_max_normalize(tfidf_values)
norm_rake = min_max_normalize(rake_values)
norm_yake = min_max_normalize(yake_values)
```

#### 1.6. Tính điểm tổng hợp (Weighted Ensemble)
```python
# Adaptive weights từ STAGE 3 Feedback Loop
weights = feedback_loop.get_current_weights()
# Default: {frequency: 0.15, tfidf: 0.35, rake: 0.25, yake: 0.25}

final_score = (
    weights['frequency'] * norm_freq +
    weights['tfidf'] * norm_tfidf +
    weights['rake'] * norm_rake +
    weights['yake'] * norm_yake
)
```

#### 1.7. Filtering
- Loại bỏ proper nouns (tên riêng)
- Loại bỏ technical terms
- Loại bỏ từ quá ngắn (< 3 ký tự)
- Boost context relevance (từ xuất hiện trong ngữ cảnh tốt)

#### 1.8. Sắp xếp và chọn top words
```python
sorted_scores = sorted(word_scores, key=lambda x: x.score, reverse=True)[:max_words]
```

**Output**:
```python
{
  'vocabulary': ['word1', 'word2', ...],
  'scores': [
    {
      'word': 'ontology',
      'score': 0.85,
      'features': {'tfidf': 0.9, 'frequency': 0.3, ...},
      'normalized': {...},
      'reason': 'Được chọn vì: TF-IDF cao, RAKE cao'
    }
  ],
  'stats': {...}
}
```

---

### **STAGE 2: CONTEXT INTELLIGENCE**

**Module**: `context_intelligence.py`

**Function**: `select_vocabulary_contexts(text, vocabulary_list, language)`

#### 2.1. Build Sentence Objects
```python
sentences = build_sentences(text, language)
```
- Tokenize thành sentences (NLTK sent_tokenize)
- Tạo Sentence objects với metadata:
  - `sentence_id`, `text`, `position`, `word_count`
  - `has_verb` (detect bằng spaCy POS tagging)
  - `tokens`, `pos_tags`

#### 2.2. Map từ vựng → câu chứa từ
```python
word_map = map_words_to_sentences(vocabulary_words, sentences)
# {'ontology': ['s1', 's5', 's12'], ...}
```
- Sử dụng regex whole-word matching
- Case-insensitive

#### 2.3. Lọc câu không hợp lệ
```python
valid_sentences = filter_invalid_sentences(sentences)
```
**Loại bỏ**:
- Câu quá ngắn (< 5 từ)
- Câu quá dài (> 35 từ)
- Câu không có động từ
- Câu toàn chữ hoa (tiêu đề)
- Câu list (nhiều dấu phẩy, bullet points)

#### 2.4. Chấm điểm câu (CORE LOGIC)

**Formula**:
```
sentence_score = 0.4 * keyword_density + 
                 0.3 * length_score + 
                 0.2 * position_score + 
                 0.1 * clarity_score
```

**a) Keyword Density**
```python
keyword_density = keyword_count / word_count
# Tỷ lệ từ quan trọng trong câu
```

**b) Length Score**
```python
# Câu 8-20 từ là tốt nhất
if 8 <= word_count <= 20:
    length_score = 1.0
elif word_count < 8:
    length_score = word_count / 8
else:
    length_score = exp(-(word_count - 20) / 10)
```

**c) Position Score**
```python
# Câu xuất hiện sớm hơn → quan trọng hơn
position_score = exp(-position / (total_sentences * 0.3))
```

**d) Clarity Score**
```python
score = 0.0
if has_verb: score += 0.5
if comma_ratio < 0.15: score += 0.3
if not bullet_point: score += 0.2
```

#### 2.5. Chọn câu tốt nhất cho mỗi từ
```python
# Với mỗi từ vựng:
# 1. Lấy tất cả câu chứa từ đó
# 2. Chấm điểm các câu
# 3. Chọn câu có điểm cao nhất
best_sentence = max(candidate_sentences, key=lambda s: s.score)
```

#### 2.6. Highlight từ vựng trong câu
```python
highlighted = highlight_word(sentence_text, word)
# "Ontology is a formal..." → "<b>Ontology</b> is a formal..."
```

#### 2.7. Tạo explanation
```python
explanation = generate_explanation(sentence_score, sentence)
# "Được chọn vì: mật độ từ khóa cao (15%), độ dài tối ưu (12 từ)"
```

**Output**:
```python
[
  {
    'word': 'ontology',
    'finalScore': 0.85,
    'contextSentence': '<b>Ontology</b> is a formal representation...',
    'sentenceId': 's1',
    'sentenceScore': 0.82,
    'explanation': 'Được chọn vì: mật độ từ khóa cao, độ dài tối ưu'
  }
]
```

---

### **STAGE 3: FEEDBACK LOOP (Adaptive Weights)**

**Module**: `feedback_loop.py`

**Class**: `FeedbackLoop`

#### 3.1. Lấy adaptive weights hiện tại
```python
adaptive_weights = feedback_loop.get_current_weights()
# Trọng số đã được điều chỉnh dựa trên feedback người dùng
```

#### 3.2. Áp dụng weights vào STAGE 1
```python
ensemble_result = extract_vocabulary_ensemble(
    text,
    max_words=max_words,
    weights=adaptive_weights  # Sử dụng adaptive weights
)
```

#### 3.3. Cơ chế hoạt động (Background)

**Thu thập feedback**:
```python
# User actions: 'keep', 'drop', 'star'
feedback_loop.process_feedback(
    word='ontology',
    scores={'tfidf': 0.9, 'frequency': 0.3, ...},
    user_action='keep'
)
```

**Phân tích pattern**:
- Từ được 'keep': Thuật toán nào có điểm cao?
- Từ bị 'drop': Thuật toán nào có điểm cao?

**Điều chỉnh trọng số**:
```python
# Tăng trọng số của thuật toán tốt
# Giảm trọng số của thuật toán gây nhiễu
new_weights = adjuster.adjust_weights(analysis, feedback_count)
```

**Learning rate**: 0.1 (điều chỉnh từ từ)

**Update frequency**: Sau mỗi 10 feedbacks

---

### **STAGE 4: KNOWLEDGE GRAPH CONSTRUCTION**

**Module**: `knowledge_graph.py`

**Class**: `KnowledgeGraph`

#### 4.1. Tạo Document Entity
```python
doc_entity = DocumentEntity(
    document_id=document_id,
    title=file.filename,
    content=text[:1000]
)
kg.add_entity(doc_entity)
```

#### 4.2. Tạo VocabularyTerm & Sentence Entities
```python
for ctx in vocabulary_contexts:
    # VocabularyTerm entity
    term_entity = VocabularyTermEntity(
        term_id=f"term_{document_id}_{word}",
        word=word,
        score=ctx['finalScore'],
        features=ctx['features'],
        context_sentence=ctx['contextSentence'],
        sentence_id=ctx['sentenceId'],
        document_id=document_id
    )
    kg.add_entity(term_entity)
    
    # Sentence entity (nếu chưa tạo)
    sentence_entity = SentenceEntity(
        sentence_id=ctx['sentenceId'],
        text=context_sentence,
        position=...,
        document_id=document_id
    )
    kg.add_entity(sentence_entity)
```

#### 4.3. Tạo Relations
```python
# VocabularyTerm -> Sentence
kg.add_relation(RelationType.APPEARS_IN, term_id, sentence_id)

# Sentence -> Document
kg.add_relation(RelationType.BELONGS_TO, sentence_id, document_id)

# VocabularyTerm -> Document
kg.add_relation(RelationType.EXTRACTED_FROM, term_id, document_id)

# VocabularyTerm -> Context
kg.add_relation(RelationType.HAS_CONTEXT, term_id, sentence_id)
```

#### 4.4. Lưu Knowledge Graph
```python
kg.save_graph()
# Lưu vào: knowledge_graph_data/entities.json
#          knowledge_graph_data/relations.json
```

**Cấu trúc lưu trữ**:
```json
{
  "entities": {
    "term_doc_123_ontology": {
      "entity_type": "VocabularyTerm",
      "properties": {
        "word": "ontology",
        "score": 0.85,
        "context_sentence": "..."
      }
    }
  },
  "relations": [
    {
      "relation_type": "appears_in",
      "source_id": "term_doc_123_ontology",
      "target_id": "s1"
    }
  ]
}
```

---

### **STAGE 5: RAG SYSTEM (Flashcard Generation)**

**Module**: `rag_system.py`

**Class**: `RAGSystem`

#### 5.1. Generate Flashcards
```python
flashcards_result = rag_system.generate_flashcards(
    document_id=document_id,
    max_cards=min(max_flashcards, len(vocabulary_contexts))
)
```

#### 5.2. Quy trình tạo flashcard

**a) Query Knowledge Graph**
```python
# Lấy vocabulary terms từ document
vocab_terms = knowledge_graph.query_vocabulary_by_document(document_id)
```

**b) Chọn từ quan trọng**
```python
# Sắp xếp theo score, chọn top N
selected_terms = sorted(vocab_terms, key=lambda t: t.score, reverse=True)[:max_cards]
```

**c) Tạo flashcard cho mỗi từ**
```python
for term in selected_terms:
    flashcard = {
        'front': term.word,
        'back': term.context_sentence,
        'explanation': generate_explanation(term),
        'score': term.score
    }
```

**d) Sử dụng LLM (optional)**
```python
# Nếu có OpenAI API key
# Tạo definition, examples, usage notes bằng GPT-4
```

**Output**:
```python
{
  'results': [
    {
      'word': 'ontology',
      'definition': 'A formal representation of knowledge...',
      'context': '<b>Ontology</b> is a formal...',
      'example': 'The semantic web uses ontology...',
      'score': 0.85
    }
  ],
  'count': 30
}
```

---

### **STAGE 6: K-MEANS CLUSTERING (Optional)**

**Module**: `kmeans_clustering.py`

**Function**: `cluster_vocabulary_kmeans(vocabulary_list, text, use_elbow=True)`

#### 6.1. Tạo TF-IDF vectors cho từ vựng
```python
# Với mỗi từ, tìm câu chứa từ đó
word_documents = []
for word in words:
    word_sentences = [s for s in sentences if word in s]
    word_documents.append(' '.join(word_sentences[:3]))

# Vectorize
vectorizer = TfidfVectorizer(max_features=100, stop_words='english')
tfidf_matrix = vectorizer.fit_transform(word_documents)
```

#### 6.2. Elbow Method - Tìm K tối ưu
```python
inertias = []
k_values = range(2, max_k + 1)

for k in k_values:
    kmeans = KMeans(n_clusters=k, random_state=42)
    kmeans.fit(tfidf_matrix)
    inertias.append(kmeans.inertia_)

# Tìm elbow point (điểm gãy)
optimal_k = find_elbow_point(inertias, k_values)
```

**Elbow Point Detection**:
- Tính rate of change giữa các K
- Chọn K có sự thay đổi lớn nhất

#### 6.3. Vẽ đồ thị Elbow
```python
plot_elbow_curve(inertias, k_values, optimal_k, output_path)
# Lưu vào: cache/elbow_curve_{document_id}.png
```

**Đồ thị**:
- Trục X: Number of Clusters (K)
- Trục Y: Inertia (WCSS - Within-Cluster Sum of Squares)
- Đường đỏ: Optimal K

#### 6.4. Chạy K-Means với K tối ưu
```python
kmeans = KMeans(n_clusters=optimal_k, random_state=42, n_init=10)
cluster_labels = kmeans.fit_predict(tfidf_matrix)
```

#### 6.5. Tính Silhouette Score
```python
silhouette_avg = silhouette_score(tfidf_matrix, cluster_labels)
# Đánh giá chất lượng clustering
# Giá trị: -1 đến 1 (càng cao càng tốt)
```

#### 6.6. Tổ chức kết quả theo cluster
```python
clusters = {}
for idx, label in enumerate(cluster_labels):
    if label not in clusters:
        clusters[label] = []
    
    clusters[label].append({
        'word': vocabulary_list[idx]['word'],
        'score': vocabulary_list[idx]['score'],
        'cluster_id': int(label)
    })
```

#### 6.7. Cluster Explanation (NEW)
```python
# Sử dụng cluster_explanation.py
explanations = explain_clusters(cluster_documents, method='combined')

# Với mỗi cluster:
# - label: Tên cluster (VD: "Machine_Learning_Concepts")
# - keywords: Top keywords đại diện
# - description: Mô tả ngắn gọn
```

**Output**:
```python
{
  'clusters': [
    {
      'cluster_id': 0,
      'representative_word': 'machine learning',
      'representative_score': 0.95,
      'cluster_size': 5,
      'words': ['machine learning', 'deep learning', 'neural networks'],
      'label': 'AI_Technologies',
      'keywords': ['learning', 'neural', 'intelligence'],
      'description': 'Cluster về công nghệ AI và machine learning'
    }
  ],
  'n_clusters': 3,
  'silhouette_score': 0.65,
  'elbow_analysis': {
    'optimal_k': 3,
    'plot_path': 'cache/elbow_curve_doc_123.png'
  }
}
```

---

## RESPONSE CUỐI CÙNG

```json
{
  "success": true,
  "document_id": "doc_20260205_123456",
  "filename": "example.docx",
  "file_size": 5432,
  
  "vocabulary": [
    {
      "word": "ontology",
      "finalScore": 0.85,
      "contextSentence": "<b>Ontology</b> is a formal representation...",
      "sentenceId": "s1",
      "sentenceScore": 0.82,
      "explanation": "Được chọn vì: mật độ từ khóa cao, độ dài tối ưu",
      "features": {
        "tfidf": 0.9,
        "frequency": 0.3,
        "rake": 0.7,
        "yake": 0.6
      }
    }
  ],
  "vocabulary_count": 50,
  
  "flashcards": [
    {
      "word": "ontology",
      "definition": "A formal representation of knowledge...",
      "context": "<b>Ontology</b> is a formal...",
      "example": "The semantic web uses ontology...",
      "score": 0.85
    }
  ],
  "flashcards_count": 30,
  
  "stats": {
    "stage1": {
      "totalWords": 1234,
      "uniqueWords": 456,
      "sentences": 78,
      "method": "ensemble(freq+tfidf+rake+yake)",
      "weights": {
        "frequency": 0.15,
        "tfidf": 0.35,
        "rake": 0.25,
        "yake": 0.25
      }
    },
    "stage2": {
      "totalContexts": 50,
      "avgSentenceScore": 0.75
    },
    "stage4": {
      "entities_created": 152,
      "relations_created": 304,
      "vocabulary_terms": 50,
      "sentences": 51
    }
  },
  
  "adaptive_weights": {
    "frequency": 0.15,
    "tfidf": 0.35,
    "rake": 0.25,
    "yake": 0.25
  },
  
  "kmeans_clustering": {
    "clusters": [
      {
        "cluster_id": 0,
        "representative_word": "machine learning",
        "representative_score": 0.95,
        "cluster_size": 5,
        "words": ["machine learning", "deep learning", "neural networks"],
        "label": "AI_Technologies",
        "keywords": ["learning", "neural", "intelligence"]
      }
    ],
    "n_clusters": 3,
    "silhouette_score": 0.65,
    "elbow_analysis": {
      "optimal_k": 3,
      "plot_path": "cache/elbow_curve_doc_20260205_123456.png"
    }
  },
  
  "pipeline": "File Upload → STAGE 1-5 Complete Pipeline"
}
```

---

## THUẬT TOÁN SỬ DỤNG

### 1. **TF-IDF** (Term Frequency-Inverse Document Frequency)
- **Mục đích**: Đánh giá tầm quan trọng của từ trong document
- **Công thức**: `TF-IDF = TF * IDF`
  - `TF = count(term) / total_terms`
  - `IDF = log(total_docs / docs_containing_term)`
- **Ưu điểm**: Loại bỏ từ phổ biến, nổi bật từ quan trọng

### 2. **RAKE** (Rapid Automatic Keyword Extraction)
- **Mục đích**: Trích xuất keywords dựa trên co-occurrence
- **Công thức**: `RAKE = degree(word) / frequency(word)`
  - `degree` = tổng độ dài các phrases chứa word
- **Ưu điểm**: Không cần training data, nhanh

### 3. **YAKE** (Yet Another Keyword Extractor)
- **Mục đích**: Trích xuất keywords dựa trên statistical features
- **Features**: Position, frequency, relatedness, case
- **Ưu điểm**: Unsupervised, language-independent

### 4. **K-Means Clustering**
- **Mục đích**: Phân cụm từ vựng thành nhóm
- **Thuật toán**: Iterative clustering
- **Distance metric**: Euclidean distance trên TF-IDF vectors
- **Ưu điểm**: Đơn giản, hiệu quả, scalable

### 5. **Elbow Method**
- **Mục đích**: Tìm số cluster tối ưu (K)
- **Metric**: Inertia (WCSS - Within-Cluster Sum of Squares)
- **Cách hoạt động**: Tìm điểm gãy trên đồ thị K vs Inertia
- **Ưu điểm**: Trực quan, dễ hiểu

### 6. **Silhouette Score**
- **Mục đích**: Đánh giá chất lượng clustering
- **Công thức**: `s = (b - a) / max(a, b)`
  - `a` = khoảng cách trung bình trong cluster
  - `b` = khoảng cách trung bình đến cluster gần nhất
- **Giá trị**: -1 đến 1 (càng cao càng tốt)

---

## LƯU Ý QUAN TRỌNG

### Performance
- **max_words** giới hạn ở 100 để tránh quá tải
- **K-Means** chỉ chạy khi có ≥ 5 từ vựng
- **Elbow Method** test từ K=2 đến K=10

### File Handling
- File được lưu với timestamp để tránh trùng lặp
- Hỗ trợ UTF-8 encoding
- Validate text length (≥ 50 ký tự)

### Error Handling
- Graceful degradation nếu thiếu thư viện
- Fallback cho các features optional
- Clear error messages

### Scalability
- In-memory processing (phù hợp cho documents < 10MB)
- Có thể mở rộng sang database (Neo4j, MongoDB)
- Có thể mở rộng sang distributed processing (Spark)

---

## KẾT LUẬN

Hệ thống tải lên tài liệu là một **pipeline hoàn chỉnh** kết hợp:
- ✅ **NLP**: Tokenization, POS tagging, lemmatization
- ✅ **Machine Learning**: TF-IDF, K-Means, Elbow Method
- ✅ **Information Retrieval**: RAKE, YAKE
- ✅ **Knowledge Representation**: Ontology, Knowledge Graph
- ✅ **Adaptive Learning**: Feedback Loop, Weight Adjustment

Pipeline này có thể xử lý tài liệu tiếng Anh và tiếng Việt, tự động trích xuất từ vựng quan trọng, chọn ngữ cảnh tốt nhất, tạo flashcards, và phân cụm từ vựng thành các nhóm có ý nghĩa.
