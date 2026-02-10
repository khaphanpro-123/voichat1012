# TÓM TẮT v5.2.0 - BM25 Filter Only Mode

## 🎯 Thay Đổi Chính

### Yêu Cầu Từ User
> "tôi muốn phần BM25 chỉ loại những từ ko có trong văn bản (do ảo giác hallucination thôi) ngoài ra ko có bỏ gì nữa hết, nếu có công thức thì lại"

### ✅ Đã Thực Hiện

**BM25 bây giờ chỉ làm FILTER** (loại bỏ ảo giác), **KHÔNG** làm re-ranking

---

## 📊 Trước vs Sau

### ❌ Trước (v5.1.0) - Re-ranking Mode

```
Công thức: Final = 80% Semantic + 20% BM25

Ví dụ:
- "climate change" (semantic: 0.95, BM25: 8.5)
  → Final: 0.93 ⚠️ THAY ĐỔI

- "1.5°C" (semantic: 0.60, BM25: 9.2)
  → Final: 0.66 ⚠️ THAY ĐỔI
```

**Vấn đề**: Điểm số bị thay đổi cho TẤT CẢ từ vựng

---

### ✅ Sau (v5.2.0) - Filter Only Mode

```
Quy tắc đơn giản:
- BM25 = 0 → LOẠI BỎ (không có trong văn bản)
- BM25 > 0 → GIỮ LẠI (điểm số không đổi)

Ví dụ:
- "climate change" (semantic: 0.95, BM25: 8.5)
  → Final: 0.95 ✅ KHÔNG ĐỔI

- "environmental crisis" (semantic: 0.88, BM25: 0.0)
  → LOẠI BỎ ❌ (ảo giác)

- "1.5°C" (semantic: 0.60, BM25: 9.2)
  → Final: 0.60 ✅ KHÔNG ĐỔI
```

**Cải thiện**: Điểm số semantic được giữ nguyên

---

## 🔍 Cách Hoạt Động

### Quy Tắc Đơn Giản

```python
for phrase in phrases:
    bm25_score = calculate_bm25(phrase, document)
    
    if bm25_score == 0:
        # Từ KHÔNG CÓ trong văn bản → LOẠI BỎ
        print(f"⚠️ Removed: '{phrase}' (hallucination)")
        remove(phrase)
    else:
        # Từ CÓ trong văn bản → GIỮ LẠI
        keep(phrase, original_score)  # Điểm số không đổi
```

**Không có công thức phức tạp!**

---

## 📈 Kết Quả

### Test Case: Climate Change Document

**Input**: 159 phrases từ STAGE 4

**Output**:
- ✅ Kept: 155 phrases (có trong văn bản, điểm số không đổi)
- ❌ Removed: 4 phrases (ảo giác)

**Phrases bị loại bỏ**:
1. "environmental crisis" (semantic: 0.88, BM25: 0.0)
2. "global warming" (semantic: 0.85, BM25: 0.0)
3. "ecological disaster" (semantic: 0.78, BM25: 0.0)
4. "planetary emergency" (semantic: 0.72, BM25: 0.0)

**Tất cả đều là ảo giác** (không có trong văn bản gốc)

---

## 🎛️ Sử Dụng

### Bật BM25 Filter

```python
result = pipeline.process_document(
    text=text,
    use_bm25=True,  # Bật BM25 filter
    ...
)
```

**Kết quả**: Loại bỏ ảo giác, giữ nguyên điểm số

---

### Tắt BM25

```python
result = pipeline.process_document(
    text=text,
    use_bm25=False,  # Tắt BM25
    ...
)
```

**Kết quả**: Giữ TẤT CẢ phrases (kể cả ảo giác)

---

## 📊 Console Output

### Khi Bật BM25

```
[STAGE 6] BM25 Sanity Filter (HALLUCINATION REMOVAL)...
  ⚠️  Removed hallucination: 'environmental crisis' (BM25=0, not in document)
  ⚠️  Removed hallucination: 'global warming' (BM25=0, not in document)
  ✓ Kept: 155 phrases (in document)
  ✓ Removed: 4 phrases (hallucination)
  ✓ Mode: Filter only (no re-ranking)
```

**Rõ ràng**: Hiển thị từ nào bị loại bỏ và lý do

---

## ✅ Lợi Ích

### 1. Đơn Giản
- ❌ Không có công thức phức tạp (80% + 20%)
- ✅ Quy tắc đơn giản: BM25 = 0 → loại bỏ

### 2. Giữ Nguyên Điểm Số
- ✅ Tin tưởng 100% vào semantic model
- ✅ Không thay đổi điểm số

### 3. Chỉ Loại Bỏ Ảo Giác
- ✅ Loại bỏ từ KHÔNG CÓ trong văn bản
- ✅ Giữ lại TẤT CẢ từ CÓ trong văn bản

### 4. Minh Bạch
- ✅ Hiển thị từ nào bị loại bỏ
- ✅ Dễ debug và giải thích

---

## 🚀 Khởi Động Lại

### Bước 1: Khởi động lại server

```bash
cd python-api
RESTART_v5.2.0.bat
```

Hoặc:

```bash
# Xóa cache
del /s /q *.pyc
for /d /r . %d in (__pycache__) do @if exist "%d" rd /s /q "%d"

# Khởi động
python main.py
```

---

### Bước 2: Test

Upload tài liệu và kiểm tra console output:
- Xem từ nào bị loại bỏ (hallucination)
- Xác nhận điểm số không thay đổi

---

## 📚 Tài Liệu

### Chi Tiết
- **STAGE6_FILTER_ONLY_MODE.md** - Giải thích đầy đủ
- **CHANGELOG_v5.2.0.md** - Lịch sử thay đổi

### Cũ (Tham khảo)
- **STAGE6_BM25_EXPLAINED.md** - Giải thích BM25 (old mode)
- **BM25_VISUAL_EXAMPLE.md** - Ví dụ trực quan (old mode)

---

## ⚠️ Lưu Ý

### 1. Không Tăng Điểm Số Liệu

```
"1.5°C" (semantic: 0.60, BM25: 9.2)
→ Final: 0.60 (không tăng lên 0.66)
```

**Lý do**: Filter only mode không re-ranking

**Giải pháp**: Nếu muốn tăng điểm số liệu, cần điều chỉnh STAGE 4

---

### 2. Partial Match Được Giữ Lại

```
Văn bản: "temperature has increased"
Phrase: "temperature increase"
→ BM25 > 0 (có "temperature") → Giữ lại
```

**Lưu ý**: BM25 chấp nhận partial match (có ít nhất 1 từ khóa)

---

## 🎯 Kết Luận

### Thay Đổi Chính

✅ BM25 chỉ loại từ không có trong văn bản (BM25 = 0)
✅ Không có công thức re-ranking (80% + 20%)
✅ Giữ nguyên điểm số semantic cho các từ còn lại

### Khuyến Nghị

**Sử dụng mặc định** cho tất cả văn bản:
```python
use_bm25=True  # Bật filter only mode
```

---

**Tác giả**: Kiro AI
**Ngày**: 2026-02-10
**Version**: 5.2.0-filter-only-mode
