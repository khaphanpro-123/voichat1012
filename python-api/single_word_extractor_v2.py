"""
Single Word Extractor V2 - Learning-to-Rank Version
Wrapper for WordRanker to maintain compatibility with existing pipeline

Author: Kiro AI
Date: 2026-02-27
Version: 2.0.0
"""

from typing import List, Dict, Optional
from word_ranker import WordRanker


class SingleWordExtractorV2:
    """
    Wrapper for WordRanker to maintain API compatibility
    
    This class provides the same interface as SingleWordExtractor
    but uses Learning-to-Rank internally instead of rule-based scoring
    """
    
    def __init__(self):
        """Initialize with WordRanker"""
        self.ranker = WordRanker()
        print("✅ SingleWordExtractorV2 initialized (Learning-to-Rank)")
    
    def extract_single_words(
        self,
        text: str,
        phrases: List[Dict],
        headings: List[Dict],
        max_words: int = 20,
        idf_threshold: float = 1.5,  # Not used in L2R version
        semantic_threshold: float = 0.2  # Not used in L2R version
    ) -> List[Dict]:
        """
        Extract single words using Learning-to-Rank
        
        Args:
            text: Document text
            phrases: Extracted phrases (for coverage penalty)
            headings: Document headings (for domain specificity)
            max_words: Maximum number of words to return
            idf_threshold: (DEPRECATED - not used in L2R)
            semantic_threshold: (DEPRECATED - not used in L2R)
        
        Returns:
            List of ranked words with scores
        """
        print(f"\n{'='*80}")
        print(f"SINGLE-WORD EXTRACTION (LEARNING-TO-RANK VERSION)")
        print(f"{'='*80}\n")
        
        # ====================================================================
        # STEP 1: Text Preprocessing
        # ====================================================================
        print("[STEP 1] Text Preprocessing...")
        tokens = self.ranker.preprocess_text(text)
        print(f"  ✓ Extracted {len(tokens)} tokens")
        
        # ====================================================================
        # STEP 2: Candidate Filtering (POS + Stopwords)
        # ====================================================================
        print("[STEP 2] Candidate Filtering (POS + Stopwords)...")
        candidates = self.ranker.filter_candidates(tokens)
        print(f"  ✓ Filtered to {len(candidates)} candidates")
        
        # ====================================================================
        # STEP 3: Feature Engineering (7 features)
        # ====================================================================
        print("[STEP 3] Feature Engineering (7 features)...")
        candidates = self.ranker.extract_features(
            candidates=candidates,
            text=text,
            phrases=phrases,
            headings=headings
        )
        print(f"  ✓ Extracted features for {len(candidates)} candidates")
        
        # ====================================================================
        # STEP 4: Ranking (Learning-to-Rank)
        # ====================================================================
        print("[STEP 4] Ranking (Learning-to-Rank)...")
        ranked_words = self.ranker.rank(candidates, top_k=max_words)
        print(f"  ✓ Ranked and selected top {len(ranked_words)} words")
        
        # ====================================================================
        # STEP 5: Format Output (Compatibility)
        # ====================================================================
        print("[STEP 5] Formatting output...")
        
        # Add supporting sentences
        for word_dict in ranked_words:
            if word_dict.get('sentences'):
                word_dict['supporting_sentence'] = word_dict['sentences'][0]
            else:
                word_dict['supporting_sentence'] = ""
        
        print(f"  ✓ Final output: {len(ranked_words)} single words")
        
        # ====================================================================
        # Summary
        # ====================================================================
        print(f"\n{'='*80}")
        print(f"SINGLE-WORD EXTRACTION COMPLETE")
        print(f"  Total tokens: {len(tokens)}")
        print(f"  After filtering: {len(candidates)}")
        print(f"  Final output: {len(ranked_words)}")
        print(f"  Method: Learning-to-Rank (LinearRegression)")
        print(f"{'='*80}\n")
        
        return ranked_words
    
    def train_model(
        self,
        text: str,
        labels: List[float],
        phrases: List[Dict] = None,
        headings: List[Dict] = None
    ) -> Dict[str, float]:
        """
        Train the Learning-to-Rank model with labeled data
        
        Args:
            text: Document text
            labels: Human-labeled importance scores (0-1) for each word
            phrases: Extracted phrases (optional)
            headings: Document headings (optional)
        
        Returns:
            Model coefficients (weights)
        """
        print(f"\n{'='*80}")
        print(f"TRAINING LEARNING-TO-RANK MODEL")
        print(f"{'='*80}\n")
        
        # Preprocess
        tokens = self.ranker.preprocess_text(text)
        
        # Filter
        candidates = self.ranker.filter_candidates(tokens)
        
        # Extract features
        candidates = self.ranker.extract_features(
            candidates=candidates,
            text=text,
            phrases=phrases,
            headings=headings
        )
        
        # Train
        coefficients = self.ranker.train(candidates, labels)
        
        print(f"\n{'='*80}")
        print(f"TRAINING COMPLETE")
        print(f"{'='*80}\n")
        
        return coefficients


# ============================================================================
# MIGRATION GUIDE
# ============================================================================

"""
MIGRATION FROM V1 TO V2

1. Replace import:
   OLD: from single_word_extractor import SingleWordExtractor
   NEW: from single_word_extractor_v2 import SingleWordExtractorV2

2. Update initialization:
   OLD: extractor = SingleWordExtractor()
   NEW: extractor = SingleWordExtractorV2()

3. API remains the same:
   words = extractor.extract_single_words(
       text=text,
       phrases=phrases,
       headings=headings,
       max_words=20
   )

4. Optional: Train model with labeled data
   coefficients = extractor.train_model(
       text=text,
       labels=[0.9, 0.85, 0.7, ...],
       phrases=phrases,
       headings=headings
   )

BENEFITS OF V2:
- No hardcoded weights
- Learning from data
- Better generalization
- Incremental improvement
- Research-ready (publishable)

DEPRECATED PARAMETERS:
- idf_threshold: Not used in L2R (feature-based instead)
- semantic_threshold: Not used in L2R (learned automatically)
"""
