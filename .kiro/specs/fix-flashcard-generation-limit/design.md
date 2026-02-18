# Design Document: Fix Flashcard Generation Limit

## Overview

This design addresses the flashcard generation bug where only 3 flashcards are returned instead of all vocabulary items (30-100+). The root cause is the `group_by_cluster=True` default parameter in `_stage12_flashcard_generation`, which creates one flashcard per cluster rather than one per vocabulary item.

The fix involves:
1. Changing the default behavior to generate individual flashcards (one per vocabulary item)
2. Implementing proper synonym detection based on embedding similarity (> 0.85)
3. Preserving all vocabulary metadata in the flashcard structure
4. Maintaining backward compatibility with the existing API

## Architecture

### Current Architecture (Buggy)

```
Vocabulary Items (46 items across 3 clusters)
    ↓
_stage12_flashcard_generation(group_by_cluster=True)
    ↓
_group_by_cluster() → Creates 1 flashcard per cluster
    ↓
Result: 3 flashcards (one per cluster)
    - Cluster 0: 1 flashcard with 15 "synonyms" (actually cluster members)
    - Cluster 1: 1 flashcard with 15 "synonyms"
    - Cluster 2: 1 flashcard with 16 "synonyms"
```

### Fixed Architecture

```
Vocabulary Items (46 items)
    ↓
_stage12_flashcard_generation(group_by_cluster=False)
    ↓
For each vocabulary item:
    - Create individual flashcard
    - Compute true synonyms (similarity > 0.85)
    - Preserve all metadata
    ↓
Result: 46 flashcards (one per vocabulary item)
    - Each flashcard has 0-3 true synonyms
    - All vocabulary metadata preserved
```

## Components and Interfaces

### Modified Component: `_stage12_flashcard_generation`

**Location:** `python-api/complete_pipeline_12_stages.py` (lines ~520-570)

**Current Signature:**
```python
def _stage12_flashcard_generation(
    self,
    vocabulary: List[Dict],
    document_title: str,
    similarity_matrix: Optional[Dict] = None,
    group_by_cluster: bool = True  # PROBLEM: Default is True
) -> Dict:
```

**Fixed Signature:**
```python
def _stage12_flashcard_generation(
    self,
    vocabulary: List[Dict],
    document_title: str,
    similarity_matrix: Optional[Dict] = None,
    group_by_cluster: bool = False  # FIXED: Default is False
) -> Dict:
```

**Behavior Change:**
- When `group_by_cluster=False` (new default), create one flashcard per vocabulary item
- When `group_by_cluster=True` (legacy mode), maintain old behavior for backward compatibility

### New Component: `_create_individual_flashcard`

**Purpose:** Create a single flashcard from a vocabulary item with proper synonym detection

**Signature:**
```python
def _create_individual_flashcard(
    self,
    vocab_item: Dict,
    all_vocabulary: List[Dict],
    document_title: str
) -> Dict:
```

**Inputs:**
- `vocab_item`: Single vocabulary item with all metadata
- `all_vocabulary`: Complete vocabulary list for synonym detection
- `document_title`: Document title for context

**Outputs:**
- Flashcard dictionary with all required fields

**Algorithm:**
```python
1. Extract vocabulary item data:
   - word/phrase
   - importance_score
   - cluster_id, cluster_rank, semantic_role
   - supporting_sentence
   - embedding/cluster_centroid

2. Find true synonyms:
   - Compute cosine similarity with all other vocabulary items
   - Filter items with similarity > 0.85
   - Exclude the current item itself
   - Sort by similarity (descending)
   - Take top 5 synonyms

3. Generate cluster name:
   - Use existing _generate_cluster_name() method
   - Based on top terms in the same cluster

4. Get IPA phonetics:
   - Use existing _get_ipa_phonetics() method
   - Returns IPA string or empty string

5. Generate audio URLs:
   - Use existing _generate_audio_url() method
   - Create URLs for word and example sentence

6. Build flashcard structure:
   - All required fields (word, phonetic, definition, example, etc.)
   - True synonyms array (similarity > 0.85)
   - Cluster metadata (cluster_id, cluster_name, semantic_role)
   - Importance score and other metadata

7. Return complete flashcard
```

### Modified Component: `_group_synonyms`

**Current Behavior:** Groups vocabulary items by similarity, creating one flashcard per group

**Fixed Behavior:** No longer used in default mode (kept for backward compatibility)

**Note:** This method will only be called when `group_by_cluster=True` (legacy mode)

### Helper Component: `_compute_synonym_similarity`

**Purpose:** Compute cosine similarity between a vocabulary item and all others

**Signature:**
```python
def _compute_synonym_similarity(
    self,
    vocab_item: Dict,
    all_vocabulary: List[Dict],
    threshold: float = 0.85
) -> List[Dict]:
```

**Algorithm:**
```python
1. Extract embedding from vocab_item:
   - Use 'cluster_centroid' or 'embedding' field
   - Convert to numpy array if needed

2. Extract embeddings from all_vocabulary:
   - Build list of embeddings
   - Convert to numpy array (N x D)

3. Compute cosine similarity:
   - Use sklearn.metrics.pairwise.cosine_similarity
   - Result: array of similarity scores

4. Filter by threshold:
   - Keep items with similarity > threshold
   - Exclude the current item (similarity = 1.0)

5. Sort by similarity (descending)

6. Return list of synonym dictionaries:
   - Each contains: word, similarity score
```

## Data Models

### Vocabulary Item Structure (Input)

```python
{
    'phrase': str,                    # The vocabulary term
    'word': str,                      # Alternative field name
    'importance_score': float,        # 0.0 - 1.0
    'cluster_id': int,                # Cluster assignment
    'cluster_rank': int,              # Rank within cluster
    'semantic_role': str,             # 'core', 'umbrella', 'supporting'
    'supporting_sentence': str,       # Context sentence from document
    'cluster_centroid': List[float],  # Embedding vector (384-dim)
    'embedding': List[float],         # Alternative embedding field
    'tfidf_score': float,             # TF-IDF score
    'frequency': int,                 # Term frequency
    'is_representative': bool,        # Is cluster representative
    'centroid_similarity': float      # Similarity to cluster centroid
}
```

### Flashcard Structure (Output)

```python
{
    'id': str,                        # Unique ID: f"fc_{cluster_id}_{rank}"
    'word': str,                      # Primary vocabulary term
    'synonyms': List[Dict],           # True synonyms (similarity > 0.85)
    
    # Cluster information
    'cluster_id': int,
    'cluster_name': str,              # Generated from top cluster terms
    'cluster_rank': int,
    'semantic_role': str,
    'importance_score': float,
    
    # Definition and example
    'meaning': str,                   # Definition or description
    'definition_source': str,         # 'generated' or 'dictionary'
    'example': str,                   # Context sentence (max 200 chars)
    'example_source': str,            # 'document'
    
    # Phonetics
    'ipa': str,                       # IPA transcription
    'ipa_uk': str,                    # UK pronunciation
    'ipa_us': str,                    # US pronunciation
    
    # Audio
    'audio_word_url': str,            # Audio URL for word
    'audio_example_url': str,         # Audio URL for example
    
    # Metadata
    'word_type': str,                 # 'phrase' or 'word'
    'difficulty': str,                # 'beginner', 'intermediate', 'advanced'
    'tags': List[str],                # Tags for categorization
    'related_words': List[Dict]       # Related words from same cluster
}
```

### Synonym Structure

```python
{
    'word': str,                      # Synonym term
    'similarity': float               # Cosine similarity (0.85 - 1.0)
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*


### Property Reflection

After analyzing all acceptance criteria, I identified the following testable properties and their relationships:

**Core Properties:**
1. Flashcard count equals vocabulary count (1.1)
2. All vocabulary metadata preserved (1.4) - This is a comprehensive property that subsumes several specific field checks
3. Synonym similarity threshold enforcement (3.2, 3.3)
4. Synonym array excludes low-similarity cluster members (3.4)

**Specific Field Properties (subsumed by Property 2):**
- 2.1 (word field) - Covered by metadata preservation
- 2.2 (IPA field) - Covered by metadata preservation
- 2.3 (meaning field) - Covered by metadata preservation
- 2.4 (example field) - Covered by metadata preservation
- 2.5 (importance_score field) - Covered by metadata preservation
- 2.6 (cluster metadata) - Covered by metadata preservation
- 6.1-6.4 (specific field preservation) - All covered by metadata preservation

**Redundancy Analysis:**
- Properties 2.1-2.6 and 6.1-6.4 all test specific field preservation, which is comprehensively covered by Property 2 (metadata preservation)
- Property 1.3 is logically equivalent to Property 1.1 (if N items → N flashcards, then each item has exactly one flashcard)
- Properties 3.2 and 3.3 can be combined into a single comprehensive property about synonym detection

**Final Property Set (after eliminating redundancy):**
1. Flashcard count equals vocabulary count
2. Metadata preservation (comprehensive field checking)
3. Synonym similarity threshold (combined 3.2 and 3.3)
4. Synonym array correctness (excludes low-similarity items)

### Correctness Properties

Property 1: One-to-one flashcard generation
*For any* vocabulary list of size N, generating flashcards should produce exactly N flashcards, where each vocabulary item corresponds to exactly one flashcard.
**Validates: Requirements 1.1, 1.3**

Property 2: Complete metadata preservation
*For any* vocabulary item, the generated flashcard should contain all essential metadata fields including: word/phrase, importance_score, cluster_id, cluster_rank, semantic_role, supporting_sentence, IPA phonetics, meaning, example, audio URLs, word_type, difficulty, and tags.
**Validates: Requirements 1.4, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 6.1, 6.2, 6.3, 6.4**

Property 3: Synonym similarity threshold enforcement
*For any* flashcard, all items in the synonyms array should have cosine similarity > 0.85 with the primary word, and conversely, any vocabulary item with similarity > 0.85 should appear in the synonyms array (up to a reasonable limit like top 5).
**Validates: Requirements 3.2, 3.3**

Property 4: Synonym array excludes low-similarity cluster members
*For any* flashcard from a cluster with low-similarity items (items with similarity < 0.85), the synonym count should be less than the total cluster size minus one, demonstrating that not all cluster members are included as synonyms.
**Validates: Requirements 3.4**

Property 5: Flashcard structure completeness
*For any* generated flashcard, the structure should contain all required top-level keys: id, word, synonyms, cluster_id, cluster_name, cluster_rank, semantic_role, importance_score, meaning, definition_source, example, example_source, ipa, ipa_uk, ipa_us, audio_word_url, audio_example_url, word_type, difficulty, tags, and related_words.
**Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 4.3, 4.4**

## Error Handling

### Missing Embeddings

**Scenario:** Vocabulary item lacks embedding data (no 'cluster_centroid' or 'embedding' field)

**Handling:**
```python
if 'cluster_centroid' not in vocab_item and 'embedding' not in vocab_item:
    # Cannot compute synonyms without embeddings
    # Create flashcard with empty synonyms array
    synonyms = []
    # Log warning
    print(f"⚠️  No embedding found for '{word}' - skipping synonym detection")
```

### IPA Library Not Available

**Scenario:** `eng_to_ipa` library not installed or conversion fails

**Handling:**
```python
try:
    import eng_to_ipa as ipa
    ipa_text = ipa.convert(word)
except ImportError:
    ipa_text = ""  # Empty string when library unavailable
except Exception as e:
    ipa_text = ""  # Empty string on conversion error
    print(f"⚠️  IPA conversion failed for '{word}': {e}")
```

### Missing Supporting Sentence

**Scenario:** Vocabulary item has no 'supporting_sentence' field

**Handling:**
```python
example = vocab_item.get('supporting_sentence', '')
if not example:
    # Use empty string for example
    example = ''
    audio_example_url = None  # No audio for empty example
```

### Cluster Name Generation Failure

**Scenario:** Cannot generate cluster name (empty cluster or missing data)

**Handling:**
```python
cluster_name = self._generate_cluster_name(cluster_id, all_vocabulary)
if not cluster_name or cluster_name == f"Topic {cluster_id + 1}":
    # Fallback to generic name
    cluster_name = f"Topic {cluster_id + 1}"
```

### Similarity Computation Errors

**Scenario:** Embedding dimension mismatch or numpy errors during similarity computation

**Handling:**
```python
try:
    similarity_matrix = cosine_similarity(embeddings_array)
except Exception as e:
    print(f"⚠️  Similarity computation failed: {e}")
    # Return empty synonyms for this item
    return []
```

## Testing Strategy

### Dual Testing Approach

This fix requires both unit tests and property-based tests to ensure comprehensive coverage:

**Unit Tests** - Focus on specific examples and edge cases:
- Test with a known vocabulary list (e.g., 5 items) and verify 5 flashcards are generated
- Test with vocabulary items that have no embeddings
- Test with vocabulary items that have no supporting_sentence
- Test synonym detection with manually crafted embeddings (known similarities)
- Test cluster name generation with various cluster configurations
- Test IPA generation with and without the library available

**Property-Based Tests** - Verify universal properties across all inputs:
- Property 1: Flashcard count equals vocabulary count (100+ iterations)
- Property 2: Metadata preservation (100+ iterations)
- Property 3: Synonym similarity threshold (100+ iterations)
- Property 4: Synonym array correctness (100+ iterations)
- Property 5: Flashcard structure completeness (100+ iterations)

### Property Test Configuration

**Library:** Use `hypothesis` for Python property-based testing

**Minimum Iterations:** 100 per property test (due to randomization)

**Test Tags:** Each property test must reference its design document property
- Format: `# Feature: fix-flashcard-generation-limit, Property 1: One-to-one flashcard generation`

**Generator Strategy:**
- Generate random vocabulary lists with varying sizes (1-100 items)
- Generate random embeddings (384-dimensional vectors)
- Generate random metadata (importance scores, cluster IDs, etc.)
- Ensure some items have high similarity (> 0.85) for synonym testing
- Ensure some items have low similarity (< 0.85) for negative testing

### Integration Testing

**End-to-End Test:**
1. Upload a real document to the API
2. Process through the complete 12-stage pipeline
3. Verify flashcard count matches vocabulary count
4. Verify all flashcards have required fields
5. Verify synonyms have similarity > 0.85
6. Verify frontend can display all flashcards without errors

**Performance Test:**
1. Generate a large vocabulary list (100 items)
2. Measure flashcard generation time
3. Verify completion within 10 seconds
4. Check memory usage remains reasonable

### Test Data

**Sample Vocabulary Item:**
```python
{
    'phrase': 'climate change',
    'importance_score': 0.92,
    'cluster_id': 0,
    'cluster_rank': 1,
    'semantic_role': 'core',
    'supporting_sentence': 'Climate change is affecting global temperatures.',
    'cluster_centroid': [0.1, 0.2, ..., 0.3],  # 384-dim vector
    'tfidf_score': 0.85,
    'frequency': 5,
    'is_representative': True,
    'centroid_similarity': 0.95
}
```

**Expected Flashcard Output:**
```python
{
    'id': 'fc_0_1',
    'word': 'climate change',
    'synonyms': [
        {'word': 'global warming', 'similarity': 0.89}
    ],
    'cluster_id': 0,
    'cluster_name': 'Climate Change & Environmental Science',
    'cluster_rank': 1,
    'semantic_role': 'core',
    'importance_score': 0.92,
    'meaning': 'Academic term from Climate Change Document',
    'definition_source': 'generated',
    'example': 'Climate change is affecting global temperatures.',
    'example_source': 'document',
    'ipa': 'ˈklaɪmət ʧeɪnʤ',
    'ipa_uk': 'ˈklaɪmət ʧeɪnʤ',
    'ipa_us': 'ˈklaɪmət ʧeɪnʤ',
    'audio_word_url': 'https://translate.google.com/translate_tts?...',
    'audio_example_url': 'https://translate.google.com/translate_tts?...',
    'word_type': 'phrase',
    'difficulty': 'advanced',
    'tags': ['climate change & environmental science', 'phrase'],
    'related_words': [
        {'word': 'greenhouse gases', 'similarity': 0.82},
        {'word': 'carbon emissions', 'similarity': 0.78}
    ]
}
```

## Implementation Notes

### Code Changes Required

**File:** `python-api/complete_pipeline_12_stages.py`

**Changes:**
1. Line ~520: Change `group_by_cluster: bool = True` to `group_by_cluster: bool = False`
2. Lines ~530-550: Add new logic for individual flashcard generation mode
3. Add new method `_create_individual_flashcard()` (after line ~700)
4. Add new method `_compute_synonym_similarity()` (after `_create_individual_flashcard`)

### Backward Compatibility

The fix maintains backward compatibility by:
1. Keeping the `group_by_cluster` parameter (just changing the default)
2. Preserving the old behavior when `group_by_cluster=True`
3. Maintaining the same flashcard structure (all fields present)
4. Keeping the same API response format

If any code explicitly calls `_stage12_flashcard_generation(group_by_cluster=True)`, it will continue to work with the old behavior.

### Migration Path

**For existing deployments:**
1. Deploy the fix (changes default behavior)
2. Test with sample documents
3. Verify frontend displays all flashcards correctly
4. Monitor for any issues
5. No database migration needed (flashcards are generated on-the-fly)

**For users:**
- No action required
- Existing documents will automatically generate more flashcards on next processing
- No data loss or corruption

## Performance Considerations

### Time Complexity

**Current (buggy) implementation:**
- O(N) for grouping by cluster (N = vocabulary size)
- O(C) for flashcard generation (C = cluster count, typically 3-5)
- Total: O(N + C) ≈ O(N)

**Fixed implementation:**
- O(N) for iterating through vocabulary
- O(N²) for computing pairwise similarities (worst case)
- O(N log N) for sorting synonyms
- Total: O(N²) worst case, but with optimizations:
  - Only compute similarities for items in same cluster: O(N × M) where M = avg cluster size
  - Use vectorized operations: significant constant factor improvement
  - Limit synonym count to top 5: reduces sorting overhead

**Expected performance:**
- 46 items: < 1 second
- 100 items: < 5 seconds
- 200 items: < 15 seconds

### Memory Usage

**Current:** O(C) flashcards in memory (C = cluster count)

**Fixed:** O(N) flashcards in memory (N = vocabulary size)

**Impact:** For 100 items, memory usage increases from ~3 flashcards to ~100 flashcards
- Each flashcard: ~2-3 KB
- 100 flashcards: ~200-300 KB
- Acceptable for modern systems

### Optimization Opportunities

1. **Vectorized similarity computation:** Use numpy/sklearn for batch operations
2. **Cluster-based filtering:** Only compute similarities within same cluster
3. **Caching:** Cache embeddings to avoid recomputation
4. **Parallel processing:** Use multiprocessing for large vocabulary lists (future enhancement)

## Deployment Considerations

### Testing Before Deployment

1. Run all unit tests
2. Run all property-based tests (100+ iterations each)
3. Test with sample documents of varying sizes
4. Verify frontend compatibility
5. Check API response times

### Rollback Plan

If issues arise after deployment:
1. Revert the default parameter change: `group_by_cluster: bool = True`
2. Redeploy the previous version
3. Investigate issues
4. Fix and redeploy

### Monitoring

After deployment, monitor:
1. API response times (should remain < 10 seconds for 100 items)
2. Error rates (should not increase)
3. Flashcard counts in responses (should match vocabulary counts)
4. User feedback (verify users see all flashcards)

## Future Enhancements

1. **Configurable synonym threshold:** Allow users to adjust the 0.85 threshold
2. **Synonym ranking:** Rank synonyms by similarity and relevance
3. **Definition enrichment:** Use external APIs (WordNet, Oxford) for better definitions
4. **Audio generation:** Generate actual audio files instead of using Google TTS URLs
5. **Spaced repetition:** Add SRS metadata to flashcards for learning optimization
6. **User customization:** Allow users to edit flashcards and add personal notes
