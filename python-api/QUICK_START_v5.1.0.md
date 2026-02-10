# QUICK START - Version 5.1.0 Enhanced Flashcards

## 🚀 Khởi Động Nhanh (3 Bước)

### Bước 1: Cài IPA (Tùy chọn - 30 giây)
```bash
cd python-api
pip install eng-to-ipa
```

**Hoặc** chạy file:
```bash
install_ipa.bat
```

**Lưu ý**: Nếu không cài, flashcard vẫn hoạt động nhưng không có IPA phonetics.

---

### Bước 2: Khởi Động Lại Server (1 phút)
```bash
# Dừng server hiện tại (Ctrl+C)

# Xóa cache
del /s /q *.pyc
for /d /r . %d in (__pycache__) do @if exist "%d" rd /s /q "%d"

# Khởi động
python main.py
```

**Hoặc** chạy file:
```bash
RESTART_v5.1.0.bat
```

---

### Bước 3: Test (2 phút)

#### Option A: Test Script
```bash
python test_stage12_enhanced.py
```

Kết quả mong đợi:
```
✓ Synonym grouping: ✅
✓ IPA phonetics: ✅ (nếu đã cài eng-to-ipa)
✓ Audio URLs: ✅
✓ Related words: ✅
✓ Cluster info: ✅
```

#### Option B: Upload Document
1. Mở frontend
2. Upload tài liệu
3. Kiểm tra flashcard output

---

## 📋 Kiểm Tra Kết Quả

### Flashcard Cũ (v5.0.0)
```json
{
  "word": "climate change",
  "meaning": "Academic term from document.pdf",
  "example": "Climate change is one of...",
  "score": 0.95
}
```

### Flashcard Mới (v5.1.0)
```json
{
  "id": "fc_0_1",
  "word": "climate change",
  "synonyms": [
    {"word": "climatic change", "similarity": 0.89}
  ],
  "cluster_name": "Climate Change & Global Warming",
  "ipa": "/ˈklaɪmət tʃeɪndʒ/",
  "audio_word_url": "https://translate.google.com/...",
  "related_words": [
    {"word": "greenhouse effect", "similarity": 0.85}
  ],
  ...
}
```

**Nếu thấy các field mới → Thành công!** ✅

---

## ⚠️ Troubleshooting

### Vấn đề 1: IPA trống
**Nguyên nhân**: Chưa cài `eng-to-ipa`

**Giải pháp**:
```bash
pip install eng-to-ipa
```

Sau đó khởi động lại server.

---

### Vấn đề 2: Không thấy synonyms
**Nguyên nhân**: Tài liệu không có từ đồng nghĩa (similarity < 0.85)

**Giải pháp**: Upload tài liệu có nhiều từ tương tự nhau (ví dụ: "climate change", "climatic change", "climate shift")

---

### Vấn đề 3: Server không khởi động
**Nguyên nhân**: Cache Python cũ

**Giải pháp**:
```bash
# Xóa cache
del /s /q *.pyc
for /d /r . %d in (__pycache__) do @if exist "%d" rd /s /q "%d"

# Khởi động lại
python main.py
```

---

### Vấn đề 4: Import error
**Nguyên nhân**: Thiếu dependencies

**Giải pháp**:
```bash
pip install -r requirements.txt
```

---

## 📊 Kết Quả Mong Đợi

### Input
- 159 cụm từ
- 100 từ đơn
- **Tổng**: 259 từ vựng

### Output
- **Flashcards**: ~200-220 (sau khi gộp đồng nghĩa)
- **Synonym groups**: ~30-40
- **Mỗi flashcard có**:
  - Từ chính + đồng nghĩa
  - Cluster info + related words
  - IPA + audio URLs
  - Metadata (difficulty, tags, etc.)

---

## 🎯 Checklist

- [ ] Cài `eng-to-ipa` (tùy chọn)
- [ ] Xóa Python cache
- [ ] Khởi động lại server
- [ ] Chạy test script HOẶC upload document
- [ ] Kiểm tra flashcard output có các field mới
- [ ] Verify synonyms, IPA, audio URLs

**Nếu tất cả OK → Hoàn thành!** 🎉

---

## 📚 Tài Liệu Chi Tiết

- **TOM_TAT_v5.1.0.md** - Tóm tắt tiếng Việt
- **STAGE12_IMPLEMENTATION_COMPLETE.md** - Chi tiết tiếng Anh
- **CHANGELOG_v5.1.0.md** - Lịch sử thay đổi

---

## 💡 Tips

1. **IPA không bắt buộc**: Flashcard vẫn hoạt động tốt không có IPA
2. **Audio URLs**: Có thể mở trực tiếp trong trình duyệt để nghe
3. **Synonym threshold**: Hiện tại cố định 0.85 (có thể thay đổi trong code nếu cần)
4. **Test data**: Dùng tài liệu có nhiều từ tương tự để test synonym grouping

---

**Thời gian tổng**: ~5 phút
**Độ khó**: Dễ
**Kết quả**: Flashcard nâng cao với đầy đủ tính năng

✅ **Sẵn sàng sử dụng!**
