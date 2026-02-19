# GIẢI QUYẾT LỖI RAILWAY + VERCEL

## 🔴 LỖI 1: Railway Logging Rate Limit

### Triệu chứng
```
Railway rate limit of 500 logs/sec reached for replica
Messages dropped: 490
```

### Nguyên nhân
Python API đang log quá nhiều (> 500 logs/giây), Railway drop messages.

### Giải pháp: Giảm logging trong Python API

#### Bước 1: Tắt debug logs không cần thiết

**File: `python-api/complete_pipeline_12_stages.py`**

Tìm và comment các dòng print debug:
```python
# Tìm các dòng như:
print(f"  🔍 DEBUG - ...")
print(f"  📊 DEBUG - ...")

# Comment lại:
# print(f"  🔍 DEBUG - ...")
```

#### Bước 2: Chỉ log thông tin quan trọng

**File: `python-api/phrase_centric_extractor.py`**

Giảm logging trong loops:
```python
# TRƯỚC (log mỗi phrase):
for phrase in phrases:
    print(f"Processing: {phrase}")  # ❌ Quá nhiều

# SAU (chỉ log summary):
print(f"✓ Processed {len(phrases)} phrases")  # ✅ Đủ
```

#### Bước 3: Sử dụng logging levels

**File: `python-api/main.py`**

Thêm logging configuration:
```python
import logging

# Chỉ log WARNING và ERROR trong production
logging.basicConfig(
    level=logging.WARNING,  # Thay vì DEBUG
    format='%(asctime)s - %(levelname)s - %(message)s'
)

# Thay print() bằng logging
# print(f"Debug info")  # ❌
logging.debug("Debug info")  # ✅ Sẽ bị skip nếu level=WARNING
```

---

## 🔴 LỖI 2: Vercel Frontend - React Error #31 + 405 Errors

### Triệu chứng
```
Uncaught Error: Minified React error #31
Failed to load resource: status 405 (Method Not Allowed)
```

### Nguyên nhân
1. **React Hydration Error**: Client-side render khác server-side render
2. **405 Error**: API endpoint không hỗ trợ HTTP method đang dùng

### Giải pháp

#### Fix 1: React Hydration Error

**File: `app/dashboard-new/documents-simple/page.tsx`**

Đảm bảo không có dynamic content trong initial render:

```typescript
'use client'

import { useState, useEffect } from 'react'

export default function DocumentsPage() {
  const [mounted, setMounted] = useState(false)
  
  // Chỉ render sau khi client-side mounted
  useEffect(() => {
    setMounted(true)
  }, [])
  
  if (!mounted) {
    return <div>Loading...</div>  // Server-side render
  }
  
  // Client-side render (có thể dùng Date.now(), Math.random(), etc.)
  return (
    <div>
      {/* Your content */}
    </div>
  )
}
```

#### Fix 2: 405 Method Not Allowed

**Kiểm tra API routes:**

**File: `app/api/vocabulary/route.ts`**

Đảm bảo export đúng HTTP methods:
```typescript
// ✅ ĐÚNG
export async function POST(request: Request) {
  // Handle POST request
}

export async function GET(request: Request) {
  // Handle GET request
}

// ❌ SAI - Thiếu export
async function POST(request: Request) {
  // Sẽ bị 405 error
}
```

**File: `app/api/knowledge-graph/route.ts`**

Kiểm tra tương tự:
```typescript
export async function POST(request: Request) {
  try {
    const body = await request.json()
    // Process...
    return Response.json({ success: true })
  } catch (error) {
    return Response.json({ error: 'Failed' }, { status: 500 })
  }
}
```

#### Fix 3: Kiểm tra fetch calls

**File: `app/dashboard-new/documents-simple/page.tsx`**

Đảm bảo dùng đúng HTTP method:
```typescript
// ✅ ĐÚNG
await fetch("/api/vocabulary", {
  method: "POST",  // Phải match với export trong route.ts
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(data)
})

// ❌ SAI - Method không match
await fetch("/api/vocabulary", {
  method: "PUT",  // Nhưng route.ts chỉ có POST
  body: JSON.stringify(data)
})
```

---

## 🚀 TRIỂN KHAI FIX

### Bước 1: Fix Railway Logging

```bash
# 1. Mở file Python API
# 2. Comment các dòng print debug
# 3. Commit và push

cd python-api
# Edit complete_pipeline_12_stages.py
# Comment các dòng: print(f"  🔍 DEBUG - ...")

git add python-api/
git commit -m "fix: Reduce logging to avoid Railway rate limit"
git push origin main
```

### Bước 2: Fix Vercel Frontend

```bash
# 1. Kiểm tra API routes có export đúng methods
# 2. Thêm mounted check cho dynamic content
# 3. Commit và push

# Check app/api/vocabulary/route.ts
# Check app/api/knowledge-graph/route.ts
# Check app/dashboard-new/documents-simple/page.tsx

git add app/
git commit -m "fix: Fix React hydration error and 405 API errors"
git push origin main
```

### Bước 3: Verify Fix

**Railway:**
1. Vào Railway dashboard
2. Check logs - không còn "rate limit" warning
3. Logs giảm xuống < 100/sec

**Vercel:**
1. Mở browser console (F12)
2. Reload trang
3. Không còn React error #31
4. Không còn 405 errors

---

## 📋 CHECKLIST

### Railway Logging Fix
- [ ] Comment debug logs trong `complete_pipeline_12_stages.py`
- [ ] Comment debug logs trong `phrase_centric_extractor.py`
- [ ] Thêm logging levels trong `main.py`
- [ ] Deploy và check Railway logs
- [ ] Verify: Logs < 100/sec

### Vercel Frontend Fix
- [ ] Thêm mounted check trong `documents-simple/page.tsx`
- [ ] Verify API routes export đúng methods
- [ ] Check fetch calls dùng đúng HTTP method
- [ ] Deploy và test trong browser
- [ ] Verify: Không còn React error #31
- [ ] Verify: Không còn 405 errors

---

## 🎯 KẾT QUẢ MONG ĐỢI

### Railway (Backend)
```
✅ Logs < 100/sec
✅ Không có "rate limit" warning
✅ API vẫn hoạt động bình thường
```

### Vercel (Frontend)
```
✅ Không có React hydration error
✅ Không có 405 errors
✅ Trang load bình thường
✅ Upload document hoạt động
```

---

## 💡 LƯU Ý

1. **Railway logging**: Chỉ log thông tin quan trọng (errors, warnings, summary)
2. **React hydration**: Tránh dùng Date.now(), Math.random() trong initial render
3. **API methods**: Luôn export đúng HTTP method trong route.ts
4. **Testing**: Test cả Railway logs VÀ browser console sau mỗi deploy

---

**Nếu vẫn còn lỗi, gửi screenshot mới để tôi debug tiếp!**
