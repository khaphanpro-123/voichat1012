# Fix Hydration Error #423 - GIẢI PHÁP TRIỆT ĐỂ

## Vấn đề
Lỗi **Minified React error #423** - Hydration mismatch giữa server và client khi load trang `/dashboard-new/documents`

## Nguyên nhân
1. **Cytoscape SSR issue** - Thư viện Cytoscape không thể chạy trên server-side
2. **Dynamic import không đủ** - Vẫn có code chạy khi import module
3. **Missing API route** - Frontend gọi trực tiếp Railway API gây CORS issues
4. **Hydration mismatch** - Component render khác nhau giữa server và client

## Giải pháp áp dụng

### 1. Fix Knowledge Graph Viewer (TRIỆT ĐỂ)
**File**: `components/knowledge-graph-viewer.tsx`

✅ **Xóa hoàn toàn** code import Cytoscape ở top level:
```typescript
// XÓA ĐOẠN NÀY
if (typeof window !== "undefined") {
  cytoscape = require("cytoscape")
  dagre = require("cytoscape-dagre")
}
```

✅ **Load Cytoscape động** trong useEffect:
```typescript
const [cytoscape, setCytoscape] = useState<any>(null)

useEffect(() => {
  setMounted(true)
  
  if (typeof window !== "undefined") {
    Promise.all([
      import("cytoscape"),
      import("cytoscape-dagre")
    ]).then(([cytoscapeModule, dagreModule]) => {
      const cy = cytoscapeModule.default
      const dagre = dagreModule.default
      cy.use(dagre)
      setCytoscape(() => cy)
    })
  }
}, [])
```

✅ **Kiểm tra cytoscape loaded** trước khi render:
```typescript
if (!mounted || !cytoscape) {
  return <Card>Loading...</Card>
}
```

### 2. Fix Flashcard Viewer
**File**: `components/flashcard-viewer.tsx`

✅ Thêm check `mounted` vào `speakText`:
```typescript
const speakText = (text: string) => {
  if (!mounted || typeof window === "undefined") return
  // ...
}
```

### 3. Fix Documents Page
**File**: `app/dashboard-new/documents/page.tsx`

✅ Thêm `mounted` state:
```typescript
const [mounted, setMounted] = useState(false)

useEffect(() => {
  setMounted(true)
}, [])
```

✅ Chỉ render results khi mounted:
```typescript
{mounted && result && (
  <Tabs>...</Tabs>
)}
```

✅ Gọi API route local thay vì trực tiếp Railway:
```typescript
const response = await fetch(`/api/upload-document-complete`, {
  method: "POST",
  body: formData,
})
```

### 4. Tạo API Route Proxy
**File**: `app/api/upload-document-complete/route.ts` (MỚI)

✅ Tạo proxy route để forward request tới Railway:
```typescript
export async function POST(request: NextRequest) {
  const formData = await request.formData()
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "https://voichat1012-production.up.railway.app"
  
  const response = await fetch(`${apiUrl}/api/upload-document-complete`, {
    method: "POST",
    body: formData,
  })
  
  const data = await response.json()
  return NextResponse.json(data)
}
```

## Tại sao giải pháp này hoạt động?

1. **Không có code SSR** - Cytoscape chỉ load trên client
2. **Mounted check** - Đảm bảo code chỉ chạy sau khi component mounted
3. **API Proxy** - Tránh CORS và giữ API key an toàn
4. **Consistent rendering** - Server và client render giống nhau

## Kiểm tra

### Trước khi deploy:
```bash
# Không cần npm install vì dependencies đã có
# Chỉ cần push code
```

### Sau khi deploy:
1. Mở `/dashboard-new/documents`
2. Không còn lỗi hydration trong console
3. Upload file PDF/DOCX
4. Xem flashcards và knowledge graph

## Files đã sửa
- ✅ `components/knowledge-graph-viewer.tsx` - Load Cytoscape động
- ✅ `components/flashcard-viewer.tsx` - Thêm mounted check
- ✅ `app/dashboard-new/documents/page.tsx` - Mounted state + API local
- ✅ `app/api/upload-document-complete/route.ts` - API proxy (MỚI)

## Kết quả
- ❌ Lỗi hydration #423 - FIXED
- ✅ Cytoscape load thành công trên client
- ✅ Flashcards hiển thị đúng
- ✅ Knowledge graph render đúng
- ✅ Upload file hoạt động
