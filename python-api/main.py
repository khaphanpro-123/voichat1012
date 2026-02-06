"""
Visual Language Tutor - Backend API (Simplified for STAGE 1-5)
Chỉ bao gồm: Ensemble Extraction + Context Intelligence + Feedback Loop + Knowledge Graph + RAG
"""

from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import List, Optional, Dict
import os
from datetime import datetime
import shutil
from pathlib import Path

# For document processing
try:
    import PyPDF2
    import docx
    PDF_SUPPORT = True
except ImportError:
    PDF_SUPPORT = False
    print("⚠️  Warning: PyPDF2 or python-docx not installed. PDF/DOCX support disabled.")

# Import custom modules (STAGE 1-5)
from ensemble_extractor import extract_vocabulary_ensemble
from context_intelligence import select_vocabulary_contexts
from feedback_loop import FeedbackLoop, FeedbackMemory
from knowledge_graph import KnowledgeGraph
from rag_system import RAGSystem
from kmeans_clustering import cluster_vocabulary_kmeans

# Import embedding system (STAGE 6)
try:
    from document_embedding import DocumentEmbedder, semantic_search, find_similar_documents
    EMBEDDING_AVAILABLE = True
except ImportError:
    EMBEDDING_AVAILABLE = False
    print("⚠️  Warning: document_embedding not available. Install: pip install sentence-transformers")

# ==================== CONFIGURATION ====================

app = FastAPI(title="Visual Language Tutor API - STAGE 1-5", version="2.0.0")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Directories
os.makedirs("uploads", exist_ok=True)
os.makedirs("cache", exist_ok=True)
os.makedirs("feedback_data", exist_ok=True)
os.makedirs("knowledge_graph_data", exist_ok=True)

# Initialize systems
print("🔄 Initializing systems...")

# STAGE 3: Feedback Loop
feedback_loop = FeedbackLoop(storage_path="feedback_data")
print("✅ Feedback Loop initialized")

# STAGE 4: Knowledge Graph
knowledge_graph = KnowledgeGraph(storage_path="knowledge_graph_data")
print("✅ Knowledge Graph initialized")

# STAGE 5: RAG System
rag_system = RAGSystem(
    knowledge_graph=knowledge_graph,
    llm_api_key=os.getenv("OPENAI_API_KEY"),
    llm_model="gpt-4"
)
print("✅ RAG System initialized")

# STAGE 6: Embedding System (Optional)
embedder = None
if EMBEDDING_AVAILABLE:
    try:
        embedder = DocumentEmbedder()
        print("✅ Embedding System initialized")
    except Exception as e:
        print(f"⚠️  Embedding System initialization failed: {e}")
        embedder = None

print("✅ All systems ready!")


# ==================== DATA MODELS ====================

class SmartVocabularyRequest(BaseModel):
    text: str
    max_words: int = 20
    language: str = "en"


class FeedbackRequest(BaseModel):
    word: str
    document_id: str
    user_id: str
    scores: Dict[str, float]
    final_score: float
    user_action: str  # 'keep', 'drop', 'star'


class KnowledgeGraphRequest(BaseModel):
    document_id: str
    document_title: str
    document_content: str
    vocabulary_contexts: List[Dict]


class FlashcardRequest(BaseModel):
    document_id: Optional[str] = None
    word: Optional[str] = None
    max_cards: int = 10


class ExplainRequest(BaseModel):
    word: str
    document_id: Optional[str] = None


class RelatedRequest(BaseModel):
    word: str
    max_terms: int = 5


class RAGQueryRequest(BaseModel):
    query: str
    context: Optional[Dict] = None


class SemanticSearchRequest(BaseModel):
    query: str
    documents: List[str]
    top_k: int = 5
    threshold: float = 0.0


class DocumentSimilarityRequest(BaseModel):
    document_id: int
    documents: List[str]
    top_k: int = 5


# ==================== HEALTH CHECK ====================

@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "status": "online",
        "message": "Visual Language Tutor API - STAGE 1-5",
        "version": "2.0.0",
        "stages": {
            "stage1": "Ensemble Extraction",
            "stage2": "Context Intelligence",
            "stage3": "Feedback Loop",
            "stage4": "Knowledge Graph",
            "stage5": "RAG System"
        }
    }


# ==================== STAGE 1 & 2: VOCABULARY EXTRACTION ====================

@app.post("/api/smart-vocabulary-extract")
async def smart_vocabulary_extract(request: SmartVocabularyRequest):
    """
    Smart Vocabulary Extraction with Context Intelligence
    
    STAGE 1: Ensemble extraction (TF-IDF + Frequency + POS + N-grams)
    STAGE 2: Context selection (best sentence for each word)
    """
    try:
        text = request.text
        max_words = request.max_words
        language = request.language
        
        if not text or len(text) < 50:
            raise HTTPException(
                status_code=400,
                detail="Text quá ngắn (cần ít nhất 50 ký tự)"
            )
        
        print(f"[Extract] Starting extraction for {len(text)} characters...")
        
        # STAGE 1: Ensemble Extraction
        ensemble_result = extract_vocabulary_ensemble(
            text,
            max_words=max_words,
            min_word_length=3,
            include_ngrams=True,
            filter_proper_nouns=True,
            filter_technical=True,
            context_filtering=True
        )
        
        vocabulary_list = [
            {'word': score['word'], 'score': score['score']}
            for score in ensemble_result['scores']
        ]
        
        # STAGE 2: Context Selection
        contexts = select_vocabulary_contexts(
            text,
            vocabulary_list,
            language=language
        )
        
        # Prepare results
        results = []
        for ctx in contexts:
            score_data = next(
                (s for s in ensemble_result['scores'] if s['word'] == ctx['word']),
                None
            )
            
            result = {
                'word': ctx['word'],
                'score': ctx['finalScore'],
                'context': ctx['contextSentence'],
                'contextPlain': ctx['contextSentence'].replace('<b>', '').replace('</b>', ''),
                'sentenceId': ctx['sentenceId'],
                'sentenceScore': ctx['sentenceScore'],
                'explanation': ctx['explanation'],
                'features': score_data['features'] if score_data else {}
            }
            results.append(result)
        
        return JSONResponse(content={
            'success': True,
            'vocabulary': results,
            'count': len(results),
            'stats': {
                'stage1': ensemble_result['stats'],
                'stage2': {
                    'totalContexts': len(contexts),
                    'avgSentenceScore': sum(c['sentenceScore'] for c in contexts) / len(contexts) if contexts else 0
                }
            },
            'pipeline': 'STAGE 1 (Ensemble Extraction) + STAGE 2 (Context Intelligence)'
        })
        
    except Exception as e:
        print(f"[Extract] Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/smart-vocabulary-extract-adaptive")
async def smart_vocabulary_extract_adaptive(request: SmartVocabularyRequest):
    """
    Smart Vocabulary Extraction with Adaptive Weights (STAGE 3)
    
    Uses current adaptive weights from feedback loop
    """
    try:
        text = request.text
        max_words = request.max_words
        language = request.language
        
        if not text or len(text) < 50:
            raise HTTPException(
                status_code=400,
                detail="Text quá ngắn (cần ít nhất 50 ký tự)"
            )
        
        print(f"[Adaptive Extract] Starting with adaptive weights...")
        
        # Get current adaptive weights
        adaptive_weights = feedback_loop.get_current_weights()
        print(f"[Adaptive Extract] Using weights: {adaptive_weights}")
        
        # STAGE 1: Extract with adaptive weights
        ensemble_result = extract_vocabulary_ensemble(
            text,
            max_words=max_words,
            weights=adaptive_weights,
            include_ngrams=True
        )
        
        vocabulary_list = [
            {'word': score['word'], 'score': score['score']}
            for score in ensemble_result['scores']
        ]
        
        # STAGE 2: Select contexts
        contexts = select_vocabulary_contexts(text, vocabulary_list, language)
        
        # Prepare results
        results = []
        for ctx in contexts:
            score_data = next(
                (s for s in ensemble_result['scores'] if s['word'] == ctx['word']),
                None
            )
            
            result = {
                'word': ctx['word'],
                'score': ctx['finalScore'],
                'context': ctx['contextSentence'],
                'contextPlain': ctx['contextSentence'].replace('<b>', '').replace('</b>', ''),
                'sentenceId': ctx['sentenceId'],
                'sentenceScore': ctx['sentenceScore'],
                'explanation': ctx['explanation'],
                'features': score_data['features'] if score_data else {}
            }
            results.append(result)
        
        # Get weights info
        weights_info = feedback_loop.get_statistics()
        
        return JSONResponse(content={
            'success': True,
            'vocabulary': results,
            'count': len(results),
            'stats': {
                'stage1': ensemble_result['stats'],
                'stage2': {
                    'totalContexts': len(contexts),
                    'avgSentenceScore': sum(c['sentenceScore'] for c in contexts) / len(contexts) if contexts else 0
                }
            },
            'adaptive_weights': {
                'weights': adaptive_weights,
                'version': weights_info.get('weights_version', 0),
                'feedback_count': weights_info.get('feedback_stats', {}).get('total', 0)
            },
            'pipeline': 'STAGE 1 (Adaptive Ensemble) + STAGE 2 (Context Intelligence) + STAGE 3 (Feedback Loop)'
        })
        
    except Exception as e:
        print(f"[Adaptive Extract] Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== STAGE 3: FEEDBACK LOOP ====================

@app.post("/api/vocabulary-feedback")
async def submit_vocabulary_feedback(request: FeedbackRequest):
    """Submit user feedback for vocabulary word"""
    try:
        if request.user_action not in ['keep', 'drop', 'star']:
            raise HTTPException(
                status_code=400,
                detail="user_action must be 'keep', 'drop', or 'star'"
            )
        
        result = feedback_loop.process_feedback(
            word=request.word,
            document_id=request.document_id,
            user_id=request.user_id,
            scores=request.scores,
            final_score=request.final_score,
            user_action=request.user_action
        )
        
        return JSONResponse(content={
            'success': True,
            'feedback_saved': result['feedback_saved'],
            'weights_updated': result['weights_updated'],
            'new_weights': result['new_weights'],
            'explanation': result['explanation']
        })
        
    except Exception as e:
        print(f"[Feedback] Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/vocabulary-feedback/statistics")
async def get_feedback_statistics(user_id: Optional[str] = None):
    """Get feedback statistics"""
    try:
        if user_id:
            memory = FeedbackMemory()
            user_feedbacks = memory.get_feedback_by_user(user_id)
            
            stats = {
                'total': len(user_feedbacks),
                'keep': sum(1 for fb in user_feedbacks if fb.user_action == 'keep'),
                'drop': sum(1 for fb in user_feedbacks if fb.user_action == 'drop'),
                'star': sum(1 for fb in user_feedbacks if fb.user_action == 'star')
            }
        else:
            stats = feedback_loop.get_statistics()
        
        return JSONResponse(content={
            'success': True,
            'statistics': stats
        })
        
    except Exception as e:
        print(f"[Feedback Stats] Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/vocabulary-feedback/weights")
async def get_current_weights():
    """Get current ensemble weights"""
    try:
        weights = feedback_loop.get_current_weights()
        stats = feedback_loop.get_statistics()
        
        return JSONResponse(content={
            'success': True,
            'weights': weights,
            'version': stats.get('weights_version', 0),
            'last_updated': stats.get('last_updated', ''),
            'feedback_count': stats.get('feedback_stats', {}).get('total', 0)
        })
        
    except Exception as e:
        print(f"[Weights] Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== STAGE 4: KNOWLEDGE GRAPH ====================

@app.post("/api/knowledge-graph/build")
async def build_knowledge_graph(request: KnowledgeGraphRequest):
    """Build Knowledge Graph from vocabulary contexts"""
    try:
        stats = knowledge_graph.build_from_vocabulary_contexts(
            vocabulary_contexts=request.vocabulary_contexts,
            document_id=request.document_id,
            document_title=request.document_title,
            document_content=request.document_content
        )
        
        knowledge_graph.save_graph()
        graph_stats = knowledge_graph.get_statistics()
        
        return JSONResponse(content={
            'success': True,
            'build_stats': stats,
            'graph_stats': graph_stats,
            'message': f"Knowledge graph built for document: {request.document_id}"
        })
        
    except Exception as e:
        print(f"[KG Build] Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/knowledge-graph/query/vocabulary/{document_id}")
async def query_vocabulary_by_document(document_id: str):
    """Query all vocabulary terms in a document"""
    try:
        vocab_terms = knowledge_graph.query_vocabulary_by_document(document_id)
        
        results = [
            {
                'term_id': term.entity_id,
                'word': term.properties.get('word'),
                'score': term.properties.get('score'),
                'context': term.properties.get('context_sentence')
            }
            for term in vocab_terms
        ]
        
        return JSONResponse(content={
            'success': True,
            'document_id': document_id,
            'vocabulary_count': len(results),
            'vocabulary': results
        })
        
    except Exception as e:
        print(f"[KG Query] Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/knowledge-graph/statistics")
async def get_knowledge_graph_statistics():
    """Get Knowledge Graph statistics"""
    try:
        stats = knowledge_graph.get_statistics()
        
        return JSONResponse(content={
            'success': True,
            'statistics': stats
        })
        
    except Exception as e:
        print(f"[KG Stats] Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== STAGE 5: RAG SYSTEM ====================

@app.post("/api/rag/generate-flashcards")
async def generate_flashcards(request: FlashcardRequest):
    """Generate flashcards using RAG"""
    try:
        result = rag_system.generate_flashcards(
            document_id=request.document_id,
            word=request.word,
            max_cards=request.max_cards
        )
        
        return JSONResponse(content=result)
        
    except Exception as e:
        print(f"[RAG Flashcards] Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/rag/explain-term")
async def explain_term(request: ExplainRequest):
    """Explain term using RAG"""
    try:
        result = rag_system.explain_term(
            word=request.word,
            document_id=request.document_id
        )
        
        return JSONResponse(content=result)
        
    except Exception as e:
        print(f"[RAG Explain] Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/rag/find-related")
async def find_related_terms(request: RelatedRequest):
    """Find related terms using RAG"""
    try:
        result = rag_system.find_related_terms(
            word=request.word,
            max_terms=request.max_terms
        )
        
        return JSONResponse(content=result)
        
    except Exception as e:
        print(f"[RAG Related] Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/rag/query")
async def process_rag_query(request: RAGQueryRequest):
    """Process custom RAG query"""
    try:
        result = rag_system.process_query(
            query=request.query,
            context=request.context or {}
        )
        
        return JSONResponse(content=result)
        
    except Exception as e:
        print(f"[RAG Query] Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== FILE UPLOAD ====================

def extract_text_from_file(file_path: str) -> str:
    """Extract text from uploaded file"""
    file_ext = Path(file_path).suffix.lower()
    
    try:
        if file_ext == '.txt':
            with open(file_path, 'r', encoding='utf-8') as f:
                return f.read()
        
        elif file_ext == '.pdf' and PDF_SUPPORT:
            text = ""
            with open(file_path, 'rb') as f:
                pdf_reader = PyPDF2.PdfReader(f)
                for page in pdf_reader.pages:
                    text += page.extract_text() + "\n"
            return text
        
        elif file_ext in ['.docx', '.doc'] and PDF_SUPPORT:
            doc = docx.Document(file_path)
            text = "\n".join([paragraph.text for paragraph in doc.paragraphs])
            return text
        
        else:
            raise ValueError(f"Unsupported file type: {file_ext}")
    
    except Exception as e:
        raise ValueError(f"Error extracting text from file: {str(e)}")


@app.post("/api/upload-document")
async def upload_document(
    file: UploadFile = File(...),
    max_words: int = Form(50),      # Tăng default từ 20 lên 50
    language: str = Form("en"),
    max_flashcards: int = Form(30)  # Cho phép user chọn số flashcards
):
    # Limit max_words to reasonable range
    if max_words > 100:
        max_words = 100
        print(f"[Upload] max_words limited to 100 for performance")
    elif max_words < 5:
        max_words = 5
    """
    Upload document and extract vocabulary
    
    Supports: .txt, .pdf, .docx
    """
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
        
        if file_ext in ['.pdf', '.docx', '.doc'] and not PDF_SUPPORT:
            raise HTTPException(
                status_code=400,
                detail="PDF/DOCX support not available. Please install PyPDF2 and python-docx"
            )
        
        # Save uploaded file
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
        
        print(f"[Upload] Extracted {len(text)} characters from {file.filename}")
        
        # Run complete pipeline
        adaptive_weights = feedback_loop.get_current_weights()
        
        # STAGE 1: Ensemble Extraction
        ensemble_result = extract_vocabulary_ensemble(
            text,
            max_words=max_words,
            weights=adaptive_weights
        )
        
        vocabulary_list = [
            {'word': score['word'], 'score': score['score']}
            for score in ensemble_result['scores']
        ]
        
        # STAGE 2: Context Selection
        contexts = select_vocabulary_contexts(text, vocabulary_list, language)
        
        # Prepare vocabulary contexts
        vocabulary_contexts = []
        for ctx in contexts:
            score_data = next(
                (s for s in ensemble_result['scores'] if s['word'] == ctx['word']),
                None
            )
            
            vocabulary_contexts.append({
                'word': ctx['word'],
                'finalScore': ctx['finalScore'],
                'contextSentence': ctx['contextSentence'],
                'sentenceId': ctx['sentenceId'],
                'sentenceScore': ctx['sentenceScore'],
                'explanation': ctx['explanation'],
                'features': score_data['features'] if score_data else {}
            })
        
        # STAGE 4: Build Knowledge Graph
        document_id = f"doc_{timestamp}"
        kg_stats = knowledge_graph.build_from_vocabulary_contexts(
            vocabulary_contexts=vocabulary_contexts,
            document_id=document_id,
            document_title=file.filename,
            document_content=text[:1000]
        )
        
        knowledge_graph.save_graph()
        
        # STAGE 5: Generate Flashcards (sử dụng max_flashcards từ user)
        flashcards_result = rag_system.generate_flashcards(
            document_id=document_id,
            max_cards=min(max_flashcards, len(vocabulary_contexts))
        )
        
        # K-MEANS: Cluster vocabulary (if enough words)
        clustering_result = None
        if len(vocabulary_contexts) >= 5:
            try:
                clustering_result = cluster_vocabulary_kmeans(
                    vocabulary_list,
                    text,
                    use_elbow=True,
                    max_k=min(10, len(vocabulary_list) // 2),
                    document_id=document_id  # Pass document_id for unique plot filename
                )
                print(f"[Upload] K-Means clustering completed: {clustering_result['n_clusters']} clusters")
            except Exception as e:
                print(f"[Upload] K-Means clustering failed: {e}")
        
        return JSONResponse(content={
            'success': True,
            'document_id': document_id,
            'filename': file.filename,
            'file_size': len(text),
            'vocabulary': vocabulary_contexts,
            'vocabulary_count': len(vocabulary_contexts),
            'flashcards': flashcards_result.get('results', []),
            'flashcards_count': flashcards_result.get('count', 0),
            'stats': {
                'stage1': ensemble_result['stats'],
                'stage2': {
                    'totalContexts': len(contexts),
                    'avgSentenceScore': sum(c['sentenceScore'] for c in contexts) / len(contexts) if contexts else 0
                },
                'stage4': kg_stats
            },
            'adaptive_weights': adaptive_weights,
            'pipeline': 'File Upload → STAGE 1-5 Complete Pipeline',
            'kmeans_clustering': clustering_result  # K-Means results (if available)
        })
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"[Upload] Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== K-MEANS CLUSTERING + ELBOW METHOD ====================

@app.post("/api/kmeans-cluster")
async def kmeans_cluster_vocabulary(request: SmartVocabularyRequest):
    """
    K-Means Clustering với Elbow Method
    
    Cluster từ vựng thành nhóm dựa trên TF-IDF vectors
    """
    try:
        text = request.text
        max_words = request.max_words
        language = request.language
        
        print("[K-Means] Starting clustering pipeline...")
        
        # STAGE 1: Extract vocabulary
        adaptive_weights = feedback_loop.get_current_weights()
        ensemble_result = extract_vocabulary_ensemble(
            text,
            max_words=max_words,
            weights=adaptive_weights
        )
        
        vocabulary_list = [
            {'word': score['word'], 'score': score['score']}
            for score in ensemble_result['scores']
        ]
        
        # Generate unique document_id for this request
        document_id = f"kmeans_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        
        # K-MEANS: Cluster vocabulary
        clustering_result = cluster_vocabulary_kmeans(
            vocabulary_list,
            text,
            use_elbow=True,
            max_k=min(10, len(vocabulary_list) // 2),
            document_id=document_id  # Pass document_id for unique plot filename
        )
        
        return JSONResponse(content={
            'success': True,
            'document_id': document_id,
            'vocabulary_count': len(vocabulary_list),
            'clustering': clustering_result,
            'method': 'K-Means with Elbow Method + TF-IDF',
            'algorithms_used': {
                'tfidf': True,
                'bag_of_words': True,
                'kmeans': True,
                'elbow_method': True
            }
        })
        
    except Exception as e:
        print(f"[K-Means] Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== COMPLETE PIPELINE (STAGE 1-5) ====================

@app.post("/api/complete-pipeline")
async def complete_pipeline(request: SmartVocabularyRequest):
    """
    Complete Pipeline: STAGE 1 → 2 → 3 → 4 → 5
    
    Extract vocabulary, select contexts, apply feedback, build knowledge graph, generate flashcards
    """
    try:
        text = request.text
        max_words = request.max_words
        language = request.language
        
        print("[Complete Pipeline] Starting...")
        
        # STAGE 1: Ensemble Extraction (with adaptive weights)
        adaptive_weights = feedback_loop.get_current_weights()
        ensemble_result = extract_vocabulary_ensemble(
            text,
            max_words=max_words,
            weights=adaptive_weights
        )
        
        vocabulary_list = [
            {'word': score['word'], 'score': score['score']}
            for score in ensemble_result['scores']
        ]
        
        # STAGE 2: Context Selection
        contexts = select_vocabulary_contexts(text, vocabulary_list, language)
        
        # Prepare vocabulary contexts
        vocabulary_contexts = []
        for ctx in contexts:
            score_data = next(
                (s for s in ensemble_result['scores'] if s['word'] == ctx['word']),
                None
            )
            
            vocabulary_contexts.append({
                'word': ctx['word'],
                'finalScore': ctx['finalScore'],
                'contextSentence': ctx['contextSentence'],
                'sentenceId': ctx['sentenceId'],
                'sentenceScore': ctx['sentenceScore'],
                'explanation': ctx['explanation'],
                'features': score_data['features'] if score_data else {}
            })
        
        # STAGE 4: Build Knowledge Graph
        document_id = f"doc_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        kg_stats = knowledge_graph.build_from_vocabulary_contexts(
            vocabulary_contexts=vocabulary_contexts,
            document_id=document_id,
            document_title="Extracted Document",
            document_content=text[:500]
        )
        
        knowledge_graph.save_graph()
        
        # STAGE 5: Generate Flashcards (optional, first 5)
        flashcards_result = rag_system.generate_flashcards(
            document_id=document_id,
            max_cards=min(5, len(vocabulary_contexts))
        )
        
        return JSONResponse(content={
            'success': True,
            'document_id': document_id,
            'vocabulary': vocabulary_contexts,
            'count': len(vocabulary_contexts),
            'flashcards': flashcards_result.get('results', []),
            'flashcards_count': flashcards_result.get('count', 0),
            'pipeline_stats': {
                'stage1': ensemble_result['stats'],
                'stage2': {
                    'totalContexts': len(contexts),
                    'avgSentenceScore': sum(c['sentenceScore'] for c in contexts) / len(contexts) if contexts else 0
                },
                'stage4': kg_stats,
                'stage5': {
                    'flashcards_generated': flashcards_result.get('count', 0)
                }
            },
            'adaptive_weights': adaptive_weights,
            'pipeline': 'STAGE 1 (Ensemble) + STAGE 2 (Context) + STAGE 3 (Feedback) + STAGE 4 (Knowledge Graph) + STAGE 5 (RAG)'
        })
        
    except Exception as e:
        print(f"[Complete Pipeline] Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)


# ==================== STAGE 6: EMBEDDING & SEMANTIC SEARCH ====================

@app.post("/api/embedding/create")
async def create_document_embeddings(request: SemanticSearchRequest):
    """
    Tạo embeddings cho documents
    
    CHẠY SONG SONG với TF-IDF pipeline
    """
    try:
        if not EMBEDDING_AVAILABLE or embedder is None:
            raise HTTPException(
                status_code=503,
                detail="Embedding system not available. Install: pip install sentence-transformers"
            )
        
        documents = request.documents
        
        if not documents:
            raise HTTPException(status_code=400, detail="No documents provided")
        
        print(f"[Embedding] Creating embeddings for {len(documents)} documents...")
        
        # Create embeddings
        embeddings = embedder.encode_documents(documents, show_progress=False)
        
        return JSONResponse(content={
            'success': True,
            'n_documents': len(documents),
            'embedding_dim': int(embeddings.shape[1]),
            'embeddings': embeddings.tolist(),
            'model': embedder.model_name
        })
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"[Embedding] Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/embedding/search")
async def semantic_search_documents(request: SemanticSearchRequest):
    """
    Semantic search sử dụng embeddings
    
    Tìm kiếm documents dựa trên ngữ nghĩa, không cần keyword trùng khớp
    """
    try:
        if not EMBEDDING_AVAILABLE or embedder is None:
            raise HTTPException(
                status_code=503,
                detail="Embedding system not available"
            )
        
        query = request.query
        documents = request.documents
        top_k = request.top_k
        threshold = request.threshold
        
        if not query or not documents:
            raise HTTPException(status_code=400, detail="Query and documents required")
        
        print(f"[Semantic Search] Query: '{query}'")
        print(f"[Semantic Search] Searching {len(documents)} documents...")
        
        # Create embeddings
        query_embedding = embedder.encode_query(query)
        doc_embeddings = embedder.encode_documents(documents, show_progress=False)
        
        # Search
        results = semantic_search(
            query_embedding,
            doc_embeddings,
            documents,
            top_k=top_k,
            threshold=threshold
        )
        
        return JSONResponse(content={
            'success': True,
            'query': query,
            'results': results,
            'count': len(results),
            'method': 'Semantic Search with Sentence-BERT'
        })
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"[Semantic Search] Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/embedding/similarity")
async def find_similar_docs(request: DocumentSimilarityRequest):
    """
    Tìm documents tương tự với document cho trước
    
    Sử dụng cosine similarity trên embeddings
    """
    try:
        if not EMBEDDING_AVAILABLE or embedder is None:
            raise HTTPException(
                status_code=503,
                detail="Embedding system not available"
            )
        
        document_id = request.document_id
        documents = request.documents
        top_k = request.top_k
        
        if document_id < 0 or document_id >= len(documents):
            raise HTTPException(status_code=400, detail="Invalid document_id")
        
        print(f"[Similarity] Finding similar documents to document {document_id}...")
        
        # Create embeddings
        doc_embeddings = embedder.encode_documents(documents, show_progress=False)
        
        # Find similar
        results = find_similar_documents(
            document_id,
            doc_embeddings,
            documents,
            top_k=top_k,
            exclude_self=True
        )
        
        return JSONResponse(content={
            'success': True,
            'source_document_id': document_id,
            'source_document': documents[document_id],
            'similar_documents': results,
            'count': len(results),
            'method': 'Cosine Similarity on Embeddings'
        })
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"[Similarity] Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
