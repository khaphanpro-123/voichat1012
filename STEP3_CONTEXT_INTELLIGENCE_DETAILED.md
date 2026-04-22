# Step 3: Context Intelligence - Detailed Guide

## Overview
Step 3 in the document processing pipeline analyzes document context and builds semantic understanding of sentences. It tokenizes text into sentences, analyzes their properties, and creates a context map that helps subsequent stages understand which sentences are best for vocabulary examples.

**File Location:** `python-api/context_intelligence.py`  
**Called From:** `python-api/complete_pipeline.py` (Lines 127-139)  
**Purpose:** Build sentence structures, analyze sentence quality, and create context maps for vocabulary selection

---

## Data Structures

### 1. Sentence Class (Lines 35-46)
```python
@dataclass
class Sentence:
    """Cấu trúc câu với metadata"""
    sentence_id: str              # Unique ID: "s{index}"
    text: str                     # Full sentence text
    position: int                 # Position in document (0-indexed)
    word_count: int               # Number of words in sentence
    has_verb: bool                # Whether sentence contains a verb
    paragraph_id: str             # Paragraph ID: "p{index}"
    section_title: str            # Section/heading title
    tokens: List[str]             # Tokenized words
    pos_tags: List[str]           # Part-of-speech tags
```
**Purpose:** Represents a single sentence with linguistic properties

### 2. SentenceScore Class (Lines 48-53)
```python
@dataclass
class SentenceScore:
    """Điểm số của câu"""
    sentence_id: str              # Sentence ID
    score: float                  # Final composite score (0-1)
    breakdown: Dict[str, float]   # Component scores:
                                  # - keyword_density
                                  # - length_score
                                  # - position_score
                                  # - clarity_score
```
**Purpose:** Stores scoring breakdown for a sentence

### 3. VocabularyContext Class (Lines 55-62)
```python
@dataclass
class VocabularyContext:
    """Ngữ cảnh cho từ vựng"""
    word: str                     # Vocabulary word
    final_score: float            # Vocabulary score
    context_sentence: str         # Sentence with word highlighted
    sentence_id: str              # ID of context sentence
    sentence_score: float         # Score of context sentence
    explanation: str              # Why this sentence was chosen
```
**Purpose:** Represents the best context for a vocabulary word

---

## Main Algorithm: build_sentences()

**Location:** Lines 64-103  
**Input:** `text: str`, `language: str = "en"`  
**Output:** `List[Sentence]` - List of sentence objects

### Process Flow:

```python
def build_sentences(text: str, language: str = "en") -> List[Sentence]:
    # Tokenize sentences
    if language == "vi" and HAS_VIETNAMESE:
        # Vietnamese sentence tokenization
        sentences_text = re.split(r'[.!?]+', text)
        sentences_text = [s.strip() for s in sentences_text if s.strip()]
    else:
        # English sentence tokenization
        sentences_text = sent_tokenize(text)
    
    sentences = []
    for idx, sent_text in enumerate(sentences_text):
        # Tokenize words
        if language == "vi" and HAS_VIETNAMESE:
            tokens = vi_tokenize(sent_text)
        else:
            tokens = sent_text.split() 
        word_count = len(tokens)
        
        # Detect verb using spaCy
        has_verb = detect_verb_spacy(sent_text, language)
        
        # POS tagging
        pos_tags = []
        if nlp_en and language == "en":
            doc = nlp_en(sent_text)
            pos_tags = [token.pos_ for token in doc]
        
        sentence = Sentence(
            sentence_id=f"s{idx + 1}",
            text=sent_text,
            position=idx,
            word_count=word_count,
            has_verb=has_verb,
            paragraph_id=f"p{idx // 5 + 1}",  # ~5 sentences per paragraph
            section_title="Unknown",
            tokens=tokens,
            pos_tags=pos_tags
        )
        
        sentences.append(sentence)
    
    return sentences
```

**Step-by-step:**
1. Split text into sentences using language-specific tokenization
2. For each sentence:
   - Tokenize into words
   - Count words
   - Detect if sentence contains a verb
   - Extract POS tags (if spaCy available)
   - Create Sentence object with metadata
3. Return list of all sentences

---

## Verb Detection: detect_verb_spacy()

**Location:** Lines 106-135  
**Input:** `text: str`, `language: str = "en"`  
**Output:** `bool` - Whether sentence contains a verb

### English Detection (spaCy):
```python
if language == "en" and nlp_en:
    doc = nlp_en(text)
    for token in doc:
        if token.pos_ == "VERB":
            return True
```
Uses spaCy's POS tagger to identify VERB tokens

### Vietnamese Detection (Heuristic):
```python
if language == "vi":
    vietnamese_verbs = [
        'là', 'có', 'được', 'làm', 'đi', 'đến', 'về', 'ra', 'vào', 'lên', 'xuống',
        'cho', 'lấy', 'đưa', 'mang', 'cầm', 'nói', 'kể', 'hỏi', 'trả lời',
        'nghĩ', 'biết', 'hiểu', 'học', 'dạy', 'viết', 'đọc', 'nghe', 'nhìn', 'thấy',
        'ăn', 'uống', 'ngủ', 'thức', 'chơi', 'làm việc', 'nghỉ', 'chạy', 'đứng', 'ngồi',
        'phát triển', 'tạo', 'xây dựng', 'thiết kế', 'thực hiện', 'áp dụng', 'sử dụng',
        'nghiên cứu', 'phân tích', 'đánh giá', 'kiểm tra', 'thử nghiệm', 'cải thiện'
    ]
    text_lower = text.lower()
    return any(verb in text_lower for verb in vietnamese_verbs)
```
Uses a predefined list of common Vietnamese verbs

---

## Mapping Words to Sentences: map_words_to_sentences()

**Location:** Lines 137-153  
**Input:** `vocabulary_words: List[str]`, `sentences: List[Sentence]`  
**Output:** `Dict[str, List[str]]` - word → [sentence_ids]

### Algorithm:
```python
def map_words_to_sentences(
    vocabulary_words: List[str],
    sentences: List[Sentence]
) -> Dict[str, List[str]]:
    word_map = {}
    
    for word in vocabulary_words:
        sentence_ids = []
        word_lower = word.lower()
        
        # Create regex for whole-word matching
        word_pattern = re.compile(r'\b' + re.escape(word_lower) + r'\b', re.IGNORECASE)
        
        for sentence in sentences:
            if word_pattern.search(sentence.text):
                sentence_ids.append(sentence.sentence_id)
        
        word_map[word] = sentence_ids
    
    return word_map
```

**Example:**
```
Vocabulary: ['machine learning', 'algorithm', 'data']

Sentences:
- s1: "Machine learning is a subset of AI"
- s2: "An algorithm processes data efficiently"
- s3: "Data science uses machine learning"

Result:
{
    'machine learning': ['s1', 's3'],
    'algorithm': ['s2'],
    'data': ['s2', 's3']
}
```

---

## Filtering Invalid Sentences: filter_invalid_sentences()

**Location:** Lines 155-180  
**Input:** `sentences: List[Sentence]`, `min_words: int = 5`, `max_words: int = 35`, `require_verb: bool = True`  
**Output:** `List[Sentence]` - Valid sentences only

### Filtering Criteria:

```python
def filter_invalid_sentences(
    sentences: List[Sentence],
    min_words: int = 5,
    max_words: int = 35,
    require_verb: bool = True
) -> List[Sentence]:
    valid_sentences = []
    
    for sentence in sentences:
        # 1. Too short
        if sentence.word_count < min_words:
            continue
        
        # 2. Too long
        if sentence.word_count > max_words:
            continue
        
        # 3. No verb (incomplete sentence)
        if require_verb and not sentence.has_verb:
            continue
        
        # 4. All caps (likely heading)
        upper_count = sum(1 for c in sentence.text if c.isupper())
        if upper_count / len(sentence.text) > 0.7:
            continue
        
        # 5. List format (bullet points)
        if sentence.text.strip().startswith(('-', '•', '*', '+')):
            continue
        
        valid_sentences.append(sentence)
    
    return valid_sentences
```

**Rejection Reasons:**
1. **Too short:** < 5 words (incomplete thought)
2. **Too long:** > 35 words (hard to read)
3. **No verb:** Not a complete sentence
4. **All caps:** Likely a heading, not example
5. **List format:** Bullet points, not natural sentences

---

## Scoring Functions

### 1. Keyword Density: calculate_keyword_density()

**Location:** Lines 182-193  
**Input:** `sentence: Sentence`, `vocabulary_words: List[str]`  
**Output:** `float` - Keyword density (0-1)

```python
def calculate_keyword_density(
    sentence: Sentence,
    vocabulary_words: List[str]
) -> float:
    text_lower = sentence.text.lower()
    keyword_count = 0
    
    for word in vocabulary_words:
        word_pattern = re.compile(r'\b' + re.escape(word.lower()) + r'\b')
        matches = word_pattern.findall(text_lower)
        keyword_count += len(matches)
    
    return keyword_count / sentence.word_count if sentence.word_count > 0 else 0
```

**Purpose:** Measure how many vocabulary words appear in the sentence  
**Range:** 0.0 (no keywords) to 1.0 (all words are keywords)  
**Example:**
```
Sentence: "Machine learning algorithms process data"
Vocabulary: ['machine learning', 'algorithm', 'data']
Keyword count: 3
Word count: 5
Density: 3/5 = 0.6
```

### 2. Length Score: calculate_length_score()

**Location:** Lines 195-207  
**Input:** `sentence: Sentence`, `optimal_min: int = 8`, `optimal_max: int = 20`  
**Output:** `float` - Length score (0-1)

```python
def calculate_length_score(
    sentence: Sentence,
    optimal_min: int = 8,
    optimal_max: int = 20
) -> float:
    word_count = sentence.word_count
    
    if optimal_min <= word_count <= optimal_max:
        return 1.0  # Perfect length
    
    if word_count < optimal_min:
        # Too short: linear penalty
        return word_count / optimal_min
    
    # Too long: exponential penalty
    excess = word_count - optimal_max
    return math.exp(-excess / 10)
```

**Purpose:** Prefer sentences of optimal length (8-20 words)  
**Scoring:**
- 8-20 words: 1.0 (perfect)
- 4 words: 0.5 (too short)
- 30 words: ~0.37 (too long)

### 3. Position Score: calculate_position_score()

**Location:** Lines 209-213  
**Input:** `sentence: Sentence`, `total_sentences: int`  
**Output:** `float` - Position score (0-1)

```python
def calculate_position_score(
    sentence: Sentence,
    total_sentences: int
) -> float:
    # Exponential decay: first sentence = 1.0, decreases
    return math.exp(-sentence.position / (total_sentences * 0.3))
```

**Purpose:** Prefer sentences that appear early in document  
**Rationale:** Early sentences often introduce concepts clearly  
**Example (100 sentences total):**
- Position 0: 1.0
- Position 10: 0.72
- Position 30: 0.37
- Position 50: 0.19

### 4. Clarity Score: calculate_clarity_score()

**Location:** Lines 215-235  
**Input:** `sentence: Sentence`  
**Output:** `float` - Clarity score (0-1)

```python
def calculate_clarity_score(sentence: Sentence) -> float:
    score = 0.0
    
    # Has verb: +0.5
    if sentence.has_verb:
        score += 0.5
    
    # Not too many commas: +0.3
    comma_count = sentence.text.count(',')
    comma_ratio = comma_count / sentence.word_count if sentence.word_count > 0 else 0
    
    if comma_ratio < 0.15:
        score += 0.3  # Natural sentence
    elif comma_ratio < 0.3:
        score += 0.15  # Somewhat complex
    
    # No bullet points: +0.2
    if not re.match(r'^[\d\-•*+]', sentence.text.strip()):
        score += 0.2
    
    return min(score, 1.0)
```

**Scoring Components:**
- Has verb: +0.5
- Few commas (<15%): +0.3
- No bullet points: +0.2
- Maximum: 1.0

---

## Composite Scoring: score_sentence()

**Location:** Lines 237-268  
**Input:** `sentence: Sentence`, `vocabulary_words: List[str]`, `total_sentences: int`, `weights: Dict[str, float]`  
**Output:** `SentenceScore` - Composite score with breakdown

### Algorithm:
```python
def score_sentence(
    sentence: Sentence,
    vocabulary_words: List[str],
    total_sentences: int,
    weights: Optional[Dict[str, float]] = None
) -> SentenceScore:
    if weights is None:
        weights = {
            'keyword_density': 0.4,      # 40%
            'length_score': 0.3,         # 30%
            'position_score': 0.2,       # 20%
            'clarity_score': 0.1         # 10%
        }
    
    # Calculate component scores
    keyword_density = calculate_keyword_density(sentence, vocabulary_words)
    length_score = calculate_length_score(sentence)
    position_score = calculate_position_score(sentence, total_sentences)
    clarity_score = calculate_clarity_score(sentence)
    
    # Calculate composite score
    final_score = (
        weights['keyword_density'] * keyword_density +
        weights['length_score'] * length_score +
        weights['position_score'] * position_score +
        weights['clarity_score'] * clarity_score
    )
    
    return SentenceScore(
        sentence_id=sentence.sentence_id,
        score=final_score,
        breakdown={
            'keyword_density': keyword_density,
            'length_score': length_score,
            'position_score': position_score,
            'clarity_score': clarity_score
        }
    )
```

**Default Weights:**
- Keyword density: 40% (most important)
- Length score: 30%
- Position score: 20%
- Clarity score: 10%

**Example:**
```
Sentence: "Machine learning algorithms process data efficiently"
Vocabulary: ['machine learning', 'algorithm', 'data']

Scores:
- keyword_density: 0.6 (3/5 words)
- length_score: 1.0 (8 words, optimal)
- position_score: 0.95 (early in document)
- clarity_score: 1.0 (has verb, no commas)

Final Score:
0.4 * 0.6 + 0.3 * 1.0 + 0.2 * 0.95 + 0.1 * 1.0
= 0.24 + 0.30 + 0.19 + 0.10
= 0.83
```

---

## Highlighting and Explanation

### highlight_word() (Lines 270-273)
```python
def highlight_word(sentence_text: str, word: str) -> str:
    word_pattern = re.compile(r'\b(' + re.escape(word) + r')\b', re.IGNORECASE)
    return word_pattern.sub(r'<b>\1</b>', sentence_text)
```
**Purpose:** Wrap vocabulary word in `<b>` tags for HTML display

**Example:**
```
Input: "Machine learning is powerful"
Word: "machine learning"
Output: "<b>Machine learning</b> is powerful"
```

### generate_explanation() (Lines 275-295)
```python
def generate_explanation(
    sentence_score: SentenceScore,
    sentence: Sentence
) -> str:
    breakdown = sentence_score.breakdown
    reasons = []
    
    if breakdown['keyword_density'] > 0.15:
        reasons.append(f"mật độ từ khóa cao ({breakdown['keyword_density']*100:.1f}%)")
    
    if breakdown['length_score'] > 0.8:
        reasons.append(f"độ dài tối ưu ({sentence.word_count} từ)")
    
    if breakdown['position_score'] > 0.7:
        reasons.append("xuất hiện sớm trong tài liệu")
    
    if breakdown['clarity_score'] > 0.7:
        reasons.append("câu rõ ràng, có động từ")
    
    if not reasons:
        reasons.append("điểm tổng hợp cao")
    
    return f"Được chọn vì: {', '.join(reasons)}. Score: {sentence_score.score:.3f}"
```

**Purpose:** Generate human-readable explanation for why sentence was chosen

**Example Output:**
```
"Được chọn vì: mật độ từ khóa cao (60.0%), độ dài tối ưu (8 từ), 
xuất hiện sớm trong tài liệu, câu rõ ràng, có động từ. Score: 0.830"
```

---

## Selecting Best Contexts: select_best_contexts()

**Location:** Lines 297-360  
**Input:** `vocabulary_list: List[Dict]`, `sentences: List[Sentence]`, filtering parameters  
**Output:** `List[VocabularyContext]` - Best context for each word

### Algorithm:
```python
def select_best_contexts(
    vocabulary_list: List[Dict[str, float]],
    sentences: List[Sentence],
    min_words: int = 5,
    max_words: int = 35,
    require_verb: bool = True,
    weights: Optional[Dict[str, float]] = None
) -> List[VocabularyContext]:
    # Step 1: Filter valid sentences
    valid_sentences = filter_invalid_sentences(
        sentences, min_words, max_words, require_verb
    )
    if not valid_sentences:
        print("  No valid sentences found")
        return []
    
    # Step 2: Map words to sentences
    vocabulary_words = [v['word'] for v in vocabulary_list]
    word_map = map_words_to_sentences(vocabulary_words, valid_sentences)
    
    # Step 3: Select best sentence for each word
    contexts = []
    
    for vocab_item in vocabulary_list:
        word = vocab_item['word']
        sentence_ids = word_map.get(word, [])
        
        if not sentence_ids:
            if ' ' not in word and len(word) <= 20:
                print(f"  No sentences found for word: {word}")
            continue
        
        # Get candidate sentences
        candidate_sentences = [s for s in valid_sentences if s.sentence_id in sentence_ids]
        
        # Score sentences
        sentence_scores = [
            score_sentence(s, vocabulary_words, len(valid_sentences), weights)
            for s in candidate_sentences
        ]
        
        # Select best
        best_score = max(sentence_scores, key=lambda x: x.score)
        best_sentence = next(s for s in candidate_sentences if s.sentence_id == best_score.sentence_id)
        
        # Highlight word
        highlighted_sentence = highlight_word(best_sentence.text, word)
        
        # Generate explanation
        explanation = generate_explanation(best_score, best_sentence)
        
        context = VocabularyContext(
            word=word,
            final_score=vocab_item['score'],
            context_sentence=highlighted_sentence,
            sentence_id=best_score.sentence_id,
            sentence_score=best_score.score,
            explanation=explanation
        )
        
        contexts.append(context)
    
    return contexts
```

---

## Main Entry Point: select_vocabulary_contexts()

**Location:** Lines 362-395  
**Input:** `text: str`, `vocabulary_list: List[Dict]`, language, filtering parameters  
**Output:** `List[Dict]` - Contexts with all metadata

### Algorithm:
```python
def select_vocabulary_contexts(
    text: str,
    vocabulary_list: List[Dict[str, float]],
    language: str = "en",
    min_words: int = 5,
    max_words: int = 35,
    optimal_min: int = 8,
    optimal_max: int = 20,
    require_verb: bool = True,
    weights: Optional[Dict[str, float]] = None
) -> List[Dict]:
    print(f"[Context Selector] Starting context selection...")
    print(f"[Context Selector] Input: {len(vocabulary_list)} vocabulary words")
    
    # Step 1: Build sentences
    sentences = build_sentences(text, language)
    print(f"[Context Selector] Built {len(sentences)} sentences")
    
    # Step 2-5: Select best contexts
    contexts = select_best_contexts(
        vocabulary_list,
        sentences,
        min_words,
        max_words,
        require_verb,
        weights
    )
    print(f"[Context Selector] Selected {len(contexts)} contexts")
    
    # Convert to dictionary
    return [
        {
            'word': ctx.word,
            'finalScore': ctx.final_score,
            'contextSentence': ctx.context_sentence,
            'sentenceId': ctx.sentence_id,
            'sentenceScore': ctx.sentence_score,
            'explanation': ctx.explanation
        }
        for ctx in contexts
    ]
```

---

## Integration in Complete Pipeline

**Location:** `python-api/complete_pipeline.py` (Lines 127-139)

### Execution:
```python
# STAGE 3: Context Intelligence
print(f"\n[STAGE 3] Context Intelligence...")

# Build sentences
sentences = context_intelligence.build_sentences(normalized_text)

# Create simple context map
context_map = {
    'sentences': sentences,
    'sections': [],
    'headings': headings
}

print(f"  ✓ Built context map with {len(sentences)} sentences")
```

### Output:
```python
context_map = {
    'sentences': [Sentence(...), Sentence(...), ...],
    'sections': [],
    'headings': [Heading(...), Heading(...), ...]
}
```

---

## Example Walkthrough

### Input Document:
```
Machine learning is a subset of artificial intelligence.
It enables computers to learn from data without explicit programming.
Supervised learning uses labeled data for training.
The algorithm learns patterns from examples.
Unsupervised learning discovers hidden patterns in data.
```

### Step 1: Build Sentences
```
s1: "Machine learning is a subset of artificial intelligence." (9 words, has_verb=True)
s2: "It enables computers to learn from data without explicit programming." (11 words, has_verb=True)
s3: "Supervised learning uses labeled data for training." (7 words, has_verb=True)
s4: "The algorithm learns patterns from examples." (6 words, has_verb=True)
s5: "Unsupervised learning discovers hidden patterns in data." (7 words, has_verb=True)
```

### Step 2: Filter Valid Sentences
All sentences pass (5-35 words, have verbs, not all caps)

### Step 3: Map Words to Sentences
```
Vocabulary: ['machine learning', 'algorithm', 'data']

word_map = {
    'machine learning': ['s1', 's3', 's5'],
    'algorithm': ['s4'],
    'data': ['s2', 's5']
}
```

### Step 4: Score Sentences
For word "machine learning":
- Candidate sentences: s1, s3, s5
- Scores:
  - s1: keyword_density=0.11, length=1.0, position=1.0, clarity=1.0 → 0.82
  - s3: keyword_density=0.14, length=0.87, position=0.82, clarity=1.0 → 0.78
  - s5: keyword_density=0.14, length=0.87, position=0.67, clarity=1.0 → 0.73
- Best: s1 (0.82)

### Step 5: Generate Context
```
{
    'word': 'machine learning',
    'finalScore': 0.95,
    'contextSentence': '<b>Machine learning</b> is a subset of artificial intelligence.',
    'sentenceId': 's1',
    'sentenceScore': 0.82,
    'explanation': 'Được chọn vì: xuất hiện sớm trong tài liệu, câu rõ ràng, có động từ. Score: 0.820'
}
```

---

## Key Features

1. **Multi-language Support:** English (spaCy) and Vietnamese (heuristic)
2. **Comprehensive Scoring:** 4-component scoring system with customizable weights
3. **Sentence Filtering:** Removes invalid sentences (too short/long, no verb, etc.)
4. **Word Highlighting:** HTML formatting for vocabulary words
5. **Explanations:** Human-readable reasons for sentence selection
6. **Flexible Parameters:** Customizable thresholds and weights

---

## Performance Characteristics

- **Time Complexity:** O(n * m) where n = sentences, m = vocabulary words
- **Space Complexity:** O(n + m)
- **Typical Performance:** Processes 1000 sentences with 100 vocabulary words in <500ms

---

## Testing Checklist

- [ ] Sentences tokenized correctly for English
- [ ] Sentences tokenized correctly for Vietnamese
- [ ] Verb detection works for English (spaCy)
- [ ] Verb detection works for Vietnamese (heuristic)
- [ ] Words mapped to correct sentences
- [ ] Invalid sentences filtered (too short, too long, no verb, all caps, lists)
- [ ] Keyword density calculated correctly
- [ ] Length score prefers 8-20 word sentences
- [ ] Position score favors early sentences
- [ ] Clarity score rewards verbs and simple structure
- [ ] Composite score combines components correctly
- [ ] Best sentence selected for each word
- [ ] Word highlighting works in HTML
- [ ] Explanations generated correctly
- [ ] Works with documents without vocabulary matches
- [ ] Works with documents without valid sentences
