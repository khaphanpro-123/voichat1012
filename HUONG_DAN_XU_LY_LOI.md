# HƯỚNG DẪN XỬ LÝ LỖI UPLOAD

## ❌ Lỗi: "Upload failed" hoặc 502

### Nguyên nhân
Backend Railway đang ở trạng thái "ngủ" (cold start) và cần thời gian để khởi động.

### Giải pháp

#### Bước 1: Đợi 10 giây
```
Backend đang wake up...
Không click gì cả, chỉ đợi 10 giây
```

#### Bước 2: Click nút "🔄 Thử lại"
```
Sau 10 giây, click nút "Thử lại" trong error box
Hoặc click lại nút "Trích xuất từ vựng"
```

#### Bước 3: Thành công!
```
Lần thứ 2 thường sẽ thành công
Backend đã sẵn sàng
```

## 🎯 Quy trình upload đúng

### 1. Chọn file
```
Click vào vùng upload
Chọn file PDF hoặc DOCX
File size: <10MB (recommended)
```

### 2. Click "Trích xuất từ vựng"
```
Đợi loading (10-30 giây)
Không refresh trang
```

### 3. Nếu gặp lỗi 502
```
Thấy message: "Backend đang khởi động..."
Thấy nút: "🔄 Thử lại"
Đợi 10 giây
Click "Thử lại"
```

### 4. Xem kết quả
```
✅ Trích xuất thành công!
Xem từ vựng
Xem sơ đồ tư duy
Nghe phát âm
```

## 🔍 Các lỗi khác

### Lỗi: "File too large"
**Nguyên nhân**: File >20MB
**Giải pháp**: 
- Compress PDF
- Xóa hình ảnh trong DOCX
- Chia nhỏ file

### Lỗi: "Invalid file format"
**Nguyên nhân**: File không phải PDF/DOCX
**Giải pháp**:
- Chỉ upload PDF, DOCX, DOC
- Convert file sang đúng format

### Lỗi: "Request timeout"
**Nguyên nhân**: File quá lớn hoặc phức tạp
**Giải pháp**:
- Giảm file size
- Thử file đơn giản hơn
- Thử lại sau

### Lỗi: "Backend error"
**Nguyên nhân**: Lỗi xử lý trên server
**Giải pháp**:
- Thử file khác
- Báo admin
- Check Railway logs

## 💡 Tips tránh lỗi

### 1. File tốt nhất
- Format: DOCX (tốt hơn PDF)
- Size: 1-5MB
- Content: Text nhiều, hình ít
- Language: Tiếng Anh

### 2. Thời điểm upload
- Tránh giờ cao điểm
- Nếu backend mới deploy, đợi 1 phút
- Nếu lâu không dùng, request đầu có thể lỗi

### 3. Browser
- Dùng Chrome/Edge (tốt nhất)
- Clear cache nếu lỗi
- Thử incognito mode

## 📊 Thời gian xử lý

| File size | Thời gian |
|-----------|-----------|
| <1MB | 5-10 giây |
| 1-5MB | 10-20 giây |
| 5-10MB | 20-30 giây |
| >10MB | 30-60 giây |

## 🚨 Khi nào cần báo lỗi?

### Báo ngay nếu:
- Thử lại 3 lần vẫn lỗi
- Lỗi không phải 502
- File nhỏ (<5MB) nhưng vẫn timeout
- Lỗi lạ không có trong list

### Thông tin cần cung cấp:
1. File size
2. File format
3. Error message
4. Screenshot console (F12)
5. Thời gian xảy ra lỗi

## ✅ Checklist debug

Khi gặp lỗi, check theo thứ tự:

- [ ] File đúng format? (PDF/DOCX)
- [ ] File size <20MB?
- [ ] Đã đợi 10 giây?
- [ ] Đã click "Thử lại"?
- [ ] Browser console có lỗi gì?
- [ ] Network tab có request nào fail?
- [ ] Thử file khác?
- [ ] Thử browser khác?
- [ ] Clear cache?
- [ ] Thử incognito?

## 🎯 Kết quả mong đợi

### Upload thành công
```
✅ Trích xuất thành công!
✅ Đã tìm thấy X từ vựng
✅ Đã lưu vào database
✅ Hiển thị sơ đồ tư duy
✅ Hiển thị danh sách từ vựng
```

### Có thể nghe phát âm
```
🔊 Click icon bên cạnh từ
🔊 Click icon trong câu
🎧 Nghe giọng tiếng Anh chuẩn
```

### Có thể xem chi tiết
```
📖 Nghĩa của từ
📝 Câu ví dụ
🔄 Từ đồng nghĩa
📊 Điểm quan trọng
```

---

**Tóm tắt**: Nếu gặp lỗi 502, đợi 10 giây và click "Thử lại". Lần thứ 2 sẽ thành công!

🚀 **Happy learning!**
