# Requirements Document

## Introduction

This specification addresses a critical bug in the flashcard generation system where the API returns only 3 flashcards instead of all extracted vocabulary items (typically 30-100 items). The issue stems from the `_stage12_flashcard_generation` method using cluster-based grouping by default, which creates one flashcard per cluster rather than one flashcard per vocabulary item.

## Glossary

- **Flashcard**: A learning card containing a vocabulary term with its definition, pronunciation, example sentence, and related metadata
- **Vocabulary_Item**: An extracted term (word or phrase) from the document with associated metadata (importance score, cluster assignment, embeddings, etc.)
- **Cluster**: A semantic grouping of related vocabulary items based on embedding similarity
- **Pipeline**: THE 12-stage document processing system that extracts vocabulary and generates flashcards
- **API**: THE Python Flask/FastAPI backend service that processes documents
- **Frontend**: THE Next.js/React user interface that displays flashcards
- **Synonym**: A semantically similar word with cosine similarity > 0.85
- **Cluster_Grouping**: THE current method that creates one flashcard per cluster
- **Individual_Flashcard_Mode**: THE desired method that creates one flashcard per vocabulary item

## Requirements

### Requirement 1: Individual Flashcard Generation

**User Story:** As a user, I want to receive a flashcard for every vocabulary item extracted from my document, so that I can study all the important terms comprehensively.

#### Acceptance Criteria

1. WHEN the pipeline processes a document with N vocabulary items, THE Flashcard_Generator SHALL create N individual flashcards
2. WHEN generating flashcards, THE Flashcard_Generator SHALL NOT group vocabulary items by cluster
3. WHEN a vocabulary item is processed, THE Flashcard_Generator SHALL create exactly one flashcard for that item
4. THE Flashcard_Generator SHALL preserve all vocabulary item metadata in the generated flashcard

### Requirement 2: Flashcard Content Structure

**User Story:** As a user, I want each flashcard to contain complete information about the vocabulary term, so that I can learn effectively.

#### Acceptance Criteria

1. WHEN creating a flashcard, THE Flashcard_Generator SHALL include the vocabulary term as the primary word
2. WHEN creating a flashcard, THE Flashcard_Generator SHALL include IPA phonetic transcription
3. WHEN creating a flashcard, THE Flashcard_Generator SHALL include a definition or meaning
4. WHEN creating a flashcard, THE Flashcard_Generator SHALL include the context sentence from the document
5. WHEN creating a flashcard, THE Flashcard_Generator SHALL include the importance score
6. WHEN creating a flashcard, THE Flashcard_Generator SHALL include cluster metadata (cluster_id, cluster_name, semantic_role)

### Requirement 3: Synonym Detection

**User Story:** As a user, I want each flashcard to show actual synonyms of the vocabulary term, so that I can understand related words and expand my vocabulary.

#### Acceptance Criteria

1. WHEN identifying synonyms for a vocabulary item, THE Synonym_Detector SHALL compute cosine similarity between embeddings
2. WHEN two vocabulary items have cosine similarity > 0.85, THE Synonym_Detector SHALL classify them as synonyms
3. WHEN creating a flashcard, THE Flashcard_Generator SHALL include only true synonyms (similarity > 0.85) in the synonyms array
4. WHEN creating a flashcard, THE Flashcard_Generator SHALL NOT include all cluster members as synonyms

### Requirement 4: Backward Compatibility

**User Story:** As a developer, I want the fix to maintain compatibility with existing code, so that other features continue to work without modification.

#### Acceptance Criteria

1. WHEN the fix is implemented, THE Pipeline SHALL maintain the same API interface
2. WHEN the fix is implemented, THE Frontend SHALL display flashcards without requiring code changes
3. WHEN the fix is implemented, THE Pipeline SHALL preserve all existing flashcard metadata fields
4. WHEN the fix is implemented, THE Pipeline SHALL maintain the same JSON response structure

### Requirement 5: Performance and Scalability

**User Story:** As a user, I want the system to handle large documents efficiently, so that I can process documents with many vocabulary items without delays.

#### Acceptance Criteria

1. WHEN processing a document with 100 vocabulary items, THE Pipeline SHALL generate 100 flashcards within 10 seconds
2. WHEN computing synonyms, THE Synonym_Detector SHALL use vectorized operations for efficiency
3. WHEN generating flashcards, THE Flashcard_Generator SHALL avoid redundant embedding computations
4. WHEN the vocabulary count exceeds 100 items, THE Pipeline SHALL maintain acceptable performance

### Requirement 6: Data Integrity

**User Story:** As a developer, I want all vocabulary metadata to be preserved during flashcard generation, so that no information is lost in the conversion process.

#### Acceptance Criteria

1. WHEN converting a vocabulary item to a flashcard, THE Flashcard_Generator SHALL preserve the cluster_id field
2. WHEN converting a vocabulary item to a flashcard, THE Flashcard_Generator SHALL preserve the importance_score field
3. WHEN converting a vocabulary item to a flashcard, THE Flashcard_Generator SHALL preserve the semantic_role field
4. WHEN converting a vocabulary item to a flashcard, THE Flashcard_Generator SHALL preserve the supporting_sentence field
5. WHEN converting a vocabulary item to a flashcard, THE Flashcard_Generator SHALL preserve all embedding data

### Requirement 7: Testing and Validation

**User Story:** As a developer, I want comprehensive tests to verify the fix works correctly, so that I can be confident the issue is resolved.

#### Acceptance Criteria

1. WHEN testing with a sample document, THE Test SHALL verify that flashcard count equals vocabulary count
2. WHEN testing synonym detection, THE Test SHALL verify that only items with similarity > 0.85 are marked as synonyms
3. WHEN testing flashcard structure, THE Test SHALL verify all required fields are present
4. WHEN testing with different document sizes, THE Test SHALL verify consistent behavior across varying input sizes
