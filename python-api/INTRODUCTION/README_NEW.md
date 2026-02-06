# 🎓 Visual Language Tutor - Python API

## 🚀 KHỞI ĐỘNG NHANH

### 1. Cài đặt

```bash
cd python-api
pip install -r requirements.txt
python download_nltk_data.py
python -m spacy download en_core_web_sm
```

### 2. Chạy Server

```bash
python main.py
```

Server chạy tại: **http://127.0.0.1:8000**

### 3. Mở Swagger UI

Truy cập: **http://127.0.0.1:8000/docs**

### 4. Upload Tài Liệu

1. Tìm endpoint **POST /api/upload-document**
2. Click **"Try it out"**
3. Chọn file (.txt, .pdf, .docx)
4. Click **"Execute"**
5. Xem kết quả!

## ✅ TÍNH NĂNG

### 📤 Upload & Extract
- Upload file (.txt, .pdf, .docx)
- Trích xuất từ vựng tự động
- Tạo flashcards
- Giải thích từ vựng

### 🧠 AI Pipeline (STAGE 1-5)
1. **Ensemble Extraction**: TF-IDF + RAKE + YAKE + Frequency
2. **Context Intelligence**: Chọn câu ngữ cảnh tốt nhất
3. **Feedback Loop**: Adaptive weights từ user feedback
4. **Knowledge Graph**: Xây dựng đồ thị tri thức
5. **RAG System**: Tạo flashcards với AI

## 📚 API ENDPOINTS

### Upload Document
```bash
POST /api/upload-document
```
Upload file và trích xuất từ vựng

### Smart Extract
```bash
POST /api/smart-vocabulary-extract
```
Trích xuất từ text (không cần upload)

### Generate Flashcards
```bash
POST /api/rag/generate-flashcards
```
Tạo flashcards từ document

### Explain Term
```bash
POST /api/rag/explain-term
```
Giải thích từ vựng với AI

### Find Related
```bash
POST /api/rag/find-related
```
Tìm từ liên quan

## 🧪 TESTING

```bash
# Test upload
python test_upload.py

# Test ensemble extractor
python test_ensemble_direct.py

# Test server
python test_server.py
```

## 📖 TÀI LIỆU

- **QUICK_START_UPLOAD.md**: Hướng dẫn upload chi tiết
- **UPLOAD_GUIDE.md**: Hướng dẫn đầy đủ
- **README_STAGE*.md**: Tài liệu từng stage

## 🎯 VÍ DỤ

### Python
```python
import requests

# Upload file
with open("document.txt", "rb") as f:
    files = {"file": ("document.txt", f)}
    data = {"max_words": 20, "language": "en"}
    
    response = requests.post(
        "http://127.0.0.1:8000/api/upload-document",
        files=files,
        data=data
    )
    
    result = response.json()
    print(f"✅ Extracted {result['vocabulary_count']} words!")
```

### curl
```bash
curl -X POST "http://127.0.0.1:8000/api/upload-document" \
  -F "file=@document.txt" \
  -F "max_words=20" \
  -F "language=en"
```

## 🐛 TROUBLESHOOTING

### Lỗi: "punkt_tab not found"
```bash
python download_nltk_data.py
```

### Lỗi: "en_core_web_sm not found"
```bash
python -m spacy download en_core_web_sm
```

### Lỗi: "PDF/DOCX support not available"
```bash
pip install PyPDF2 python-docx
```

## 📁 CẤU TRÚC

```
python-api/
├── main.py                      # FastAPI server
├── ensemble_extractor.py        # STAGE 1: Ensemble extraction
├── context_intelligence.py      # STAGE 2: Context selection
├── feedback_loop.py             # STAGE 3: Adaptive learning
├── knowledge_graph.py           # STAGE 4: Knowledge graph
├── rag_system.py                # STAGE 5: RAG system
├── requirements.txt             # Dependencies
├── test_upload.py               # Upload test
├── test_ensemble_direct.py      # Ensemble test
├── download_nltk_data.py        # NLTK data downloader
├── uploads/                     # Uploaded files
├── feedback_data/               # Feedback storage
└── knowledge_graph_data/        # Knowledge graph storage
```

## 🎉 HOÀN THÀNH!

Hệ thống đã sẵn sàng sử dụng! Bạn có thể:
- ✅ Upload tài liệu
- ✅ Trích xuất từ vựng tự động
- ✅ Tạo flashcards
- ✅ Giải thích từ vựng
- ✅ Sử dụng toàn bộ AI pipeline

---

**Made with ❤️ for language learners**
