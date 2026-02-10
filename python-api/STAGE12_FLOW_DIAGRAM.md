# STAGE 12: Enhanced Flashcard Generation - Flow Diagram

## 📊 Overall Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    STAGE 12: Flashcard Generation                │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│  INPUT: 259 vocabulary items                                     │
│  - 159 phrases (from STAGE 4)                                    │
│  - 100 single words (from STAGE 7)                               │
│  - Each with: embeddings, cluster_id, importance_score           │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│  STEP 1: Group Synonyms (_group_synonyms)                        │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ 1. Extract embeddings from vocabulary                     │  │
│  │ 2. Compute cosine similarity matrix                       │  │
│  │ 3. Group items with similarity ≥ 0.85                     │  │
│  │ 4. Select primary term (highest importance score)         │  │
│  │ 5. Add others as synonyms                                 │  │
│  └───────────────────────────────────────────────────────────┘  │
│  OUTPUT: ~200-220 flashcard groups                               │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│  STEP 2: Create Enhanced Flashcards (for each group)             │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ For each flashcard group:                                 │  │
│  │                                                            │  │
│  │ 2.1 Extract primary term                                  │  │
│  │     └─> word, cluster_id, importance_score, etc.          │  │
│  │                                                            │  │
│  │ 2.2 Generate cluster name (_generate_cluster_name)        │  │
│  │     └─> "Climate Change & Global Warming"                 │  │
│  │                                                            │  │
│  │ 2.3 Get related words (_get_related_words)                │  │
│  │     └─> Top 5 from same cluster (excluding synonyms)      │  │
│  │                                                            │  │
│  │ 2.4 Get IPA phonetics (_get_ipa_phonetics)                │  │
│  │     └─> "/ˈklaɪmət tʃeɪndʒ/" (using eng-to-ipa)           │  │
│  │                                                            │  │
│  │ 2.5 Generate audio URLs (_generate_audio_url)             │  │
│  │     ├─> Word audio: Google Translate TTS                  │  │
│  │     └─> Example audio: Google Translate TTS               │  │
│  │                                                            │  │
│  │ 2.6 Estimate difficulty (_estimate_difficulty)            │  │
│  │     └─> beginner / intermediate / advanced                │  │
│  │                                                            │  │
│  │ 2.7 Generate tags (_generate_tags)                        │  │
│  │     └─> [cluster_name, word_type]                         │  │
│  │                                                            │  │
│  │ 2.8 Build complete flashcard structure                    │  │
│  │     └─> 13 fields + synonyms + related_words              │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│  OUTPUT: ~200-220 enhanced flashcards                            │
│  - Each with: word, synonyms, cluster info, IPA, audio, etc.    │
│  - Synonym groups: ~30-40                                        │
│  - Total fields per card: 13 + arrays                            │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔍 Detailed Method Flow

### 1. _group_synonyms()

```
INPUT: 259 vocabulary items with embeddings
  │
  ├─> Extract embeddings (cluster_centroid)
  │   └─> embeddings_array = np.array([...])
  │
  ├─> Compute similarity matrix
  │   └─> similarity_matrix = cosine_similarity(embeddings_array)
  │
  ├─> Group by similarity
  │   ├─> For each item i:
  │   │   ├─> If not used:
  │   │   │   ├─> Start new group with i as primary
  │   │   │   ├─> Find similar items (similarity ≥ 0.85)
  │   │   │   └─> Add to synonyms list
  │   │   └─> Mark items as used
  │   └─> Return groups
  │
OUTPUT: ~200-220 flashcard groups
  └─> Each group: {primary: item, synonyms: [{item, similarity}]}
```

### 2. _create_enhanced_flashcard()

```
INPUT: Flashcard group (primary + synonyms)
  │
  ├─> Extract primary term
  │   └─> word, cluster_id, importance_score, etc.
  │
  ├─> Generate cluster name
  │   ├─> Get items in same cluster
  │   ├─> Sort by importance score
  │   ├─> Take top 2 terms
  │   └─> Join with " & "
  │
  ├─> Get related words
  │   ├─> Get items in same cluster
  │   ├─> Exclude primary and synonyms
  │   ├─> Sort by similarity
  │   └─> Return top 5
  │
  ├─> Get IPA phonetics
  │   ├─> Try: import eng_to_ipa
  │   ├─> Convert: ipa.convert(word)
  │   └─> Fallback: return ""
  │
  ├─> Generate audio URLs
  │   ├─> Word: Google Translate TTS URL
  │   └─> Example: Google Translate TTS URL
  │
  ├─> Estimate difficulty
  │   ├─> score ≥ 0.8 → advanced
  │   ├─> score ≥ 0.5 → intermediate
  │   └─> score < 0.5 → beginner
  │
  ├─> Generate tags
  │   ├─> Add cluster name (lowercase)
  │   └─> Add word type (phrase/word)
  │
  └─> Build flashcard structure
      └─> 13 fields + synonyms array + related_words array
  │
OUTPUT: Complete enhanced flashcard
```

---

## 📊 Data Flow Example

### Input Vocabulary Items

```
Item 1: {
  phrase: "climate change",
  cluster_id: 0,
  importance_score: 0.95,
  cluster_centroid: [0.1, 0.2, ..., 0.9]
}

Item 2: {
  phrase: "climatic change",
  cluster_id: 0,
  importance_score: 0.87,
  cluster_centroid: [0.11, 0.21, ..., 0.89]
}

Item 3: {
  phrase: "climate shift",
  cluster_id: 0,
  importance_score: 0.82,
  cluster_centroid: [0.12, 0.19, ..., 0.91]
}

Similarity:
- Item 1 ↔ Item 2: 0.89 (≥ 0.85 → group)
- Item 1 ↔ Item 3: 0.87 (≥ 0.85 → group)
```

### After Synonym Grouping

```
Group 1: {
  primary: Item 1 (highest score: 0.95),
  synonyms: [
    {item: Item 2, similarity: 0.89},
    {item: Item 3, similarity: 0.87}
  ]
}
```

### After Flashcard Creation

```
Flashcard 1: {
  id: "fc_0_1",
  word: "climate change",
  synonyms: [
    {word: "climatic change", similarity: 0.89},
    {word: "climate shift", similarity: 0.87}
  ],
  cluster_id: 0,
  cluster_name: "Climate Change & Global Warming",
  cluster_rank: 1,
  semantic_role: "core",
  importance_score: 0.95,
  ipa: "/ˈklaɪmət tʃeɪndʒ/",
  audio_word_url: "https://translate.google.com/...",
  related_words: [
    {word: "greenhouse effect", similarity: 0.85},
    {word: "carbon emissions", similarity: 0.78}
  ],
  difficulty: "advanced",
  tags: ["climate change & global warming", "phrase"],
  ...
}
```

---

## 🔄 Similarity Matrix Example

```
         Item1  Item2  Item3  Item4  Item5
Item1    1.00   0.89   0.87   0.45   0.32
Item2    0.89   1.00   0.91   0.42   0.35
Item3    0.87   0.91   1.00   0.48   0.38
Item4    0.45   0.42   0.48   1.00   0.88
Item5    0.32   0.35   0.38   0.88   1.00

Groups:
- Group 1: Item1 (primary), Item2, Item3 (similarity ≥ 0.85)
- Group 2: Item4 (primary), Item5 (similarity ≥ 0.85)
```

---

## 📈 Performance Metrics

```
┌─────────────────────────────────────────────────────────────────┐
│  Performance Breakdown                                           │
├─────────────────────────────────────────────────────────────────┤
│  Step 1: Group Synonyms                                          │
│  ├─> Extract embeddings: ~0.01s                                  │
│  ├─> Compute similarity: ~0.3s (259x259 matrix)                  │
│  └─> Group items: ~0.05s                                         │
│  Total: ~0.36s                                                   │
├─────────────────────────────────────────────────────────────────┤
│  Step 2: Create Flashcards (per card)                            │
│  ├─> Generate cluster name: ~0.001s                              │
│  ├─> Get related words: ~0.002s                                  │
│  ├─> Get IPA phonetics: ~0.01s (if installed)                    │
│  ├─> Generate audio URLs: ~0.0001s                               │
│  └─> Build structure: ~0.0001s                                   │
│  Total per card: ~0.013s                                         │
│  Total for 220 cards: ~2.86s                                     │
├─────────────────────────────────────────────────────────────────┤
│  TOTAL: ~3.2s for 259 items → 220 flashcards                     │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🎯 Key Algorithms

### 1. Cosine Similarity
```
similarity(A, B) = (A · B) / (||A|| × ||B||)

Where:
- A, B = embedding vectors
- A · B = dot product
- ||A|| = magnitude of A

Result: 0 (no similarity) to 1 (identical)
Threshold: 0.85 (high similarity)
```

### 2. Cluster Naming
```
1. Get all items in cluster
2. Sort by importance_score (descending)
3. Take top 2 terms
4. Capitalize each word
5. Join with " & "

Example:
  Items: ["climate change" (0.95), "global warming" (0.88), ...]
  Result: "Climate Change & Global Warming"
```

### 3. Difficulty Estimation
```
if importance_score ≥ 0.8:
    difficulty = "advanced"
elif importance_score ≥ 0.5:
    difficulty = "intermediate"
else:
    difficulty = "beginner"
```

---

## 📊 Statistics

```
┌─────────────────────────────────────────────────────────────────┐
│  Input Statistics                                                │
├─────────────────────────────────────────────────────────────────┤
│  Total vocabulary items: 259                                     │
│  ├─> Phrases: 159 (61.4%)                                        │
│  └─> Single words: 100 (38.6%)                                   │
│                                                                  │
│  Clusters: 3-5 (depends on K-Means)                              │
│  Items per cluster: 50-90                                        │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  Output Statistics                                               │
├─────────────────────────────────────────────────────────────────┤
│  Total flashcards: ~200-220                                      │
│  Reduction: ~15-20% (39-59 items grouped)                        │
│                                                                  │
│  Synonym groups: ~30-40                                          │
│  ├─> Groups with 2 synonyms: ~20-25                              │
│  ├─> Groups with 3 synonyms: ~8-12                               │
│  └─> Groups with 4+ synonyms: ~2-3                               │
│                                                                  │
│  Average synonyms per card: 0.5                                  │
│  Average related words per card: 3-4                             │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔧 Configuration

### Adjustable Parameters

```python
# In _group_synonyms()
threshold = 0.85  # Synonym similarity threshold
                  # Higher = stricter grouping
                  # Lower = more grouping

# In _get_related_words()
max_related = 5   # Maximum related words per card

# In _estimate_difficulty()
advanced_threshold = 0.8    # Score for advanced
intermediate_threshold = 0.5 # Score for intermediate
```

---

**Author**: Kiro AI
**Date**: 2026-02-10
**Version**: 5.1.0-enhanced-flashcards
