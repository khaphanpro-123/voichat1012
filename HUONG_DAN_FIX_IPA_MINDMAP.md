# 📖 HƯỚNG DẪN - FIX IPA & MINDMAP

## 🎯 ĐÃ FIX GÌ?

### 1. ✅ Phiên Âm IPA
**Trước đây:**
```
machine learning
📖 Nghĩa: Học máy
💡 Ví dụ: Machine learning is...
```

**Bây giờ:**
```
machine learning /məˈʃiːn ˈlɜːnɪŋ/
                 ^^^^^^^^^^^^^^^^^^^^
                 (màu xanh, dễ đọc)
📖 Nghĩa: Học máy
💡 Ví dụ: Machine learning is...
```

### 2. ✅ Debug Mindmap
**Trước đây:**
- Click vào Markmap → không thấy gì
- Không biết lỗi ở đâu

**Bây giờ:**
- Mở Console (F12) → thấy thông tin chi tiết
- Biết chính xác có data hay không
- Buttons tự động disabled nếu không có data

---

## 🚀 CÁCH DEPLOY

### Bước 1: Chạy Script Deploy
```bash
# Double-click file này:
DEPLOY_NOW_IPA_FIX.bat

# Hoặc chạy lệnh:
git add .
git commit -m "fix: Add IPA phonetics & enhance mindmap debug"
git push origin main
```

### Bước 2: Đợi Deploy Xong
- Railway: 5-7 phút
- Vercel: 2-3 phút
- Tổng: ~10 phút

### Bước 3: Kiểm Tra
1. Mở website
2. Upload file PDF/DOCX
3. Xem từ vựng → phải có IPA
4. Mở Console (F12) → xem debug info

---

## ✅ CÁCH KIỂM TRA

### Kiểm Tra 1: IPA Có Hiển Thị Không?

**Làm gì:**
1. Upload file test
2. Đợi xử lý xong
3. Xem danh sách từ vựng

**Kết quả mong đợi:**
```
✅ Mỗi từ có IPA:
   machine learning /məˈʃiːn ˈlɜːnɪŋ/
   artificial intelligence /ˌɑːrtɪˈfɪʃəl ɪnˈtelɪdʒəns/
   
✅ IPA màu xanh dương
✅ Font dễ đọc (monospace)
```

**Nếu không thấy IPA:**
- Xem phần "Xử Lý Lỗi" bên dưới

---

### Kiểm Tra 2: Mindmap Debug

**Làm gì:**
1. Upload file test
2. Nhấn F12 (mở Console)
3. Xem logs

**Kết quả mong đợi:**
```javascript
✅ Thấy log này:
🔍 Markmap Debug: {
  hasGraph: true,
  hasEntities: true,
  entitiesLength: 50,
  hasRelations: true,
  relationsLength: 120,
  firstEntity: { id: "...", label: "...", type: "..." }
}

✅ Nếu có data:
   - Buttons màu xanh/tím/cam (active)
   - Click vào → mở mindmap

✅ Nếu không có data:
   - Buttons màu xám (disabled)
   - Tooltip: "Không đủ dữ liệu"
```

---

## 🔧 XỬ LÝ LỖI

### Lỗi 1: IPA Không Hiển Thị

**Triệu chứng:**
- Upload xong nhưng không thấy IPA
- Chỉ thấy tên từ, không có `/phonetic/`

**Cách fix:**

#### Bước 1: Kiểm tra Railway logs
```bash
railway logs | grep "IPA"

# Phải thấy:
"Adding IPA phonetics to vocabulary items..."
"✓ All 50 items have phonetic field"
```

#### Bước 2: Kiểm tra library
```bash
railway run pip list | grep eng-to-ipa

# Phải thấy:
eng-to-ipa    0.0.2
```

#### Bước 3: Nếu không có library
```bash
# Redeploy Railway:
railway up --force

# Hoặc install thủ công:
railway run pip install eng-to-ipa
```

#### Bước 4: Kiểm tra API response
1. Mở Network tab (F12)
2. Upload file
3. Xem response của `/api/upload-document-complete`
4. Phải thấy field `phonetic` trong mỗi vocabulary item

---

### Lỗi 2: Mindmap Không Hoạt Động

**Triệu chứng:**
- Click vào Markmap/Mermaid/Excalidraw
- Mở tab mới nhưng trắng xóa

**Cách fix:**

#### Bước 1: Xem Console logs
```javascript
// Mở Console (F12), tìm:
🔍 Markmap Debug: {...}

// Kiểm tra:
hasEntities: true/false?
entitiesLength: bao nhiêu?
```

#### Bước 2: Nếu `hasEntities: false`
- **Nguyên nhân:** Backend không tạo knowledge graph
- **Fix:** Kiểm tra Railway logs cho Stage 11
- **Có thể:** Không đủ từ vựng để tạo graph

#### Bước 3: Nếu `hasEntities: true` nhưng link fail
- **Nguyên nhân:** External service (markmap.js.org) down
- **Fix:** Thử tool khác (Mermaid hoặc Excalidraw)
- **Hoặc:** Đợi service phục hồi

#### Bước 4: Nếu link mở nhưng blank
- **Nguyên nhân:** Markdown format sai
- **Fix:** Xem markdown trong console logs
- **Check:** Entity labels có hợp lệ không

---

## 📊 SO SÁNH TRƯỚC/SAU

### Trước Fix:

**Vocabulary Display:**
```
machine learning
📖 Nghĩa: Học máy
💡 Ví dụ: Machine learning is a subset of AI...
⭐ Score: 0.85
```

**Mindmap:**
- Click → blank page
- Không biết lỗi gì

---

### Sau Fix:

**Vocabulary Display:**
```
machine learning /məˈʃiːn ˈlɜːnɪŋ/
                 ^^^^^^^^^^^^^^^^^^^^
                 (màu xanh, font đẹp)
📖 Nghĩa: Học máy
💡 Ví dụ: Machine learning is a subset of AI...
⭐ Score: 0.85
```

**Mindmap:**
- Console logs chi tiết
- Buttons disabled nếu không có data
- Biết chính xác vấn đề ở đâu

---

## 🎯 CHECKLIST HOÀN CHỈNH

### Trước Deploy:
- [x] Code đã fix
- [x] Requirements đã update
- [x] Documentation đã viết
- [x] Script deploy đã tạo

### Sau Deploy:
- [ ] Railway deploy thành công
- [ ] Vercel deploy thành công
- [ ] Test upload document
- [ ] IPA hiển thị đúng
- [ ] Console logs hoạt động
- [ ] Mindmap buttons đúng trạng thái

### Sau Test:
- [ ] User feedback tích cực
- [ ] Không có lỗi mới
- [ ] Performance ổn định
- [ ] Ready cho feature tiếp theo

---

## 📞 HỖ TRỢ

### Nếu gặp vấn đề:

1. **Xem logs:**
   - Railway: `railway logs`
   - Vercel: Dashboard → Logs
   - Browser: Console (F12)

2. **Xem documentation:**
   - `FIX_IPA_MINDMAP_COMPLETE.md` - Chi tiết kỹ thuật
   - `DEPLOY_IPA_FIX.md` - Hướng dẫn deploy
   - `FINAL_FIX_SUMMARY.md` - Tổng quan

3. **Rollback nếu cần:**
   - Railway: `railway rollback`
   - Vercel: Dashboard → Previous deployment

4. **Test với file nhỏ:**
   - Upload file text đơn giản trước
   - Xem có lỗi không
   - Sau đó mới test file lớn

---

## 🎉 KẾT QUẢ MONG ĐỢI

### Sau khi deploy thành công:

✅ **IPA Phonetics:**
- Mỗi từ vựng có phiên âm IPA
- Hiển thị đẹp, dễ đọc
- Giúp học phát âm tốt hơn

✅ **Mindmap Debug:**
- Console logs chi tiết
- Biết chính xác có data hay không
- Buttons tự động disabled khi cần

✅ **User Experience:**
- Giao diện chuyên nghiệp hơn
- Dễ debug khi có vấn đề
- Học từ vựng hiệu quả hơn

---

## 🚀 SẴN SÀNG DEPLOY

**Chạy lệnh:**
```bash
DEPLOY_NOW_IPA_FIX.bat
```

**Hoặc:**
```bash
git add .
git commit -m "fix: Add IPA phonetics & enhance mindmap debug"
git push origin main
```

**Thời gian:** ~10 phút

**Downtime:** 0 phút (rolling deployment)

**Rollback:** Có sẵn nếu cần

---

**Chúc deploy thành công! 🎉**
