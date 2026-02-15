# Knowledge Graph Visualization Setup

## Tổng quan

Hệ thống sơ đồ tư duy (Knowledge Graph) hiển thị mối quan hệ giữa các từ vựng được trích xuất từ tài liệu. Sử dụng Cytoscape.js để render đồ thị tương tác.

## Kiến trúc

### Backend (Python API - Railway)
- **URL**: https://perceptive-charm-production-eb6c.up.railway.app
- **Endpoint**: `GET /api/knowledge-graph/{document_id}`
- **Pipeline**: 12-Stage Complete Pipeline
  - STAGE 11: Knowledge Graph Generation
  - STAGE 12: Flashcard Generation

### Frontend (Next.js - Vercel)
- **Component**: `components/knowledge-graph-viewer.tsx`
- **Page**: `app/dashboard-new/vocabulary/page.tsx`
- **Tab**: "Sơ đồ tư duy" (Mindmap)

## Cài đặt

### Bước 1: Cài đặt dependencies

Chạy file batch:
```bash
INSTALL_DEPENDENCIES.bat
```

Hoặc chạy thủ công:
```bash
npm install cytoscape cytoscape-dagre
npm install --save-dev @types/cytoscape
```

### Bước 2: Cấu hình Backend URL

Tạo file `.env.local` (nếu chưa có):
```env
NEXT_PUBLIC_BACKEND_URL=https://perceptive-charm-production-eb6c.up.railway.app
```

### Bước 3: Deploy

#### Frontend (Vercel)
```bash
git add .
git commit -m "Add knowledge graph visualization"
git push origin main
```

Vercel sẽ tự động deploy.

#### Backend (Railway)
Backend đã được deploy tại: https://perceptive-charm-production-eb6c.up.railway.app

## Cách sử dụng

### 1. Upload tài liệu

Vào trang **Documents** và upload tài liệu (PDF, DOCX, TXT):
- Tài liệu PHẢI là tiếng Anh
- Hệ thống sẽ chạy 12-stage pipeline
- STAGE 11 tạo knowledge graph
- STAGE 12 tạo flashcards

### 2. Xem sơ đồ tư duy

Vào trang **Vocabulary** → Tab **"Sơ đồ tư duy"**:
- Hệ thống tự động load knowledge graph từ backend
- Hiển thị đồ thị tương tác với Cytoscape.js

### 3. Tương tác với đồ thị

**Controls:**
- **Reset View**: Đưa đồ thị về vị trí ban đầu
- **Layout**: Chọn kiểu bố cục (Tree, Circle, Grid, Force Directed)
- **Zoom**: Cuộn chuột để zoom in/out
- **Pan**: Kéo thả để di chuyển đồ thị
- **Select Node**: Click vào node để xem thông tin

**Node Types:**
- 🔴 **Root** (Document): Tài liệu gốc
- 🔵 **Cluster** (Topic): Chủ đề/cụm từ vựng
- 🟢 **Phrase**: Cụm từ
- 🟡 **Word**: Từ đơn

**Edge Types:**
- **contains**: Cluster chứa phrase/word
- **similar_to**: Từ gần nghĩa (similarity > 0.7)

## API Response Format

### GET /api/knowledge-graph/{document_id}

**Response:**
```json
{
  "document_id": "doc_20260215_123456",
  "document_title": "Climate Change",
  "nodes": [
    {
      "id": "cluster_0",
      "type": "topic",
      "label": "Topic 1",
      "size": 10,
      "color": "#FF6B6B"
    },
    {
      "id": "phrase_climate_change",
      "type": "phrase",
      "label": "climate change",
      "semantic_role": "core",
      "tfidf_score": 0.95,
      "cluster_id": 0,
      "size": 10
    }
  ],
  "edges": [
    {
      "source": "cluster_0",
      "target": "phrase_climate_change",
      "type": "contains",
      "weight": 0.85
    },
    {
      "source": "phrase_climate_change",
      "target": "phrase_global_warming",
      "type": "similar_to",
      "weight": 0.78,
      "label": "0.78"
    }
  ],
  "clusters": [
    {
      "id": 0,
      "name": "Topic 1",
      "size": 10,
      "color": "#FF6B6B"
    }
  ],
  "mindmap": "# Vocabulary Mind Map\n## Topic 1...",
  "stats": {
    "entities": 25,
    "relations": 40,
    "semantic_relations": 15,
    "clusters": 3
  }
}
```

## Troubleshooting

### Lỗi: "Cannot find module 'cytoscape'"

**Giải pháp:**
```bash
npm install cytoscape cytoscape-dagre
npm install --save-dev @types/cytoscape
```

### Lỗi: "Document not found"

**Nguyên nhân:** Chưa upload tài liệu hoặc document_id không tồn tại

**Giải pháp:**
1. Upload tài liệu mới tại `/dashboard-new/documents`
2. Đợi pipeline xử lý xong (STAGE 11)
3. Quay lại tab "Sơ đồ tư duy"

### Lỗi: "Không thể tải knowledge graph"

**Nguyên nhân:** Backend không phản hồi hoặc CORS error

**Giải pháp:**
1. Kiểm tra backend URL trong `.env.local`
2. Kiểm tra backend có đang chạy: https://perceptive-charm-production-eb6c.up.railway.app/health
3. Kiểm tra CORS settings trong `python-api/main.py`

### Đồ thị không hiển thị

**Nguyên nhân:** Cytoscape.js chưa được khởi tạo đúng

**Giải pháp:**
1. Kiểm tra console log trong browser (F12)
2. Đảm bảo `data.nodes` và `data.edges` không rỗng
3. Thử refresh trang

## Tính năng nâng cao

### 1. Lọc theo cluster

Có thể thêm filter để chỉ hiển thị 1 cluster:
```typescript
const filteredNodes = data.nodes.filter(n => 
  n.type === 'cluster' || n.cluster_id === selectedClusterId
);
```

### 2. Export đồ thị

Cytoscape.js hỗ trợ export sang PNG/JSON:
```typescript
const png = cy.png(); // Base64 PNG
const json = cy.json(); // JSON data
```

### 3. Search node

Thêm search box để tìm node:
```typescript
const searchNode = (query: string) => {
  cy.nodes().forEach(node => {
    if (node.data('label').includes(query)) {
      node.select();
    }
  });
};
```

## Tham khảo

- **Cytoscape.js**: https://js.cytoscape.org/
- **Dagre Layout**: https://github.com/cytoscape/cytoscape.js-dagre
- **Backend API Docs**: https://perceptive-charm-production-eb6c.up.railway.app/docs

## Liên hệ

Nếu có vấn đề, vui lòng tạo issue trên GitHub hoặc liên hệ team.
