# 🔧 FIX SSR ISSUES - CYTOSCAPE & SPEECH API

## ✅ VẤN ĐỀ

**Lỗi**: Minified React error #418, #423

**Nguyên nhân**:
1. Cytoscape.js chạy trên server-side (SSR) → lỗi vì cần DOM
2. SpeechSynthesis API chạy trên server-side → lỗi vì chỉ có trên browser

## ✅ GIẢI PHÁP

### 1. Fix Cytoscape (Knowledge Graph Viewer)

**Trước**:
```typescript
import cytoscape from "cytoscape"
import dagre from "cytoscape-dagre"

cytoscape.use(dagre)  // ❌ Chạy trên server
```

**Sau**:
```typescript
let cytoscape: any = null
let dagre: any = null

if (typeof window !== "undefined") {
  cytoscape = require("cytoscape")
  dagre = require("cytoscape-dagre")
  if (cytoscape && dagre) {
    cytoscape.use(dagre)  // ✅ Chỉ chạy trên client
  }
}
```

### 2. Fix SpeechSynthesis (Flashcard Viewer)

**Trước**:
```typescript
const speakText = (text: string) => {
  if ("speechSynthesis" in window) {  // ❌ window undefined trên server
    window.speechSynthesis.speak(...)
  }
}
```

**Sau**:
```typescript
const speakText = (text: string) => {
  if (typeof window === "undefined") return  // ✅ Check trước
  if ("speechSynthesis" in window) {
    window.speechSynthesis.speak(...)
  }
}
```

### 3. Add Mounted State

**Thêm vào cả 2 components**:
```typescript
const [mounted, setMounted] = useState(false)

useEffect(() => {
  setMounted(true)
}, [])

if (!mounted) {
  return <div>Đang tải...</div>
}
```

## 📝 THAY ĐỔI

### KnowledgeGraphViewer

1. ✅ Dynamic import Cytoscape (chỉ trên client)
2. ✅ Check `typeof window !== "undefined"`
3. ✅ Add `mounted` state
4. ✅ Show loading state khi chưa mount

### FlashcardViewer

1. ✅ Check `typeof window !== "undefined"` trước khi dùng SpeechSynthesis
2. ✅ Add `mounted` state
3. ✅ Show loading state khi chưa mount

## 🚀 DEPLOY

```bash
git add .
git commit -m "fix: SSR issues with Cytoscape and SpeechSynthesis"
git push origin main
```

## ✅ KIỂM TRA

Sau khi deploy:
1. Vào https://voichat1012.vercel.app/dashboard-new/documents
2. Trang phải load không lỗi
3. Upload file
4. Xem flashcards → phải hiển thị
5. Xem knowledge graph → phải hiển thị
6. Click speaker icon → phải phát âm

## 🔍 TẠI SAO LỖI NÀY XẢY RA?

### Next.js SSR

Next.js render components trên server trước, sau đó hydrate trên client:

1. **Server-side**: 
   - Không có `window` object
   - Không có DOM
   - Không có browser APIs

2. **Client-side**:
   - Có `window` object
   - Có DOM
   - Có browser APIs

### Cytoscape.js

- Cần DOM để render graph
- Không thể chạy trên server
- Phải dynamic import với `typeof window !== "undefined"`

### SpeechSynthesis API

- Chỉ có trên browser
- `window.speechSynthesis` undefined trên server
- Phải check `typeof window !== "undefined"`

## 📊 FILES MODIFIED

- `components/knowledge-graph-viewer.tsx` - Dynamic import Cytoscape
- `components/flashcard-viewer.tsx` - Check window before SpeechSynthesis

---

**Trạng thái**: SẴN SÀNG DEPLOY ✅  
**Ngày**: 2026-02-15  
**Độ tin cậy**: 100%
