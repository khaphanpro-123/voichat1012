from typing import List, Dict
from word_ranker_simplified import SimplifiedWordRanker
class SingleWordExtractorV3:
    def __init__(self):
        """Initialize with SimplifiedWordRanker"""
        self.ranker = SimplifiedWordRanker()
        print(" SingleWordExtractorV3 initialized (4 features)")
    def extract_single_words(
        self,
        text: str,
        phrases: List[Dict],
        headings: List[Dict] = None,  # Not used in simplified version
        max_words: int = 20
    ) -> List[Dict]:
        print(f"\n{'='*80}")
        print(f"SINGLE-WORD EXTRACTION (SIMPLIFIED - 4 FEATURES)")
        print(f"{'='*80}\n")
        # Step 1: Preprocess
        print("[STEP 1] Text Preprocessing...")
        tokens = self.ranker.preprocess_text(text)
        print(f"   Extracted {len(tokens)} tokens")
        # Step 2: Filter
        print("[STEP 2] Candidate Filtering...")
        candidates = self.ranker.filter_candidates(tokens)
        print(f"   Filtered to {len(candidates)} candidates")
        # Step 3: Extract features
        print("[STEP 3] Feature Engineering (4 features)...")
        candidates = self.ranker.extract_features(
            candidates=candidates,
            text=text,
            phrases=phrases
        )
        print(f"   Extracted features for {len(candidates)} candidates")
        # Step 4: Rank
        print("[STEP 4] Ranking...")
        ranked_words = self.ranker.rank(candidates, top_k=max_words)
        print(f"   Ranked and selected top {len(ranked_words)} words")
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
