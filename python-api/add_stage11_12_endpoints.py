"""
Script to add STAGE 11 & 12 API endpoints to main.py

Run: python add_stage11_12_endpoints.py
"""

import os

# Code to add
GLOBAL_CACHE_CODE = '''
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

'''

API_ENDPOINTS_CODE = '''
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

'''

def main():
    print("=" * 80)
    print("ADDING STAGE 11 & 12 API ENDPOINTS TO main.py")
    print("=" * 80)
    print()
    
    # Read main.py
    with open('main.py', 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Check if already added
    if 'pipeline_results_cache' in content:
        print("⚠️  Global cache already exists in main.py")
        print("⚠️  Skipping global cache addition")
    else:
        # Find insertion point (after "print('✅ All systems ready!')")
        insertion_point = content.find("print('✅ All systems ready!')")
        
        if insertion_point == -1:
            print("❌ Could not find insertion point for global cache")
            return
        
        # Find end of line
        insertion_point = content.find('\n', insertion_point) + 1
        
        # Insert global cache code
        content = content[:insertion_point] + '\n' + GLOBAL_CACHE_CODE + content[insertion_point:]
        print("✅ Added global cache code")
    
    # Check if API endpoints already added
    if 'get_knowledge_graph' in content:
        print("⚠️  API endpoints already exist in main.py")
        print("⚠️  Skipping API endpoints addition")
    else:
        # Find insertion point (before "if __name__ == '__main__':")
        insertion_point = content.find('if __name__ == "__main__":')
        
        if insertion_point == -1:
            print("❌ Could not find insertion point for API endpoints")
            return
        
        # Insert API endpoints code
        content = content[:insertion_point] + '\n' + API_ENDPOINTS_CODE + '\n' + content[insertion_point:]
        print("✅ Added API endpoints code")
    
    # Write back to main.py
    with open('main.py', 'w', encoding='utf-8') as f:
        f.write(content)
    
    print()
    print("=" * 80)
    print("DONE!")
    print("=" * 80)
    print()
    print("Next steps:")
    print("1. Check main.py for the new code")
    print("2. Add 'store_pipeline_result(document_id, result)' to upload endpoint")
    print("3. Restart server: python main.py")
    print("4. Test endpoints:")
    print("   - GET http://localhost:8000/api/knowledge-graph/{document_id}")
    print("   - GET http://localhost:8000/api/flashcards/{document_id}")
    print()

if __name__ == "__main__":
    main()
