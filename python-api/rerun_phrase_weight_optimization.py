"""
Re-run Phrase Weight Optimization with Better Evaluation
Giải quyết vấn đề: Quá nhiều F1-score = 0.40

Cải tiến:
1. Sử dụng nhiều documents (3-5 documents)
2. Đánh giá ở nhiều cutoff (P@5, P@10, P@15, P@20)
3. Tính average F1-score across documents
4. Phân tích ranking changes
"""

import numpy as np
from sentence_transformers import SentenceTransformer
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from typing import List, Dict, Tuple
import pandas as pd

# Load embedding model
print("Loading SBERT model...")
embedding_model = SentenceTransformer('sentence-transformers/all-MiniLM-L6-v2')

# ============================================================================
# DATASET: 3 Documents với Ground Truth
# ============================================================================

DOCUMENTS = {
    "doc1_climate": {
        "text": """
        Climate change is one of the most pressing issues of our time. Greenhouse gas emissions 
        from human activities are causing global warming. Rising temperatures lead to melting ice caps, 
        sea level rise, and extreme weather events. Renewable energy sources like solar and wind power 
        are crucial for reducing carbon footprint. Deforestation contributes to biodiversity loss and 
        increases carbon dioxide levels. Ocean acidification threatens marine ecosystems. Sustainable 
        development and environmental policies are essential for mitigating climate impacts.
        """,
        "ground_truth": [
            "climate change", "greenhouse gas emissions", "global warming", "renewable energy",
            "carbon footprint", "deforestation", "biodiversity loss", "ocean acidification",
            "sustainable development", "environmental policies", "sea level rise", "extreme weather"
        ]
    },
    
    "doc2_ai": {
        "text": """
        Artificial intelligence is transforming industries worldwide. Machine learning algorithms 
        enable computers to learn from data without explicit programming. Deep learning uses neural 
        networks with multiple layers to process complex patterns. Natural language processing allows 
        machines to understand human language. Computer vision enables image recognition and object 
        detection. Reinforcement learning trains agents through trial and error. Big data analytics 
        provides insights from massive datasets. Ethical AI ensures responsible development and deployment.
        """,
        "ground_truth": [
            "artificial intelligence", "machine learning", "deep learning", "neural networks",
            "natural language processing", "computer vision", "reinforcement learning",
            "big data analytics", "ethical AI", "image recognition", "object detection"
        ]
    },
    
    "doc3_health": {
        "text": """
        Public health focuses on preventing disease and promoting wellness. Vaccination programs 
        protect populations from infectious diseases. Mental health awareness reduces stigma and 
        improves treatment access. Chronic diseases like diabetes and heart disease require lifestyle 
        interventions. Healthcare systems must ensure universal access to quality care. Epidemiology 
        studies disease patterns and risk factors. Nutrition education promotes healthy eating habits. 
        Physical activity reduces obesity and improves cardiovascular health.
        """,
        "ground_truth": [
            "public health", "vaccination programs", "infectious diseases", "mental health",
            "chronic diseases", "healthcare systems", "epidemiology", "nutrition education",
            "physical activity", "cardiovascular health", "lifestyle interventions"
        ]
    }
}

# ============================================================================
# PHRASE EXTRACTION (Simple N-gram based)
# ============================================================================

def extract_candidate_phrases(text: str, n_range=(2, 4)) -> List[str]:
    """Extract candidate phrases using n-grams"""
    words = text.lower().split()
    phrases = []
    
    for n in range(n_range[0], n_range[1] + 1):
        for i in range(len(words) - n + 1):
            phrase = ' '.join(words[i:i+n])
            # Filter out phrases with only stopwords or punctuation
            if len(phrase) > 5 and not all(c in '.,!?;:' for c in phrase):
                phrases.append(phrase)
    
    return list(set(phrases))

# ============================================================================
# FEATURE COMPUTATION
# ============================================================================

def compute_tfidf_scores(phrases: List[str], document: str) -> Dict[str, float]:
    """Compute TF-IDF scores for phrases"""
    vectorizer = TfidfVectorizer()
    
    # Create corpus: document + each phrase
    corpus = [document] + phrases
    tfidf_matrix = vectorizer.fit_transform(corpus)
    
    # Get TF-IDF scores for each phrase
    scores = {}
    for i, phrase in enumerate(phrases):
        # Average TF-IDF of words in phrase
        phrase_vector = tfidf_matrix[i + 1].toarray()[0]
        scores[phrase] = float(np.mean(phrase_vector[phrase_vector > 0]))
    
    return scores

def compute_cohesion_scores(phrases: List[str], embedding_model) -> Dict[str, float]:
    """Compute semantic cohesion scores for phrases"""
    scores = {}
    
    for phrase in phrases:
        words = phrase.split()
        if len(words) < 2:
            scores[phrase] = 0.0
            continue
        
        # Get embeddings for each word
        embeddings = embedding_model.encode(words)
        
        # Compute pairwise cosine similarities
        similarities = []
        for i in range(len(words)):
            for j in range(i + 1, len(words)):
                sim = cosine_similarity([embeddings[i]], [embeddings[j]])[0][0]
                similarities.append(sim)
        
        # Average similarity
        scores[phrase] = float(np.mean(similarities)) if similarities else 0.0
    
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
    
    top_k = [phrase for phrase, score in ranked_phrases[:k]]
    ground_truth_set = set(gt.lower() for gt in ground_truth)
    
    # Count matches
    tp = sum(1 for phrase in top_k if phrase in ground_truth_set)
    
    precision = tp / k if k > 0 else 0.0
    recall = tp / len(ground_truth) if len(ground_truth) > 0 else 0.0
    f1 = 2 * precision * recall / (precision + recall) if (precision + recall) > 0 else 0.0
    
    return precision, recall, f1

# ============================================================================
# MAIN EXPERIMENT
# ============================================================================

def run_weight_optimization():
    """Run weight optimization experiment"""
    
    # Weight configurations to test
    weight_configs = [
        ("Equal weights", 0.50, 0.50),
        ("TF-IDF slightly higher", 0.60, 0.40),
        ("TF-IDF dominant", 0.70, 0.30),
        ("TF-IDF very high", 0.80, 0.20),
        ("TF-IDF extreme", 0.90, 0.10),
        ("Cohesion slightly higher", 0.40, 0.60),
        ("Cohesion dominant", 0.30, 0.70),
        ("Cohesion very high", 0.20, 0.80),
        ("Cohesion extreme", 0.10, 0.90),
        ("Balanced 55-45", 0.55, 0.45),
        ("Balanced 65-35", 0.65, 0.35),
        ("Balanced 75-25", 0.75, 0.25),
        ("Balanced 45-55", 0.45, 0.55),
        ("Balanced 35-65", 0.35, 0.65),
        ("Balanced 25-75", 0.25, 0.75),
    ]
    
    results = []
    
    for config_name, w1, w2 in weight_configs:
        print(f"\n{'='*60}")
        print(f"Testing: {config_name} (w1={w1}, w2={w2})")
        print(f"{'='*60}")
        
        # Aggregate results across all documents
        all_f1_at_5 = []
        all_f1_at_10 = []
        all_f1_at_15 = []
        
        for doc_id, doc_data in DOCUMENTS.items():
            print(f"\nProcessing {doc_id}...")
            
            # Extract candidate phrases
            candidates = extract_candidate_phrases(doc_data["text"])
            print(f"  Extracted {len(candidates)} candidate phrases")
            
            # Compute features
            tfidf_scores = compute_tfidf_scores(candidates, doc_data["text"])
            cohesion_scores = compute_cohesion_scores(candidates, embedding_model)
            
            # Score and rank
            ranked = score_and_rank_phrases(candidates, tfidf_scores, cohesion_scores, w1, w2)
            
            # Evaluate at different cutoffs
            p5, r5, f1_5 = evaluate_at_k(ranked, doc_data["ground_truth"], 5)
            p10, r10, f1_10 = evaluate_at_k(ranked, doc_data["ground_truth"], 10)
            p15, r15, f1_15 = evaluate_at_k(ranked, doc_data["ground_truth"], 15)
            
            print(f"  P@5={p5:.3f}, R@5={r5:.3f}, F1@5={f1_5:.3f}")
            print(f"  P@10={p10:.3f}, R@10={r10:.3f}, F1@10={f1_10:.3f}")
            print(f"  P@15={p15:.3f}, R@15={r15:.3f}, F1@15={f1_15:.3f}")
            
            all_f1_at_5.append(f1_5)
            all_f1_at_10.append(f1_10)
            all_f1_at_15.append(f1_15)
        
        # Average F1 across documents
        avg_f1_5 = np.mean(all_f1_at_5)
        avg_f1_10 = np.mean(all_f1_at_10)
        avg_f1_15 = np.mean(all_f1_at_15)
        
        results.append({
            "Config": config_name,
            "w1": w1,
            "w2": w2,
            "Avg_F1@5": round(avg_f1_5, 4),
            "Avg_F1@10": round(avg_f1_10, 4),
            "Avg_F1@15": round(avg_f1_15, 4),
        })
        
        print(f"\n  AVERAGE: F1@5={avg_f1_5:.4f}, F1@10={avg_f1_10:.4f}, F1@15={avg_f1_15:.4f}")
    
    # Create results DataFrame
    df = pd.DataFrame(results)
    
    # Sort by Avg_F1@10 descending
    df = df.sort_values("Avg_F1@10", ascending=False)
    
    print("\n" + "="*80)
    print("FINAL RESULTS (sorted by Avg_F1@10)")
    print("="*80)
    print(df.to_string(index=False))
    
    # Save to CSV
    df.to_csv("python-api/phrase_weight_optimization_results_v2.csv", index=False)
    print("\n✅ Results saved to: python-api/phrase_weight_optimization_results_v2.csv")
    
    # Find best configuration
    best_row = df.iloc[0]
    print("\n" + "="*80)
    print("BEST CONFIGURATION")
    print("="*80)
    print(f"Config: {best_row['Config']}")
    print(f"w1 (TF-IDF): {best_row['w1']}")
    print(f"w2 (Cohesion): {best_row['w2']}")
    print(f"Avg F1@5: {best_row['Avg_F1@5']}")
    print(f"Avg F1@10: {best_row['Avg_F1@10']}")
    print(f"Avg F1@15: {best_row['Avg_F1@15']}")

if __name__ == "__main__":
    run_weight_optimization()
