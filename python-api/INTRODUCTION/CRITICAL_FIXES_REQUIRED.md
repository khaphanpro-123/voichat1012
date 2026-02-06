# 🚨 CÁC LỖI NGHIÊM TRỌNG CẦN SỬA NGAY

## 📋 PHÂN TÍCH KẾT QUẢ HIỆN TẠI

### ❌ Lỗi 1: Vocabulary toàn từ đơn vô nghĩa

**Hiện tại**:
```json
{
  "vocabulary": [
    {"word": "lot", "score": 0.76},
    {"word": "lof", "score": 0.58},  // Lỗi chính tả
    {"word": "take", "score": 0.54},
    {"word": "yeu", "score": 0.51},  // Tiếng Việt
    {"word": "nhan", "score": 0.51}  // Tiếng Việt
  ]
}
```

**Vấn đề**:
- Toàn từ đơn không có nghĩa
- Có lỗi chính tả ("lof")
- Lẫn tiếng Việt ("yeu", "nhan")
- Không có phrases ("soft skills", "job opportunities")

**Mong đợi**:
```json
{
  "vocabulary": [
    {"phrase": "soft skills", "score": 0.85, "cluster": "personal_development"},
    {"phrase": "job opportunities", "score": 0.82, "cluster": "career"},
    {"phrase": "volunteer work", "score": 0.78, "cluster": "social_contribution"},
    {"phrase": "healthy lifestyle", "score": 0.75, "cluster": "health"}
  ]
}
```

---

### ❌ Lỗi 2: TF-IDF = 0 (không hoạt động)

**Hiện tại**:
```json
{
  "features": {
    "frequency": 0.032,
    "tfidf": 0,        // ❌ TF-IDF = 0!
    "rake": 3.72,
    "yake": 20.26
  }
}
```

**Nguyên nhân**:
```python
# ensemble_extractor.py - Line ~143
def calculate_tfidf(documents: List[str]) -> Dict[str, float]:
    vectorizer = TfidfVectorizer(...)
    tfidf_matrix = vectorizer.fit_transform(documents)
    
    # ❌ VẤN ĐỀ: documents chỉ có 1 phần tử!
    # documents = [full_text]  # Chỉ 1 document
    # → IDF = log(1/1) = 0
    # → TF-IDF = TF * 0 = 0
```

**Giải pháp**:
```python
# ✅ PHẢI LÀM: Chia thành nhiều documents
documents = split_into_sentences(text)  # Nhiều sentences
# documents = [sent1, sent2, sent3, ...]
# → IDF có nghĩa
# → TF-IDF hoạt động đúng
```

---

### ❌ Lỗi 3: K-means cluster WORDS (sai đối tượng)

**Hiện tại**:
```json
{
  "kmeans_clustering": {
    "clusters": [
      {
        "cluster_id": 0,
        "words": ["take", "part", "interesting"],  // ❌ Cluster words
        "label": "Products & Good & Buy"
      }
    ]
  }
}
```

**Vấn đề**:
- Cluster words thay vì sentences
- Words không có ngữ cảnh
- Label không chính xác

**Mong đợi**:
```json
{
  "kmeans_clustering": {
    "clusters": [
      {
        "cluster_id": 0,
        "theme": "Personal Development",
        "sentences": [
          "Studying abroad helps students improve soft skills.",
          "Teamwork and communication skills are essential."
        ],
        "representative_phrases": [
          "soft skills",
          "teamwork",
          "communication skills"
        ]
      }
    ]
  }
}
```

---

### ❌ Lỗi 4: Flashcards fallback (LLM không hoạt động)

**Hiện tại**:
```json
{
  "flashcards": [
    {
      "term": "lot",
      "meaning": "Academic term from DE Agree or disagree.docx",
      "example": "therefore, there are a lot of AAA...",
      "generation_method": "fallback"  // ❌ LLM failed
    }
  ]
}
```

**Vấn đề**:
- LLM không sinh được definition
- Fallback generic không có giá trị
- Term là từ đơn vô nghĩa

**Mong đợi**:
```json
{
  "flashcards": [
    {
      "term": "soft skills",
      "meaning": "Personal attributes that enable effective interaction and work with others",
      "example": "Studying abroad helps students improve soft skills like teamwork and communication.",
      "cluster": "personal_development",
      "generation_method": "llm_controlled"
    }
  ]
}
```

---

## 🔧 KẾ HOẠCH SỬA (THEO THỨ TỰ ƯU TIÊN)

### 🔴 FIX 1: TF-IDF trên sentences (QUAN TRỌNG NHẤT)

**File**: `ensemble_extractor.py`

**Vấn đề hiện tại**:
```python
def extract_vocabulary_ensemble(text: str, ...):
    # ❌ TF-IDF trên toàn bộ text (1 document)
    tfidf_scores = calculate_tfidf([text])  # Chỉ 1 document!
```

**Sửa thành**:
```python
def extract_vocabulary_ensemble_v2(text: str, ...):
    # ✅ BƯỚC 1: Split thành sentences
    sentences = sent_tokenize(text)
    
    # ✅ BƯỚC 2: TF-IDF trên sentences
    tfidf_scores = calculate_tfidf_on_sentences(sentences)
    
    # ✅ BƯỚC 3: Extract phrases (không phải words)
    phrases = extract_phrases_from_tfidf(tfidf_scores)
    
    return phrases
```

**Code chi tiết**:
```python
def calculate_tfidf_on_sentences(sentences: List[str]) -> Dict[str, float]:
    """
    TF-IDF trên nhiều sentences với n-gram (2-3)
    """
    vectorizer = TfidfVectorizer(
        max_features=1000,
        ngram_range=(2, 3),      # ✅ Bigram + Trigram
        min_df=2,                # ✅ Xuất hiện ít nhất 2 sentences
        max_df=0.8,
        stop_words='english',
        norm='l2'
    )
    
    # ✅ Fit trên NHIỀU sentences
    tfidf_matrix = vectorizer.fit_transform(sentences)
    feature_names = vectorizer.get_feature_names_out()
    
    # Aggregate scores
    mean_scores = tfidf_matrix.mean(axis=0).A1
    
    tfidf_scores = {}
    for idx, score in enumerate(mean_scores):
        if score > 0:
            phrase = feature_names[idx]
            # ✅ Chỉ giữ phrases (có dấu cách)
            if ' ' in phrase:
                tfidf_scores[phrase] = score
    
    return tfidf_scores
```

---

### 🔴 FIX 2: K-means cluster SENTENCES

**File mới**: `sentence_clustering_v2.py`

```python
"""
Sentence Clustering - Cluster sentences thành themes
"""

from typing import List, Dict
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.cluster import KMeans
from nltk.tokenize import sent_tokenize

def cluster_sentences_by_theme(
    text: str,
    n_clusters: int = 4
) -> Dict:
    """
    Cluster sentences thành các themes
    
    Returns:
        {
            'clusters': [
                {
                    'theme': 'Personal Development',
                    'sentences': [...],
                    'phrases': ['soft skills', 'teamwork']
                }
            ]
        }
    """
    # BƯỚC 1: Split sentences
    sentences = sent_tokenize(text)
    
    if len(sentences) < n_clusters * 2:
        return {'error': 'Not enough sentences'}
    
    # BƯỚC 2: TF-IDF vectorization
    vectorizer = TfidfVectorizer(
        max_features=500,
        ngram_range=(1, 2),
        stop_words='english'
    )
    
    tfidf_matrix = vectorizer.fit_transform(sentences)
    
    # BƯỚC 3: K-means clustering
    kmeans = KMeans(n_clusters=n_clusters, random_state=42)
    cluster_labels = kmeans.fit_predict(tfidf_matrix)
    
    # BƯỚC 4: Group sentences by cluster
    clusters = {}
    for idx, label in enumerate(cluster_labels):
        if label not in clusters:
            clusters[label] = []
        clusters[label].append(sentences[idx])
    
    # BƯỚC 5: Extract phrases per cluster
    results = []
    for cluster_id, cluster_sentences in clusters.items():
        # TF-IDF trên cluster này
        cluster_tfidf = TfidfVectorizer(
            ngram_range=(2, 3),
            max_features=10,
            stop_words='english'
        )
        
        cluster_matrix = cluster_tfidf.fit_transform(cluster_sentences)
        phrases = cluster_tfidf.get_feature_names_out()
        
        # Get scores
        scores = cluster_matrix.mean(axis=0).A1
        top_phrases = [
            {'phrase': phrases[i], 'score': float(scores[i])}
            for i in scores.argsort()[-5:][::-1]
        ]
        
        results.append({
            'cluster_id': cluster_id,
            'theme': generate_theme_name(top_phrases),
            'sentences': cluster_sentences,
            'representative_phrases': top_phrases
        })
    
    return {'clusters': results}


def generate_theme_name(phrases: List[Dict]) -> str:
    """
    Generate theme name từ top phrases
    """
    if not phrases:
        return "General"
    
    # Simple: Lấy phrase đầu tiên
    top_phrase = phrases[0]['phrase']
    
    # Capitalize
    return top_phrase.title().replace(' ', '_')
```

---

### 🔴 FIX 3: Lọc từ vựng tiếng Việt và lỗi chính tả

**File**: `ensemble_extractor.py`

**Thêm filter**:
```python
def is_valid_english_phrase(phrase: str) -> bool:
    """
    Kiểm tra phrase có phải tiếng Anh hợp lệ không
    """
    # Check 1: Chỉ chứa ký tự ASCII
    if not all(ord(c) < 128 or c.isspace() for c in phrase):
        return False
    
    # Check 2: Không phải stopwords đơn
    words = phrase.split()
    if len(words) == 1 and words[0] in ENGLISH_STOPWORDS:
        return False
    
    # Check 3: Spell check (optional)
    # Có thể dùng pyspellchecker
    
    return True


def filter_vietnamese_and_errors(phrases: List[str]) -> List[str]:
    """
    Lọc bỏ tiếng Việt và lỗi chính tả
    """
    filtered = []
    
    for phrase in phrases:
        # Loại tiếng Việt
        vietnamese_words = ['yeu', 'nhan', 'lof', 'thcih']
        if any(vn in phrase.lower() for vn in vietnamese_words):
            continue
        
        # Kiểm tra valid
        if is_valid_english_phrase(phrase):
            filtered.append(phrase)
    
    return filtered
```

---

### 🔴 FIX 4: LLM có kiểm soát từ vựng

**File**: `rag_system.py`

**Sửa generate_flashcards**:
```python
def generate_flashcards_controlled(
    self,
    cluster_phrases: List[Dict],
    max_cards: int = 30
) -> List[Dict]:
    """
    Generate flashcards với từ vựng được kiểm soát
    
    Args:
        cluster_phrases: [
            {
                'phrase': 'soft skills',
                'cluster': 'personal_development',
                'context': 'Studying abroad helps...'
            }
        ]
    """
    flashcards = []
    
    # Tạo vocabulary list
    all_phrases = [p['phrase'] for p in cluster_phrases]
    
    for phrase_data in cluster_phrases[:max_cards]:
        phrase = phrase_data['phrase']
        context = phrase_data.get('context', '')
        
        # LLM prompt với STRICT control
        prompt = f"""
Generate a flashcard for the term: "{phrase}"

STRICT RULES:
1. You MUST define "{phrase}" accurately
2. Use ONLY vocabulary from this list: {', '.join(all_phrases)}
3. DO NOT invent new terms
4. Keep definition concise (1-2 sentences)

Context: {context}

Output format:
Definition: [your definition]
Example: [example sentence using the term]
"""
        
        try:
            response = self.llm_client.chat.completions.create(
                model=self.llm_model,
                messages=[
                    {"role": "system", "content": "You are a vocabulary teacher. Follow instructions strictly."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.3,  # Low temperature for consistency
                max_tokens=150
            )
            
            content = response.choices[0].message.content
            
            # Parse response
            definition, example = self._parse_llm_response(content)
            
            flashcard = {
                'term': phrase,
                'meaning': definition,
                'example': example,
                'cluster': phrase_data.get('cluster', 'general'),
                'generation_method': 'llm_controlled'
            }
            
        except Exception as e:
            # Fallback: Template-based
            flashcard = {
                'term': phrase,
                'meaning': f"A key concept related to {phrase_data.get('cluster', 'general')}",
                'example': context,
                'cluster': phrase_data.get('cluster', 'general'),
                'generation_method': 'template'
            }
        
        flashcards.append(flashcard)
    
    return flashcards


def _parse_llm_response(self, content: str) -> Tuple[str, str]:
    """
    Parse LLM response thành definition và example
    """
    lines = content.strip().split('\n')
    
    definition = ""
    example = ""
    
    for line in lines:
        if line.startswith('Definition:'):
            definition = line.replace('Definition:', '').strip()
        elif line.startswith('Example:'):
            example = line.replace('Example:', '').strip()
    
    return definition, example
```

---

## 📊 KẾT QUẢ MONG ĐỢI SAU KHI SỬA

### ✅ Vocabulary (phrases có nghĩa)
```json
{
  "vocabulary": [
    {
      "phrase": "soft skills",
      "score": 0.85,
      "cluster": "personal_development",
      "tfidf": 0.42,  // ✅ TF-IDF hoạt động
      "context": "Studying abroad helps students improve soft skills."
    },
    {
      "phrase": "job opportunities",
      "score": 0.82,
      "cluster": "career",
      "tfidf": 0.38,
      "context": "They will have many job opportunities in big companies."
    }
  ]
}
```

### ✅ K-means (cluster sentences)
```json
{
  "kmeans_clustering": {
    "clusters": [
      {
        "cluster_id": 0,
        "theme": "Personal_Development",
        "sentences": [
          "Studying abroad helps students improve soft skills.",
          "Teamwork and communication skills are essential."
        ],
        "representative_phrases": [
          {"phrase": "soft skills", "score": 0.85},
          {"phrase": "communication skills", "score": 0.78}
        ]
      }
    ]
  }
}
```

### ✅ Flashcards (LLM controlled)
```json
{
  "flashcards": [
    {
      "term": "soft skills",
      "meaning": "Personal attributes that enable effective interaction and work with others, including communication, teamwork, and problem-solving abilities.",
      "example": "Studying abroad helps students improve soft skills like teamwork and communication.",
      "cluster": "personal_development",
      "generation_method": "llm_controlled"
    }
  ]
}
```

---

## ✅ CHECKLIST SỬA

- [ ] Fix 1: TF-IDF trên sentences (không phải 1 document)
- [ ] Fix 2: K-means cluster sentences (không phải words)
- [ ] Fix 3: Extract phrases per cluster
- [ ] Fix 4: Lọc tiếng Việt và lỗi chính tả
- [ ] Fix 5: LLM có kiểm soát từ vựng
- [ ] Fix 6: Flashcards từ cluster phrases

---

## 🚀 BƯỚC TIẾP THEO

Bạn muốn tôi:

**Option 1**: Implement từng fix (viết code đầy đủ)
**Option 2**: Tạo file mới hoàn chỉnh thay thế file cũ
**Option 3**: Chỉ viết documentation cho thesis

Bạn chọn option nào? 🎯
