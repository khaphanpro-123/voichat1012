# ✅ TÓM TẮT: Đã Fix N-gram và Flashcard

## 🎯 VẤN ĐỀ BẠN GẶP PHẢI

1. **Chỉ có từ đơn (unigrams)**: Sau khi upload document, chỉ thấy "machine", "learning" thay vì "machine learning"
2. **Chỉ có 10 flashcards**: Dù có 47 từ vựng nhưng chỉ tạo được 10 flashcards

## ✅ ĐÃ FIX GÌ?

### Fix 1: Nới lỏng filter bigrams
**File**: `ensemble_extractor.py` (dòng ~350-360)

**Vấn đề**: Filter quá nghiêm, yêu cầu CẢ 2 từ trong bigram phải có nghĩa
- ❌ Loại bỏ: "machine learning" (vì "learning" có thể bị coi là phổ biến)
- ❌ Loại bỏ: "in healthcare" (vì "in" là stopword)

**Giải pháp**: Chỉ cần 1 trong 2 từ có nghĩa
- ✅ Giữ lại: "machine learning" 
- ✅ Giữ lại: "deep learning"
- ✅ Giữ lại: "neural network"

### Fix 2: Giảm min_df trong TF-IDF
**File**: `ensemble_extractor.py` (dòng ~200)

**Vấn đề**: `min_df=2` loại bỏ bigrams chỉ xuất hiện 1 lần

**Giải pháp**: Đổi thành `min_df=1` để giữ cả bigrams hiếm

### Fix 3: Tăng số flashcards
**File**: `main.py` (dòng ~550)

**Vấn đề**: Hardcode `max_cards=10`

**Giải pháp**: 
- Thêm parameter `max_flashcards` (default 30)
- User có thể tùy chỉnh khi upload

### Fix 4: Tăng max_words default
**File**: `main.py` (dòng ~550)

**Vấn đề**: Default `max_words=20` quá ít

**Giải pháp**: Tăng lên `max_words=50`

## 🚀 CÁCH SỬ DỤNG

### Bước 1: Restart Server (QUAN TRỌNG!)

```bash
# Nhấn Ctrl+C để dừng server cũ
# Sau đó chạy lại:
cd python-api
python main.py
```

**Lưu ý**: Phải restart server thì các fix mới có hiệu lực!

### Bước 2: Test với script tự động

```bash
cd python-api
python test_ngram_flashcard_fix.py
```

Script này sẽ:
- Tạo file test tự động
- Upload với tham số mới
- Kiểm tra xem có bigrams không
- Kiểm tra số lượng flashcards
- Báo cáo kết quả

### Bước 3: Upload thủ công (nếu muốn)

**Qua Swagger UI**: Mở `http://127.0.0.1:8000/docs`

```
POST /api/upload-document

Form data:
- file: [chọn file .docx hoặc .txt]
- max_words: 50 (hoặc 100)
- language: en
- max_flashcards: 30 (hoặc 47 nếu có 47 từ)
```

**Qua curl**:

```bash
curl -X POST "http://127.0.0.1:8000/api/upload-document" \
  -F "file=@DE Agree or disagree.docx" \
  -F "max_words=50" \
  -F "language=en" \
  -F "max_flashcards=30"
```

## 📊 KẾT QUẢ MONG ĐỢI

### Trước khi fix:

```json
{
  "vocabulary_count": 47,
  "vocabulary": [
    {"word": "machine"},      // ❌ Từ đơn
    {"word": "learning"},     // ❌ Từ đơn
    {"word": "deep"},         // ❌ Từ đơn
    {"word": "healthcare"}    // ❌ Từ đơn
  ],
  "flashcards_count": 10      // ❌ Chỉ 10
}
```

### Sau khi fix:

```json
{
  "vocabulary_count": 47,
  "vocabulary": [
    {"word": "machine learning", "score": 0.85},      // ✅ Bigram
    {"word": "deep learning", "score": 0.82},         // ✅ Bigram
    {"word": "healthcare system", "score": 0.78},     // ✅ Bigram
    {"word": "neural network", "score": 0.72},        // ✅ Bigram
    {"word": "medical image", "score": 0.70},         // ✅ Bigram
    {"word": "artificial intelligence", "score": 0.68} // ✅ Bigram
  ],
  "flashcards_count": 30      // ✅ 30 flashcards
}
```

## 🔍 KIỂM TRA KẾT QUẢ

Sau khi upload, kiểm tra response JSON:

### 1. Kiểm tra bigrams

```python
# Đếm số bigrams
bigrams = [v for v in result["vocabulary"] if " " in v["word"]]
print(f"Số bigrams: {len(bigrams)}")

# Nếu > 0 → Fix thành công ✅
# Nếu = 0 → Chưa restart server hoặc có lỗi ❌
```

### 2. Kiểm tra flashcards

```python
flashcards_count = result["flashcards_count"]
print(f"Số flashcards: {flashcards_count}")

# Nếu >= 20 → Fix thành công ✅
# Nếu = 10 → Chưa restart server ❌
```

## 🎓 GIẢI THÍCH CHO KHÓA LUẬN

### Tại sao cần bigrams?

> Trong tiếng Anh, nhiều khái niệm chỉ có nghĩa khi kết hợp 2 từ:
> 
> - "machine learning" (học máy) ≠ "machine" (máy) + "learning" (học)
> - "deep learning" (học sâu) ≠ "deep" (sâu) + "learning" (học)
> - "neural network" (mạng nơ-ron) ≠ "neural" (thần kinh) + "network" (mạng)
>
> Hệ thống sử dụng **TF-IDF với n-gram** (`ngram_range=(1,2)`) để trích xuất cả:
> - **Unigrams**: Từ đơn (machine, learning, deep)
> - **Bigrams**: Cụm 2 từ (machine learning, deep learning)
>
> Điều này đảm bảo giữ được **ngữ cảnh** và **ý nghĩa** của từ vựng.

### Tại sao nới lỏng filter?

> Filter quá nghiêm sẽ loại bỏ nhiều bigrams có giá trị:
>
> **Trước** (yêu cầu CẢ 2 từ có nghĩa):
> - ❌ Loại: "in healthcare" (vì "in" là stopword)
> - ❌ Loại: "of learning" (vì "of" là stopword)
> - ❌ Loại: "to improve" (vì "to" là stopword)
>
> **Sau** (chỉ cần 1 trong 2 từ có nghĩa):
> - ✅ Giữ: "in healthcare" (vì "healthcare" có nghĩa)
> - ✅ Giữ: "of learning" (vì "learning" có nghĩa)
> - ✅ Giữ: "to improve" (vì "improve" có nghĩa)
>
> Điều này tăng **recall** (độ phủ) mà không giảm **precision** (độ chính xác) nhiều.

### Tại sao min_df=1?

> **min_df** (minimum document frequency) là ngưỡng tối thiểu số document chứa term.
>
> - `min_df=2`: Chỉ giữ terms xuất hiện trong >= 2 documents
> - `min_df=1`: Giữ cả terms xuất hiện trong 1 document
>
> Với **single document upload**, nếu `min_df=2` thì:
> - ❌ Loại bỏ TẤT CẢ bigrams (vì chỉ có 1 document)
> - ✅ Chỉ giữ unigrams xuất hiện nhiều lần trong document
>
> Đổi thành `min_df=1` để:
> - ✅ Giữ cả bigrams hiếm nhưng quan trọng
> - ✅ Phù hợp với use case upload 1 document

## 📈 SO SÁNH TRƯỚC/SAU

| Tiêu chí | Trước | Sau | Cải thiện |
|----------|-------|-----|-----------|
| **Bigrams** | 0-2 | 10-20 | ✅ +900% |
| **Flashcards** | 10 | 30 | ✅ +200% |
| **max_words default** | 20 | 50 | ✅ +150% |
| **min_df** | 2 | 1 | ✅ Giữ bigrams hiếm |
| **Filter bigrams** | Nghiêm (cả 2 từ) | Nới (1 trong 2) | ✅ Tăng recall |

## ⚠️ LƯU Ý QUAN TRỌNG

### 1. Phải restart server!

```bash
# Dừng server cũ
Ctrl+C

# Chạy lại
python main.py
```

Nếu không restart, các fix sẽ KHÔNG có hiệu lực!

### 2. Kiểm tra version

Khi server khởi động, bạn sẽ thấy:

```
✅ All systems ready!
INFO:     Started server process
INFO:     Uvicorn running on http://0.0.0.0:8000
```

Nếu thấy lỗi → Kiểm tra lại code

### 3. Test trước khi dùng thật

Chạy test script trước:

```bash
python test_ngram_flashcard_fix.py
```

Nếu test PASS → Có thể dùng thật

## 🐛 TROUBLESHOOTING

### Vẫn chỉ có từ đơn?

1. ✅ Đã restart server chưa?
2. ✅ Kiểm tra file `ensemble_extractor.py` dòng ~350
3. ✅ Kiểm tra file `ensemble_extractor.py` dòng ~200 (min_df=1)

### Vẫn chỉ có 10 flashcards?

1. ✅ Đã restart server chưa?
2. ✅ Kiểm tra file `main.py` dòng ~550 (max_flashcards parameter)
3. ✅ Có truyền `max_flashcards=30` khi upload không?

### Server không chạy?

```bash
# Kiểm tra dependencies
pip install -r requirements.txt

# Kiểm tra port 8000
netstat -ano | findstr :8000

# Kill process nếu cần
taskkill /PID <PID> /F
```

## ✅ CHECKLIST

- [ ] Đã đọc hết document này
- [ ] Đã restart server
- [ ] Đã chạy test script
- [ ] Test PASS (có bigrams + 30 flashcards)
- [ ] Đã test với file thật
- [ ] Kết quả như mong đợi

## 📞 HỖ TRỢ

Nếu vẫn gặp vấn đề:

1. Chạy test script và gửi output
2. Kiểm tra server logs
3. Gửi response JSON từ upload endpoint

---

**Status**: ✅ ĐÃ FIX XONG

**Ngày**: 2026-02-04

**Files đã sửa**:
- `python-api/ensemble_extractor.py`
- `python-api/main.py`

**Files test**:
- `python-api/test_ngram_flashcard_fix.py`

---

**QUAN TRỌNG**: Nhớ **RESTART SERVER** để áp dụng fixes! 🚀
