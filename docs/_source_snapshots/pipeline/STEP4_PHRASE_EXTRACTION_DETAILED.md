# Step 4: Phrase Extraction (Learning-to-Rank) - Detailed Guide

## Overview
Step 4 in the document processing pipeline extracts multi-word phrases from documents using linguistic patterns and machine learning scoring. It identifies meaningful phrases (noun phrases, adjective-noun combinations, verb-noun patterns) and ranks them by relevance using semantic embeddings, frequency analysis, and learned scoring models.

**File Location:** `python-api/phrase_centric_extractor.py`  
**Called From:** `python-api/complete_pipeline.py` (Lines 142-149)  
**Purpose:** Extract and rank multi-word phrases that represent key concepts in the document

---

## Data Structures

### Phrase Dictionary Format
```python
{
    'phrase': str,                    # The phrase text (lowercase)
    'occurrences': List[Dict],        # Where phrase appears
    'frequency': int,                 # Total occurrences
    'sentence_count': int,            # Unique sentences containing phrase
    'final_score': float,             # Composite score (0-1)
    'semantic_score': float,          # Semantic relevance score
    'frequency_score': float,         # Frequency-based score
    'length_score': float,            # Length preference score
    'cluster_id': int,                # Semantic cluster ID
    'semantic_theme': str,            # Cluster theme (e.g., "General")
    'is_cluster_representative': bool # Is this cluster's top phrase
}
```

### Occurrence Dictionary Format
```python
{
    'sentence_id': str,               # ID of sentence containing phrase
    'sentence_text': str,             # Full sentence text
    'phrase_type': str                # 'noun_phrase', 'adj_noun', 'verb_noun'
}
```

---

## Main Algorithm: extract_vocabulary()

**Location:** Lines 100-304  
**Input:** `text: str`, `max_phrases: int = 50`, `min_phrase_length: int = 2`, `max_phrase_length: int = 5`  
**Output:** `List[Dict]` - Ranked phrases with scores

### Process Flow (5 Main Steps):

```
Step 1: Sentence & Heading Analysis
    ↓
Step 2: Candidate Phrase Extraction
    ↓
Step 3: Hard Filtering Rules
    ↓
Step 3B: Scoring-Based Learning System
    ↓
Output: Ranked Phrases
```

---

## Step 1: Sentence-Level Analysis

**Location:** Lines 113-125

### Functions:

#### _split_sentences() (Lines 306-327)
```python
def _split_sentences(self, text: str) -> List[Dict]:
    from nltk.tokenize import sent_tokenize
    
    sentences_text = sent_tokenize(text)
    
    sentences = []
    current_pos = 0
    for i, sent_text in enumerate(sentences_text):
        start = text.find(sent_text, current_pos)
        end = start + len(sent_text)
        current_pos = end
        
        sentences.append({
            'id': f'S{i}',
            'text': sent_text.strip(),
            'start': start,
            'end': end
        })
    
    return sentences
```
**Purpose:** Split document into sentences with position tracking

#### _detect_headings() (Lines 333-376)
```python
def _detect_headings(self, text: str) -> List[Dict]:
    headings = []
    lines = text.split('\n')
    
    for i, line in enumerate(lines):
        line = line.strip()
        
        if not line:
            continue
        
        # All caps
        if line.isupper() and len(line.split()) <= 10:
            headings.append({
                'id': f'H{len(headings)}',
                'text': line,
                'level': 1,
                'position': i
            })
        
        # Title case
        elif line.istitle() and len(line.split()) <= 10 and not line.endswith('.'):
            headings.append({
                'id': f'H{len(headings)}',
                'text': line,
                'level': 2,
                'position': i
            })
        
        # Markdown style
        elif line.startswith('#'):
            level = len(line) - len(line.lstrip('#'))
            text = line.lstrip('#').strip()
            headings.append({
                'id': f'H{len(headings)}',
                'text': text,
                'level': level,
                'position': i
            })
    
    return headings
```
**Purpose:** Detect document headings (all caps, title case, markdown)

---

## Step 2: Candidate Phrase Extraction

**Location:** Lines 379-449

### _extract_phrases() Algorithm

```python
def _extract_phrases(
    self,
    sentences: List[Dict],
    min_length: int = 2,
    max_length: int = 5
) -> List[Dict]:
    phrases = []
    phrase_to_sentences = defaultdict(list)
    
    for sent_dict in sentences:
        sent_text = sent_dict['text']
        sent_id = sent_dict['id']
        
        # Method 1: Extract noun phrases using NLTK
        noun_phrases = self._extract_noun_phrases_nltk(sent_text)
        
        for phrase_text in noun_phrases:
            phrase_text = phrase_text.lower().strip()
            word_count = len(phrase_text.split())
            
            if word_count >= min_length and word_count <= max_length:
                phrase_to_sentences[phrase_text].append({
                    'sentence_id': sent_id,
                    'sentence_text': sent_text,
                    'phrase_type': 'noun_phrase'
                })
        
        # Method 2: Extract Adj + Noun patterns
        tokens_pos = self._nltk_pos_tag(sent_text)
        for i in range(len(tokens_pos) - 1):
            word1, pos1 = tokens_pos[i]
            word2, pos2 = tokens_pos[i + 1]
            
            if pos1.startswith('JJ') and pos2.startswith('NN'):  # ADJ + NOUN
                phrase_text = f"{word1} {word2}".lower()
                word_count = len(phrase_text.split())
                
                if word_count >= min_length and word_count <= max_length:
                    phrase_to_sentences[phrase_text].append({
                        'sentence_id': sent_id,
                        'sentence_text': sent_text,
                        'phrase_type': 'adj_noun'
                    })
        
        # Method 3: Extract Verb + Noun patterns
        for i in range(len(tokens_pos) - 1):
            word1, pos1 = tokens_pos[i]
            word2, pos2 = tokens_pos[i + 1]
            
            if pos1.startswith('VB') and pos2.startswith('NN'):  # VERB + NOUN
                phrase_text = f"{word1} {word2}".lower()
                word_count = len(phrase_text.split())
                
                if word_count >= min_length and word_count <= max_length:
                    phrase_to_sentences[phrase_text].append({
                        'sentence_id': sent_id,
                        'sentence_text': sent_text,
                        'phrase_type': 'verb_noun'
                    })
    
    # Convert to list format
    for phrase_text, occurrences in phrase_to_sentences.items():
        phrases.append({
            'phrase': phrase_text,
            'occurrences': occurrences,
            'frequency': len(occurrences),
            'sentence_count': len(set(occ['sentence_id'] for occ in occurrences))
        })
    
    return phrases
```

### Three Extraction Methods:

#### Method 1: Noun Phrases (Lines 59-81)
```python
def _extract_noun_phrases_nltk(self, text: str) -> List[str]:
    tokens_pos = self._nltk_pos_tag(text) 
    noun_phrases = []
    current_phrase = []
    
    for word, pos in tokens_pos:
        if pos.startswith('NN'):  # Noun
            current_phrase.append(word)
        elif pos.startswith('JJ') and current_phrase:  # Adjective (if after noun)
            current_phrase.append(word)
        elif pos in ['DT'] and not current_phrase:  # Determiner (start)
            current_phrase.append(word)
        else:
            # End of phrase
            if len(current_phrase) >= 2:
                noun_phrases.append(' '.join(current_phrase))
            current_phrase = []
    
    if len(current_phrase) >= 2:
        noun_phrases.append(' '.join(current_phrase))
    
    return noun_phrases
```
**Pattern:** [DT?] [JJ*] [NN+]  
**Examples:** "the machine learning", "artificial intelligence", "neural networks"

#### Method 2: Adjective + Noun
**Pattern:** JJ + NN  
**Examples:** "machine learning", "artificial intelligence", "deep learning"

#### Method 3: Verb + Noun
**Pattern:** VB + NN  
**Examples:** "process data", "train model", "extract features"

---

## Step 3: Hard Filtering Rules

**Location:** Lines 451-519

### _hard_filter() Algorithm

```python
def _hard_filter(
    self,
    phrases: List[Dict],
    min_words: int = 2
) -> List[Dict]:
    filtered = []
    
    for phrase_dict in phrases:
        phrase = phrase_dict['phrase']
        words = phrase.split()
        
        # Rule 1: Minimum word count
        if len(words) < min_words:
            if phrase.lower() not in self.technical_whitelist:
                continue
        
        # Rule 2: Discourse stopwords
        if any(word in self.discourse_stopwords for word in words):
            continue
        
        # Rule 3: Template phrases
        if self._is_template_phrase(phrase):
            continue
        
        # Rule 4: Must form meaningful concept
        if not self._is_meaningful_concept(phrase):
            continue
        
        # Rule 5: Remove weird characters
        if re.search(r'[^a-zA-Z\s\-]', phrase):
            continue
        
        # Rule 6: Remove typo patterns
        has_typo = False
        for word in words:
            if len(word) > 2:
                for i in range(len(word) - 2):
                    if word[i] == word[i+1] == word[i+2]:
                        has_typo = True
                        break
            if has_typo:
                break
        if has_typo:
            continue
        
        # Rule 7: Remove non-English phrases
        vietnamese_patterns = [
            'phu', 'thoi', 'nhu', 'nha', 'cho', 'cua', 'voi', 'thi', 'den',
            'anh huong', 'moi truong', 'thu gian', 'quen toot', 'bi o nhiem',
            'khong khi', 'suc khoe', 'tam ly', 'benh tat', 'nguoi dan'
        ]
        phrase_lower = phrase.lower()
        if any(pattern in phrase_lower for pattern in vietnamese_patterns):
            continue
        
        # Rule 8: Remove overly generic phrases
        generic_verbs = ['have', 'get', 'make', 'do', 'take', 'give']
        generic_nouns = ['information', 'knowledge', 'thing', 'way', 'time', 'people']
        if len(words) == 2:
            if words[0].lower() in generic_verbs and words[1].lower() in generic_nouns:
                continue
        
        filtered.append(phrase_dict)
    
    return filtered
```

### 8 Filtering Rules:

| Rule | Condition | Example Removed |
|------|-----------|-----------------|
| 1 | < 2 words (unless technical) | "ai" |
| 2 | Contains discourse stopwords | "well however", "may even" |
| 3 | Template phrase pattern | "one of the most" |
| 4 | Not meaningful concept | Random word combinations |
| 5 | Contains special characters | "machine@learning", "data#science" |
| 6 | Typo patterns (3+ repeated chars) | "gget data", "maachine learning" |
| 7 | Non-English (Vietnamese patterns) | "moi truong", "suc khoe" |
| 8 | Generic verb + noun | "have information", "get knowledge" |

### Helper Functions:

#### _is_template_phrase() (Lines 606-625)
```python
def _is_template_phrase(self, phrase: str) -> bool:
    templates = [
        'one of the most',
        'in modern life',
        'this problem',
        'there are many',
        'it is clear that',
        'in my opinion',
        'i think that',
        'many people',
        'these days',
        'nowadays'
    ]
    return any(template in phrase.lower() for template in templates)
```

#### _is_meaningful_concept() (Lines 627-639)
```python
def _is_meaningful_concept(self, phrase: str) -> bool:
    # Check if phrase has semantic meaning
    # Avoid pure function words or articles
    function_words = {'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at'}
    words = phrase.lower().split()
    
    # At least one content word
    content_words = [w for w in words if w not in function_words]
    return len(content_words) >= 1
```

---

## Step 3.2: Phrase Lexical Specificity Filter

**Location:** Lines 531-574

### _phrase_lexical_specificity_filter() Algorithm

```python
def _phrase_lexical_specificity_filter(self, phrases: List[Dict]) -> List[Dict]:
    generic_head_nouns = {
        'thing', 'problem', 'way', 'result', 'solution', 'cause',
        'issue', 'matter', 'aspect', 'factor', 'element', 'point',
        'reason', 'effect', 'impact', 'influence', 'situation',
        'case', 'example', 'instance', 'type', 'kind'
    }
    
    discourse_templates = [
        'one of the most',
        'in modern life',
        'this problem',
        'there are many',
        'it is clear that',
        'in my opinion',
        'i think that',
        'many people',
        'these days',
        'nowadays'
    ]
    
    filtered = []
    for phrase_dict in phrases:
        phrase = phrase_dict['phrase'].lower()
        
        # Check discourse templates
        if any(template in phrase for template in discourse_templates):
            continue
        
        # Check head noun (rightmost noun)
        tokens_pos = self._nltk_pos_tag(phrase)
        head_noun = None
        
        for word, pos in reversed(tokens_pos):
            if pos.startswith('NN'):
                head_noun = word.lower()
                break
        
        if head_noun and head_noun in generic_head_nouns:
            continue
        
        filtered.append(phrase_dict)
    
    return filtered
```

**Purpose:** Remove phrases with generic head nouns (rightmost noun)

**Examples Removed:**
- "the problem" (head noun: "problem")
- "main issue" (head noun: "issue")
- "important factor" (head noun: "factor")

---

## Step 3B: Scoring-Based Learning System

**Location:** Lines 195-304

### Scoring Pipeline:

```
Input: Filtered Phrases
    ↓
[3B.1] Compute Hybrid Scores
    - Semantic score (embeddings)
    - Frequency score (TF-IDF)
    - Length score (preference)
    ↓
[3B.2] Rank by Final Score
    ↓
[3B.3] Semantic Clustering
    - Group similar phrases
    - Select representatives
    ↓
[3B.4] Filter by Score Threshold
    - Keep score >= 0.3
    ↓
[3B.5] Final Cleaning
    - Remove meaningless phrases
    ↓
Output: Ranked Phrases with Clusters
```

### 3B.1: Compute Hybrid Scores

```python
from phrase_scorer import PhraseScorer

scorer = PhraseScorer(embedding_model=self.embedding_model)

filtered_phrases = scorer.compute_scores(
    phrases=filtered_phrases,
    document_text=text
)
```

**Scoring Components:**
1. **Semantic Score** - Relevance to document using embeddings
2. **Frequency Score** - TF-IDF based on occurrence
3. **Length Score** - Preference for 2-4 word phrases

### 3B.2: Rank Phrases

```python
filtered_phrases = scorer.rank_phrases(
    phrases=filtered_phrases,
    top_k=None  # Keep all for now
)
```

**Ranking:** Sorts by `final_score` (descending)

### 3B.3: Semantic Clustering

```python
if len(filtered_phrases) >= 2:
    filtered_phrases, cluster_info = scorer.cluster_phrases(
        phrases=filtered_phrases,
        threshold=0.4,  # Cosine distance threshold
        linkage='average'
    )
    
    # Assign cluster metadata
    for phrase in filtered_phrases:
        cid = phrase.get('cluster_id', 0)
        matching_cluster = next((c for c in cluster_info if c['cluster_id'] == cid), None)
        if matching_cluster:
            phrase['semantic_theme'] = matching_cluster.get('semantic_theme', 'General')
            phrase['is_cluster_representative'] = (phrase['phrase'] == matching_cluster.get('top_phrase', ''))
```

**Purpose:** Group semantically similar phrases for flashcard generation

**Example:**
```
Cluster 0: "machine learning" (representative)
  - "deep learning"
  - "neural networks"
  - "learning algorithms"

Cluster 1: "data processing" (representative)
  - "data analysis"
  - "data extraction"
  - "process data"
```

### 3B.4: Filter by Score Threshold

```python
score_threshold = 0.3
filtered_phrases = [p for p in filtered_phrases if p.get('final_score', 0) >= score_threshold]
```

**Purpose:** Remove low-scoring phrases

### 3B.5: Final Cleaning

```python
filtered_phrases = self._final_phrase_cleaning(filtered_phrases)
```

**Purpose:** Remove remaining meaningless phrases

---

## Language Detection

**Location:** Lines 83-98

### _is_english_text() Algorithm

```python
def _is_english_text(self, text: str) -> bool:
    # Count ASCII alphabetic characters
    ascii_chars = sum(1 for c in text if c.isascii() and c.isalpha())
    
    # Count non-ASCII characters
    non_ascii_chars = sum(1 for c in text if not c.isascii() and c.isalpha())
    
    total_chars = ascii_chars + non_ascii_chars
    
    if total_chars == 0:
        return True  # No letters, assume English
    
    # If more than 30% non-ASCII, likely not English
    non_ascii_ratio = non_ascii_chars / total_chars
    
    return non_ascii_ratio < 0.3
```

**Purpose:** Detect if text is English or another language

**Threshold:** 30% non-ASCII characters

---

## Integration in Complete Pipeline

**Location:** `python-api/complete_pipeline.py` (Lines 142-149)

### Execution:
```python
# STAGE 4: Phrase Extraction (with L2R)
print(f"\n[STAGE 4] Phrase Extraction (Learning-to-Rank)...")

phrases = self.phrase_extractor.extract_vocabulary(
    text=normalized_text,
    max_phrases=max_phrases
)

print(f"  ✓ Extracted {len(phrases)} phrases")
```

### Output:
```python
phrases = [
    {
        'phrase': 'machine learning',
        'occurrences': [...],
        'frequency': 5,
        'sentence_count': 4,
        'final_score': 0.92,
        'semantic_score': 0.88,
        'frequency_score': 0.85,
        'length_score': 1.0,
        'cluster_id': 0,
        'semantic_theme': 'AI Concepts',
        'is_cluster_representative': True
    },
    ...
]
```

---

## Example Walkthrough

### Input Document:
```
Machine learning is a subset of artificial intelligence.
Deep learning uses neural networks for pattern recognition.
The machine learning algorithm processes data efficiently.
Neural networks are inspired by biological neurons.
Data science combines machine learning with statistics.
```

### Step 1: Sentence Analysis
```
S0: "Machine learning is a subset of artificial intelligence."
S1: "Deep learning uses neural networks for pattern recognition."
S2: "The machine learning algorithm processes data efficiently."
S3: "Neural networks are inspired by biological neurons."
S4: "Data science combines machine learning with statistics."
```

### Step 2: Candidate Extraction
```
Noun Phrases:
- "machine learning" (S0, S2, S4)
- "artificial intelligence" (S0)
- "deep learning" (S1)
- "neural networks" (S1, S3)
- "pattern recognition" (S1)
- "data science" (S4)

Adj+Noun:
- "biological neurons" (S3)

Total: 8 candidate phrases
```

### Step 3: Hard Filtering
```
All 8 phrases pass hard filtering
(no discourse stopwords, templates, or generic patterns)
```

### Step 3.2: Specificity Filtering
```
All 8 phrases pass specificity filtering
(head nouns are specific: learning, intelligence, networks, recognition, science, neurons)
```

### Step 3B: Scoring
```
Scores (example):
- "machine learning": 0.92 (high frequency, high semantic relevance)
- "neural networks": 0.88 (high frequency, high semantic relevance)
- "deep learning": 0.85 (moderate frequency, high semantic relevance)
- "artificial intelligence": 0.82 (low frequency, high semantic relevance)
- "data science": 0.80 (low frequency, moderate semantic relevance)
- "pattern recognition": 0.75 (low frequency, moderate semantic relevance)
- "biological neurons": 0.65 (low frequency, lower semantic relevance)
```

### Step 3B.3: Clustering
```
Cluster 0 (AI Concepts):
  - "machine learning" (representative)
  - "deep learning"
  - "neural networks"
  - "artificial intelligence"

Cluster 1 (Data & Analysis):
  - "data science" (representative)
  - "pattern recognition"

Cluster 2 (Biology):
  - "biological neurons" (representative)
```

### Final Output:
```python
[
    {
        'phrase': 'machine learning',
        'frequency': 3,
        'final_score': 0.92,
        'cluster_id': 0,
        'semantic_theme': 'AI Concepts',
        'is_cluster_representative': True
    },
    {
        'phrase': 'neural networks',
        'frequency': 2,
        'final_score': 0.88,
        'cluster_id': 0,
        'semantic_theme': 'AI Concepts',
        'is_cluster_representative': False
    },
    ...
]
```

---

## Key Features

1. **Multiple Extraction Methods:** Noun phrases, Adj+Noun, Verb+Noun patterns
2. **Comprehensive Filtering:** 8 hard rules + specificity filtering
3. **Hybrid Scoring:** Semantic + frequency + length components
4. **Semantic Clustering:** Groups similar phrases for flashcards
5. **Language Detection:** Identifies non-English text
6. **Technical Whitelist:** Preserves domain-specific terms

---

## Performance Characteristics

- **Time Complexity:** O(n * m) where n = sentences, m = phrases
- **Space Complexity:** O(m) for phrase storage
- **Typical Performance:** Processes 1000 sentences in 1-2 seconds

---

## Testing Checklist

- [ ] Noun phrases extracted correctly
- [ ] Adjective+Noun patterns detected
- [ ] Verb+Noun patterns detected
- [ ] Discourse stopwords filtered
- [ ] Template phrases removed
- [ ] Generic head nouns removed
- [ ] Typo patterns detected
- [ ] Non-English phrases filtered
- [ ] Generic verb+noun combinations removed
- [ ] Semantic scores computed correctly
- [ ] Frequency scores computed correctly
- [ ] Phrases ranked by final score
- [ ] Semantic clustering works
- [ ] Cluster representatives selected
- [ ] Score threshold filtering works
- [ ] Final cleaning removes meaningless phrases
- [ ] Language detection works for English
- [ ] Language detection works for Vietnamese
- [ ] Works with documents without phrases
- [ ] Works with very short documents
