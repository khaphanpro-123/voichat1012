"""
Vocabulary Merger với Score Normalization
Thay thế Bước 6 (Independent Scoring) và Bước 8 (Learned Final Scoring)

Author: Kiro AI
Date: 2026-03-28
Version: 2.0.0 (Simplified)
"""

from typing import List, Dict, Optional
import numpy as np


class VocabularyMergerNormalized:
    """
    Merge phrases và words, sau đó chuẩn hóa điểm về [0, 1]
    
    Bước 6 mới: Score Normalization & Ranking
    - Merge phrases + words
    - Shift (loại bỏ giá trị âm)
    - Normalize về [0, 1]
    - Sort (cao → thấp)
    - Rank
    """
    
    def __init__(self):
        """Initialize merger"""
        pass
    
    def merge_and_normalize(
        self,
        phrases: List[Dict],
        words: List[Dict],
        top_k: Optional[int] = None
    ) -> List[Dict]:
        """
        Merge phrases và words, chuẩn hóa điểm, và sắp xếp
        
        Args:
            phrases: List of phrase dicts với final_score
            words: List of word dicts với final_score
            top_k: Số lượng vocabulary cần giữ (optional)
        
        Returns:
            Vocabulary đã chuẩn hóa và sắp xếp
        """
        print(f"\n{'='*80}")
        print(f"BƯỚC 6: SCORE NORMALIZATION & RANKING")
        print(f"{'='*80}\n")
        
        print(f"[INPUT]")
        print(f"  Phrases: {len(phrases)}")
        print(f"  Words: {len(words)}")
        if top_k:
            print(f"  Top-K: {top_k}")
        
        # ====================================================================
        # Bước 6.1: Merge (Gộp)
        # ====================================================================
        print(f"\n[6.1] Merging phrases and words...")
        
        vocabulary = self._merge(phrases, words)
        
        print(f"  ✓ Merged: {len(vocabulary)} items")
        
        # ====================================================================
        # Bước 6.2: Shift (Dịch Chuyển)
        # ====================================================================
        print(f"\n[6.2] Shifting scores...")
        
        vocabulary = self._shift_scores(vocabulary)
        
        print(f"  ✓ Shifted scores")
        
        # ====================================================================
        # Bước 6.3: Normalize (Chuẩn Hóa)
        # ====================================================================
        print(f"\n[6.3] Normalizing scores...")
        
        vocabulary = self._normalize_scores(vocabulary)
        
        print(f"  ✓ Normalized scores to [0, 1]")
        
        # ====================================================================
        # Bước 6.4: Sort (Sắp Xếp)
        # ====================================================================
        print(f"\n[6.4] Sorting by normalized score...")
        
        vocabulary = self._sort_vocabulary(vocabulary)
        
        print(f"  ✓ Sorted (high → low)")
        
        # ====================================================================
        # Bước 6.5: Rank (Gán Thứ Hạng)
        # ====================================================================
        print(f"\n[6.5] Assigning ranks...")
        
        vocabulary = self._assign_ranks(vocabulary)
        
        print(f"  ✓ Assigned ranks")
        
        # ====================================================================
        # Keep top_k if specified
        # ====================================================================
        if top_k is not None and len(vocabulary) > top_k:
            print(f"\n[6.6] Keeping top {top_k} items...")
            vocabulary = vocabulary[:top_k]
            print(f"  ✓ Kept top {top_k}")
        
        # ====================================================================
        # Summary
        # ====================================================================
        print(f"\n{'='*80}")
        print(f"BƯỚC 6 COMPLETE")
        print(f"  Total vocabulary: {len(vocabulary)}")
        if vocabulary:
            print(f"  Top item: {vocabulary[0]['term']} (score: {vocabulary[0]['final_score_normalized']:.3f})")
            print(f"  Bottom item: {vocabulary[-1]['term']} (score: {vocabulary[-1]['final_score_normalized']:.3f})")
        print(f"{'='*80}\n")
        
        return vocabulary
    
    def _merge(self, phrases: List[Dict], words: List[Dict]) -> List[Dict]:
        """
        Bước 6.1: Merge phrases và words
        
        Gộp phrases và words thành một list chung
        Mỗi item có:
        - term: text của phrase/word
        - type: 'phrase' hoặc 'word'
        - final_score: điểm gốc
        - features: dict chứa các features
        - metadata: dict chứa thông tin gốc
        """
        vocabulary = []
        
        # Add phrases
        for p in phrases:
            vocabulary.append({
                'term': p.get('phrase', p.get('text', '')),
                'type': 'phrase',
                'final_score': p.get('final_score', p.get('importance_score', 0.5)),
                'features': {
                    'tfidf': p.get('tfidf_score', 0.0),
                    'cohesion': p.get('cohesion_score', 0.0)
                },
                'metadata': p
            })
        
        # Add words
        for w in words:
            vocabulary.append({
                'term': w.get('word', w.get('text', '')),
                'type': 'word',
                'final_score': w.get('final_score', w.get('importance_score', 0.5)),
                'features': {
                    'tfidf': w.get('tfidf_score', 0.0),
                    'length': w.get('word_length_score', 0.0),
                    'morph': w.get('morph_score', 0.0),
                    'coverage': w.get('coverage_penalty', 0.0)
                },
                'metadata': w
            })
        
        return vocabulary
    
    def _shift_scores(self, vocabulary: List[Dict]) -> List[Dict]:
        """
        Bước 6.2: Shift scores
        
        Dịch chuyển tất cả điểm để không có giá trị âm
        
        Formula:
            s'_i = s_i - s_min
        
        Trong đó:
            s_i: final_score gốc
            s_min: điểm thấp nhất
            s'_i: điểm sau shift
        """
        if not vocabulary:
            return vocabulary
        
        # Tìm min score
        all_scores = [v['final_score'] for v in vocabulary]
        s_min = min(all_scores)
        
        print(f"  Min score: {s_min:.4f}")
        
        # Shift
        for v in vocabulary:
            v['final_score_shifted'] = v['final_score'] - s_min
        
        # Log shifted range
        shifted_scores = [v['final_score_shifted'] for v in vocabulary]
        print(f"  Shifted range: [{min(shifted_scores):.4f}, {max(shifted_scores):.4f}]")
        
        return vocabulary
    
    def _normalize_scores(self, vocabulary: List[Dict]) -> List[Dict]:
        """
        Bước 6.3: Normalize scores
        
        Chuẩn hóa tất cả điểm về [0, 1]
        
        Formula:
            s_norm_i = (s'_i - s'_min) / (s'_max - s'_min)
        
        Trong đó:
            s'_i: điểm sau shift
            s'_min: điểm thấp nhất sau shift
            s'_max: điểm cao nhất sau shift
            s_norm_i: điểm chuẩn hóa
        """
        if not vocabulary:
            return vocabulary
        
        # Tìm min và max sau shift
        shifted_scores = [v['final_score_shifted'] for v in vocabulary]
        s_prime_min = min(shifted_scores)
        s_prime_max = max(shifted_scores)
        
        print(f"  Shifted min: {s_prime_min:.4f}")
        print(f"  Shifted max: {s_prime_max:.4f}")
        
        # Normalize
        if s_prime_max > s_prime_min:
            for v in vocabulary:
                v['final_score_normalized'] = (
                    (v['final_score_shifted'] - s_prime_min) / 
                    (s_prime_max - s_prime_min)
                )
        else:
            # Tất cả điểm bằng nhau
            print(f"  ⚠️  All scores are equal, setting to 0.5")
            for v in vocabulary:
                v['final_score_normalized'] = 0.5
        
        # Log normalized range
        normalized_scores = [v['final_score_normalized'] for v in vocabulary]
        print(f"  Normalized range: [{min(normalized_scores):.4f}, {max(normalized_scores):.4f}]")
        
        return vocabulary
    
    def _sort_vocabulary(self, vocabulary: List[Dict]) -> List[Dict]:
        """
        Bước 6.4: Sort vocabulary
        
        Sắp xếp theo final_score_normalized (giảm dần)
        Điểm cao → thấp
        """
        vocabulary.sort(
            key=lambda x: x['final_score_normalized'],
            reverse=True
        )
        
        return vocabulary
    
    def _assign_ranks(self, vocabulary: List[Dict]) -> List[Dict]:
        """
        Bước 6.5: Assign ranks
        
        Gán rank cho mỗi item (1, 2, 3, ...)
        Rank 1 = điểm cao nhất
        """
        for i, v in enumerate(vocabulary, start=1):
            v['rank'] = i
        
        return vocabulary


# ============================================================================
# EXAMPLE USAGE
# ============================================================================

def example_usage():
    """Example usage of VocabularyMergerNormalized"""
    
    # Sample phrases (2 features)
    phrases = [
        {
            'phrase': 'climate change',
            'tfidf_score': 0.75,
            'cohesion_score': 0.68,
            'final_score': 0.6 * 0.75 + 0.4 * 0.68  # 0.722
        },
        {
            'phrase': 'renewable energy',
            'tfidf_score': 0.62,
            'cohesion_score': 0.71,
            'final_score': 0.6 * 0.62 + 0.4 * 0.71  # 0.656
        },
        {
            'phrase': 'global warming',
            'tfidf_score': 0.58,
            'cohesion_score': 0.65,
            'final_score': 0.6 * 0.58 + 0.4 * 0.65  # 0.608
        }
    ]
    
    # Sample words (4 features)
    words = [
        {
            'word': 'deforestation',
            'tfidf_score': 0.68,
            'word_length_score': 0.92,
            'morph_score': 0.85,
            'coverage_penalty': -0.15,
            'final_score': 0.6*0.68 + 0.1*0.92 + 0.3*0.85 + (-0.5)*(-0.15)  # 0.738
        },
        {
            'word': 'biodiversity',
            'tfidf_score': 0.55,
            'word_length_score': 0.83,
            'morph_score': 0.78,
            'coverage_penalty': -0.25,
            'final_score': 0.6*0.55 + 0.1*0.83 + 0.3*0.78 + (-0.5)*(-0.25)  # 0.648
        },
        {
            'word': 'sustainability',
            'tfidf_score': 0.42,
            'word_length_score': 1.0,
            'morph_score': 0.88,
            'coverage_penalty': -0.45,
            'final_score': 0.6*0.42 + 0.1*1.0 + 0.3*0.88 + (-0.5)*(-0.45)  # 0.639
        },
        {
            'word': 'pollution',
            'tfidf_score': 0.38,
            'word_length_score': 0.67,
            'morph_score': 0.62,
            'coverage_penalty': -0.55,
            'final_score': 0.6*0.38 + 0.1*0.67 + 0.3*0.62 + (-0.5)*(-0.55)  # 0.620
        }
    ]
    
    # Initialize merger
    merger = VocabularyMergerNormalized()
    
    # Merge and normalize
    vocabulary = merger.merge_and_normalize(phrases, words, top_k=10)
    
    # Display results
    print("\n" + "="*80)
    print("RESULTS")
    print("="*80)
    print(f"{'Rank':<6} {'Term':<25} {'Type':<10} {'Original':<10} {'Normalized':<12}")
    print("-"*80)
    
    for v in vocabulary:
        print(f"{v['rank']:<6} {v['term']:<25} {v['type']:<10} "
              f"{v['final_score']:<10.3f} {v['final_score_normalized']:<12.3f}")
    
    print("\n" + "="*80)
    print("DONE")
    print("="*80)


if __name__ == "__main__":
    example_usage()
