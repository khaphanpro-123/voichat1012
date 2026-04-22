from typing import List, Dict, Optional
from word_ranker import WordRanker
class SingleWordExtractorV2: 
    def __init__(self):
        """Initialize with WordRanker"""
        self.ranker = WordRanker()
        print(" SingleWordExtractorV2 initialized (4 features - Simplified)")
    
    def extract_single_words(
        self,
        text: str,
        phrases: List[Dict],
        headings: List[Dict] = None,  # Not used in simplified version
        max_words: int = 20,
        idf_threshold: float = 1.5,  # Not used
        semantic_threshold: float = 0.2  # Not used
    ) -> List[Dict]:
        print(f"\n{'='*80}")
        print(f"SINGLE-WORD EXTRACTION (SIMPLIFIED - 4 FEATURES)")
        print(f"{'='*80}\n")
        print("[STEP 1] Text Preprocessing...")
        tokens = self.ranker.preprocess_text(text)
        print(f"  ✓ Extracted {len(tokens)} tokens")
        print("[STEP 2] Candidate Filtering (POS + Stopwords)...")
        candidates = self.ranker.filter_candidates(tokens)
        print(f"  ✓ Filtered to {len(candidates)} candidates")
        print("[STEP 3] Feature Engineering (4 features)...")
        candidates = self.ranker.extract_features(
            candidates=candidates,
            text=text,
            phrases=phrases
        )
        print(f"  ✓ Extracted features for {len(candidates)} candidates")
        print("[STEP 4] Ranking...")
        ranked_words = self.ranker.rank(candidates, top_k=max_words)
        print(f"  ✓ Ranked and selected top {len(ranked_words)} words")
        print("[STEP 5] Formatting output...")
        for word_dict in ranked_words:
            if word_dict.get('sentences'):
                word_dict['supporting_sentence'] = word_dict['sentences'][0]
            else:
                word_dict['supporting_sentence'] = ""
        
        print(f"  ✓ Final output: {len(ranked_words)} single words")
        print(f"\n{'='*80}")
        print(f"SINGLE-WORD EXTRACTION COMPLETE")
        print(f"  Total tokens: {len(tokens)}")
        print(f"  After filtering: {len(candidates)}")
        print(f"  Final output: {len(ranked_words)}")
        print(f"  Method: Simplified (4 features)")
        print(f"  Weights: TF-IDF=0.6, Length=0.1, Morph=0.3, Coverage=-0.5")
        print(f"{'='*80}\n")
        
        return ranked_words
    
