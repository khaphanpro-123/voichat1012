"""
CONFIGURABLE PIPELINE FOR ABLATION STUDY

Allows enabling/disabling specific stages to test their individual contributions.

Author: Kiro AI
Date: 2026-03-13
Version: 1.0.0
"""

import numpy as np
from typing import List, Dict, Optional
import time

# Import stages
from heading_detector import HeadingDetector
import context_intelligence
from phrase_centric_extractor import PhraseCentricExtractor
from single_word_extractor_v2 import SingleWordExtractorV2
from new_pipeline_learned_scoring import NewPipelineLearnedScoring


class ConfigurablePipeline:
    """
    Pipeline with configurable stages for ablation study
    
    Each case enables different combinations of stages:
    - Case 1: [1,2,4,7,8,12] - Baseline (phrases only)
    - Case 2: [1,2,3,4,7,8,12] - + Context Intelligence
    - Case 3: [1,2,3,4,5,6,7,8,9,12] - + Single Words + Topic Modeling
    - Case 4: [1,2,3,4,5,6,7,8,9,10,11,12] - Full Pipeline
    """
    
    def __init__(self, enabled_stages: List[int], n_topics: int = 5):
        """
        Initialize pipeline with specific stages enabled
        
        Args:
            enabled_stages: List of stage numbers to enable (1-12)
            n_topics: Number of topics for clustering (stages 9-10)
        """
        self.enabled_stages = enabled_stages
        self.n_topics = n_topics
        
        print(f"🔧 Initializing Configurable Pipeline")
        print(f"   Enabled stages: {enabled_stages}")
        
        # Initialize components based on enabled stages
        self.heading_detector = None
        self.phrase_extractor = None
        self.word_extractor = None
        self.new_pipeline = None
        
        if 2 in enabled_stages:
            self.heading_detector = HeadingDetector()
            print(f"   ✅ Stage 2: Heading Detector")
        
        if 4 in enabled_stages:
            self.phrase_extractor = PhraseCentricExtractor()
            print(f"   ✅ Stage 4: Phrase Extractor")
        
        if 5 in enabled_stages:
            self.word_extractor = SingleWordExtractorV2()
            print(f"   ✅ Stage 5: Word Extractor")
        
        # New pipeline for stages 6-11 (if any are enabled)
        if any(stage in enabled_stages for stage in [6, 7, 8, 9, 10, 11]):
            self.new_pipeline = NewPipelineLearnedScoring(n_topics=n_topics)
            print(f"   ✅ Stages 6-11: New Pipeline")
    
    def process_document(
        self,
        text: str,
        document_title: str = "Document",
        max_phrases: int = 30,
        max_words: int = 20
    ) -> Dict:
        """
        Process document through enabled stages only
        
        Args:
            text: Document text
            document_title: Document title
            max_phrases: Maximum phrases to extract
            max_words: Maximum words to extract
        
        Returns:
            Result dictionary with vocabulary, topics, flashcards, etc.
        """
        print(f"\n{'='*60}")
        print(f"CONFIGURABLE PIPELINE: {document_title}")
        print(f"Enabled stages: {self.enabled_stages}")
        print(f"{'='*60}")
        
        result = {
            'vocabulary': [],
            'topics': [],
            'flashcards': [],
            'statistics': {},
            'metadata': {
                'enabled_stages': self.enabled_stages,
                'pipeline_type': 'configurable_ablation'
            }
        }
        
        # ================================================================
        # STAGE 1: Document Ingestion & Normalization (Always enabled)
        # ================================================================
        print(f"[STAGE 1] Document Ingestion...")
        normalized_text = self._normalize_text(text)
        print(f"  ✓ Text normalized: {len(normalized_text)} characters")
        
        # ================================================================
        # STAGE 2: Heading Detection
        # ================================================================
        headings = []
        if 2 in self.enabled_stages and self.heading_detector:
            print(f"[STAGE 2] Heading Detection...")
            headings = self.heading_detector.detect_headings(normalized_text)
            print(f"  ✓ Detected {len(headings)} headings")
        else:
            print(f"[STAGE 2] SKIPPED")
        
        # ================================================================
        # STAGE 3: Context Intelligence
        # ================================================================
        sentences = []
        context_map = {}
        if 3 in self.enabled_stages:
            print(f"[STAGE 3] Context Intelligence...")
            sentences = context_intelligence.build_sentences(normalized_text)
            context_map = {
                'sentences': sentences,
                'headings': headings,
                'sections': []
            }
            print(f"  ✓ Built context map with {len(sentences)} sentences")
        else:
            print(f"[STAGE 3] SKIPPED")
        
        # ================================================================
        # STAGE 4: Phrase Extraction
        # ================================================================
        phrases = []
        if 4 in self.enabled_stages and self.phrase_extractor:
            print(f"[STAGE 4] Phrase Extraction...")
            phrases = self.phrase_extractor.extract_vocabulary(
                text=normalized_text,
                max_phrases=max_phrases
            )
            print(f"  ✓ Extracted {len(phrases)} phrases")
        else:
            print(f"[STAGE 4] SKIPPED")
        
        # ================================================================
        # STAGE 5: Single Word Extraction
        # ================================================================
        words = []
        if 5 in self.enabled_stages and self.word_extractor:
            print(f"[STAGE 5] Single Word Extraction...")
            words = self.word_extractor.extract_single_words(
                text=normalized_text,
                phrases=phrases,
                headings=headings,
                max_words=max_words
            )
            print(f"  ✓ Extracted {len(words)} words")
        else:
            print(f"[STAGE 5] SKIPPED")
        
        # ================================================================
        # STAGES 6-11: Advanced Processing
        # ================================================================
        if any(stage in self.enabled_stages for stage in [6, 7, 8, 9, 10, 11]):
            print(f"[STAGES 6-11] Advanced Processing...")
            
            # Filter enabled stages for new pipeline
            pipeline_stages = [s for s in [6, 7, 8, 9, 10, 11] if s in self.enabled_stages]
            print(f"  Pipeline stages: {pipeline_stages}")
            
            if self.new_pipeline:
                pipeline_result = self.new_pipeline.process(
                    phrases=phrases,
                    words=words,
                    document_text=normalized_text,
                    enabled_stages=pipeline_stages  # Pass enabled stages
                )
                
                result['vocabulary'] = pipeline_result.get('vocabulary', [])
                result['topics'] = pipeline_result.get('topics', [])
                result['statistics'] = pipeline_result.get('statistics', {})
                
                print(f"  ✓ Advanced processing complete")
            else:
                print(f"  ⚠️  New pipeline not initialized")
        else:
            print(f"[STAGES 6-11] ALL SKIPPED")
            
            # Manual merge for simple cases (Stage 7 equivalent)
            if 7 in self.enabled_stages:
                result['vocabulary'] = phrases + words
                print(f"  ✓ Simple merge: {len(result['vocabulary'])} items")
            else:
                result['vocabulary'] = phrases  # Only phrases if no merge
                print(f"  ✓ Phrases only: {len(result['vocabulary'])} items")
        
        # ================================================================
        # STAGE 12: Flashcard Generation
        # ================================================================
        if 12 in self.enabled_stages:
            print(f"[STAGE 12] Flashcard Generation...")
            result['flashcards'] = self._generate_simple_flashcards(
                result['vocabulary'][:20]  # Top 20 items
            )
            print(f"  ✓ Generated {len(result['flashcards'])} flashcards")
        else:
            print(f"[STAGE 12] SKIPPED")
        
        # ================================================================
        # Add metadata
        # ================================================================
        result['statistics'].update({
            'document_title': document_title,
            'document_length': len(normalized_text),
            'num_headings': len(headings),
            'num_sentences': len(sentences),
            'enabled_stages': self.enabled_stages
        })
        
        print(f"\n{'='*60}")
        print(f"CONFIGURABLE PIPELINE COMPLETE")
        print(f"  Vocabulary: {len(result['vocabulary'])} items")
        print(f"  Topics: {len(result['topics'])} topics")
        print(f"  Flashcards: {len(result['flashcards'])} cards")
        print(f"  Enabled stages: {self.enabled_stages}")
        print(f"{'='*60}\n")
        
        return result
    
    def _normalize_text(self, text: str) -> str:
        """Stage 1: Normalize text"""
        # Remove extra whitespace
        text = ' '.join(text.split())
        
        # Ensure UTF-8
        text = text.encode('utf-8', errors='ignore').decode('utf-8')
        
        return text
    
    def _generate_simple_flashcards(self, vocabulary: List[Dict]) -> List[Dict]:
        """Stage 12: Generate simple flashcards"""
        flashcards = []
        
        for item in vocabulary[:20]:  # Top 20 items
            word = item.get('word') or item.get('phrase') or item.get('text', '')
            if word:
                flashcard = {
                    'word': word,
                    'meaning': f"Academic term from document",
                    'example': item.get('supporting_sentence', item.get('context_sentence', '')),
                    'score': item.get('importance_score', item.get('final_score', 0.5)),
                    'type': item.get('type', 'unknown')
                }
                flashcards.append(flashcard)
        
        return flashcards


# ============================================================================
# CASE CONFIGURATIONS - UPDATED FOR 11-STEP PIPELINE
# ============================================================================

ABLATION_CASES = {
    1: {
        'name': 'TH1: Extraction Module',
        'description': 'Cấu hình cơ bản - Bước 1-5 (Tiền xử lý + Trích xuất từ vựng)',
        'stages': [1, 3, 4, 5],  # Document normalization + Phrase extraction + Single word extraction
        'n_topics': 3,
        'details': 'Chuẩn hóa tài liệu, phân tích cấu trúc, trích xuất cụm từ và từ đơn'
    },
    2: {
        'name': 'TH2: + Structural Context',
        'description': 'TH1 + Phân tích cấu trúc tiêu đề và ánh xạ ngữ cảnh (Bước 2-3)',
        'stages': [1, 2, 3, 4, 5],  # + Heading Analysis + Structural Context Mapping
        'n_topics': 3,
        'details': 'Bổ sung Heading Analysis và Structural Heading Context Mapping'
    },
    3: {
        'name': 'TH3: + Semantic Scoring',
        'description': 'TH2 + Chấm điểm ngữ nghĩa và hợp nhất từ vựng (Bước 6-8)',
        'stages': [1, 2, 3, 4, 5, 6, 7, 8],  # + Independent Scoring + Merge + Learned Final Scoring
        'n_topics': 5,
        'details': 'Bổ sung Independent Scoring, Merge Phrase & Word, Learned Final Scoring'
    },
    4: {
        'name': 'TH4: Full System',
        'description': 'Hệ thống hoàn chỉnh với phân cụm chủ đề và xếp hạng (Bước 9-11)',
        'stages': [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],  # + Topic Modeling + Within-topic Ranking + Flashcard Generation
        'n_topics': 5,
        'details': 'Hệ thống đầy đủ với Topic Modeling, Within-topic Ranking, Flashcard Generation'
    }
}


def create_pipeline_for_case(case_id: int) -> ConfigurablePipeline:
    """
    Create pipeline for specific ablation case
    
    Args:
        case_id: Case number (1-4)
    
    Returns:
        Configured pipeline for the case
    """
    if case_id not in ABLATION_CASES:
        raise ValueError(f"Invalid case_id: {case_id}. Must be 1-4.")
    
    case_config = ABLATION_CASES[case_id]
    
    return ConfigurablePipeline(
        enabled_stages=case_config['stages'],
        n_topics=case_config['n_topics']
    )