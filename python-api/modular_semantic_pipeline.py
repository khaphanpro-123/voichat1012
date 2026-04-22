from typing import List, Dict, Optional, Any
from dataclasses import dataclass, field
from datetime import datetime
import time
import numpy as np

# Import existing components
from heading_detector import HeadingDetector
from context_intelligence import build_sentences
from phrase_centric_extractor import PhraseCentricExtractor
from single_word_extractor_v2 import SingleWordExtractorV2
from new_pipeline_learned_scoring import NewPipelineLearnedScoring


@dataclass
class PipelineResult:
    """Container for pipeline execution results"""
    vocabulary: List[Dict] = field(default_factory=list)
    stage_results: Dict[str, Any] = field(default_factory=dict)
    execution_time: float = 0.0
    enabled_modules: List[int] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    def add_stage_result(self, stage_name: str, result: Any):
        """Add result from a pipeline stage"""
        self.stage_results[stage_name] = result


class DocumentPreprocessingModule:
    """Module 1: Document Preprocessing (Steps 1-3)"""
    
    def __init__(self):
        self.heading_detector = HeadingDetector()
    def process(self, document_text: str) -> Dict[str, Any]:
        print(f"[MODULE 1] Document Preprocessing...")
        
        # Step 1: Document Normalization
        normalized_text = self._normalize_text(document_text)
        
        # Step 2: Heading Detection
        headings = self.heading_detector.detect_headings(normalized_text)
        
        # Step 3: Context Intelligence
        sentences = build_sentences(normalized_text)
        context_map = self._build_context_map(sentences, headings)
        
        result = {
            'normalized_text': normalized_text,
            'sentences': sentences,
            'headings': headings,
            'context_map': context_map,
            'metadata': {
                'char_count': len(normalized_text),
                'sentence_count': len(sentences),
                'heading_count': len(headings)
            }
        }
        
        print(f"  ✓ Processed: {len(sentences)} sentences, {len(headings)} headings")
        return result
    
    def _normalize_text(self, text: str) -> str:
        """Normalize document text"""
        # Remove extra whitespace
        text = ' '.join(text.split())
        
        # Ensure UTF-8 encoding
        text = text.encode('utf-8', errors='ignore').decode('utf-8')
        
        return text
    
    def _build_context_map(self, sentences: List, headings: List[Dict]) -> Dict:
        """Build context mapping between sentences and headings"""
        context_map = {
            'sentence_to_heading': {},
            'heading_hierarchy': {},
            'sections': []
        }
        
        # Simple mapping: assign sentences to nearest preceding heading
        current_heading = None
        for sentence in sentences:
            # Find the most recent heading before this sentence
            for heading in reversed(headings):
                if heading.get('position', 0) <= sentence.position:
                    current_heading = heading.get('heading_id')
                    break
            
            if current_heading:
                context_map['sentence_to_heading'][sentence.sentence_id] = current_heading
        
        return context_map


class VocabularyExtractionModule:
    """Module 2: Vocabulary Extraction (Steps 4-5)"""
    
    def __init__(self):
        self.phrase_extractor = PhraseCentricExtractor()
        self.word_extractor = SingleWordExtractorV2()
        
    def process(self, structured_document: Dict, max_phrases: int = 30, max_words: int = 20) -> Dict:
        print(f"[MODULE 2] Vocabulary Extraction...")
        
        text = structured_document['normalized_text']
        headings = structured_document['headings']
        
        # Step 4: Phrase Extraction
        phrases = self.phrase_extractor.extract_vocabulary(
            text=text,
            max_phrases=max_phrases
        )
        
        # Step 5: Single Word Extraction
        words = self.word_extractor.extract_single_words(
            text=text,
            phrases=phrases,
            headings=headings,
            max_words=max_words
        )
        
        result = {
            'phrases': phrases,
            'words': words,
            'extraction_stats': {
                'phrase_count': len(phrases),
                'word_count': len(words),
                'total_candidates': len(phrases) + len(words)
            }
        }
        
        print(f"  ✓ Extracted: {len(phrases)} phrases, {len(words)} words")
        return result

class SemanticScoringModule:
    """Module 3: Semantic Scoring (Steps 6-8)"""
    
    def __init__(self):
        self.new_pipeline = NewPipelineLearnedScoring()
        
    def process(self, candidate_vocabulary: Dict, structured_document: Dict) -> Dict:
        print(f"[MODULE 3] Semantic Scoring...")
        
        phrases = candidate_vocabulary['phrases']
        words = candidate_vocabulary['words']
        text = structured_document['normalized_text']
        
        # Use new pipeline for advanced processing (steps 6-8)
        pipeline_result = self.new_pipeline.process(
            phrases=phrases,
            words=words,
            document_text=text,
            enabled_stages=[6, 7, 8]  # Independent scoring, merge, learned scoring
        )
        
        vocabulary = pipeline_result.get('vocabulary', [])
        
        result = {
            'vocabulary': vocabulary,
            'scoring_model': pipeline_result.get('scoring_model'),
            'merge_statistics': {
                'input_count': len(phrases) + len(words),
                'output_count': len(vocabulary),
                'merge_ratio': len(vocabulary) / (len(phrases) + len(words)) if (len(phrases) + len(words)) > 0 else 0
            }
        }
        
        print(f"  ✓ Scored and merged: {len(vocabulary)} items")
        return result


class SemanticOrganizationModule:
    """Module 4: Semantic Organization (Steps 9-10)"""
    
    def __init__(self, n_topics: int = 5):
        self.n_topics = n_topics
        
    def process(self, vocabulary_items: List[Dict]) -> Dict:
        print(f"[MODULE 4] Semantic Organization...")
        
        if len(vocabulary_items) < 3:
            print(f"    Too few items for clustering: {len(vocabulary_items)}")
            return {
                'topics': [],
                'vocabulary_with_topics': vocabulary_items,
                'cluster_model': None,
                'topic_statistics': {'cluster_count': 0}
            }
        
        # Step 9: Topic Modeling with K-means
        topics, cluster_model = self._perform_topic_modeling(vocabulary_items)
        
        # Step 10: Within-topic ranking
        organized_vocabulary = self._rank_within_topics(vocabulary_items, topics)
        
        result = {
            'topics': topics,
            'vocabulary_with_topics': organized_vocabulary,
            'cluster_model': cluster_model,
            'topic_statistics': {
                'cluster_count': len(topics),
                'avg_items_per_cluster': len(vocabulary_items) / len(topics) if topics else 0
            }
        }
        
        print(f"  ✓ Organized into {len(topics)} topics")
        return result
    
    def _perform_topic_modeling(self, vocabulary_items: List[Dict]) -> tuple:
        """Perform K-means clustering on vocabulary embeddings"""
        try:
            from sklearn.cluster import KMeans
            from sklearn.metrics.pairwise import cosine_similarity
            import numpy as np
            
            # Extract or generate embeddings
            embeddings = []
            items_with_embeddings = []
            
            for item in vocabulary_items:
                if 'embedding' in item and item['embedding'] is not None:
                    try:
                        embedding = np.array(item['embedding'])
                        if embedding.size > 0:  # Check if embedding is not empty
                            embeddings.append(embedding)
                            items_with_embeddings.append(item)
                    except (ValueError, TypeError):
                        continue
            
            if len(embeddings) < 3:
                print(f"    Not enough embeddings for clustering: {len(embeddings)}")
                return [], None
            
            # Determine optimal number of clusters (min 2, max n_topics)
            n_clusters = min(max(2, len(embeddings) // 3), self.n_topics)
            
            # Perform K-means clustering
            embeddings_array = np.vstack(embeddings)
            kmeans = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
            cluster_labels = kmeans.fit_predict(embeddings_array)
            
            # Assign cluster IDs to vocabulary items
            for item, cluster_id in zip(items_with_embeddings, cluster_labels):
                item['cluster_id'] = int(cluster_id)
                item['cluster_centroid'] = kmeans.cluster_centers_[cluster_id].tolist()
            
            # Create topic objects
            topics = []
            for i in range(n_clusters):
                cluster_items = [item for item, label in zip(items_with_embeddings, cluster_labels) if label == i]
                
                topic = {
                    'cluster_id': i,
                    'centroid': kmeans.cluster_centers_[i].tolist(),
                    'items': cluster_items,
                    'topic_label': f"Topic {i+1}",
                    'item_count': len(cluster_items)
                }
                topics.append(topic)
            
            return topics, kmeans
            
        except Exception as e:
            print(f"    Topic modeling failed: {e}")
            # Return empty topics but don't fail completely
            return [], None
    
    def _rank_within_topics(self, vocabulary_items: List[Dict], topics: List[Dict]) -> List[Dict]:
        """Rank items within each topic by centroid similarity"""
        from sklearn.metrics.pairwise import cosine_similarity
        import numpy as np
        
        organized_vocabulary = []
        
        for topic in topics:
            cluster_items = topic['items']
            centroid = np.array(topic['centroid']).reshape(1, -1)
            
            # Calculate similarities to centroid
            for item in cluster_items:
                if 'embedding' in item:
                    item_embedding = np.array(item['embedding']).reshape(1, -1)
                    similarity = cosine_similarity(item_embedding, centroid)[0][0]
                    item['centroid_similarity'] = float(similarity)
                    
                    # Assign semantic role based on similarity
                    if similarity >= 0.8:
                        item['semantic_role'] = 'core'
                    elif similarity >= 0.6:
                        item['semantic_role'] = 'umbrella'
                    else:
                        item['semantic_role'] = 'peripheral'
                else:
                    item['centroid_similarity'] = 0.5
                    item['semantic_role'] = 'unknown'
            
            # Sort by centroid similarity
            cluster_items.sort(key=lambda x: x.get('centroid_similarity', 0), reverse=True)
            
            # Assign cluster ranks
            for rank, item in enumerate(cluster_items):
                item['cluster_rank'] = rank + 1
            
            organized_vocabulary.extend(cluster_items)
        
        return organized_vocabulary
    
    def get_all_items(self) -> List[Dict]:
        """Get all vocabulary items (for compatibility)"""
        return self.vocabulary_with_topics if hasattr(self, 'vocabulary_with_topics') else []


class LearningOutputModule:
    """Module 5: Learning Output (Steps 11-12)"""
    
    def process(self, vocabulary_items: List[Dict], document_title: str = "Document") -> Dict:
        """
        Generate learning materials from vocabulary
        
        Args:
            vocabulary_items: Organized vocabulary items
            document_title: Title for context
            
        Returns:
            Learning materials with flashcards and knowledge graph
        """
        print(f"[MODULE 5] Learning Output...")
        
        # Step 11: Knowledge Graph Construction
        knowledge_graph = self._build_knowledge_graph(vocabulary_items)
        
        # Step 12: Enhanced Flashcard Generation
        flashcards = self._generate_flashcards(vocabulary_items, document_title)
        
        result = {
            'flashcards': flashcards,
            'knowledge_graph': knowledge_graph,
            'study_aids': {
                'vocabulary_count': len(vocabulary_items),
                'flashcard_count': len(flashcards),
                'topic_count': len(set(item.get('cluster_id', 0) for item in vocabulary_items))
            }
        }
        
        print(f"  ✓ Generated {len(flashcards)} flashcards and knowledge graph")
        return result
    
    def _build_knowledge_graph(self, vocabulary_items: List[Dict]) -> Dict:
        """Build knowledge graph with semantic relations"""
        entities = []
        relations = []
        
        # Group by clusters
        clusters = {}
        for item in vocabulary_items:
            cluster_id = item.get('cluster_id', 0)
            if cluster_id not in clusters:
                clusters[cluster_id] = []
            clusters[cluster_id].append(item)
        
        # Create cluster entities
        for cluster_id, items in clusters.items():
            entity = {
                'id': f'cluster_{cluster_id}',
                'type': 'topic',
                'label': f'Topic {cluster_id + 1}',
                'size': len(items)
            }
            entities.append(entity)
        
        # Create vocabulary entities and relations
        for item in vocabulary_items:
            word = item.get('phrase', item.get('word', ''))
            entity = {
                'id': f'word_{word.replace(" ", "_")}',
                'type': 'vocabulary',
                'label': word,
                'importance': item.get('importance_score', 0.5)
            }
            entities.append(entity)
            
            # Relation to cluster
            cluster_id = item.get('cluster_id', 0)
            relation = {
                'source': f'cluster_{cluster_id}',
                'target': entity['id'],
                'type': 'contains',
                'weight': item.get('centroid_similarity', 0.5)
            }
            relations.append(relation)
        
        return {
            'entities': entities,
            'relations': relations,
            'metadata': {
                'entity_count': len(entities),
                'relation_count': len(relations)
            }
        }
    
    def _generate_flashcards(self, vocabulary_items: List[Dict], document_title: str) -> List[Dict]:
        """Generate enhanced flashcards from vocabulary"""
        flashcards = []
        
        # Take top items (limit to 20 for performance)
        top_items = sorted(
            vocabulary_items,
            key=lambda x: x.get('importance_score', 0),
            reverse=True
        )[:20]
        
        for i, item in enumerate(top_items):
            word = item.get('phrase', item.get('word', ''))
            
            flashcard = {
                'id': f'fc_{i}',
                'word': word,
                'definition': f"Academic term from {document_title}",
                'example': item.get('supporting_sentence', '')[:200],
                'importance_score': item.get('importance_score', 0.5),
                'cluster_id': item.get('cluster_id', 0),
                'semantic_role': item.get('semantic_role', 'unknown'),
                'difficulty': self._estimate_difficulty(item.get('importance_score', 0.5))
            }
            flashcards.append(flashcard)
        
        return flashcards
    
    def _estimate_difficulty(self, importance_score: float) -> str:
        """Estimate difficulty based on importance score"""
        if importance_score >= 0.8:
            return 'advanced'
        elif importance_score >= 0.5:
            return 'intermediate'
        else:
            return 'beginner'


class ModularSemanticPipeline:
    def __init__(self, enabled_modules: List[int] = [1, 2, 3, 4, 5]):
        self.enabled_modules = enabled_modules
        
        # Initialize modules
        self.modules = {}
        if 1 in enabled_modules:
            self.modules[1] = DocumentPreprocessingModule()
        if 2 in enabled_modules:
            self.modules[2] = VocabularyExtractionModule()
        if 3 in enabled_modules:
            self.modules[3] = SemanticScoringModule()
        if 4 in enabled_modules:
            self.modules[4] = SemanticOrganizationModule()
        if 5 in enabled_modules:
            self.modules[5] = LearningOutputModule()
        
        print(f" Initialized Modular Pipeline with modules: {enabled_modules}")
    
    def process_document(
        self,
        document_text: str,
        document_title: str = "Document",
        max_phrases: int = 30,
        max_words: int = 20
    ) -> PipelineResult:
        start_time = time.time()
        result = PipelineResult(enabled_modules=self.enabled_modules)
        
        print(f"\n{'='*60}")
        print(f"MODULAR SEMANTIC PIPELINE")
        print(f"Document: {document_title}")
        print(f"Enabled modules: {self.enabled_modules}")
        print(f"{'='*60}")
        
        # Module 1: Document Preprocessing (required)
        if 1 not in self.modules:
            raise ValueError("Module 1 (Document Preprocessing) is required")
        
        structured_document = self.modules[1].process(document_text)
        result.add_stage_result('preprocessing', structured_document)
        
        # Module 2: Vocabulary Extraction (required)
        if 2 not in self.modules:
            raise ValueError("Module 2 (Vocabulary Extraction) is required")
        
        # Apply different extraction strategies based on configuration
        extraction_params = {
            'max_phrases': max_phrases,
            'max_words': max_words
        }
        
        # For TH1 (V1_Baseline): Reduce vocabulary count for basic extraction
        if self.enabled_modules == [1, 2]:
            extraction_params['max_phrases'] = max(10, max_phrases // 2)  # Reduce phrases
            extraction_params['max_words'] = max(8, max_words // 2)      # Reduce words
            print(f" TH1 Mode: Reduced extraction ({extraction_params['max_phrases']} phrases, {extraction_params['max_words']} words)")
        
        # For TH2 (V2_Context): Enhanced extraction with context
        elif self.enabled_modules == [1, 2, 5]:
            extraction_params['max_phrases'] = int(max_phrases * 0.8)    # Moderate increase
            extraction_params['max_words'] = int(max_words * 0.9)        # Moderate increase
            print(f" TH2 Mode: Context-enhanced extraction ({extraction_params['max_phrases']} phrases, {extraction_params['max_words']} words)")
        
        candidate_vocabulary = self.modules[2].process(
            structured_document, 
            extraction_params['max_phrases'], 
            extraction_params['max_words']
        )
        result.add_stage_result('extraction', candidate_vocabulary)
        
        # Initialize vocabulary items
        vocabulary_items = candidate_vocabulary['phrases'] + candidate_vocabulary['words']
        
        # Apply configuration-specific modifications
        if self.enabled_modules == [1, 2]:
            # TH1: Basic filtering - keep only high-frequency items
            vocabulary_items = [item for item in vocabulary_items if item.get('frequency', 1) >= 2][:15]
            print(f"   TH1: Applied basic filtering → {len(vocabulary_items)} items")
            
        elif self.enabled_modules == [1, 2, 5]:
            # TH2: Context enhancement - boost items with heading similarity
            for item in vocabulary_items:
                if 'heading_similarity' not in item:
                    item['heading_similarity'] = 0.1  # Default boost for TH2
                item['importance_score'] = item.get('importance_score', 0.5) + item['heading_similarity'] * 0.2
            vocabulary_items = vocabulary_items[:18]  # Limit for TH2
            print(f"   TH2: Applied context enhancement → {len(vocabulary_items)} items")
        
        # Module 3: Semantic Scoring (optional)
        if 3 in self.modules:
            scored_vocabulary = self.modules[3].process(candidate_vocabulary, structured_document)
            vocabulary_items = scored_vocabulary['vocabulary'][:22]  # Limit for TH3
            result.add_stage_result('scoring', scored_vocabulary)
            print(f"    TH3: Applied semantic scoring → {len(vocabulary_items)} items")
        
        # Module 4: Semantic Organization (optional)
        if 4 in self.modules:
            organized_vocabulary = self.modules[4].process(vocabulary_items)
            vocabulary_items = organized_vocabulary['vocabulary_with_topics'][:25]  # Limit for TH4
            result.add_stage_result('organization', organized_vocabulary)
            print(f"   TH4: Applied topic modeling → {len(vocabulary_items)} items")
        
        # Module 5: Learning Output (optional)
        if 5 in self.modules:
            learning_materials = self.modules[5].process(vocabulary_items, document_title)
            result.add_stage_result('output', learning_materials)
        
        # Set final vocabulary and metadata
        result.vocabulary = vocabulary_items
        result.execution_time = time.time() - start_time
        result.metadata = {
            'document_title': document_title,
            'vocabulary_count': len(vocabulary_items),
            'processing_time': result.execution_time,
            'enabled_modules': self.enabled_modules,
            'configuration_type': self._get_configuration_type()
        }
        
        print(f"\n{'='*60}")
        print(f"PIPELINE COMPLETE")
        print(f"Configuration: {self._get_configuration_type()}")
        print(f"Vocabulary items: {len(vocabulary_items)}")
        print(f"Execution time: {result.execution_time:.2f}s")
        print(f"{'='*60}\n")
        
        return result
    
    def _get_configuration_type(self) -> str:
        """Get configuration type based on enabled modules"""
        if self.enabled_modules == [1, 2]:
            return "TH1_Basic_Extraction"
        elif self.enabled_modules == [1, 2, 5]:
            return "TH2_Context_Enhanced"
        elif self.enabled_modules == [1, 2, 3, 5]:
            return "TH3_Semantic_Scoring"
        elif self.enabled_modules == [1, 2, 4, 5]:
            return "TH4_Topic_Modeling"
        elif self.enabled_modules == [1, 2, 3, 4, 5]:
            return "TH4_Full_System"
        else:
            return "Custom_Configuration"


# Configuration presets for ablation study
ABLATION_CONFIGURATIONS = {
    'V1_Baseline': {
        'name': 'TH1: Extraction Module',
        'modules': [1, 2],  # Only basic preprocessing and extraction
        'description': 'Cấu hình cơ bản - Bước 1,3,4,5 (Tiền xử lý + Trích xuất từ vựng)',
        'complexity': 'basic'
    },
    'V2_Context': {
        'name': 'TH2: + Structural Context',
        'modules': [1, 2, 5],  # Add learning output for context enhancement
        'description': 'TH1 + Phân tích cấu trúc tiêu đề và ánh xạ ngữ cảnh (Bước 2-3)',
        'complexity': 'structural_context',
        'enhanced_preprocessing': True  # Flag for enhanced preprocessing
    },
    'V3_Scoring': {
        'name': 'TH3: + Semantic Scoring',
        'modules': [1, 2, 3, 5],  # Add semantic scoring
        'description': 'TH2 + Chấm điểm ngữ nghĩa và hợp nhất từ vựng (Bước 6-8)',
        'complexity': 'semantic_scoring'
    },
    'V4_Topics': {
        'name': 'TH4: + Topic Modeling (Alternative)',
        'modules': [1, 2, 4, 5],  # Topic modeling without semantic scoring
        'description': 'TH2 + Phân cụm chủ đề không có semantic scoring',
        'complexity': 'topic_modeling'
    },
    'V5_Full': {
        'name': 'TH4: Full System',
        'modules': [1, 2, 3, 4, 5],  # Complete system
        'description': 'Hệ thống hoàn chỉnh với phân cụm chủ đề và xếp hạng (Bước 9-11)',
        'complexity': 'full_system'
    }
}


def create_pipeline_for_configuration(config_name: str) -> ModularSemanticPipeline:
    if config_name not in ABLATION_CONFIGURATIONS:
        raise ValueError(f"Unknown configuration: {config_name}")
    
    config = ABLATION_CONFIGURATIONS[config_name]
    return ModularSemanticPipeline(enabled_modules=config['modules'])