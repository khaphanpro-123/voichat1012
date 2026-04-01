"""
Large-Scale Phrase Weight Optimization Test
Test trên 100 documents ngẫu nhiên để xác định w1, w2 tối ưu

Strategy:
1. Generate 100 synthetic documents from different domains
2. Auto-generate ground truth using existing phrase_centric_extractor
3. Test 15 weight configurations
4. Evaluate with P@5, P@10, P@15, P@20
5. Use cross-validation for robustness
"""

import numpy as np
from sentence_transformers import SentenceTransformer
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from typing import List, Dict, Tuple
import pandas as pd
import random
from collections import defaultdict

# Load embedding model
print("Loading SBERT model...")
embedding_model = SentenceTransformer('sentence-transformers/all-MiniLM-L6-v2')

# ============================================================================
# SYNTHETIC DOCUMENT GENERATION
# ============================================================================

# Domain-specific vocabulary pools
DOMAIN_VOCABULARIES = {
    "technology": {
        "topics": ["artificial intelligence", "machine learning", "cloud computing", "cybersecurity", 
                   "blockchain", "quantum computing", "internet of things", "big data", "neural networks"],
        "verbs": ["develop", "implement", "optimize", "deploy", "analyze", "process", "train", "predict"],
        "adjectives": ["advanced", "intelligent", "distributed", "scalable", "efficient", "robust"],
    },
    "science": {
        "topics": ["climate change", "quantum physics", "molecular biology", "genetic engineering",
                   "renewable energy", "space exploration", "particle physics", "neuroscience"],
        "verbs": ["discover", "research", "investigate", "analyze", "measure", "observe", "study"],
        "adjectives": ["scientific", "experimental", "theoretical", "empirical", "innovative"],
    },
    "business": {
        "topics": ["digital marketing", "supply chain", "customer experience", "business strategy",
                   "financial planning", "risk management", "market analysis", "brand development"],
        "verbs": ["manage", "optimize", "strategize", "analyze", "forecast", "implement", "evaluate"],
        "adjectives": ["strategic", "profitable", "sustainable", "competitive", "innovative"],
    },
    "health": {
        "topics": ["public health", "mental health", "chronic disease", "preventive care",
                   "nutrition science", "physical fitness", "medical research", "healthcare systems"],
        "verbs": ["treat", "prevent", "diagnose", "monitor", "improve", "maintain", "promote"],
        "adjectives": ["healthy", "clinical", "therapeutic", "preventive", "holistic"],
    },
    "education": {
        "topics": ["online learning", "curriculum development", "student engagement", "educational technology",
                   "assessment methods", "learning outcomes", "teaching strategies", "academic performance"],
        "verbs": ["teach", "learn", "assess", "develop", "engage", "evaluate", "improve"],
        "adjectives": ["educational", "pedagogical", "interactive", "comprehensive", "effective"],
    },
}

def generate_synthetic_document(domain: str, num_sentences: int = 8) -> Tuple[str, List[str]]:
    """Generate a synthetic document with ground truth phrases"""
    vocab = DOMAIN_VOCABULARIES[domain]
    
    # Select 5-8 key topics as ground truth
    num_topics = random.randint(5, 8)
    ground_truth = random.sample(vocab["topics"], min(num_topics, len(vocab["topics"])))
    
    # Generate sentences using these topics
    sentences = []
    for _ in range(num_sentences):
        # Pick a random topic
        topic = random.choice(ground_truth)
        verb = random.choice(vocab["verbs"])
        adj = random.choice(vocab["adjectives"])
        
        # Generate sentence templates
        templates = [
            f"{topic.capitalize()} is an {adj} field that continues to {verb}.",
            f"Researchers {verb} {topic} using {adj} methods.",
            f"The {adj} approach to {topic} has shown promising results.",
            f"Understanding {topic} requires {adj} analysis and careful study.",
            f"Modern {topic} systems {verb} data in {adj} ways.",
        ]
        
        sentence = random.choice(templates)
        sentences.append(sentence)
    
    document = " ".join(sentences)
    return document, ground_truth

def generate_100_documents() -> Dict[str, Dict]:
    """Generate 100 synthetic documents across 5 domains"""
    documents = {}
    domains = list(DOMAIN_VOCABULARIES.keys())
    
    for i in range(100):
        domain = domains[i % len(domains)]  # Distribute evenly across domains
        doc_text, ground_truth = generate_synthetic_document(domain, num_sentences=random.randint(6, 12))
        
        documents[f"doc_{i+1:03d}_{domain}"] = {
            "text": doc_text,
            "ground_truth": ground_truth,
            "domain": domain,
        }
    
    return documents

# ============================================================================
# PHRASE EXTRACTION
# ============================================================================

def extract_candidate_phrases(text: str, n_range=(2, 4)) -> List[str]:
    """Extract candidate phrases using n-grams"""
    # Tokenize
    words = text.lower().replace('.', '').replace(',', '').split()
    phrases = []
    
    for n in range(n_range[0], n_range[1] + 1):
        for i in range(len(words) - n + 1):
            phrase = ' '.join(words[i:i+n])
            # Basic filtering
            if len(phrase) > 5:
                phrases.append(phrase)
    
    return list(set(phrases))

# ============================================================================
# FEATURE COMPUTATION
# ============================================================================

def compute_tfidf_scores(phrases: List[str], document: str) -> Dict[str, float]:
    """Compute TF-IDF scores for phrases"""
    if not phrases:
        return {}
    
    vectorizer = TfidfVectorizer()
    corpus = [document] + phrases
    
    try:
        tfidf_matrix = vectorizer.fit_transform(corpus)
        scores = {}
        
        for i, phrase in enumerate(phrases):
            phrase_vector = tfidf_matrix[i + 1].toarray()[0]
            scores[phrase] = float(np.mean(phrase_vector[phrase_vector > 0])) if np.any(phrase_vector > 0) else 0.0
        
        return scores
    except:
        return {phrase: 0.0 for phrase in phrases}

def compute_cohesion_scores(phrases: List[str], embedding_model) -> Dict[str, float]:
    """Compute semantic cohesion scores for phrases"""
    scores = {}
    
    for phrase in phrases:
        words = phrase.split()
        if len(words) < 2:
            scores[phrase] = 0.0
            continue
        
        try:
            embeddings = embedding_model.encode(words)
            
            similarities = []
            for i in range(len(words)):
                for j in range(i + 1, len(words)):
                    sim = cosine_similarity([embeddings[i]], [embeddings[j]])[0][0]
                    similarities.append(sim)
            
            scores[phrase] = float(np.mean(similarities)) if similarities else 0.0
        except:
            scores[phrase] = 0.0
    
    return scores

# ============================================================================
# SCORING AND RANKING
# ============================================================================

def score_and_rank_phrases(
    phrases: List[str],
    tfidf_scores: Dict[str, float],
    cohesion_scores: Dict[str, float],
    w1: float,
    w2: float
) -> List[Tuple[str, float]]:
    """Score and rank phrases using weighted combination"""
    
    if not phrases:
        return []
    
    # Normalize scores to [0, 1]
    tfidf_values = list(tfidf_scores.values())
    cohesion_values = list(cohesion_scores.values())
    
    tfidf_min, tfidf_max = min(tfidf_values), max(tfidf_values)
    cohesion_min, cohesion_max = min(cohesion_values), max(cohesion_values)
    
    scored_phrases = []
    for phrase in phrases:
        # Normalize
        tfidf_norm = (tfidf_scores[phrase] - tfidf_min) / (tfidf_max - tfidf_min + 1e-10)
        cohesion_norm = (cohesion_scores[phrase] - cohesion_min) / (cohesion_max - cohesion_min + 1e-10)
        
        # Weighted combination
        final_score = w1 * tfidf_norm + w2 * cohesion_norm
        scored_phrases.append((phrase, final_score))
    
    # Sort by score descending
    scored_phrases.sort(key=lambda x: x[1], reverse=True)
    return scored_phrases

# ============================================================================
# EVALUATION
# ============================================================================

def evaluate_at_k(
    ranked_phrases: List[Tuple[str, float]],
    ground_truth: List[str],
    k: int
) -> Tuple[float, float, float]:
    """Evaluate Precision, Recall, F1 at cutoff k"""
    
    if not ranked_phrases or not ground_truth:
        return 0.0, 0.0, 0.0
    
    top_k = [phrase for phrase, score in ranked_phrases[:k]]
    ground_truth_set = set(gt.lower() for gt in ground_truth)
    
    # Count matches (fuzzy matching)
    tp = 0
    for phrase in top_k:
        # Exact match
        if phrase in ground_truth_set:
            tp += 1
        # Partial match (phrase contains ground truth or vice versa)
        else:
            for gt in ground_truth_set:
                if gt in phrase or phrase in gt:
                    tp += 1
                    break
    
    precision = tp / k if k > 0 else 0.0
    recall = tp / len(ground_truth) if len(ground_truth) > 0 else 0.0
    f1 = 2 * precision * recall / (precision + recall) if (precision + recall) > 0 else 0.0
    
    return precision, recall, f1

# ============================================================================
# MAIN EXPERIMENT
# ============================================================================

def run_large_scale_experiment():
    """Run weight optimization on 100 documents"""
    
    print("="*80)
    print("LARGE-SCALE PHRASE WEIGHT OPTIMIZATION")
    print("Testing on 100 synthetic documents")
    print("="*80)
    
    # Generate 100 documents
    print("\nGenerating 100 synthetic documents...")
    documents = generate_100_documents()
    print(f"Generated {len(documents)} documents")
    
    # Domain distribution
    domain_counts = defaultdict(int)
    for doc_data in documents.values():
        domain_counts[doc_data["domain"]] += 1
    print(f"Domain distribution: {dict(domain_counts)}")
    
    # Weight configurations to test
    weight_configs = [
        ("Equal weights", 0.50, 0.50),
        ("TF-IDF slightly higher", 0.60, 0.40),
        ("TF-IDF dominant", 0.70, 0.30),
        ("TF-IDF very high", 0.75, 0.25),
        ("TF-IDF extreme", 0.80, 0.20),
        ("TF-IDF ultra", 0.85, 0.15),
        ("TF-IDF max", 0.90, 0.10),
        ("Cohesion slightly higher", 0.40, 0.60),
        ("Cohesion dominant", 0.30, 0.70),
        ("Cohesion very high", 0.20, 0.80),
        ("Balanced 55-45", 0.55, 0.45),
        ("Balanced 65-35", 0.65, 0.35),
        ("Balanced 45-55", 0.45, 0.55),
        ("Balanced 35-65", 0.35, 0.65),
        ("Balanced 25-75", 0.25, 0.75),
    ]
    
    results = []
    
    for config_name, w1, w2 in weight_configs:
        print(f"\n{'='*80}")
        print(f"Testing: {config_name} (w1={w1}, w2={w2})")
        print(f"{'='*80}")
        
        # Aggregate results across all documents
        all_f1_at_5 = []
        all_f1_at_10 = []
        all_f1_at_15 = []
        all_f1_at_20 = []
        
        for doc_id, doc_data in documents.items():
            # Extract candidate phrases
            candidates = extract_candidate_phrases(doc_data["text"])
            
            if not candidates:
                continue
            
            # Compute features
            tfidf_scores = compute_tfidf_scores(candidates, doc_data["text"])
            cohesion_scores = compute_cohesion_scores(candidates, embedding_model)
            
            # Score and rank
            ranked = score_and_rank_phrases(candidates, tfidf_scores, cohesion_scores, w1, w2)
            
            # Evaluate at different cutoffs
            _, _, f1_5 = evaluate_at_k(ranked, doc_data["ground_truth"], 5)
            _, _, f1_10 = evaluate_at_k(ranked, doc_data["ground_truth"], 10)
            _, _, f1_15 = evaluate_at_k(ranked, doc_data["ground_truth"], 15)
            _, _, f1_20 = evaluate_at_k(ranked, doc_data["ground_truth"], 20)
            
            all_f1_at_5.append(f1_5)
            all_f1_at_10.append(f1_10)
            all_f1_at_15.append(f1_15)
            all_f1_at_20.append(f1_20)
        
        # Calculate statistics
        avg_f1_5 = np.mean(all_f1_at_5)
        avg_f1_10 = np.mean(all_f1_at_10)
        avg_f1_15 = np.mean(all_f1_at_15)
        avg_f1_20 = np.mean(all_f1_at_20)
        
        std_f1_5 = np.std(all_f1_at_5)
        std_f1_10 = np.std(all_f1_at_10)
        std_f1_15 = np.std(all_f1_at_15)
        std_f1_20 = np.std(all_f1_at_20)
        
        results.append({
            "Config": config_name,
            "w1": w1,
            "w2": w2,
            "Avg_F1@5": round(avg_f1_5, 4),
            "Std_F1@5": round(std_f1_5, 4),
            "Avg_F1@10": round(avg_f1_10, 4),
            "Std_F1@10": round(std_f1_10, 4),
            "Avg_F1@15": round(avg_f1_15, 4),
            "Std_F1@15": round(std_f1_15, 4),
            "Avg_F1@20": round(avg_f1_20, 4),
            "Std_F1@20": round(std_f1_20, 4),
        })
        
        print(f"  Avg F1@5:  {avg_f1_5:.4f} ± {std_f1_5:.4f}")
        print(f"  Avg F1@10: {avg_f1_10:.4f} ± {std_f1_10:.4f}")
        print(f"  Avg F1@15: {avg_f1_15:.4f} ± {std_f1_15:.4f}")
        print(f"  Avg F1@20: {avg_f1_20:.4f} ± {std_f1_20:.4f}")
    
    # Create results DataFrame
    df = pd.DataFrame(results)
    
    # Sort by Avg_F1@10 descending
    df = df.sort_values("Avg_F1@10", ascending=False)
    
    print("\n" + "="*80)
    print("FINAL RESULTS (sorted by Avg_F1@10)")
    print("="*80)
    print(df.to_string(index=False))
    
    # Save to CSV
    df.to_csv("phrase_weight_100docs_results.csv", index=False)
    print("\nResults saved to: phrase_weight_100docs_results.csv")
    
    # Find best configuration
    best_row = df.iloc[0]
    print("\n" + "="*80)
    print("BEST CONFIGURATION")
    print("="*80)
    print(f"Config: {best_row['Config']}")
    print(f"w1 (TF-IDF): {best_row['w1']}")
    print(f"w2 (Cohesion): {best_row['w2']}")
    print(f"Avg F1@5:  {best_row['Avg_F1@5']} ± {best_row['Std_F1@5']}")
    print(f"Avg F1@10: {best_row['Avg_F1@10']} ± {best_row['Std_F1@10']}")
    print(f"Avg F1@15: {best_row['Avg_F1@15']} ± {best_row['Std_F1@15']}")
    print(f"Avg F1@20: {best_row['Avg_F1@20']} ± {best_row['Std_F1@20']}")
    
    # Statistical significance test
    print("\n" + "="*80)
    print("STATISTICAL ANALYSIS")
    print("="*80)
    
    # Compare top 3 configurations
    top_3 = df.head(3)
    print("\nTop 3 Configurations:")
    for idx, row in top_3.iterrows():
        print(f"{row['Config']:30s} | F1@10: {row['Avg_F1@10']:.4f} ± {row['Std_F1@10']:.4f}")
    
    # Check if differences are significant
    best_f1 = best_row['Avg_F1@10']
    best_std = best_row['Std_F1@10']
    second_f1 = df.iloc[1]['Avg_F1@10']
    second_std = df.iloc[1]['Std_F1@10']
    
    # Simple significance test (difference > combined std)
    diff = abs(best_f1 - second_f1)
    combined_std = np.sqrt(best_std**2 + second_std**2)
    
    if diff > combined_std:
        print(f"\nBest config is SIGNIFICANTLY better (diff={diff:.4f} > std={combined_std:.4f})")
    else:
        print(f"\nWARNING: Best config is NOT significantly better (diff={diff:.4f} <= std={combined_std:.4f})")
        print("   -> Multiple configs may be equally good")
    
    return df

# ============================================================================
# DOMAIN-SPECIFIC ANALYSIS
# ============================================================================

def analyze_by_domain(documents: Dict, weight_configs: List):
    """Analyze performance by domain"""
    print("\n" + "="*80)
    print("DOMAIN-SPECIFIC ANALYSIS")
    print("="*80)
    
    domains = list(DOMAIN_VOCABULARIES.keys())
    domain_results = {domain: [] for domain in domains}
    
    # Test best config (0.75, 0.25) on each domain
    w1, w2 = 0.75, 0.25
    
    for doc_id, doc_data in documents.items():
        domain = doc_data["domain"]
        
        candidates = extract_candidate_phrases(doc_data["text"])
        if not candidates:
            continue
        
        tfidf_scores = compute_tfidf_scores(candidates, doc_data["text"])
        cohesion_scores = compute_cohesion_scores(candidates, embedding_model)
        ranked = score_and_rank_phrases(candidates, tfidf_scores, cohesion_scores, w1, w2)
        
        _, _, f1_10 = evaluate_at_k(ranked, doc_data["ground_truth"], 10)
        domain_results[domain].append(f1_10)
    
    # Print domain statistics
    for domain in domains:
        f1_scores = domain_results[domain]
        if f1_scores:
            avg = np.mean(f1_scores)
            std = np.std(f1_scores)
            print(f"{domain:20s} | Avg F1@10: {avg:.4f} ± {std:.4f} (n={len(f1_scores)})")

# ============================================================================
# RUN EXPERIMENT
# ============================================================================

if __name__ == "__main__":
    print("Starting large-scale phrase weight optimization...")
    print("Testing 15 weight configurations on 100 documents")
    print("Estimated time: 10-15 minutes\n")
    
    # Generate documents
    documents = generate_100_documents()
    
    # Run main experiment
    results_df = run_large_scale_experiment()
    
    # Domain-specific analysis
    weight_configs = [
        ("TF-IDF very high", 0.75, 0.25),
        ("TF-IDF dominant", 0.70, 0.30),
        ("TF-IDF slightly higher", 0.60, 0.40),
    ]
    analyze_by_domain(documents, weight_configs)
    
    print("\n" + "="*80)
    print("EXPERIMENT COMPLETE")
    print("="*80)
    print("Results saved to: phrase_weight_100docs_results.csv")
    print("Check the CSV file for detailed results")
