# 5 Key Extraction Files - Comprehensive Explanation

## Overview
These 5 files are the core components of the vocabulary extraction pipeline. Each handles a specific stage of processing.

---

## 1. phrase_centric_extractor.py
**Purpose**: Extract multi-word phrases from documents  
**Stage**: Step 4 of the pipeline  
**Main Class**: `PhraseCentricExtractor`

### What It Does
Extracts meaningful phrases (2+ words) from text using multiple filtering and scoring techniques.

### Key Methods

#### extract_vocabulary()
Main entry point that orchestrates the entire phrase extraction process.

**Process**:
1. Split text into sentences
2. Detect headings and document structure
3. Extract candidate phrases using POS patterns
4. Apply hard filtering (8 rules)
5. Apply semantic filtering
6. Compute TF-IDF scores
7. Compute phrase embeddings
8. Cluster phrases with elbow method
9. Select cluster representatives
10. Remove redundancy
11. Final ranking and cleaning

#### _extract_phrases()
Extracts candidate phrases using POS (Part-of-Speech) patterns.

**Patterns Extracted**:
- Noun phrases: NN NN, NN JJ NN, etc.
- Adjective + Noun: JJ NN
- Verb + Noun: VB NN
- Complex patterns: JJ NN NN, NN NN NN, etc.

#### _hard_filter()
Applies 8 hard filtering rules to remove invalid phrases:
1. Length check (2-5 words)
2. No stopwords at start/end
3. No pure numbers
4. No single letters
5. No excessive punctuation
6. No all-caps (likely acronyms)
7. No duplicate words
8. No template phrases

#### _semantic_filter()
Applies semantic filtering using embeddings and clustering.

**Process**:
1. Compute embeddings for all phrases
2. Use elbow method to find optimal clusters
3. Select representative phrases from each cluster
4. Remove redundant phrases

#### _contrastive_scoring()
Scores phrases based on contrastive learning.

**Factors**:
- Frequency in document
- Rarity in general corpus
- Semantic coherence
- Learning value

#### _final_ranking()
Ranks phrases by final score.

**Output**: Sorted list of phrases with scores

### Input/Output

**Input**:
```
text: str (document text)
max_phrases: int (maximum phrases to extract)
```

**Output**:
```
List[Dict] with:
- phrase: string
- learning_value: float [0, 1]
- frequency: int
- tfidf_score: float
- embedding: 384-dim vector
- final_score: float [0, 1]
```

### Example
```python
extractor = PhraseCentricExtractor()
phrases = extractor.extract_vocabulary(
    text="Machine learning is a subset of artificial intelligence...",
    max_phrases=30
)
# Output: [
#   {'phrase': 'machine learning', 'learning_value': 0.95, ...},
#   {'phrase': 'artificial intelligence', 'learning_value': 0.92, ...},
#   ...
# ]
```

---

## 2. word_ranker.py
**Purpose**: Extract and rank single words from documents  
**Stage**: Step 5 of the pipeline  
**Main Class**: `WordRanker`

### What It Does
Extracts important single words using 4 features and ranks them by importance.

### Key Methods

#### preprocess_text()
Tokenizes and POS-tags text.

**Process**:
1. Tokenize into words
2. POS tag each word
3. Filter by POS (NN, VB, JJ, etc.)
4. Lemmatize

**Output**: List of tokens with POS tags

#### filter_candidates()
Filters out stopwords and invalid words.

**Filters**:
- Remove stopwords (common words)
- Remove single letters
- Remove numbers
- Remove punctuation
- Keep only meaningful POS tags

#### extract_features()
Computes 4 features for each word:

1. **TF-IDF Score** (weight: 0.6)
   - Term Frequency-Inverse Document Frequency
   - Measures importance in document

2. **Word Length Score** (weight: 0.1)
   - Longer words often more specific
   - Normalized to [0, 1]

3. **Morphological Score** (weight: 0.3)
   - Complexity of word structure
   - Affixes, syllables, etc.

4. **Coverage Penalty** (weight: -0.5)
   - Penalizes words covered by phrases
   - Reduces redundancy

#### rank()
Combines features and ranks words.

**Formula**:
```
final_score = (0.6 × tfidf) + (0.1 × length) + (0.3 × morph) - (0.5 × coverage)
```

**Output**: Sorted list of words with scores

### Input/Output

**Input**:
```
text: str (document text)
phrases: List[Dict] (extracted phrases)
max_words: int (maximum words to extract)
```

**Output**:
```
List[Dict] with:
- word: string
- tfidf_score: float
- word_length_score: float
- morph_score: float
- coverage_penalty: float
- final_score: float [0, 1]
```

### Example
```python
ranker = WordRanker()
words = ranker.rank(
    text="Machine learning algorithms...",
    phrases=phrases,
    max_words=20
)
# Output: [
#   {'word': 'algorithm', 'final_score': 0.85, ...},
#   {'word': 'learning', 'final_score': 0.72, ...},
#   ...
# ]
```

---

## 3. context_intelligence.py
**Purpose**: Analyze text structure and find best context for vocabulary  
**Stage**: Step 3 of the pipeline  
**Main Classes**: `Sentence`, `SentenceScore`, `VocabularyContext`

### What It Does
Analyzes sentences and finds the best context (example sentence) for each vocabulary item.

### Key Functions

#### build_sentences()
Tokenizes text into sentences with linguistic properties.

**Process**:
1. Split text into sentences
2. Detect verbs in each sentence
3. Compute linguistic properties
4. Store sentence metadata

**Output**: List of Sentence objects with:
- text: sentence content
- has_verb: boolean
- position: in document
- length: word count

#### detect_verb_spacy()
Detects if sentence contains a verb.

**Methods**:
- English: Uses spaCy NLP
- Vietnamese: Heuristic-based detection

#### score_sentence()
Scores sentence quality for context.

**Scoring Factors**:
1. **Keyword Density** (40% weight)
   - How many vocabulary words in sentence
   - Higher = better context

2. **Length Score** (30% weight)
   - Optimal length: 10-20 words
   - Too short: unclear
   - Too long: confusing

3. **Position Score** (20% weight)
   - Earlier sentences: higher score
   - Introductions often clearer

4. **Clarity Score** (10% weight)
   - Has verb: +0.5
   - Simple structure: +0.3

#### select_best_contexts()
Selects best sentence for each vocabulary item.

**Process**:
1. Find all sentences containing word
2. Score each sentence
3. Select highest-scoring sentence
4. Return as context

#### select_vocabulary_contexts()
Main function to get contexts for all vocabulary.

**Output**: Dictionary mapping vocabulary to best context sentences

### Input/Output

**Input**:
```
text: str (document text)
vocabulary: List[Dict] (vocabulary items)
```

**Output**:
```
Dict mapping:
- vocabulary_item → best_context_sentence
- vocabulary_item → context_score
```

### Example
```python
sentences = build_sentences("Machine learning is powerful. Algorithms learn from data.")
contexts = select_vocabulary_contexts(
    text=text,
    vocabulary=[{'word': 'algorithm'}, {'word': 'learning'}]
)
# Output: {
#   'algorithm': 'Algorithms learn from data.',
#   'learning': 'Machine learning is powerful.'
# }
```

---

## 4. heading_detector.py
**Purpose**: Detect document structure and heading hierarchy  
**Stage**: Step 2 of the pipeline  
**Main Class**: `HeadingDetector`

### What It Does
Detects headings in documents and builds hierarchical structure.

### Key Classes

#### HeadingLevel (Enum)
Heading levels: H1, H2, H3, H4, PARAGRAPH

#### Heading (Dataclass)
Represents a single heading with:
- heading_id: unique identifier
- level: H1-H4
- text: heading content
- position: in document
- parent_id: parent heading
- children_ids: child headings

#### DocumentStructure (Dataclass)
Complete document structure with:
- headings: list of all headings
- hierarchy: parent-child relationships
- sentence_to_heading: mapping sentences to headings

### Key Methods

#### detect_headings()
Detects all headings in text.

**Detection Methods** (in order):
1. **Markdown**: `# Heading`, `## Heading`, etc.
2. **Numbering**: `1. Introduction`, `1.1 Background`
3. **Roman Numerals**: `I. Introduction`
4. **Heuristic**: Capitalization, keywords, length

#### _is_heading()
Determines if a line is a heading.

**Heuristic Scoring**:
- Capitalization ratio > 70%
- Contains heading keywords
- All caps
- Followed by empty line
- Short length (≤ 15 words)

#### build_hierarchy()
Builds parent-child relationships between headings.

**Logic**:
- H1 is top level
- H2 is child of H1
- H3 is child of H2
- etc.

#### assign_sentences_to_headings()
Maps each sentence to its containing heading.

**Process**:
1. Find position of each sentence
2. Find position of each heading
3. Assign sentence to closest preceding heading

#### parse_document_structure()
Main function combining all steps.

**Output**: DocumentStructure object with complete hierarchy

### Input/Output

**Input**:
```
text: str (document text)
sentences: List[str] (sentence list)
```

**Output**:
```
DocumentStructure with:
- headings: List[Heading]
- hierarchy: Dict[parent_id → [child_ids]]
- sentence_to_heading: Dict[sentence_id → heading_id]
```

### Example
```python
detector = HeadingDetector()
structure = detector.parse_document_structure(
    text="# Introduction\n## Background\nSome text...",
    sentences=["Some text..."]
)
# Output: DocumentStructure with:
# - H1: Introduction
#   - H2: Background
```

---

## 5. new_pipeline_learned_scoring.py
**Purpose**: Advanced scoring and topic modeling  
**Stage**: Steps 6-8 of the pipeline  
**Main Class**: `NewPipelineLearnedScoring`

### What It Does
Combines phrases and words, applies learned scoring, and generates flashcards with topic modeling.

### Key Methods

#### process()
Main orchestration method.

**Process**:
1. Independent Scoring (4 signals)
2. Merge phrases and words
3. Learned Final Scoring (regression)
4. Topic Modeling (KMeans)
5. Within-Topic Ranking
6. Flashcard Generation

#### _independent_scoring()
Computes 4 independent signals:

1. **Semantic Score** (0.6 weight)
   - Cosine similarity with document embedding
   - How relevant to document

2. **Learning Value** (0.4 weight)
   - From extraction stage
   - Educational importance

3. **Frequency Score** (0.1 weight)
   - Log-scaled occurrence count
   - How common in document

4. **Rarity Score** (0.2 weight)
   - IDF-based specificity
   - How unique/specific

#### _merge()
Combines phrases and words into single list.

**Process**:
1. Add all phrases
2. Add all words
3. Preserve metadata
4. Standardize format

#### _learned_final_scoring()
Uses Ridge regression to predict final scores.

**Model**:
- Input: 4 signals
- Output: final_score [0, 1]
- Training: Optional with labeled data

#### _topic_modeling()
Clusters items into topics using KMeans.

**Process**:
1. Extract embeddings
2. KMeans clustering
3. Generate topic names
4. Compute centroids

#### _within_topic_ranking()
Ranks items within each topic.

**Process**:
1. Compute centrality
2. Sort by score
3. Group synonyms
4. Assign semantic roles

#### _flashcard_generation()
Creates flashcards from topics.

**Process**:
1. Select core items
2. Create flashcards
3. Estimate difficulty
4. Add metadata

### Input/Output

**Input**:
```
phrases: List[Dict] (extracted phrases)
words: List[Dict] (extracted words)
document_text: str (original text)
```

**Output**:
```
{
  'vocabulary': List[Dict] (merged and scored),
  'topics': List[Dict] (organized by topic),
  'flashcards': List[Dict] (ready for learning),
  'statistics': Dict (metrics)
}
```

### Example
```python
pipeline = NewPipelineLearnedScoring(n_topics=5)
result = pipeline.process(
    phrases=phrases,
    words=words,
    document_text=text
)
# Output: {
#   'vocabulary': [...],
#   'topics': [...],
#   'flashcards': [...]
# }
```

---

## How They Work Together

### Pipeline Flow

```
Raw Document
    ↓
heading_detector.py (Step 2)
├─ Detect headings
├─ Build hierarchy
└─ Map sentences to headings
    ↓
context_intelligence.py (Step 3)
├─ Build sentences
├─ Score sentences
└─ Select best contexts
    ↓
phrase_centric_extractor.py (Step 4)
├─ Extract phrases
├─ Filter and score
└─ Output: phrases with learning_value
    ↓
word_ranker.py (Step 5)
├─ Extract words
├─ Compute 4 features
└─ Output: words with final_score
    ↓
new_pipeline_learned_scoring.py (Steps 6-8)
├─ Independent Scoring
├─ Merge
├─ Learned Final Scoring
├─ Topic Modeling
├─ Within-Topic Ranking
└─ Flashcard Generation
    ↓
Flashcards for Learning App
```

### Data Flow

```
heading_detector → structure (headings, hierarchy)
                ↓
context_intelligence → contexts (best sentences)
                ↓
phrase_centric_extractor → phrases (with learning_value)
                ↓
word_ranker → words (with final_score)
                ↓
new_pipeline_learned_scoring → flashcards (with topics)
```

---

## Key Differences

| File | Purpose | Input | Output | Complexity |
|------|---------|-------|--------|-----------|
| heading_detector | Structure | Text | Hierarchy | Low |
| context_intelligence | Context | Text + Vocab | Sentences | Medium |
| phrase_centric_extractor | Phrases | Text | Phrases | High |
| word_ranker | Words | Text + Phrases | Words | Medium |
| new_pipeline_learned_scoring | Scoring + Topics | Phrases + Words | Flashcards | High |

---

## When to Use Each

### heading_detector.py
- When document has clear structure
- Need to understand document organization
- Want to map vocabulary to sections

### context_intelligence.py
- Need best example sentences
- Want to understand vocabulary in context
- Building learning materials

### phrase_centric_extractor.py
- Extracting multi-word terms
- Need semantic filtering
- Want high-quality phrases

### word_ranker.py
- Extracting single words
- Need to avoid redundancy with phrases
- Want balanced vocabulary

### new_pipeline_learned_scoring.py
- Need final scoring
- Want topic organization
- Generating flashcards
- Need learned model predictions

---

## Configuration

### heading_detector.py
- Heading keywords (customizable)
- Detection patterns (markdown, numbering, etc.)

### context_intelligence.py
- Scoring weights (keyword, length, position, clarity)
- Language (English, Vietnamese)

### phrase_centric_extractor.py
- POS patterns (customizable)
- Filtering rules (8 hard rules)
- Clustering method (elbow)

### word_ranker.py
- Feature weights (TF-IDF, length, morph, coverage)
- Stopword list (customizable)

### new_pipeline_learned_scoring.py
- n_topics (number of topics)
- Model path (for regression model)
- Signal weights (semantic, learning, frequency, rarity)

---

## Performance Characteristics

| File | Time Complexity | Space Complexity | Bottleneck |
|------|-----------------|------------------|-----------|
| heading_detector | O(n) | O(n) | Regex matching |
| context_intelligence | O(n²) | O(n) | Sentence scoring |
| phrase_centric_extractor | O(n² × d) | O(n × d) | Embedding + clustering |
| word_ranker | O(n log n) | O(n) | Sorting |
| new_pipeline_learned_scoring | O(n × d × k) | O(n × d) | KMeans clustering |

---

## Summary

These 5 files form the core of the vocabulary extraction pipeline:

1. **heading_detector**: Understands document structure
2. **context_intelligence**: Finds best learning contexts
3. **phrase_centric_extractor**: Extracts multi-word terms
4. **word_ranker**: Extracts single words
5. **new_pipeline_learned_scoring**: Scores, organizes, and generates flashcards

Together they transform raw documents into organized, scored vocabulary ready for language learning.
