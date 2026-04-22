from typing import List, Dict, Optional
import numpy as np
class VocabularyMergerNormalized:
    def __init__(self):
        pass
    def merge_and_normalize(
        self,
        phrases: List[Dict],
        words: List[Dict],
        top_k: Optional[int] = None
    ) -> List[Dict]:
        print(f"\n{'='*80}")
        print(f"BƯỚC 6: SCORE NORMALIZATION & RANKING")
        print(f"{'='*80}\n")
        
        print(f"[INPUT]")
        print(f"  Phrases: {len(phrases)}")
        print(f"  Words: {len(words)}")
        if top_k:
            print(f"  Top-K: {top_k}")
        print(f"\n[6.1] Merging phrases and words...")
        vocabulary = self._merge(phrases, words)
        print(f"   Merged: {len(vocabulary)} items")
        print(f"\n[6.2] Shifting scores...")
        vocabulary = self._shift_scores(vocabulary)
        print(f"   Shifted scores")
        print(f"\n[6.3] Normalizing scores...")
        vocabulary = self._normalize_scores(vocabulary)
        print(f"   Normalized scores to [0, 1]")
        print(f"\n[6.4] Sorting by normalized score...")
        vocabulary = self._sort_vocabulary(vocabulary)
        print(f"   Sorted (high → low)")
        print(f"\n[6.5] Assigning ranks...")
        vocabulary = self._assign_ranks(vocabulary)
        print(f"   Assigned ranks")
        if top_k is not None and len(vocabulary) > top_k:
            print(f"\n[6.6] Keeping top {top_k} items...")
            vocabulary = vocabulary[:top_k]
            print(f"  Kept top {top_k}")
        print(f"\n{'='*80}")
        print(f"BƯỚC 6 COMPLETE")
        print(f"  Total vocabulary: {len(vocabulary)}")
        if vocabulary:
            print(f"  Top item: {vocabulary[0]['term']} (score: {vocabulary[0]['final_score_normalized']:.3f})")
            print(f"  Bottom item: {vocabulary[-1]['term']} (score: {vocabulary[-1]['final_score_normalized']:.3f})")
        print(f"{'='*80}\n")
        return vocabulary
    def _merge(self, phrases: List[Dict], words: List[Dict]) -> List[Dict]:
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
            print(f"    All scores are equal, setting to 0.5")
            for v in vocabulary:
                v['final_score_normalized'] = 0.5
        # Log normalized range
        normalized_scores = [v['final_score_normalized'] for v in vocabulary]
        print(f"  Normalized range: [{min(normalized_scores):.4f}, {max(normalized_scores):.4f}]")
        return vocabulary
    def _sort_vocabulary(self, vocabulary: List[Dict]) -> List[Dict]:
        vocabulary.sort(
            key=lambda x: x['final_score_normalized'],
            reverse=True
        )
        return vocabulary
    def _assign_ranks(self, vocabulary: List[Dict]) -> List[Dict]:
        for i, v in enumerate(vocabulary, start=1):
            v['rank'] = i
        
        return vocabulary
def example_usage():
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
