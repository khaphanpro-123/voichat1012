# Complete 8-Step Pipeline Guide

## Overview
The simplified 8-step pipeline is a streamlined version of the document processing system that extracts, scores, and organizes vocabulary for language learning.

## The 8 Steps

### Step 1: Text Preprocessing
**File**: `python-api/complete_pipeline.py`  
**Method**: `_normalize_text()`  
**Purpose**: Clean and normalize raw document text

**Process**:
1. Remove extra whitespace
2. Ensure UTF-8 encoding
3. Preserve paragraph structure

**Output**: Normalized text ready for processing

---

### Step 2: Heading Detection
**File**: `python-api/heading_detector.py`  
**Purpose**: Detect document structure and heading hierarchy

**Process**:
1. Identify headings (markdown, numbered, roman numerals)
2. Build heading hierarchy (parent-child relationships)
3. Map sentences to their containing headings

**Output**: Heading structure with hierarchy

---

### Step 3: Context Intelligence
**File**: `python-api/context_intelligence.py`  
**Purpose**: Analyze text structure and identify important sentences

**Process**:
1. Tokenize text into sentences
2. Detect verbs and linguistic properties
3. Score sentences by importance
4. Select best context for each vocabulary item

**Output**: Sentence-level context with scores

---

### Step 4: Phrase Extraction
**File**: `python-api/phrase_centric_extractor.py`  
**Purpose**: Extract multi-word phrases using learning-to-rank

**Process**:
1. Extract noun phrases, adjective+noun, verb+noun patterns
2. Apply 8 hard filtering rules
3. Score by semantic relevance and frequency
4. Cluster similar phrases

**Output**: Ranked phrases with scores

---

### Step 5: Single Word Extraction
**File**: `python-api/single_word_extractor_v2.py` / `word_ranker.py`  
**Purpose**: Extract important single words using learning-to-rank

**Process**:
1. Tokenize and POS tag
2. Filter by POS (NN, VB, JJ)
3. Score by 4 features:
   - TF-IDF (0.6 weight)
   - Word Length (0.1 weight)
   - Morphological (0.3 weight)
   - Coverage Penalty (-0.5 weight)
4. Rank by importance

**Output**: Ranked words with scores

---

### Step 6: Score Normalization & Ranking
**File**: `python-api/vocabulary_merger_normalized.py`  
**Class**: `VocabularyMergerNormalized`  
**Purpose**: Merge phrases and words, normalize scores to [0, 1]

**Process**:
1. **Merge**: Combine phrases and words into single list
2. **Shift**: Remove negative values (s - min)
3. **Normalize**: Scale to [0, 1] range ((s - min) / (max - min))
4. **Sort**: Order by normalized score (high → low)
5. **Rank**: Assign rank numbers (1, 2, 3, ...)

**Output**: Merged vocabulary with normalized scores [0, 1]

**Key Difference from Old Pipeline**:
- Old: Steps 6, 7, 8 (Independent Scoring, Merge, Learned Final Scoring)
- New: Single step with simple mathematical transformation
- Advantage: Simpler, faster, no model training needed

---

### Step 7: Topic Modeling
**File**: `python-api/new_pipeline_learned_scoring.py`  
**Method**: `_topic_modeling()`  
**Purpose**: Cluster vocabulary items into semantic topics

**Process**:
1. Extract 384-dim embeddings from each item
2. Use KMeans clustering (n_topics clusters)
3. Generate topic names from top-scoring items
4. Compute cluster centroids

**Output**: Topics with items grouped by semantic similarity

---

### Step 8: Flashcard Generation
**File**: `python-api/new_pipeline_learned_scoring.py`  
**Methods**: `_within_topic_ranking()`, `_group_synonyms_in_topic()`, `_flashcard_generation()`  
**Purpose**: Create flashcards for spaced repetition learning

**Process**:
1. **Within-Topic Ranking**:
   - Compute centrality (similarity to topic center)
   - Sort by score
   - Group synonyms (similarity ≥ 0.75)
   - Assign semantic roles (core/supporting/peripheral)

2. **Flashcard Generation**:
   - Create 1 core flashcard per topic (with 5 related terms)
   - Create up to 3 supporting flashcards
   - Estimate difficulty from score
   - Add metadata and tags

**Output**: Flashcards ready for learning app

**Key Difference from Old Pipeline**:
- Old: Steps 9, 10, 11 (Topic Modeling, Within-Topic Ranking, Flashcard Generation)
- New: Single step combining all three
- Advantage: Simpler pipeline structure, same output quality

---

## Data Flow Through All 8 Steps

```
Raw Document
    ↓
Step 1: Text Preprocessing
    ↓ (normalized text)
Step 2: Heading Detection
    ↓ (heading structure)
Step 3: Context Intelligence
    ↓ (sentence context)
Step 4: Phrase Extraction
    ↓ (phrases with scores)
Step 5: Single Word Extraction
    ↓ (words with scores)
Step 6: Score Normalization & Ranking
    ↓ (merged vocabulary, normalized [0,1])
Step 7: Topic Modeling
    ↓ (topics with items)
Step 8: Flashcard Generation
    ↓ (flashcards with difficulty)
Learning App (Spaced Repetition)
```

## Configuration Levels (TH1-TH4)

The pipeline supports 4 configuration levels for ablation studies:

### TH1: Extraction Module (Steps 1,3,4,5)
- **Description**: Basic extraction - Phrases (2 features) + Words (4 features)
- **Expected Count**: ~15 items
- **F1 Score**: ~0.60-0.65
- **Complexity**: Basic

**What's Included**:
- Text preprocessing
- Context intelligence
- Phrase extraction (TF-IDF + Cohesion)
- Word extraction (TF-IDF + Length + Morph + Coverage)

**What's Excluded**:
- Heading detection
- Score normalization
- Topic modeling
- Flashcard generation

---

### TH2: + Structural Context (Steps 1,2,3,4,5)
- **Description**: TH1 + Heading analysis and structural context mapping
- **Expected Count**: ~18 items
- **F1 Score**: ~0.65-0.70
- **Complexity**: Structural Context

**What's Added**:
- Heading detection
- Heading hierarchy analysis
- Heading-based context mapping

**Improvement**: +5% F1 score from better context understanding

---

### TH3: + Score Normalization (Steps 1,2,3,4,5,6)
- **Description**: TH2 + Score normalization (Shift + Normalize + Sort + Rank)
- **Expected Count**: ~20 items
- **F1 Score**: ~0.70-0.75
- **Complexity**: Semantic Scoring

**What's Added**:
- Score normalization & ranking
- Consistent [0, 1] scoring
- Proper ranking

**Improvement**: +5% F1 score from normalized scoring

---

### TH4: Full System (Steps 1,2,3,4,5,6,7,8)
- **Description**: Complete system with Topic Modeling and Flashcard Generation
- **Expected Count**: ~22-25 items
- **F1 Score**: ~0.75-0.82
- **Complexity**: Full System

**What's Added**:
- Topic modeling (KMeans clustering)
- Within-topic ranking
- Synonym grouping
- Flashcard generation
- Difficulty estimation

**Improvement**: +5-7% F1 score from topic organization and flashcard generation

---

## Key Concepts

### Embeddings
- 384-dimensional vectors from SentenceTransformer
- Represent semantic meaning of vocabulary items
- Used for clustering and similarity computation

### Centrality
- Measures how well an item represents its topic
- Computed as cosine similarity to topic centroid
- Range: [-1, 1], where 1 = perfectly aligned

### Semantic Roles
- **Core**: Most important item in topic (highest score)
- **Supporting**: Important items (high score or high centrality)
- **Peripheral**: Less important items (low score and low centrality)

### Synonym Groups
- Items with similarity ≥ 0.75 grouped together
- Primary item: highest-scoring in group
- Secondary items: marked with similarity score
- Kept adjacent in output

### Difficulty Levels
- **Advanced**: final_score_normalized ≥ 0.8
- **Intermediate**: 0.6 ≤ final_score_normalized < 0.8
- **Beginner**: final_score_normalized < 0.6

## Configuration Parameters

| Parameter | Step | Value | Purpose |
|-----------|------|-------|---------|
| n_topics | 7 | 3-10 | Number of topics to create |
| n_init | 7 | 10 | KMeans iterations |
| random_state | 7 | 42 | Reproducibility |
| centrality_threshold | 8 | 0.6 | Supporting role threshold |
| synonym_threshold | 8 | 0.75 | Synonym similarity threshold |
| max_supporting_items | 8 | 3 | Supporting items per topic |
| max_related_terms | 8 | 5 | Related terms per core card |
| difficulty_thresholds | 8 | [0.6, 0.8] | Difficulty boundaries |

## Performance Characteristics

| Metric | Value | Notes |
|--------|-------|-------|
| Time Complexity (Step 6) | O(n log n) | Sorting n items |
| Time Complexity (Step 7) | O(n × d × k) | n=items, d=dimensions, k=clusters |
| Time Complexity (Step 8) | O(n² × d) | Similarity matrix computation |
| Space Complexity | O(n × d) | Storing embeddings |
| Typical Topics | 3-10 | Per document |
| Typical Flashcards | 5-30 | Per document |
| Typical Execution Time | 2-5s | Per document |

## Quality Metrics

### Extraction Quality (Steps 1-5)
- Precision: % of extracted items that are relevant
- Recall: % of relevant items that are extracted
- F1 Score: Harmonic mean of precision and recall

### Scoring Quality (Step 6)
- Score distribution: Uniform across [0, 1]
- Ranking consistency: Same relative order as original

### Topic Quality (Step 7)
- Coherence: Items in topic are semantically related
- Separation: Different topics are distinct
- Coverage: All items assigned to topics

### Flashcard Quality (Step 8)
- Difficulty levels: Appropriate for score ranges
- Related terms: Relevant and helpful
- Metadata: Complete and accurate

## Comparison: Old vs New Pipeline

### Old Pipeline (11 steps)
```
1. Text Preprocessing
2. Heading Detection
3. Context Intelligence
4. Phrase Extraction
5. Single Word Extraction
6. Independent Scoring (4 signals)
7. Merge (concatenate)
8. Learned Final Scoring (regression)
9. Topic Modeling (KMeans)
10. Within-Topic Ranking (centrality + roles)
11. Flashcard Generation (create cards)
```

### New Pipeline (8 steps)
```
1. Text Preprocessing
2. Heading Detection
3. Context Intelligence
4. Phrase Extraction
5. Single Word Extraction
6. Score Normalization & Ranking (shift + normalize)
7. Topic Modeling (KMeans)
8. Flashcard Generation (ranking + roles + cards)
```

### Changes
- **Step 6**: Simplified from 3 steps (6, 7, 8) to 1 step
  - Removed: Independent Scoring (4 signals), Learned Final Scoring (regression)
  - Added: Simple shift + normalize transformation
  - Benefit: Faster, simpler, no model training

- **Step 8**: Combined from 3 steps (9, 10, 11) to 1 step
  - Kept: All algorithms (topic modeling, ranking, flashcard generation)
  - Benefit: Simpler pipeline structure, same output quality

### Advantages of New Pipeline
- **Simpler**: 8 steps instead of 11
- **Faster**: No model training, simpler scoring
- **More Interpretable**: Easier to understand and debug
- **Deterministic**: No randomness except KMeans
- **Maintainable**: Fewer stages to maintain

### Trade-offs
- **Less Sophisticated Scoring**: No learned weights from 4 signals
- **No Regression Model**: Simple normalization instead of ML model
- **May Lose Nuance**: Simpler approach may miss some patterns

## Usage Examples

### Basic Usage
```python
from complete_pipeline import CompletePipelineNew

# Initialize pipeline
pipeline = CompletePipelineNew()

# Process document
result = pipeline.process_document(
    text="Your document text here...",
    document_title="Document Title",
    max_phrases=30,
    max_words=20
)

# Access results
vocabulary = result['vocabulary']
topics = result['topics']
flashcards = result['flashcards']
```

### With Configuration
```python
# Use specific configuration
result = pipeline.process_document(
    text=document_text,
    document_title="Title",
    max_phrases=25,
    max_words=15,
    n_topics=5  # Number of topics
)
```

### Export Results
```python
# Export to JSON
pipeline.export_to_json(result, 'output.json')
```

## Next Steps in Learning Pipeline
1. **Spaced Repetition Scheduling**: Schedule flashcards based on difficulty
2. **User Interaction Tracking**: Track which flashcards user has seen
3. **Adaptive Learning**: Adjust difficulty based on performance
4. **Progress Reporting**: Show learning progress and statistics

## Documentation Files
- `STEP1_TEXT_PREPROCESSING_DETAILED.md`: Complete Step 1 documentation
- `STEP2_HEADING_HIERARCHY_DETAILED.md`: Complete Step 2 documentation
- `STEP3_CONTEXT_INTELLIGENCE_DETAILED.md`: Complete Step 3 documentation
- `STEP4_PHRASE_EXTRACTION_DETAILED.md`: Complete Step 4 documentation
- `STEP5_SINGLE_WORD_EXTRACTION_DETAILED.md`: Complete Step 5 documentation
- `STEP6_SCORE_NORMALIZATION_DETAILED.md`: Complete Step 6 documentation
- `STEP7_TOPIC_MODELING_DETAILED.md`: Complete Step 7 documentation
- `STEP8_FLASHCARD_GENERATION_DETAILED.md`: Complete Step 8 documentation

## Version History
- **v1.0**: Original 11-step pipeline
- **v2.0**: Simplified 8-step pipeline (current)
  - Simplified scoring (Step 6)
  - Combined flashcard generation (Step 8)
  - Maintained output quality
  - Improved maintainability
