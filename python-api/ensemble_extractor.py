"""
STAGE 1 – Ensemble Vocabulary Extraction
Kết hợp TF-IDF, RAKE, YAKE để trích xuất từ vựng

Thư viện sử dụng:
- scikit-learn: TF-IDF
- RAKE (Rapid Automatic Keyword Extraction)
- YAKE (Yet Another Keyword Extractor)
- spaCy: POS tagging, lemmatization
"""

import re
import math
from typing import List, Dict, Tuple, Set
from dataclasses import dataclass
from collections import Counter, defaultdict
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
import spacy
from nltk.corpus import stopwords
from nltk.tokenize import word_tokenize, sent_tokenize
import nltk

# Download NLTK data
try:
    nltk.data.find('tokenizers/punkt')
except LookupError:
    nltk.download('punkt')

try:
    nltk.data.find('corpora/stopwords')
except LookupError:
    nltk.download('stopwords')

# Load spaCy model
try:
    nlp = spacy.load("en_core_web_sm")
except OSError:
    print("⚠️  Run: python -m spacy download en_core_web_sm")
    nlp = None

# Stopwords
ENGLISH_STOPWORDS = set(stopwords.words('english'))

# Technical terms to filter
TECHNICAL_TERMS = {
    'pdf', 'doc', 'docx', 'txt', 'file', 'document', 'page', 'section',
    'chapter', 'figure', 'table', 'appendix', 'reference', 'bibliography',
    'http', 'https', 'www', 'com', 'org', 'net', 'url', 'link',
    'copyright', 'isbn', 'doi', 'version', 'draft', 'revision',
    'metadata', 'header', 'footer', 'annotation', 'comment'
}


# ============================================================================
# DATA STRUCTURES
# ============================================================================

@dataclass
class WordScore:
    """Điểm số của từ vựng"""
    word: str
    score: float
    features: Dict[str, float]
    normalized: Dict[str, float]
    reason: str = ""
    context_relevance: float = 0.0
    is_proper_noun: bool = False
    is_technical: bool = False


# ============================================================================
# TEXT PREPROCESSING
# ============================================================================

def clean_pdf_metadata(text: str) -> str:
    """Làm sạch metadata PDF"""
    patterns = [
        r'\b(startxref|endobj|xref|obj|trailer|colorspace|bitspercomponent)\b',
        r'\b(rgb|cmyk|devicegray|devicergb|devicecmyk)\b',
        r'\b(flatedecode|asciihexdecode|ascii85decode)\b',
        r'\b(catalog|pages|page|font|fontdescriptor|encoding)\b',
    ]
    
    cleaned = text
    for pattern in patterns:
        cleaned = re.sub(pattern, ' ', cleaned, flags=re.IGNORECASE)
    
    # Remove multiple spaces
    cleaned = re.sub(r'\s+', ' ', cleaned).strip()
    return cleaned


def tokenize_text(text: str, remove_stopwords: bool = True, lemmatize: bool = True) -> List[str]:
    """Tokenize và làm sạch text với lemmatization"""
    # Lowercase và tokenize
    tokens = word_tokenize(text.lower())
    
    # Remove punctuation và short words
    tokens = [t for t in tokens if t.isalnum() and len(t) > 2]
    
    # Lemmatization (chuẩn hóa từ về dạng gốc)
    if lemmatize:
        try:
            from nltk.stem import WordNetLemmatizer
            lemmatizer = WordNetLemmatizer()
            tokens = [lemmatizer.lemmatize(t) for t in tokens]
        except:
            pass  # Skip if WordNet not available
    
    # Remove stopwords
    if remove_stopwords:
        tokens = [t for t in tokens if t not in ENGLISH_STOPWORDS]
    
    return tokens


def extract_ngrams(tokens: List[str], n: int) -> List[str]:
    """Trích xuất n-grams"""
    ngrams = []
    for i in range(len(tokens) - n + 1):
        ngram = ' '.join(tokens[i:i+n])
        ngrams.append(ngram)
    return ngrams


# ============================================================================
# FEATURE EXTRACTION
# ============================================================================

def calculate_frequency(tokens: List[str]) -> Dict[str, float]:
    """Tính tần suất từ (normalized)"""
    counter = Counter(tokens)
    total = len(tokens)
    
    freq_scores = {}
    for word, count in counter.items():
        freq_scores[word] = count / total
    
    return freq_scores


def calculate_tfidf(documents: List[str]) -> Dict[str, float]:
    """Tính TF-IDF scores với cấu hình tối ưu cho clustering"""
    vectorizer = TfidfVectorizer(
        max_features=1000,
        ngram_range=(1, 2),      # Unigram + Bigram
        min_df=1,                # Giảm xuống 1 để giữ bigrams hiếm
        max_df=0.8,              # Loại cụm xuất hiện > 80% documents
        stop_words='english',
        norm='l2'                # Chuẩn hóa L2 cho K-means
    )
    
    try:
        tfidf_matrix = vectorizer.fit_transform(documents)
        feature_names = vectorizer.get_feature_names_out()
        
        # Get scores for first document
        scores = tfidf_matrix[0].toarray()[0]
        
        tfidf_scores = {}
        for idx, score in enumerate(scores):
            if score > 0:
                tfidf_scores[feature_names[idx]] = score
        
        return tfidf_scores
    except:
        return {}


def calculate_rake(text: str) -> Dict[str, float]:
    """
    RAKE (Rapid Automatic Keyword Extraction)
    Score = degree(word) / frequency(word)
    """
    sentences = sent_tokenize(text)
    
    # Extract candidate phrases
    candidates = []
    for sentence in sentences:
        tokens = tokenize_text(sentence, remove_stopwords=False)
        phrase = []
        
        for token in tokens:
            if token not in ENGLISH_STOPWORDS:
                phrase.append(token)
            else:
                if phrase:
                    candidates.append(phrase)
                    phrase = []
        
        if phrase:
            candidates.append(phrase)
    
    # Calculate word scores
    word_freq = Counter()
    word_degree = Counter()
    
    for phrase in candidates:
        phrase_length = len(phrase)
        for word in phrase:
            word_freq[word] += 1
            word_degree[word] += phrase_length
    
    # RAKE score
    rake_scores = {}
    for word in word_freq:
        if word_freq[word] > 0:
            rake_scores[word] = word_degree[word] / word_freq[word]
    
    return rake_scores


def calculate_yake(text: str) -> Dict[str, float]:
    """
    YAKE (Yet Another Keyword Extractor)
    Simplified implementation
    """
    sentences = sent_tokenize(text)
    tokens = tokenize_text(text)
    
    # Word statistics
    word_freq = Counter(tokens)
    word_positions = defaultdict(list)
    
    for idx, token in enumerate(tokens):
        word_positions[token].append(idx)
    
    # Calculate YAKE scores
    yake_scores = {}
    total_tokens = len(tokens)
    
    for word, freq in word_freq.items():
        # Position score (earlier = better)
        positions = word_positions[word]
        median_pos = sorted(positions)[len(positions) // 2]
        position_score = math.log(math.log(3 + median_pos))
        
        # Frequency score
        freq_score = freq / len(word_freq)
        
        # Relatedness (simplified)
        relatedness = len(positions) / total_tokens
        
        # YAKE score (lower is better, so we invert)
        yake_score = (relatedness * position_score) / (1 + freq_score)
        yake_scores[word] = 1 / (yake_score + 0.0001)  # Invert
    
    return yake_scores


# ============================================================================
# FILTERING
# ============================================================================

def is_proper_noun(word: str, doc=None) -> bool:
    """Kiểm tra xem có phải proper noun không"""
    if not nlp or not doc:
        # Simple heuristic: check if word starts with capital
        return word[0].isupper() if word else False
    
    for token in doc:
        if token.text.lower() == word.lower():
            return token.pos_ == "PROPN"
    
    return False


def is_technical_term(word: str) -> bool:
    """Kiểm tra xem có phải technical term không"""
    return word.lower() in TECHNICAL_TERMS


def calculate_context_relevance(
    word: str,
    tokens: List[str],
    window_size: int = 5
) -> float:
    """Tính context relevance"""
    positions = [i for i, t in enumerate(tokens) if t == word]
    
    if not positions:
        return 0.0
    
    total_relevance = 0
    for pos in positions:
        start = max(0, pos - window_size)
        end = min(len(tokens), pos + window_size + 1)
        context = tokens[start:end]
        
        # Count content words in context
        content_words = [w for w in context if w not in ENGLISH_STOPWORDS and w != word]
        total_relevance += len(content_words)
    
    return total_relevance / len(positions)


# ============================================================================
# NORMALIZATION
# ============================================================================

def min_max_normalize(values: List[float]) -> List[float]:
    """Min-Max normalization"""
    if not values:
        return []
    
    min_val = min(values)
    max_val = max(values)
    
    if max_val == min_val:
        return [0.5] * len(values)
    
    return [(v - min_val) / (max_val - min_val) for v in values]


# ============================================================================
# ENSEMBLE EXTRACTION
# ============================================================================

def extract_vocabulary_ensemble(
    text: str,
    max_words: int = 50,
    min_word_length: int = 3,
    weights: Dict[str, float] = None,
    include_ngrams: bool = True,
    filter_proper_nouns: bool = True,
    filter_technical: bool = True,
    context_filtering: bool = True
) -> Dict:
    """
    Ensemble vocabulary extraction
    
    Args:
        text: Input text
        max_words: Maximum number of words to extract
        min_word_length: Minimum word length
        weights: Feature weights
        include_ngrams: Include bigrams and trigrams
        filter_proper_nouns: Filter out proper nouns
        filter_technical: Filter out technical terms
        context_filtering: Enable context-based filtering
    
    Returns:
        Dictionary with vocabulary and statistics
    """
    if weights is None:
        weights = {
            'frequency': 0.15,
            'tfidf': 0.35,
            'rake': 0.25,
            'yake': 0.25
        }
    
    print("[Ensemble] Starting vocabulary extraction...")
    
    # Step 1: Clean text
    cleaned_text = clean_pdf_metadata(text)
    
    # Step 2: Tokenize
    tokens = tokenize_text(cleaned_text)
    sentences = sent_tokenize(cleaned_text)
    
    # Step 3: Extract candidates
    candidates = set(tokens)
    
    if include_ngrams:
        bigrams = extract_ngrams(tokens, 2)
        trigrams = extract_ngrams(tokens, 3)
        candidates.update(bigrams)
        candidates.update(trigrams)
    
    # Filter by length and quality
    candidates = {c for c in candidates if len(c) >= min_word_length}
    
    # Remove candidates with non-English characters (except spaces)
    candidates = {c for c in candidates if all(ord(ch) < 128 or ch.isspace() for ch in c)}
    
    # Remove candidates that are mostly numbers
    candidates = {c for c in candidates if not c.replace(' ', '').replace('.', '').replace(',', '').isdigit()}
    
    # Limit n-grams to more reasonable phrases
    filtered_candidates = set()
    for c in candidates:
        words = c.split()
        # Single words: always keep
        if len(words) == 1:
            filtered_candidates.add(c)
        # Bigrams: keep if at least 1 word is meaningful (NỚI LỎNG)
        elif len(words) == 2:
            meaningful_words = [w for w in words if len(w) >= 3 and w not in ENGLISH_STOPWORDS]
            # Chỉ cần 1 trong 2 từ có nghĩa (thay vì all)
            if len(meaningful_words) >= 1:
                filtered_candidates.add(c)
        # Trigrams: keep if at least 2 words are meaningful (NỚI LỎNG)
        elif len(words) == 3:
            meaningful_words = [w for w in words if len(w) >= 3 and w not in ENGLISH_STOPWORDS]
            if len(meaningful_words) >= 2:  # Giảm từ 3 xuống 2
                filtered_candidates.add(c)
    
    candidates = filtered_candidates
    
    print(f"[Ensemble] Found {len(candidates)} candidates")
    
    # Step 4: Parse text with spaCy once (if available)
    doc = None
    if nlp and filter_proper_nouns:
        try:
            # Only parse first 1000 chars for speed
            doc = nlp(cleaned_text[:1000])
        except:
            doc = None
    
    # Step 5: Calculate features
    print("[Ensemble] Calculating features...")
    freq_scores = calculate_frequency(tokens)
    tfidf_scores = calculate_tfidf([cleaned_text])
    rake_scores = calculate_rake(cleaned_text)
    yake_scores = calculate_yake(cleaned_text)
    
    # Step 6: Build word scores
    print("[Ensemble] Building word scores...")
    word_scores = []
    
    for word in candidates:
        # Get scores for each word (handle multi-word)
        word_tokens = word.split()
        
        freq = sum(freq_scores.get(t, 0) for t in word_tokens) / len(word_tokens)
        tfidf = tfidf_scores.get(word, 0)
        rake = sum(rake_scores.get(t, 0) for t in word_tokens) / len(word_tokens)
        yake = sum(yake_scores.get(t, 0) for t in word_tokens) / len(word_tokens)
        
        word_score = WordScore(
            word=word,
            score=0.0,
            features={
                'frequency': freq,
                'tfidf': tfidf,
                'rake': rake,
                'yake': yake
            },
            normalized={},
            is_proper_noun=filter_proper_nouns and is_proper_noun(word, doc),
            is_technical=filter_technical and is_technical_term(word),
            context_relevance=calculate_context_relevance(word, tokens) if context_filtering else 0.0
        )
        
        word_scores.append(word_score)
    
    # Step 7: Normalize features
    print("[Ensemble] Normalizing features...")
    freq_values = [ws.features['frequency'] for ws in word_scores]
    tfidf_values = [ws.features['tfidf'] for ws in word_scores]
    rake_values = [ws.features['rake'] for ws in word_scores]
    yake_values = [ws.features['yake'] for ws in word_scores]
    
    norm_freq = min_max_normalize(freq_values)
    norm_tfidf = min_max_normalize(tfidf_values)
    norm_rake = min_max_normalize(rake_values)
    norm_yake = min_max_normalize(yake_values)
    
    # Step 8: Calculate weighted scores
    print("[Ensemble] Calculating weighted scores...")
    for idx, ws in enumerate(word_scores):
        ws.normalized = {
            'frequency': norm_freq[idx],
            'tfidf': norm_tfidf[idx],
            'rake': norm_rake[idx],
            'yake': norm_yake[idx]
        }
        
        ws.score = (
            weights['frequency'] * norm_freq[idx] +
            weights['tfidf'] * norm_tfidf[idx] +
            weights['rake'] * norm_rake[idx] +
            weights['yake'] * norm_yake[idx]
        )
        
        # Boost for context relevance
        if context_filtering and ws.context_relevance > 3:
            ws.score *= (1 + ws.context_relevance * 0.05)
    
    # Step 9: Filter unwanted terms
    print("[Ensemble] Filtering unwanted terms...")
    filtered_scores = [
        ws for ws in word_scores
        if not (filter_proper_nouns and ws.is_proper_noun)
        and not (filter_technical and ws.is_technical)
    ]
    
    # Step 10: Sort and return top words
    print("[Ensemble] Sorting and selecting top words...")
    sorted_scores = sorted(filtered_scores, key=lambda x: x.score, reverse=True)[:max_words]
    
    # Generate reasons
    for ws in sorted_scores:
        reasons = []
        if ws.normalized['tfidf'] > 0.7:
            reasons.append("TF-IDF cao")
        if ws.normalized['rake'] > 0.7:
            reasons.append("RAKE cao")
        if ws.normalized['yake'] > 0.7:
            reasons.append("YAKE cao")
        if ws.normalized['frequency'] > 0.8:
            reasons.append("tần suất cao")
        if ws.context_relevance > 5:
            reasons.append("liên quan mạnh với ngữ cảnh")
        
        ws.reason = "Được chọn vì: " + ", ".join(reasons) if reasons else "điểm tổng hợp cao"
    
    print(f"[Ensemble] Extracted {len(sorted_scores)} vocabulary words")
    
    return {
        'vocabulary': [ws.word for ws in sorted_scores],
        'scores': [
            {
                'word': ws.word,
                'score': ws.score,
                'features': ws.features,
                'normalized': ws.normalized,
                'reason': ws.reason,
                'contextRelevance': ws.context_relevance
            }
            for ws in sorted_scores
        ],
        'stats': {
            'totalWords': len(tokens),
            'uniqueWords': len(set(tokens)),
            'sentences': len(sentences),
            'method': 'ensemble(freq+tfidf+rake+yake)',
            'weights': weights
        }
    }


# ============================================================================
# TESTING
# ============================================================================

if __name__ == "__main__":
    test_text = """
    Machine learning is a subset of artificial intelligence that enables computers 
    to learn from data without explicit programming. Deep learning uses neural networks 
    with multiple layers to process complex patterns. Natural language processing 
    helps computers understand human language. Computer vision allows machines to 
    interpret visual information from the world.
    """
    
    print("=" * 80)
    print("TESTING STAGE 1 - Ensemble Vocabulary Extraction")
    print("=" * 80)
    
    result = extract_vocabulary_ensemble(test_text, max_words=10)
    
    print("\n📊 RESULTS:")
    print("-" * 80)
    print(f"Total words: {result['stats']['totalWords']}")
    print(f"Unique words: {result['stats']['uniqueWords']}")
    print(f"Sentences: {result['stats']['sentences']}")
    print(f"\nTop {len(result['vocabulary'])} vocabulary words:")
    
    for item in result['scores'][:10]:
        print(f"\n🔹 {item['word']}")
        print(f"   Score: {item['score']:.3f}")
        print(f"   {item['reason']}")
    
    print("\n✅ Test completed!")
