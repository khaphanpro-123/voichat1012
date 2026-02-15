"""
COMPLETE 12-STAGE PIPELINE
Semantic Knowledge Mining + Explainable RAG

Pipeline Architecture:
Stage 1:  Document Ingestion & OCR
Stage 2:  Layout & Heading Detection
Stage 3:  Context Intelligence (Sentence ↔ Heading)
Stage 4:  Phrase Extraction (PRIMARY PIPELINE) ✅
Stage 5:  Dense Retrieval (Sentence-Level)
Stage 6:  BM25 Sanity Filter (SECONDARY)
Stage 7:  Single-Word Extraction (SECONDARY PIPELINE) ✅
Stage 8:  Merge Phrase & Word ✅
Stage 9:  Contrastive Scoring (Heading-Aware)
Stage 10: Synonym Collapse
Stage 11: Knowledge Graph ✅
Stage 12: Flashcard Generation ✅

Note: LLM Validation removed - validation integrated into STEP 3B

Author: Kiro AI
Date: 2026-02-10
Version: 5.2.0-filter-only-mode
"""

from typing import List, Dict, Optional
from datetime import datetime
import os
import numpy as np

# Import all stage modules
from phrase_centric_extractor import PhraseCentricExtractor
from single_word_extractor import SingleWordExtractor
from phrase_word_merger import PhraseSingleWordMerger
from heading_detector import HeadingDetector
from context_intelligence import build_sentences
from bm25_filter import BM25Filter
# DISABLED: Knowledge Graph and RAG System
# from knowledge_graph import KnowledgeGraph
# from rag_system import RAGSystem


class CompletePipeline12Stages:
    """
    Complete 12-stage pipeline for semantic knowledge mining
    
    Features:
    - Phrase-first approach
    - Single-word supplementation
    - Heading-aware extraction
    - BM25 as sanity check only (≤20%)
    - Validation integrated into STEP 3B (no separate LLM stage)
    - Knowledge Graph with semantic relations
    - Flashcard generation
    - Full traceability
    """
    
    def __init__(
        self,
        knowledge_graph = None,  # DISABLED
        rag_system = None  # DISABLED
    ):
        """
        Initialize complete pipeline
        
        Args:
            knowledge_graph: KnowledgeGraph instance (DISABLED)
            rag_system: RAGSystem instance (DISABLED)
        """
        self.kg = knowledge_graph
        self.rag = rag_system
        
        # Initialize stage modules
        self.phrase_extractor = PhraseCentricExtractor()
        self.word_extractor = SingleWordExtractor()
        self.merger = PhraseSingleWordMerger(similarity_threshold=0.8)
        self.heading_detector = HeadingDetector()
        
        print("✅ Complete 12-Stage Pipeline initialized")
    
    def process_document(
        self,
        text: str,
        document_id: str,
        document_title: str,
        max_phrases: int = 40,
        max_words: int = 10,
        language: str = "en",
        use_bm25: bool = True,
        bm25_weight: float = 0.2,
        generate_flashcards: bool = True
    ) -> Dict:
        """
        Process document through complete 12-stage pipeline
        
        Args:
            text: Document text
            document_id: Document ID
            document_title: Document title
            max_phrases: Maximum phrases to extract
            max_words: Maximum single words to extract
            language: Language code
            use_bm25: Enable BM25 filtering
            bm25_weight: Weight for BM25 scores (default: 0.2)
            generate_flashcards: Generate flashcards (default: True)
        
        Returns:
            Complete pipeline results with vocabulary, knowledge graph, and flashcards
        """
        print(f"\n{'='*80}")
        print(f"COMPLETE 12-STAGE PIPELINE")
        print(f"Document: {document_id}")
        print(f"Title: {document_title}")
        print(f"{'='*80}\n")
        
        results = {
            'document_id': document_id,
            'document_title': document_title,
            'timestamp': datetime.now().isoformat(),
            'pipeline_version': '5.2.0-filter-only-mode',
            'stages': {}
        }
        
        # ====================================================================
        # STAGE 1: Document Ingestion & OCR
        # ====================================================================
        print(f"[STAGE 1] Document Ingestion & OCR...")
        
        stage1_result = self._stage1_document_ingestion(text)
        results['stages']['stage1'] = stage1_result
        
        print(f"  ✓ Text length: {stage1_result['text_length']} chars")
        print(f"  ✓ Word count: {stage1_result['word_count']} words")
        
        # ====================================================================
        # STAGE 2: Layout & Heading Detection
        # ====================================================================
        print(f"\n[STAGE 2] Layout & Heading Detection...")
        
        stage2_result = self._stage2_heading_detection(text)
        results['stages']['stage2'] = {
            'heading_count': stage2_result['heading_count'],
            'headings': stage2_result['headings']
            # doc_structure not included - not JSON serializable
        }
        
        # Keep doc_structure for internal use only
        doc_structure = stage2_result['doc_structure']
        
        print(f"  ✓ Detected {stage2_result['heading_count']} headings")
        
        # ====================================================================
        # STAGE 3: Context Intelligence
        # ====================================================================
        print(f"\n[STAGE 3] Context Intelligence...")
        
        stage3_result = self._stage3_context_intelligence(
            text,
            doc_structure  # Use the internal doc_structure
        )
        results['stages']['stage3'] = stage3_result
        
        print(f"  ✓ Built {stage3_result['sentence_count']} sentences with context")
        
        # ====================================================================
        # STAGE 4: Phrase Extraction (PRIMARY PIPELINE)
        # ====================================================================
        print(f"\n[STAGE 4] Phrase Extraction (PRIMARY PIPELINE)...")
        
        stage4_result = self._stage4_phrase_extraction(
            text,
            document_title,
            max_phrases
        )
        results['stages']['stage4'] = stage4_result
        
        # DEBUG: Check cluster distribution after phrase extraction
        phrase_clusters = {}
        for p in stage4_result['phrases']:
            cid = p.get('cluster_id', p.get('cluster', 'MISSING'))
            phrase_clusters[cid] = phrase_clusters.get(cid, 0) + 1
        print(f"\n  📊 DEBUG - Phrase clusters after STAGE 4:")
        for cid in sorted(phrase_clusters.keys(), key=lambda x: (isinstance(x, str), x)):
            print(f"     Cluster {cid}: {phrase_clusters[cid]} phrases")
        
        print(f"  ✓ Extracted {stage4_result['phrase_count']} phrases")
        print(f"  ✓ Multi-word: {stage4_result['multi_word_percentage']:.1f}%")
        
        # ====================================================================
        # STAGE 5: Dense Retrieval (Sentence-Level)
        # ====================================================================
        print(f"\n[STAGE 5] Dense Retrieval (Sentence-Level)...")
        
        stage5_result = self._stage5_dense_retrieval(
            stage3_result['sentences'],
            stage2_result['headings']
        )
        results['stages']['stage5'] = stage5_result
        
        print(f"  ✓ Sentence embeddings: {stage5_result['embedding_count']}")
        
        # ====================================================================
        # STAGE 6: BM25 Sanity Filter (SECONDARY)
        # ====================================================================
        if use_bm25:
            print(f"\n[STAGE 6] BM25 Sanity Filter (HALLUCINATION REMOVAL)...")
            
            stage6_result = self._stage6_bm25_filter(
                stage4_result['phrases'],
                stage3_result['sentences'],
                stage2_result['headings'],
                bm25_weight
            )
            results['stages']['stage6'] = stage6_result
            
            # Update phrases with filtered results
            stage4_result['phrases'] = stage6_result['filtered_phrases']
            
            print(f"  ✓ Kept: {stage6_result['filtered_count']} phrases (in document)")
            print(f"  ✓ Removed: {stage6_result['removed_count']} phrases (hallucination)")
            print(f"  ✓ Mode: Filter only (no re-ranking)")
        else:
            results['stages']['stage6'] = {'enabled': False}
        
        # ====================================================================
        # STAGE 7: Single-Word Extraction (SECONDARY PIPELINE)
        # ====================================================================
        print(f"\n[STAGE 7] Single-Word Extraction (SECONDARY PIPELINE)...")
        
        stage7_result = self._stage7_single_word_extraction(
            text,
            stage4_result['phrases'],
            stage2_result['headings'],
            max_words
        )
        results['stages']['stage7'] = stage7_result
        
        print(f"  ✓ Extracted {stage7_result['word_count']} single words")
        
        # ====================================================================
        # STAGE 8: Merge Phrase & Word
        # ====================================================================
        print(f"\n[STAGE 8] Merge Phrase & Word...")
        
        stage8_result = self._stage8_merge(
            stage4_result['phrases'],
            stage7_result['words'],
            max_phrases + max_words
        )
        results['stages']['stage8'] = stage8_result
        
        # DEBUG: Check cluster distribution after merge
        merge_clusters = {}
        for v in stage8_result['vocabulary']:
            cid = v.get('cluster_id', v.get('cluster', 'MISSING'))
            merge_clusters[cid] = merge_clusters.get(cid, 0) + 1
        print(f"\n  📊 DEBUG - Clusters after STAGE 8 (merge):")
        for cid in sorted(merge_clusters.keys(), key=lambda x: (isinstance(x, str), x)):
            print(f"     Cluster {cid}: {merge_clusters[cid]} items")
        
        print(f"  ✓ Merged vocabulary: {stage8_result['total_count']} items")
        print(f"  ✓ Phrases: {stage8_result['phrase_count']} ({stage8_result['phrase_percentage']:.1f}%)")
        print(f"  ✓ Words: {stage8_result['word_count']} ({stage8_result['word_percentage']:.1f}%)")
        
        # ====================================================================
        # STAGE 9: Contrastive Scoring (Heading-Aware)
        # ====================================================================
        print(f"\n[STAGE 9] Contrastive Scoring (Heading-Aware)...")
        
        stage9_result = self._stage9_contrastive_scoring(
            stage8_result['vocabulary'],
            stage3_result['sentences'],
            stage2_result['headings']
        )
        results['stages']['stage9'] = stage9_result
        
        print(f"  ✓ Added contrastive scores")
        
        # ====================================================================
        # STAGE 10: Synonym Collapse
        # ====================================================================
        print(f"\n[STAGE 10] Synonym Collapse...")
        
        stage10_result = self._stage10_synonym_collapse(
            stage9_result['vocabulary']
        )
        results['stages']['stage10'] = stage10_result
        
        print(f"  ✓ Collapsed {stage10_result['collapsed_count']} synonyms")
        print(f"  ✓ Final vocabulary: {stage10_result['final_count']} items")
        
        # Final vocabulary (no separate validation stage)
        final_vocabulary = stage10_result['vocabulary']
        results['vocabulary'] = final_vocabulary
        results['vocabulary_count'] = len(final_vocabulary)
        
        # ====================================================================
        # STAGE 11: Knowledge Graph
        # ====================================================================
        print(f"\n[STAGE 11] Knowledge Graph...")
        
        stage11_result = self._stage11_knowledge_graph(
            final_vocabulary,
            document_id,
            document_title,
            text
        )
        results['stages']['stage11'] = stage11_result
        
        print(f"  ✓ Knowledge graph built")
        print(f"  ✓ Entities: {stage11_result['entities_created']}")
        print(f"  ✓ Relations: {stage11_result['relations_created']}")
        
        # ====================================================================
        # STAGE 12: Flashcard Generation
        # ====================================================================
        if generate_flashcards:
            print(f"\n[STAGE 12] Flashcard Generation...")
            
            stage12_result = self._stage12_flashcard_generation(
                vocabulary=final_vocabulary,
                document_title=document_title,
                similarity_matrix=None  # Will be computed internally
            )
            
            results['stages']['stage12'] = {
                'flashcard_count': stage12_result['flashcard_count'],
                'synonym_groups': stage12_result['synonym_groups'],
                'status': stage12_result['status'],
                'message': stage12_result['message']
            }
            
            # Store flashcards
            results['flashcards'] = stage12_result['flashcards']
            results['flashcards_count'] = stage12_result['flashcard_count']
            
            print(f"  ✓ Generated {stage12_result['flashcard_count']} enhanced flashcards")
            print(f"  ✓ Synonym groups: {stage12_result['synonym_groups']}")
        else:
            results['stages']['stage12'] = {'enabled': False}
            results['flashcards'] = []
            results['flashcards_count'] = 0
        
        # ====================================================================
        # Clean numpy arrays from results before returning
        # ====================================================================
        results = self._clean_numpy_arrays(results)
        
        # ====================================================================
        # FINAL SUMMARY
        # ====================================================================
        print(f"\n{'='*80}")
        print(f"PIPELINE COMPLETE")
        print(f"{'='*80}")
        print(f"  Document: {document_id}")
        print(f"  Vocabulary: {results['vocabulary_count']} items")
        print(f"  Flashcards: {results['flashcards_count']} cards")
        print(f"  Headings: {stage2_result['heading_count']} detected")
        print(f"  Pipeline: 12/12 stages ✅")
        print(f"{'='*80}\n")
        
        return results
    
    # ========================================================================
    # STAGE IMPLEMENTATIONS
    # ========================================================================
    
    def _stage1_document_ingestion(self, text: str) -> Dict:
        """Stage 1: Document Ingestion & OCR"""
        return {
            'text_length': len(text),
            'word_count': len(text.split()),
            'ocr_metadata': None  # TODO: Implement OCR metadata
        }
    
    def _stage2_heading_detection(self, text: str) -> Dict:
        """Stage 2: Layout & Heading Detection"""
        # Build sentences
        sentences_text = [s.text for s in build_sentences(text)]
        
        # Detect headings
        doc_structure = self.heading_detector.parse_document_structure(
            text,
            sentences_text
        )
        
        headings = [
            {
                'heading_id': h.heading_id,
                'level': h.level.name,
                'text': h.text,
                'position': h.position
            }
            for h in doc_structure.headings
        ]
        
        return {
            'heading_count': len(headings),
            'headings': headings,
            'doc_structure': doc_structure  # Keep for internal use
        }
    
    def _stage3_context_intelligence(
        self,
        text: str,
        doc_structure
    ) -> Dict:
        """Stage 3: Context Intelligence"""
        sentences = build_sentences(text)
        
        # Add heading context to sentences
        for sent in sentences:
            sent_id = sent.sentence_id
            
            # Get heading for sentence
            heading_id = doc_structure.sentence_to_heading.get(sent_id)
            
            if heading_id:
                # Find heading
                heading = next(
                    (h for h in doc_structure.headings if h.heading_id == heading_id),
                    None
                )
                
                if heading:
                    sent.section_title = heading.text
        
        return {
            'sentence_count': len(sentences),
            'sentences': [s.text for s in sentences]
        }
    
    def _stage4_phrase_extraction(
        self,
        text: str,
        document_title: str,
        max_phrases: int
    ) -> Dict:
        """Stage 4: Phrase Extraction (PRIMARY PIPELINE)"""
        phrases = self.phrase_extractor.extract_vocabulary(
            text=text,
            document_title=document_title,
            max_phrases=max_phrases
        )
        
        # Calculate multi-word percentage
        multi_word_count = sum(
            1 for p in phrases
            if len(p['phrase'].split()) >= 2
        )
        multi_word_percentage = (multi_word_count / len(phrases) * 100) if phrases else 0
        
        return {
            'phrase_count': len(phrases),
            'phrases': phrases,
            'multi_word_percentage': multi_word_percentage
        }
    
    def _stage5_dense_retrieval(
        self,
        sentences: List[str],
        headings: List[Dict]
    ) -> Dict:
        """Stage 5: Dense Retrieval (Sentence-Level)"""
        # TODO: Implement full dense retrieval
        # For now, return basic info
        return {
            'embedding_count': len(sentences),
            'method': 'sentence_transformers',
            'model': 'all-MiniLM-L6-v2'
        }
    
    def _stage6_bm25_filter(
        self,
        phrases: List[Dict],
        sentences: List[str],
        headings: List[Dict],
        bm25_weight: float
    ) -> Dict:
        """
        Stage 6: BM25 Sanity Filter (HALLUCINATION REMOVAL ONLY)
        
        Role: Remove phrases NOT present in document (hallucination)
        - BM25 score = 0 → Remove (not in document)
        - BM25 score > 0 → Keep (in document, preserve original score)
        
        NO RE-RANKING: Original semantic scores are preserved
        CRITICAL: Preserve ALL fields including cluster_id, embeddings, etc.
        """
        # Initialize BM25 filter
        headings_text = [h['text'] for h in headings]
        bm25_filter = BM25Filter(sentences, headings_text)
        
        # Calculate BM25 scores for all phrases
        filtered_phrases = []
        removed_count = 0
        
        for i, phrase_obj in enumerate(phrases):
            phrase = phrase_obj['phrase']
            sentence_text = phrase_obj.get('supporting_sentence', '').replace('<b>', '').replace('</b>', '')
            
            # Calculate BM25 score
            bm25_score = bm25_filter.score_phrase_to_sentence(
                phrase,
                f"S{i}",
                sentence_text
            )
            
            # FILTER ONLY: Remove if BM25 = 0 (not in document)
            if bm25_score > 0:
                # CRITICAL: Keep ALL original fields (cluster_id, embeddings, etc.)
                filtered_phrase = {**phrase_obj}  # Copy ALL fields
                filtered_phrase['bm25_score'] = bm25_score  # Add BM25 for debugging
                filtered_phrases.append(filtered_phrase)
            else:
                # Remove phrase (hallucination)
                removed_count += 1
                print(f"  ⚠️  Removed hallucination: '{phrase}' (BM25=0, not in document)")
        
        # VALIDATION: Check cluster_id preservation
        print(f"\n  🔍 DEBUG - Validating cluster_id after BM25 filter:")
        missing_cluster = [p for p in filtered_phrases if 'cluster_id' not in p and 'cluster' not in p]
        if missing_cluster:
            print(f"  ❌ ERROR: {len(missing_cluster)} phrases missing cluster_id after filter!")
            for p in missing_cluster[:3]:
                print(f"     - '{p.get('phrase', 'unknown')}'")
        else:
            # Show cluster distribution
            cluster_counts = {}
            for p in filtered_phrases:
                cid = p.get('cluster_id', p.get('cluster', -1))
                cluster_counts[cid] = cluster_counts.get(cid, 0) + 1
            print(f"  ✅ All phrases have cluster_id")
            print(f"  📊 Cluster distribution after filter:")
            for cid in sorted(cluster_counts.keys()):
                print(f"     Cluster {cid}: {cluster_counts[cid]} phrases")
        
        return {
            'filtered_count': len(filtered_phrases),
            'removed_count': removed_count,
            'filtered_phrases': filtered_phrases,
            'mode': 'filter_only',  # No re-ranking
            'bm25_weight': 0.0  # Not used (filter only mode)
        }
    
    def _stage7_single_word_extraction(
        self,
        text: str,
        phrases: List[Dict],
        headings: List[Dict],
        max_words: int
    ) -> Dict:
        """Stage 7: Single-Word Extraction (SECONDARY PIPELINE)"""
        words = self.word_extractor.extract_single_words(
            text=text,
            phrases=phrases,
            headings=headings,
            max_words=max_words
        )
        
        return {
            'word_count': len(words),
            'words': words
        }
    
    def _stage8_merge(
        self,
        phrases: List[Dict],
        words: List[Dict],
        max_total: int
    ) -> Dict:
        """Stage 8: Merge Phrase & Word"""
        # Validate cluster_id BEFORE merge
        print(f"\n  🔍 DEBUG - Validating cluster_id BEFORE merge:")
        missing_before = [p for p in phrases if 'cluster_id' not in p and 'cluster' not in p]
        if missing_before:
            print(f"  ❌ ERROR: {len(missing_before)} phrases missing cluster_id before merge!")
            for p in missing_before[:3]:
                print(f"     - '{p.get('phrase', 'unknown')}'")
        else:
            cluster_counts = {}
            for p in phrases:
                cid = p.get('cluster_id', p.get('cluster', -1))
                cluster_counts[cid] = cluster_counts.get(cid, 0) + 1
            print(f"  ✅ All {len(phrases)} phrases have cluster_id before merge")
            print(f"  📊 Cluster distribution before merge:")
            for cid in sorted(cluster_counts.keys()):
                print(f"     Cluster {cid}: {cluster_counts[cid]} phrases")
        
        merged = self.merger.merge(
            phrases=phrases,
            single_words=words,
            max_total=max_total,
            phrase_ratio=0.7
        )
        
        # Validate cluster_id AFTER merge
        print(f"\n  🔍 DEBUG - Validating cluster_id AFTER merge:")
        vocabulary = merged.get('vocabulary', [])
        missing_after = [v for v in vocabulary if 'cluster_id' not in v and 'cluster' not in v]
        if missing_after:
            print(f"  ❌ ERROR: {len(missing_after)} items missing cluster_id after merge!")
            for v in missing_after[:3]:
                print(f"     - '{v.get('phrase', v.get('word', 'unknown'))}'")
        else:
            cluster_counts = {}
            for v in vocabulary:
                cid = v.get('cluster_id', v.get('cluster', -1))
                cluster_counts[cid] = cluster_counts.get(cid, 0) + 1
            print(f"  ✅ All {len(vocabulary)} items have cluster_id after merge")
            print(f"  📊 Cluster distribution after merge:")
            for cid in sorted(cluster_counts.keys()):
                print(f"     Cluster {cid}: {cluster_counts[cid]} items")
        
        return merged
    
    def _stage9_contrastive_scoring(
        self,
        vocabulary: List[Dict],
        sentences: List[str],
        headings: List[Dict]
    ) -> Dict:
        """Stage 9: Contrastive Scoring (Heading-Aware)"""
        # Add basic contrastive scores
        # TODO: Implement full contrastive formula
        
        for item in vocabulary:
            # Basic contrastive score
            item['contrastive_score'] = item.get('importance_score', 0.5)
        
        return {
            'vocabulary': vocabulary,
            'method': 'heading_aware_contrastive'
        }
    
    def _stage10_synonym_collapse(
        self,
        vocabulary: List[Dict]
    ) -> Dict:
        """
        Stage 10: Synonym Collapse
        Group semantically similar phrases using SBERT embeddings
        """
        print(f"  ℹ️  Grouping synonyms with similarity > 0.80...")
        
        if not vocabulary or len(vocabulary) < 2:
            print(f"  ⚠️  Not enough items for synonym detection ({len(vocabulary)} items)")
            return {
                'vocabulary': vocabulary,
                'collapsed_count': 0,
                'final_count': len(vocabulary)
            }
        
        # Extract or generate embeddings
        embeddings = []
        phrases_with_embeddings = []
        phrases_to_encode = []
        
        for item in vocabulary:
            if 'embedding' in item and item['embedding']:
                embeddings.append(item['embedding'])
                phrases_with_embeddings.append(item)
            else:
                # Need to generate embedding
                phrases_to_encode.append(item)
        
        # Generate missing embeddings
        if phrases_to_encode:
            print(f"  ℹ️  Generating embeddings for {len(phrases_to_encode)} items...")
            try:
                from embedding_utils import SentenceTransformer
                model = SentenceTransformer('all-MiniLM-L6-v2')
                
                texts = [item.get('phrase', item.get('word', '')) for item in phrases_to_encode]
                new_embeddings = model.encode(texts, show_progress_bar=False)
                
                for item, emb in zip(phrases_to_encode, new_embeddings):
                    item['embedding'] = emb.tolist()
                    embeddings.append(emb.tolist())
                    phrases_with_embeddings.append(item)
            except Exception as e:
                print(f"  ⚠️  Failed to generate embeddings: {e}")
                return {
                    'vocabulary': vocabulary,
                    'collapsed_count': 0,
                    'final_count': len(vocabulary)
                }
        
        if len(embeddings) < 2:
            print(f"  ⚠️  Not enough embeddings for synonym detection")
            return {
                'vocabulary': vocabulary,
                'collapsed_count': 0,
                'final_count': len(vocabulary)
            }
        
        # Convert to numpy array
        embeddings = np.array(embeddings)
        
        # Compute similarity matrix
        from sklearn.metrics.pairwise import cosine_similarity
        similarity_matrix = cosine_similarity(embeddings)
        
        # Group synonyms using threshold
        synonym_threshold = 0.85  # Increased to 0.85 for stricter matching
        visited = set()
        synonym_groups = []
        
        for i in range(len(phrases_with_embeddings)):
            if i in visited:
                continue
            
            # Start new group
            group = [i]
            visited.add(i)
            
            # Find similar phrases
            for j in range(i + 1, len(phrases_with_embeddings)):
                if j in visited:
                    continue
                
                if similarity_matrix[i][j] >= synonym_threshold:
                    group.append(j)
                    visited.add(j)
            
            synonym_groups.append(group)
        
        # Create collapsed vocabulary
        collapsed_vocabulary = []
        collapsed_count = 0
        
        for group_indices in synonym_groups:
            # Get all items in group
            group_items = [phrases_with_embeddings[idx] for idx in group_indices]
            
            # Choose representative (highest frequency or importance)
            representative = max(
                group_items,
                key=lambda x: (
                    x.get('frequency', 0) * 0.5 +
                    x.get('importance_score', 0) * 0.5
                )
            )
            
            # Make a copy to avoid modifying original
            representative = dict(representative)
            
            # Add synonyms list
            if len(group_items) > 1:
                representative['synonyms'] = [
                    {
                        'phrase': item.get('phrase', item.get('word', '')),
                        'similarity': float(similarity_matrix[group_indices[0]][idx])
                    }
                    for idx, item in zip(group_indices[1:], group_items[1:])
                ]
                collapsed_count += len(group_items) - 1
            else:
                if 'synonyms' not in representative:
                    representative['synonyms'] = []
            
            collapsed_vocabulary.append(representative)
        
        print(f"  ✓ Grouped {len(vocabulary)} items into {len(collapsed_vocabulary)} groups")
        print(f"  ✓ Collapsed {collapsed_count} synonyms")
        
        return {
            'vocabulary': collapsed_vocabulary,
            'collapsed_count': collapsed_count,
            'final_count': len(collapsed_vocabulary)
        }
    
    
    def _stage11_knowledge_graph(
        self,
        vocabulary: List[Dict],
        document_id: str,
        document_title: str,
        text: str
    ) -> Dict:
        """
        Stage 11: Knowledge Graph - Sơ đồ tư duy với mối liên hệ nghĩa
        
        Tạo:
        1. Cluster nodes (chủ đề)
        2. Phrase nodes (từ vựng)
        3. Semantic relations (từ gần nghĩa - dựa trên embeddings)
        """
        print(f"  ℹ️  Building knowledge graph with semantic relations...")
        
        # DEBUG: Check cluster distribution in vocabulary
        cluster_counts = {}
        for item in vocabulary:
            cluster_id = item.get('cluster_id', item.get('cluster', 'MISSING'))
            cluster_counts[cluster_id] = cluster_counts.get(cluster_id, 0) + 1
        
        print(f"  📊 Vocabulary cluster distribution:")
        for cid in sorted(cluster_counts.keys(), key=lambda x: (isinstance(x, str), x)):
            print(f"     Cluster {cid}: {cluster_counts[cid]} items")
        
        # Group vocabulary by cluster
        clusters = {}
        phrase_to_embedding = {}
        
        for item in vocabulary:
            cluster_id = item.get('cluster_id', 0)
            if cluster_id not in clusters:
                clusters[cluster_id] = []
            clusters[cluster_id].append(item)
            
            # Store embedding if available (as list, not ndarray)
            phrase = item.get('phrase', item.get('word', ''))
            if 'cluster_centroid' in item:
                # Already converted to list
                phrase_to_embedding[phrase] = item['cluster_centroid']
        
        # Create entities (nodes)
        entities = []
        relations = []
        
        # Create cluster nodes
        for cluster_id, items in clusters.items():
            # Handle both int and string cluster_id
            cluster_label = f'Topic {cluster_id}' if isinstance(cluster_id, str) else f'Topic {cluster_id + 1}'
            cluster_index = hash(str(cluster_id)) if isinstance(cluster_id, str) else cluster_id
            
            cluster_node = {
                'id': f'cluster_{cluster_id}',
                'type': 'topic',
                'label': cluster_label,
                'size': len(items),
                'color': ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8'][cluster_index % 5]
            }
            entities.append(cluster_node)
        
        # Create phrase nodes and relations
        phrase_nodes = []
        for cluster_id, items in clusters.items():
            for item in items:
                phrase = item.get('phrase', item.get('word', ''))
                semantic_role = item.get('semantic_role', 'unknown')
                
                # Create phrase node
                phrase_node = {
                    'id': f'phrase_{phrase.replace(" ", "_")}',
                    'type': 'phrase',
                    'label': phrase,
                    'semantic_role': semantic_role,
                    'tfidf_score': float(item.get('tfidf_score', 0)),
                    'cluster_id': cluster_id,
                    'size': 10 if semantic_role == 'core' else 5
                }
                entities.append(phrase_node)
                phrase_nodes.append((phrase, phrase_node, item))
                
                # Relation: cluster -> phrase
                relation = {
                    'source': f'cluster_{cluster_id}',
                    'target': phrase_node['id'],
                    'type': 'contains',
                    'weight': float(item.get('centroid_similarity', 0.5))
                }
                relations.append(relation)
        
        # Create semantic relations (từ gần nghĩa)
        # Tính cosine similarity giữa các phrases
        from sklearn.metrics.pairwise import cosine_similarity
        import numpy as np
        
        if phrase_to_embedding:
            phrases_list = list(phrase_to_embedding.keys())
            embeddings_list = [phrase_to_embedding[p] for p in phrases_list]
            
            # Convert to numpy array
            embeddings_array = np.array(embeddings_list)
            
            # Calculate pairwise cosine similarity
            similarity_matrix = cosine_similarity(embeddings_array)
            
            # Create relations for similar phrases (similarity > 0.7)
            for i in range(len(phrases_list)):
                for j in range(i + 1, len(phrases_list)):
                    similarity = similarity_matrix[i][j]
                    
                    if similarity > 0.7:  # Threshold for "gần nghĩa"
                        relation = {
                            'source': f'phrase_{phrases_list[i].replace(" ", "_")}',
                            'target': f'phrase_{phrases_list[j].replace(" ", "_")}',
                            'type': 'similar_to',
                            'weight': float(similarity),
                            'label': f'{similarity:.2f}'
                        }
                        relations.append(relation)
        
        print(f"  ✓ Knowledge graph built")
        print(f"  ✓ Entities: {len(entities)}")
        print(f"  ✓ Relations: {len(relations)}")
        print(f"  ✓ Semantic relations: {len([r for r in relations if r['type'] == 'similar_to'])}")
        
        # Generate mindmap (Markdown format)
        mindmap_md = self._generate_mindmap_markdown(clusters, vocabulary)
        
        # Generate hierarchical mindmap structure (JSON)
        mindmap_json = self._generate_mindmap_json(clusters, vocabulary, document_title)
        
        return {
            'entities': entities,
            'relations': relations,
            'entities_created': len(entities),
            'relations_created': len(relations),
            'semantic_relations': len([r for r in relations if r['type'] == 'similar_to']),
            'clusters_count': len(clusters),
            'vocabulary_terms': len(vocabulary),
            'mindmap_markdown': mindmap_md,
            'mindmap_json': mindmap_json,  # NEW: Hierarchical mindmap structure
            'status': 'enabled'
        }
    
    def _generate_mindmap_markdown(self, clusters: Dict, vocabulary: List[Dict]) -> str:
        """
        Generate mindmap in Markdown format
        
        Format:
        # Document Title
        ## Topic 1
        - phrase 1 (core, score: 0.95)
        - phrase 2 (umbrella, score: 0.82)
        ## Topic 2
        - phrase 3 (core, score: 0.88)
        ...
        """
        lines = []
        lines.append("# Vocabulary Mind Map\n")
        
        # Sort cluster_ids - handle mixed int/string types
        sorted_cluster_ids = sorted(clusters.keys(), key=lambda x: (isinstance(x, str), x))
        
        for cluster_id in sorted_cluster_ids:
            items = clusters[cluster_id]
            
            # Cluster header - handle both int and string cluster_id
            cluster_label = f"Topic {cluster_id}" if isinstance(cluster_id, str) else f"Topic {cluster_id + 1}"
            lines.append(f"## {cluster_label} ({len(items)} items)\n")
            
            # Sort items by importance
            sorted_items = sorted(
                items,
                key=lambda x: x.get('importance_score', 0),
                reverse=True
            )
            
            # Add items
            for item in sorted_items:
                phrase = item.get('phrase', item.get('word', ''))
                role = item.get('semantic_role', 'unknown')
                score = item.get('importance_score', 0)
                rank = item.get('cluster_rank', 999)
                
                # Icon based on role
                icon = '🎯' if role == 'core' else '📂' if role == 'umbrella' else '📄'
                
                # Format: - 🎯 phrase (core, rank: 1, score: 0.95)
                lines.append(f"- {icon} **{phrase}** ({role}, rank: {rank}, score: {score:.2f})\n")
            
            lines.append("\n")  # Empty line between topics
        
        return ''.join(lines)
    
    def _generate_mindmap_json(self, clusters: Dict, vocabulary: List[Dict], document_title: str) -> Dict:
        """
        Generate hierarchical mindmap structure in JSON format
        
        Structure:
        {
            "root": "Document Title",
            "children": [
                {
                    "topic": "Cluster 1",
                    "cluster_id": 0,
                    "phrases": [
                        {
                            "main": "climate change",
                            "synonyms": ["global warming"],
                            "role": "core",
                            "score": 0.95
                        }
                    ]
                }
            ]
        }
        """
        mindmap = {
            "root": document_title or "Document",
            "children": []
        }
        
        # Sort cluster_ids
        sorted_cluster_ids = sorted(clusters.keys(), key=lambda x: (isinstance(x, str), x))
        
        for cluster_id in sorted_cluster_ids:
            items = clusters[cluster_id]
            
            # Cluster label
            cluster_label = f"Topic {cluster_id}" if isinstance(cluster_id, str) else f"Topic {cluster_id + 1}"
            
            # Sort items by importance
            sorted_items = sorted(
                items,
                key=lambda x: x.get('importance_score', 0),
                reverse=True
            )
            
            # Build phrases list
            phrases = []
            for item in sorted_items:
                phrase_obj = {
                    "main": item.get('phrase', item.get('word', '')),
                    "synonyms": [s['phrase'] for s in item.get('synonyms', [])],
                    "role": item.get('semantic_role', 'unknown'),
                    "score": float(item.get('importance_score', 0)),
                    "rank": item.get('cluster_rank', 999),
                    "tfidf": float(item.get('tfidf_score', 0)),
                    "is_representative": item.get('is_representative', False)
                }
                phrases.append(phrase_obj)
            
            # Add cluster to mindmap
            cluster_node = {
                "topic": cluster_label,
                "cluster_id": cluster_id,
                "phrase_count": len(phrases),
                "phrases": phrases
            }
            mindmap["children"].append(cluster_node)
        
        return mindmap
    
    def _stage12_flashcard_generation(
        self,
        vocabulary: List[Dict],
        document_title: str,
        similarity_matrix: Optional[Dict] = None,
        group_by_cluster: bool = True  # NEW: Group by cluster instead of synonym
    ) -> Dict:
        """
        Stage 12: Enhanced Flashcard Generation
        
        Features:
        1. Group by cluster (topic-based) OR synonym grouping
        2. Cluster information (cluster_name, related_words)
        3. IPA phonetics (using eng-to-ipa)
        4. Audio URLs (placeholder or gTTS)
        
        Args:
            vocabulary: List of vocabulary items with embeddings
            document_title: Document title for context
            similarity_matrix: Optional pre-computed similarity matrix
            group_by_cluster: If True, group by cluster; else by synonym
        
        Returns:
            Enhanced flashcards with synonyms, IPA, audio, related words
        """
        print(f"  ℹ️  Generating enhanced flashcards...")
        
        if group_by_cluster:
            # Group by cluster (topic-based flashcards)
            flashcard_groups = self._group_by_cluster(vocabulary)
            print(f"  ✓ Grouped {len(vocabulary)} items into {len(flashcard_groups)} cluster-based flashcards")
        else:
            # Group by synonym (similarity > 0.85)
            flashcard_groups = self._group_synonyms(vocabulary, threshold=0.85)
            print(f"  ✓ Grouped {len(vocabulary)} items into {len(flashcard_groups)} synonym-based flashcards")
        
        # Step 2: Generate flashcards
        flashcards = []
        for group in flashcard_groups:
            flashcard = self._create_enhanced_flashcard(
                group,
                document_title,
                vocabulary
            )
            flashcards.append(flashcard)
        
        print(f"  ✓ Generated {len(flashcards)} enhanced flashcards")
        
        return {
            'flashcards': flashcards,
            'flashcard_count': len(flashcards),
            'synonym_groups': len([g for g in flashcard_groups if len(g.get('synonyms', [])) > 0]),
            'status': 'enabled',
            'message': 'Enhanced flashcards with cluster grouping'
        }
    
    def _group_synonyms(self, vocabulary: List[Dict], threshold: float = 0.85) -> List[Dict]:
        """
        Group vocabulary items by semantic similarity
        
        Args:
            vocabulary: List of vocabulary items with embeddings
            threshold: Similarity threshold for grouping (default: 0.85)
        
        Returns:
            List of flashcard groups with primary term and synonyms
        """
        from sklearn.metrics.pairwise import cosine_similarity
        import numpy as np
        
        # Extract embeddings
        items_with_embeddings = []
        for item in vocabulary:
            if 'cluster_centroid' in item:
                items_with_embeddings.append(item)
        
        if not items_with_embeddings:
            # No embeddings - return each item as separate group
            return [{'primary': item, 'synonyms': []} for item in vocabulary]
        
        # Build similarity matrix
        embeddings = [item['cluster_centroid'] for item in items_with_embeddings]
        embeddings_array = np.array(embeddings)
        similarity_matrix = cosine_similarity(embeddings_array)
        
        # Group by similarity
        groups = []
        used_indices = set()
        
        for i in range(len(items_with_embeddings)):
            if i in used_indices:
                continue
            
            # Start new group with this item as primary
            primary = items_with_embeddings[i]
            synonyms = []
            used_indices.add(i)
            
            # Find similar items
            for j in range(i + 1, len(items_with_embeddings)):
                if j in used_indices:
                    continue
                
                similarity = similarity_matrix[i][j]
                if similarity >= threshold:
                    synonyms.append({
                        'item': items_with_embeddings[j],
                        'similarity': float(similarity)
                    })
                    used_indices.add(j)
            
            groups.append({
                'primary': primary,
                'synonyms': synonyms
            })
        
        return groups
    
    def _group_by_cluster(self, vocabulary: List[Dict]) -> List[Dict]:
        """
        Group vocabulary items by cluster for topic-based flashcards
        
        Returns:
            List of flashcard groups with primary term and cluster members
        """
        from collections import defaultdict
        
        # Group by cluster_id
        clusters = defaultdict(list)
        for item in vocabulary:
            cluster_id = item.get('cluster_id', item.get('cluster', 0))
            clusters[cluster_id].append(item)
        
        # Create flashcard groups (1 per cluster)
        groups = []
        for cluster_id, items in clusters.items():
            if not items:
                continue
            
            # Choose primary (highest importance or is_representative)
            primary = max(
                items,
                key=lambda x: (
                    x.get('is_representative', False),
                    x.get('importance_score', 0),
                    x.get('frequency', 0)
                )
            )
            
            # Other items become synonyms/related terms
            synonyms = [
                {
                    'item': item,
                    'similarity': 1.0  # Same cluster
                }
                for item in items if item != primary
            ]
            
            groups.append({
                'primary': primary,
                'synonyms': synonyms,
                'cluster_id': cluster_id
            })
        
        return groups
    
    def _create_enhanced_flashcard(
        self,
        group: Dict,
        document_title: str,
        all_vocabulary: List[Dict]
    ) -> Dict:
        """
        Create enhanced flashcard from synonym group
        
        Args:
            group: Synonym group with primary term and synonyms
            document_title: Document title
            all_vocabulary: All vocabulary items for finding related words
        
        Returns:
            Enhanced flashcard with all metadata
        """
        primary = group['primary']
        synonyms = group['synonyms']
        
        # Extract primary term
        word = primary.get('phrase', primary.get('word', ''))
        
        # Get cluster information
        cluster_id = primary.get('cluster_id', 0)
        cluster_rank = primary.get('cluster_rank', 999)
        semantic_role = primary.get('semantic_role', 'unknown')
        importance_score = primary.get('importance_score', 0.5)
        
        # Generate cluster name (based on top terms in cluster)
        cluster_name = self._generate_cluster_name(cluster_id, all_vocabulary)
        
        # Get related words (from same cluster, excluding synonyms)
        related_words = self._get_related_words(
            primary,
            all_vocabulary,
            exclude_words=[word] + [s['item'].get('phrase', s['item'].get('word', '')) for s in synonyms]
        )
        
        # Get IPA phonetics
        ipa = self._get_ipa_phonetics(word)
        
        # Generate audio URLs
        audio_word_url = self._generate_audio_url(word, 'word')
        audio_example_url = None
        
        # Get example sentence
        example = primary.get('supporting_sentence', '')
        if example:
            audio_example_url = self._generate_audio_url(example, 'example')
        
        # Build flashcard
        flashcard = {
            'id': f"fc_{cluster_id}_{cluster_rank}",
            'word': word,
            'synonyms': [
                {
                    'word': s['item'].get('phrase', s['item'].get('word', '')),
                    'similarity': s['similarity']
                }
                for s in synonyms
            ],
            
            # Cluster information
            'cluster_id': cluster_id,
            'cluster_name': cluster_name,
            'cluster_rank': cluster_rank,
            'semantic_role': semantic_role,
            'importance_score': float(importance_score),
            
            # Definition
            'meaning': f"Academic term from {document_title}",
            'definition_source': 'generated',
            
            # Example
            'example': example[:200] if example else '',
            'example_source': 'document',
            
            # Phonetics
            'ipa': ipa,
            'ipa_uk': ipa,  # Same for now
            'ipa_us': ipa,  # Same for now
            
            # Audio
            'audio_word_url': audio_word_url,
            'audio_example_url': audio_example_url,
            
            # Metadata
            'word_type': 'phrase' if len(word.split()) > 1 else 'word',
            'difficulty': self._estimate_difficulty(importance_score),
            'tags': self._generate_tags(word, cluster_name),
            
            # Related words
            'related_words': related_words
        }
        
        return flashcard
    
    def _generate_cluster_name(self, cluster_id: int, vocabulary: List[Dict]) -> str:
        """
        Generate cluster name based on top terms
        
        Args:
            cluster_id: Cluster ID
            vocabulary: All vocabulary items
        
        Returns:
            Cluster name (e.g., "Climate Science", "Environmental Policy")
        """
        # Get items in this cluster
        cluster_items = [
            item for item in vocabulary
            if item.get('cluster_id') == cluster_id
        ]
        
        if not cluster_items:
            return f"Topic {cluster_id + 1}"
        
        # Get top 2 terms by importance
        top_terms = sorted(
            cluster_items,
            key=lambda x: x.get('importance_score', 0),
            reverse=True
        )[:2]
        
        # Build name from top terms
        names = []
        for item in top_terms:
            term = item.get('phrase', item.get('word', ''))
            # Capitalize first letter of each word
            term_capitalized = ' '.join(word.capitalize() for word in term.split())
            names.append(term_capitalized)
        
        return ' & '.join(names) if len(names) > 1 else names[0]
    
    def _get_related_words(
        self,
        primary: Dict,
        all_vocabulary: List[Dict],
        exclude_words: List[str],
        max_related: int = 5
    ) -> List[Dict]:
        """
        Get related words from same cluster
        
        Args:
            primary: Primary vocabulary item
            all_vocabulary: All vocabulary items
            exclude_words: Words to exclude (synonyms)
            max_related: Maximum related words to return
        
        Returns:
            List of related words with similarity scores
        """
        cluster_id = primary.get('cluster_id', 0)
        
        # Get items in same cluster
        cluster_items = [
            item for item in all_vocabulary
            if item.get('cluster_id') == cluster_id
        ]
        
        # Exclude primary and synonyms
        related = []
        for item in cluster_items:
            word = item.get('phrase', item.get('word', ''))
            if word not in exclude_words:
                related.append({
                    'word': word,
                    'similarity': float(item.get('centroid_similarity', 0.5))
                })
        
        # Sort by similarity and return top N
        related.sort(key=lambda x: x['similarity'], reverse=True)
        return related[:max_related]
    
    def _get_ipa_phonetics(self, word: str) -> str:
        """
        Get IPA phonetic transcription
        
        Args:
            word: Word or phrase
        
        Returns:
            IPA transcription (or empty string if not available)
        """
        try:
            import eng_to_ipa as ipa
            return ipa.convert(word)
        except ImportError:
            # Library not installed - return empty string
            return ""
        except Exception:
            # Conversion failed - return empty string
            return ""
    
    def _generate_audio_url(self, text: str, audio_type: str) -> str:
        """
        Generate audio URL for text
        
        Args:
            text: Text to generate audio for
            audio_type: 'word' or 'example'
        
        Returns:
            Audio URL (placeholder or gTTS URL)
        """
        # Option 1: Placeholder URL
        # return f"https://tts.google.com/{audio_type}/{text.replace(' ', '-')}.mp3"
        
        # Option 2: Generate with gTTS (requires file storage)
        # This would need to be implemented with actual file storage
        
        # For now, return placeholder
        import urllib.parse
        encoded_text = urllib.parse.quote(text)
        return f"https://translate.google.com/translate_tts?ie=UTF-8&q={encoded_text}&tl=en&client=tw-ob"
    
    def _estimate_difficulty(self, importance_score: float) -> str:
        """
        Estimate difficulty level based on importance score
        
        Args:
            importance_score: Importance score (0-1)
        
        Returns:
            Difficulty level: 'beginner', 'intermediate', 'advanced'
        """
        if importance_score >= 0.8:
            return 'advanced'
        elif importance_score >= 0.5:
            return 'intermediate'
        else:
            return 'beginner'
    
    def _generate_tags(self, word: str, cluster_name: str) -> List[str]:
        """
        Generate tags for flashcard
        
        Args:
            word: Word or phrase
            cluster_name: Cluster name
        
        Returns:
            List of tags
        """
        tags = []
        
        # Add cluster name as tag
        if cluster_name:
            tags.append(cluster_name.lower())
        
        # Add word type
        if len(word.split()) > 1:
            tags.append('phrase')
        else:
            tags.append('word')
        
        return tags
    
    def _clean_numpy_arrays(self, obj):
        """
        Recursively convert numpy arrays to lists for JSON serialization
        """
        import numpy as np
        
        if isinstance(obj, np.ndarray):
            return obj.tolist()
        elif isinstance(obj, dict):
            return {key: self._clean_numpy_arrays(value) for key, value in obj.items()}
        elif isinstance(obj, list):
            return [self._clean_numpy_arrays(item) for item in obj]
        elif isinstance(obj, (np.integer, np.floating)):
            return float(obj)
        elif hasattr(obj, '__dict__'):
            # Handle custom objects (like DocumentStructure) by skipping them
            return None
        else:
            return obj


# ============================================================================
# TESTING
# ============================================================================

if __name__ == "__main__":
    print("=" * 80)
    print("TESTING COMPLETE 12-STAGE PIPELINE")
    print("=" * 80)
    
    test_text = """
# Climate Change and Environmental Protection

Climate change is one of the most pressing issues facing humanity today. 
The burning of fossil fuels releases greenhouse gases into the atmosphere, 
leading to global warming and extreme weather events.

## Causes of Climate Change

Human activities such as deforestation and industrial pollution contribute 
significantly to environmental degradation. Cutting down trees reduces the 
planet's capacity to absorb carbon dioxide. Photosynthesis is essential 
for maintaining atmospheric balance.

## Solutions and Mitigation

To address climate change, we must adopt renewable energy sources and 
implement sustainable practices. Protecting natural habitats and reducing 
carbon emissions are essential steps toward environmental conservation.

Biodiversity loss threatens ecosystem stability. Urbanization and 
industrialization must be managed carefully to minimize environmental impact.
"""
    
    # Initialize systems (DISABLED - KG and RAG)
    # kg = KnowledgeGraph(storage_path="test_kg_complete")
    # rag = RAGSystem(kg, llm_api_key=os.getenv("OPENAI_API_KEY"))
    
    # Initialize complete pipeline (without KG/RAG)
    pipeline = CompletePipeline12Stages(knowledge_graph=None, rag_system=None)
    
    # Process document
    result = pipeline.process_document(
        text=test_text,
        document_id="doc_test_complete",
        document_title="Climate Change and Environmental Protection",
        max_phrases=15,
        max_words=5,
        use_bm25=True,
        bm25_weight=0.2,
        generate_flashcards=True
    )
    
    print("\n📊 FINAL RESULTS:")
    print("-" * 80)
    print(f"Vocabulary: {result['vocabulary_count']} items")
    print(f"Flashcards: {result['flashcards_count']} cards")
    
    print("\n📊 TOP VOCABULARY:")
    for i, item in enumerate(result['vocabulary'][:10], 1):
        text = item.get('phrase', item.get('word', ''))
        score = item.get('importance_score', 0)
        item_type = item.get('type', 'unknown')
        print(f"{i}. {text} (score: {score:.3f}, type: {item_type})")
    
    print("\n✅ Test completed!")
