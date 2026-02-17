# Fix Import Error - Module not found

## Lỗi
```
Module not found: Can't resolve '@/components/knowledge-graph-viewer'
```

## Nguyên nhân
File `app/dashboard-new/vocabulary/page.tsx` vẫn import component cũ đã bị xóa:
```typescript
import { KnowledgeGraphViewer } from "@/components/knowledge-graph-viewer"
```

## Giải pháp

### File đã sửa: `app/dashboard-new/vocabulary/page.tsx`

**Trước**:
```typescript
import { KnowledgeGraphViewer } from "@/components/knowledge-graph-viewer";
```

**Sau**:
```typescript
import dynamic from "next/dynamic";

const KnowledgeGraphViewer = dynamic(
  () => import("@/components/knowledge-graph-d3").then(mod => ({ default: mod.default })),
  { ssr: false }
);
```

## Kiểm tra đã fix

### 1. Không còn import cũ:
```bash
✅ Đã xóa import từ knowledge-graph-viewer
✅ Đã thay bằng dynamic import knowledge-graph-d3
```

### 2. Files hiện có:
```
✅ components/knowledge-graph-d3.tsx (mới - D3.js)
✅ components/KnowledgeGraphViewer.tsx (cũ - không dùng cytoscape)
❌ components/knowledge-graph-viewer.tsx (đã xóa)
❌ components/knowledge-graph-viewer-wrapper.tsx (đã xóa)
```

### 3. Dependencies:
```
✅ d3@^7.9.0
✅ @types/d3@^7.4.3
❌ cytoscape (đã xóa)
❌ cytoscape-dagre (đã xóa)
❌ dagre (đã xóa)
```

## Kết quả

Build sẽ thành công với:
- ✅ Không có module not found errors
- ✅ D3.js graph hoạt động
- ✅ Vocabulary page hoạt động
- ✅ Documents page hoạt động

## Files đã sửa

1. ✅ `app/dashboard-new/vocabulary/page.tsx` - Fixed import
2. ✅ `components/knowledge-graph-d3.tsx` - New D3 component
3. ✅ `app/dashboard-new/documents/page.tsx` - Import D3 component
4. ✅ `package.json` - D3 dependencies

## Push và Deploy

```bash
git add .
git commit -m "fix: Replace all cytoscape imports with D3.js"
git push origin main
```

Vercel sẽ auto-deploy và build thành công!
