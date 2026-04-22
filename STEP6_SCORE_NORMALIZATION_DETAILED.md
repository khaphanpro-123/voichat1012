# Step 6: Score Normalization & Ranking - Detailed Documentation

## Overview
**File**: `python-api/vocabulary_merger_normalized.py`  
**Class**: `VocabularyMergerNormalized`  
**Methods**: 
- `merge_and_normalize()` (Main entry point)
- `_merge()` (Combine phrases and words)
- `_shift_scores()` (Remove negative values)
- `_normalize_scores()` (Scale to [0, 1])
- `_sort_vocabulary()` (Sort by score)
- `_assign_ranks()` (Add rank numbers)

**Stage**: Stage 6 of the simplified 8-step pipeline  
**Purpose**: Merge phrases and words, then normalize scores to [0, 1] range for consistent ranking

## What It Does
Score Normalization & Ranking consolidates vocabulary items from both phrase and word extraction, then applies mathematical transformations to ensure scores are comparable and properly distributed.

## Algorithm Flow

### 1. Merge Phrases and Words
```python
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
```

**Merge Process**:
- Combines phrases and words into single vocabulary list
- Preserves original features for each type
- Stores metadata for later reference
- Standardizes field names (term, type, final_score)

### 2. Shift Scores (Remove Negative Values)
```python
def _shift_scores(self, vocabulary: List[Dict]) -> List[Dict]:
    if not vocabulary:
        return vocabulary
    
    # Find minimum score
    all_scores = [v['final_score'] for v in vocabulary]
    s_min = min(all_scores)
    
    # Shift all scores
    for v in vocabulary:
        v['final_score_shifted'] = v['final_score'] - s_min
    
    return vocabulary
```

**Why Shift?**
- Some scores may be negative (e.g., coverage penalty in words)
- Shifting ensures all scores ≥ 0
- Formula: `shifted_score = original_score - min_score`
- Result: Minimum becomes 0, all others increase proportionally

**Example**:
```
Original scores: [-0.5, 0.2, 0.8, 1.2]
Min score: -0.5
Shifted scores: [0.0, 0.7, 1.3, 1.7]
```

### 3. Normalize Scores to [0, 1]
```python
def _normalize_scores(self, vocabulary: List[Dict]) -> List[Dict]:
    if not vocabulary:
        return vocabulary
    
    # Find min and max after shift
    shifted_scores = [v['final_score_shifted'] for v in vocabulary]
    s_prime_min = min(shifted_scores)
    s_prime_max = max(shifted_scores)
    
    # Normalize
    if s_prime_max > s_prime_min:
        for v in vocabulary:
            v['final_score_normalized'] = (
                (v['final_score_shifted'] - s_prime_min) / 
                (s_prime_max - s_prime_min)
            )
    else:
        # All scores equal
        for v in vocabulary:
            v['final_score_normalized'] = 0.5
    
    return vocabulary
```

**Normalization Formula**:
```
normalized_score = (shifted_score - min_shifted) / (max_shifted - min_shifted)
```

**Properties**:
- Minimum normalized score: 0.0
- Maximum normalized score: 1.0
- All scores in range [0, 1]
- Preserves relative ordering

**Example**:
```
Shifted scores: [0.0, 0.7, 1.3, 1.7]
Min: 0.0, Max: 1.7
Normalized: [0.0, 0.412, 0.765, 1.0]
```

### 4. Sort by Normalized Score
```python
def _sort_vocabulary(self, vocabulary: List[Dict]) -> List[Dict]:
    vocabulary.sort(
        key=lambda x: x['final_score_normalized'],
        reverse=True
    )
    return vocabulary
```

**Sorting**:
- Descending order (highest score first)
- Highest-scoring items at top
- Lowest-scoring items at bottom

### 5. Assign Ranks
```python
def _assign_ranks(self, vocabulary: List[Dict]) -> List[Dict]:
    for i, v in enumerate(vocabulary, start=1):
        v['rank'] = i
    
    return vocabulary
```

**Ranking**:
- Rank 1: Highest-scoring item
- Rank 2: Second-highest, etc.
- Used for display and filtering

## Data Flow

### Input
```
phrases: List[Dict] with:
  - phrase: string
  - final_score: float (can be negative)
  - tfidf_score: float
  - cohesion_score: float

words: List[Dict] with:
  - word: string
  - final_score: float (can be negative)
  - tfidf_score: float
  - word_length_score: float
  - morph_score: float
  - coverage_penalty: float (usually negative)
```

### Output
```
vocabulary: List[Dict] with:
  - term: string
  - type: 'phrase' | 'word'
  - final_score: float (original)
  - final_score_shifted: float (≥ 0)
  - final_score_normalized: float [0, 1]
  - rank: int (1, 2, 3, ...)
  - features: Dict (original features)
  - metadata: Dict (original item)
```

## Mathematical Properties

### Score Transformation
```
Step 1: Original Score (can be negative)
  Example: -0.5, 0.2, 0.8, 1.2

Step 2: Shift (s - min)
  Example: 0.0, 0.7, 1.3, 1.7

Step 3: Normalize ((s - min) / (max - min))
  Example: 0.0, 0.412, 0.765, 1.0
```

### Invariants
- Relative ordering preserved
- Minimum always 0.0
- Maximum always 1.0
- Linear transformation (monotonic)

## Example Workflow

### Input
```
Phrases:
- "climate change" (score: 0.722)
- "renewable energy" (score: 0.656)
- "global warming" (score: 0.608)

Words:
- "deforestation" (score: 0.738)
- "biodiversity" (score: 0.648)
- "sustainability" (score: 0.639)
- "pollution" (score: 0.620)
```

### Step 1: Merge
```
Combined vocabulary (7 items):
1. climate change (phrase, 0.722)
2. renewable energy (phrase, 0.656)
3. global warming (phrase, 0.608)
4. deforestation (word, 0.738)
5. biodiversity (word, 0.648)
6. sustainability (word, 0.639)
7. pollution (word, 0.620)
```

### Step 2: Shift
```
Min score: 0.608
Shifted scores:
1. climate change: 0.114
2. renewable energy: 0.048
3. global warming: 0.0
4. deforestation: 0.130
5. biodiversity: 0.040
6. sustainability: 0.031
7. pollution: 0.012
```

### Step 3: Normalize
```
Min shifted: 0.0, Max shifted: 0.130
Normalized scores:
1. climate change: 0.877
2. renewable energy: 0.369
3. global warming: 0.0
4. deforestation: 1.0
5. biodiversity: 0.308
6. sustainability: 0.238
7. pollution: 0.092
```

### Step 4: Sort
```
Sorted by normalized score (descending):
1. deforestation (1.0)
2. climate change (0.877)
3. renewable energy (0.369)
4. biodiversity (0.308)
5. sustainability (0.238)
6. pollution (0.092)
7. global warming (0.0)
```

### Step 5: Assign Ranks
```
Final ranking:
Rank 1: deforestation (1.0)
Rank 2: climate change (0.877)
Rank 3: renewable energy (0.369)
Rank 4: biodiversity (0.308)
Rank 5: sustainability (0.238)
Rank 6: pollution (0.092)
Rank 7: global warming (0.0)
```

## Key Characteristics

### Advantages
- **Comparable Scores**: All items on same [0, 1] scale
- **Interpretable**: 1.0 = best, 0.0 = worst
- **Stable**: Handles negative scores gracefully
- **Deterministic**: Same input always produces same output
- **Preserves Order**: Relative ranking unchanged

### Limitations
- **Sensitive to Outliers**: One very high/low score affects all others
- **No Weighting**: All items treated equally in normalization
- **Linear Only**: Cannot capture non-linear relationships

## Configuration
- **Top-K filtering**: Optional parameter to keep only top K items
- **Shift method**: Always subtract minimum
- **Normalization method**: Min-max scaling

## Integration with Pipeline
- **Input from**: Step 5 (Single Word Extraction) + Step 4 (Phrase Extraction)
- **Output to**: Step 7 (Topic Modeling) - normalized vocabulary
- **Replaces**: Old Steps 6, 7, 8 (Independent Scoring, Merge, Learned Final Scoring)

## Comparison with Old Pipeline

### Old Pipeline (11 steps)
- Step 6: Independent Scoring (4 signals)
- Step 7: Merge (concatenate)
- Step 8: Learned Final Scoring (regression model)

### New Pipeline (8 steps)
- Step 6: Score Normalization & Ranking (simple shift + normalize)

**Advantages of New Approach**:
- Simpler, more interpretable
- No model training required
- Faster execution
- Easier to debug and understand
- Deterministic (no randomness)

**Trade-offs**:
- Less sophisticated scoring
- No learned weights
- May lose some nuance from 4-signal approach
