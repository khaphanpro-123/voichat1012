# 🎨 HƯỚNG DẪN GIAO DIỆN MỚI - DOCUMENTS & FLASHCARDS

## ✅ ĐÃ TẠO

### 1. Trang Documents Mới (`/dashboard-new/documents`)

**Chức năng**:
- Upload file PDF/DOCX
- Gọi API `/api/upload-document-complete`
- Hiển thị kết quả: Flashcards + Knowledge Graph

**File**: `app/dashboard-new/documents/page.tsx`

### 2. Component Flashcard Viewer

**Chức năng**:
- Hiển thị flashcards theo thứ tự điểm quan trọng (cao → thấp)
- Lật thẻ để xem nghĩa và ví dụ
- Phát âm từ và câu (Text-to-Speech)
- Hiển thị phiên âm IPA
- Hiển thị ngữ cảnh (câu chứa từ)
- Gộp từ đồng nghĩa vào cùng thẻ
- Đánh giá quan trọng bằng sao (1-5 sao)

**File**: `components/flashcard-viewer.tsx`

### 3. Component Knowledge Graph Viewer

**Chức năng**:
- Hiển thị đồ thị bằng Cytoscape.js
- Nhiều layout: Hierarchical, Circle, Grid, Force Directed
- Zoom in/out, Fit to screen
- Download PNG
- Click node để xem chi tiết
- Legend (chú thích)

**File**: `components/knowledge-graph-viewer.tsx`

## 📊 CẤU TRÚC DỮ LIỆU

### Backend Response (`/api/upload-document-complete`)

```json
{
  "document_id": "doc_123",
  "document_title": "Climate Change",
  "flashcards": [
    {
      "word": "climate change",
      "phrase": "climate change",
      "importance_score": 0.95,
      "phonetic": "ˈklaɪmət tʃeɪndʒ",
      "context_sentence": "Climate change is a <b>global issue</b>.",
      "synonyms": ["global warming"],
      "definition": "Long-term changes in temperature and weather patterns",
      "example": "Climate change affects ecosystems worldwide."
    }
  ],
  "knowledge_graph": {
    "entities": [
      {
        "id": "cluster_0",
        "label": "Environment",
        "type": "cluster",
        "importance": 0.9
      },
      {
        "id": "phrase_climate_change",
        "label": "climate change",
        "type": "phrase",
        "importance": 0.95
      }
    ],
    "relations": [
      {
        "source": "cluster_0",
        "target": "phrase_climate_change",
        "type": "contains",
        "weight": 0.9,
        "label": "contains"
      }
    ]
  }
}
```

## 🚀 CÁCH SỬ DỤNG

### 1. Deploy Backend (Railway)

```bash
git add .
git commit -m "feat: New documents UI with flashcards and knowledge graph"
git push origin main
```

### 2. Deploy Frontend (Vercel)

Vercel sẽ tự động deploy khi push.

### 3. Test

1. Vào https://voichat1012.vercel.app/dashboard-new/documents
2. Upload file PDF/DOCX
3. Đợi xử lý (30-60 giây)
4. Xem flashcards:
   - Click thẻ để lật
   - Click speaker icon để phát âm
   - Xem danh sách tất cả từ
5. Xem knowledge graph:
   - Chọn layout
   - Zoom in/out
   - Click node để xem chi tiết
   - Download PNG

## 📝 TÍNH NĂNG CHI TIẾT

### Flashcard Viewer

1. **Sắp xếp theo điểm**:
   - Từ quan trọng nhất (điểm cao) → đầu
   - Từ ít quan trọng (điểm thấp) → cuối

2. **Hiển thị điểm**:
   - Badge với màu sắc:
     - Đỏ: ≥ 0.8 (rất quan trọng)
     - Cam: 0.6-0.8 (quan trọng)
     - Vàng: 0.4-0.6 (trung bình)
     - Xanh: < 0.4 (ít quan trọng)
   - Sao: 1-5 sao dựa trên điểm

3. **Từ đồng nghĩa**:
   - Hiển thị dưới từ chính
   - Badge màu secondary

4. **Phát âm**:
   - Text-to-Speech API của browser
   - Phát âm từ và câu
   - Tốc độ 0.8x (chậm hơn để dễ nghe)

5. **Ngữ cảnh**:
   - Câu chứa từ
   - Từ được highlight bằng `<b>` tag
   - Có thể phát âm cả câu

### Knowledge Graph Viewer

1. **Node Types**:
   - Cluster (xanh dương): Nhóm chủ đề
   - Phrase (xanh lá): Cụm từ
   - Word (cam): Từ đơn

2. **Edge Types**:
   - Contains (xanh dương): Quan hệ chứa
   - Similar to (xanh lá): Từ đồng nghĩa
   - Related to (cam): Liên quan

3. **Layouts**:
   - Hierarchical (dagre): Phân cấp
   - Breadth First: Theo chiều rộng
   - Circle: Hình tròn
   - Grid: Lưới
   - Force Directed (cose): Lực hút

4. **Interactions**:
   - Click node: Xem chi tiết
   - Drag node: Di chuyển
   - Scroll: Zoom
   - Click background: Bỏ chọn

## 🔧 CẤU HÌNH

### Environment Variables

```env
NEXT_PUBLIC_API_URL=https://voichat1012-production.up.railway.app
```

### Dependencies

Đã thêm vào `package.json`:
```json
{
  "cytoscape": "^3.28.1",
  "cytoscape-dagre": "^2.5.0",
  "dagre": "^0.8.5",
  "@types/cytoscape": "^3.21.0"
}
```

## 📊 LƯU TRỮ DỮ LIỆU

### Backend (MongoDB)

```python
# Trong python-api/main.py
document = {
    "document_id": doc_id,
    "title": title,
    "flashcards": flashcards,
    "knowledge_graph": knowledge_graph,
    "created_at": datetime.now()
}
db.documents.insert_one(document)
```

### Frontend (Local Storage - Optional)

```typescript
// Lưu vào localStorage để xem lại
localStorage.setItem(
  `document_${documentId}`,
  JSON.stringify({
    flashcards,
    knowledge_graph,
    timestamp: Date.now()
  })
)
```

## 🎯 ROADMAP

### Phase 1 (Hiện tại)
- ✅ Upload và xử lý document
- ✅ Hiển thị flashcards
- ✅ Hiển thị knowledge graph
- ✅ Phát âm từ và câu

### Phase 2 (Tương lai)
- [ ] Lưu progress học tập
- [ ] Quiz mode
- [ ] Spaced repetition
- [ ] Export Anki
- [ ] Chia sẻ flashcards

---

**Trạng thái**: SẴN SÀNG DEPLOY ✅  
**Ngày**: 2026-02-15
