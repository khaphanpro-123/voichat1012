# Thêm API Endpoints cho STAGE 11 & 12

## 📝 Hướng Dẫn

Thêm code sau vào `main.py` (trước dòng `if __name__ == "__main__":`):

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


# ==================== STAGE 11: KNOWLEDGE GRAPH API ====================

@app.get("/api/knowledge-graph/{document_id}")
async def get_knowledge_graph(document_id: str):
    """
    Get knowledge graph data for visualization
    
    Returns:
    - nodes: List of entities (clusters + phrases)
    - edges: List of relations (contains + similar_to)
    - clusters: Cluster information
    - mindmap: Markdown mindmap
    """
    try:
        # Get pipeline result from cache
        result = get_pipeline_result(document_id)
        
        if not result:
            raise HTTPException(
                status_code=404,
                detail=f"Document {document_id} not found. Please upload document first."
            )
        
        # Extract STAGE 11 data
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
    """
    Get flashcards grouped by cluster
    
    Parameters:
    - document_id: Document ID
    - group_by_cluster: Group flashcards by cluster (default: True)
    
    Returns:
    - clusters: List of clusters with flashcards
    - total_flashcards: Total number of flashcards
    - total_clusters: Total number of clusters
    """
    try:
        # Get pipeline result from cache
        result = get_pipeline_result(document_id)
        
        if not result:
            raise HTTPException(
                status_code=404,
                detail=f"Document {document_id} not found. Please upload document first."
            )
        
        # Extract flashcards
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
            
            # Convert to list and sort by cluster_id
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
            # Return flat list
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

## 🔧 Sửa Upload Endpoint

Trong endpoint `/api/upload-document-complete`, thêm dòng này sau khi xử lý xong:

```python
# Store result in cache for later retrieval
store_pipeline_result(document_id, result)
```

Ví dụ:

```python
@app.post("/api/upload-document-complete")
async def upload_document_complete(...):
    # ... existing code ...
    
    # Process document
    result = complete_pipeline.process_document(...)
    
    # Store result in cache ⭐ NEW
    store_pipeline_result(document_id, result)
    
    return result
```

## ✅ Hoàn Thành

Sau khi thêm code, khởi động lại server:

```bash
python main.py
```

Test endpoints:
- `GET http://localhost:8000/api/knowledge-graph/{document_id}`
- `GET http://localhost:8000/api/flashcards/{document_id}`
