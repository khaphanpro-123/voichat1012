"""
API Endpoints for STAGE 11 (Knowledge Graph) and STAGE 12 (Flashcards)

Add these endpoints to main.py
"""

# ==================== STAGE 11: KNOWLEDGE GRAPH ====================

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
        # TODO: Load from database or cache
        # For now, return mock data structure
        
        return {
            "document_id": document_id,
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
                    "importance_score": 0.95,
                    "size": 10
                }
            ],
            "edges": [
                {
                    "source": "cluster_0",
                    "target": "phrase_climate_change",
                    "type": "contains",
                    "weight": 0.95
                },
                {
                    "source": "phrase_climate_change",
                    "target": "phrase_global_warming",
                    "type": "similar_to",
                    "weight": 0.89,
                    "label": "0.89"
                }
            ],
            "clusters": [
                {
                    "id": 0,
                    "name": "Climate Change & Global Warming",
                    "size": 45,
                    "color": "#FF6B6B"
                }
            ],
            "mindmap": "# Vocabulary Mind Map\n\n## Topic 1\n- climate change\n- global warming"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ==================== STAGE 12: FLASHCARDS ====================

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
        # TODO: Load from database or cache
        # For now, return mock data structure
        
        if group_by_cluster:
            return {
                "document_id": document_id,
                "grouped_by_cluster": True,
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
                                    {"word": "climatic change", "similarity": 0.89},
                                    {"word": "climate shift", "similarity": 0.87}
                                ],
                                "cluster_id": 0,
                                "cluster_name": "Climate Change & Global Warming",
                                "cluster_rank": 1,
                                "semantic_role": "core",
                                "importance_score": 0.95,
                                "meaning": "Long-term shifts in global climate patterns",
                                "example": "Climate change is one of the most pressing issues...",
                                "ipa": "/ˈklaɪmət tʃeɪndʒ/",
                                "audio_word_url": "https://translate.google.com/translate_tts?ie=UTF-8&q=climate%20change&tl=en&client=tw-ob",
                                "audio_example_url": "https://translate.google.com/translate_tts?ie=UTF-8&q=Climate%20change%20is...&tl=en&client=tw-ob",
                                "word_type": "phrase",
                                "difficulty": "advanced",
                                "tags": ["climate change & global warming", "phrase"],
                                "related_words": [
                                    {"word": "greenhouse effect", "similarity": 0.85},
                                    {"word": "carbon emissions", "similarity": 0.78}
                                ]
                            }
                        ]
                    }
                ],
                "total_flashcards": 93,
                "total_clusters": 3
            }
        else:
            # Return flat list
            return {
                "document_id": document_id,
                "grouped_by_cluster": False,
                "flashcards": [],
                "total_flashcards": 93
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ==================== HELPER: Store Results ====================

# Global cache for storing pipeline results
pipeline_results_cache = {}

def store_pipeline_result(document_id: str, result: dict):
    """Store pipeline result in cache"""
    pipeline_results_cache[document_id] = {
        "result": result,
        "timestamp": datetime.now().isoformat()
    }

def get_pipeline_result(document_id: str) -> dict:
    """Get pipeline result from cache"""
    if document_id in pipeline_results_cache:
        return pipeline_results_cache[document_id]["result"]
    return None
