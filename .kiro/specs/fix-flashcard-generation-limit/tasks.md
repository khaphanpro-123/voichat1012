# Implementation Plan: Fix Flashcard Generation Limit

## Overview

This implementation plan fixes the flashcard generation bug by changing the default behavior from cluster-based grouping (3 flashcards) to individual flashcard generation (one per vocabulary item). The fix involves modifying the `_stage12_flashcard_generation` method and adding new helper methods for individual flashcard creation and synonym detection.

## Tasks

- [ ] 1. Change default parameter in _stage12_flashcard_generation
  - Modify line ~520 in `python-api/complete_pipeline_12_stages.py`
  - Change `group_by_cluster: bool = True` to `group_by_cluster: bool = False`
  - This makes individual flashcard generation the default behavior
  - _Requirements: 1.1, 1.3_

- [ ] 2. Implement individual flashcard generation logic
  - [ ] 2.1 Add conditional logic in _stage12_flashcard_generation method
    - After line ~530, add check for `group_by_cluster` parameter
    - If False, use new individual generation path
    - If True, use existing cluster grouping path (backward compatibility)
    - _Requirements: 1.1, 4.1_
  
  - [ ] 2.2 Implement _create_individual_flashcard method
    - Create new method after line ~700
    - Extract vocabulary item data (word, importance_score, cluster info, etc.)
    - Call _compute_synonym_similarity to find true synonyms
    - Generate cluster name using existing _generate_cluster_name
    - Get IPA phonetics using existing _get_ipa_phonetics
    - Generate audio URLs using existing _generate_audio_url
    - Build complete flashcard structure with all required fields
    - Return flashcard dictionary
    - _Requirements: 1.4, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_
  
  - [ ]* 2.3 Write property test for one-to-one flashcard generation
    - **Property 1: One-to-one flashcard generation**
    - **Validates: Requirements 1.1, 1.3**
    - Generate random vocabulary lists of varying sizes (1-100 items)
    - Call flashcard generation with group_by_cluster=False
    - Assert flashcard count equals vocabulary count
    - Run 100+ iterations with hypothesis
  
  - [ ]* 2.4 Write property test for metadata preservation
    - **Property 2: Complete metadata preservation**
    - **Validates: Requirements 1.4, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 6.1, 6.2, 6.3, 6.4**
    - Generate random vocabulary items with all metadata fields
    - Generate flashcards
    - Assert all essential fields are present in flashcards
    - Assert field values match vocabulary item values
    - Run 100+ iterations with hypothesis

- [ ] 3. Implement synonym detection with similarity threshold
  - [ ] 3.1 Implement _compute_synonym_similarity method
    - Create new method after _create_individual_flashcard
    - Extract embedding from vocab_item (cluster_centroid or embedding field)
    - Extract embeddings from all_vocabulary
    - Convert to numpy arrays
    - Compute cosine similarity using sklearn
    - Filter items with similarity > 0.85
    - Exclude the current item itself (similarity = 1.0)
    - Sort by similarity descending
    - Return top 5 synonyms with similarity scores
    - _Requirements: 3.1, 3.2, 3.3_
  
  - [ ]* 3.2 Write property test for synonym similarity threshold
    - **Property 3: Synonym similarity threshold enforcement**
    - **Validates: Requirements 3.2, 3.3**
    - Generate vocabulary items with known embeddings
    - Ensure some pairs have similarity > 0.85
    - Ensure some pairs have similarity < 0.85
    - Generate flashcards
    - Assert all synonyms have similarity > 0.85
    - Assert items with similarity > 0.85 appear in synonyms (up to limit)
    - Run 100+ iterations with hypothesis
  
  - [ ]* 3.3 Write property test for synonym array correctness
    - **Property 4: Synonym array excludes low-similarity cluster members**
    - **Validates: Requirements 3.4**
    - Generate clusters with mixed similarity items
    - Ensure some cluster members have similarity < 0.85
    - Generate flashcards
    - Assert synonym count < (cluster size - 1) for clusters with low-similarity items
    - Run 100+ iterations with hypothesis

- [ ] 4. Add error handling for edge cases
  - [ ] 4.1 Handle missing embeddings
    - In _compute_synonym_similarity, check if vocab_item has embedding
    - If no embedding, return empty synonyms array
    - Log warning message
    - _Requirements: 1.4_
  
  - [ ] 4.2 Handle IPA library unavailable
    - In _create_individual_flashcard, wrap IPA call in try-except
    - Return empty string if library not installed or conversion fails
    - Already implemented in _get_ipa_phonetics, verify it works
    - _Requirements: 2.2_
  
  - [ ] 4.3 Handle missing supporting sentence
    - In _create_individual_flashcard, use .get() with default empty string
    - Set audio_example_url to None if example is empty
    - _Requirements: 2.4_
  
  - [ ]* 4.4 Write unit tests for error handling
    - Test flashcard generation with vocabulary item lacking embeddings
    - Test flashcard generation with vocabulary item lacking supporting_sentence
    - Test IPA generation when library unavailable (mock ImportError)
    - Verify graceful degradation (empty strings, no crashes)

- [ ] 5. Checkpoint - Ensure all tests pass
  - Run all unit tests
  - Run all property-based tests (100+ iterations each)
  - Verify no errors or failures
  - Ask the user if questions arise

- [ ] 6. Integration testing and validation
  - [ ] 6.1 Test with sample document
    - Use the test document from the file (Climate Change text)
    - Process through complete pipeline
    - Verify flashcard count matches vocabulary count
    - Print flashcard count and vocabulary count for comparison
    - _Requirements: 7.1_
  
  - [ ] 6.2 Verify flashcard structure completeness
    - For each generated flashcard, check all required fields are present
    - Required fields: id, word, synonyms, cluster_id, cluster_name, cluster_rank, semantic_role, importance_score, meaning, definition_source, example, example_source, ipa, ipa_uk, ipa_us, audio_word_url, audio_example_url, word_type, difficulty, tags, related_words
    - _Requirements: 4.3, 4.4_
  
  - [ ]* 6.3 Write property test for flashcard structure completeness
    - **Property 5: Flashcard structure completeness**
    - **Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 4.3, 4.4**
    - Generate random vocabulary items
    - Generate flashcards
    - Assert all required top-level keys are present
    - Run 100+ iterations with hypothesis
  
  - [ ]* 6.4 Write integration test for end-to-end pipeline
    - Process a real document through the complete 12-stage pipeline
    - Verify flashcard count equals vocabulary count
    - Verify all flashcards have required fields
    - Verify synonyms have similarity > 0.85
    - Measure execution time (should be < 10 seconds for 100 items)

- [ ] 7. Final checkpoint - Verify fix is complete
  - Run all tests (unit + property + integration)
  - Verify flashcard count matches vocabulary count in all test cases
  - Verify backward compatibility (group_by_cluster=True still works)
  - Check for any warnings or errors in logs
  - Ensure all tests pass, ask the user if questions arise

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties with 100+ iterations
- Unit tests validate specific examples and edge cases
- The fix maintains backward compatibility by keeping the group_by_cluster parameter
- No frontend changes required - existing code will automatically display all flashcards
