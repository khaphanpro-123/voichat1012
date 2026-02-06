"""
STAGE 2 – Context Intelligence Engine
Chọn câu ngữ cảnh tốt nhất cho mỗi từ vựng

Pipeline:
1. Build Sentence objects với metadata
2. Map từ vựng → danh sách câu chứa từ
3. Lọc câu không hợp lệ (quá ngắn/dài, không có động từ)
4. Chấm điểm câu theo công thức weighted
5. Chọn câu tốt nhất cho mỗi từ
6. Highlight từ vựng trong câu

Thư viện sử dụng:
- spaCy: Phân tích cú pháp, POS tagging, dependency parsing
- NLTK: Sentence tokenization, stopwords
- scikit-learn: TF-IDF vectorization
- underthesea: Vietnamese NLP (nếu cần)
"""

import re
import math
from typing import List, Dict, Tuple, Optional
from dataclasses import dataclass, field
import spacy
from nltk.tokenize import sent_tokenize
from nltk.corpus import stopwords
import nltk

# Download required NLTK data
try:
    nltk.data.find('tokenizers/punkt')
except LookupError:
    nltk.download('punkt')

try:
    nltk.data.find('corpora/stopwords')
except LookupError:
    nltk.download('stopwords')

# Load spaCy models
try:
    nlp_en = spacy.load("en_core_web_sm")
except OSError:
    print("⚠️  English model not found. Run: python -m spacy download en_core_web_sm")
    nlp_en = None

# Vietnamese support (optional)
try:
    from underthesea import word_tokenize as vi_tokenize
    HAS_VIETNAMESE = True
except ImportError:
    print("⚠️  Vietnamese support not available. Install: pip install underthesea")
    HAS_VIETNAMESE = False


# ============================================================================
# DATA STRUCTURES
# ============================================================================

@dataclass
class Sentence:
    """Cấu trúc câu với metadata"""
    sentence_id: str
    text: str
    position: int
    word_count: int
    has_verb: bool
    paragraph_id: str = "Unknown"
    section_title: str = "Unknown"
    tokens: List[str] = field(default_factory=list)
    pos_tags: List[str] = field(default_factory=list)


@dataclass
class SentenceScore:
    """Điểm số của câu"""
    sentence_id: str
    score: float
    breakdown: Dict[str, float]


@dataclass
class VocabularyContext:
    """Ngữ cảnh cho từ vựng"""
    word: str
    final_score: float
    context_sentence: str  # Câu với từ được highlight
    sentence_id: str
    sentence_score: float
    explanation: str = ""


# ============================================================================
# BƯỚC 2.1 – XÂY DỰNG SENTENCE OBJECTS
# ============================================================================

def build_sentences(text: str, language: str = "en") -> List[Sentence]:
    """
    Tách văn bản thành các câu và tạo Sentence objects
    
    Args:
        text: Văn bản đầu vào
        language: Ngôn ngữ ('en' hoặc 'vi')
    
    Returns:
        Danh sách Sentence objects
    """
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
            paragraph_id=f"p{idx // 5 + 1}",  # Giả định mỗi đoạn ~5 câu
            section_title="Unknown",
            tokens=tokens,
            pos_tags=pos_tags
        )
        
        sentences.append(sentence)
    
    return sentences


def detect_verb_spacy(text: str, language: str = "en") -> bool:
    """
    Phát hiện động từ trong câu sử dụng spaCy
    
    Args:
        text: Câu cần kiểm tra
        language: Ngôn ngữ
    
    Returns:
        True nếu có động từ
    """
    if language == "en" and nlp_en:
        doc = nlp_en(text)
        for token in doc:
            if token.pos_ == "VERB":
                return True
    
    # Fallback: heuristic cho tiếng Việt
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
    
    return False


# ============================================================================
# BƯỚC 2.2 – GÁN TỪ → DANH SÁCH CÂU CHỨA TỪ
# ============================================================================

def map_words_to_sentences(
    vocabulary_words: List[str],
    sentences: List[Sentence]
) -> Dict[str, List[str]]:
    """
    Tạo map từ vựng → danh sách câu chứa từ đó
    Case-insensitive, whole-word matching
    
    Args:
        vocabulary_words: Danh sách từ vựng
        sentences: Danh sách câu
    
    Returns:
        Dictionary {word: [sentence_ids]}
    """
    word_map = {}
    
    for word in vocabulary_words:
        sentence_ids = []
        word_lower = word.lower()
        
        # Tạo regex cho whole-word matching
        word_pattern = re.compile(r'\b' + re.escape(word_lower) + r'\b', re.IGNORECASE)
        
        for sentence in sentences:
            if word_pattern.search(sentence.text):
                sentence_ids.append(sentence.sentence_id)
        
        word_map[word] = sentence_ids
    
    return word_map


# ============================================================================
# BƯỚC 2.3 – LỌC CÂU RÁC
# ============================================================================

def filter_invalid_sentences(
    sentences: List[Sentence],
    min_words: int = 5,
    max_words: int = 35,
    require_verb: bool = True
) -> List[Sentence]:
    """
    Lọc các câu không hợp lệ
    
    Args:
        sentences: Danh sách câu
        min_words: Số từ tối thiểu
        max_words: Số từ tối đa
        require_verb: Yêu cầu có động từ
    
    Returns:
        Danh sách câu hợp lệ
    """
    valid_sentences = []
    
    for sentence in sentences:
        # Loại bỏ câu quá ngắn
        if sentence.word_count < min_words:
            continue
        
        # Loại bỏ câu quá dài
        if sentence.word_count > max_words:
            continue
        
        # Loại bỏ câu không có động từ
        if require_verb and not sentence.has_verb:
            continue
        
        # Loại bỏ câu chỉ là tiêu đề (toàn chữ hoa)
        upper_count = sum(1 for c in sentence.text if c.isupper())
        if upper_count / len(sentence.text) > 0.7:
            continue
        
        # Loại bỏ câu list (nhiều dấu phẩy, bullet points)
        if sentence.text.strip().startswith(('-', '•', '*', '+')):
            continue
        
        valid_sentences.append(sentence)
    
    return valid_sentences


# ============================================================================
# BƯỚC 2.4 – CHẤM ĐIỂM CÂU (CORE LOGIC)
# ============================================================================

def calculate_keyword_density(
    sentence: Sentence,
    vocabulary_words: List[str]
) -> float:
    """
    Tính keyword density: tỷ lệ từ quan trọng trong câu
    
    Args:
        sentence: Câu cần tính
        vocabulary_words: Danh sách từ vựng
    
    Returns:
        Keyword density (0-1)
    """
    text_lower = sentence.text.lower()
    keyword_count = 0
    
    for word in vocabulary_words:
        word_pattern = re.compile(r'\b' + re.escape(word.lower()) + r'\b')
        matches = word_pattern.findall(text_lower)
        keyword_count += len(matches)
    
    return keyword_count / sentence.word_count if sentence.word_count > 0 else 0


def calculate_length_score(
    sentence: Sentence,
    optimal_min: int = 8,
    optimal_max: int = 20
) -> float:
    """
    Tính length score: câu 8-20 từ là tốt nhất
    
    Args:
        sentence: Câu cần tính
        optimal_min: Số từ tối thiểu lý tưởng
        optimal_max: Số từ tối đa lý tưởng
    
    Returns:
        Length score (0-1)
    """
    word_count = sentence.word_count
    
    if optimal_min <= word_count <= optimal_max:
        return 1.0  # Perfect length
    
    if word_count < optimal_min:
        # Too short: linear penalty
        return word_count / optimal_min
    
    # Too long: exponential penalty
    excess = word_count - optimal_max
    return math.exp(-excess / 10)


def calculate_position_score(
    sentence: Sentence,
    total_sentences: int
) -> float:
    """
    Tính position score: câu xuất hiện sớm hơn → quan trọng hơn
    
    Args:
        sentence: Câu cần tính
        total_sentences: Tổng số câu
    
    Returns:
        Position score (0-1)
    """
    # Exponential decay: câu đầu tiên = 1.0, giảm dần
    return math.exp(-sentence.position / (total_sentences * 0.3))


def calculate_clarity_score(sentence: Sentence) -> float:
    """
    Tính clarity score: có động từ, không phải list
    
    Args:
        sentence: Câu cần tính
    
    Returns:
        Clarity score (0-1)
    """
    score = 0.0
    
    # Có động từ: +0.5
    if sentence.has_verb:
        score += 0.5
    
    # Không phải list (ít dấu phẩy)
    comma_count = sentence.text.count(',')
    comma_ratio = comma_count / sentence.word_count if sentence.word_count > 0 else 0
    
    if comma_ratio < 0.15:
        score += 0.3  # Câu tự nhiên
    elif comma_ratio < 0.3:
        score += 0.15  # Câu hơi nhiều phẩy
    
    # Không có bullet points hoặc numbering
    if not re.match(r'^[\d\-•*+]', sentence.text.strip()):
        score += 0.2
    
    return min(score, 1.0)


def score_sentence(
    sentence: Sentence,
    vocabulary_words: List[str],
    total_sentences: int,
    weights: Optional[Dict[str, float]] = None
) -> SentenceScore:
    """
    Chấm điểm một câu theo công thức weighted
    
    Formula:
    score = 0.4 * keyword_density + 0.3 * length_score + 
            0.2 * position_score + 0.1 * clarity_score
    
    Args:
        sentence: Câu cần chấm điểm
        vocabulary_words: Danh sách từ vựng
        total_sentences: Tổng số câu
        weights: Trọng số tùy chỉnh
    
    Returns:
        SentenceScore object
    """
    if weights is None:
        weights = {
            'keyword_density': 0.4,
            'length_score': 0.3,
            'position_score': 0.2,
            'clarity_score': 0.1
        }
    
    # Tính các điểm thành phần
    keyword_density = calculate_keyword_density(sentence, vocabulary_words)
    length_score = calculate_length_score(sentence)
    position_score = calculate_position_score(sentence, total_sentences)
    clarity_score = calculate_clarity_score(sentence)
    
    # Tính điểm tổng hợp
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


# ============================================================================
# BƯỚC 2.5 – CHỌN CÂU TỐT NHẤT & HIGHLIGHT
# ============================================================================

def highlight_word(sentence_text: str, word: str) -> str:
    """
    Highlight từ vựng trong câu bằng HTML <b> tags
    
    Args:
        sentence_text: Câu gốc
        word: Từ cần highlight
    
    Returns:
        Câu với từ được highlight
    """
    word_pattern = re.compile(r'\b(' + re.escape(word) + r')\b', re.IGNORECASE)
    return word_pattern.sub(r'<b>\1</b>', sentence_text)


def generate_explanation(
    sentence_score: SentenceScore,
    sentence: Sentence
) -> str:
    """
    Tạo explanation cho việc chọn câu
    
    Args:
        sentence_score: Điểm số của câu
        sentence: Câu được chọn
    
    Returns:
        Explanation string
    """
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


def select_best_contexts(
    vocabulary_list: List[Dict[str, float]],
    sentences: List[Sentence],
    min_words: int = 5,
    max_words: int = 35,
    require_verb: bool = True,
    weights: Optional[Dict[str, float]] = None
) -> List[VocabularyContext]:
    """
    Chọn câu tốt nhất cho mỗi từ vựng
    
    Args:
        vocabulary_list: Danh sách từ vựng với điểm
        sentences: Danh sách câu
        min_words: Số từ tối thiểu
        max_words: Số từ tối đa
        require_verb: Yêu cầu có động từ
        weights: Trọng số tùy chỉnh
    
    Returns:
        Danh sách VocabularyContext
    """
    # Bước 1: Lọc câu hợp lệ
    valid_sentences = filter_invalid_sentences(
        sentences, min_words, max_words, require_verb
    )
    
    if not valid_sentences:
        print("⚠️  No valid sentences found")
        return []
    
    # Bước 2: Map từ → câu
    vocabulary_words = [v['word'] for v in vocabulary_list]
    word_map = map_words_to_sentences(vocabulary_words, valid_sentences)
    
    # Bước 3: Chọn câu tốt nhất cho mỗi từ
    contexts = []
    
    for vocab_item in vocabulary_list:
        word = vocab_item['word']
        sentence_ids = word_map.get(word, [])
        
        if not sentence_ids:
            # Only warn for single words (not phrases)
            if ' ' not in word and len(word) <= 20:
                print(f"⚠️  No sentences found for word: {word}")
            continue
        
        # Lấy các câu chứa từ này
        candidate_sentences = [s for s in valid_sentences if s.sentence_id in sentence_ids]
        
        # Chấm điểm các câu
        sentence_scores = [
            score_sentence(s, vocabulary_words, len(valid_sentences), weights)
            for s in candidate_sentences
        ]
        
        # Chọn câu có điểm cao nhất
        best_score = max(sentence_scores, key=lambda x: x.score)
        best_sentence = next(s for s in candidate_sentences if s.sentence_id == best_score.sentence_id)
        
        # Highlight từ vựng trong câu
        highlighted_sentence = highlight_word(best_sentence.text, word)
        
        # Tạo explanation
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


# ============================================================================
# MAIN FUNCTION
# ============================================================================

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
    """
    STAGE 2 Main Function: Chọn ngữ cảnh tốt nhất cho từ vựng
    
    Args:
        text: Văn bản đã làm sạch
        vocabulary_list: Danh sách từ vựng với điểm [{'word': str, 'score': float}]
        language: Ngôn ngữ ('en' hoặc 'vi')
        min_words: Số từ tối thiểu trong câu
        max_words: Số từ tối đa trong câu
        optimal_min: Số từ tối thiểu lý tưởng
        optimal_max: Số từ tối đa lý tưởng
        require_verb: Yêu cầu có động từ
        weights: Trọng số tùy chỉnh
    
    Returns:
        Danh sách context dạng dictionary
    """
    print(f"[Context Selector] Starting context selection...")
    print(f"[Context Selector] Input: {len(vocabulary_list)} vocabulary words")
    
    # Bước 1: Build sentences
    sentences = build_sentences(text, language)
    print(f"[Context Selector] Built {len(sentences)} sentences")
    
    # Bước 2-5: Select best contexts
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


# ============================================================================
# TESTING
# ============================================================================

if __name__ == "__main__":
    # Test với văn bản mẫu
    test_text = """
    Ontology is a formal representation of knowledge within a domain.
    It defines concepts, properties, and relationships between entities.
    Knowledge graphs are built using ontologies.
    Semantic web technologies rely heavily on ontology engineering.
    The Web Ontology Language (OWL) is a standard for creating ontologies.
    """
    
    test_vocabulary = [
        {'word': 'ontology', 'score': 0.95},
        {'word': 'knowledge', 'score': 0.85},
        {'word': 'semantic', 'score': 0.80}
    ]
    
    print("=" * 80)
    print("TESTING STAGE 2 - Context Intelligence Engine")
    print("=" * 80)
    
    contexts = select_vocabulary_contexts(test_text, test_vocabulary)
    
    print("\n📊 RESULTS:")
    print("-" * 80)
    for ctx in contexts:
        print(f"\n🔹 Word: {ctx['word']}")
        print(f"   Context: {ctx['contextSentence']}")
        print(f"   Score: {ctx['sentenceScore']:.3f}")
        print(f"   {ctx['explanation']}")
    
    print("\n✅ Test completed!")
