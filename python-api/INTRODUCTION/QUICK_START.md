# Quick Start Guide - Python API Server

## 🚀 Khởi Động Server

### Windows
```bash
cd python-api
start_server.bat
```

### Linux/Mac
```bash
cd python-api
python -m uvicorn main_simple:app --reload --port 8000
```

Server sẽ chạy tại: **http://localhost:8000**

---

## 📚 API Documentation

Sau khi server chạy, truy cập:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

---

## 🧪 Test API

### 1. Health Check
```bash
curl http://localhost:8000/
```

### 2. Trích Xuất Từ Vựng (STAGE 1 + 2)
```bash
curl -X POST http://localhost:8000/api/smart-vocabulary-extract \
  -H "Content-Type: application/json" \
  -d "{\"text\": \"Machine learning is a subset of artificial intelligence. It enables computers to learn from data.\", \"max_words\": 10, \"language\": \"en\"}"
```

### 3. Submit Feedback (STAGE 3)
```bash
curl -X POST http://localhost:8000/api/vocabulary-feedback \
  -H "Content-Type: application/json" \
  -d "{\"word\": \"algorithm\", \"document_id\": \"doc_001\", \"user_id\": \"user_123\", \"scores\": {\"tfidf\": 0.85, \"frequency\": 0.30, \"pos\": 0.90}, \"final_score\": 0.82, \"user_action\": \"keep\"}"
```

### 4. Generate Flashcards (STAGE 5)
```bash
curl -X POST http://localhost:8000/api/rag/generate-flashcards \
  -H "Content-Type: application/json" \
  -d "{\"word\": \"algorithm\", \"max_cards\": 5}"
```

### 5. Complete Pipeline (STAGE 1-5)
```bash
curl -X POST http://localhost:8000/api/complete-pipeline \
  -H "Content-Type: application/json" \
  -d "{\"text\": \"Machine learning is a subset of artificial intelligence.\", \"max_words\": 10, \"language\": \"en\"}"
```

---

## 📊 Tất Cả Endpoints

| Endpoint | Method | Mô tả |
|----------|--------|-------|
| `/` | GET | Health check |
| `/api/smart-vocabulary-extract` | POST | Trích xuất từ vựng (STAGE 1+2) |
| `/api/smart-vocabulary-extract-adaptive` | POST | Trích xuất với adaptive weights (STAGE 3) |
| `/api/vocabulary-feedback` | POST | Submit feedback |
| `/api/vocabulary-feedback/statistics` | GET | Xem thống kê feedback |
| `/api/vocabulary-feedback/weights` | GET | Xem weights hiện tại |
| `/api/knowledge-graph/build` | POST | Xây dựng knowledge graph |
| `/api/knowledge-graph/query/vocabulary/{id}` | GET | Query vocabulary |
| `/api/knowledge-graph/statistics` | GET | Thống kê graph |
| `/api/rag/generate-flashcards` | POST | Tạo flashcards |
| `/api/rag/explain-term` | POST | Giải thích từ |
| `/api/rag/find-related` | POST | Tìm từ liên quan |
| `/api/rag/query` | POST | Custom RAG query |
| `/api/complete-pipeline` | POST | Pipeline hoàn chỉnh (1-5) |

---

## 🔧 Troubleshooting

### Lỗi: Module not found
```bash
pip install -r requirements.txt
python -m spacy download en_core_web_sm
python -m nltk.downloader punkt stopwords averaged_perceptron_tagger
```

### Lỗi: Port already in use
Thay đổi port:
```bash
python -m uvicorn main_simple:app --reload --port 8001
```

### Lỗi: OpenAI API key
Thêm vào `.env`:
```
OPENAI_API_KEY=your-key-here
```

Hoặc hệ thống sẽ dùng fallback mode (không cần API key).

---

## 📖 Documentation

- **STAGE 1-2**: `README_CONTEXT_INTELLIGENCE.md`
- **STAGE 3**: `README_STAGE3_FEEDBACK_LOOP.md`
- **STAGE 4**: `README_STAGE4_KNOWLEDGE_GRAPH.md`
- **STAGE 5**: `README_STAGE5_RAG.md`
- **Complete**: `../COMPLETE_SYSTEM_OVERVIEW.md`

---

## ✅ Checklist

- [ ] Cài đặt dependencies: `pip install -r requirements.txt`
- [ ] Download spaCy model: `python -m spacy download en_core_web_sm`
- [ ] Download NLTK data: `python -m nltk.downloader punkt stopwords`
- [ ] Khởi động server: `start_server.bat` hoặc `uvicorn main_simple:app --reload`
- [ ] Test health check: `curl http://localhost:8000/`
- [ ] Test vocabulary extraction
- [ ] Test complete pipeline

---

**Server đã sẵn sàng!** 🎉
