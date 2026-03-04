# 🔍 Hướng Dẫn Debug Auto-Save và IPA

## ❓ Vấn Đề

1. **Auto-save không hoạt động** - Từ vựng từ upload tài liệu không tự động lưu vào `/vocabulary`
2. **IPA không hiển thị** trong trang `/vocabulary`

## ✅ Đã Fix

### 1. Cải Thiện Error Handling cho Auto-Save

**Thay đổi:**
- Thêm try-catch cho từng operation save
- Return `savedCount` và `failedCount` từ `handleSaveToDatabase()`
- Log chi tiết errors (tối đa 5 errors)
- Show notification cho user khi save xong

**Code:**
```typescript
const handleSaveToDatabase = async (data: any) => {
  try {
    // ... save logic ...
    
    try {
      const response = await fetch("/api/vocabulary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      
      if (!response.ok) {
        failedCount++
        const errorText = await response.text()
        const errorMsg = `Failed to save word: ${item.word || item.phrase} - ${errorText}`
        errors.push(errorMsg)
        console.error(`❌ ${errorMsg}`)
      } else {
        savedCount++
      }
    } catch (err: any) {
      failedCount++
      const errorMsg = `Error saving word: ${item.word || item.phrase} - ${err.message}`
      errors.push(errorMsg)
      console.error(`❌ ${errorMsg}`)
    }
    
    // Return results
    return { savedCount, failedCount }
  } catch (err) {
    console.error("❌ Save error:", err)
    return { savedCount: 0, failedCount: 0 }
  }
}
```

### 2. IPA Field Mapping

**Backend → Frontend → Database:**
```
Backend (complete_pipeline.py):
  item['ipa'] = ipa_result
  item['phonetic'] = ipa_result

Frontend (documents-simple/page.tsx):
  payload.ipa = item.ipa || item.phonetic || ""
  payload.pronunciation = item.phonetic || item.ipa || ""

Database (vocabulary collection):
  {
    ipa: "...",
    pronunciation: "..."
  }

Vocabulary Page (vocabulary/page.tsx):
  getPronunciation(word):
    - word.ipa (priority 1)
    - word.pronunciation (priority 2)
    - getIPA(word.word) (fallback dictionary)
```

## 🔍 Cách Debug

### Bước 1: Kiểm Tra Console Logs

Sau khi upload tài liệu, mở Chrome DevTools (F12) và xem console:

```
✅ Logs thành công:
💾 Vocabulary to save: 68 items
💾 First item payload: { word: "...", ipa: "...", ... }
💾 IPA check: { hasIpa: true, ipaValue: "...", finalIpa: "..." }
✅ First item saved successfully: { success: true, ... }
✅ Save complete: 68 saved, 0 failed
✅ Đã lưu 68 từ vào kho từ vựng

❌ Logs có lỗi:
❌ Failed to save word: climate change - Error: ...
❌ Errors: ["Failed to save word: ...", ...]
⚠️ 5 từ không lưu được
```

### Bước 2: Kiểm Tra Backend Response

Trong console, tìm log:
```javascript
📊 Backend response: { vocabulary: [...], vocabulary_by_difficulty: {...} }
📊 First vocabulary item: { phrase: "...", ipa: "...", phonetic: "..." }
📊 IPA field check: { hasIpa: true, ipaValue: "..." }
```

**Nếu `hasIpa: false`:**
- Backend không generate IPA
- Kiểm tra Railway logs xem có lỗi `eng_to_ipa` không

### Bước 3: Kiểm Tra Database

Mở MongoDB và query:
```javascript
db.vocabulary.find({ source: /^document_/ }).limit(5)
```

**Kiểm tra:**
- Field `ipa` có tồn tại không?
- Field `pronunciation` có tồn tại không?
- Giá trị có phải empty string không?

### Bước 4: Kiểm Tra Vocabulary Page

Vào `/dashboard-new/vocabulary` và mở console:
```javascript
📚 Loaded vocabulary: 514 items
📊 Vocabulary stats: { total: 514, vocabulary: 514, withIPA: 45 }
```

**Nếu `withIPA: 0`:**
- Database không có IPA
- Auto-save có thể đã fail
- Hoặc backend không trả về IPA

## 🐛 Các Lỗi Thường Gặp

### Lỗi 1: Auto-save fail im lặng

**Triệu chứng:**
- Console không có log `✅ Save complete`
- Vocabulary page không có từ mới

**Nguyên nhân:**
- Network error
- MongoDB connection error
- Payload validation error

**Cách fix:**
- Xem console logs chi tiết
- Kiểm tra Network tab trong DevTools
- Xem MongoDB connection string trong `.env`

### Lỗi 2: IPA không được generate

**Triệu chứng:**
- Console log: `hasIpa: false`
- Railway logs: `⚠️ eng_to_ipa not installed`

**Nguyên nhân:**
- Library `eng-to-ipa` chưa được cài đặt trên Railway
- Library bị lỗi khi convert

**Cách fix:**
- Kiểm tra `python-api/requirements-railway.txt` có `eng-to-ipa>=0.0.2`
- Redeploy Railway
- Xem Railway logs sau khi deploy

### Lỗi 3: IPA không hiển thị trong Vocabulary Page

**Triệu chứng:**
- Database có IPA
- Vocabulary page không hiển thị

**Nguyên nhân:**
- Frontend không đọc field `ipa` đúng cách
- CSS ẩn IPA

**Cách fix:**
- Kiểm tra `getPronunciation()` function
- Inspect element xem có render không

## 📊 Test Cases

### Test 1: Upload và Auto-Save

1. Upload file PDF/DOCX
2. Đợi xử lý xong
3. Mở console, tìm:
   ```
   ✅ Save complete: X saved, 0 failed
   ```
4. Vào `/dashboard-new/vocabulary`
5. Kiểm tra số lượng từ tăng lên

**Expected:** Số từ tăng = số từ saved

### Test 2: IPA Generation

1. Upload file
2. Mở console, tìm:
   ```
   📊 IPA field check: { hasIpa: true, ipaValue: "..." }
   ```
3. Vào `/dashboard-new/vocabulary`
4. Kiểm tra từ có IPA `/.../ ` bên cạnh

**Expected:** Mỗi từ có IPA hoặc empty string

### Test 3: Database Persistence

1. Upload file
2. Đợi auto-save xong
3. Refresh page
4. Vào `/dashboard-new/vocabulary`
5. Kiểm tra từ vẫn còn

**Expected:** Từ vẫn hiển thị sau refresh

## 🔧 Manual Fix

Nếu auto-save không hoạt động, có thể save manually:

### Cách 1: Từ Console

```javascript
// Get vocabulary from result
const vocab = result.vocabulary

// Save each word
for (const item of vocab) {
  await fetch("/api/vocabulary", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      word: item.phrase,
      meaning: item.definition || "",
      example: item.context_sentence || "",
      ipa: item.ipa || "",
      pronunciation: item.phonetic || "",
      level: "intermediate",
      source: "manual"
    })
  })
}
```

### Cách 2: Export và Import

1. Export vocabulary từ upload result:
   ```javascript
   console.log(JSON.stringify(result.vocabulary, null, 2))
   ```
2. Copy JSON
3. Tạo script import vào MongoDB

## 📝 Checklist Debug

- [ ] Console có log `💾 Vocabulary to save: X items`?
- [ ] Console có log `✅ Save complete: X saved, 0 failed`?
- [ ] Console có log `📊 IPA field check: { hasIpa: true }`?
- [ ] Network tab có request POST `/api/vocabulary`?
- [ ] Response status 200 OK?
- [ ] MongoDB có documents mới trong collection `vocabulary`?
- [ ] Documents có field `ipa` và `pronunciation`?
- [ ] Vocabulary page load được từ mới?
- [ ] Vocabulary page hiển thị IPA?

## 🚀 Next Steps

Sau khi deploy (2-3 phút):

1. **Test upload mới:**
   - Upload file test
   - Mở console
   - Kiểm tra logs

2. **Verify database:**
   - Vào MongoDB
   - Query collection `vocabulary`
   - Kiểm tra IPA field

3. **Check vocabulary page:**
   - Vào `/dashboard-new/vocabulary`
   - Kiểm tra số lượng từ
   - Kiểm tra IPA hiển thị

---

**Commit:** a0a0962  
**Status:** ✅ Improved error handling  
**Đang chờ:** Vercel deploy (2-3 phút) ⏳
