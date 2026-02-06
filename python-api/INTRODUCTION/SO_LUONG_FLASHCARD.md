# 📇 SỐ LƯỢNG FLASHCARD - GIẢI THÍCH ĐỠN GIẢN

## 🎯 CÔNG THỨC

```
Số flashcards = MIN(max_flashcards, số từ vựng)
```

---

## 📊 VÍ DỤ TRỰC QUAN

### Ví dụ 1: Đủ từ vựng

```
max_flashcards = 30
Số từ vựng = 47

→ Số flashcards = min(30, 47) = 30 ✅
```

**Giải thích**: Có 47 từ nhưng chỉ lấy 30 (theo yêu cầu user)

---

### Ví dụ 2: Thiếu từ vựng

```
max_flashcards = 30
Số từ vựng = 15

→ Số flashcards = min(30, 15) = 15 ⚠️
```

**Giải thích**: Muốn 30 nhưng chỉ có 15 từ → Chỉ tạo được 15

---

### Ví dụ 3: Vừa đủ

```
max_flashcards = 30
Số từ vựng = 30

→ Số flashcards = min(30, 30) = 30 ✅
```

**Giải thích**: Vừa khớp!

---

## 🔧 CÁCH ĐIỀU CHỈNH

### Muốn 50 flashcards?

**Cần 2 điều kiện**:

1. ✅ Truyền `max_flashcards=50`
2. ✅ Có ít nhất 50 từ vựng

**Cách làm**:

```bash
curl -X POST "http://127.0.0.1:8000/api/upload-document" \
  -F "file=@example.docx" \
  -F "max_words=100" \
  -F "max_flashcards=50"
```

---

### Tại sao chỉ có 10 flashcards? (Vấn đề cũ)

**Trước khi fix**:

```python
# Code cũ
max_cards = 10  # HARDCODE!
```

→ Luôn chỉ có 10 flashcards dù có 47 từ ❌

**Sau khi fix**:

```python
# Code mới
max_flashcards = 30  # User chọn
max_cards = min(max_flashcards, vocabulary_count)
```

→ Có thể có 30 flashcards ✅

---

## 📈 BẢNG THAM KHẢO NHANH

| Bạn muốn | max_words | max_flashcards | Kết quả |
|----------|-----------|----------------|---------|
| Ít flashcards | 20 | 10 | ~10 |
| Vừa phải | 50 | 30 | ~30 |
| Nhiều flashcards | 100 | 50 | ~50 |

---

## ⚠️ LƯU Ý

### Số từ vựng phụ thuộc vào:

1. **max_words**: Số từ tối đa trích xuất
2. **Độ dài document**: Document dài → Nhiều từ
3. **Chất lượng document**: Chuyên ngành → Nhiều thuật ngữ

### Không thể tạo flashcard nếu:

- ❌ Không có từ vựng
- ❌ Document quá ngắn
- ❌ max_words quá thấp

---

## 🎯 KẾT LUẬN

**Số flashcards = Số nhỏ hơn giữa**:
- Số bạn muốn (max_flashcards)
- Số từ vựng có sẵn (vocabulary_count)

**Để có nhiều flashcards**:
1. Tăng `max_flashcards`
2. Tăng `max_words`
3. Upload document dài hơn

**Đơn giản vậy thôi!** 😊
