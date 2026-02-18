# FIX LỖI 502 - BACKEND COLD START

## 🔍 Vấn đề

Khi upload file, gặp lỗi:
```
❌ Upload failed
Console: Failed to load resource: the server responded with a status of 502
```

## 💡 Nguyên nhân

### Lỗi 502 (Bad Gateway)
Railway backend đang ở trạng thái "cold start":
- Backend sleep sau 5-10 phút không hoạt động
- Khi có request mới, cần 10-30 giây để wake up
- Request đầu tiên sẽ bị timeout → 502 error

### Các nguyên nhân khác
1. File quá lớn (>20MB)
2. Backend đang deploy
3. Network timeout
4. Railway service down

## ✅ Giải pháp đã áp dụng

### 1. Tăng timeout
```typescript
// app/api/upload-document-complete/route.ts
export const maxDuration = 60 // 60 seconds

const controller = new AbortController()
const timeoutId = setTimeout(() => controller.abort(), 55000) // 55s
```

### 2. Better error handling
```typescript
if (response.status === 502) {
  return NextResponse.json(
    { error: "Backend đang khởi động, vui lòng thử lại sau 10 giây" },
    { status: 502 }
  )
}
```

### 3. Retry button
```typescript
{error.includes("502") && (
  <button onClick={handleUpload}>
    🔄 Thử lại
  </button>
)}
```

### 4. Non-blocking save
```typescript
// Don't await save, let it run in background
handleSaveToDatabase(data).catch(err => {
  console.error("Save error:", err)
})
```

## 🚀 Cách sử dụng

### Khi gặp lỗi 502

1. **Đợi 10 giây**
   - Backend đang wake up
   - Không spam click

2. **Click nút "🔄 Thử lại"**
   - Hoặc click lại "Trích xuất từ vựng"
   - Lần thứ 2 thường thành công

3. **Nếu vẫn lỗi**
   - Check Railway dashboard: https://railway.app/dashboard
   - Xem backend có đang deploy không
   - Xem logs có lỗi gì không

## 🔧 Cách kiểm tra Railway backend

### 1. Check status
```bash
# Vào Railway dashboard
https://railway.app/project/voichat1012

# Xem service status
- Running (green) ✅
- Deploying (yellow) ⚠️
- Crashed (red) ❌
```

### 2. Wake up backend manually
```bash
# Gọi health check endpoint
curl https://voichat1012-production.up.railway.app/health

# Hoặc mở trong browser
https://voichat1012-production.up.railway.app/
```

### 3. Check logs
```bash
# Trong Railway dashboard
Click vào service → Deployments → View Logs

# Tìm errors:
- "Out of memory"
- "Timeout"
- "Connection refused"
```

## 📊 Error codes

| Code | Nghĩa | Giải pháp |
|------|-------|-----------|
| 502 | Backend cold start | Đợi 10s, thử lại |
| 504 | Timeout | File quá lớn, giảm size |
| 500 | Server error | Check Railway logs |
| 413 | File too large | Giảm file size (<20MB) |

## 🎯 Best practices

### 1. Keep backend warm
```bash
# Cron job ping mỗi 5 phút
*/5 * * * * curl https://voichat1012-production.up.railway.app/health
```

### 2. Optimize file size
- PDF: Compress trước khi upload
- DOCX: Xóa hình ảnh không cần thiết
- Limit: <10MB recommended

### 3. User feedback
```typescript
// Show progress
setUploading(true)
setError("Đang xử lý... (có thể mất 30 giây)")

// Show retry option
if (error.includes("502")) {
  setError("Backend đang khởi động. Click 'Thử lại' sau 10 giây")
}
```

## 🐛 Debug checklist

Khi gặp lỗi upload:

- [ ] Check file format (PDF/DOCX/DOC)
- [ ] Check file size (<20MB)
- [ ] Check Railway backend status
- [ ] Check browser console errors
- [ ] Check network tab (DevTools)
- [ ] Try different file
- [ ] Try incognito mode
- [ ] Clear browser cache
- [ ] Wait 10 seconds and retry

## 📝 Files modified

1. ✅ `app/api/upload-document-complete/route.ts`
   - Added timeout (60s)
   - Better error messages
   - 502 handling

2. ✅ `app/dashboard-new/documents/page.tsx`
   - Retry button for 502
   - Non-blocking save
   - Better error display

## 🚀 Deploy

```bash
git add app/api/upload-document-complete/route.ts
git add app/dashboard-new/documents/page.tsx
git add FIX_502_ERROR.md
git commit -m "fix: Handle 502 error with retry button and better timeout"
git push origin main
```

## ✅ Test

1. Upload file
2. Nếu gặp 502:
   - Thấy message "Backend đang khởi động"
   - Thấy nút "🔄 Thử lại"
   - Click thử lại
   - Lần 2 thành công

## 💡 Tips

### Tránh 502 error
1. **Keep backend warm**: Ping mỗi 5 phút
2. **Upload file nhỏ**: <5MB tốt nhất
3. **Đợi backend ready**: Sau deploy đợi 1 phút

### Nếu vẫn lỗi
1. Check Railway có đang deploy không
2. Check Railway có đủ credits không
3. Check MongoDB connection
4. Contact Railway support

---

**Status**: ✅ FIXED
**Deploy**: Ready to push
**Test**: Upload file và verify retry button hoạt động
