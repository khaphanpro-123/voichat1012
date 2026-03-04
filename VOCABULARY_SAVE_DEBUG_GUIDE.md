# Hướng Dẫn Debug Lỗi Lưu Từ Vựng

## Vấn Đề Hiện Tại

Từ log của bạn:
```
✅ save complete: 11 saved, 33 failed
⚠️ Dictionary API failed: No module named 'requests'
✓ Added IPA to 0/44 items ❌
```

## Nguyên Nhân

### 1. 33 Từ Fail Khi Lưu

**Có thể do:**
- Từ trùng lặp (đã tồn tại trong database)
- Từ không có field `word` hoặc `phrase`
- Session/Auth timeout
- API validation lỗi

**Đã fix:**
- Thêm validation: skip items không có word
- Cải thiện error logging: hiển thị 5 lỗi đầu tiên
- Thêm warning message rõ ràng hơn

### 2. IPA Không Có (0/44 items)

**Nguyên nhân:**
- Railway thiếu thư viện `requests`
- Backend không thể gọi Dictionary API

**Đã fix:**
- Thêm comment mới vào `requirements-railway.txt` để trigger rebuild
- Railway sẽ cài đặt lại `requests==2.31.0`

## Cách Kiểm Tra Sau Khi Deploy

### Bước 1: Đợi Deploy Hoàn Tất (2-3 phút)

- Frontend: Vercel auto-deploy
- Backend: Railway auto-deploy

### Bước 2: Upload Tài Liệu Mới

1. Vào `/dashboard-new/documents-simple`
2. Upload một tài liệu PDF/DOCX
3. Mở Console (F12)

### Bước 3: Kiểm Tra Console Log

**Log bạn cần xem:**

```javascript
// 1. Kiểm tra payload
💾 First item payload: {
  word: "government",
  meaning: "...",
  ipa: "/ˈɡʌvənmənt/",  // ✅ Phải có IPA
  partOfSpeech: "noun",  // ✅ Phải có POS
  type: "noun"
}

// 2. Kiểm tra IPA
💾 IPA check: {
  hasPhonetic: true,
  hasIpa: true,
  phoneticValue: "/ˈɡʌvənmənt/",
  ipaValue: "/ˈɡʌvənmənt/",
  finalIpa: "/ˈɡʌvənmənt/"
}

// 3. Kiểm tra POS
💾 POS check: {
  hasPosLabel: true,
  posLabelValue: "noun",
  finalPartOfSpeech: "noun",
  finalType: "noun"
}

// 4. Kiểm tra save result
✅ Save complete: 44 saved, 0 failed  // ✅ Phải 0 failed

// 5. Nếu có lỗi
❌ Save errors (showing first 5 of 33):
  1. Failed to save word: xxx - error message
  2. Failed to save word: yyy - error message
  ...
```

### Bước 4: Kiểm Tra Backend Log (Railway)

Vào Railway dashboard → Logs, tìm:

```
✓ Added IPA to 44/44 items ✅  // ✅ Phải thành công
✓ Added POS to 44/44 items ✅
```

**Nếu vẫn lỗi:**
```
⚠️ Dictionary API failed: No module named 'requests'
```
→ Railway chưa rebuild, đợi thêm 2-3 phút

### Bước 5: Kiểm Tra /vocabulary

1. Vào `/dashboard-new/vocabulary`
2. Kiểm tra:
   - ✅ IPA hiển thị đúng format `/ˈɡʌvənmənt/`
   - ✅ Từ vựng được phân loại đúng nhóm (Danh từ, Động từ, etc.)
   - ✅ Không còn tất cả vào nhóm "Khác"

## Các Lỗi Thường Gặp

### Lỗi 1: "Failed to save word: xxx - User ID not found in session"

**Nguyên nhân:** Session timeout hoặc chưa login

**Giải pháp:**
1. Logout và login lại
2. Refresh trang
3. Upload lại tài liệu

### Lỗi 2: "Skipped item with no word"

**Nguyên nhân:** Backend trả về item không có `word` hoặc `phrase`

**Giải pháp:**
- Đây là validation bình thường
- Item này sẽ bị skip, không ảnh hưởng

### Lỗi 3: "Failed to save word: xxx - Duplicate key error"

**Nguyên nhân:** Từ đã tồn tại trong database

**Giải pháp:**
- API sẽ update từ cũ thay vì insert mới
- Nếu vẫn lỗi, có thể do index database

### Lỗi 4: IPA vẫn không có sau khi deploy

**Kiểm tra:**
1. Railway log có dòng: `✓ Added IPA to X/Y items ✅`
2. Nếu X = 0, kiểm tra:
   ```
   ⚠️ Dictionary API failed: [error message]
   ```

**Giải pháp:**
- Nếu vẫn thiếu `requests`: Trigger rebuild thủ công trên Railway
- Nếu API rate limit: Đợi vài phút rồi upload lại

## Code Changes (Commit 2251a87)

### 1. Improved Error Logging

```typescript
// Before: Only show errors if ≤5
if (errors.length > 0 && errors.length <= 5) {
  console.error("❌ Errors:", errors)
}

// After: Always show first 5 errors
if (errors.length > 0) {
  console.error(`\n❌ Save errors (showing first 5 of ${errors.length}):`)
  errors.slice(0, 5).forEach((err, i) => {
    console.error(`  ${i + 1}. ${err}`)
  })
}
```

### 2. Validation Before Save

```typescript
// Skip if no word
if (!payload.word || payload.word.trim() === '') {
  failedCount++
  const errorMsg = `Skipped item with no word: ${JSON.stringify(item).substring(0, 100)}`
  errors.push(errorMsg)
  console.warn(`⚠️ ${errorMsg}`)
  return
}
```

### 3. Better User Notification

```typescript
if (failedCount > 0) {
  console.warn(`⚠️ ${failedCount} từ không lưu được - xem console để biết chi tiết`)
}
```

## Next Steps

1. **Đợi deploy hoàn tất** (2-3 phút)
2. **Upload tài liệu mới** và kiểm tra console
3. **Gửi screenshot console log** nếu vẫn có lỗi
4. **Kiểm tra Railway log** để xác nhận IPA working

## Expected Result

Sau khi fix:
- ✅ IPA: 44/44 items có IPA
- ✅ POS: 44/44 items có từ loại
- ✅ Save: 44 saved, 0 failed
- ✅ Vocabulary page: Phân loại đúng nhóm từ loại
- ✅ IPA display: Format chuẩn `/ˈɡʌvənmənt/`
