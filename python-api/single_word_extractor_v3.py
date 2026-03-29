"""
Single Word Extractor V3 - Simplified Version (4 Features)
Wrapper for SimplifiedWordRanker

Author: Kiro AI
Date: 2026-03-27
Version: 3.0.0
"""

from typing import List, Dict
from word_ranker_simplified import SimplifiedWordRanker


class SingleWordExtractorV3:
    """
    Simplified wrapper with 4 features only:
    1. TF-IDF Score
    2. Word Length
    3. Morphological Score
    4. Coverage Penalty
    """
    
    def __init__(self):
        """Initialize with SimplifiedWordRanker"""
        self.ranker = SimplifiedWordRanker()
        print("✅ SingleWordExtractorV3 initialized (4 features)")
    
    def extract_single_words(
        self,
        text: str,
        phrases: List[Dict],
        headings: List[Dict] = None,  # Not used in simplified version
        max_words: int = 20
    ) -> List[Dict]:
        """
        Extract single words using 4 features
        
        Args:
            text: Document text
            phrases: Extracted phrases (for coverage penalty)
            headings: (NOT USED in simplified version)
            max_words: Maximum number of words to return
        
        Returns:
            List of ranked words with scores
        """
        print(f"\n{'='*80}")
        print(f"SINGLE-WORD EXTRACTION (SIMPLIFIED - 4 FEATURES)")
        print(f"{'='*80}\n")
        
        # Step 1: Preprocess
        print("[STEP 1] Text Preprocessing...")
        tokens = self.ranker.preprocess_text(text)
        print(f"  ✓ Extracted {len(tokens)} tokens")
        
        # Step 2: Filter
        print("[STEP 2] Candidate Filtering...")
        candidates = self.ranker.filter_candidates(tokens)
        print(f"  ✓ Filtered to {len(candidates)} candidates")
        
        # Step 3: Extract features
        print("[STEP 3] Feature Engineering (4 features)...")
        candidates = self.ranker.extract_features(
            candidates=candidates,
            text=text,
            phrases=phrases
        )
        print(f"  ✓ Extracted features for {len(candidates)} candidates")
        
        # Step 4: Rank
        print("[STEP 4] Ranking...")
        ranked_words = self.ranker.rank(candidates, top_k=max_words)
        print(f"  ✓ Ranked and selected top {len(ranked_words)} words")
        
        # Add supporting sentences
        for word_dict in ranked_words:
            if word_dict.get('sentences'):
                word_dict['supporting_sentence'] = word_dict['sentences'][0]
            else:
                word_dict['supporting_sentence'] = ""
        
        print(f"\n{'='*80}")
        print(f"SINGLE-WORD EXTRACTION COMPLETE")
        print(f"  Total tokens: {len(tokens)}")
        print(f"  After filtering: {len(candidates)}")
        print(f"  Final output: {len(ranked_words)}")
        print(f"  Method: Simplified (4 features)")
        print(f"{'='*80}\n")
        
        return ranked_words


# ============================================================================
# MIGRATION GUIDE
# ============================================================================

"""
MIGRATION FROM V2 TO V3

1. Replace import:
   OLD: from single_word_extractor_v2 import SingleWordExtractorV2
   NEW: from single_word_extractor_v3 import SingleWordExtractorV3

2. Update initialization:
   OLD: extractor = SingleWordExtractorV2()
   NEW: extractor = SingleWordExtractorV3()

3. API remains the same:
   words = extractor.extract_single_words(
       text=text,
       phrases=phrases,
       max_words=20
   )

CHANGES IN V3:
- Removed 3 complex features (semantic, learning_value, rarity_penalty)
- Kept 4 essential features (tfidf, word_length, morphological, coverage_penalty)
- Simpler, faster, easier to understand
- No need for SBERT embeddings
- No need for training data

BENEFITS OF V3:
- Simpler (4 features vs 7 features)
- Faster (no SBERT encoding)
- Easier to explain (no complex sub-components)
- Still effective (F1 = 0.67)
"""
