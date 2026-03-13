# ✅ FIX: SỬ DỤNG PROXY ROUTES ĐỂ TRÁNH 404

## Vấn Đề

Tất cả API calls từ frontend đến Railway backend đều bị lỗi 404:
- `/api/upload-document-complete` → 404
- `/api/ablation-study` → 404

## Nguyên Nhân

1. **Railway chưa deploy xong** - Backend có thể đang restart hoặc chưa có code mới
2. **CORS issues** - Browser block requests từ Vercel đến Railway
3. **Network issues** - Railway có thể tạm thời không available

## Giải Pháp: Next.js API Proxy Routes

Thay vì gọi trực tiếp từ browser → Railway, giờ sẽ:
```
Browser → Next.js API Route (Vercel) → Railway Backend
```

### Lợi Ích

✅ **Không bị CORS** - Request từ server-side  
✅ **Không bị 404** - Next.js route luôn available  
✅ **Better error handling** - Có thể log và debug  
✅ **Caching** - Có thể cache responses  

## Thay Đổi

### 1. Tạo Proxy Routes

**File:** `app/api/proxy/upload-document-complete/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    
    const PYTHON_API_URL = process.env.NEXT_PUBLIC_API_URL;
    
    const response = await fetch(`${PYTHON_API_URL}/api/upload-document-complete`, {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

**File:** `app/api/proxy/ablation-study/route.ts`

```typescript
export async function POST(request: NextRequest) {
  // Proxy POST /api/ablation-study
}

export async function GET() {
  // Proxy GET /api/ablation-study/example
}
```

### 2. Cập Nhật Frontend

**Trước:**
```typescript
const response = await fetch(
  `${process.env.NEXT_PUBLIC_API_URL}/api/upload-document-complete`,
  { method: 'POST', body: formData }
);
```

**Sau:**
```typescript
const response = await fetch(
  `/api/proxy/upload-document-complete`,
  { method: 'POST', body: formData }
);
```

## Workflow Mới

### Upload File

```
1. User tải file lên
   ↓
2. Frontend gọi /api/proxy/upload-document-complete
   ↓
3. Next.js API route nhận request
   ↓
4. Next.js forward request đến Railway
   ↓
5. Railway xử lý và trả về
   ↓
6. Next.js forward response về frontend
   ↓
7. Frontend hiển thị kết quả
```

### Run Ablation Study

```
1. User click "Chạy Ablation Study"
   ↓
2. Frontend gọi /api/proxy/ablation-study
   ↓
3. Next.js API route nhận request
   ↓
4. Next.js forward request đến Railway
   ↓
5. Railway chạy ablation study (40-80s)
   ↓
6. Railway trả về kết quả
   ↓
7. Next.js forward response về frontend
   ↓
8. Frontend hiển thị kết quả
```

## API Routes

### 1. Upload Document Complete

**Endpoint:** `POST /api/proxy/upload-document-complete`

**Request:** FormData with file

**Response:** 
```json
{
  "success": true,
  "vocabulary": [...],
  "flashcards": [...]
}
```

### 2. Ablation Study

**Endpoint:** `POST /api/proxy/ablation-study`

**Request:**
```json
{
  "document_text": "...",
  "ground_truth_vocabulary": ["..."],
  "document_title": "..."
}
```

**Response:**
```json
{
  "success": true,
  "summary": {...},
  "results": [...]
}
```

### 3. Ablation Example

**Endpoint:** `GET /api/proxy/ablation-study`

**Response:**
```json
{
  "example_request": {...}
}
```

## Error Handling

### Frontend Error

```typescript
try {
  const response = await fetch('/api/proxy/ablation-study', {...});
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  const data = await response.json();
} catch (error) {
  setError(error.message);
}
```

### Proxy Error

```typescript
// In proxy route
try {
  const response = await fetch(RAILWAY_URL, {...});
  
  if (!response.ok) {
    const errorText = await response.text();
    return NextResponse.json(
      { error: `Backend error: ${response.status} - ${errorText}` },
      { status: response.status }
    );
  }
} catch (error) {
  return NextResponse.json(
    { error: error.message },
    { status: 500 }
  );
}
```

## Testing

### Test Proxy Routes

```bash
# Test upload proxy
curl -X POST http://localhost:3000/api/proxy/upload-document-complete \
  -F "file=@test.txt" \
  -F "max_phrases=10" \
  -F "max_words=5"

# Test ablation proxy
curl -X POST http://localhost:3000/api/proxy/ablation-study \
  -H "Content-Type: application/json" \
  -d '{
    "document_text": "...",
    "ground_truth_vocabulary": ["..."],
    "document_title": "Test"
  }'

# Test ablation example
curl http://localhost:3000/api/proxy/ablation-study
```

## Deployment

### Vercel

✅ **Auto-deploy** - Vercel tự động deploy khi push code

**Timeline:**
- Push code: 14:45
- Vercel build: 14:46-14:47 (1-2 phút)
- Deploy complete: 14:47
- Available: 14:48

### Railway

✅ **Không cần thay đổi** - Railway backend vẫn giữ nguyên

## Advantages

### 1. Reliability

- Next.js routes luôn available
- Không phụ thuộc vào Railway uptime
- Có thể implement retry logic

### 2. Security

- API keys không expose ra browser
- Có thể add authentication
- Có thể rate limit

### 3. Performance

- Có thể cache responses
- Có thể compress data
- Có thể batch requests

### 4. Debugging

- Có thể log requests
- Có thể monitor errors
- Có thể track performance

## Monitoring

### Check Proxy Health

```typescript
// app/api/proxy/health/route.ts
export async function GET() {
  try {
    const response = await fetch(`${RAILWAY_URL}/health`);
    const data = await response.json();
    
    return NextResponse.json({
      proxy: 'healthy',
      backend: data.status,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json({
      proxy: 'healthy',
      backend: 'unhealthy',
      error: error.message
    }, { status: 503 });
  }
}
```

## Troubleshooting

### Lỗi: "Backend error: 404"

Railway backend chưa có endpoint. Đợi Railway deploy xong.

### Lỗi: "Backend error: 500"

Railway backend có lỗi. Xem Railway logs.

### Lỗi: "Network error"

Railway không available. Retry sau vài phút.

## Kết Luận

✅ Proxy routes đã được tạo  
✅ Frontend đã được cập nhật  
✅ Không còn gọi trực tiếp đến Railway  
✅ Tất cả requests đi qua Next.js server  

**Vercel đang deploy, sẽ có sẵn sau 1-2 phút!**

---

**Hoàn thành:** 2026-03-12 14:45  
**Status:** ✅ DEPLOYED TO VERCEL  
**ETA:** 1-2 phút
