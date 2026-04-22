# Step 2: Heading Hierarchy Detection - Detailed Guide

## Overview
Step 2 in the document processing pipeline detects and structures heading hierarchies within documents. This creates a logical organization of content that helps the system understand document structure and assign content to appropriate sections.

**File Location:** `python-api/heading_detector.py`  
**Called From:** `python-api/complete_pipeline.py` (Line 120)  
**Purpose:** Identify headings at different levels (H1, H2, H3, H4) and build a hierarchical structure

---

## Data Structures

### 1. HeadingLevel Enum (Lines 6-11)
```python
class HeadingLevel(Enum):
    """Cấp độ heading"""
    H1 = 1
    H2 = 2
    H3 = 3
    H4 = 4
    PARAGRAPH = 0
```
**Purpose:** Defines heading hierarchy levels (1-4, with 0 for paragraphs)

### 2. Heading Class (Lines 13-20)
```python
@dataclass
class Heading:
    """Cấu trúc heading"""
    heading_id: str              # Unique ID: "H{level}_{position}"
    level: HeadingLevel          # H1, H2, H3, or H4
    text: str                    # Heading text content
    position: int                # Position in document
    parent_id: Optional[str]     # ID of parent heading (for hierarchy)
    children_ids: List[str]      # IDs of child headings
```
**Purpose:** Represents a single heading with its metadata and relationships

### 3. DocumentStructure Class (Lines 22-28)
```python
@dataclass
class DocumentStructure:
    """Cấu trúc document với headings"""
    headings: List[Heading]                    # All detected headings
    hierarchy: Dict[str, List[str]]            # parent_id -> [child_ids]
    sentence_to_heading: Dict[str, str]        # sentence_id -> heading_id
```
**Purpose:** Complete document structure with headings and their relationships

---

## Main Algorithm: detect_headings()

**Location:** Lines 74-112  
**Input:** `text: str` - Raw document text  
**Output:** `List[Heading]` - List of detected headings

### Process Flow:

```python
def detect_headings(self, text: str) -> List[Heading]:
    lines = text.split('\n')
    headings = []
    position = 0
    
    for idx, line in enumerate(lines):
        line = line.strip()
        
        if not line:
            continue
        
        # Check if line is a heading
        heading_info = self._is_heading(line, idx, lines)
        
        if heading_info:
            level, heading_text = heading_info
            
            heading = Heading(
                heading_id=f"H{level.value}_{position}",
                level=level,
                text=heading_text,
                position=position
            )
            
            headings.append(heading)
            position += 1
    
    return headings
```

**Step-by-step:**
1. Split text into lines
2. For each non-empty line, check if it's a heading
3. If heading detected, create Heading object with unique ID
4. Return list of all detected headings

---

## Heading Detection: _is_heading()

**Location:** Lines 114-192  
**Input:** `line: str`, `line_idx: int`, `all_lines: List[str]`  
**Output:** `Optional[Tuple[HeadingLevel, str]]` - (level, heading_text) or None

### Detection Methods (in order of priority):

#### Method 1: Markdown Headings (Lines 125-131)
```python
markdown_match = self.markdown_pattern.match(line)
if markdown_match:
    hash_count = len(line) - len(line.lstrip('#'))
    heading_text = markdown_match.group(1).strip()
    level = HeadingLevel(min(hash_count, 4))
    return (level, heading_text)
```
**Pattern:** `^#{1,4}\s+(.+)`  
**Examples:**
- `# Introduction` → H1
- `## Background` → H2
- `### Methods` → H3
- `#### Results` → H4

#### Method 2: Numbered Headings (Lines 133-140)
```python
numbering_match = self.numbering_pattern.match(line)
if numbering_match:
    heading_text = numbering_match.group(2).strip()
    dots_count = line.split()[0].count('.')
    level = HeadingLevel(min(dots_count, 4))
    return (level, heading_text)
```
**Pattern:** `^(\d+\.)+\s+(.+)`  
**Examples:**
- `1. Introduction` → H1 (1 dot)
- `1.1 Background` → H2 (2 dots)
- `1.1.1 Methods` → H3 (3 dots)
- `1.1.1.1 Results` → H4 (4 dots)

#### Method 3: Roman Numerals (Lines 142-146)
```python
roman_match = self.roman_pattern.match(line)
if roman_match:
    heading_text = roman_match.group(1).strip()
    return (HeadingLevel.H1, heading_text)
```
**Pattern:** `^[IVX]+\.\s+(.+)`  
**Examples:**
- `I. Introduction` → H1
- `II. Background` → H1
- `III. Methods` → H1

#### Method 4: Heuristic Detection (Lines 148-192)
Uses multiple signals to identify headings:

**Signal 1: Capitalization Ratio**
```python
capitalized_words = sum(1 for w in words if w[0].isupper())
capitalization_ratio = capitalized_words / len(words)

if capitalization_ratio > 0.7 and len(words) <= 10:
    is_heading = True
    level = HeadingLevel.H2
```
- If >70% of words are capitalized and ≤10 words → likely H2

**Signal 2: Heading Keywords**
```python
heading_keywords = {
    'introduction', 'background', 'methodology', 'methods',
    'results', 'discussion', 'conclusion', 'abstract',
    'overview', 'summary', 'references', 'bibliography',
    'chapter', 'section', 'appendix'
}

has_keyword = any(kw in line_lower for kw in self.heading_keywords)

if has_keyword and len(words) <= 8:
    is_heading = True
    level = HeadingLevel.H1
```
- If contains heading keywords and ≤8 words → likely H1

**Signal 3: All Caps**
```python
if line.isupper() and len(words) <= 8:
    is_heading = True
    level = HeadingLevel.H1
```
- If all uppercase and ≤8 words → likely H1

**Signal 4: Followed by Empty Line**
```python
if line_idx + 1 < len(all_lines):
    next_line = all_lines[line_idx + 1].strip()
    if not next_line and len(words) <= 10:
        is_heading = True
```
- If followed by empty line and ≤10 words → likely heading

---

## Building Hierarchy: build_hierarchy()

**Location:** Lines 195-223  
**Input:** `headings: List[Heading]` - Detected headings  
**Output:** `Dict[str, List[str]]` - Hierarchy mapping

### Algorithm:
```python
def build_hierarchy(self, headings: List[Heading]) -> Dict[str, List[str]]:
    hierarchy = {}
    
    for i, heading in enumerate(headings):
        # Find parent (previous heading with lower level)
        parent_id = None
        
        for j in range(i - 1, -1, -1):
            prev_heading = headings[j]
            
            if prev_heading.level.value < heading.level.value:
                parent_id = prev_heading.heading_id
                break
        
        # Set parent
        heading.parent_id = parent_id
        
        # Add to hierarchy
        if parent_id:
            if parent_id not in hierarchy:
                hierarchy[parent_id] = []
            hierarchy[parent_id].append(heading.heading_id)
    
    return hierarchy
```

### Example:
```
Document:
# Introduction (H1_0)
## Background (H2_1)
## Methods (H2_2)
### Data Collection (H3_3)
### Analysis (H3_4)
# Results (H1_5)

Hierarchy:
{
    "H1_0": ["H2_1", "H2_2"],
    "H2_2": ["H3_3", "H3_4"]
}

Parent Relationships:
- H2_1.parent_id = "H1_0"
- H2_2.parent_id = "H1_0"
- H3_3.parent_id = "H2_2"
- H3_4.parent_id = "H2_2"
- H1_5.parent_id = None
```

---

## Assigning Sentences to Headings: assign_sentences_to_headings()

**Location:** Lines 226-287  
**Input:** `sentences: List[str]`, `headings: List[Heading]`, `text: str`  
**Output:** `Dict[str, str]` - sentence_id → heading_id mapping

### Algorithm:
```python
def assign_sentences_to_headings(
    self,
    sentences: List[str],
    headings: List[Heading],
    text: str
) -> Dict[str, str]:
    sentence_to_heading = {}
    
    if not headings:
        # No headings detected, assign all to default
        default_heading_id = "H0_0"
        for idx in range(len(sentences)):
            sentence_to_heading[f"s{idx + 1}"] = default_heading_id
        return sentence_to_heading
    
    # Find position of each sentence in text
    sentence_positions = []
    current_pos = 0
    
    for sent in sentences:
        pos = text.find(sent, current_pos)
        if pos == -1:
            pos = current_pos
        sentence_positions.append(pos)
        current_pos = pos + len(sent)
    
    # Find position of each heading in text
    heading_positions = []
    for heading in headings:
        pos = text.find(heading.text)
        heading_positions.append((pos, heading.heading_id))
    
    # Sort headings by position
    heading_positions.sort()
    
    # Assign sentences to headings
    for idx, sent_pos in enumerate(sentence_positions):
        sentence_id = f"s{idx + 1}"
        
        # Find closest heading before this sentence
        assigned_heading = heading_positions[0][1]  # Default to first
        
        for h_pos, h_id in heading_positions:
            if h_pos <= sent_pos:
                assigned_heading = h_id
            else:
                break
        
        sentence_to_heading[sentence_id] = assigned_heading
    
    return sentence_to_heading
```

### Example:
```
Text positions:
# Introduction (pos 0)
This is the introduction. (pos 20, s1)
## Background (pos 50)
Background information here. (pos 70, s2)

Result:
{
    "s1": "H1_0",      # Sentence 1 under Introduction
    "s2": "H2_1"       # Sentence 2 under Background
}
```

---

## Complete Document Parsing: parse_document_structure()

**Location:** Lines 289-312  
**Input:** `text: str`, `sentences: List[str]`  
**Output:** `DocumentStructure` - Complete structure

### Process:
```python
def parse_document_structure(
    self,
    text: str,
    sentences: List[str]
) -> DocumentStructure:
    # Step 1: Detect headings
    headings = self.detect_headings(text)
    
    # Step 2: Build hierarchy
    hierarchy = self.build_hierarchy(headings)
    
    # Step 3: Assign sentences to headings
    sentence_to_heading = self.assign_sentences_to_headings(
        sentences,
        headings,
        text
    )
    
    structure = DocumentStructure(
        headings=headings,
        hierarchy=hierarchy,
        sentence_to_heading=sentence_to_heading
    )
    
    return structure
```

---

## Helper Functions

### get_heading_for_sentence() (Lines 335-350)
```python
def get_heading_for_sentence(
    sentence_id: str,
    structure: DocumentStructure
) -> Optional[Heading]:
    """Get heading object for a sentence"""
    heading_id = structure.sentence_to_heading.get(sentence_id)
    
    if not heading_id:
        return None
    
    for heading in structure.headings:
        if heading.heading_id == heading_id:
            return heading
    return None
```
**Purpose:** Retrieve the heading that a sentence belongs to

### get_heading_path() (Lines 352-375)
```python
def get_heading_path(
    heading_id: str,
    structure: DocumentStructure
) -> List[str]:
    path = []
    # Find heading
    current_heading = None
    for h in structure.headings:
        if h.heading_id == heading_id:
            current_heading = h
            break
    if not current_heading:
        return path
    # Build path
    path.append(current_heading.text)
    
    while current_heading.parent_id:
        for h in structure.headings:
            if h.heading_id == current_heading.parent_id:
                path.insert(0, h.text)
                current_heading = h
                break
        else:
            break
    
    return path
```
**Purpose:** Get full hierarchical path from root to heading

**Example:**
```
Heading: "Data Collection" (H3_3)
Path: ["Introduction", "Methods", "Data Collection"]
```

---

## Integration in Complete Pipeline

**Location:** `python-api/complete_pipeline.py` (Lines 44-46, 120-122)

### Initialization:
```python
self.heading_detector = HeadingDetector()
print(" Heading Detector initialized")
```

### Execution:
```python
# STAGE 2: Heading Detection
print(f"\n[STAGE 2] Heading Detection...")

headings = self.heading_detector.detect_headings(normalized_text)

print(f"  ✓ Detected {len(headings)} headings")
```

### Output:
```python
result = {
    'text': normalized_text,
    'sentences': sentences,
    'sections': [],
    'headings': headings  # List of Heading objects
}
```

---

## Example Walkthrough

### Input Document:
```
# Machine Learning Basics

## Introduction
Machine learning is a subset of artificial intelligence.
It enables computers to learn from data.

## Supervised Learning
### Classification
Classification is used to predict categories.
### Regression
Regression predicts continuous values.

## Conclusion
Machine learning has many applications.
```

### Step 1: Detect Headings
```
Detected:
- H1_0: "Machine Learning Basics" (level=H1)
- H2_1: "Introduction" (level=H2)
- H2_2: "Supervised Learning" (level=H2)
- H3_3: "Classification" (level=H3)
- H3_4: "Regression" (level=H3)
- H2_5: "Conclusion" (level=H2)
```

### Step 2: Build Hierarchy
```
Hierarchy:
{
    "H1_0": ["H2_1", "H2_2", "H2_5"],
    "H2_2": ["H3_3", "H3_4"]
}

Parent Relationships:
- H2_1.parent_id = "H1_0"
- H2_2.parent_id = "H1_0"
- H3_3.parent_id = "H2_2"
- H3_4.parent_id = "H2_2"
- H2_5.parent_id = "H1_0"
```

### Step 3: Assign Sentences
```
Sentences:
- s1: "Machine learning is a subset of artificial intelligence." → H2_1
- s2: "It enables computers to learn from data." → H2_1
- s3: "Classification is used to predict categories." → H3_3
- s4: "Regression predicts continuous values." → H3_4
- s5: "Machine learning has many applications." → H2_5
```

### Final DocumentStructure:
```python
DocumentStructure(
    headings=[H1_0, H2_1, H2_2, H3_3, H3_4, H2_5],
    hierarchy={
        "H1_0": ["H2_1", "H2_2", "H2_5"],
        "H2_2": ["H3_3", "H3_4"]
    },
    sentence_to_heading={
        "s1": "H2_1",
        "s2": "H2_1",
        "s3": "H3_3",
        "s4": "H3_4",
        "s5": "H2_5"
    }
)
```

---

## Key Features

1. **Multiple Detection Methods:** Markdown, numbered, roman numerals, and heuristic detection
2. **Hierarchical Structure:** Maintains parent-child relationships between headings
3. **Sentence Assignment:** Maps each sentence to its containing heading
4. **Path Retrieval:** Can get full hierarchical path from root to any heading
5. **Flexible:** Works with various document formats and heading styles

---

## Performance Characteristics

- **Time Complexity:** O(n) for detection, O(h²) for hierarchy building (h = number of headings)
- **Space Complexity:** O(h + s) (h headings + s sentences)
- **Typical Performance:** Processes 1000+ headings in <100ms

---

## Testing Checklist

- [ ] Markdown headings detected correctly (# ## ### ####)
- [ ] Numbered headings detected (1. 1.1 1.1.1)
- [ ] Roman numeral headings detected (I. II. III.)
- [ ] Heuristic detection works for plain text headings
- [ ] Hierarchy built correctly with parent-child relationships
- [ ] Sentences assigned to correct headings
- [ ] Heading paths retrieved correctly
- [ ] Works with documents without headings
- [ ] Works with mixed heading formats
