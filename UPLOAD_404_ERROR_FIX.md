# 🔧 Fix Upload 404 Error - Double Slash Issue

## Ngày: 2026-03-05 14:10
## Commit: 3a81ebd

---

## ❌ LỖI

Railway logs:
```
POST //upload-document-complete HTTP/1.1" 404 Not Found
```

Frontend console:
```
Failed to load resource: 404 (Not Found)
Backend error: {"detail":"Not Found"}
```

---

## 🔍 NGUYÊN NHÂN

### Vấn đề 1: Không có API Route trong Next.js
- Frontend gọi `/api/upload-document-complete`
- Next.js không có route này → 404

### Vấn đề 2: Double Slash trong URL
- Next.js API route proxy đến Railway
- URL: `${BACKEND_URL}/upload-document-complete`
- Nếu `BACKEND_URL` có trailing slash `/` → `https://...app//upload-document-complete`
- Railway không nhận diện route với double slash → 404

---

## ✅ GIẢI PHÁP

### Fix 1: Tạo Next.js API Route (Commit 9fdac7d)

Tạo file `app/api/upload-document-complete/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server"

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 
  "https://voichat1012-production.up.railway.app"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    
    const response = await fetch(`${BACKEND_URL}/upload-document-complete`, {
      method: "POST",
      body: formData,
    })
    
    if (!response.ok) {
      const error = await response.text()
      return NextResponse.json(
        { error: `Backend error: ${response.statusText}` },
        { status: response.status }
      )
    }
    
    const data = await response.json()
    return NextResponse.json(data)
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to upload document" },
      { status: 500 }
    )
  }
}
```

**Vấn đề**: Vẫn bị double slash nếu `BACKEND_URL` có trailing `/`

### Fix 2: Remove Trailing Slash (Commit 3a81ebd)

```typescript
const BACKEND_URL = (
  process.env.NEXT_PUBLIC_API_URL || 
  "https://voichat1012-production.up.railway.app"
).replace(/\/$/, "")  // Remove trailing slash
```

**Kết quả**:
- `https://...app/` → `https://...app`
- `${BACKEND_URL}/upload-document-complete` → `https://...app/upload-document-complete` ✅

---

## 📊 TIMELINE

```
11:54 - User upload file → 404 Not Found
12:00 - Phát hiện: Không có API route trong Next.js
12:05 - Fix 1: Tạo API route (commit 9fdac7d)
14:09 - Vẫn lỗi: Double slash //upload-document-complete
14:10 - Fix 2: Remove trailing slash (commit 3a81ebd)
14:15 - Đợi Vercel deploy...
```

---

## 🧪 CÁCH KIỂM TRA

### 1. Đợi Vercel Deploy (1-2 phút)
- Vào https://vercel.com/dashboard
- Check deployment status = "Ready"

### 2. Test Upload
1. Refresh trang: https://voichat1012.vercel.app/dashboard-new/documents-simple
2. Upload file PDF/DOCX
3. Mở Console (F12)

### 3. Kiểm tra Network Tab
1. F12 → Network tab
2. Upload file
3. Tìm request `upload-document-complete`
4. Check:
   - Status: 200 OK ✅ (không còn 404)
   - Response: Có vocabulary data
   - Request URL: Không có double slash

### 4. Kiểm tra Railway Logs
Tìm dòng:
```
POST /upload-document-complete HTTP/1.1" 200 OK
```

Không còn:
```
POST //upload-document-complete HTTP/1.1" 404 Not Found
```

---

## 🎯 KẾT QUẢ MONG ĐỢI

### Trước khi fix:
```
❌ Frontend → /api/upload-document-complete → 404 (No route)
❌ Next.js → https://...app//upload-document-complete → 404 (Double slash)
```

### Sau khi fix:
```
✅ Frontend → /api/upload-document-complete → Next.js API route
✅ Next.js → https://...app/upload-document-complete → Railway backend
✅ Railway → Process document → Return vocabulary
✅ Frontend → Display vocabulary
```

---

## 📝 FILES THAY ĐỔI

### Commit 9fdac7d:
- `app/api/upload-document-complete/route.ts` (NEW)

### Commit 3a81ebd:
- `app/api/upload-document-complete/route.ts` (UPDATED)

---

## 🔗 RELATED ISSUES

### Issue 1: IPA không hiển thị
- **Status**: Fixed (commit ee0c4fc)
- **Solution**: Tăng API rate limit delay, timeout

### Issue 2: POS grouping hiển thị "Khác"
- **Status**: Fixed (commit ee0c4fc)
- **Solution**: Sync partOfSpeech và type fields

### Issue 3: Division by zero warning
- **Status**: Fixed (commit 9a6607a)
- **Solution**: Check zero vectors trước khi chia

### Issue 4: IndentationError
- **Status**: Fixed (commit 63e5bdc)
- **Solution**: Remove duplicate line

### Issue 5: 404 Not Found
- **Status**: Fixed (commit 3a81ebd) ← CURRENT
- **Solution**: Tạo API route + remove trailing slash

---

## 🚨 NẾU VẪN LỖI

### Lỗi 1: Vẫn 404 Not Found

**Kiểm tra**:
1. Vercel đã deploy chưa?
2. File `app/api/upload-document-complete/route.ts` có tồn tại không?
3. Vercel logs có error không?

**Giải pháp**:
- Clear Vercel cache và redeploy
- Check Vercel build logs

### Lỗi 2: 500 Internal Server Error

**Kiểm tra**:
1. Railway logs có error gì?
2. Backend có crash không?

**Giải pháp**:
- Check Railway logs
- Restart Railway service

### Lỗi 3: Timeout

**Kiểm tra**:
1. File size quá lớn?
2. Backend xử lý quá lâu?

**Giải pháp**:
- Upload file nhỏ hơn (<5MB)
- Tăng timeout trong Next.js API route

---

## ✅ CHECKLIST

- [x] Tạo Next.js API route
- [x] Remove trailing slash từ BACKEND_URL
- [x] Commit và push code
- [ ] Đợi Vercel deploy
- [ ] Test upload file
- [ ] Verify không còn 404 error
- [ ] Verify vocabulary hiển thị đúng
- [ ] Verify IPA và POS hoạt động

---

## 📞 NEXT STEPS

1. **ĐỢI 1-2 PHÚT**: Vercel deploy
2. **REFRESH TRANG**: Clear cache
3. **UPLOAD FILE**: Test lại
4. **CHECK CONSOLE**: Xem có error không
5. **VERIFY**: Vocabulary có hiển thị không

Nếu vẫn lỗi, cung cấp:
- Console logs (F12 → Console)
- Network tab (F12 → Network → upload-document-complete → Response)
- Railway logs (nếu có error)
