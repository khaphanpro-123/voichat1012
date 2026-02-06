"""
STAGE 4 – Ontology & Knowledge Graph Construction

Mục tiêu:
- Chuyển đổi tri thức từ STAGE 1-3 thành ontology-based knowledge graph
- Lưu trữ có cấu trúc, có ngữ nghĩa, có khả năng suy luận
- Tạo nền tảng cho RAG + truy vấn ngữ nghĩa (STAGE 5)

Pipeline:
1. Entity Identification (xác định thực thể)
2. Ontology Schema Design (thiết kế khung bản thể)
3. Create Individuals (tạo cá thể)
4. Build Knowledge Graph (xây dựng đồ thị)
5. Semantic Query (truy vấn ngữ nghĩa)
"""

import json
import os
from typing import List, Dict, Optional, Set, Tuple
from dataclasses import dataclass, asdict, field
from datetime import datetime
from collections import defaultdict
from enum import Enum

# ============================================================================
# BƯỚC 4.1 – XÁC ĐỊNH THỰC THỂ (ENTITY IDENTIFICATION)
# ============================================================================

class EntityType(Enum):
    """Các loại thực thể trong ontology"""
    DOCUMENT = "Document"
    SENTENCE = "Sentence"
    VOCABULARY_TERM = "VocabularyTerm"
    CONCEPT = "Concept"
    CONTEXT = "Context"
    USER = "User"
    FEEDBACK = "Feedback"


class RelationType(Enum):
    """Các loại quan hệ trong ontology"""
    APPEARS_IN = "appears_in"           # VocabularyTerm -> Sentence
    BELONGS_TO = "belongs_to"           # Sentence -> Document
    HAS_CONTEXT = "has_context"         # VocabularyTerm -> Context
    REPRESENTS = "represents"           # VocabularyTerm -> Concept
    GIVEN_BY = "given_by"               # Feedback -> User
    EVALUATES = "evaluates"             # Feedback -> VocabularyTerm
    EXTRACTED_FROM = "extracted_from"   # VocabularyTerm -> Document
    RELATED_TO = "related_to"           # Concept -> Concept


# ============================================================================
# BƯỚC 4.2 – THIẾT KẾ ONTOLOGY SCHEMA
# ============================================================================

@dataclass
class Entity:
    """Base class cho tất cả entities"""
    entity_id: str
    entity_type: EntityType
    properties: Dict[str, any] = field(default_factory=dict)
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())


@dataclass
class Relation:
    """Quan hệ giữa các entities"""
    relation_id: str
    relation_type: RelationType
    source_id: str
    target_id: str
    properties: Dict[str, any] = field(default_factory=dict)
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())


@dataclass
class DocumentEntity(Entity):
    """Thực thể Document"""
    def __init__(self, document_id: str, title: str, content: str, metadata: Dict = None):
        super().__init__(
            entity_id=document_id,
            entity_type=EntityType.DOCUMENT,
            properties={
                'title': title,
                'content': content,
                'word_count': len(content.split()),
                'metadata': metadata or {}
            }
        )


@dataclass
class SentenceEntity(Entity):
    """Thực thể Sentence"""
    def __init__(self, sentence_id: str, text: str, position: int, document_id: str):
        super().__init__(
            entity_id=sentence_id,
            entity_type=EntityType.SENTENCE,
            properties={
                'text': text,
                'position': position,
                'word_count': len(text.split()),
                'document_id': document_id
            }
        )


@dataclass
class VocabularyTermEntity(Entity):
    """Thực thể VocabularyTerm"""
    def __init__(
        self,
        term_id: str,
        word: str,
        score: float,
        features: Dict,
        context_sentence: str,
        sentence_id: str,
        document_id: str
    ):
        super().__init__(
            entity_id=term_id,
            entity_type=EntityType.VOCABULARY_TERM,
            properties={
                'word': word,
                'score': score,
                'features': features,
                'context_sentence': context_sentence,
                'sentence_id': sentence_id,
                'document_id': document_id
            }
        )


@dataclass
class ConceptEntity(Entity):
    """Thực thể Concept (khái niệm học thuật)"""
    def __init__(self, concept_id: str, name: str, definition: str, domain: str):
        super().__init__(
            entity_id=concept_id,
            entity_type=EntityType.CONCEPT,
            properties={
                'name': name,
                'definition': definition,
                'domain': domain
            }
        )


@dataclass
class FeedbackEntity(Entity):
    """Thực thể Feedback"""
    def __init__(
        self,
        feedback_id: str,
        user_id: str,
        term_id: str,
        action: str,
        timestamp: str
    ):
        super().__init__(
            entity_id=feedback_id,
            entity_type=EntityType.FEEDBACK,
            properties={
                'user_id': user_id,
                'term_id': term_id,
                'action': action,
                'timestamp': timestamp
            }
        )


# ============================================================================
# BƯỚC 4.3 & 4.4 – KNOWLEDGE GRAPH BUILDER
# ============================================================================

class KnowledgeGraph:
    """
    Knowledge Graph Manager
    
    Quản lý entities và relations trong memory-based graph
    (Có thể mở rộng sang Neo4j sau)
    """
    
    def __init__(self, storage_path: str = "knowledge_graph_data"):
        self.storage_path = storage_path
        os.makedirs(storage_path, exist_ok=True)
        
        # In-memory storage
        self.entities: Dict[str, Entity] = {}
        self.relations: List[Relation] = []
        
        # Indexes for fast lookup
        self.entities_by_type: Dict[EntityType, List[str]] = defaultdict(list)
        self.relations_by_type: Dict[RelationType, List[str]] = defaultdict(list)
        self.relations_by_source: Dict[str, List[str]] = defaultdict(list)
        self.relations_by_target: Dict[str, List[str]] = defaultdict(list)
        
        # Load existing data
        self._load_graph()
    
    # ========================================================================
    # Entity Management
    # ========================================================================
    
    def add_entity(self, entity: Entity) -> str:
        """Thêm entity vào graph"""
        self.entities[entity.entity_id] = entity
        self.entities_by_type[entity.entity_type].append(entity.entity_id)
        
        print(f"[KG] Added entity: {entity.entity_type.value} - {entity.entity_id}")
        return entity.entity_id
    
    def get_entity(self, entity_id: str) -> Optional[Entity]:
        """Lấy entity theo ID"""
        return self.entities.get(entity_id)
    
    def get_entities_by_type(self, entity_type: EntityType) -> List[Entity]:
        """Lấy tất cả entities của một type"""
        entity_ids = self.entities_by_type.get(entity_type, [])
        return [self.entities[eid] for eid in entity_ids if eid in self.entities]
    
    # ========================================================================
    # Relation Management
    # ========================================================================
    
    def add_relation(
        self,
        relation_type: RelationType,
        source_id: str,
        target_id: str,
        properties: Dict = None
    ) -> str:
        """Thêm relation vào graph"""
        # Verify entities exist
        if source_id not in self.entities:
            raise ValueError(f"Source entity not found: {source_id}")
        if target_id not in self.entities:
            raise ValueError(f"Target entity not found: {target_id}")
        
        relation_id = f"rel_{len(self.relations) + 1}"
        
        relation = Relation(
            relation_id=relation_id,
            relation_type=relation_type,
            source_id=source_id,
            target_id=target_id,
            properties=properties or {}
        )
        
        self.relations.append(relation)
        self.relations_by_type[relation_type].append(relation_id)
        self.relations_by_source[source_id].append(relation_id)
        self.relations_by_target[target_id].append(relation_id)
        
        print(f"[KG] Added relation: {source_id} -{relation_type.value}-> {target_id}")
        return relation_id
    
    def get_relations_by_source(self, source_id: str) -> List[Relation]:
        """Lấy tất cả relations từ một entity"""
        relation_ids = self.relations_by_source.get(source_id, [])
        return [r for r in self.relations if r.relation_id in relation_ids]
    
    def get_relations_by_target(self, target_id: str) -> List[Relation]:
        """Lấy tất cả relations đến một entity"""
        relation_ids = self.relations_by_target.get(target_id, [])
        return [r for r in self.relations if r.relation_id in relation_ids]
    
    def get_relations_by_type(self, relation_type: RelationType) -> List[Relation]:
        """Lấy tất cả relations của một type"""
        relation_ids = self.relations_by_type.get(relation_type, [])
        return [r for r in self.relations if r.relation_id in relation_ids]
    
    # ========================================================================
    # Graph Construction from STAGE 1-3 Data
    # ========================================================================
    
    def build_from_vocabulary_contexts(
        self,
        vocabulary_contexts: List[Dict],
        document_id: str,
        document_title: str,
        document_content: str
    ) -> Dict:
        """
        Xây dựng knowledge graph từ vocabulary contexts (STAGE 2 output)
        
        Args:
            vocabulary_contexts: Output từ STAGE 2
            document_id: ID tài liệu
            document_title: Tiêu đề tài liệu
            document_content: Nội dung tài liệu
        
        Returns:
            Statistics về graph đã tạo
        """
        print(f"[KG] Building graph for document: {document_id}")
        
        stats = {
            'entities_created': 0,
            'relations_created': 0,
            'vocabulary_terms': 0,
            'sentences': 0
        }
        
        # 1. Create Document entity
        doc_entity = DocumentEntity(
            document_id=document_id,
            title=document_title,
            content=document_content
        )
        self.add_entity(doc_entity)
        stats['entities_created'] += 1
        
        # Track created sentences to avoid duplicates
        created_sentences = set()
        
        # 2. Create VocabularyTerm, Sentence entities and relations
        for ctx in vocabulary_contexts:
            word = ctx['word']
            sentence_id = ctx.get('sentenceId', f"s_{len(created_sentences) + 1}")
            context_sentence = ctx.get('contextSentence', '').replace('<b>', '').replace('</b>', '')
            
            # Create VocabularyTerm entity
            term_id = f"term_{document_id}_{word.replace(' ', '_')}"
            term_entity = VocabularyTermEntity(
                term_id=term_id,
                word=word,
                score=ctx.get('finalScore', 0),
                features=ctx.get('features', {}),
                context_sentence=context_sentence,
                sentence_id=sentence_id,
                document_id=document_id
            )
            self.add_entity(term_entity)
            stats['entities_created'] += 1
            stats['vocabulary_terms'] += 1
            
            # Create Sentence entity (if not already created)
            if sentence_id not in created_sentences:
                sentence_entity = SentenceEntity(
                    sentence_id=sentence_id,
                    text=context_sentence,
                    position=len(created_sentences),
                    document_id=document_id
                )
                self.add_entity(sentence_entity)
                created_sentences.add(sentence_id)
                stats['entities_created'] += 1
                stats['sentences'] += 1
                
                # Relation: Sentence -> Document
                self.add_relation(
                    RelationType.BELONGS_TO,
                    sentence_id,
                    document_id
                )
                stats['relations_created'] += 1
            
            # Relation: VocabularyTerm -> Sentence
            self.add_relation(
                RelationType.APPEARS_IN,
                term_id,
                sentence_id
            )
            stats['relations_created'] += 1
            
            # Relation: VocabularyTerm -> Document
            self.add_relation(
                RelationType.EXTRACTED_FROM,
                term_id,
                document_id
            )
            stats['relations_created'] += 1
            
            # Relation: VocabularyTerm -> Context
            self.add_relation(
                RelationType.HAS_CONTEXT,
                term_id,
                sentence_id,
                properties={'context_score': ctx.get('sentenceScore', 0)}
            )
            stats['relations_created'] += 1
        
        print(f"[KG] Graph built: {stats}")
        return stats
    
    def add_feedback_to_graph(
        self,
        feedback_id: str,
        user_id: str,
        term_id: str,
        action: str,
        timestamp: str
    ):
        """Thêm feedback vào graph"""
        # Create Feedback entity
        feedback_entity = FeedbackEntity(
            feedback_id=feedback_id,
            user_id=user_id,
            term_id=term_id,
            action=action,
            timestamp=timestamp
        )
        self.add_entity(feedback_entity)
        
        # Relation: Feedback -> VocabularyTerm
        self.add_relation(
            RelationType.EVALUATES,
            feedback_id,
            term_id,
            properties={'action': action}
        )
        
        print(f"[KG] Added feedback: {feedback_id} evaluates {term_id} as {action}")
    
    # ========================================================================
    # BƯỚC 4.5 – SEMANTIC QUERY
    # ========================================================================
    
    def query_vocabulary_by_document(self, document_id: str) -> List[Entity]:
        """Truy vấn: Tất cả từ vựng trong một tài liệu"""
        vocab_terms = self.get_entities_by_type(EntityType.VOCABULARY_TERM)
        return [
            term for term in vocab_terms
            if term.properties.get('document_id') == document_id
        ]
    
    def query_vocabulary_by_concept(self, concept_name: str) -> List[Entity]:
        """Truy vấn: Từ vựng liên quan đến một concept"""
        # Find concept entity
        concepts = self.get_entities_by_type(EntityType.CONCEPT)
        concept = next((c for c in concepts if c.properties.get('name') == concept_name), None)
        
        if not concept:
            return []
        
        # Find vocabulary terms that represent this concept
        represents_relations = self.get_relations_by_type(RelationType.REPRESENTS)
        term_ids = [
            r.source_id for r in represents_relations
            if r.target_id == concept.entity_id
        ]
        
        return [self.get_entity(tid) for tid in term_ids if tid in self.entities]
    
    def query_context_for_term(self, term_id: str) -> Optional[Entity]:
        """Truy vấn: Ngữ cảnh của một từ vựng"""
        # Find HAS_CONTEXT relation
        relations = self.get_relations_by_source(term_id)
        context_relation = next(
            (r for r in relations if r.relation_type == RelationType.HAS_CONTEXT),
            None
        )
        
        if not context_relation:
            return None
        
        return self.get_entity(context_relation.target_id)
    
    def query_feedback_for_term(self, term_id: str) -> List[Entity]:
        """Truy vấn: Tất cả feedback cho một từ vựng"""
        # Find EVALUATES relations pointing to this term
        relations = self.get_relations_by_target(term_id)
        feedback_relations = [
            r for r in relations
            if r.relation_type == RelationType.EVALUATES
        ]
        
        return [self.get_entity(r.source_id) for r in feedback_relations]
    
    def query_related_terms(self, term_id: str, max_depth: int = 2) -> List[Entity]:
        """
        Truy vấn: Từ vựng liên quan (cùng document, cùng sentence)
        
        Args:
            term_id: ID của từ vựng
            max_depth: Độ sâu tìm kiếm
        
        Returns:
            Danh sách từ vựng liên quan
        """
        term = self.get_entity(term_id)
        if not term:
            return []
        
        related_terms = set()
        
        # Find terms in same document
        document_id = term.properties.get('document_id')
        if document_id:
            doc_terms = self.query_vocabulary_by_document(document_id)
            related_terms.update(t.entity_id for t in doc_terms if t.entity_id != term_id)
        
        return [self.get_entity(tid) for tid in related_terms if tid in self.entities]
    
    # ========================================================================
    # Graph Statistics & Visualization
    # ========================================================================
    
    def get_statistics(self) -> Dict:
        """Lấy thống kê về graph"""
        stats = {
            'total_entities': len(self.entities),
            'total_relations': len(self.relations),
            'entities_by_type': {},
            'relations_by_type': {}
        }
        
        # Count entities by type
        for entity_type in EntityType:
            count = len(self.entities_by_type.get(entity_type, []))
            stats['entities_by_type'][entity_type.value] = count
        
        # Count relations by type
        for relation_type in RelationType:
            count = len(self.relations_by_type.get(relation_type, []))
            stats['relations_by_type'][relation_type.value] = count
        
        return stats
    
    def export_to_cypher(self, output_file: str = "graph_cypher.txt"):
        """Export graph to Cypher queries (for Neo4j)"""
        cypher_queries = []
        
        # Create nodes
        for entity in self.entities.values():
            props = json.dumps(entity.properties)
            query = f"CREATE (:{entity.entity_type.value} {{id: '{entity.entity_id}', properties: {props}}})"
            cypher_queries.append(query)
        
        # Create relationships
        for relation in self.relations:
            props = json.dumps(relation.properties)
            query = (
                f"MATCH (a {{id: '{relation.source_id}'}}), (b {{id: '{relation.target_id}'}}) "
                f"CREATE (a)-[:{relation.relation_type.value} {{properties: {props}}}]->(b)"
            )
            cypher_queries.append(query)
        
        # Save to file
        filepath = os.path.join(self.storage_path, output_file)
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write('\n'.join(cypher_queries))
        
        print(f"[KG] Exported {len(cypher_queries)} Cypher queries to {filepath}")
        return filepath
    
    # ========================================================================
    # Persistence
    # ========================================================================
    
    def save_graph(self):
        """Lưu graph vào file"""
        # Save entities
        entities_file = os.path.join(self.storage_path, "entities.json")
        with open(entities_file, 'w', encoding='utf-8') as f:
            entities_data = {
                eid: {
                    'entity_id': e.entity_id,
                    'entity_type': e.entity_type.value,
                    'properties': e.properties,
                    'created_at': e.created_at
                }
                for eid, e in self.entities.items()
            }
            json.dump(entities_data, f, ensure_ascii=False, indent=2)
        
        # Save relations
        relations_file = os.path.join(self.storage_path, "relations.json")
        with open(relations_file, 'w', encoding='utf-8') as f:
            relations_data = [
                {
                    'relation_id': r.relation_id,
                    'relation_type': r.relation_type.value,
                    'source_id': r.source_id,
                    'target_id': r.target_id,
                    'properties': r.properties,
                    'created_at': r.created_at
                }
                for r in self.relations
            ]
            json.dump(relations_data, f, ensure_ascii=False, indent=2)
        
        print(f"[KG] Graph saved to {self.storage_path}")
    
    def _load_graph(self):
        """Load graph từ file"""
        # Load entities
        entities_file = os.path.join(self.storage_path, "entities.json")
        if os.path.exists(entities_file):
            with open(entities_file, 'r', encoding='utf-8') as f:
                entities_data = json.load(f)
                
                for eid, data in entities_data.items():
                    entity = Entity(
                        entity_id=data['entity_id'],
                        entity_type=EntityType(data['entity_type']),
                        properties=data['properties'],
                        created_at=data['created_at']
                    )
                    self.entities[eid] = entity
                    self.entities_by_type[entity.entity_type].append(eid)
        
        # Load relations
        relations_file = os.path.join(self.storage_path, "relations.json")
        if os.path.exists(relations_file):
            with open(relations_file, 'r', encoding='utf-8') as f:
                relations_data = json.load(f)
                
                for data in relations_data:
                    relation = Relation(
                        relation_id=data['relation_id'],
                        relation_type=RelationType(data['relation_type']),
                        source_id=data['source_id'],
                        target_id=data['target_id'],
                        properties=data['properties'],
                        created_at=data['created_at']
                    )
                    self.relations.append(relation)
                    self.relations_by_type[relation.relation_type].append(relation.relation_id)
                    self.relations_by_source[relation.source_id].append(relation.relation_id)
                    self.relations_by_target[relation.target_id].append(relation.relation_id)
        
        if self.entities:
            print(f"[KG] Loaded {len(self.entities)} entities and {len(self.relations)} relations")


# ============================================================================
# TESTING
# ============================================================================

if __name__ == "__main__":
    print("=" * 80)
    print("TESTING STAGE 4 - Knowledge Graph Construction")
    print("=" * 80)
    
    # Initialize KG
    kg = KnowledgeGraph(storage_path="test_kg_data")
    
    # Test data from STAGE 2
    test_contexts = [
        {
            'word': 'ontology',
            'finalScore': 0.85,
            'contextSentence': '<b>Ontology</b> is a formal representation of knowledge.',
            'sentenceId': 's1',
            'sentenceScore': 0.82,
            'features': {'tfidf': 0.9, 'frequency': 0.3}
        },
        {
            'word': 'semantic',
            'finalScore': 0.80,
            'contextSentence': '<b>Semantic</b> web uses ontology for data integration.',
            'sentenceId': 's2',
            'sentenceScore': 0.78,
            'features': {'tfidf': 0.85, 'frequency': 0.35}
        }
    ]
    
    # Build graph
    stats = kg.build_from_vocabulary_contexts(
        vocabulary_contexts=test_contexts,
        document_id='doc_test_01',
        document_title='Test Document',
        document_content='Ontology is a formal representation...'
    )
    
    print(f"\n✅ Graph built: {stats}")
    
    # Query tests
    print("\n📊 QUERY TESTS:")
    print("-" * 80)
    
    # Query 1: All vocabulary in document
    vocab_terms = kg.query_vocabulary_by_document('doc_test_01')
    print(f"\n1. Vocabulary in document: {len(vocab_terms)} terms")
    for term in vocab_terms:
        print(f"   - {term.properties['word']}")
    
    # Query 2: Context for term
    term_id = 'term_doc_test_01_ontology'
    context = kg.query_context_for_term(term_id)
    if context:
        print(f"\n2. Context for 'ontology': {context.properties['text'][:50]}...")
    
    # Get statistics
    print("\n📈 GRAPH STATISTICS:")
    print("-" * 80)
    graph_stats = kg.get_statistics()
    print(json.dumps(graph_stats, indent=2))
    
    # Save graph
    kg.save_graph()
    
    # Export to Cypher
    kg.export_to_cypher()
    
    print("\n✅ Test completed!")
