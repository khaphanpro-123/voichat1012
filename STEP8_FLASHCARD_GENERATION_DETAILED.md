# Step 8: Flashcard Generation - Detailed Documentation

## Overview
**File**: `python-api/new_pipeline_learned_scoring.py`  
**Methods**:
- `_within_topic_ranking()` (Lines 471-525) - Rank items within topics
- `_group_synonyms_in_topic()` (Lines 527-609) - Group similar items
- `_flashcard_generation()` (Lines 610-659) - Create flashcards
- `_create_flashcard()` (Lines 660-688) - Build individual flashcard
- `_estimate_difficulty()` (Lines 706-715) - Estimate difficulty level

**Stage**: Stage 8 of the simplified 8-step pipeline  
**Purpose**: Rank items within topics, assign semantic roles, group synonyms, and generate flashcards for spaced repetition learning

## What It Does
Flashcard Generation is the final stage that:
1. Ranks items within each topic by importance
2. Assigns semantic roles (core/supporting/peripheral)
3. Groups synonyms together
4. Creates flashcards with difficulty levels and related terms

## Algorithm Flow

### Part 1: Within-Topic Ranking

#### 1. Compute Centrality
```python
for item in items:
    if centroid is not None and 'embedding' in item:
        item_emb = item['embedding']
        centrality = np.dot(item_emb, centroid) / (
            np.linalg.norm(item_emb) * np.linalg.norm(centroid)
        )
        item['centrality'] = float(centrality)
    else:
        item['centrality'] = 0.5
```
- Computes cosine similarity between item embedding and topic centroid
- Centrality = dot product / (norm1 × norm2)
- Range: [-1, 1], where 1 = perfectly aligned with topic center
- Fallback: 0.5 if embedding missing

#### 2. Sort by Final Score
```python
items.sort(key=lambda x: x.get('final_score', 0.0), reverse=True)
```
- Items sorted by `final_score_normalized` in descending order
- Highest-scoring items come first

#### 3. Group Synonyms
```python
if len(items) > 1:
    items = self._group_synonyms_in_topic(items, threshold=0.75)
```
- Calls synonym grouping method (see Part 2 below)
- Keeps synonyms adjacent while maintaining score order
- Threshold: 0.75 (75% similarity required)

#### 4. Assign Semantic Roles
```python
n_items = len(items)
for i, item in enumerate(items):
    if i == 0:
        item['semantic_role'] = 'core'
    elif i < min(3, n_items):
        item['semantic_role'] = 'supporting'
    else:
        # Check centrality
        centrality = item.get('centrality', 0.5)
        if centrality >= 0.6:
            item['semantic_role'] = 'supporting'
        else:
            item['semantic_role'] = 'peripheral'
```

**Role Assignment Logic**:
- **Core**: First item (highest score)
- **Supporting**: 
  - Items at positions 1-2 (if 3+ items total)
  - OR items with centrality ≥ 0.6
- **Peripheral**: All other items with centrality < 0.6

### Part 2: Synonym Grouping

#### 1. Extract Embeddings
```python
embeddings = []
for item in items:
    if 'embedding' in item:
        embeddings.append(item['embedding'])
    else:
        embeddings.append(np.zeros(384))

embeddings = np.array(embeddings)
```
- Collects 384-dim embeddings for all items
- Uses zero vectors for missing embeddings

#### 2. Compute Similarity Matrix
```python
similarity_matrix = cosine_similarity(embeddings)
```
- Computes pairwise cosine similarity between all items
- Result: n×n matrix where entry [i,j] = similarity between items i and j
- Range: [-1, 1], where 1 = identical

#### 3. Group Synonyms
```python
result = []
used_indices = set()
synonym_group_id = 0

for i in range(len(items)):
    if i in used_indices:
        continue
    
    # Add current item as primary
    current_item = items[i].copy()
    current_item['synonym_group_id'] = synonym_group_id
    current_item['is_primary_synonym'] = True
    result.append(current_item)
    used_indices.add(i)
    
    # Find similar items (synonyms)
    synonyms = []
    for j in range(i + 1, len(items)):
        if j in used_indices:
            continue
        
        similarity = similarity_matrix[i][j]
        if similarity >= threshold:  # threshold = 0.75
            synonym_item = items[j].copy()
            synonym_item['synonym_group_id'] = synonym_group_id
            synonym_item['is_primary_synonym'] = False
            synonym_item['similarity_to_primary'] = float(similarity)
            synonyms.append((j, synonym_item))
            used_indices.add(j)
    
    # Add synonyms right after primary
    for _, synonym_item in synonyms:
        result.append(synonym_item)
    
    # Increment group ID
    if synonyms:
        synonym_group_id += 1
    else:
        synonym_group_id += 1

return result
```

**Algorithm**:
1. Iterate through items in order
2. For each unused item, mark as primary synonym
3. Find all unused items similar to it (similarity ≥ 0.75)
4. Add synonyms immediately after primary
5. Mark all as used
6. Increment group ID

### Part 3: Flashcard Generation

#### 1. Group Items by Semantic Role
```python
core_items = [item for item in items if item.get('semantic_role') == 'core']
supporting_items = [item for item in items if item.get('semantic_role') == 'supporting']
peripheral_items = [item for item in items if item.get('semantic_role') == 'peripheral']
```
- Separates items into three categories based on role
- Each role gets different treatment in flashcard generation

#### 2. Create Core Flashcard
```python
if core_items:
    core_item = core_items[0]
    flashcard = self._create_flashcard(
        item=core_item,
        topic_id=topic_id,
        topic_name=topic_name,
        role='core',
        related_terms=[
            item.get('phrase', item.get('word', item.get('text', '')))
            for item in supporting_items[:5]
        ]
    )
    flashcards.append(flashcard)
```

**Core Flashcard**:
- Created from the highest-scoring item in topic
- Includes up to 5 supporting items as related terms
- Represents the main concept of the topic

#### 3. Create Supporting Flashcards
```python
for item in supporting_items[:3]:
    flashcard = self._create_flashcard(
        item=item,
        topic_id=topic_id,
        topic_name=topic_name,
        role='supporting',
        related_terms=[]
    )
    flashcards.append(flashcard)
```

**Supporting Flashcards**:
- Created from top 3 supporting items
- No related terms (standalone)
- Reinforce secondary concepts

### Part 4: Flashcard Creation

#### Flashcard Structure
```python
def _create_flashcard(
    self,
    item: Dict,
    topic_id: int,
    topic_name: str,
    role: str,
    related_terms: List[str]
) -> Dict:
    text = item.get('phrase', item.get('word', item.get('text', '')))
    
    flashcard = {
        'text': text,
        'type': item.get('type', 'unknown'),
        'topic_id': topic_id,
        'topic_name': topic_name,
        'semantic_role': role,
        'final_score': item.get('final_score', 0.5),
        'final_score_normalized': item.get('final_score_normalized', 0.5),
        'related_terms': related_terms,
        'difficulty': self._estimate_difficulty(item.get('final_score_normalized', 0.5)),
        'tags': [topic_name, role, item.get('type', 'unknown')]
    }
    
    return flashcard
```

**Flashcard Fields**:
- `text`: The vocabulary term (phrase or word)
- `type`: Item type ('phrase' or 'word')
- `topic_id`: Which topic this belongs to
- `topic_name`: Human-readable topic name
- `semantic_role`: 'core' or 'supporting'
- `final_score`: Original importance score
- `final_score_normalized`: Normalized score [0, 1]
- `related_terms`: List of related vocabulary items
- `difficulty`: Estimated difficulty level
- `tags`: Searchable tags for organization

### Part 5: Difficulty Estimation

#### Difficulty Levels
```python
def _estimate_difficulty(self, score: float) -> str:
    if score >= 0.8:
        return "advanced"
    elif score >= 0.6:
        return "intermediate"
    else:
        return "beginner"
```

**Mapping**:
- **Advanced**: score ≥ 0.8 (high importance, complex concepts)
- **Intermediate**: 0.6 ≤ score < 0.8 (moderate importance)
- **Beginner**: score < 0.6 (foundational concepts)

## Data Flow

### Input
```
topics: List[Dict] with:
  - topic_id: int
  - topic_name: str
  - items: List[Dict] with:
    - phrase/word/text: string
    - type: 'phrase' | 'word'
    - final_score_normalized: float [0, 1]
    - embedding: 384-dim vector
  - centroid: 384-dim vector
```

### Output
```
flashcards: List[Dict] with:
  - text: string
  - type: string
  - topic_id: int
  - topic_name: string
  - semantic_role: 'core' | 'supporting'
  - final_score: float [0, 1]
  - final_score_normalized: float [0, 1]
  - related_terms: List[string]
  - difficulty: 'beginner' | 'intermediate' | 'advanced'
  - tags: List[string]
```

## Flashcard Generation Strategy

### Per Topic
- **1 core flashcard**: Main concept with context
- **Up to 3 supporting flashcards**: Secondary concepts
- **Total**: 1-4 flashcards per topic

### Related Terms
- **Core flashcard**: Includes 5 supporting items for context
- **Supporting flashcards**: No related terms (focused learning)

## Example Workflow

### Input Topic
```
Topic: "Communication"
Items (unsorted):
- "dialogue" (score=0.92, centrality=0.85)
- "conversation" (score=0.88, centrality=0.82)
- "discussion" (score=0.87, centrality=0.81)
- "chat" (score=0.75, centrality=0.45)
- "talk" (score=0.72, centrality=0.40)
```

### Step 1: Rank and Assign Roles
```
Sorted by score:
1. dialogue (core, centrality=0.85)
2. conversation (supporting, centrality=0.82)
3. discussion (supporting, centrality=0.81)
4. chat (supporting, centrality=0.45)
5. talk (peripheral, centrality=0.40)
```

### Step 2: Group Synonyms
```
Synonym groups (similarity ≥ 0.75):
- Group 0: dialogue (primary)
- Group 1: conversation (primary), discussion (secondary, sim=0.81)
- Group 2: chat (primary)
- Group 3: talk (primary)
```

### Step 3: Generate Flashcards
```
Flashcard 1 (Core):
- text: "dialogue"
- role: "core"
- difficulty: "advanced"
- related_terms: ["conversation", "discussion", "chat"]

Flashcard 2 (Supporting):
- text: "conversation"
- role: "supporting"
- difficulty: "advanced"
- related_terms: []

Flashcard 3 (Supporting):
- text: "discussion"
- role: "supporting"
- difficulty: "advanced"
- related_terms: []

Flashcard 4 (Supporting):
- text: "chat"
- role: "supporting"
- difficulty: "intermediate"
- related_terms: []
```

## Key Characteristics

### Spaced Repetition Ready
- Each flashcard is independent
- Can be scheduled based on difficulty
- Related terms provide context for core cards

### Difficulty-Based Learning
- Beginner cards: Foundation concepts
- Intermediate cards: Building blocks
- Advanced cards: Complex/specialized terms

### Topic Organization
- Flashcards grouped by topic
- Related terms link concepts
- Tags enable filtering and search

### Score Preservation
- All scoring information preserved
- Enables adaptive learning algorithms
- Supports progress tracking

## Integration with Pipeline
- **Input from**: Step 7 (Topic Modeling) - topics with items and centroids
- **Output to**: Frontend/Learning App - flashcards for spaced repetition
- **Final stage**: Completes the simplified 8-step pipeline

## Comparison with Old Pipeline

### Old Pipeline (11 steps)
- Step 9: Topic Modeling (KMeans clustering)
- Step 10: Within-Topic Ranking (centrality + roles + synonyms)
- Step 11: Flashcard Generation (create flashcards)

### New Pipeline (8 steps)
- Step 8: Flashcard Generation (combines all three)

**Advantages of Combined Approach**:
- Simpler pipeline structure
- Fewer intermediate stages
- Faster execution
- Easier to understand and maintain

**Implementation**:
- All three algorithms still present
- Executed sequentially in single step
- Same output quality as old pipeline

## Configuration
- Core flashcards per topic: 1
- Supporting flashcards per topic: up to 3
- Related terms per core card: up to 5
- Synonym similarity threshold: 0.75
- Centrality threshold for supporting role: 0.6
- Difficulty thresholds: 0.6, 0.8
