# 🚀 HƯỚNG DẪN NHANH - UPLOAD TÀI LIỆU

## ✅ Hệ thống đã sẵn sàng!

Bạn có thể upload tài liệu và trích xuất từ vựng ngay bây giờ!

## 📋 Bước 1: Khởi động Server

```bash
cd python-api
python main.py
```

Server sẽ chạy tại: **http://127.0.0.1:8000**

## 🌐 Bước 2: Mở Swagger UI

Mở trình duyệt và truy cập:

```
http://127.0.0.1:8000/docs
```

Bạn sẽ thấy giao diện Swagger UI với tất cả các endpoint.

## 📤 Bước 3: Upload Tài Liệu

### Cách 1: Sử dụng Swagger UI (Dễ nhất!)

1. Tìm endpoint **POST /api/upload-document**
2. Click nút **"Try it out"**
3. Click **"Choose File"** và chọn file (.txt, .pdf, .docx)
4. Điền tham số:
   - `max_words`: 20 (số từ vựng muốn trích xuất)
   - `language`: en (ngôn ngữ: en hoặc vi)
5. Click **"Execute"**
6. Xem kết quả bên dưới!

### Cách 2: Sử dụng curl

```bash
curl -X POST "http://127.0.0.1:8000/api/upload-document" \
  -F "file=@your_document.txt" \
  -F "max_words=20" \
  -F "language=en"
```

### Cách 3: Sử dụng Python

```python
import requests

with open("your_document.txt", "rb") as f:
    files = {"file": ("document.txt", f, "text/plain")}
    data = {"max_words": 20, "language": "en"}
    
    response = requests.post(
        "http://127.0.0.1:8000/api/upload-document",
        files=files,
        data=data
    )
    
    result = response.json()
    print(f"✅ Extracted {result['vocabulary_count']} words!")
    
    for vocab in result['vocabulary'][:5]:
        print(f"- {vocab['word']}: {vocab['finalScore']:.3f}")
```

## 📊 Kết quả bạn nhận được

```json
{
  "success": true,
  "document_id": "doc_20260203_135355",
  "filename": "document.txt",
  "vocabulary_count": 13,
  "vocabulary": [
    {
      "word": "learning",
      "finalScore": 1.013,
      "contextSentence": "Deep <b>learning</b> uses neural networks...",
      "explanation": "High relevance, clear context"
    }
  ],
  "flashcards_count": 10,
  "flashcards": [
    {
      "word": "learning",
      "definition": "The process of acquiring knowledge",
      "example": "Machine learning enables computers to learn"
    }
  ]
}
```

## 🎯 Các Endpoint Khác

### 1. Trích xuất từ text (không cần upload)

```
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

### 2. Tạo flashcards

```
POST /api/rag/generate-flashcards
```

Body:
```json
{
  "document_id": "doc_20260203_135355",
  "max_cards": 10
}
```

### 3. Giải thích từ vựng

```
POST /api/rag/explain-term
```

Body:
```json
{
  "word": "learning",
  "document_id": "doc_20260203_135355"
}
```

### 4. Tìm từ liên quan

```
POST /api/rag/find-related
```

Body:
```json
{
  "word": "learning",
  "max_terms": 5
}
```

## 🧪 Test Nhanh

Chạy script test:

```bash
cd python-api
python test_upload.py
```

Bạn sẽ thấy:
```
✅ API is online!
✅ Upload successful!
Document ID: doc_20260203_135355
Vocabulary count: 13
Flashcards count: 10

Top 5 vocabulary words:
1. learning (score: 1.013)
2. machine (score: 0.611)
3. language (score: 0.565)
...
```

## 📁 File được lưu ở đâu?

- **Uploaded files**: `python-api/uploads/`
- **Feedback data**: `python-api/feedback_data/`
- **Knowledge graph**: `python-api/knowledge_graph_data/`

## 🎓 Pipeline Hoàn Chỉnh (STAGE 1-5)

Khi bạn upload file, hệ thống tự động chạy:

1. **STAGE 1**: Ensemble Extraction (TF-IDF + RAKE + YAKE + Frequency)
2. **STAGE 2**: Context Intelligence (chọn câu ngữ cảnh tốt nhất)
3. **STAGE 3**: Feedback Loop (sử dụng adaptive weights)
4. **STAGE 4**: Knowledge Graph (xây dựng đồ thị tri thức)
5. **STAGE 5**: RAG System (tạo flashcards tự động)

## 🎉 Hoàn thành!

Bây giờ bạn có thể:
- ✅ Upload tài liệu (.txt, .pdf, .docx)
- ✅ Trích xuất từ vựng tự động với thuật toán ensemble
- ✅ Nhận flashcards được tạo tự động
- ✅ Giải thích từ vựng với AI
- ✅ Tìm từ liên quan
- ✅ Sử dụng toàn bộ pipeline STAGE 1-5

## 🐛 Gặp vấn đề?

### Server không chạy?
```bash
cd python-api
python main.py
```

### Thiếu thư viện?
```bash
pip install -r requirements.txt
python download_nltk_data.py
python -m spacy download en_core_web_sm
```

### Không trích xuất được từ vựng?
- Đảm bảo file có ít nhất 50 ký tự
- Kiểm tra định dạng file (.txt, .pdf, .docx)
- Xem log trong terminal

---

**Chúc bạn sử dụng thành công! 🎊**
