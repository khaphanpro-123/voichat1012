"""
ENHANCED PIPELINE - Tích hợp tất cả improvements

Improvements:
1. STAGE 2: Heading Detection
2. STAGE 5: BM25 Filtering
3. STAGE 7: Contrastive Learning (basic)
4. STAGE 9: LLM Validation (enhanced)

Pipeline:
Upload → Extract Text → Detect Headings → Extract Phrases → 
BM25 Filter → Semantic Embedding → Contrastive Signal → 
LLM Validation → Final Ranking → RAG
"""

from typing import List, Dict, Optional
from datetime import datetime

# Import existing modules
from ensemble_extractor import extract_vocabulary_ensemble
from context_intelligence import select_vocabulary_contexts, build_sentences
from knowledge_graph import KnowledgeGraph
from rag_system import RAGSystem
from kmeans_clustering import cluster_vocabulary_kmeans

# Import new modules
from heading_detector import HeadingDetector, get_heading_for_sentence
from bm25_filter import BM25Filter


class EnhancedPipeline:
    """
    Enhanced vocabulary extraction pipeline với tất cả improvements
    """
    
    def __init__(
        self,
        knowledge_graph: KnowledgeGraph,
        rag_system: RAGSystem
    ):
        self.kg = knowledge_graph
        self.rag = rag_system
        self.heading_detector = HeadingDetector()
    
    def process_document(
        self,
        text: str,
        document_id: str,
        document_title: str,
        max_words: int = 50,
        language: str = "en",
        use_bm25: bool = True,
        bm25_threshold: float = 0.5
    ) -> Dict:
        """
        Process document through enhanced pipeline
        
        Args:
            text: Document text
            document_id: Document ID
            document_title: Document title
            max_words: Maximum vocabulary words
            language: Language code
            use_bm25: Enable BM25 filtering
            bm25_threshold: BM25 threshold
        
        Returns:
            Complete processing results
        """
        print(f"\n{'='*80}")
        print(f"ENHANCED PIPELINE - Processing: {document_id}")
        print(f"{'='*80}\n")
        
        results = {
            'document_id': document_id,
            'document_title': document_title,
            'timestamp': datetime.now().isoformat(),
            'pipeline_version': '3.0.0-enhanced'
        }
        
        # ====================================================================
        # STAGE 1: Document Ingestion (existing)
        # ====================================================================
        print("[STAGE 1] Document Ingestion...")
        results['text_length'] = len(text)
        results['word_count'] = len(text.split())
        
        # ====================================================================
        # STAGE 2: Heading Detection (NEW)
        # ====================================================================
        print("[STAGE 2] Heading Detection...")
        
        # Build sentences first
        sentences_text = [s.text for s in build_sentences(text, language)]
        
        # Detect headings and structure
        doc_structure = self.heading_detector.parse_document_structure(
            text,
            sentences_text
        )
        
        results['headings'] = [
            {
                'heading_id': h.heading_id,
                'level': h.level.name,
                'text': h.text,
                'position': h.position
            }
            for h in doc_structure.headings
        ]
        
        results['heading_count'] = len(doc_structure.headings)
        
        print(f"  ✓ Detected {len(doc_structure.headings)} headings")
        
        # ====================================================================
        # STAGE 3: Text Preprocessing (existing)
        # ====================================================================
        print("[STAGE 3] Text Preprocessing...")
        # Already done in ensemble_extractor
        
        # ====================================================================
        # STAGE 4: Phrase Extraction (existing)
        # ====================================================================
        print("[STAGE 4] Phrase Extraction...")
        
        ensemble_result = extract_vocabulary_ensemble(
            text,
            max_words=max_words * 2,  # Extract more for filtering
            include_ngrams=True
        )
        
        vocabulary_list = [
            {'word': score['word'], 'score': score['score']}
            for score in ensemble_result['scores']
        ]
        
        print(f"  ✓ Extracted {len(vocabulary_list)} phrases")
        
        # ====================================================================
        # STAGE 2.5: Context Selection with Heading Info
        # ====================================================================
        print("[STAGE 2.5] Context Selection with Headings...")
        
        contexts = select_vocabulary_contexts(
            text,
            vocabulary_list,
            language=language
        )
        
        # Add heading information to contexts
        for ctx in contexts:
            sentence_id = ctx.get('sentenceId', '')
            heading = get_heading_for_sentence(sentence_id, doc_structure)
            
            if heading:
                ctx['heading_id'] = heading.heading_id
                ctx['heading_text'] = heading.text
                ctx['heading_level'] = heading.level.name
            else:
                ctx['heading_id'] = 'H0_0'
                ctx['heading_text'] = 'Unknown'
                ctx['heading_level'] = 'PARAGRAPH'
        
        print(f"  ✓ Selected {len(contexts)} contexts with heading info")
        
        # ====================================================================
        # STAGE 5: BM25 Filtering (NEW)
        # ====================================================================
        if use_bm25:
            print("[STAGE 5] BM25 Filtering...")
            
            # Prepare sentences and headings for BM25
            sentences_for_bm25 = sentences_text
            headings_for_bm25 = [h.text for h in doc_structure.headings]
            
            # Initialize BM25 filter
            bm25_filter = BM25Filter(sentences_for_bm25, headings_for_bm25)
            
            # Filter phrases
            contexts = bm25_filter.filter_phrases(
                contexts,
                sentence_threshold=bm25_threshold,
                heading_threshold=bm25_threshold * 0.6
            )
            
            # Re-rank with BM25
            contexts = bm25_filter.rerank_phrases(
                contexts,
                weight_bm25=0.3,
                weight_original=0.7
            )
            
            print(f"  ✓ BM25 filtered to {len(contexts)} phrases")
            
            results['bm25_enabled'] = True
            results['bm25_threshold'] = bm25_threshold
        else:
            results['bm25_enabled'] = False
        
        # Limit to max_words
        contexts = contexts[:max_words]
        
        # ====================================================================
        # STAGE 6: Semantic Embedding (existing, optional)
        # ====================================================================
        print("[STAGE 6] Semantic Embedding (optional)...")
        # Already available in document_embedding.py
        
        # ====================================================================
        # STAGE 7: Contrastive Learning Signal (NEW - Basic)
        # ====================================================================
        print("[STAGE 7] Contrastive Learning Signal...")
        
        # Add contrastive signal based on heading co-occurrence
        contexts = self._add_contrastive_signal(contexts, doc_structure)
        
        print(f"  ✓ Added contrastive signals")
        
        # ====================================================================
        # STAGE 8: Clustering (existing)
        # ====================================================================
        print("[STAGE 8] K-Means Clustering...")
        
        if len(contexts) >= 5:
            clustering_result = cluster_vocabulary_kmeans(
                vocabulary_list[:max_words],
                text,
                use_elbow=True,
                document_id=document_id
            )
            results['clustering'] = clustering_result
        else:
            results['clustering'] = None
        
        # ====================================================================
        # STAGE 9: LLM Validation (Enhanced)
        # ====================================================================
        print("[STAGE 9] LLM Validation...")
        
        # Add validation scores
        contexts = self._add_llm_validation_scores(contexts)
        
        print(f"  ✓ Added LLM validation scores")
        
        # ====================================================================
        # STAGE 10: Final Ranking (existing)
        # ====================================================================
        print("[STAGE 10] Final Ranking...")
        
        # Already sorted by finalScore
        results['vocabulary'] = contexts
        results['vocabulary_count'] = len(contexts)
        
        # ====================================================================
        # STAGE 11: Knowledge Graph & RAG (existing)
        # ====================================================================
        print("[STAGE 11] Knowledge Graph & RAG...")
        
        # Build knowledge graph
        kg_stats = self.kg.build_from_vocabulary_contexts(
            vocabulary_contexts=contexts,
            document_id=document_id,
            document_title=document_title,
            document_content=text[:1000]
        )
        
        self.kg.save_graph()
        
        # Generate flashcards
        flashcards_result = self.rag.generate_flashcards(
            document_id=document_id,
            max_cards=min(30, len(contexts))
        )
        
        results['flashcards'] = flashcards_result.get('results', [])
        results['flashcards_count'] = len(results['flashcards'])
        results['knowledge_graph_stats'] = kg_stats
        
        print(f"\n{'='*80}")
        print(f"PIPELINE COMPLETE")
        print(f"  Vocabulary: {results['vocabulary_count']} phrases")
        print(f"  Flashcards: {results['flashcards_count']} cards")
        print(f"  Headings: {results['heading_count']} detected")
        print(f"{'='*80}\n")
        
        return results
    
    def _add_contrastive_signal(
        self,
        contexts: List[Dict],
        doc_structure
    ) -> List[Dict]:
        """
        Add contrastive learning signal
        
        Positive: phrases in same heading
        Negative: phrases in different headings
        """
        # Group phrases by heading
        heading_groups = {}
        
        for ctx in contexts:
            heading_id = ctx.get('heading_id', 'H0_0')
            if heading_id not in heading_groups:
                heading_groups[heading_id] = []
            heading_groups[heading_id].append(ctx['word'])
        
        # Add contrastive signal
        for ctx in contexts:
            heading_id = ctx.get('heading_id', 'H0_0')
            
            # Positive examples (same heading)
            ctx['positive_examples'] = [
                w for w in heading_groups.get(heading_id, [])
                if w != ctx['word']
            ][:3]  # Top 3
            
            # Negative examples (different headings)
            negative = []
            for h_id, words in heading_groups.items():
                if h_id != heading_id:
                    negative.extend(words[:2])
            
            ctx['negative_examples'] = negative[:3]  # Top 3
            
            # Contrastive score boost
            if len(ctx['positive_examples']) > 0:
                ctx['finalScore'] *= 1.1  # 10% boost
        
        return contexts
    
    def _add_llm_validation_scores(
        self,
        contexts: List[Dict]
    ) -> List[Dict]:
        """
        Add LLM validation scores
        
        Criteria:
        - Groundedness: phrase có support trong sentence không
        - Learning value: phrase có đáng học không
        - Academic relevance: phrase có liên quan học thuật không
        """
        for ctx in contexts:
            # Simple heuristic validation (can be replaced with LLM)
            word = ctx['word']
            sentence = ctx.get('contextSentence', '').lower()
            
            # Groundedness: word appears in sentence
            groundedness = 1.0 if word.lower() in sentence else 0.0
            
            # Learning value: longer phrases = more valuable
            learning_value = min(len(word.split()) / 3.0, 1.0)
            
            # Academic relevance: has technical terms
            academic_keywords = ['learning', 'model', 'system', 'method', 'approach']
            academic_relevance = 1.0 if any(kw in word.lower() for kw in academic_keywords) else 0.5
            
            # Combined validation score
            validation_score = (
                0.5 * groundedness +
                0.3 * learning_value +
                0.2 * academic_relevance
            )
            
            ctx['validation_score'] = validation_score
            ctx['groundedness'] = groundedness
            ctx['learning_value'] = learning_value
            ctx['academic_relevance'] = academic_relevance
            
            # Penalize low validation scores
            if validation_score < 0.5:
                ctx['finalScore'] *= 0.8
        
        return contexts


# ============================================================================
# TESTING
# ============================================================================

if __name__ == "__main__":
    print("=" * 80)
    print("TESTING ENHANCED PIPELINE")
    print("=" * 80)
    
    test_text = """
# Introduction

Machine learning is a subset of artificial intelligence that enables computers to learn from data.

## Background

Deep learning uses neural networks with multiple layers to process complex patterns.

### Related Work

Natural language processing helps computers understand human language.

## Methodology

We propose a new approach using contrastive learning to improve representation quality.

# Results

The model achieves 95% accuracy on the test set, outperforming baseline methods.

## Discussion

Our results show significant improvements in semantic understanding and generalization.
"""
    
    # Initialize systems
    from knowledge_graph import KnowledgeGraph
    from rag_system import RAGSystem
    import os
    
    kg = KnowledgeGraph(storage_path="test_kg_enhanced")
    rag = RAGSystem(kg, llm_api_key=os.getenv("OPENAI_API_KEY"))
    
    # Initialize enhanced pipeline
    pipeline = EnhancedPipeline(kg, rag)
    
    # Process document
    result = pipeline.process_document(
        text=test_text,
        document_id="doc_test_enhanced",
        document_title="Test Document",
        max_words=20,
        use_bm25=True,
        bm25_threshold=0.5
    )
    
    print("\n📊 RESULTS:")
    print("-" * 80)
    print(f"Vocabulary: {result['vocabulary_count']} phrases")
    print(f"Headings: {result['heading_count']} detected")
    print(f"BM25 enabled: {result['bm25_enabled']}")
    
    print("\n📊 TOP PHRASES:")
    for i, vocab in enumerate(result['vocabulary'][:5], 1):
        print(f"\n{i}. {vocab['word']}")
        print(f"   Score: {vocab['finalScore']:.3f}")
        print(f"   Heading: {vocab.get('heading_text', 'Unknown')}")
        print(f"   BM25: {vocab.get('bm25_combined', 0):.3f}")
        print(f"   Validation: {vocab.get('validation_score', 0):.3f}")
    
    print("\n✅ Test completed!")
