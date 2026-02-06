# 📤 HƯỚNG DẪN UPLOAD TÀI LIỆU

## 🚀 Khởi động Server

```bash
cd python-api
python main.py
```

Server sẽ chạy tại: **http://127.0.0.1:8000**

## 📚 Swagger UI (Interactive API Docs)

Mở trình duyệt và truy cập:

```
http://127.0.0.1:8000/docs
```

## 🔧 Cài đặt thư viện bổ sung

Để hỗ trợ upload PDF và DOCX:

```bash
pip install PyPDF2 python-docx
```

Hoặc cài đặt lại toàn bộ:

```bash
pip install -r requirements.txt
```

## 📝 Các định dạng file được hỗ trợ

- ✅ `.txt` - Text files
- ✅ `.pdf` - PDF documents (cần PyPDF2)
- ✅ `.docx` - Word documents (cần python-docx)

## 🧪 Test Upload

### Cách 1: Sử dụng script test

```bash
cd python-api
python test_upload.py
```

### Cách 2: Sử dụng Swagger UI

1. Mở http://127.0.0.1:8000/docs
2. Tìm endpoint **POST /api/upload-document**
3. Click "Try it out"
4. Click "Choose File" và chọn file
5. Điền các tham số:
   - `max_words`: 20 (số từ vựng tối đa)
   - `language`: en (ngôn ngữ)
6. Click "Execute"

### Cách 3: Sử dụng curl

```bash
curl -X POST "http://127.0.0.1:8000/api/upload-document" \
  -F "file=@your_document.txt" \
  -F "max_words=20" \
  -F "language=en"
```

### Cách 4: Sử dụng Python requests

```python
import requests

# Upload file
with open("your_document.txt", "rb") as f:
    files = {"file": ("document.txt", f, "text/plain")}
    data = {
        "max_words": 20,
        "language": "en"
    }
    
    response = requests.post(
        "http://127.0.0.1:8000/api/upload-document",
        files=files,
        data=data
    )
    
    result = response.json()
    print(f"Vocabulary count: {result['vocabulary_count']}")
    print(f"Flashcards count: {result['flashcards_count']}")
```

## 📊 Response Format

```json
{
  "success": true,
  "document_id": "doc_20250203_143022",
  "filename": "document.txt",
  "file_size": 1234,
  "vocabulary": [
    {
      "word": "artificial",
      "finalScore": 0.856,
      "contextSentence": "<b>Artificial</b> intelligence is transforming...",
      "sentenceId": 0,
      "sentenceScore": 0.92,
      "explanation": "High relevance, clear context",
      "features": {
        "tfidf": 0.85,
        "frequency": 3,
        "pos": "ADJ"
      }
    }
  ],
  "vocabulary_count": 15,
  "flashcards": [
    {
      "word": "artificial",
      "definition": "Made by humans, not natural",
      "example": "Artificial intelligence mimics human thinking",
      "difficulty": "intermediate"
    }
  ],
  "flashcards_count": 10,
  "stats": {
    "stage1": {...},
    "stage2": {...},
    "stage4": {...}
  },
  "adaptive_weights": {
    "tfidf": 0.35,
    "frequency": 0.25,
    "pos": 0.20,
    "ngram": 0.20
  },
  "pipeline": "File Upload → STAGE 1-5 Complete Pipeline"
}
```

## 🎯 Các Endpoint Khác

### 1. Text Extraction (không cần upload file)

```bash
POST /api/smart-vocabulary-extract
```

Body:
```json
{
  "text": "Your text here...",
  "max_words": 20,
  "language": "en"
}
```

### 2. Adaptive Extraction (sử dụng feedback weights)

```bash
POST /api/smart-vocabulary-extract-adaptive
```

### 3. Complete Pipeline (text only)

```bash
POST /api/complete-pipeline
```

### 4. Generate Flashcards

```bash
POST /api/rag/generate-flashcards
```

Body:
```json
{
  "document_id": "doc_20250203_143022",
  "max_cards": 10
}
```

### 5. Explain Term

```bash
POST /api/rag/explain-term
```

Body:
```json
{
  "word": "artificial",
  "document_id": "doc_20250203_143022"
}
```

## 🐛 Troubleshooting

### Lỗi: "PDF/DOCX support not available"

**Giải pháp:**
```bash
pip install PyPDF2 python-docx
```

### Lỗi: "Text quá ngắn"

**Giải pháp:** File phải có ít nhất 50 ký tự

### Lỗi: "Cannot connect to API"

**Giải pháp:** Đảm bảo server đang chạy:
```bash
cd python-api
python main.py
```

### Lỗi: "File type not supported"

**Giải pháp:** Chỉ hỗ trợ .txt, .pdf, .docx

## 📁 File được lưu ở đâu?

- Uploaded files: `python-api/uploads/`
- Feedback data: `python-api/feedback_data/`
- Knowledge graph: `python-api/knowledge_graph_data/`
- Cache: `python-api/cache/`

## 🎓 Ví dụ hoàn chỉnh

```python
import requests
import json

# 1. Upload document
with open("article.txt", "rb") as f:
    files = {"file": ("article.txt", f)}
    data = {"max_words": 20, "language": "en"}
    
    response = requests.post(
        "http://127.0.0.1:8000/api/upload-document",
        files=files,
        data=data
    )
    
    result = response.json()
    document_id = result['document_id']
    print(f"✅ Uploaded! Document ID: {document_id}")

# 2. Get vocabulary
vocabulary = result['vocabulary']
print(f"\n📚 Found {len(vocabulary)} vocabulary words:")
for vocab in vocabulary[:5]:
    print(f"- {vocab['word']}: {vocab['finalScore']:.3f}")

# 3. Get flashcards
flashcards = result['flashcards']
print(f"\n🎴 Generated {len(flashcards)} flashcards:")
for card in flashcards[:3]:
    print(f"- {card['word']}: {card['definition']}")

# 4. Explain a term
response = requests.post(
    "http://127.0.0.1:8000/api/rag/explain-term",
    json={
        "word": vocabulary[0]['word'],
        "document_id": document_id
    }
)

explanation = response.json()
print(f"\n💡 Explanation: {explanation['explanation']}")
```

## 🎉 Hoàn thành!

Bây giờ bạn có thể:
- ✅ Upload tài liệu (.txt, .pdf, .docx)
- ✅ Trích xuất từ vựng tự động
- ✅ Tạo flashcards
- ✅ Giải thích từ vựng
- ✅ Tìm từ liên quan
- ✅ Sử dụng toàn bộ pipeline STAGE 1-5
