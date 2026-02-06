# ĐỀ XUẤT PIPELINE XỬ LÝ TÀI LIỆU HOÀN CHỈNH

## I. MỤC TIÊU HỆ THỐNG (Problem & Objective)

### Bài toán

Người dùng tải lên tài liệu (PDF scan / ảnh, tiếng Anh). Hệ thống cần:

1. **Trích xuất nội dung văn bản** từ tài liệu không có cấu trúc
2. **Hiểu nội dung tài liệu** thông qua phân tích ngữ nghĩa
3. **Phân nhóm tài liệu theo chủ đề** một cách tự động
4. **Trích cụm từ đại diện** cho từng nhóm để giải thích nội dung
5. **Hỗ trợ tìm kiếm theo ngữ nghĩa** để người dùng dễ dàng truy xuất thông tin

### Mục tiêu

Đề xuất một **pipeline xử lý tài liệu tự động** kết hợp:

- **OCR** (Optical Character Recognition)
- **TF-IDF với n-gram** (Term Frequency-Inverse Document Frequency)
- **K-means Clustering** với **Elbow Method**
- **Keyword/Phrase Extraction**
- **Embedding ngữ nghĩa** (Semantic Embeddings)

---

## II. KIẾN TRÚC & PIPELINE ĐỀ XUẤT (Proposed Pipeline)

### 🔷 Tổng quan Pipeline

```
User upload document
        ↓
    OCR (BƯỚC 1)
        ↓
Text preprocessing (BƯỚC 2)
        ↓
TF-IDF (n-gram) (BƯỚC 3)
        ↓
Elbow → chọn K (BƯỚC 4)
        ↓
K-means clustering (BƯỚC 5)
        ↓
Keyword / Phrase extraction (BƯỚC 6)
(giải thích cluster)
        ↓
Embedding (BƯỚC 7)
(chạy song song)
        ↓
Semantic search / similarity (BƯỚC 8)
```

---

## III. CHI TIẾT TỪNG BƯỚC

### 🔹 BƯỚC 0 – Người dùng tải tài liệu

**Input:**
- PDF scan
- Ảnh (jpg, png)
- Văn bản tiếng Anh

**Output:**
- File thô

**📌 Lưu ý:**
- Chưa xử lý NLP ở bước này
- Chỉ lưu trữ file và chuẩn bị cho OCR

---

### 🔹 BƯỚC 1 – OCR (Optical Character Recognition)

**Mục đích:**
- Chuyển dữ liệu không cấu trúc (ảnh) → text

**Xử lý:**
- Dùng **Tesseract OCR** / **PaddleOCR** / **EasyOCR**
- Nhận diện tiếng Anh
- Xử lý PDF scan và ảnh

**Công cụ:**
- **Tesseract OCR** (tiếng Anh) - Khuyến nghị
- **PaddleOCR** (đa ngôn ngữ)
- **EasyOCR** (dễ sử dụng)

**Đầu vào:**
- PDF scan / Image files

**Đầu ra:**
- Raw text (chưa sạch)

**📌 Lưu ý:**
OCR có thể:
- Sai chính tả
- Dính ký tự rác
- Cần làm sạch ở bước tiếp theo

**Code mẫu:**
```python
import pytesseract
from PIL import Image

def extract_text_from_image(image_path):
    """Extract text from image using Tesseract OCR"""
    image = Image.open(image_path)
    text = pytesseract.image_to_string(image, lang='eng')
    return text
```

---

### 🔹 BƯỚC 2 – Làm sạch & chuẩn hóa văn bản (Text Preprocessing)

**Mục đích:**
- Giảm nhiễu từ OCR
- Chuẩn bị cho vector hóa

**Các bước xử lý:**

1. **Lowercase** - Chuyển về chữ thường
2. **Remove punctuation** - Loại bỏ dấu câu
3. **Remove special characters** - Loại bỏ ký tự đặc biệt
4. **Remove numbers** (nếu không cần) - Loại bỏ số
5. **Remove stopwords** (English) - Loại bỏ từ dừng
6. **Lemmatization** (khuyến nghị) - Chuẩn hóa từ về dạng gốc
7. **Remove short tokens** - Loại bỏ token quá ngắn

**Công cụ:**
- **NLTK** (Natural Language Toolkit)
- **spaCy** (Industrial-strength NLP)

**Ví dụ:**
```
Input:  "Machine Learning, is widely used!"
Output: "machine learning widely use"
```

**Đầu ra:**
- Clean text

**📌 Lưu ý:**
- Bước này ảnh hưởng **RẤT LỚN** tới chất lượng TF-IDF
- Lemmatization tốt hơn Stemming (giữ nghĩa)

**Code mẫu:**
```python
import nltk
from nltk.corpus import stopwords
from nltk.stem import WordNetLemmatizer
import re

def preprocess_text(text):
    """Clean and normalize text"""
    # Lowercase
    text = text.lower()
    
    # Remove punctuation and special characters
    text = re.sub(r'[^\w\s]', ' ', text)
    
    # Remove numbers
    text = re.sub(r'\d+', '', text)
    
    # Tokenize
    tokens = text.split()
    
    # Remove stopwords
    stop_words = set(stopwords.words('english'))
    tokens = [t for t in tokens if t not in stop_words]
    
    # Lemmatization
    lemmatizer = WordNetLemmatizer()
    tokens = [lemmatizer.lemmatize(t) for t in tokens]
    
    # Remove short tokens
    tokens = [t for t in tokens if len(t) > 2]
    
    return ' '.join(tokens)
```

---

### 🔹 BƯỚC 3 – Trích đặc trưng bằng TF-IDF (ưu tiên cụm từ)

**🎯 Mục đích:**
- Biểu diễn tài liệu thành vector số
- Giữ ngữ cảnh bằng cụm từ (phrase)

**Lý do chọn TF-IDF:**
- Phù hợp với clustering
- Dễ giải thích
- Hiệu quả với tập tài liệu không nhãn
- Giữ được ngữ cảnh với n-gram

**📐 Cấu hình đúng:**

```python
TfidfVectorizer(
    ngram_range=(1, 2),    # unigram + bigram
    min_df=2,              # loại cụm quá hiếm
    max_df=0.8,            # loại cụm quá phổ biến
    stop_words='english',  # loại stopwords
    norm='l2'              # chuẩn hóa vector
)
```

**Ý nghĩa tham số:**
- `ngram_range=(1, 2)`: Giữ "machine learning" thay vì tách thành "machine" + "learning"
- `min_df=2`: Loại cụm xuất hiện < 2 lần (quá hiếm)
- `max_df=0.8`: Loại cụm xuất hiện > 80% documents (quá phổ biến)
- `norm='l2'`: Chuẩn hóa vector cho K-means

**Công cụ:**
- **scikit-learn** (TfidfVectorizer)

**Đầu ra:**
- TF-IDF matrix (N_documents × N_features)

**📌 Lưu ý:**
- N-gram giữ ngữ cảnh tốt hơn unigram
- Chuẩn hóa L2 quan trọng cho K-means

**Code mẫu:**
```python
from sklearn.feature_extraction.text import TfidfVectorizer

def create_tfidf_matrix(documents):
    """Create TF-IDF matrix with n-grams"""
    vectorizer = TfidfVectorizer(
        ngram_range=(1, 2),
        min_df=2,
        max_df=0.8,
        stop_words='english',
        norm='l2'
    )
    
    tfidf_matrix = vectorizer.fit_transform(documents)
    feature_names = vectorizer.get_feature_names_out()
    
    return tfidf_matrix, vectorizer, feature_names
```

---

### 🔹 BƯỚC 4 – Xác định số cụm K bằng Elbow

**🎯 Mục đích:**
- Tránh chọn K cảm tính
- Tìm số cluster hợp lý

**Cách làm:**
1. Chạy K-means với K = 2 → 10
2. Tính WCSS (Within-Cluster Sum of Squares) cho mỗi K
3. Vẽ đồ thị Elbow
4. Chọn điểm "gãy" (elbow point)

**Công cụ:**
- **scikit-learn** (KMeans)
- **matplotlib** (vẽ đồ thị)

**Đầu ra:**
- Giá trị K tối ưu

**📌 Lưu ý:**
- Elbow là heuristic → có thể kết hợp domain knowledge
- Điểm gãy = nơi WCSS giảm chậm lại đáng kể

**Code mẫu:**
```python
from sklearn.cluster import KMeans
import matplotlib.pyplot as plt

def find_optimal_k_elbow(tfidf_matrix, max_k=10):
    """Find optimal K using Elbow Method"""
    wcss = []
    k_values = range(2, max_k + 1)
    
    for k in k_values:
        kmeans = KMeans(n_clusters=k, random_state=42, n_init=10)
        kmeans.fit(tfidf_matrix)
        wcss.append(kmeans.inertia_)
    
    # Plot Elbow curve
    plt.figure(figsize=(10, 6))
    plt.plot(k_values, wcss, 'bo-', linewidth=2, markersize=8)
    plt.xlabel('Number of Clusters (K)')
    plt.ylabel('WCSS (Within-Cluster Sum of Squares)')
    plt.title('Elbow Method for Optimal K')
    plt.grid(True, alpha=0.3)
    plt.savefig('elbow_curve.png', dpi=150)
    
    # Find elbow point (simplified)
    changes = [wcss[i] - wcss[i+1] for i in range(len(wcss)-1)]
    optimal_k = k_values[changes.index(max(changes)) + 1]
    
    return optimal_k, wcss, k_values
```

---

### 🔹 BƯỚC 5 – Phân cụm tài liệu bằng K-means

**🎯 Mục đích:**
- Gom tài liệu có nội dung tương tự

**Cách làm:**
- **Input**: TF-IDF matrix
- **K**: K tối ưu (từ Elbow)
- **Khoảng cách**: Cosine (hoặc Euclidean sau normalize)

**Thuật toán:**
- **K-means Clustering**

**Công cụ:**
- **scikit-learn** (KMeans)

**Đầu ra:**
- Document ID → Cluster ID

**📌 Lưu ý:**
- Mỗi tài liệu thuộc đúng 1 cluster
- Cosine similarity phù hợp với text data

**Code mẫu:**
```python
from sklearn.cluster import KMeans

def cluster_documents(tfidf_matrix, n_clusters):
    """Cluster documents using K-means"""
    kmeans = KMeans(
        n_clusters=n_clusters,
        random_state=42,
        n_init=10,
        max_iter=300
    )
    
    cluster_labels = kmeans.fit_predict(tfidf_matrix)
    
    return cluster_labels, kmeans
```

---

### 🔹 BƯỚC 6 – Trích cụm từ đại diện cho từng cluster

**🎯 Mục đích:**
- Hiểu cluster nói về cái gì
- Gán nhãn / hiển thị cho người dùng
- Cải thiện UX

**Cách làm (2 lựa chọn):**

#### 🔹 Cách A – TF-IDF top phrase (khuyến nghị)

1. Lấy trung bình TF-IDF của các document trong cluster
2. Chọn top bigram/trigram có TF-IDF cao nhất

**Ưu điểm:**
- Nhất quán với phương pháp clustering
- Nhanh và hiệu quả
- Dễ giải thích

#### 🔹 Cách B – RAKE / YAKE

1. Gộp text các document trong cluster
2. Trích phrase ngữ nghĩa bằng RAKE hoặc YAKE

**Ưu điểm:**
- Hiểu ngữ nghĩa tốt hơn
- Trích được cụm từ phức tạp

**Công cụ:**
- **scikit-learn** (TF-IDF)
- **RAKE** (Rapid Automatic Keyword Extraction)
- **YAKE** (Yet Another Keyword Extractor)

**Đầu ra:**
- Cluster label / Top phrases

**📌 Lưu ý:**
- Bước này **KHÔNG dùng để clustering**
- Chỉ dùng để **giải thích** cluster đã tạo

**Code mẫu:**
```python
def get_top_phrases_per_cluster(tfidf_matrix, cluster_labels, feature_names, n_clusters, top_n=5):
    """Extract top phrases for each cluster"""
    cluster_phrases = {}
    
    for cluster_id in range(n_clusters):
        # Get documents in this cluster
        cluster_docs = tfidf_matrix[cluster_labels == cluster_id]
        
        # Average TF-IDF scores
        avg_tfidf = cluster_docs.mean(axis=0).A1
        
        # Get top phrases
        top_indices = avg_tfidf.argsort()[-top_n:][::-1]
        top_phrases = [feature_names[i] for i in top_indices]
        
        cluster_phrases[cluster_id] = top_phrases
    
    return cluster_phrases
```

---

### 🔹 BƯỚC 7 – Embedding ngữ nghĩa (chạy SONG SONG)

**🎯 Mục đích:**
- Hiểu ngữ nghĩa sâu
- Hỗ trợ tìm kiếm và so sánh

**Lý do không thay TF-IDF:**
- **TF-IDF**: Clustering + giải thích (dựa trên từ khóa)
- **Embedding**: Semantic understanding (dựa trên ngữ nghĩa)
- Hai phương pháp **bổ trợ** nhau, không thay thế

**Dữ liệu vào:**
- Clean text của từng document

**Model:**
- **Sentence-BERT** (all-MiniLM-L6-v2)
- hoặc **OpenAI Embedding API** (text-embedding-ada-002)

**Output:**
- Embedding vector 384–1536 chiều

**Công cụ:**
- **Sentence-Transformers** (Sentence-BERT)
- **OpenAI API** (Embeddings)

**Đầu ra:**
- Embedding vector cho mỗi document

**📌 Lưu ý:**
- Embedding **KHÔNG chạy sau K-means**
- Chạy **SONG SONG** với TF-IDF pipeline

**Code mẫu:**
```python
from sentence_transformers import SentenceTransformer

def create_embeddings(documents):
    """Create semantic embeddings for documents"""
    model = SentenceTransformer('all-MiniLM-L6-v2')
    embeddings = model.encode(documents, show_progress_bar=True)
    return embeddings
```

---

### 🔹 BƯỚC 8 – Ứng dụng embedding

#### 🔹 8.1 Semantic Search

**Cách làm:**
```
User query 
    → Embedding(query) 
    → Cosine similarity với document embeddings
    → Top documents
```

**Ưu điểm:**
- Không cần keyword trùng khớp 100%
- Hiểu ý nghĩa câu hỏi

#### 🔹 8.2 So sánh tài liệu

**Ứng dụng:**
- Tìm tài liệu tương tự
- Phát hiện trùng nội dung
- Recommendation system

#### 🔹 8.3 (Nâng cao) RAG

**Retrieval-Augmented Generation:**
- Embedding → Vector DB
- LLM trả lời câu hỏi dựa trên tài liệu

**Code mẫu:**
```python
from sklearn.metrics.pairwise import cosine_similarity

def semantic_search(query, documents, embeddings, top_k=5):
    """Search documents using semantic similarity"""
    model = SentenceTransformer('all-MiniLM-L6-v2')
    
    # Encode query
    query_embedding = model.encode([query])
    
    # Calculate similarity
    similarities = cosine_similarity(query_embedding, embeddings)[0]
    
    # Get top results
    top_indices = similarities.argsort()[-top_k:][::-1]
    
    results = [
        {
            'document': documents[i],
            'similarity': similarities[i],
            'rank': rank + 1
        }
        for rank, i in enumerate(top_indices)
    ]
    
    return results
```

---

## IV. SƠ ĐỒ TỔNG HỢP CUỐI CÙNG

```
Upload file
    ↓
OCR (BƯỚC 1)
    ↓
Text preprocessing (BƯỚC 2)
    ↓
TF-IDF (n-gram) (BƯỚC 3)
    ↓
Elbow (BƯỚC 4) → chọn K
    ↓
K-means (BƯỚC 5) → Cluster
    ↓
Top phrase (BƯỚC 6) → Label cluster
(TF-IDF / RAKE)
    ↓
Embedding (BƯỚC 7) → Search / Similarity / RAG
(chạy song song)
```

---

## V. CÔNG CỤ & CÔNG NGHỆ SỬ DỤNG

| Thành phần | Công cụ |
|------------|---------|
| **OCR** | Tesseract / PaddleOCR |
| **Preprocessing** | NLTK / spaCy |
| **TF-IDF** | scikit-learn |
| **Clustering** | KMeans (scikit-learn) |
| **Elbow** | matplotlib |
| **Keyword** | TF-IDF / RAKE / YAKE |
| **Embedding** | Sentence-BERT / OpenAI |
| **Similarity** | Cosine similarity |

---

## VI. 3 ĐIỀU QUAN TRỌNG PHẢI NHỚ

### 1. TF-IDF và Embedding KHÔNG thay nhau, mà bổ trợ

- **TF-IDF**: Phân cụm dựa trên từ khóa, dễ giải thích
- **Embedding**: Hiểu ngữ nghĩa sâu, tìm kiếm thông minh

### 2. Clustering ≠ Keyword Extraction

- **Clustering**: Gom tài liệu thành nhóm
- **Keyword Extraction**: Giải thích nội dung nhóm

### 3. Embedding là Feature Extraction, không phải bước sau cùng

- Embedding chạy **SONG SONG** với TF-IDF
- Không phụ thuộc vào kết quả clustering

---

## VII. VÍ DỤ END-TO-END

### 🔹 BƯỚC 0 – Dữ liệu gốc (sau OCR)

**📄 Document 1:**
```
Machine learning is widely used in medical image analysis. 
Deep learning models improve diagnosis accuracy.
```

**📄 Document 2:**
```
Artificial intelligence and machine learning are applied in healthcare systems. 
Medical data analysis is important.
```

**📄 Document 3:**
```
Football players train every day. 
The football team won the championship.
```

### 🔹 BƯỚC 1 – Text Preprocessing

**✅ Clean text:**

**D1:**
```
machine learning widely use medical image analysis deep learning model improve diagnosis accuracy
```

**D2:**
```
artificial intelligence machine learning apply healthcare system medical data analysis important
```

**D3:**
```
football player train every day football team win championship
```

### 🔹 BƯỚC 2 – TF-IDF với n-gram (1,2)

**📊 TF-IDF (minh họa):**

| Phrase | D1 | D2 | D3 |
|--------|----|----|-----|
| machine learning | 0.45 | 0.42 | 0 |
| deep learning | 0.38 | 0 | 0 |
| medical image | 0.33 | 0 | 0 |
| healthcare system | 0 | 0.36 | 0 |
| medical data | 0 | 0.31 | 0 |
| football player | 0 | 0 | 0.41 |
| football team | 0 | 0 | 0.39 |

**👉 Ngữ cảnh được giữ nguyên** (machine learning ≠ machine + learning)

### 🔹 BƯỚC 3 – Elbow (chọn K)

| K | WCSS |
|---|------|
| 1 | 980 |
| 2 | 210 |
| 3 | 190 |
| 4 | 175 |

**📉 Giảm mạnh nhất từ K=1 → K=2, sau đó giảm rất ít.**

**👉 Chọn K = 2**

### 🔹 BƯỚC 4 – K-means Clustering

**🎯 Kết quả phân cụm:**

**Cluster 0 – AI / Healthcare:**
- Document 1
- Document 2

**Cluster 1 – Sports:**
- Document 3

**👉 Kết quả đúng trực giác con người**

### 🔹 BƯỚC 5 – Đặt tên cluster

**Cluster 0 – Top phrases:**
- machine learning
- medical image analysis
- deep learning
- healthcare system

**👉 Label: AI in Healthcare**

**Cluster 1 – Top phrases:**
- football player
- football team
- championship

**👉 Label: Football / Sports**

### 🔹 BƯỚC 6 – Embedding (chạy SONG SONG)

**Similarity (cosine):**

| So sánh | Similarity |
|---------|------------|
| D1 ↔ D2 | 0.89 |
| D1 ↔ D3 | 0.12 |
| D2 ↔ D3 | 0.10 |

**👉 Embedding hiểu:**
- D1 & D2 cùng ngữ nghĩa
- D3 khác hoàn toàn

### 🔹 BƯỚC 7 – Semantic Search

**User query:**
```
AI applications in medical diagnosis
```

**Embedding(query) → so với document embeddings**

**👉 Kết quả trả về:**
1. Document 1 (similarity: 0.87)
2. Document 2 (similarity: 0.82)

**❌ Không cần keyword trùng khớp 100%**

---

## VIII. PROMPT MẪU (DÙNG VỚI LLM)

### 🔹 Prompt 1 – Làm sạch văn bản OCR

```
You are given OCR-extracted English text that may contain noise and formatting errors.

Clean the text by:
- Removing OCR artifacts
- Fixing obvious spacing errors
- Keeping the original meaning

Return only the cleaned text.

Input text:
[OCR_TEXT_HERE]
```

### 🔹 Prompt 2 – Đặt tên cho cluster

```
Given the following key phrases extracted from a document cluster:

- machine learning
- medical image analysis
- deep learning
- healthcare system

Provide a concise and meaningful topic label (max 5 words) for this cluster.
```

### 🔹 Prompt 3 – Tóm tắt nội dung cluster

```
You are given a set of documents belonging to the same topic.

Summarize the main theme of these documents in 2–3 sentences.
Focus on the core idea.

Documents:
[DOCUMENT_LIST_HERE]
```

### 🔹 Prompt 4 – Hỗ trợ semantic search (RAG-ready)

```
Answer the question using only the information provided in the retrieved documents.

If the answer is not present, say "Information not found in the documents".

Question: [USER_QUESTION]

Retrieved documents:
[DOCUMENT_LIST_HERE]
```

---

## IX. TÓM TẮT ĐỀ XUẤT (1 đoạn cho báo cáo)

Hệ thống đề xuất một **pipeline xử lý tài liệu tự động** bao gồm **OCR**, **tiền xử lý văn bản**, **trích xuất đặc trưng bằng TF-IDF với n-gram** để phân cụm tài liệu thông qua **K-means**. Thuật toán **Elbow** được sử dụng nhằm xác định số lượng cụm tối ưu. Đồng thời, các **vector embedding ngữ nghĩa** được xây dựng song song để hỗ trợ các tác vụ **tìm kiếm và so sánh nội dung**. Việc kết hợp TF-IDF và embedding giúp hệ thống vừa đảm bảo khả năng diễn giải, vừa nắm bắt được ngữ nghĩa sâu của tài liệu.

---

## X. CÂU CHỐT (RẤT HAY DÙNG KHI BẢO VỆ)

> **TF-IDF với n-gram** được sử dụng để biểu diễn tài liệu ở mức từ và cụm từ nhằm phục vụ **phân cụm và diễn giải nội dung**, trong khi **embedding** được xây dựng song song để hỗ trợ các tác vụ **ngữ nghĩa** như tìm kiếm và so sánh tài liệu.

---

## XI. CHECKLIST TRIỂN KHAI

### Giai đoạn 1: Chuẩn bị dữ liệu
- [ ] Cài đặt Tesseract OCR
- [ ] Cài đặt NLTK và download stopwords
- [ ] Chuẩn bị tập tài liệu test

### Giai đoạn 2: TF-IDF & Clustering
- [ ] Implement text preprocessing
- [ ] Tạo TF-IDF matrix với n-gram
- [ ] Implement Elbow Method
- [ ] Chạy K-means clustering
- [ ] Trích xuất top phrases

### Giai đoạn 3: Embedding & Search
- [ ] Cài đặt Sentence-Transformers
- [ ] Tạo embeddings cho documents
- [ ] Implement semantic search
- [ ] Test similarity calculation

### Giai đoạn 4: Đánh giá & Tối ưu
- [ ] Đánh giá chất lượng clustering
- [ ] Kiểm tra top phrases có ý nghĩa
- [ ] Test semantic search accuracy
- [ ] Tối ưu tham số

---

**Tác giả**: Kiro AI Assistant  
**Ngày**: 2026-02-03  
**Version**: 1.0  
**Status**: ✅ HOÀN CHỈNH
