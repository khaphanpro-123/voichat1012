# Phrase Word Merger V2 - Detailed Documentation

## Overview
**File**: `python-api/phrase_word_merger_v2.py`  
**Class**: `PhraseWordMergerV2`  
**Purpose**: Advanced merging of phrases and words with semantic filtering, penalty application, and topic modeling

## What It Does
PhraseWordMergerV2 is an advanced vocabulary merger that:
1. Computes semantic similarities between words and phrases
2. Applies soft semantic filtering (penalties instead of hard drops)
3. Applies frequency-based penalties (3-tier system)
4. Applies coverage penalties (token and semantic overlap)
5. Merges and scores vocabulary items
6. Creates semantic topics using KMeans clustering
7. Builds topic structure with core phrases and supporting words

## Key Differences from Simple Merger

### Simple Merger (vocabulary_merger_normalized.py)
- Just merges phrases and words
- Applies simple shift + normalize transformation
- No semantic analysis
- No topic modeling

### Advanced Merger (phrase_word_merger_v2.py)
- Semantic filtering with penalties
- Frequency-based tiering
- Coverage penalty analysis
- Topic modeling with KMeans
- Topic structure building
- More sophisticated scoring

## Algorithm Flow

### Step 1: Compute Semantic Similarities
```python
def _compute_similarities(self, phrases: List[Dict], words: List[Dict]) -> List[float]:
    # Get phrase embeddings
    phrase_embeddings = []
    for phrase in phrases:
        if 'embedding' in phrase:
            phrase_embeddings.append(phrase['embedding'])
        else:
            text = phrase.get('phrase', phrase.get('text', ''))
            emb = self.embedding_model.encode([text])[0]
            phrase['embedding'] = emb
            phrase_embeddings.append(emb)
    
    phrase_embeddings = np.array(phrase_embeddings)
    
    # Compute max similarity for each word
    max_similarities = []
    for word in words:
        if 'embedding' in word:
            word_emb = word['embedding']
        else:
            text = word.get('word', word.get('text', ''))
            word_emb = self.embedding_model.encode([text])[0]
            word['embedding'] = word_emb
        
        # Cosine similarity with all phrases
        similarities = np.dot(phrase_embeddings, word_emb) / (
            np.linalg.norm(phrase_embeddings, axis=1) * np.linalg.norm(word_emb)
        )
        
        max_sim = float(np.max(similarities))
        max_similarities.append(max_sim)
    
    return max_similarities
```

**Purpose**: Find how similar each word is to the most similar phrase

**Process**:
1. Get embeddings for all phrases (384-dim vectors)
2. For each word:
   - Get its embedding
   - Compute cosine similarity with all phrases
   - Find maximum similarity
3. Return list of max similarities

**Output**: List of floats [0, 1] representing max similarity for each word

---

### Step 2: Semantic Filtering (SOFT)
```python
filtered_words = []
hard_dropped = 0
for i, word in enumerate(words):
    max_sim = word_similarities[i]
    
    # HARD DROP only if extremely similar (>= 0.9)
    if max_sim >= self.hard_drop_threshold:  # default: 0.9
        hard_dropped += 1
        continue
    
    # SEMANTIC PENALTY (not drop)
    if max_sim >= 0.8:
        semantic_penalty = 0.5
    elif max_sim >= 0.7:
        semantic_penalty = 0.3
    else:
        semantic_penalty = 0.0
    
    word['semantic_penalty'] = semantic_penalty
    word['max_phrase_similarity'] = float(max_sim)
    filtered_words.append(word)
```

**Purpose**: Remove duplicate words and penalize similar ones

**Logic**:
- **Hard Drop** (similarity ≥ 0.9): Remove word completely
- **High Similarity** (0.8-0.9): Penalty = 0.5
- **Medium Similarity** (0.7-0.8): Penalty = 0.3
- **Low Similarity** (< 0.7): Penalty = 0.0

**Example**:
```
Word: "run"
Max phrase similarity: 0.85 (similar to "running")
Action: Keep with semantic_penalty = 0.5

Word: "sprint"
Max phrase similarity: 0.92 (very similar to "running")
Action: Hard drop (remove)
```

---

### Step 3: Frequency Tiering (3-Tier System)
```python
def _apply_frequency_tiers(self, words: List[Dict]) -> List[Dict]:
    frequencies = [w.get('frequency', 1) for w in words]
    
    # Compute percentiles
    low_threshold = np.percentile(frequencies, 25)
    high_threshold = np.percentile(frequencies, 75)
    
    # Assign penalties
    for word in words:
        freq = word.get('frequency', 1)
        
        if freq >= high_threshold:
            word['frequency_tier'] = 'HIGH'
            word['frequency_penalty'] = 0.4
        elif freq <= low_threshold:
            word['frequency_tier'] = 'LOW'
            word['frequency_penalty'] = 0.0
        else:
            word['frequency_tier'] = 'MEDIUM'
            word['frequency_penalty'] = 0.2
    
    return words
```

**Purpose**: Penalize very common words

**Tiers**:
- **HIGH** (top 25%): Penalty = 0.4 (common words, less valuable)
- **MEDIUM** (25-75%): Penalty = 0.2 (moderate frequency)
- **LOW** (bottom 25%): Penalty = 0.0 (rare words, more valuable)

**Example**:
```
Words: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
Low threshold (25%): 3.25
High threshold (75%): 7.75

Word with freq=1: LOW tier, penalty=0.0
Word with freq=5: MEDIUM tier, penalty=0.2
Word with freq=9: HIGH tier, penalty=0.4
```

---

### Step 4: Coverage Penalty
```python
def _apply_coverage_penalty(self, phrases: List[Dict], words: List[Dict]) -> List[Dict]:
    # Build phrase token set
    phrase_tokens = set()
    for phrase in phrases:
        text = phrase.get('phrase', phrase.get('text', ''))
        tokens = text.lower().split()
        phrase_tokens.update(tokens)
    
    # Apply penalties
    for word in words:
        text = word.get('word', word.get('text', '')).lower()
        
        # Token overlap
        token_penalty = 0.5 if text in phrase_tokens else 0.0
        
        # Semantic overlap
        max_sim = word.get('max_phrase_similarity', 0.0)
        semantic_overlap_penalty = (0.3 * max_sim) if max_sim >= 0.7 else 0.0
        
        # Total coverage penalty
        word['coverage_penalty'] = token_penalty + semantic_overlap_penalty
    
    return words
```

**Purpose**: Penalize words that are already covered by phrases

**Penalties**:
1. **Token Overlap**: 0.5 if word appears in any phrase
2. **Semantic Overlap**: 0.3 × similarity if similarity ≥ 0.7

**Example**:
```
Phrases: ["machine learning", "deep learning"]
Phrase tokens: {machine, learning, deep}

Word: "learning"
- Token overlap: 0.5 (found in phrase tokens)
- Semantic overlap: 0.0 (not computed)
- Total coverage_penalty: 0.5

Word: "algorithm"
- Token overlap: 0.0 (not in phrase tokens)
- Semantic overlap: 0.0 (similarity < 0.7)
- Total coverage_penalty: 0.0
```

---

### Step 5: Final Scoring
```python
# Score phrases
for phrase in phrases:
    phrase['final_score'] = phrase.get('learning_value', 0.5)
    phrase['type'] = 'phrase'

# Score words
for word in filtered_words:
    learning_value = word.get('learning_value', 0.5)
    semantic_penalty = word.get('semantic_penalty', 0.0)
    frequency_penalty = word.get('frequency_penalty', 0.0)
    coverage_penalty = word.get('coverage_penalty', 0.0)
    
    final_score = (
        learning_value
        - (semantic_penalty * 0.4)
        - (frequency_penalty * 0.3)
        - (coverage_penalty * 0.3)
    )
    
    word['final_score'] = max(0.0, final_score)
    word['type'] = 'single_word'
```

**Scoring Formula**:
```
final_score = learning_value - (semantic_penalty × 0.4) - (frequency_penalty × 0.3) - (coverage_penalty × 0.3)
```

**Weights**:
- Semantic penalty: 40%
- Frequency penalty: 30%
- Coverage penalty: 30%

**Example**:
```
Word: "algorithm"
- learning_value: 0.8
- semantic_penalty: 0.3 (medium similarity)
- frequency_penalty: 0.2 (medium frequency)
- coverage_penalty: 0.0 (no overlap)

final_score = 0.8 - (0.3 × 0.4) - (0.2 × 0.3) - (0.0 × 0.3)
            = 0.8 - 0.12 - 0.06 - 0.0
            = 0.62
```

---

### Step 6: Merge Vocabulary
```python
merged_vocabulary = phrases + filtered_words
merged_vocabulary.sort(key=lambda x: x['final_score'], reverse=True)
```

**Process**:
1. Combine phrases and filtered words
2. Sort by final_score (highest first)

---

### Step 7: Topic Modeling (KMeans)
```python
def _create_topics(self, vocabulary: List[Dict]) -> List[Dict]:
    # Get embeddings
    embeddings = []
    for item in vocabulary:
        if 'embedding' in item:
            embeddings.append(item['embedding'])
        else:
            embeddings.append(np.zeros(384))
    
    embeddings = np.array(embeddings)
    
    # KMeans clustering
    n_clusters = min(self.n_topics, len(vocabulary))
    
    if n_clusters < 2:
        return [{
            'topic_id': 0,
            'items': vocabulary,
            'centroid': np.mean(embeddings, axis=0) if len(embeddings) > 0 else None
        }]
    
    kmeans = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
    cluster_labels = kmeans.fit_predict(embeddings)
    
    # Assign cluster_id to items
    for i, item in enumerate(vocabulary):
        item['cluster_id'] = int(cluster_labels[i])
    
    # Build topics
    topics = []
    for topic_id in range(n_clusters):
        topic_items = [
            item for i, item in enumerate(vocabulary)
            if cluster_labels[i] == topic_id
        ]
        
        topics.append({
            'topic_id': topic_id,
            'items': topic_items,
            'centroid': kmeans.cluster_centers_[topic_id]
        })
    
    return topics
```

**Purpose**: Cluster vocabulary into semantic topics

**Process**:
1. Extract embeddings for all items
2. Use KMeans with n_topics clusters
3. Assign each item to a cluster
4. Create topic objects with items and centroids

---

### Step 8: Build Topic Structure
```python
def _build_topic_structure(self, topics: List[Dict]) -> List[Dict]:
    structured_topics = []
    
    for topic in topics:
        topic_id = topic['topic_id']
        items = topic['items']
        centroid = topic['centroid']
        
        # Separate phrases and words
        phrases = [item for item in items if item.get('type') == 'phrase']
        words = [item for item in items if item.get('type') == 'single_word']
        
        # Select core phrase
        core_phrase = None
        if phrases:
            # Find phrase with highest score and closest to centroid
            if centroid is not None:
                phrase_scores = []
                for phrase in phrases:
                    score = phrase.get('final_score', 0.0)
                    emb = phrase.get('embedding')
                    
                    if emb is not None:
                        distance = np.linalg.norm(emb - centroid)
                        combined = score - (distance * 0.1)
                    else:
                        combined = score
                    
                    phrase_scores.append((phrase, combined))
                
                phrase_scores.sort(key=lambda x: x[1], reverse=True)
                core_phrase = phrase_scores[0][0]
            else:
                core_phrase = max(phrases, key=lambda x: x.get('final_score', 0.0))
```

**Purpose**: Organize items within each topic

**Process**:
1. Separate phrases and words in topic
2. Select core phrase (highest score + closest to centroid)
3. Organize supporting words

---

## Data Flow

### Input
```
phrases: List[Dict] with:
  - phrase: string
  - learning_value: float
  - embedding: 384-dim vector (optional)

words: List[Dict] with:
  - word: string
  - learning_value: float
  - frequency: int
  - embedding: 384-dim vector (optional)
```

### Output
```
{
  'merged_vocabulary': List[Dict] with:
    - term: string
    - type: 'phrase' | 'single_word'
    - final_score: float [0, 1]
    - semantic_penalty: float
    - frequency_penalty: float
    - coverage_penalty: float
    - cluster_id: int
    - embedding: 384-dim vector
  
  'topics': List[Dict] with:
    - topic_id: int
    - items: List[Dict]
    - centroid: 384-dim vector
  
  'statistics': Dict with:
    - total_items: int
    - phrases: int
    - words: int
    - hard_dropped: int
    - num_topics: int
}
```

## Configuration Parameters

| Parameter | Default | Purpose |
|-----------|---------|---------|
| hard_drop_threshold | 0.9 | Similarity threshold for hard dropping words |
| n_topics | 5 | Number of topics to create |

## Example Usage

```python
from phrase_word_merger_v2 import PhraseWordMergerV2

# Initialize merger
merger = PhraseWordMergerV2(
    hard_drop_threshold=0.9,
    n_topics=5
)

# Prepare data
phrases = [
    {'phrase': 'machine learning', 'learning_value': 0.9},
    {'phrase': 'deep learning', 'learning_value': 0.85},
    {'phrase': 'neural network', 'learning_value': 0.88}
]

words = [
    {'word': 'algorithm', 'learning_value': 0.8, 'frequency': 5},
    {'word': 'learning', 'learning_value': 0.7, 'frequency': 15},
    {'word': 'network', 'learning_value': 0.75, 'frequency': 8}
]

# Merge
result = merger.merge(phrases, words)

# Access results
merged_vocab = result['merged_vocabulary']
topics = result['topics']
stats = result['statistics']
```

## Key Characteristics

### Soft Filtering
- Doesn't hard-drop similar words
- Applies penalties instead
- Preserves diversity

### Multi-Factor Scoring
- Semantic similarity
- Frequency distribution
- Coverage overlap
- Learning value

### Topic Organization
- KMeans clustering
- Core phrase selection
- Semantic structure

### Embedding-Based
- Uses 384-dim embeddings
- Computes cosine similarity
- Finds semantic relationships

## Advantages

1. **Sophisticated Filtering**: Soft penalties instead of hard drops
2. **Multi-Factor Analysis**: Considers multiple aspects
3. **Topic Organization**: Groups related items
4. **Semantic Understanding**: Uses embeddings
5. **Flexible Scoring**: Weighted combination of factors

## Limitations

1. **Requires Embeddings**: Needs embedding model
2. **Computationally Expensive**: O(n²) similarity computation
3. **Parameter Tuning**: Thresholds and weights need adjustment
4. **Fallback Mode**: Degrades gracefully without embeddings

## Comparison with Other Mergers

### Simple Merger (vocabulary_merger_normalized.py)
- ✓ Faster
- ✓ Simpler
- ✗ No semantic analysis
- ✗ No topic modeling

### Advanced Merger (phrase_word_merger_v2.py)
- ✓ Semantic filtering
- ✓ Topic modeling
- ✓ Multi-factor scoring
- ✗ Slower
- ✗ More complex

## When to Use

### Use Simple Merger When:
- Speed is critical
- No embeddings available
- Simple merging sufficient

### Use Advanced Merger When:
- Quality is priority
- Embeddings available
- Topic organization needed
- Semantic filtering desired

## Integration with Pipeline

This merger can be used as an alternative to the standard Step 6 (Score Normalization & Ranking) for more sophisticated vocabulary organization.

**Old Pipeline**: Steps 6, 7, 8 (Independent Scoring, Merge, Learned Final Scoring)
**Alternative**: Use PhraseWordMergerV2 for more advanced merging with topic modeling
