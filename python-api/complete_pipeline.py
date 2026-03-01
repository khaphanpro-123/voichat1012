"""
COMPLETE PIPELINE - NEW VERSION (Learned Scoring)

Pipeline Flow:
1. Document Ingestion & Normalization
2. Heading Detection
3. Context Intelligence
4. Phrase Extraction (with Learning-to-Rank)
5. Single Word Extraction (with Learning-to-Rank)
6. Independent Scoring
7. Merge
8. Learned Final Scoring
9. Topic Modeling
10. Within-Topic Ranking
11. Flashcard Generation

Author: Kiro AI
Date: 2026-02-28
Version: 2.0 (New Pipeline)
"""

import numpy as np
from typing import List, Dict, Optional
import json

# Import stages
from heading_detector import HeadingDetector
import context_intelligence
from phrase_centric_extractor import PhraseCentricExtractor
from single_word_extractor_v2 import SingleWordExtractorV2
from new_pipeline_learned_scoring import NewPipelineLearnedScoring


class CompletePipelineNew:
    """
    Complete vocabulary extraction pipeline with learned scoring
    
    Stages:
    1. Document Ingestion
    2. Heading Detection
    3. Context Intelligence
    4. Phrase Extraction (L2R)
    5. Single Word Extraction (L2R)
    6-11. New Pipeline (Independent Scoring → Flashcards)
    """
    
    def __init__(
        self,
        n_topics: int = 5,
        model_path: str = "final_scorer_model.pkl"
    ):
        """
        Initialize complete pipeline
        
        Args:
            n_topics: Number of topics for clustering
            model_path: Path to final scorer model
        """
        print("="*80)
        print("INITIALIZING COMPLETE PIPELINE (NEW VERSION)")
        print("="*80)
        
        # Stage 2: Heading Detection
        self.heading_detector = HeadingDetector()
        print("✅ Heading Detector initialized")
        
        # Stage 3: Context Intelligence (using functions)
        # No initialization needed - uses functions directly
        print("✅ Context Intelligence ready")
        
        # Stage 4: Phrase Extraction
        self.phrase_extractor = PhraseCentricExtractor()
        print("✅ Phrase Extractor initialized (with L2R)")
        
        # Stage 5: Single Word Extraction
        self.word_extractor = SingleWordExtractorV2()
        print("✅ Word Extractor initialized (with L2R)")
        
        # Stages 6-11: New Pipeline
        self.new_pipeline = NewPipelineLearnedScoring(
            n_topics=n_topics,
            model_path=model_path
        )
        print("✅ New Pipeline initialized (Learned Scoring)")
        
        print("="*80)
        print("PIPELINE READY")
        print("="*80 + "\n")
    
    def process_document(
        self,
        text: str,
        max_phrases: int = 30,
        max_words: int = 20,
        document_title: str = "Document",
        use_bm25: bool = False,
        bm25_weight: float = 0.2,
        generate_flashcards: bool = True
    ) -> Dict:
        """
        Process document through complete pipeline
        
        Args:
            text: Document text
            max_phrases: Maximum phrases to extract
            max_words: Maximum words to extract
            document_title: Document title
            use_bm25: Enable BM25 filtering (deprecated, kept for compatibility)
            bm25_weight: BM25 weight (deprecated, kept for compatibility)
            generate_flashcards: Generate flashcards (always True in new pipeline)
        
        Returns:
            {
                'vocabulary': List[Dict],
                'topics': List[Dict],
                'flashcards': List[Dict],
                'statistics': Dict,
                'metadata': Dict
            }
        """
        print(f"\n{'='*80}")
        print(f"PROCESSING DOCUMENT: {document_title}")
        print(f"{'='*80}\n")
        
        # ====================================================================
        # STAGE 1: Document Ingestion & Normalization
        # ====================================================================
        print(f"[STAGE 1] Document Ingestion...")
        
        normalized_text = self._normalize_text(text)
        
        print(f"  ✓ Text normalized: {len(normalized_text)} characters")
        
        # ====================================================================
        # STAGE 2: Heading Detection
        # ====================================================================
        print(f"\n[STAGE 2] Heading Detection...")
        
        headings = self.heading_detector.detect_headings(normalized_text)
        
        print(f"  ✓ Detected {len(headings)} headings")
        
        # ====================================================================
        # STAGE 3: Context Intelligence
        # ====================================================================
        print(f"\n[STAGE 3] Context Intelligence...")
        
        # Build sentences
        sentences = context_intelligence.build_sentences(normalized_text)
        
        # Create simple context map
        context_map = {
            'sentences': sentences,
            'sections': [],
            'headings': headings
        }
        
        print(f"  ✓ Built context map with {len(sentences)} sentences")
        
        # ====================================================================
        # STAGE 4: Phrase Extraction (with L2R)
        # ====================================================================
        print(f"\n[STAGE 4] Phrase Extraction (Learning-to-Rank)...")
        
        phrases = self.phrase_extractor.extract_vocabulary(
            text=normalized_text,
            max_phrases=max_phrases
        )
        
        print(f"  ✓ Extracted {len(phrases)} phrases")
        
        # ====================================================================
        # STAGE 5: Single Word Extraction (with L2R)
        # ====================================================================
        print(f"\n[STAGE 5] Single Word Extraction (Learning-to-Rank)...")
        
        words = self.word_extractor.extract_single_words(
            text=normalized_text,
            phrases=phrases,
            headings=headings,
            max_words=max_words
        )
        
        print(f"  ✓ Extracted {len(words)} words")
        
        # ====================================================================
        # STAGES 6-11: New Pipeline (Learned Scoring)
        # ====================================================================
        print(f"\n[STAGES 6-11] New Pipeline (Learned Scoring)...")
        
        pipeline_result = self.new_pipeline.process(
            phrases=phrases,
            words=words,
            document_text=normalized_text
        )
        
        # ====================================================================
        # Add Metadata
        # ====================================================================
        result = {
            'vocabulary': pipeline_result['vocabulary'],
            'topics': pipeline_result['topics'],
            'flashcards': pipeline_result['flashcards'],
            'statistics': {
                **pipeline_result['statistics'],
                'document_title': document_title,
                'document_length': len(normalized_text),
                'num_headings': len(headings),
                'num_sections': len(context_map.get('sections', []))
            },
            'metadata': {
                'pipeline_version': '2.0',
                'pipeline_type': 'learned_scoring',
                'stages': [
                    'Document Ingestion',
                    'Heading Detection',
                    'Context Intelligence',
                    'Phrase Extraction (L2R)',
                    'Single Word Extraction (L2R)',
                    'Independent Scoring',
                    'Merge',
                    'Learned Final Scoring',
                    'Topic Modeling',
                    'Within-Topic Ranking',
                    'Flashcard Generation'
                ]
            }
        }
        
        print(f"\n{'='*80}")
        print(f"PIPELINE COMPLETE")
        print(f"  Total vocabulary: {len(result['vocabulary'])}")
        print(f"  Topics: {len(result['topics'])}")
        print(f"  Flashcards: {len(result['flashcards'])}")
        print(f"{'='*80}\n")
        
        return result
    
    def _normalize_text(self, text: str) -> str:
        """
        STAGE 1: Normalize text
        
        - Remove extra whitespace
        - Ensure UTF-8 encoding
        - Preserve paragraph structure
        """
        # Remove extra whitespace
        text = ' '.join(text.split())
        
        # Ensure UTF-8
        text = text.encode('utf-8', errors='ignore').decode('utf-8')
        
        return text
    
    def train_final_scorer(self, training_data: List[Dict]):
        """
        Train the final scorer model
        
        Args:
            training_data: List of labeled examples
                [
                    {
                        'semantic_score': 0.9,
                        'learning_value': 0.95,
                        'freq_score': 0.5,
                        'rarity_score': 0.8,
                        'human_importance': 0.92
                    },
                    ...
                ]
        """
        self.new_pipeline.train_model(training_data)
    
    def export_to_json(self, result: Dict, output_path: str):
        """
        Export result to JSON file
        
        Args:
            result: Pipeline result
            output_path: Output file path
        """
        # Clean numpy arrays
        cleaned_result = self._clean_numpy_arrays(result)
        
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(cleaned_result, f, indent=2, ensure_ascii=False)
        
        print(f"✅ Exported to {output_path}")
    
    def _clean_numpy_arrays(self, obj):
        """
        Recursively clean numpy arrays from object
        """
        if isinstance(obj, dict):
            return {
                k: self._clean_numpy_arrays(v)
                for k, v in obj.items()
                if k not in ['embedding', 'centroid']  # Remove embeddings
            }
        elif isinstance(obj, list):
            return [self._clean_numpy_arrays(item) for item in obj]
        elif isinstance(obj, np.ndarray):
            return obj.tolist()
        elif isinstance(obj, (np.int64, np.int32)):
            return int(obj)
        elif isinstance(obj, (np.float64, np.float32)):
            return float(obj)
        else:
            return obj


# ============================================================================
# TESTING
# ============================================================================

if __name__ == "__main__":
    print("=" * 80)
    print("TESTING COMPLETE PIPELINE (NEW VERSION)")
    print("=" * 80)
    
    # Sample document
    sample_text = """
    Machine Learning and Artificial Intelligence
    
    Machine learning is a subset of artificial intelligence that focuses on 
    developing algorithms that can learn from data. Neural networks are a 
    fundamental component of modern machine learning systems.
    
    Deep Learning
    
    Deep learning uses neural networks with multiple layers to process complex 
    patterns. Backpropagation is the key algorithm for training these networks.
    Gradient descent optimization helps minimize the loss function.
    
    Applications
    
    Machine learning has numerous applications including natural language 
    processing, computer vision, and reinforcement learning. These technologies
    are transforming industries worldwide.
    """
    
    # Initialize pipeline
    pipeline = CompletePipelineNew(n_topics=3)
    
    # Process document
    result = pipeline.process_document(
        text=sample_text,
        max_phrases=15,
        max_words=10,
        document_title="Machine Learning Introduction"
    )
    
    # Print results
    print("\n📊 RESULTS:")
    print("-" * 80)
    print(f"Total vocabulary: {result['statistics']['total_items']}")
    print(f"Phrases: {result['statistics']['phrases']}")
    print(f"Words: {result['statistics']['words']}")
    print(f"Topics: {result['statistics']['num_topics']}")
    print(f"Flashcards: {result['statistics']['num_flashcards']}")
    
    print("\n📊 TOPICS:")
    print("-" * 80)
    for topic in result['topics']:
        print(f"\nTopic {topic['topic_id']}: {topic['topic_name']}")
        print(f"  Items: {len(topic['items'])}")
        
        # Show top 3
        for item in topic['items'][:3]:
            text = item.get('phrase', item.get('word', item.get('text', 'unknown')))
            score = item.get('final_score', 0.0)
            role = item.get('semantic_role', 'unknown')
            print(f"    - {text} (score: {score:.3f}, role: {role})")
    
    print("\n📊 FLASHCARDS (Top 5):")
    print("-" * 80)
    for i, flashcard in enumerate(result['flashcards'][:5], 1):
        print(f"\n{i}. {flashcard['text']}")
        print(f"   Topic: {flashcard['topic_name']}")
        print(f"   Role: {flashcard['semantic_role']}")
        print(f"   Difficulty: {flashcard['difficulty']}")
        print(f"   Score: {flashcard['final_score']:.3f}")
    
    # Export to JSON
    pipeline.export_to_json(result, "test_output.json")
    
    print("\n✅ Test completed!")
