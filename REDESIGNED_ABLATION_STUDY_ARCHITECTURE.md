# REDESIGNED ABLATION STUDY ARCHITECTURE
## Semantic Knowledge Mining Pipeline for Educational Vocabulary Extraction

**Author:** NLP Research Engineer  
**Date:** March 16, 2026  
**Version:** 2.0.0  

---

## 1. SYSTEM ARCHITECTURE OVERVIEW

The redesigned pipeline transforms the original 11-step process into **5 meaningful research modules** that enable systematic ablation studies for vocabulary extraction and flashcard generation from educational documents.

### Core Architecture Principles
- **Modular Design**: Each module can be independently enabled/disabled
- **Scientific Validation**: Systematic ablation testing with measurable metrics
- **Scalable Processing**: Handles documents from 1KB to 10MB
- **Learning-to-Rank**: ML-based ranking for optimal vocabulary selection
- **Semantic Organization**: Topic modeling and clustering for structured learning

### Technology Stack
- **NLP Framework**: NLTK, spaCy, sentence-transformers
- **ML Models**: scikit-learn (Ridge, KMeans, LinearRegression)
- **Embeddings**: SBERT (all-MiniLM-L6-v2) with TF-IDF fallback
- **Deployment**: FastAPI (Railway) + Next.js (Vercel)

---

## 2. MODULE DESCRIPTION

### Module 1: Document Preprocessing Module
**Original Steps:** 1-3 (Document Ingestion, Heading Detection, Context Intelligence)  
**Purpose:** Normalize document structure and extract contextual information  
**Output:** `structured_document` with sentences, headings, and context mapping

**Key Components:**
- Multi-format document ingestion (PDF, DOCX, TXT)
- Heuristic-based heading detection with pattern matching
- Sentence tokenization with POS tagging and context assignment
- Document structure mapping for semantic understanding

**Data Structures Produced:**
```python
structured_document = {
    'normalized_text': str,
    'sentences': List[Sentence],
    'headings': List[Heading], 
    'context_map': Dict[str, Any],
    'metadata': DocumentMetadata
}
```

### Module 2: Vocabulary Extraction Module  
**Original Steps:** 4-5 (Phrase Extraction, Single Word Extraction)  
**Purpose:** Extract candidate vocabulary using Learning-to-Rank algorithms  
**Output:** `candidate_vocabulary` with phrases and words ranked by importance

**Key Components:**
- Phrase-centric extraction with NLTK POS patterns
- Single-word extraction with 7-feature Learning-to-Rank
- TF-IDF scoring with domain-specific weighting
- Coverage analysis to prevent redundancy

**Data Structures Produced:**
```python
candidate_vocabulary = {
    'phrases': List[CandidatePhrase],
    'words': List[CandidateWord],
    'extraction_stats': ExtractionStats
}
```
### Module 3: Semantic Scoring Module
**Original Steps:** 6-8 (Independent Scoring, Merge, Learned Final Scoring)  
**Purpose:** Apply machine learning models to score and merge vocabulary items  
**Output:** `scored_vocabulary` with unified ranking and semantic features

**Key Components:**
- Multi-factor independent scoring (7+ features)
- Semantic similarity-based merging with SBERT embeddings
- Ridge regression for learned final scoring
- Deduplication and normalization

**Data Structures Produced:**
```python
scored_vocabulary = {
    'vocabulary': List[VocabularyItem],
    'scoring_model': RegressionModel,
    'merge_statistics': MergeStats
}
```

### Module 4: Semantic Organization Module
**Original Steps:** 9-10 (Topic Modeling, Within-Topic Ranking)  
**Purpose:** Organize vocabulary into semantic clusters and rank within topics  
**Output:** `organized_vocabulary` with topic assignments and hierarchical ranking

**Key Components:**
- K-means clustering with SBERT embeddings
- Elbow method for optimal cluster count selection
- Within-topic ranking by centroid similarity
- Semantic role assignment (core, umbrella, peripheral)

**Data Structures Produced:**
```python
organized_vocabulary = {
    'topics': List[TopicCluster],
    'vocabulary_with_topics': List[VocabularyItem],
    'cluster_model': KMeansModel,
    'topic_statistics': TopicStats
}
```

### Module 5: Learning Output Module
**Original Steps:** 11-12 (Knowledge Graph, Flashcard Generation)  
**Purpose:** Generate learning materials with semantic relationships  
**Output:** `learning_materials` with flashcards, knowledge graph, and study aids

**Key Components:**
- Enhanced flashcard generation with IPA phonetics
- Knowledge graph construction with semantic relations
- Synonym grouping and related word identification
- Multi-modal learning support (audio, images)

**Data Structures Produced:**
```python
learning_materials = {
    'flashcards': List[EnhancedFlashcard],
    'knowledge_graph': KnowledgeGraph,
    'study_aids': StudyAids
}
```

---

## 3. ABLATION STUDY CONFIGURATION TABLE

| Configuration | Active Modules | Disabled Modules | Purpose | Hypothesis |
|---------------|----------------|------------------|---------|------------|
| **V1: Minimal Baseline** | 1, 2, 5 | 3, 4 | Basic extraction without ML | Tests raw extraction capability |
| **V2: + Structural Context** | 1, 2, 5 | 3, 4 | Adds document structure awareness | Structural context improves recall |
| **V3: + Semantic Scoring** | 1, 2, 3, 5 | 4 | Adds ML-based scoring and merging | Semantic scoring improves precision |
| **V4: + Topic Modeling** | 1, 2, 4, 5 | 3 | Adds clustering without ML scoring | Topic organization improves learning |
| **V5: Full System** | 1, 2, 3, 4, 5 | None | Complete pipeline | Combined approach maximizes F1-score |

### Detailed Configuration Specifications

**V1: Minimal Baseline**
- **Active:** Document Preprocessing, Vocabulary Extraction, Learning Output
- **Disabled:** Semantic Scoring, Semantic Organization  
- **Method:** Simple TF-IDF ranking, no clustering
- **Expected:** High recall, lower precision, basic flashcards

**V2: + Structural Context**
- **Active:** Enhanced document preprocessing with heading-aware context
- **Enhancement:** Sentence-to-heading mapping, section-aware extraction
- **Expected:** 10-15% improvement in recall through better context

**V3: + Semantic Scoring**
- **Active:** ML-based scoring, semantic merging, learned ranking
- **Enhancement:** Ridge regression, SBERT similarity, deduplication
- **Expected:** 15-20% improvement in precision through better filtering

**V4: + Topic Modeling**
- **Active:** K-means clustering, within-topic ranking, semantic roles
- **Enhancement:** Topic-based organization, hierarchical structure
- **Expected:** Improved learning organization, better knowledge retention

**V5: Full System**
- **Active:** All modules with full feature set
- **Enhancement:** Complete semantic pipeline with all optimizations
- **Expected:** Maximum F1-score, optimal learning materials

---

## 4. FULL PIPELINE PSEUDOCODE

```python
ALGORITHM: Semantic Knowledge Mining Pipeline
INPUT: document_file (PDF, DOCX, TXT)
OUTPUT: learning_materials (flashcards, knowledge_graph, study_aids)

# ============================================================================
# MODULE 1: DOCUMENT PREPROCESSING
# ============================================================================
def document_preprocessing_module(document_file):
    # Step 1: Document Ingestion
    raw_text = extract_text_from_file(document_file)
    normalized_text = normalize_text(raw_text)
    
    # Step 2: Heading Detection  
    headings = detect_headings_heuristic(normalized_text)
    document_structure = build_hierarchy(headings)
    
    # Step 3: Context Intelligence
    sentences = tokenize_sentences(normalized_text)
    context_map = map_sentences_to_headings(sentences, document_structure)
    
    return StructuredDocument(
        text=normalized_text,
        sentences=sentences,
        headings=headings,
        context_map=context_map
    )

# ============================================================================
# MODULE 2: VOCABULARY EXTRACTION  
# ============================================================================
def vocabulary_extraction_module(structured_document, max_phrases=30, max_words=20):
    # Step 4: Phrase Extraction
    candidate_phrases = extract_noun_phrases_nltk(structured_document.text)
    phrase_features = calculate_phrase_features(candidate_phrases, structured_document)
    ranked_phrases = learning_to_rank_phrases(phrase_features, max_phrases)
    
    # Step 5: Single Word Extraction
    candidate_words = extract_single_words_pos(structured_document.text)
    word_features = calculate_word_features_7d(candidate_words, structured_document)
    ranked_words = learning_to_rank_words(word_features, max_words)
    
    return CandidateVocabulary(
        phrases=ranked_phrases,
        words=ranked_words
    )

# ============================================================================
# MODULE 3: SEMANTIC SCORING (Optional)
# ============================================================================
def semantic_scoring_module(candidate_vocabulary, structured_document):
    # Step 6: Independent Scoring
    all_items = candidate_vocabulary.phrases + candidate_vocabulary.words
    feature_vectors = extract_semantic_features(all_items, structured_document)
    independent_scores = calculate_independent_scores(feature_vectors)
    
    # Step 7: Semantic Merging
    embeddings = generate_sbert_embeddings(all_items)
    similarity_matrix = compute_cosine_similarity(embeddings)
    merged_vocabulary = merge_similar_items(all_items, similarity_matrix, threshold=0.85)
    
    # Step 8: Learned Final Scoring
    training_features = prepare_training_data(merged_vocabulary)
    scoring_model = train_ridge_regression(training_features)
    final_scores = scoring_model.predict(training_features)
    
    return ScoredVocabulary(
        vocabulary=merged_vocabulary,
        final_scores=final_scores,
        model=scoring_model
    )

# ============================================================================
# MODULE 4: SEMANTIC ORGANIZATION (Optional)
# ============================================================================
def semantic_organization_module(vocabulary_items):
    # Step 9: Topic Modeling
    embeddings = get_or_generate_embeddings(vocabulary_items)
    optimal_k = elbow_method_clustering(embeddings, k_range=[3, 7])
    kmeans_model = KMeans(n_clusters=optimal_k)
    cluster_assignments = kmeans_model.fit_predict(embeddings)
    
    # Step 10: Within-Topic Ranking
    topics = group_by_cluster(vocabulary_items, cluster_assignments)
    for topic in topics:
        centroid_similarities = calculate_centroid_similarity(topic.items, topic.centroid)
        topic.ranked_items = rank_by_similarity(topic.items, centroid_similarities)
        assign_semantic_roles(topic.ranked_items)  # core, umbrella, peripheral
    
    return OrganizedVocabulary(
        topics=topics,
        cluster_model=kmeans_model
    )

# ============================================================================
# MODULE 5: LEARNING OUTPUT
# ============================================================================
def learning_output_module(vocabulary_items, document_title):
    # Step 11: Knowledge Graph Construction
    entities = create_topic_entities(vocabulary_items)
    relations = create_semantic_relations(vocabulary_items, similarity_threshold=0.7)
    knowledge_graph = KnowledgeGraph(entities=entities, relations=relations)
    
    # Step 12: Enhanced Flashcard Generation
    flashcard_groups = group_by_semantic_similarity(vocabulary_items, threshold=0.85)
    enhanced_flashcards = []
    
    for group in flashcard_groups:
        primary_term = select_representative(group)
        synonyms = extract_synonyms(group)
        
        flashcard = EnhancedFlashcard(
            word=primary_term.text,
            definition=generate_definition(primary_term),
            example=primary_term.supporting_sentence,
            synonyms=synonyms,
            ipa=get_ipa_phonetics(primary_term.text),
            audio_url=generate_audio_url(primary_term.text),
            image_url=generate_image_url(primary_term.text),
            cluster_info=primary_term.cluster_info
        )
        enhanced_flashcards.append(flashcard)
    
    return LearningMaterials(
        flashcards=enhanced_flashcards,
        knowledge_graph=knowledge_graph,
        study_aids=generate_study_aids(vocabulary_items)
    )

# ============================================================================
# MAIN PIPELINE ORCHESTRATOR
# ============================================================================
def semantic_knowledge_mining_pipeline(document_file, enabled_modules=[1,2,3,4,5]):
    results = {}
    
    # Module 1: Always enabled (required)
    structured_document = document_preprocessing_module(document_file)
    results['structured_document'] = structured_document
    
    # Module 2: Always enabled (required)  
    candidate_vocabulary = vocabulary_extraction_module(structured_document)
    results['candidate_vocabulary'] = candidate_vocabulary
    vocabulary_items = candidate_vocabulary.phrases + candidate_vocabulary.words
    
    # Module 3: Semantic Scoring (optional)
    if 3 in enabled_modules:
        scored_vocabulary = semantic_scoring_module(candidate_vocabulary, structured_document)
        vocabulary_items = scored_vocabulary.vocabulary
        results['scored_vocabulary'] = scored_vocabulary
    
    # Module 4: Semantic Organization (optional)
    if 4 in enabled_modules:
        organized_vocabulary = semantic_organization_module(vocabulary_items)
        vocabulary_items = organized_vocabulary.get_all_items()
        results['organized_vocabulary'] = organized_vocabulary
    
    # Module 5: Learning Output (optional)
    if 5 in enabled_modules:
        learning_materials = learning_output_module(vocabulary_items, structured_document.title)
        results['learning_materials'] = learning_materials
    
    return results
```

---

## 5. DATA STRUCTURES

### Core Data Structures

```python
@dataclass
class DocumentMetadata:
    char_count: int
    word_count: int
    sentence_count: int
    language: str
    encoding: str

@dataclass  
class Sentence:
    sentence_id: str
    text: str
    position: int
    word_count: int
    has_verb: bool
    tokens: List[str]
    pos_tags: List[str]
    section_title: Optional[str] = None

@dataclass
class Heading:
    heading_id: str
    level: HeadingLevel  # H1, H2, H3, H4
    text: str
    position: int
    parent_id: Optional[str] = None
    children_ids: List[str] = field(default_factory=list)

@dataclass
class CandidatePhrase:
    phrase: str
    pos_pattern: str
    frequency: int
    tfidf_score: float
    heading_similarity: float
    supporting_sentence: str
    importance_score: float
    features: Dict[str, float]

@dataclass
class CandidateWord:
    word: str
    pos_tag: str
    frequency: int
    tfidf_score: float
    domain_specificity: float
    heading_relevance: float
    phrase_coverage: float
    semantic_density: float
    position_weight: float
    length_penalty: float
    final_score: float

@dataclass
class VocabularyItem:
    text: str
    type: str  # 'phrase' or 'word'
    importance_score: float
    tfidf_score: float
    supporting_sentence: str
    cluster_id: Optional[int] = None
    cluster_rank: Optional[int] = None
    semantic_role: Optional[str] = None  # 'core', 'umbrella', 'peripheral'
    synonyms: List[Dict] = field(default_factory=list)
    embedding: Optional[List[float]] = None

@dataclass
class TopicCluster:
    cluster_id: int
    centroid: List[float]
    items: List[VocabularyItem]
    topic_label: str
    coherence_score: float

@dataclass
class EnhancedFlashcard:
    id: str
    word: str
    definition: str
    example: str
    synonyms: List[Dict]
    ipa: str
    audio_url: str
    image_url: str
    cluster_info: Dict
    difficulty: str
    tags: List[str]
```

---

## 6. EXPERIMENT EXECUTION WORKFLOW

### Experimental Setup

```python
class AblationExperimentRunner:
    def __init__(self, dataset_path: str, ground_truth_path: str):
        self.dataset = load_dataset(dataset_path)
        self.ground_truth = load_ground_truth(ground_truth_path)
        self.configurations = ABLATION_CONFIGURATIONS
        
    def run_complete_ablation_study(self) -> AblationResults:
        results = []
        
        for config_name, config in self.configurations.items():
            print(f"Running {config_name}...")
            
            config_results = []
            for document in self.dataset:
                # Run pipeline with specific configuration
                pipeline_result = semantic_knowledge_mining_pipeline(
                    document.file,
                    enabled_modules=config.enabled_modules
                )
                
                # Extract vocabulary for evaluation
                extracted_vocabulary = self.extract_vocabulary_for_evaluation(pipeline_result)
                
                # Calculate metrics
                metrics = self.calculate_metrics(
                    predicted=extracted_vocabulary,
                    ground_truth=self.ground_truth[document.id]
                )
                
                config_results.append({
                    'document_id': document.id,
                    'metrics': metrics,
                    'latency': pipeline_result.execution_time,
                    'vocabulary_count': len(extracted_vocabulary)
                })
            
            # Aggregate results for this configuration
            aggregated_metrics = self.aggregate_metrics(config_results)
            results.append({
                'configuration': config_name,
                'metrics': aggregated_metrics,
                'individual_results': config_results
            })
        
        return AblationResults(results)
```

### Evaluation Metrics

```python
def calculate_metrics(predicted: List[str], ground_truth: List[str]) -> Dict[str, float]:
    """Calculate comprehensive evaluation metrics"""
    
    # Normalize for comparison
    pred_set = set(normalize_term(term) for term in predicted)
    truth_set = set(normalize_term(term) for term in ground_truth)
    
    # Basic metrics
    TP = len(pred_set.intersection(truth_set))
    FP = len(pred_set - truth_set)  
    FN = len(truth_set - pred_set)
    
    precision = TP / (TP + FP) if (TP + FP) > 0 else 0
    recall = TP / (TP + FN) if (TP + FN) > 0 else 0
    f1_score = 2 * (precision * recall) / (precision + recall) if (precision + recall) > 0 else 0
    
    # Advanced metrics
    diversity_index = len(pred_set) / len(predicted) if predicted else 0
    coverage_ratio = TP / len(truth_set) if truth_set else 0
    
    return {
        'precision': precision,
        'recall': recall, 
        'f1_score': f1_score,
        'diversity_index': diversity_index,
        'coverage_ratio': coverage_ratio,
        'true_positives': TP,
        'false_positives': FP,
        'false_negatives': FN
    }

def calculate_latency_metrics(execution_times: List[float]) -> Dict[str, float]:
    """Calculate latency performance metrics"""
    import numpy as np
    
    return {
        'mean_latency': np.mean(execution_times),
        'median_latency': np.median(execution_times),
        'p95_latency': np.percentile(execution_times, 95),
        'p99_latency': np.percentile(execution_times, 99),
        'std_latency': np.std(execution_times)
    }
```

---

## 7. EXPECTED EXPERIMENTAL OUTCOMES

### Performance Effect Predictions

**Module 1 (Document Preprocessing):**
- **Effect on Recall:** +5-10% through better sentence boundary detection
- **Effect on Precision:** +2-5% through heading-aware context
- **Latency Impact:** +0.5-1.0s for document structure analysis

**Module 2 (Vocabulary Extraction):**
- **Effect on Recall:** +15-25% through comprehensive phrase/word extraction
- **Effect on Precision:** +10-15% through Learning-to-Rank filtering
- **Latency Impact:** +2-4s for feature engineering and ranking

**Module 3 (Semantic Scoring):**
- **Effect on Precision:** +20-30% through ML-based scoring and deduplication
- **Effect on Recall:** -5-10% due to aggressive filtering
- **F1-Score Impact:** +10-15% overall improvement
- **Latency Impact:** +3-5s for embedding generation and regression

**Module 4 (Semantic Organization):**
- **Effect on Learning:** +25-40% improvement in knowledge retention
- **Effect on Organization:** Structured topics vs. flat vocabulary list
- **User Experience:** Significant improvement in study material quality
- **Latency Impact:** +2-3s for clustering and ranking

**Module 5 (Learning Output):**
- **Effect on Engagement:** +30-50% through multi-modal flashcards
- **Effect on Retention:** +20-35% through semantic relationships
- **Feature Richness:** IPA, audio, images, synonyms, related terms
- **Latency Impact:** +1-2s for flashcard generation

### Expected Configuration Performance

| Configuration | Precision | Recall | F1-Score | Latency | Learning Quality |
|---------------|-----------|--------|----------|---------|------------------|
| V1: Baseline | 0.65 | 0.75 | 0.70 | 8s | Basic |
| V2: + Context | 0.68 | 0.82 | 0.74 | 9s | Improved |
| V3: + Scoring | 0.85 | 0.78 | 0.81 | 15s | Good |
| V4: + Topics | 0.72 | 0.85 | 0.78 | 12s | Structured |
| V5: Full System | 0.88 | 0.85 | 0.86 | 18s | Excellent |

### Statistical Significance Testing

```python
def statistical_significance_test(results_a: List[float], results_b: List[float]) -> Dict:
    """Perform statistical significance testing between configurations"""
    from scipy import stats
    
    # Paired t-test for comparing configurations
    t_stat, p_value = stats.ttest_rel(results_a, results_b)
    
    # Effect size (Cohen's d)
    pooled_std = np.sqrt(((len(results_a) - 1) * np.var(results_a) + 
                         (len(results_b) - 1) * np.var(results_b)) / 
                        (len(results_a) + len(results_b) - 2))
    cohens_d = (np.mean(results_a) - np.mean(results_b)) / pooled_std
    
    return {
        't_statistic': t_stat,
        'p_value': p_value,
        'significant': p_value < 0.05,
        'effect_size': cohens_d,
        'interpretation': interpret_effect_size(cohens_d)
    }
```

---

## 8. EXPERIMENT DRIVER DESIGN

### Modular Pipeline Architecture

```python
class ModularSemanticPipeline:
    """Configurable pipeline for ablation studies"""
    
    def __init__(self, enabled_modules: List[int] = [1,2,3,4,5]):
        self.enabled_modules = enabled_modules
        self.modules = {
            1: DocumentPreprocessingModule(),
            2: VocabularyExtractionModule(), 
            3: SemanticScoringModule(),
            4: SemanticOrganizationModule(),
            5: LearningOutputModule()
        }
        
        # Initialize only enabled modules
        self.active_modules = {
            module_id: module for module_id, module in self.modules.items()
            if module_id in enabled_modules
        }
    
    def process_document(self, document_file: str, **kwargs) -> PipelineResult:
        """Process document through enabled modules only"""
        
        result = PipelineResult()
        intermediate_data = {}
        
        # Module 1: Document Preprocessing (always required)
        if 1 in self.active_modules:
            structured_doc = self.active_modules[1].process(document_file)
            intermediate_data['structured_document'] = structured_doc
            result.add_stage_result('preprocessing', structured_doc)
        
        # Module 2: Vocabulary Extraction (always required)
        if 2 in self.active_modules:
            candidate_vocab = self.active_modules[2].process(
                intermediate_data['structured_document'], **kwargs
            )
            intermediate_data['candidate_vocabulary'] = candidate_vocab
            result.add_stage_result('extraction', candidate_vocab)
        
        # Module 3: Semantic Scoring (optional)
        if 3 in self.active_modules:
            scored_vocab = self.active_modules[3].process(
                intermediate_data['candidate_vocabulary'],
                intermediate_data['structured_document']
            )
            intermediate_data['vocabulary'] = scored_vocab.vocabulary
            result.add_stage_result('scoring', scored_vocab)
        else:
            # Use unscored vocabulary
            intermediate_data['vocabulary'] = (
                intermediate_data['candidate_vocabulary'].phrases +
                intermediate_data['candidate_vocabulary'].words
            )
        
        # Module 4: Semantic Organization (optional)
        if 4 in self.active_modules:
            organized_vocab = self.active_modules[4].process(
                intermediate_data['vocabulary']
            )
            intermediate_data['vocabulary'] = organized_vocab.get_all_items()
            result.add_stage_result('organization', organized_vocab)
        
        # Module 5: Learning Output (optional)
        if 5 in self.active_modules:
            learning_materials = self.active_modules[5].process(
                intermediate_data['vocabulary'],
                intermediate_data['structured_document'].title
            )
            result.add_stage_result('output', learning_materials)
        
        result.vocabulary = intermediate_data.get('vocabulary', [])
        return result

class AblationStudyRunner:
    """Orchestrates ablation study experiments"""
    
    CONFIGURATIONS = {
        'V1_Baseline': [1, 2, 5],
        'V2_Context': [1, 2, 5],  # Enhanced preprocessing
        'V3_Scoring': [1, 2, 3, 5],
        'V4_Topics': [1, 2, 4, 5], 
        'V5_Full': [1, 2, 3, 4, 5]
    }
    
    def __init__(self, dataset_path: str):
        self.dataset = self.load_dataset(dataset_path)
        
    def run_ablation_study(self, ground_truth: Dict) -> AblationResults:
        """Run complete ablation study across all configurations"""
        
        results = {}
        
        for config_name, enabled_modules in self.CONFIGURATIONS.items():
            print(f"\n{'='*60}")
            print(f"RUNNING CONFIGURATION: {config_name}")
            print(f"Enabled modules: {enabled_modules}")
            print(f"{'='*60}")
            
            # Create pipeline for this configuration
            pipeline = ModularSemanticPipeline(enabled_modules)
            
            config_results = []
            
            for document in self.dataset:
                start_time = time.time()
                
                # Process document
                result = pipeline.process_document(document.file_path)
                
                # Calculate metrics
                predicted_vocab = [item.text for item in result.vocabulary]
                metrics = calculate_metrics(
                    predicted=predicted_vocab,
                    ground_truth=ground_truth[document.id]
                )
                
                execution_time = time.time() - start_time
                
                config_results.append({
                    'document_id': document.id,
                    'metrics': metrics,
                    'latency': execution_time,
                    'vocabulary_count': len(predicted_vocab)
                })
                
                print(f"  Document {document.id}: F1={metrics['f1_score']:.3f}, "
                      f"Latency={execution_time:.1f}s")
            
            # Aggregate results
            aggregated = self.aggregate_results(config_results)
            results[config_name] = {
                'aggregated_metrics': aggregated,
                'individual_results': config_results
            }
            
            print(f"  AVERAGE: F1={aggregated['f1_score']:.3f}, "
                  f"Precision={aggregated['precision']:.3f}, "
                  f"Recall={aggregated['recall']:.3f}")
        
        return AblationResults(results)
    
    def generate_comparison_report(self, results: AblationResults) -> str:
        """Generate comprehensive comparison report"""
        
        report = []
        report.append("# ABLATION STUDY RESULTS\n")
        
        # Performance comparison table
        report.append("## Performance Comparison\n")
        report.append("| Configuration | Precision | Recall | F1-Score | Avg Latency |")
        report.append("|---------------|-----------|--------|----------|-------------|")
        
        for config_name, config_results in results.items():
            metrics = config_results['aggregated_metrics']
            report.append(f"| {config_name} | {metrics['precision']:.3f} | "
                         f"{metrics['recall']:.3f} | {metrics['f1_score']:.3f} | "
                         f"{metrics['avg_latency']:.1f}s |")
        
        # Statistical significance tests
        report.append("\n## Statistical Significance\n")
        baseline_f1 = results['V1_Baseline']['aggregated_metrics']['f1_score']
        
        for config_name, config_results in results.items():
            if config_name == 'V1_Baseline':
                continue
                
            current_f1 = config_results['aggregated_metrics']['f1_score']
            improvement = ((current_f1 - baseline_f1) / baseline_f1) * 100
            
            report.append(f"- **{config_name}**: {improvement:+.1f}% improvement over baseline")
        
        return '\n'.join(report)
```

This comprehensive redesign provides a scientifically rigorous framework for ablation studies while maintaining the practical functionality of the vocabulary extraction pipeline. The modular architecture enables systematic testing of each component's contribution to overall system performance.