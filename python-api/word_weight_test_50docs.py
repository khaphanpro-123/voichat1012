"""
Word Weight Optimization Test - 50 Documents
Tối ưu trọng số w1, w2, w3, w4 cho từ đơn (4 features)

Formula:
final_score = w1×tfidf + w2×word_length + w3×morphological + w4×coverage_penalty
"""

import numpy as np
import re
import math
from typing import List, Dict, Tuple
import pandas as pd
import random
from collections import defaultdict, Counter
from nltk import word_tokenize, pos_tag, sent_tokenize
from nltk.stem import WordNetLemmatizer

print("🔄 Loading NLTK resources...")
import nltk
try:
    nltk.data.find('tokenizers/punkt')
except LookupError:
    nltk.download('punkt', quiet=True)
try:
    nltk.data.find('taggers/averaged_perceptron_tagger')
except LookupError:
    nltk.download('averaged_perceptron_tagger', quiet=True)
try:
    nltk.data.find('corpora/wordnet')
except LookupError:
    nltk.download('wordnet', quiet=True)

print("✅ NLTK loaded\n")

# Domain-specific vocabulary pools
DOMAIN_VOCABULARIES = {
    "technology": {
        "words": ["algorithm", "artificial", "intelligence", "machine", "learning", "neural", 
                  "network", "database", "encryption", "blockchain", "quantum", "computing",
                  "cybersecurity", "software", "hardware", "programming", "development"],
        "verbs": ["develop", "implement", "optimize", "deploy", "analyze", "process"],
        "adjectives": ["advanced", "intelligent", "distributed", "scalable", "efficient"],
    },
    "science": {
        "words": ["climate", "quantum", "molecular", "genetic", "renewable", "particle",
                  "neuroscience", "biology", "physics", "chemistry", "experiment", "hypothesis",
                  "theory", "research", "discovery", "innovation"],
        "verbs": ["discover", "research", "investigate", "analyze", "measure", "observe"],
        "adjectives": ["scientific", "experimental", "theoretical", "empirical"],
    },
    "business": {
        "words": ["marketing", "strategy", "management", "finance", "investment", "revenue",
                  "profit", "customer", "market", "competition", "innovation", "growth",
                  "sustainability", "leadership", "organization"],
        "verbs": ["manage", "optimize", "strategize", "forecast", "implement", "evaluate"],
        "adjectives": ["strategic", "profitable", "sustainable", "competitive"],
    },
    "health": {
        "words": ["disease", "treatment", "diagnosis", "prevention", "nutrition", "fitness",
                  "therapy", "medicine", "healthcare", "wellness", "immunity", "symptom",
                  "recovery", "rehabilitation", "exercise"],
        "verbs": ["treat", "prevent", "diagnose", "monitor", "improve", "maintain"],
        "adjectives": ["healthy", "clinical", "therapeutic", "preventive"],
    },
    "education": {
        "words": ["curriculum", "pedagogy", "assessment", "learning", "teaching", "student",
                  "knowledge", "skill", "competency", "literacy", "achievement", "development",
                  "instruction", "evaluation", "methodology"],
        "verbs": ["teach", "learn", "assess", "develop", "engage", "evaluate"],
        "adjectives": ["educational", "pedagogical", "interactive", "comprehensive"],
    },
}

STOPWORDS = {
    'the', 'a', 'an', 'of', 'in', 'for', 'with', 'on', 'at', 'to', 'from', 'by',
    'and', 'or', 'but', 'be', 'is', 'are', 'was', 'were', 'have', 'has', 'had',
    'do', 'does', 'did', 'can', 'could', 'will', 'would', 'should', 'may', 'might',
    'i', 'you', 'he', 'she', 'it', 'we', 'they', 'this', 'that', 'these', 'those',
}

def generate_synthetic_document(domain: str, num_sentences: int = 8) -> Tuple[str, List[str]]:
    """Generate a synthetic document with ground truth words"""
    vocab = DOMAIN_VOCABULARIES[domain]
    
    # Select 8-12 key words as ground truth
    num_words = random.randint(8, 12)
    ground_truth = random.sample(vocab["words"], min(num_words, len(vocab["words"])))
    
    # Generate sentences using these words
    sentences = []
    for _ in range(num_sentences):
        word = random.choice(ground_truth)
        verb = random.choice(vocab["verbs"])
        adj = random.choice(vocab["adjectives"])
        
        templates = [
            f"The {adj} {word} continues to {verb} rapidly.",
            f"Researchers {verb} {word} using {adj} methods.",
            f"Understanding {word} requires {adj} analysis.",
            f"Modern {word} systems {verb} efficiently.",
            f"The {word} field is {adj} and innovative.",
        ]
        
        sentence = random.choice(templates)
        sentences.append(sentence)
    
    document = " ".join(sentences)
    return document, ground_truth

def generate_documents(num_docs: int = 50) -> Dict[str, Dict]:
    """Generate synthetic documents"""
    documents = {}
    domains = list(DOMAIN_VOCABULARIES.keys())
    
    for i in range(num_docs):
        domain = domains[i % len(domains)]
        doc_text, ground_truth = generate_synthetic_document(domain, num_sentences=random.randint(6, 10))
        
        documents[f"doc_{i+1:03d}_{domain}"] = {
            "text": doc_text,
            "ground_truth": ground_truth,
            "domain": domain,
        }
    
    return documents

def extract_candidate_words(text: str) -> List[Dict]:
    """Extract candidate words from text"""
    lemmatizer = WordNetLemmatizer()
    
    tokens = []
    word_freq = Counter()
    
    # Tokenize and POS tag
    words = word_tokenize(text)
    pos_tags = pos_tag(words)
    
    for word, pos in pos_tags:
        word_lower = word.lower()
        
        # Skip short words, numbers, stopwords
        if len(word_lower) < 3 or any(c.isdigit() for c in word_lower):
            continue
        if word_lower in STOPWORDS:
            continue
        
        # POS filter: keep only NOUN, VERB, ADJ
        if not (pos.startswith('NN') or pos.startswith('VB') or pos.startswith('JJ')):
            continue
        
        # Lemmatize
        lemma = lemmatizer.lemmatize(word_lower)
        
        # Store
        if lemma not in [t['word'] for t in tokens]:
            tokens.append({
                'word': lemma,
                'pos': pos,
            })
        
        word_freq[lemma] += 1
    
    # Add frequency
    for token in tokens:
        token['frequency'] = word_freq[token['word']]
    
    return tokens

def compute_tfidf(word: str, text: str) -> float:
    """Compute TF-IDF score"""
    all_words = word_tokenize(text.lower())
    word_count = all_words.count(word)
    total_words = len(all_words)
    tf = word_count / total_words if total_words > 0 else 0.0
    
    sentences = [sent.lower() for sent in sent_tokenize(text)]
    N = len(sentences)
    df = sum(1 for sent in sentences if word in sent)
    
    if df > 0:
        idf = math.log(N / df)
    else:
        idf = 0.0
    
    return tf * idf

def compute_word_length(word: str) -> float:
    """Compute normalized word length"""
    return min(len(word) / 15.0, 1.0)

def compute_morphological_score(word: str) -> float:
    """Compute morphological score based on suffixes and syllables"""
    syllables = len(re.findall(r'[aeiou]+', word.lower()))
    
    valuable_suffixes = [
        'tion', 'sion', 'ment', 'ness', 'ity', 'ance', 'ence', 'ism',
        'ology', 'graphy', 'able', 'ible', 'ful', 'less', 'ous'
    ]
    
    has_suffix = any(word.endswith(suffix) for suffix in valuable_suffixes)
    
    if has_suffix:
        return 0.9
    elif syllables >= 3:
        return 0.7
    elif syllables == 2:
        return 0.5
    else:
        return 0.3

def compute_coverage_penalty(word: str, phrases: List[str] = None) -> float:
    """Compute coverage penalty if word appears in phrases"""
    if not phrases:
        return 0.0
    
    for phrase in phrases:
        if word in phrase.lower().split():
            return 0.5
    
    return 0.0

def score_and_rank_words(
    candidates: List[Dict],
    text: str,
    w1: float,
    w2: float,
    w3: float,
    w4: float,
    phrases: List[str] = None
) -> List[Tuple[str, float]]:
    """Score and rank words using weighted combination"""
    
    if not candidates:
        return []
    
    # Compute features
    for candidate in candidates:
        word = candidate['word']
        candidate['tfidf'] = compute_tfidf(word, text)
        candidate['length'] = compute_word_length(word)
        candidate['morph'] = compute_morphological_score(word)
        candidate['coverage'] = compute_coverage_penalty(word, phrases)
    
    # Normalize TF-IDF to [0, 1]
    tfidf_values = [c['tfidf'] for c in candidates]
    tfidf_min, tfidf_max = min(tfidf_values), max(tfidf_values)
    
    scored_words = []
    for candidate in candidates:
        # Normalize TF-IDF
        tfidf_norm = (candidate['tfidf'] - tfidf_min) / (tfidf_max - tfidf_min + 1e-10)
        
        # Weighted combination
        final_score = (
            w1 * tfidf_norm +
            w2 * candidate['length'] +
            w3 * candidate['morph'] +
            w4 * candidate['coverage']
        )
        
        # Clamp to [0, 1]
        final_score = max(0.0, min(1.0, final_score))
        
        scored_words.append((candidate['word'], final_score))
    
    # Sort by score descending
    scored_words.sort(key=lambda x: x[1], reverse=True)
    return scored_words

def evaluate_at_k(
    ranked_words: List[Tuple[str, float]],
    ground_truth: List[str],
    k: int
) -> Tuple[float, float, float]:
    """Evaluate Precision, Recall, F1 at cutoff k"""
    
    if not ranked_words or not ground_truth:
        return 0.0, 0.0, 0.0
    
    top_k = [word for word, score in ranked_words[:k]]
    ground_truth_set = set(gt.lower() for gt in ground_truth)
    
    # Count matches
    tp = sum(1 for word in top_k if word in ground_truth_set)
    
    precision = tp / k if k > 0 else 0.0
    recall = tp / len(ground_truth) if len(ground_truth) > 0 else 0.0
    f1 = 2 * precision * recall / (precision + recall) if (precision + recall) > 0 else 0.0
    
    return precision, recall, f1

def run_experiment():
    """Run weight optimization on 50 documents"""
    
    print("="*80)
    print("WORD WEIGHT OPTIMIZATION - 50 DOCUMENTS")
    print("="*80)
    
    # Generate 50 documents
    print("\n📝 Generating 50 synthetic documents...")
    documents = generate_documents(50)
    print(f"✅ Generated {len(documents)} documents")
    
    # Domain distribution
    domain_counts = defaultdict(int)
    for doc_data in documents.values():
        domain_counts[doc_data["domain"]] += 1
    print(f"📊 Domain distribution: {dict(domain_counts)}\n")
    
    # Weight configurations to test
    weight_configs = [
        # Current baseline
        ("Current (0.6,0.1,0.3,-0.5)", 0.60, 0.10, 0.30, -0.50),
        
        # TF-IDF variations
        ("TF-IDF higher", 0.70, 0.10, 0.20, -0.50),
        ("TF-IDF dominant", 0.75, 0.10, 0.15, -0.50),
        ("TF-IDF very high", 0.80, 0.05, 0.15, -0.50),
        
        # Morphological variations
        ("Morph higher", 0.50, 0.10, 0.40, -0.50),
        ("Morph dominant", 0.40, 0.10, 0.50, -0.50),
        
        # Balanced variations
        ("Balanced TF-Morph", 0.50, 0.10, 0.40, -0.50),
        ("Equal TF-Morph", 0.45, 0.10, 0.45, -0.50),
        
        # Coverage penalty variations
        ("Coverage light", 0.60, 0.10, 0.30, -0.30),
        ("Coverage heavy", 0.60, 0.10, 0.30, -0.70),
        ("No coverage", 0.60, 0.15, 0.35, 0.00),
        
        # Length variations
        ("Length higher", 0.55, 0.20, 0.25, -0.50),
        ("Length lower", 0.65, 0.05, 0.30, -0.50),
        
        # Optimized combinations
        ("Optimized 1", 0.70, 0.08, 0.22, -0.40),
        ("Optimized 2", 0.75, 0.05, 0.20, -0.45),
    ]
    
    results = []
    
    for idx, (config_name, w1, w2, w3, w4) in enumerate(weight_configs, 1):
        print(f"[{idx}/15] Testing: {config_name}...", end=" ")
        
        # Aggregate results across all documents
        all_f1_at_5 = []
        all_f1_at_10 = []
        all_f1_at_15 = []
        
        for doc_id, doc_data in documents.items():
            # Extract candidate words
            candidates = extract_candidate_words(doc_data["text"])
            
            if not candidates:
                continue
            
            # Score and rank
            ranked = score_and_rank_words(candidates, doc_data["text"], w1, w2, w3, w4)
            
            # Evaluate at different cutoffs
            _, _, f1_5 = evaluate_at_k(ranked, doc_data["ground_truth"], 5)
            _, _, f1_10 = evaluate_at_k(ranked, doc_data["ground_truth"], 10)
            _, _, f1_15 = evaluate_at_k(ranked, doc_data["ground_truth"], 15)
            
            all_f1_at_5.append(f1_5)
            all_f1_at_10.append(f1_10)
            all_f1_at_15.append(f1_15)
        
        # Calculate statistics
        avg_f1_5 = np.mean(all_f1_at_5)
        avg_f1_10 = np.mean(all_f1_at_10)
        avg_f1_15 = np.mean(all_f1_at_15)
        
        std_f1_5 = np.std(all_f1_at_5)
        std_f1_10 = np.std(all_f1_at_10)
        std_f1_15 = np.std(all_f1_at_15)
        
        results.append({
            "Config": config_name,
            "w1": w1,
            "w2": w2,
            "w3": w3,
            "w4": w4,
            "Avg_F1@5": round(avg_f1_5, 4),
            "Std_F1@5": round(std_f1_5, 4),
            "Avg_F1@10": round(avg_f1_10, 4),
            "Std_F1@10": round(std_f1_10, 4),
            "Avg_F1@15": round(avg_f1_15, 4),
            "Std_F1@15": round(std_f1_15, 4),
        })
        
        print(f"F1@10={avg_f1_10:.4f}±{std_f1_10:.4f}")
    
    # Create results DataFrame
    df = pd.DataFrame(results)
    
    # Sort by Avg_F1@10 descending
    df = df.sort_values("Avg_F1@10", ascending=False)
    
    print("\n" + "="*80)
    print("FINAL RESULTS (sorted by Avg_F1@10)")
    print("="*80)
    print(df.to_string(index=False))
    
    # Save to CSV
    df.to_csv("word_weight_50docs_results.csv", index=False)
    print("\n✅ Results saved to: word_weight_50docs_results.csv")
    
    # Find best configuration
    best_row = df.iloc[0]
    print("\n" + "="*80)
    print("🏆 BEST CONFIGURATION")
    print("="*80)
    print(f"Config: {best_row['Config']}")
    print(f"w1 (TF-IDF): {best_row['w1']}")
    print(f"w2 (Word Length): {best_row['w2']}")
    print(f"w3 (Morphological): {best_row['w3']}")
    print(f"w4 (Coverage Penalty): {best_row['w4']}")
    print(f"Avg F1@5:  {best_row['Avg_F1@5']} ± {best_row['Std_F1@5']}")
    print(f"Avg F1@10: {best_row['Avg_F1@10']} ± {best_row['Std_F1@10']}")
    print(f"Avg F1@15: {best_row['Avg_F1@15']} ± {best_row['Std_F1@15']}")
    
    # Statistical significance test
    print("\n" + "="*80)
    print("📊 STATISTICAL ANALYSIS")
    print("="*80)
    
    # Compare top 3 configurations
    top_3 = df.head(3)
    print("\nTop 3 Configurations:")
    for idx, row in top_3.iterrows():
        print(f"  {row['Config']:30s} | F1@10: {row['Avg_F1@10']:.4f} ± {row['Std_F1@10']:.4f}")
    
    # Check if differences are significant
    best_f1 = best_row['Avg_F1@10']
    best_std = best_row['Std_F1@10']
    second_f1 = df.iloc[1]['Avg_F1@10']
    second_std = df.iloc[1]['Std_F1@10']
    
    diff = abs(best_f1 - second_f1)
    combined_std = np.sqrt(best_std**2 + second_std**2)
    
    if diff > combined_std:
        print(f"\n✅ Best config is SIGNIFICANTLY better (diff={diff:.4f} > std={combined_std:.4f})")
    else:
        print(f"\n⚠️  Best config is NOT significantly better (diff={diff:.4f} <= std={combined_std:.4f})")
        print("   → Multiple configs may be equally good")
    
    return df

if __name__ == "__main__":
    print("🚀 Starting word weight optimization...")
    print("📊 Testing 15 weight configurations on 50 documents")
    print("⏱️  Estimated time: 3-5 minutes\n")
    
    results_df = run_experiment()
    
    print("\n" + "="*80)
    print("✅ EXPERIMENT COMPLETE")
    print("="*80)
    print("Results saved to: word_weight_50docs_results.csv")
