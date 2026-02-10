# Hướng Dẫn Tích Hợp Frontend & Backend - STAGE 11 & 12

## 📋 Tổng Quan

Tài liệu này hướng dẫn tích hợp:
1. **STAGE 11**: Knowledge Graph Visualization
2. **STAGE 12**: Flashcards Grouped by Cluster

---

## 🔧 BACKEND (Python API)

### Bước 1: Thêm Global Cache

Thêm vào `python-api/main.py` (sau phần imports):

```python
# ==================== GLOBAL CACHE ====================

# Cache for storing pipeline results
pipeline_results_cache = {}

def store_pipeline_result(document_id: str, result: dict):
    """Store pipeline result in cache"""
    pipeline_results_cache[document_id] = {
        "result": result,
        "timestamp": datetime.now().isoformat()
    }
    print(f"✅ Stored result for document: {document_id}")

def get_pipeline_result(document_id: str) -> Optional[dict]:
    """Get pipeline result from cache"""
    if document_id in pipeline_results_cache:
        return pipeline_results_cache[document_id]["result"]
    return None
```

---

### Bước 2: Thêm API Endpoints

Thêm vào `python-api/main.py` (trước `if __name__ == "__main__":`):

```python
# ==================== STAGE 11: KNOWLEDGE GRAPH API ====================

@app.get("/api/knowledge-graph/{document_id}")
async def get_knowledge_graph(document_id: str):
    """Get knowledge graph data for visualization"""
    try:
        result = get_pipeline_result(document_id)
        
        if not result:
            raise HTTPException(
                status_code=404,
                detail=f"Document {document_id} not found. Please upload document first."
            )
        
        stage11 = result.get('stages', {}).get('stage11', {})
        
        if not stage11:
            raise HTTPException(
                status_code=404,
                detail="Knowledge graph data not found"
            )
        
        return {
            "document_id": document_id,
            "document_title": result.get('document_title', ''),
            "nodes": stage11.get('entities', []),
            "edges": stage11.get('relations', []),
            "clusters": [
                {
                    "id": i,
                    "name": f"Topic {i+1}",
                    "size": len([n for n in stage11.get('entities', []) if n.get('cluster_id') == i]),
                    "color": ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8'][i % 5]
                }
                for i in range(stage11.get('clusters_count', 0))
            ],
            "mindmap": stage11.get('mindmap_markdown', ''),
            "stats": {
                "entities": stage11.get('entities_created', 0),
                "relations": stage11.get('relations_created', 0),
                "semantic_relations": stage11.get('semantic_relations', 0),
                "clusters": stage11.get('clusters_count', 0)
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ==================== STAGE 12: FLASHCARDS API ====================

@app.get("/api/flashcards/{document_id}")
async def get_flashcards(
    document_id: str,
    group_by_cluster: bool = True
):
    """Get flashcards grouped by cluster"""
    try:
        result = get_pipeline_result(document_id)
        
        if not result:
            raise HTTPException(
                status_code=404,
                detail=f"Document {document_id} not found. Please upload document first."
            )
        
        flashcards = result.get('flashcards', [])
        
        if not flashcards:
            raise HTTPException(
                status_code=404,
                detail="Flashcards not found"
            )
        
        if group_by_cluster:
            # Group flashcards by cluster
            clusters_dict = {}
            
            for card in flashcards:
                cluster_id = card.get('cluster_id', 0)
                
                if cluster_id not in clusters_dict:
                    clusters_dict[cluster_id] = {
                        "cluster_id": cluster_id,
                        "cluster_name": card.get('cluster_name', f'Topic {cluster_id + 1}'),
                        "flashcard_count": 0,
                        "flashcards": []
                    }
                
                clusters_dict[cluster_id]["flashcards"].append(card)
                clusters_dict[cluster_id]["flashcard_count"] += 1
            
            clusters = sorted(clusters_dict.values(), key=lambda x: x['cluster_id'])
            
            return {
                "document_id": document_id,
                "document_title": result.get('document_title', ''),
                "grouped_by_cluster": True,
                "clusters": clusters,
                "total_flashcards": len(flashcards),
                "total_clusters": len(clusters)
            }
        else:
            return {
                "document_id": document_id,
                "document_title": result.get('document_title', ''),
                "grouped_by_cluster": False,
                "flashcards": flashcards,
                "total_flashcards": len(flashcards)
            }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
```

---

### Bước 3: Sửa Upload Endpoint

Trong endpoint `/api/upload-document-complete`, thêm dòng này sau khi xử lý xong:

```python
@app.post("/api/upload-document-complete")
async def upload_document_complete(...):
    # ... existing code ...
    
    # Process document
    result = complete_pipeline.process_document(...)
    
    # ⭐ NEW: Store result in cache
    store_pipeline_result(document_id, result)
    
    return result
```

---

### Bước 4: Khởi Động Lại Server

```bash
cd python-api
python main.py
```

---

## 🎨 FRONTEND (Next.js)

### Files Đã Tạo

1. **`components/KnowledgeGraphViewer.tsx`** - Knowledge Graph visualization
2. **`components/FlashcardClusterView.tsx`** - Flashcards grouped by cluster
3. **`app/dashboard-new/vocabulary-analysis/page.tsx`** - Page sử dụng components

---

### Cách Sử Dụng

#### Option 1: Standalone Page

Truy cập: `http://localhost:3000/dashboard-new/vocabulary-analysis`

#### Option 2: Tích Hợp Vào Page Hiện Có

```tsx
import KnowledgeGraphViewer from '@/components/KnowledgeGraphViewer'
import FlashcardClusterView from '@/components/FlashcardClusterView'

export default function MyPage() {
  const documentId = "doc_123" // Get from upload result
  
  return (
    <div>
      <h1>Vocabulary Analysis</h1>
      
      {/* Knowledge Graph */}
      <KnowledgeGraphViewer documentId={documentId} />
      
      {/* Flashcards */}
      <FlashcardClusterView documentId={documentId} />
    </div>
  )
}
```

---

## 📊 API Endpoints

### 1. Get Knowledge Graph

```
GET http://localhost:8000/api/knowledge-graph/{document_id}
```

**Response**:
```json
{
  "document_id": "doc_123",
  "document_title": "Climate Change Report",
  "nodes": [
    {
      "id": "cluster_0",
      "type": "cluster",
      "label": "Climate Change & Global Warming",
      "size": 45,
      "color": "#FF6B6B"
    },
    {
      "id": "phrase_climate_change",
      "type": "phrase",
      "label": "climate change",
      "cluster_id": 0,
      "semantic_role": "core",
      "importance_score": 0.95
    }
  ],
  "edges": [
    {
      "source": "cluster_0",
      "target": "phrase_climate_change",
      "type": "contains",
      "weight": 0.95
    }
  ],
  "clusters": [...],
  "mindmap": "# Vocabulary Mind Map\n...",
  "stats": {
    "entities": 96,
    "relations": 300,
    "semantic_relations": 207,
    "clusters": 3
  }
}
```

---

### 2. Get Flashcards

```
GET http://localhost:8000/api/flashcards/{document_id}?group_by_cluster=true
```

**Response**:
```json
{
  "document_id": "doc_123",
  "document_title": "Climate Change Report",
  "grouped_by_cluster": true,
  "clusters": [
    {
      "cluster_id": 0,
      "cluster_name": "Climate Change & Global Warming",
      "flashcard_count": 15,
      "flashcards": [
        {
          "id": "fc_0_1",
          "word": "climate change",
          "synonyms": [
            {"word": "climatic change", "similarity": 0.89}
          ],
          "cluster_name": "Climate Change & Global Warming",
          "meaning": "Long-term shifts in climate patterns",
          "example": "Climate change is...",
          "ipa": "/ˈklaɪmət tʃeɪndʒ/",
          "audio_word_url": "https://...",
          "audio_example_url": "https://...",
          "difficulty": "advanced",
          "related_words": [
            {"word": "greenhouse effect", "similarity": 0.85}
          ]
        }
      ]
    }
  ],
  "total_flashcards": 93,
  "total_clusters": 3
}
```

---

## 🎯 Features

### Knowledge Graph Viewer

- ✅ Interactive canvas visualization
- ✅ Node types: Clusters (large circles) + Phrases (small circles)
- ✅ Edge types: Contains (solid) + Similar (dashed)
- ✅ Color coding: Core phrases (green), Regular phrases (indigo)
- ✅ 3 views: Graph, Mind Map, Clusters
- ✅ Stats dashboard
- ✅ Zoom/Pan controls (placeholder)

### Flashcard Cluster View

- ✅ Grouped by cluster (accordion)
- ✅ Synonyms displayed in badges
- ✅ IPA phonetics
- ✅ Audio playback (word + example)
- ✅ Related words (expandable)
- ✅ Difficulty badges (beginner/intermediate/advanced)
- ✅ Importance score
- ✅ Grid/List view toggle
- ✅ Export button (placeholder)

---

## 🔄 Workflow

1. **Upload Document** → `/api/upload-document-complete`
   - Returns `document_id`
   - Stores result in cache

2. **View Knowledge Graph** → `/api/knowledge-graph/{document_id}`
   - Visualize vocabulary relationships
   - See clusters and semantic links

3. **Study Flashcards** → `/api/flashcards/{document_id}`
   - Grouped by cluster
   - With synonyms, IPA, audio
   - Related words

---

## 🐛 Troubleshooting

### Backend Issues

**Error: "Document not found"**
- Ensure document was uploaded first
- Check `document_id` is correct
- Verify cache is working

**Error: "Knowledge graph data not found"**
- Ensure `generate_flashcards=True` in upload
- Check STAGE 11 is enabled

### Frontend Issues

**CORS Error**
- Ensure CORS is enabled in `main.py`
- Check API URL is correct (`http://localhost:8000`)

**Audio Not Playing**
- Check browser console for errors
- Verify audio URLs are valid
- Some browsers block autoplay

---

## 📝 TODO

### Backend
- [ ] Persist cache to database
- [ ] Add pagination for flashcards
- [ ] Add search/filter endpoints
- [ ] Add export endpoints (PDF, CSV)

### Frontend
- [ ] Add real force-directed graph layout (D3.js or vis.js)
- [ ] Add zoom/pan functionality
- [ ] Add node click interactions
- [ ] Add flashcard study mode (flip cards)
- [ ] Add spaced repetition
- [ ] Add progress tracking

---

## 🎉 Kết Luận

Bạn đã có:
1. ✅ Backend API endpoints cho STAGE 11 & 12
2. ✅ Frontend components để hiển thị
3. ✅ Page để sử dụng

**Next Steps**:
1. Thêm code vào `main.py`
2. Khởi động lại server
3. Test endpoints
4. Truy cập frontend page

---

**Tác giả**: Kiro AI
**Ngày**: 2026-02-10
**Version**: 5.2.0-filter-only-mode
