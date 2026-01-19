# Hướng Dẫn Sử Dụng Tính Năng Upload Tài Liệu

## Vấn Đề Bạn Đang Gặp

Khi truy cập https://voichat1012.vercel.app/dashboard-new/documents, bạn thấy trang hiển thị kết quả từ lần upload trước đó (danh sách từ vựng đã trích xuất) thay vì giao diện upload file mới.

## Giải Pháp

### Cách 1: Click Nút "Upload file mới"
1. Nhìn lên góc **phải trên** của trang
2. Bạn sẽ thấy nút màu xám có icon 🔄 và text "Upload file mới"
3. Click vào nút đó
4. Trang sẽ reset về trạng thái ban đầu với giao diện upload

### Cách 2: Refresh Trang
1. Nhấn F5 hoặc Ctrl+R (Windows) / Cmd+R (Mac)
2. Trang sẽ load lại và quay về trạng thái upload

### Cách 3: Clear Browser Cache
Nếu 2 cách trên không hoạt động:
1. Nhấn Ctrl+Shift+Delete (Windows) / Cmd+Shift+Delete (Mac)
2. Chọn "Cached images and files"
3. Click "Clear data"
4. Refresh trang

## Quy Trình Upload Đúng

### Bước 1: Trang Upload (Trạng Thái Ban Đầu)
Khi vào trang lần đầu hoặc sau khi click "Upload file mới", bạn sẽ thấy:

```
📚 Document to Flashcards

┌─────────────────────────────────────────┐
│  📄 Upload Document                      │
│                                          │
│  ┌────────────────────────────────────┐ │
│  │         📤                          │ │
│  │  Click to upload or drag and drop  │ │
│  │  PDF, DOCX, TXT (Max 10MB)         │ │
│  └────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

**Hành động:**
- Click vào vùng upload
- Hoặc kéo thả file vào vùng upload
- Chọn file PDF, DOCX, hoặc TXT (tối đa 10MB)

### Bước 2: Xác Nhận Chuyển Đổi PDF (Nếu Upload PDF)
Nếu bạn upload file PDF, sẽ xuất hiện dialog:

```
⚠️ Chuyển đổi PDF

Bạn đang upload file [tên file].pdf (PDF).

Hệ thống sẽ chuyển đổi PDF sang định dạng văn bản 
để trích xuất từ vựng tốt hơn.

⚠️ Lưu ý:
• Một số định dạng phức tạp có thể bị mất
• Hình ảnh và bảng biểu sẽ không được xử lý
• Chất lượng trích xuất phụ thuộc vào chất lượng PDF

[Hủy]  [Đồng ý & Tiếp tục]
```

**Hành động:**
- Click "Đồng ý & Tiếp tục" để xác nhận
- Hoặc "Hủy" để chọn file khác

### Bước 3: Xử Lý Tài Liệu (Processing)
Hệ thống sẽ hiển thị 3 bước xử lý:

```
🔄 Đang xử lý tài liệu...

┌─────────────────────────────────────────┐
│ 🧠 Bước 1: Phân tích ngữ cảnh           │
│    Đang phân tích nội dung văn bản...   │
│    ✓ Hoàn thành                          │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ ✅ Bước 2: Trích lọc từ vựng            │
│    Đang trích xuất cụm từ theo ngữ cảnh │
│    [Đang xử lý...]                       │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ ✨ Bước 3: Tạo Flashcards               │
│    Đang tạo flashcards từ từ vựng...    │
│    [Chờ...]                              │
└─────────────────────────────────────────┘
```

**Thời gian:** 5-15 giây tùy kích thước file

### Bước 4: Xem Kết Quả (Review) - ĐÂY LÀ TRANG BẠN ĐANG Ở
Sau khi xử lý xong, trang sẽ hiển thị:

```
📚 Document to Flashcards        [🔄 Upload file mới]

┌─────────────────────────────────────────┐
│ ✅ Trích xuất thành công!                │
│                                          │
│ Hệ thống đã phân tích tài liệu và tìm   │
│ thấy 57 từ vựng quan trọng.             │
│                                          │
│ 📄 File: document.pdf                    │
│ 📊 Tổng từ: 6378                         │
│ 🎯 Từ vựng: 57                           │
│                                          │
│              [📤 Upload file khác]       │
└─────────────────────────────────────────┘

Total Words: 6378
Từ vựng tìm thấy: 57
Đã chọn: 57
Metadata đã lọc: 29

[Xem Debug Logs (3 bước)]

┌─────────────────────────────────────────┐
│ Chọn từ vựng để tạo Flashcards          │
│                                          │
│ [parameters] [Springer] [Science]...    │
│                                          │
│ [Tạo 57 Flashcards]                     │
└─────────────────────────────────────────┘
```

**Hành động:**
- Click "Upload file mới" (góc phải trên) để upload file khác
- Hoặc click "Upload file khác" trong banner
- Hoặc chọn từ vựng và tạo flashcards

### Bước 5: Tạo Flashcards
Sau khi chọn từ và click "Tạo Flashcards":

```
✅ Đã tạo 57 flashcards thành công!

[📚 Đi đến Từ vựng →]  [📥 Export CSV]

┌─────────────────────────────────────────┐
│ parameters                               │
│ /pəˈræmɪtərz/                           │
│ Tham số                                  │
│                                          │
│ Example: The parameters from application │
│ Ví dụ: Các tham số từ ứng dụng          │
└─────────────────────────────────────────┘
```

## Tính Năng Debug Logs

Để xem chi tiết quá trình trích xuất:

1. Ở trang Review, tìm dòng "Xem Debug Logs (3 bước)"
2. Click vào đó
3. Sẽ hiển thị:
   - Bước 1: Validation
   - Bước 2: Metadata Removal
   - Bước 3: Ensemble Extraction
   - Chi tiết điểm số từng từ
   - Lý do chọn từng từ (tiếng Việt)
   - Số tên riêng đã lọc
   - Số từ kỹ thuật đã lọc

## Các Lỗi Thường Gặp

### 1. "Chỉ chấp nhận file PDF, Word (.docx) hoặc TXT"
**Nguyên nhân:** File không đúng định dạng
**Giải pháp:** Chỉ upload file .pdf, .docx, hoặc .txt

### 2. "File quá lớn. Tối đa 10MB"
**Nguyên nhân:** File vượt quá 10MB
**Giải pháp:** Nén file hoặc chia nhỏ tài liệu

### 3. "Không tìm thấy từ vựng trong tài liệu"
**Nguyên nhân:** 
- PDF là scan/hình ảnh (không có text)
- File chỉ chứa metadata
- Văn bản quá ngắn (<50 ký tự)

**Giải pháp:**
- Sử dụng PDF text-based (không phải scan)
- Sử dụng file Word (.docx) thay vì PDF
- Đảm bảo văn bản có ít nhất 50 ký tự

### 4. "Không thể kết nối với cơ sở dữ liệu"
**Nguyên nhân:** Lỗi server hoặc database
**Giải pháp:** Thử lại sau vài phút hoặc liên hệ support

## Tips & Tricks

### 1. File Nào Cho Kết Quả Tốt Nhất?
- ✅ **Word (.docx)**: Tốt nhất, không cần chuyển đổi
- ✅ **PDF text-based**: Tốt, nhưng cần chuyển đổi
- ⚠️ **PDF scan**: Không trích xuất được text
- ✅ **TXT**: Tốt, nhưng không có định dạng

### 2. Làm Sao Biết PDF Là Text-Based Hay Scan?
- Mở PDF trong trình đọc
- Thử select (bôi đen) text
- Nếu select được → Text-based ✅
- Nếu không select được → Scan ❌

### 3. Tối Ưu Kết Quả Trích Xuất
- Sử dụng tài liệu có nội dung học thuật/kỹ thuật
- Tránh tài liệu có quá nhiều metadata
- File có cấu trúc rõ ràng (đoạn văn, câu hoàn chỉnh)
- Độ dài lý tưởng: 5-20 trang

### 4. Hiểu Debug Logs
Khi bật Debug Logs, bạn sẽ thấy:

```json
{
  "word": "machine learning",
  "score": 0.892,
  "reason": "Được chọn vì: TF-IDF cao (từ đặc trưng cho tài liệu), RAKE cao (xuất hiện trong cụm từ quan trọng)",
  "contextRelevance": 6.5,
  "normalized": {
    "freq": 0.850,
    "tfidf": 0.950,
    "rake": 0.880,
    "yake": 0.820
  }
}
```

**Giải thích:**
- `score`: Điểm tổng hợp (0-1), càng cao càng quan trọng
- `reason`: Lý do chọn từ (tiếng Việt)
- `contextRelevance`: Độ liên quan ngữ cảnh (>5 là tốt)
- `normalized`: Điểm chuẩn hóa từng tiêu chí

## Liên Hệ Hỗ Trợ

Nếu vẫn gặp vấn đề:
- GitHub Issues: https://github.com/khaphanpro-123/voichat1012/issues
- Email: support@voichat1012.com

## Phiên Bản

Tài liệu này áp dụng cho phiên bản: **v2.0 (19/01/2026)**

---

**Lưu ý:** Nút "Upload file mới" luôn hiển thị ở góc phải trên khi bạn đang ở trang Review hoặc Flashcards. Nếu không thấy nút này, hãy thử refresh trang hoặc clear cache.
