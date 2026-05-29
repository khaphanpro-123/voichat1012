# 🔍 Debug Guide: Documents-Simple Vocabulary Save Issue

## 📋 Vấn đề
Từ vựng được trích xuất từ `/dashboard-new/documents-simple` **không được tự động lưu** vào `/dashboard-new/vocabulary`, trong khi từ vựng từ `/dashboard-new/chat` (speaking) lưu được bình thường.

## ✅ Đã xác nhận
- ✅ MongoDB hoạt động bình thường (vocabulary từ `/chat` lưu được)
- ✅ API `/api/vocabulary` hoạt động bình thường
- ✅ Vấn đề chỉ xảy ra với `/documents-simple`

## 🔧 Đã thực hiện
Đã thêm **comprehensive debug logging** vào file `app/dashboard-new/documents-simple/page.tsx` để tracking toàn bộ quá trình save vocabulary.

### Debug Logs đã thêm:

#### 1. **Trước khi gọi handleSaveToDatabase** (line ~284)
```javascript
console.log("[Upload] About to save vocabulary to database. Data structure:", {
  hasVocabulary: !!data.vocabulary,
  hasFlashcards: !!data.flashcards,
  vocabularyLength: data.vocabulary?.length || 0,
  flashcardsLength: data.flashcards?.length || 0,
  sampleVocabulary: data.vocabulary?.[0] || data.flashcards?.[0] || null
})
```
**Mục đích:** Kiểm tra data structure từ API response

#### 2. **Khi handleSaveToDatabase được gọi** (line ~291)
```javascript
console.log("[DEBUG handleSaveToDatabase] Function called with data:", data)
console.log("[DEBUG handleSaveToDatabase] Vocabulary to save:", vocabularyToSave.length, "items")
```
**Mục đích:** Xác nhận function được gọi và số lượng items

#### 3. **Khi xử lý từng vocabulary item** (line ~310+)
```javascript
console.log(`[Save] Processing item ${index + 1}/${vocabularyToSave.length}:`, item)
console.log(`[Save] Payload for "${payload.word}":`, payload)
```
**Mục đích:** Xem chi tiết từng item và payload được gửi

#### 4. **Khi gửi request đến API** (line ~340+)
```javascript
console.log(`[Save] Sending POST request for "${payload.word}"...`)
console.log(`[Save] Response status for "${payload.word}":`, res.status, res.statusText)
```
**Mục đích:** Track HTTP request/response

#### 5. **Kết quả cuối cùng** (line ~360+)
```javascript
console.log("[Save] Final results - Saved:", savedCount, "Failed:", failedCount)
```
**Mục đích:** Tổng kết số lượng thành công/thất bại

## 🧪 Cách kiểm tra

### Bước 1: Mở test page
Mở file `test-documents-simple-save.html` trong browser hoặc truy cập trực tiếp:
```
http://localhost:3000/test-documents-simple-save.html
```

### Bước 2: Mở Documents-Simple
1. Click button "🚀 Mở Documents-Simple" hoặc truy cập:
   ```
   http://localhost:3000/dashboard-new/documents-simple
   ```

### Bước 3: Mở Developer Console
- Nhấn `F12` hoặc `Ctrl+Shift+I` (Windows/Linux)
- Nhấn `Cmd+Option+I` (Mac)
- Chọn tab **Console**

### Bước 4: Upload file
1. Upload một file PDF hoặc DOCX nhỏ (để test nhanh)
2. Đợi quá trình xử lý hoàn tất
3. Quan sát console logs

### Bước 5: Phân tích logs
Tìm các log messages sau trong console:

## 📊 Các trường hợp có thể xảy ra

### ✅ Case 1: Không có log nào
**Triệu chứng:** Console không có log `[Upload] About to save vocabulary`

**Nguyên nhân:**
- Upload thất bại trước khi đến bước save
- Response từ `/api/upload-document-complete` không hợp lệ
- JavaScript error xảy ra trước đó

**Cách fix:**
- Kiểm tra Network tab xem request `/api/upload-document-complete` có thành công không
- Kiểm tra Console tab xem có error nào không

---

### ⚠️ Case 2: Log "Vocabulary to save: 0 items"
**Triệu chứng:** 
```
[DEBUG handleSaveToDatabase] Vocabulary to save: 0 items
[DEBUG handleSaveToDatabase] No vocabulary to save, returning early
```

**Nguyên nhân:**
- Response từ API không có field `vocabulary` hoặc `flashcards`
- Field name không đúng (ví dụ: `words` thay vì `vocabulary`)
- Array rỗng

**Cách fix:**
1. Kiểm tra response từ `/api/upload-document-complete`:
   ```javascript
   // Trong Network tab, xem response body
   {
     "vocabulary": [...],  // Phải có field này
     "flashcards": [...],  // Hoặc field này
     ...
   }
   ```
2. Nếu field name khác, update code:
   ```javascript
   const vocabularyToSave = data.vocabulary || data.flashcards || data.words || []
   ```

---

### ❌ Case 3: Response status 401 (Unauthorized)
**Triệu chứng:**
```
[Save] Response status for "word": 401 Unauthorized
[Save] Failed to save "word": 401 {...}
```

**Nguyên nhân:**
- Không có session/authentication
- Session expired
- API `/api/vocabulary` không nhận được userId

**Cách fix:**
1. Đăng nhập lại
2. Kiểm tra session trong `/api/vocabulary`:
   ```typescript
   const session = await getServerSession(authOptions)
   console.log("Session:", session)  // Thêm log này
   ```
3. Kiểm tra cookie trong Application tab (DevTools)

---

### ❌ Case 4: Response status 500 (Server Error)
**Triệu chứng:**
```
[Save] Response status for "word": 500 Internal Server Error
[Save] Failed to save "word": 500 {...}
```

**Nguyên nhân:**
- MongoDB connection error
- Database query error
- Server-side exception

**Cách fix:**
1. Kiểm tra terminal logs (server console)
2. Kiểm tra MongoDB connection:
   ```bash
   # Trong terminal server
   # Tìm log: "Vocabulary save error:"
   ```
3. Test MongoDB connection:
   ```javascript
   // Trong /api/vocabulary/route.ts
   console.log("MongoDB URI:", process.env.MONGO_URI?.substring(0, 20))
   ```

---

### ❌ Case 5: Response status 429 (Rate Limit)
**Triệu chứng:**
```
[Save] Response status for "word": 429 Too Many Requests
[Save] Failed to save "word": 429 {...}
```

**Nguyên nhân:**
- Vượt quá rate limit (60 requests/minute)
- Upload file có quá nhiều vocabulary items

**Cách fix:**
1. Đợi 1 phút rồi thử lại
2. Tăng rate limit trong `/api/vocabulary/route.ts`:
   ```typescript
   const { allowed } = rateLimit(`vocab-post:${userId}`, 120, 60_000)  // 120 thay vì 60
   ```

---

### ❌ Case 6: Empty word after trim
**Triệu chứng:**
```
[Save] Item X failed - empty word after trim
```

**Nguyên nhân:**
- Vocabulary item không có `word` hoặc `phrase`
- Word chỉ chứa whitespace

**Cách fix:**
- Kiểm tra data từ Python API
- Đảm bảo `word` hoặc `phrase` field có giá trị hợp lệ

---

### ✅ Case 7: Success!
**Triệu chứng:**
```
[Save] Success response for "word": { success: true, message: "Vocabulary saved", ... }
[Save] Final results - Saved: 50 Failed: 0
```

**Xác nhận:**
1. Mở `/dashboard-new/vocabulary`
2. Filter by source: "document"
3. Kiểm tra từ vựng có xuất hiện không

**Nếu vẫn không thấy:**
- Clear cache và reload
- Kiểm tra filter settings
- Kiểm tra MongoDB collection trực tiếp

---

## 🔍 Debug Commands

### Kiểm tra MongoDB collection
```javascript
// Trong MongoDB Compass hoặc mongosh
use viettalk
db.vocabulary.find({ source: "document" }).limit(10)
```

### Kiểm tra session
```javascript
// Trong browser console
fetch('/api/vocabulary')
  .then(r => r.json())
  .then(d => console.log('Vocabulary API response:', d))
```

### Test save một từ
```javascript
// Trong browser console
fetch('/api/vocabulary', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    word: 'test',
    meaning: 'test meaning',
    source: 'document'
  })
})
  .then(r => r.json())
  .then(d => console.log('Save result:', d))
```

---

## 📝 Checklist khi gửi logs cho developer

Khi gửi logs, hãy bao gồm:

- [ ] **Console logs đầy đủ** (copy toàn bộ từ đầu đến cuối)
- [ ] **Network tab** - Screenshot request/response của:
  - `/api/upload-document-complete`
  - `/api/vocabulary` (nếu có)
- [ ] **File info** - Loại file, kích thước, số trang
- [ ] **Browser info** - Chrome/Firefox/Safari, version
- [ ] **Thời gian** - Khi nào xảy ra lỗi
- [ ] **Steps to reproduce** - Các bước để tái hiện lỗi

---

## 🎯 Next Steps

Sau khi có logs, developer sẽ:

1. **Xác định root cause** dựa trên logs
2. **Fix issue** trong code
3. **Test lại** với các scenarios khác nhau
4. **Remove debug logs** (hoặc giữ lại với log level)

---

## 📞 Contact

Nếu cần hỗ trợ thêm, gửi logs qua:
- GitHub Issue
- Email
- Chat/Slack

**Lưu ý:** Đừng gửi sensitive data (passwords, API keys) trong logs!
