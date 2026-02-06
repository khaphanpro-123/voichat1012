"""
STAGE 2 – Heading Detection & Document Structure Parser

Mục tiêu:
- Detect headings/subheadings từ document
- Xây dựng hierarchy (H1 → H2 → H3)
- Gán mỗi sentence vào heading tương ứng

Thuật toán:
- Heuristic-based (font size, formatting, capitalization)
- Pattern matching (numbering, markdown)
- Length-based (short lines)
"""

import re
from typing import List, Dict, Tuple, Optional
from dataclasses import dataclass, field
from enum import Enum


class HeadingLevel(Enum):
    """Cấp độ heading"""
    H1 = 1
    H2 = 2
    H3 = 3
    H4 = 4
    PARAGRAPH = 0


@dataclass
class Heading:
    """Cấu trúc heading"""
    heading_id: str
    level: HeadingLevel
    text: str
    position: int
    parent_id: Optional[str] = None
    children_ids: List[str] = field(default_factory=list)


@dataclass
class DocumentStructure:
    """Cấu trúc document với headings"""
    headings: List[Heading]
    hierarchy: Dict[str, List[str]]  # parent_id -> [child_ids]
    sentence_to_heading: Dict[str, str]  # sentence_id -> heading_id


class HeadingDetector:
    """
    Detect headings từ text sử dụng heuristics
    
    Methods:
    1. Pattern-based (markdown, numbering)
    2. Length-based (short lines)
    3. Capitalization-based
    4. Font-size based (if available from PDF metadata)
    """
    
    def __init__(self):
        # Patterns for heading detection
        self.markdown_pattern = re.compile(r'^#{1,4}\s+(.+)$')
        self.numbering_pattern = re.compile(r'^(\d+\.)+\s+(.+)$')
        self.roman_pattern = re.compile(r'^[IVX]+\.\s+(.+)$', re.IGNORECASE)
        
        # Heading keywords
        self.heading_keywords = {
            'introduction', 'background', 'methodology', 'methods',
            'results', 'discussion', 'conclusion', 'abstract',
            'overview', 'summary', 'references', 'bibliography',
            'chapter', 'section', 'appendix'
        }
    
    def detect_headings(self, text: str) -> List[Heading]:
        """
        Detect all headings from text
        
        Args:
            text: Raw document text
        
        Returns:
            List of Heading objects
        """
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
        
        print(f"[HeadingDetector] Detected {len(headings)} headings")
        
        return headings
    
    def _is_heading(
        self,
        line: str,
        line_idx: int,
        all_lines: List[str]
    ) -> Optional[Tuple[HeadingLevel, str]]:
        """
        Kiểm tra xem line có phải heading không
        
        Returns:
            (HeadingLevel, heading_text) hoặc None
        """
        # Method 1: Markdown heading
        markdown_match = self.markdown_pattern.match(line)
        if markdown_match:
            hash_count = len(line) - len(line.lstrip('#'))
            heading_text = markdown_match.group(1).strip()
            level = HeadingLevel(min(hash_count, 4))
            return (level, heading_text)
        
        # Method 2: Numbering (1. Introduction, 1.1 Background)
        numbering_match = self.numbering_pattern.match(line)
        if numbering_match:
            heading_text = numbering_match.group(2).strip()
            dots_count = line.split()[0].count('.')
            level = HeadingLevel(min(dots_count, 4))
            return (level, heading_text)
        
        # Method 3: Roman numerals
        roman_match = self.roman_pattern.match(line)
        if roman_match:
            heading_text = roman_match.group(1).strip()
            return (HeadingLevel.H1, heading_text)
        
        # Method 4: Short line + capitalization
        words = line.split()
        
        # Too long to be heading
        if len(words) > 15:
            return None
        
        # Too short
        if len(words) < 2:
            return None
        
        # Check capitalization
        capitalized_words = sum(1 for w in words if w[0].isupper())
        capitalization_ratio = capitalized_words / len(words)
        
        # Check if contains heading keywords
        line_lower = line.lower()
        has_keyword = any(kw in line_lower for kw in self.heading_keywords)
        
        # Heuristic scoring
        is_heading = False
        level = HeadingLevel.H2  # Default
        
        if capitalization_ratio > 0.7 and len(words) <= 10:
            is_heading = True
            level = HeadingLevel.H2
        
        if has_keyword and len(words) <= 8:
            is_heading = True
            level = HeadingLevel.H1
        
        # Check if all caps (likely H1)
        if line.isupper() and len(words) <= 8:
            is_heading = True
            level = HeadingLevel.H1
        
        # Check if followed by empty line (common heading pattern)
        if line_idx + 1 < len(all_lines):
            next_line = all_lines[line_idx + 1].strip()
            if not next_line and len(words) <= 10:
                is_heading = True
        
        if is_heading:
            return (level, line)
        
        return None
    
    def build_hierarchy(self, headings: List[Heading]) -> Dict[str, List[str]]:
        """
        Xây dựng hierarchy tree từ headings
        
        Returns:
            Dictionary: parent_id -> [child_ids]
        """
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
    
    def assign_sentences_to_headings(
        self,
        sentences: List[str],
        headings: List[Heading],
        text: str
    ) -> Dict[str, str]:
        """
        Gán mỗi sentence vào heading gần nhất
        
        Args:
            sentences: List of sentence texts
            headings: List of Heading objects
            text: Original document text
        
        Returns:
            Dictionary: sentence_id -> heading_id
        """
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
    
    def parse_document_structure(
        self,
        text: str,
        sentences: List[str]
    ) -> DocumentStructure:
        """
        Parse complete document structure
        
        Args:
            text: Raw document text
            sentences: List of sentence texts
        
        Returns:
            DocumentStructure object
        """
        print("[HeadingDetector] Parsing document structure...")
        
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
        
        print(f"[HeadingDetector] Structure: {len(headings)} headings, "
              f"{len(sentence_to_heading)} sentences assigned")
        
        return structure


# ============================================================================
# UTILITY FUNCTIONS
# ============================================================================

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


def get_heading_path(
    heading_id: str,
    structure: DocumentStructure
) -> List[str]:
    """
    Get full path from root to heading
    
    Example: ["Introduction", "Background", "Related Work"]
    """
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


# ============================================================================
# TESTING
# ============================================================================

if __name__ == "__main__":
    test_text = """
# Introduction

Machine learning is a subset of artificial intelligence.

## Background

Deep learning uses neural networks with multiple layers.

### Related Work

Natural language processing helps computers understand text.

## Methodology

We propose a new approach using contrastive learning.

# Results

The model achieves 95% accuracy on the test set.

## Discussion

Our results show significant improvements over baseline.
"""
    
    print("=" * 80)
    print("TESTING HEADING DETECTOR")
    print("=" * 80)
    
    detector = HeadingDetector()
    
    # Test sentences
    sentences = [
        "Machine learning is a subset of artificial intelligence.",
        "Deep learning uses neural networks with multiple layers.",
        "Natural language processing helps computers understand text.",
        "We propose a new approach using contrastive learning.",
        "The model achieves 95% accuracy on the test set.",
        "Our results show significant improvements over baseline."
    ]
    
    # Parse structure
    structure = detector.parse_document_structure(test_text, sentences)
    
    print("\n📊 DETECTED HEADINGS:")
    print("-" * 80)
    for heading in structure.headings:
        indent = "  " * (heading.level.value - 1)
        print(f"{indent}{heading.level.name}: {heading.text}")
        print(f"{indent}  ID: {heading.heading_id}, Parent: {heading.parent_id}")
    
    print("\n📊 SENTENCE ASSIGNMENTS:")
    print("-" * 80)
    for sent_id, heading_id in structure.sentence_to_heading.items():
        heading = get_heading_for_sentence(sent_id, structure)
        if heading:
            print(f"{sent_id} → {heading.text}")
    
    print("\n📊 HEADING PATHS:")
    print("-" * 80)
    for heading in structure.headings:
        path = get_heading_path(heading.heading_id, structure)
        print(f"{heading.heading_id}: {' → '.join(path)}")
    
    print("\n✅ Test completed!")
