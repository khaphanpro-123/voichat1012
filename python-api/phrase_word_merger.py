"""
STAGE 8 – Merge Phrase & Word

Mục tiêu:
- Hòa nhập phrase và single-word outputs
- Phrase luôn ưu tiên
- Word chỉ bổ sung
- Không trùng nghĩa
- Output có thứ tự: Phrases first, then Words

Nguyên tắc:
1. Phrase luôn giữ
2. Word chỉ bổ sung
3. IF sim(word, phrase) ≥ γ → DROP word
4. Output order: Phrases (by cluster/topic), then Words (by POS)

Author: Kiro AI
Date: 2026-02-07
"""

import numpy as np
from typing import List, Dict, Tuple, Optional
from collections import defaultdict

try:
    from sentence_transformers import SentenceTransformer
    HAS_EMBEDDINGS = True
except:
    HAS_EMBEDDINGS = False
    print("⚠️  sentence-transformers not available. Semantic deduplication disabled.")


class PhraseSingleWordMerger:
    """
    Merge phrases and single words into unified vocabulary output
    
    Rules:
    - Phrase > Word (always)
    - No semantic overlap
    - Maintain quality and diversity
    - Proper ordering
    """
    
    def __init__(self, similarity_threshold: float = 0.8):
        """
        Initialize merger
        
        Args:
            similarity_threshold: Threshold for semantic overlap (γ)
        """
        self.similarity_threshold = similarity_threshold
        self.embedding_model = None
    
    def merge(
        self,
        phrases: List[Dict],
        single_words: List[Dict],
        max_total: int = 50,
        phrase_ratio: float = 0.7
    ) -> Dict:
        """
        Merge phrases and single words
        
        Args:
            phrases: List of phrase dictionaries
            single_words: List of single word dictionaries
            max_total: Maximum total vocabulary items
            phrase_ratio: Ratio of phrases in output (0.7 = 70% phrases, 30% words)
        
        Returns:
            Merged vocabulary with metadata
        """
        print(f"\n{'='*80}")
        print(f"PHRASE & SINGLE-WORD MERGER")
        print(f"{'='*80}\n")
        
        print(f"[INPUT]")
        print(f"  Phrases: {len(phrases)}")
        print(f"  Single words: {len(single_words)}")
        print(f"  Max total: {max_total}")
        print(f"  Phrase ratio: {phrase_ratio*100:.0f}%")
        
        # ====================================================================
        # STEP 1: Keep ALL Phrases (No Limit)
        # ====================================================================
        print(f"\n[STEP 1] Keep ALL Phrases...")
        
        # Keep ALL phrases (no max limit)
        kept_phrases = phrases  # Keep ALL
        
        print(f"  ✓ Keeping ALL {len(kept_phrases)} phrases (100%)")
        
        # ====================================================================
        # STEP 2: Remove Semantic Overlap (DISABLED - Keep ALL words)
        # ====================================================================
        print(f"\n[STEP 2] Remove Semantic Overlap - DISABLED")
        
        # DISABLED: Keep ALL words, no overlap removal
        # non_overlapping_words = self._remove_overlap(
        #     kept_phrases,
        #     single_words,
        #     threshold=self.similarity_threshold
        # )
        non_overlapping_words = single_words  # Keep ALL words
        
        print(f"  ✓ Keeping ALL {len(non_overlapping_words)} words (overlap check disabled)")
        print(f"  ℹ️  No semantic filtering - all words retained")
        
        # ====================================================================
        # STEP 3: Keep ALL Words (No Limit)
        # ====================================================================
        print(f"\n[STEP 3] Keep ALL Words...")
        
        # Keep ALL words (no max limit)
        kept_words = non_overlapping_words  # Keep ALL
        
        print(f"  ✓ Keeping ALL {len(kept_words)} single words (100%)")
        
        # ====================================================================
        # STEP 4: Order Output
        # ====================================================================
        print(f"\n[STEP 4] Order Output...")
        
        # Group phrases by cluster/topic (if available)
        grouped_phrases = self._group_phrases(kept_phrases)
        
        # Group words by POS (if available)
        grouped_words = self._group_words(kept_words)
        
        # Combine
        merged_vocabulary = []
        
        # Add phrases first (by cluster)
        for cluster_id, cluster_phrases in grouped_phrases.items():
            for phrase in cluster_phrases:
                phrase['type'] = 'phrase'
                phrase['cluster'] = cluster_id
                merged_vocabulary.append(phrase)
        
        # Add words second (by POS)
        for pos, pos_words in grouped_words.items():
            for word in pos_words:
                word['type'] = 'single_word'
                word['pos_group'] = pos
                merged_vocabulary.append(word)
        
        print(f"  ✓ Ordered output: {len(merged_vocabulary)} items")
        
        # ====================================================================
        # STEP 5: Add Metadata
        # ====================================================================
        print(f"\n[STEP 5] Add Metadata...")
        
        result = {
            'vocabulary': merged_vocabulary,
            'total_count': len(merged_vocabulary),
            'phrase_count': len(kept_phrases),
            'word_count': len(kept_words),
            'phrase_percentage': (len(kept_phrases) / len(merged_vocabulary) * 100) if merged_vocabulary else 0,
            'word_percentage': (len(kept_words) / len(merged_vocabulary) * 100) if merged_vocabulary else 0,
            'overlap_removed': len(single_words) - len(non_overlapping_words),
            'statistics': {
                'input_phrases': len(phrases),
                'input_words': len(single_words),
                'kept_phrases': len(kept_phrases),
                'kept_words': len(kept_words),
                'total_output': len(merged_vocabulary)
            }
        }
        
        print(f"  ✓ Metadata added")
        
        print(f"\n{'='*80}")
        print(f"MERGE COMPLETE")
        print(f"  Total vocabulary: {result['total_count']}")
        print(f"  Phrases: {result['phrase_count']} ({result['phrase_percentage']:.1f}%)")
        print(f"  Single words: {result['word_count']} ({result['word_percentage']:.1f}%)")
        print(f"  Overlap removed: {result['overlap_removed']}")
        print(f"{'='*80}\n")
        
        return result
    
    def _remove_overlap(
        self,
        phrases: List[Dict],
        words: List[Dict],
        threshold: float = 0.8
    ) -> List[Dict]:
        """
        Remove words that semantically overlap with phrases
        
        IF sim(word, phrase) ≥ γ → DROP word
        """
        # Load embedding model if not loaded
        if HAS_EMBEDDINGS and self.embedding_model is None:
            try:
                self.embedding_model = SentenceTransformer('all-MiniLM-L6-v2')
            except:
                print("  ⚠️  Embedding model not available, using lexical overlap only")
                return self._lexical_overlap_removal(phrases, words)
        
        if not HAS_EMBEDDINGS:
            return self._lexical_overlap_removal(phrases, words)
        
        # Encode phrases
        phrase_texts = [
            p.get('phrase', p.get('word', ''))
            for p in phrases
        ]
        phrase_embeddings = self.embedding_model.encode(phrase_texts)
        
        # Filter words
        non_overlapping = []
        
        for word_dict in words:
            word = word_dict.get('word', '')
            
            # Encode word
            word_embedding = self.embedding_model.encode([word])[0]
            
            # Check similarity with all phrases
            max_similarity = 0.0
            
            for phrase_emb in phrase_embeddings:
                similarity = np.dot(word_embedding, phrase_emb) / (
                    np.linalg.norm(word_embedding) * np.linalg.norm(phrase_emb)
                )
                max_similarity = max(max_similarity, similarity)
            
            # Keep if below threshold
            if max_similarity < threshold:
                word_dict['max_phrase_similarity'] = float(max_similarity)
                non_overlapping.append(word_dict)
        
        return non_overlapping
    
    def _lexical_overlap_removal(
        self,
        phrases: List[Dict],
        words: List[Dict]
    ) -> List[Dict]:
        """
        Fallback: Remove words using lexical overlap
        
        If word appears in any phrase → DROP
        """
        # Extract all phrase tokens
        phrase_tokens = set()
        
        for phrase_dict in phrases:
            phrase = phrase_dict.get('phrase', phrase_dict.get('word', ''))
            tokens = phrase.lower().split()
            phrase_tokens.update(tokens)
        
        # Filter words
        non_overlapping = []
        
        for word_dict in words:
            word = word_dict.get('word', '').lower()
            
            # Check if word is in any phrase
            if word not in phrase_tokens:
                non_overlapping.append(word_dict)
        
        return non_overlapping
    
    def _group_phrases(self, phrases: List[Dict]) -> Dict[str, List[Dict]]:
        """
        Group phrases by cluster/topic
        
        If cluster info available, group by cluster
        Otherwise, group by heading or score range
        """
        grouped = defaultdict(list)
        
        for phrase in phrases:
            # Try to get cluster ID
            cluster_id = phrase.get('cluster', phrase.get('cluster_id', 'default'))
            
            # If no cluster, group by score range
            if cluster_id == 'default':
                score = phrase.get('importance_score', phrase.get('finalScore', 0))
                if score >= 0.8:
                    cluster_id = 'high_importance'
                elif score >= 0.6:
                    cluster_id = 'medium_importance'
                else:
                    cluster_id = 'low_importance'
            
            grouped[cluster_id].append(phrase)
        
        return grouped
    
    def _group_words(self, words: List[Dict]) -> Dict[str, List[Dict]]:
        """
        Group words by POS (NOUN, VERB, ADJ)
        """
        grouped = defaultdict(list)
        
        for word in words:
            pos = word.get('pos', 'NOUN')  # Default to NOUN
            grouped[pos].append(word)
        
        return grouped
    
    def validate_output(self, merged_result: Dict) -> Dict:
        """
        Validate merged output
        
        Checks:
        1. Phrase ratio ≥ 60%
        2. No duplicates
        3. All items have required fields
        4. Scores are valid
        """
        vocabulary = merged_result['vocabulary']
        
        # Check 1: Phrase ratio
        phrase_percentage = merged_result['phrase_percentage']
        phrase_ratio_ok = phrase_percentage >= 60.0
        
        # Check 2: No duplicates
        texts = [
            v.get('phrase', v.get('word', ''))
            for v in vocabulary
        ]
        duplicates = len(texts) - len(set(texts))
        no_duplicates = duplicates == 0
        
        # Check 3: Required fields
        required_fields = ['type', 'importance_score']
        all_have_fields = all(
            all(field in v for field in required_fields)
            for v in vocabulary
        )
        
        # Check 4: Valid scores
        scores = [
            v.get('importance_score', 0)
            for v in vocabulary
        ]
        valid_scores = all(0 <= s <= 1 for s in scores)
        
        # Overall validation
        valid = (
            phrase_ratio_ok and
            no_duplicates and
            all_have_fields and
            valid_scores
        )
        
        return {
            'valid': valid,
            'phrase_ratio_ok': phrase_ratio_ok,
            'phrase_percentage': phrase_percentage,
            'no_duplicates': no_duplicates,
            'duplicate_count': duplicates,
            'all_have_fields': all_have_fields,
            'valid_scores': valid_scores,
            'issues': self._get_validation_issues(
                phrase_ratio_ok,
                no_duplicates,
                all_have_fields,
                valid_scores
            )
        }
    
    def _get_validation_issues(
        self,
        phrase_ratio_ok: bool,
        no_duplicates: bool,
        all_have_fields: bool,
        valid_scores: bool
    ) -> List[str]:
        """Get list of validation issues"""
        issues = []
        
        if not phrase_ratio_ok:
            issues.append("Phrase ratio < 60%")
        
        if not no_duplicates:
            issues.append("Duplicate items found")
        
        if not all_have_fields:
            issues.append("Missing required fields")
        
        if not valid_scores:
            issues.append("Invalid scores (not in [0, 1])")
        
        return issues


# ============================================================================
# TESTING
# ============================================================================

if __name__ == "__main__":
    print("=" * 80)
    print("TESTING PHRASE & SINGLE-WORD MERGER")
    print("=" * 80)
    
    # Mock phrases
    test_phrases = [
        {'phrase': 'climate change', 'importance_score': 0.95, 'cluster': 'environment'},
        {'phrase': 'environmental protection', 'importance_score': 0.90, 'cluster': 'environment'},
        {'phrase': 'fossil fuels', 'importance_score': 0.85, 'cluster': 'energy'},
        {'phrase': 'greenhouse gases', 'importance_score': 0.85, 'cluster': 'environment'},
        {'phrase': 'global warming', 'importance_score': 0.80, 'cluster': 'environment'},
        {'phrase': 'renewable energy', 'importance_score': 0.80, 'cluster': 'energy'},
        {'phrase': 'carbon emissions', 'importance_score': 0.75, 'cluster': 'environment'},
        {'phrase': 'sustainable development', 'importance_score': 0.75, 'cluster': 'sustainability'}
    ]
    
    # Mock single words
    test_words = [
        {'word': 'deforestation', 'importance_score': 0.85, 'pos': 'NOUN', 'idf_score': 3.5},
        {'word': 'photosynthesis', 'importance_score': 0.80, 'pos': 'NOUN', 'idf_score': 4.0},
        {'word': 'biodiversity', 'importance_score': 0.78, 'pos': 'NOUN', 'idf_score': 3.8},
        {'word': 'sustainability', 'importance_score': 0.75, 'pos': 'NOUN', 'idf_score': 3.2},
        {'word': 'urbanization', 'importance_score': 0.72, 'pos': 'NOUN', 'idf_score': 3.0},
        {'word': 'industrialization', 'importance_score': 0.70, 'pos': 'NOUN', 'idf_score': 3.1},
        {'word': 'ecosystem', 'importance_score': 0.68, 'pos': 'NOUN', 'idf_score': 2.9},
        {'word': 'atmosphere', 'importance_score': 0.65, 'pos': 'NOUN', 'idf_score': 2.7}
    ]
    
    # Initialize merger
    merger = PhraseSingleWordMerger(similarity_threshold=0.8)
    
    # Merge
    result = merger.merge(
        phrases=test_phrases,
        single_words=test_words,
        max_total=12,
        phrase_ratio=0.7
    )
    
    print("\n📊 MERGED VOCABULARY:")
    print("-" * 80)
    
    # Show phrases
    print("\n🔹 PHRASES:")
    for i, item in enumerate(result['vocabulary'], 1):
        if item['type'] == 'phrase':
            print(f"{i}. {item['phrase']} (score: {item['importance_score']:.3f}, cluster: {item.get('cluster', 'N/A')})")
    
    # Show words
    print("\n🔹 SINGLE WORDS:")
    for i, item in enumerate(result['vocabulary'], 1):
        if item['type'] == 'single_word':
            print(f"{i}. {item['word']} (score: {item['importance_score']:.3f}, pos: {item.get('pos_group', 'N/A')})")
    
    print("\n📊 STATISTICS:")
    print("-" * 80)
    print(f"Total: {result['total_count']}")
    print(f"Phrases: {result['phrase_count']} ({result['phrase_percentage']:.1f}%)")
    print(f"Words: {result['word_count']} ({result['word_percentage']:.1f}%)")
    print(f"Overlap removed: {result['overlap_removed']}")
    
    # Validate
    print("\n📊 VALIDATION:")
    print("-" * 80)
    validation = merger.validate_output(result)
    print(f"Valid: {validation['valid']}")
    print(f"Phrase ratio OK: {validation['phrase_ratio_ok']} ({validation['phrase_percentage']:.1f}%)")
    print(f"No duplicates: {validation['no_duplicates']}")
    print(f"All have fields: {validation['all_have_fields']}")
    print(f"Valid scores: {validation['valid_scores']}")
    
    if validation['issues']:
        print(f"\nIssues:")
        for issue in validation['issues']:
            print(f"  - {issue}")
    
    print("\n✅ Test completed!")
