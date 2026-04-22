# Step 7: Topic Modeling - Detailed Documentation

## Overview
**File**: `python-api/new_pipeline_learned_scoring.py`  
**Method**: `_topic_modeling()` (Lines 407-469)  
**Stage**: Stage 7 of the simplified 8-step pipeline  
**Purpose**: Cluster vocabulary items into semantic topics using KMeans clustering

## What It Does
Topic Modeling groups related vocabulary items into topics based on semantic similarity. This helps organize vocabulary into coherent learning units where items in the same topic are semantically related.

## Algorithm Flow

### 1. Input Validation
```python
if not items or not self.embedding_model:
    # Fallback: single topic
    return [{
        'topic_id': 0,
        'topic_name': 'General',
        'items': items,
        'centroid': None
    }]
```
- If no items or no embedding model, returns a single "General" topic
- This is a safety fallback for edge cases

### 2. Extract Embeddings
```python
embeddings = []
for item in items:
    if 'embedding' in item:
        embeddings.append(item['embedding'])
    else:
        embeddings.append(np.zeros(384))

embeddings = np.array(embeddings)
```
- Each item has a 384-dimensional embedding (from SentenceTransformer)
- If embedding missing, uses zero vector as fallback
- Converts to NumPy array for KMeans processing

### 3. Determine Number of Clusters
```python
n_clusters = min(self.n_topics, len(items))

if n_clusters < 2:
    return [{
        'topic_id': 0,
        'topic_name': 'General',
        'items': items,
        'centroid': np.mean(embeddings, axis=0) if len(embeddings) > 0 else None
    }]
```
- Number of clusters = minimum of configured `n_topics` and number of items
- If only 1 cluster possible, returns single topic with centroid as mean of all embeddings

### 4. KMeans Clustering
```python
kmeans = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
cluster_labels = kmeans.fit_predict(embeddings)

# Assign cluster_id
for i, item in enumerate(items):
    item['cluster_id'] = int(cluster_labels[i])
```
- Uses scikit-learn's KMeans with:
  - `random_state=42`: Reproducible results
  - `n_init=10`: Runs algorithm 10 times, picks best result
- Each item gets a `cluster_id` (0 to n_clusters-1)

### 5. Build Topic Objects
```python
topics = []
for topic_id in range(n_clusters):
    topic_items = [
        item for i, item in enumerate(items)
        if cluster_labels[i] == topic_id
    ]
    
    # Generate topic name from top items
    topic_name = self._generate_topic_name(topic_items)
    
    topics.append({
        'topic_id': topic_id,
        'topic_name': topic_name,
        'items': topic_items,
        'centroid': kmeans.cluster_centers_[topic_id]
    })

return topics
```
- For each cluster, creates a topic object containing:
  - `topic_id`: Cluster identifier (0 to n_clusters-1)
  - `topic_name`: Generated from top-scoring items in cluster
  - `items`: All items assigned to this cluster
  - `centroid`: The cluster center (384-dim vector)

## Topic Name Generation
The `_generate_topic_name()` method:
1. Gets top 3 items by `final_score`
2. Uses the text of the highest-scoring item
3. Converts to title case
4. Falls back to "General" if no items

## Data Flow

### Input
```
items: List[Dict] with:
  - embedding: 384-dim vector
  - final_score: float [0, 1]
  - phrase/word/text: string
  - ... other metadata
```

### Output
```
topics: List[Dict] with:
  - topic_id: int
  - topic_name: str
  - items: List[Dict] (items in this topic)
  - centroid: np.array (384-dim)
```

## Configuration
- `self.n_topics`: Number of topics to create (configurable)
- `self.embedding_model`: SentenceTransformer model for embeddings
- KMeans parameters: `random_state=42`, `n_init=10`

## Key Characteristics
- **Unsupervised**: No labels needed, purely semantic clustering
- **Deterministic**: Same input always produces same output (fixed random_state)
- **Scalable**: Works with any number of items
- **Semantic**: Groups items by meaning, not just frequency
- **Centroid-based**: Each topic has a center point in embedding space

## Example
If processing a document about "Machine Learning":
- Items: ["neural network", "deep learning", "algorithm", "training", "model", "data"]
- KMeans might create 2 topics:
  - Topic 0: "Neural Network" (neural network, deep learning, training)
  - Topic 1: "Algorithm" (algorithm, model, data)
- Each topic has its centroid in 384-dim space

## Integration with Pipeline
- **Input from**: Step 6 (Score Normalization & Ranking) - normalized vocabulary items with embeddings
- **Output to**: Step 8 (Flashcard Generation) - topics for flashcard creation
- **Dependency**: Requires embeddings from phrase/word extraction stages
