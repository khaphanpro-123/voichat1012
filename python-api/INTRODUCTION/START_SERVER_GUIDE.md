# 🚀 HƯỚNG DẪN KHỞI ĐỘNG SERVER

## ❌ LỖI: Connection Refused

Nếu bạn thấy lỗi:
```
Failed to establish a new connection: [WinError 10061] 
No connection could be made because the target machine actively refused it
```

**Nguyên nhân**: Server Python chưa chạy!

---

## ✅ CÁCH KHỞI ĐỘNG

### Bước 1: Mở Terminal mới

Mở một terminal/command prompt **RIÊNG** cho Python server.

### Bước 2: Di chuyển vào thư mục python-api

```bash
cd python-api
```

### Bước 3: Khởi động server

```bash
python main.py
```

**Hoặc** (nếu có nhiều Python versions):

```bash
python3 main.py
```

### Bước 4: Chờ server khởi động

Bạn sẽ thấy output:

```
🔄 Initializing systems...
✅ Feedback Loop initialized
✅ Knowledge Graph initialized
✅ RAG System initialized
⚠️  Embedding System initialization failed: No module named 'sentence_transformers'
✅ All systems ready!
INFO:     Started server process [12345]
INFO:     Waiting for application startup.
INFO:     Application startup complete.
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
```

### Bước 5: Kiểm tra server đang chạy

Mở browser và truy cập:
```
http://127.0.0.1:8000
```

Bạn sẽ thấy:
```json
{
  "status": "online",
  "message": "Visual Language Tutor API - STAGE 1-5",
  "version": "2.0.0"
}
```

---

## 🧪 SAU ĐÓ CHẠY TEST

**Trong terminal KHÁC**, chạy test:

```bash
cd python-api
python test_embedding.py
```

---

## ⚠️ LƯU Ý VỀ EMBEDDING

Nếu bạn thấy warning:
```
⚠️  Embedding System initialization failed: No module named 'sentence_transformers'
```

**Cài đặt sentence-transformers:**

```bash
pip install sentence-transformers torch
```

**Sau đó restart server** (Ctrl+C rồi `python main.py` lại).

---

## 📋 CHECKLIST

- [ ] Terminal 1: Chạy `python main.py` (server)
- [ ] Kiểm tra http://127.0.0.1:8000 (browser)
- [ ] Thấy "status": "online"
- [ ] Terminal 2: Chạy `python test_embedding.py` (test)

---

## 🔧 TROUBLESHOOTING

### Lỗi: Port 8000 đã được sử dụng

```bash
# Windows
netstat -ano | findstr :8000
taskkill /PID <PID> /F

# Linux/Mac
lsof -ti:8000 | xargs kill -9
```

### Lỗi: Module not found

```bash
pip install -r requirements.txt
```

### Lỗi: NLTK data not found

```bash
python -c "import nltk; nltk.download('punkt'); nltk.download('stopwords'); nltk.download('wordnet')"
```

### Lỗi: spaCy model not found

```bash
python -m spacy download en_core_web_sm
```

---

## 🎯 WORKFLOW ĐÚNG

```
Terminal 1 (Server):
  cd python-api
  python main.py
  → Server chạy, KHÔNG tắt terminal này

Terminal 2 (Test):
  cd python-api
  python test_embedding.py
  → Chạy test, xem kết quả
```

---

**Quan trọng**: Server phải chạy TRƯỚC khi test! 🚀
