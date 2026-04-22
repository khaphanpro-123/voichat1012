from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import List, Optional, Dict
import os
import numpy as np
from datetime import datetime
import shutil
from pathlib import Path

import nltk
try:
    print(" Downloading NLTK data...")
    nltk.download('wordnet', quiet=True)
    nltk.download('omw-1.4', quiet=True)
    nltk.download('punkt', quiet=True)
    nltk.download('averaged_perceptron_tagger', quiet=True)
    nltk.download('stopwords', quiet=True)
    print(" NLTK data downloaded successfully")
except Exception as e:
    print(f" NLTK download warning: {e}")
# Document processing
try:
    import PyPDF2
    import docx
    PDF_SUPPORT = True
except ImportError:
    PDF_SUPPORT = False
    print("  Warning: PyPDF2 or python-docx not installed. PDF/DOCX support disabled.")

# Import extractors
from phrase_centric_extractor import PhraseCentricExtractor
from complete_pipeline import CompletePipelineNew

# Import ablation study router
from ablation_api_endpoint import router as ablation_router
app = FastAPI(
    title="Visual Language Tutor API",
    version="2.0",
    description="Complete 11-Step Pipeline + Phrase-Centric Extraction"
)
# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# Include ablation study router
app.include_router(ablation_router, prefix="/api", tags=["ablation"])

# Directories
os.makedirs("uploads", exist_ok=True)
# os.makedirs("knowledge_graph_data", exist_ok=True)  # DISABLED

# Initialize systems
print(" Initializing systems...")

# Phrase-Centric Extractor
phrase_extractor = PhraseCentricExtractor()
print(" Phrase-Centric Extractor initialized")
knowledge_graph = None
print("  Knowledge Graph DISABLED")
rag_system = None
print("  RAG System DISABLED")
print(" All systems ready!")
class FlashcardRequest(BaseModel):
    """Request for flashcard generation"""
    document_id: str
    max_cards: int = 30
class RAGQueryRequest(BaseModel):
    """Request for RAG query"""
    document_id: str
    query: str
    max_results: int = 5
def convert_numpy_types(obj):
    if isinstance(obj, np.ndarray):
        return obj.tolist()
    elif isinstance(obj, np.integer):
        return int(obj)
    elif isinstance(obj, np.floating):
        val = float(obj)
        # Handle inf and NaN
        if np.isnan(val) or np.isinf(val):
            return 0.0
        return val
    elif isinstance(obj, np.bool_):
        return bool(obj)
    elif isinstance(obj, dict):
        return {key: convert_numpy_types(value) for key, value in obj.items()}
    elif isinstance(obj, list):
        return [convert_numpy_types(item) for item in obj]
    elif isinstance(obj, tuple):
        return tuple(convert_numpy_types(item) for item in obj)
    elif isinstance(obj, float):
        # Handle Python float inf and NaN
        if np.isnan(obj) or np.isinf(obj):
            return 0.0
        return obj
    else:
        return obj

def extract_text_from_file(file_path: str) -> str:
    """Extract text from uploaded file"""
    ext = Path(file_path).suffix.lower()
    
    try:
        if ext == '.txt':
            with open(file_path, 'r', encoding='utf-8') as f:
                return f.read()
        
        elif ext == '.pdf' and PDF_SUPPORT:
            text = ""
            with open(file_path, 'rb') as f:
                pdf_reader = PyPDF2.PdfReader(f)
                for page in pdf_reader.pages:
                    text += page.extract_text() + "\n"
            return text
        
        elif ext in ['.docx', '.doc'] and PDF_SUPPORT:
            doc = docx.Document(file_path)
            return "\n".join([para.text for para in doc.paragraphs])
        
        else:
            raise ValueError(f"Unsupported file type: {ext}")
    
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error extracting text: {str(e)}")
@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "status": "online",
        "version": "2.0",
        "system": "Complete 11-Step Pipeline + Phrase-Centric",
        "endpoints": {
            "upload_complete": "/api/upload-document-complete (phrases + words)",
            "upload_phrases": "/api/upload-document (phrases only)",
            "ablation_study": "/api/ablation-study (POST - run ablation study)",
            "ablation_example": "/api/ablation-study/example (GET - example request)"
        },
        "disabled_endpoints": {
            "flashcards": "/api/rag/generate-flashcards (DISABLED - use upload endpoints)",
            "query": "/api/rag/query (DISABLED)",
            "stats": "/api/knowledge-graph/stats (DISABLED)"
        }
    }
@app.get("/health")
async def health_check():
    """Detailed health check"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "systems": {
            "phrase_extractor": phrase_extractor is not None,
            "knowledge_graph": knowledge_graph is not None,
            "rag_system": rag_system is not None
        }
    }
@app.post("/api/upload-document-complete")
async def upload_document_complete(
    file: UploadFile = File(...),
    max_phrases: int = Form(40),
    max_words: int = Form(10),
    use_bm25: bool = Form(False),
    bm25_weight: float = Form(0.2),
    generate_flashcards: bool = Form(True)
):
    try:
        # Validate file
        if not file.filename:
            raise HTTPException(status_code=400, detail="No file provided")
        
        file_ext = Path(file.filename).suffix.lower()
        allowed_extensions = ['.txt', '.pdf', '.docx', '.doc']
        
        if file_ext not in allowed_extensions:
            raise HTTPException(
                status_code=400,
                detail=f"File type not supported. Allowed: {', '.join(allowed_extensions)}"
            )
        
        # Save file
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        safe_filename = f"{timestamp}_{file.filename}"
        file_path = os.path.join("uploads", safe_filename)
        
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        print(f"[Upload Complete] File saved: {file_path}")
        
        # Extract text
        text = extract_text_from_file(file_path)
        
        if not text or len(text) < 50:
            raise HTTPException(
                status_code=400,
                detail="Extracted text is too short (minimum 50 characters)"
            )
        
        print(f"[Upload Complete] Extracted {len(text)} characters")
        
        # Check if text is English
        non_ascii_count = sum(1 for c in text if not c.isascii() and c.isalpha())
        total_alpha = sum(1 for c in text if c.isalpha())
        
        if total_alpha > 0:
            non_ascii_ratio = non_ascii_count / total_alpha
            
            if non_ascii_ratio > 0.3:
                raise HTTPException(
                    status_code=400,
                    detail=f" Text appears to be non-English (detected {non_ascii_ratio*100:.1f}% non-ASCII characters). "
                           f"This system currently supports English text only. "
                           f"Please upload an English document."
                )
        
        # Initialize complete pipeline
        document_id = f"doc_{timestamp}"
        
        pipeline = CompletePipelineNew(
            n_topics=5
        )
        
        print(f"[Upload Complete] Processing through new pipeline...")
        
        # Process document through complete pipeline
        result = pipeline.process_document(
            text=text,
            document_title=file.filename,
            max_phrases=max_phrases,
            max_words=max_words,
            use_bm25=use_bm25,
            bm25_weight=bm25_weight,
            generate_flashcards=generate_flashcards
        )
        
        # Store result in cache for later retrieval (STAGE 11 & 12)
        store_pipeline_result(document_id, result)
        
        print(f"[Upload Complete] Pipeline complete!")
        print(f"  Vocabulary: {len(result['vocabulary'])} items")
        print(f"  Flashcards: {len(result['flashcards'])} cards")
        
        # Convert numpy types to Python native types for JSON serialization
        vocabulary = convert_numpy_types(result['vocabulary'])
        flashcards = convert_numpy_types(result.get('flashcards', []))
        topics = convert_numpy_types(result.get('topics', []))
        statistics = convert_numpy_types(result.get('statistics', {}))
        
        # Add importance_score field for frontend compatibility
        # Also add fuzzy difficulty levels
        for item in vocabulary:
            # Use final_score as importance_score
            final_score = item.get('final_score', 0.0)
            item['importance_score'] = final_score
            
            # Add fuzzy difficulty level based on score ranges
            if final_score >= 0.8:
                item['difficulty'] = 'critical'  # Rất quan trọng
                item['difficulty_label'] = 'Rất quan trọng'
            elif final_score >= 0.6:
                item['difficulty'] = 'important'  # Quan trọng
                item['difficulty_label'] = 'Quan trọng'
            elif final_score >= 0.4:
                item['difficulty'] = 'moderate'  # Trung bình
                item['difficulty_label'] = 'Trung bình'
            else:
                item['difficulty'] = 'easy'  # Dễ
                item['difficulty_label'] = 'Dễ'
        
        # Group vocabulary by difficulty for fuzzy display
        vocabulary_by_difficulty = {
            'critical': [],      # 0.8 - 1.0
            'important': [],     # 0.6 - 0.79
            'moderate': [],      # 0.4 - 0.59
            'easy': []          # 0.0 - 0.39
        }
        
        for item in vocabulary:
            difficulty = item.get('difficulty', 'easy')
            vocabulary_by_difficulty[difficulty].append(item)
        
        print(f"[Upload Complete] Vocabulary grouped by difficulty:")
        print(f"  🔴 Critical: {len(vocabulary_by_difficulty['critical'])} items")
        print(f"  🟠 Important: {len(vocabulary_by_difficulty['important'])} items")
        print(f"  🟡 Moderate: {len(vocabulary_by_difficulty['moderate'])} items")
        print(f"  🟢 Easy: {len(vocabulary_by_difficulty['easy'])} items")
        
        # Prepare response
        return JSONResponse(content={
            'success': True,
            'document_id': document_id,
            'filename': file.filename,
            'text_length': len(text),
            'vocabulary': vocabulary,
            'vocabulary_count': len(vocabulary),
            'vocabulary_by_difficulty': vocabulary_by_difficulty,  # NEW: Grouped vocabulary
            'flashcards': flashcards,
            'flashcards_count': len(flashcards),
            'topics': topics,
            'statistics': statistics,
            'pipeline': 'Complete Pipeline (New)',
            'pipeline_version': result.get('metadata', {}).get('pipeline_version', '2.0'),
            'timestamp': datetime.now().isoformat()
        })
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"[Upload Complete] Error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/upload-document")
async def upload_document(
    file: UploadFile = File(...),
    max_phrases: int = Form(50),
    min_phrase_length: int = Form(2),
    max_phrase_length: int = Form(5)
):
    try:
        # Validate file
        if not file.filename:
            raise HTTPException(status_code=400, detail="No file provided")
        
        file_ext = Path(file.filename).suffix.lower()
        allowed_extensions = ['.txt', '.pdf', '.docx', '.doc']
        
        if file_ext not in allowed_extensions:
            raise HTTPException(
                status_code=400,
                detail=f"File type not supported. Allowed: {', '.join(allowed_extensions)}"
            )
        
        # Save file
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        safe_filename = f"{timestamp}_{file.filename}"
        file_path = os.path.join("uploads", safe_filename)
        
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        print(f"[Upload] File saved: {file_path}")
        
        # Extract text
        text = extract_text_from_file(file_path)
        
        if not text or len(text) < 50:
            raise HTTPException(
                status_code=400,
                detail="Extracted text is too short (minimum 50 characters)"
            )
        
        print(f"[Upload] Extracted {len(text)} characters")
        
        # Check if text is English
        non_ascii_count = sum(1 for c in text if not c.isascii() and c.isalpha())
        total_alpha = sum(1 for c in text if c.isalpha())
        
        if total_alpha > 0:
            non_ascii_ratio = non_ascii_count / total_alpha
            
            if non_ascii_ratio > 0.3:
                raise HTTPException(
                    status_code=400,
                    detail=f" Text appears to be non-English (detected {non_ascii_ratio*100:.1f}% non-ASCII characters). "
                           f"This system currently supports English text only. "
                           f"Please upload an English document."
                )
        
        # Extract vocabulary (phrase-centric)
        document_id = f"doc_{timestamp}"
        
        phrases = phrase_extractor.extract_vocabulary(
            text=text,
            document_title=file.filename,
            max_phrases=max_phrases,
            min_phrase_length=min_phrase_length,
            max_phrase_length=max_phrase_length
        )
        
        print(f"[Upload] Extracted {len(phrases)} phrases")
        
        # Convert to context format for Knowledge Graph
        vocabulary_contexts = []
        for phrase_dict in phrases:
            vocabulary_contexts.append({
                'word': phrase_dict['phrase'],
                'finalScore': phrase_dict['importance_score'],
                'contextSentence': phrase_dict.get('supporting_sentence', ''),
                'sentenceId': f"S{len(vocabulary_contexts)}",
                'sentenceScore': phrase_dict.get('heading_similarity', 0.0),
                'features': {
                    'frequency': phrase_dict.get('frequency', 0),
                    'heading_similarity': phrase_dict.get('heading_similarity', 0.0),
                    'contrastive_score': phrase_dict.get('contrastive_score', 0.0)
                }
            })
       
        kg_stats = {'entities_created': 0, 'relations_created': 0, 'vocabulary_terms': len(vocabulary_contexts)}
        print(f"[Upload] Knowledge Graph SKIPPED (disabled)")
        flashcards = []
        for vc in vocabulary_contexts[:min(30, len(vocabulary_contexts))]:
            flashcards.append({
                'word': vc['word'],
                'meaning': f"Academic term from {file.filename}",
                'example': vc['contextSentence'][:200] if vc['contextSentence'] else "",
                'score': vc['finalScore']
            })
        print(f"[Upload] Generated {len(flashcards)} flashcards (simple mode)")
        
        # Convert numpy types to Python native types
        vocabulary_contexts = convert_numpy_types(vocabulary_contexts)
        flashcards = convert_numpy_types(flashcards)
        kg_stats = convert_numpy_types(kg_stats)
        
        return JSONResponse(content={
            'success': True,
            'document_id': document_id,
            'filename': file.filename,
            'text_length': len(text),
            'vocabulary': vocabulary_contexts,
            'vocabulary_count': len(vocabulary_contexts),
            'flashcards': flashcards,
            'flashcards_count': len(flashcards),
            'knowledge_graph_stats': kg_stats,
            'pipeline': 'Phrase-Centric (Phrases Only)',
            'timestamp': datetime.now().isoformat()
        })
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"[Upload] Error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
@app.get("/api/knowledge-graph/vocabulary/{document_id}")
async def get_vocabulary_by_document(document_id: str):
    try:
        # Get pipeline result from cache
        result = get_pipeline_result(document_id)
        
        if not result:
            raise HTTPException(
                status_code=404,
                detail=f"Document {document_id} not found. Please upload document first."
            )
        
        # Extract vocabulary from result
        vocabulary = result.get('vocabulary', [])
        
        # Convert to simplified format
        vocabulary_dicts = []
        for term in vocabulary:
            vocabulary_dicts.append({
                'term_id': f"term_{len(vocabulary_dicts)}",
                'word': term.get('phrase', ''),
                'score': term.get('tfidf_score', 0),
                'frequency': term.get('frequency', 0),
                'sentence_count': term.get('sentence_count', 0),
                'cluster_id': term.get('cluster_id', 0),
                'occurrences': term.get('occurrences', [])
            })
        
        return JSONResponse(content={
            'success': True,
            'document_id': document_id,
            'vocabulary': vocabulary_dicts,
            'count': len(vocabulary_dicts)
        })
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/knowledge-graph/stats")
async def get_knowledge_graph_stats():
    raise HTTPException(
        status_code=501,
        detail="Knowledge Graph stats endpoint disabled. Use per-document endpoints instead."
    )
@app.post("/api/rag/generate-flashcards")
async def generate_flashcards(request: FlashcardRequest):
    raise HTTPException(
        status_code=501,
        detail="RAG system disabled. Use /api/upload-document-complete instead."
    )
@app.post("/api/rag/query")
async def rag_query(request: RAGQueryRequest):
    raise HTTPException(
        status_code=501,
        detail="RAG system disabled."
    )
pipeline_results_cache = {}

def store_pipeline_result(document_id: str, result: dict):
    """Store pipeline result in cache"""
    pipeline_results_cache[document_id] = {
        "result": result,
        "timestamp": datetime.now().isoformat()
    }
    print(f" Stored result for document: {document_id}")

def get_pipeline_result(document_id: str) -> Optional[dict]:
    """Get pipeline result from cache"""
    if document_id in pipeline_results_cache:
        return pipeline_results_cache[document_id]["result"]
    return None
@app.get("/api/knowledge-graph/{document_id}")
async def get_knowledge_graph(document_id: str):
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
@app.get("/api/flashcards/{document_id}")
async def get_flashcards(
    document_id: str,
    group_by_cluster: bool = True
):
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
if __name__ == "__main__":
    import uvicorn
    
    print("\n" + "="*80)
    print("VISUAL LANGUAGE TUTOR API")
    print("="*80)
    print("Version: 2.0 (New Pipeline)")
    print("Pipeline: Complete 11-Step + Phrase-Centric")
    print("")
    print("  Main Endpoints:")
    print("  POST /api/upload-document-complete  (Phrases + Words)")
    print("  POST /api/upload-document           (Phrases Only)")
    print("  GET  /api/knowledge-graph/{doc_id}  (STAGE 11 Visualization)")
    print("  GET  /api/flashcards/{doc_id}       (STAGE 11 Flashcards)")
    print("")
    print("  Ablation Study:")
    print("  POST /api/ablation-study            (Run Ablation Study)")
    print("  GET  /api/ablation-study/example    (Example Request)")
    print("")
    print("Documentation: http://localhost:8000/docs")
    print("="*80 + "\n")
    uvicorn.run(app, host="0.0.0.0", port=8000)
