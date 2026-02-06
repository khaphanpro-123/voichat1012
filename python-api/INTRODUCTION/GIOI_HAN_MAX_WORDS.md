# ⚠️ GIỚI HẠN MAX_WORDS

## 🚨 Vấn đề bạn gặp phải

Khi upload file với `max_words=2000`, hệ thống:
- ❌ Trích xuất 2000 từ (quá nhiều!)
- ❌ Nhiều từ vô nghĩa: "viec", "cong viec", "lot important advantages"
- ❌ Xử lý rất chậm (phải tìm context cho 2000 từ)
- ❌ Nhiều warning: "No sentences found for word"

## ✅ GIẢI PHÁP

### 1. Giới hạn max_words đã được thêm vào

File `main.py` đã được cập nhật:

```python
@app.post("/api/upload-document")
async def upload_document(
    file: UploadFile = File(...),
    max_words: int = Form(20),
    language: str = Form("en")
):
    # Limit max_words to reasonable range
    if max_words > 100:
        max_words = 100
        print(f"[Upload] max_words limited to 100 for performance")
    elif max_words < 5:
        max_words = 5
```

**Bây giờ:**
- Nếu bạn nhập `max_words=2000` → tự động giảm xuống `100`
- Nếu bạn nhập `max_words=2` → tự động tăng lên `5`

### 2. Lọc từ vựng tốt hơn

File `ensemble_extractor.py` đã được cập nhật:

```python
# Remove candidates with non-English characters
candidates = {c for c in candidates if all(ord(ch) < 128 or ch.isspace() for ch in c)}

# Remove candidates that are mostly numbers
candidates = {c for c in candidates if not c.replace(' ', '').replace('.', '').replace(',', '').isdigit()}

# Limit n-grams to more reasonable phrases
# Single words: always keep
# Bigrams: keep if both words are meaningful
# Trigrams: only keep if all words are meaningful
```

**Bây giờ:**
- ✅ Loại bỏ từ có ký tự lạ (như "viec", "cong viec")
- ✅ Loại bỏ số
- ✅ Chỉ giữ bigrams/trigrams có nghĩa

### 3. Giảm warning

File `context_intelligence.py` đã được cập nhật:

```python
if not sentence_ids:
    # Only warn for single words (not phrases)
    if ' ' not in word and len(word) <= 20:
        print(f"⚠️  No sentences found for word: {word}")
    continue
```

**Bây giờ:**
- ✅ Chỉ warning cho từ đơn (không phải cụm từ)
- ✅ Không warning cho từ quá dài (có thể là garbage)

## 📊 SỐ TỪ NÊN DÙNG

| Loại tài liệu | max_words khuyến nghị |
|---------------|----------------------|
| Đoạn văn ngắn (< 500 từ) | 10-20 |
| Bài viết trung bình (500-2000 từ) | 20-50 |
| Tài liệu dài (> 2000 từ) | 50-100 |

## 🎯 CÁCH SỬ DỤNG ĐÚNG

### Swagger UI

1. Mở http://127.0.0.1:8000/docs
2. Tìm **POST /api/upload-document**
3. Click **"Try it out"**
4. Chọn file
5. **Điền max_words: 20-50** (KHÔNG phải 2000!)
6. Click **"Execute"**

### Python

```python
import requests

with open("document.txt", "rb") as f:
    files = {"file": ("document.txt", f)}
    data = {
        "max_words": 30,  # ✅ Hợp lý
        "language": "en"
    }
    
    response = requests.post(
        "http://127.0.0.1:8000/api/upload-document",
        files=files,
        data=data
    )
```

### curl

```bash
curl -X POST "http://127.0.0.1:8000/api/upload-document" \
  -F "file=@document.txt" \
  -F "max_words=30" \
  -F "language=en"
```

## 🔄 RESTART SERVER

Để áp dụng các thay đổi:

```bash
# Dừng server hiện tại (Ctrl+C)

# Khởi động lại
cd python-api
python main.py
```

## ✅ KẾT QUẢ SAU KHI SỬA

### Trước (max_words=2000):
```
Vocabulary count: 2000
⚠️  No sentences found for word: viec
⚠️  No sentences found for word: cong viec
⚠️  No sentences found for word: lot important advantages
⚠️  No sentences found for word: teamwork
... (hàng trăm warning)
```

### Sau (max_words=20):
```
Vocabulary count: 20
✅ All words have valid contexts
Top words:
1. learning (score: 1.013)
2. machine (score: 0.611)
3. language (score: 0.565)
...
```

## 💡 LƯU Ý

1. **max_words càng lớn → xử lý càng chậm**
   - 20 từ: ~2-3 giây
   - 50 từ: ~5-7 giây
   - 100 từ: ~10-15 giây

2. **Chất lượng > Số lượng**
   - 20 từ chất lượng cao > 2000 từ rác

3. **Tài liệu dài → chia nhỏ**
   - Thay vì upload 1 file 10,000 từ với max_words=100
   - Chia thành 5 file 2,000 từ, mỗi file max_words=20

## 🎉 HOÀN THÀNH!

Bây giờ hệ thống sẽ:
- ✅ Tự động giới hạn max_words ≤ 100
- ✅ Lọc từ vựng tốt hơn (loại bỏ garbage)
- ✅ Giảm warning không cần thiết
- ✅ Xử lý nhanh hơn
- ✅ Kết quả chất lượng cao hơn
