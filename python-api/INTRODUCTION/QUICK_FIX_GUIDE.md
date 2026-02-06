# 🚀 HƯỚNG DẪN NHANH: Fix N-gram và Flashcard

## ✅ TẤT CẢ FIX ĐÃ ĐƯỢC ÁP DỤNG!

Các file sau đã được sửa:
- ✅ `ensemble_extractor.py` - Nới lỏng bigram filter + min_df=1
- ✅ `main.py` - Tăng max_words=50, max_flashcards=30

## 🎯 BƯỚC 1: RESTART SERVER (BẮT BUỘC!)

```bash
# Dừng server cũ (nếu đang chạy)
Ctrl+C

# Chạy lại server
cd python-api
python main.py
```

**Quan trọng**: Nếu không restart, các fix sẽ KHÔNG có hiệu lực!

## 🧪 BƯỚC 2: TEST

### Option A: Test tự động (Khuyến nghị)

```bash
cd python-api
python test_ngram_flashcard_fix.py
```

Kết quả mong đợi:
```
✅ Bigrams: 10-20 found
✅ Flashcards: 30 generated
🎉 ALL TESTS PASSED!
```

### Option B: Test thủ công qua Swagger

1. Mở: `http://127.0.0.1:8000/docs`
2. Chọn: `POST /api/upload-document`
3. Click "Try it out"
4. Upload file và điền:
   - `max_words`: 50
   - `max_flashcards`: 30
5. Click "Execute"

### Option C: Test qua curl

```bash
curl -X POST "http://127.0.0.1:8000/api/upload-document" \
  -F "file=@test_sample.txt" \
  -F "max_words=50" \
  -F "max_flashcards=30"
```

## 📊 KIỂM TRA KẾT QUẢ

Trong response JSON, kiểm tra:

```json
{
  "vocabulary": [
    {"word": "machine learning"},    // ✅ Bigram
    {"word": "deep learning"},       // ✅ Bigram
    {"word": "neural network"}       // ✅ Bigram
  ],
  "vocabulary_count": 47,
  "flashcards_count": 30             // ✅ 30 flashcards
}
```

**Nếu thấy**:
- ✅ Có bigrams (từ có dấu cách) → Fix thành công!
- ✅ flashcards_count >= 20 → Fix thành công!

**Nếu vẫn thấy**:
- ❌ Chỉ có từ đơn → Chưa restart server
- ❌ flashcards_count = 10 → Chưa restart server

## 🎓 TẠI SAO CẦN BIGRAMS?

Tiếng Anh có nhiều khái niệm chỉ có nghĩa khi kết hợp:

| Bigram | Nghĩa | Unigrams | Nghĩa |
|--------|-------|----------|-------|
| machine learning | Học máy | machine + learning | Máy + Học |
| deep learning | Học sâu | deep + learning | Sâu + Học |
| neural network | Mạng nơ-ron | neural + network | Thần kinh + Mạng |

→ Bigrams giữ được **ngữ cảnh** và **ý nghĩa** đúng!

## 🔧 CÁC FIX ĐÃ ÁP DỤNG

### 1. Nới lỏng bigram filter
**Trước**: Yêu cầu CẢ 2 từ có nghĩa
**Sau**: Chỉ cần 1 trong 2 từ có nghĩa

### 2. Giảm min_df
**Trước**: `min_df=2` (loại bigrams hiếm)
**Sau**: `min_df=1` (giữ cả bigrams hiếm)

### 3. Tăng flashcards
**Trước**: Hardcode 10
**Sau**: User chọn (default 30)

### 4. Tăng max_words
**Trước**: Default 20
**Sau**: Default 50

## ⚠️ TROUBLESHOOTING

### Vẫn chỉ có từ đơn?
1. Đã restart server chưa? → `python main.py`
2. Kiểm tra `ensemble_extractor.py` dòng 390-395
3. Chạy test: `python test_ngram_flashcard_fix.py`

### Vẫn chỉ 10 flashcards?
1. Đã restart server chưa?
2. Có truyền `max_flashcards=30` không?
3. Kiểm tra `main.py` dòng 597

### Server không chạy?
```bash
# Cài dependencies
pip install -r requirements.txt

# Kiểm tra port
netstat -ano | findstr :8000

# Kill nếu cần
taskkill /PID <PID> /F
```

## 📞 CẦN TRỢ GIÚP?

Nếu vẫn gặp vấn đề:

1. Chạy test và gửi output:
   ```bash
   python test_ngram_flashcard_fix.py > test_output.txt
   ```

2. Kiểm tra server logs khi upload

3. Gửi response JSON từ upload endpoint

---

**Tóm tắt**: 
1. ✅ Restart server
2. ✅ Chạy test
3. ✅ Kiểm tra có bigrams + 30 flashcards

**Thời gian**: < 2 phút

**Kết quả**: Bigrams + nhiều flashcards hơn! 🎉
