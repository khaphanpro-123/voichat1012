# STAGE 4 – Ontology & Knowledge Graph Construction

## Overview

STAGE 4 transforms the vocabulary extraction results from previous stages into a structured knowledge graph. This enables semantic queries, relationship discovery, and prepares the foundation for Retrieval-Augmented Generation (RAG) in STAGE 5.

## Goals

1. **Define Ontology Schema**: Establish entity types and relationship types
2. **Build Knowledge Graph**: Transform flat data into interconnected graph structure
3. **Enable Semantic Queries**: Support complex queries about vocabulary, context, and relationships
4. **Maintain Traceability**: Every entity links back to source document
5. **Prepare for RAG**: Structure data for efficient retrieval and generation

## Architecture

### Entity Types

The ontology defines 7 core entity types:

1. **Document**: Source documents uploaded by users
   - Properties: title, content, source, upload_date, metadata

2. **Sentence**: Individual sentences from documents
   - Properties: text, position, has_verb, word_count, paragraph_id

3. **VocabularyTerm**: Extracted vocabulary words
   - Properties: word, pos_tag, lemma, frequency, tf_idf_score, final_score

4. **Concept**: Abstract concepts represented by terms
   - Properties: name, category, description, related_concepts

5. **Context**: Usage context for vocabulary terms
   - Properties: sentence_text, explanation, score, metadata

6. **User**: System users who provide feedback
   - Properties: user_id, name, learning_level, preferences

7. **Feedback**: User feedback on vocabulary extraction
   - Properties: action, timestamp, vocabulary_id, user_id

### Relationship Types

The ontology defines 8 relationship types:

1. **APPEARS_IN**: VocabularyTerm → Sentence
   - A term appears in a specific sentence

2. **BELONGS_TO**: Sentence → Document
   - A sentence belongs to a document

3. **HAS_CONTEXT**: VocabularyTerm → Context
   - A term has a usage context

4. **REPRESENTS**: VocabularyTerm → Concept
   - A term represents an abstract concept

5. **GIVEN_BY**: Feedback → User
   - Feedback was given by a user

6. **EVALUATES**: Feedback → VocabularyTerm
   - Feedback evaluates a vocabulary term

7. **EXTRACTED_FROM**: VocabularyTerm → Document
   - A term was extracted from a document

8. **RELATED_TO**: VocabularyTerm → VocabularyTerm
   - Terms are semantically related (co-occurrence)

## Implementation

### Core Classes

```python
from dataclasses import dataclass
from enum import Enum
from typing import Dict, List, Any, Optional

class EntityType(Enum):
    DOCUMENT = "Document"
    SENTENCE = "Sentence"
    VOCABULARY_TERM = "VocabularyTerm"
    CONCEPT = "Concept"
    CONTEXT = "Context"
    USER = "User"
    FEEDBACK = "Feedback"

class RelationType(Enum):
    APPEARS_IN = "appears_in"
    BELONGS_TO = "belongs_to"
    HAS_CONTEXT = "has_context"
    REPRESENTS = "represents"
    GIVEN_BY = "given_by"
    EVALUATES = "evaluates"
    EXTRACTED_FROM = "extracted_from"
    RELATED_TO = "related_to"

@dataclass
class Entity:
    entity_id: str
    entity_type: EntityType
    properties: Dict[str, Any]

@dataclass
class Relation:
    relation_id: str
    relation_type: RelationType
    source_id: str
    target_id: str
    properties: Dict[str, Any]
```

### Knowledge Graph Class

```python
class KnowledgeGraph:
    def __init__(self):
        self.entities: Dict[str, Entity] = {}
        self.relations: Dict[str, Relation] = {}
        self.entity_index: Dict[EntityType, List[str]] = {}
        self.relation_index: Dict[str, List[str]] = {}
    
    def add_entity(self, entity: Entity) -> bool
    def add_relation(self, relation: Relation) -> bool
    def get_entity(self, entity_id: str) -> Optional[Entity]
    def query_entities_by_type(self, entity_type: EntityType) -> List[Entity]
    def get_relations_by_source(self, source_id: str) -> List[Relation]
    def construct_from_stage2(self, stage2_output: Dict) -> Dict
    def query_by_document(self, document_id: str) -> Dict
    def query_by_term(self, word: str) -> Dict
    def query_related_terms(self, word: str) -> Dict
    def get_statistics(self) -> Dict
    def export_to_cypher(self) -> str
    def save_to_file(self, filepath: str) -> Dict
    def load_from_file(self, filepath: str) -> Dict
```

## Usage

### 1. Construct Graph from STAGE 2 Output

```python
from knowledge_graph import KnowledgeGraph

kg = KnowledgeGraph()

# STAGE 2 output format
stage2_output = {
    "document_id": "doc_001",
    "document_title": "Machine Learning Basics",
    "document_content": "Full document text...",
    "vocabulary_contexts": [
        {
            "word": "algorithm",
            "pos_tag": "NOUN",
            "lemma": "algorithm",
            "frequency": 5,
            "tf_idf_score": 0.85,
            "final_score": 0.82,
            "context_sentence": "An algorithm is a step-by-step procedure.",
            "sentence_id": "sent_001",
            "sentence_position": 0,
            "explanation": "High TF-IDF score, clear definition"
        }
    ]
}

# Build graph
result = kg.construct_from_stage2(stage2_output)
print(f"Created {result['entities_created']} entities")
print(f"Created {result['relations_created']} relations")
```

### 2. Query by Document

```python
# Get all vocabulary terms from a document
result = kg.query_by_document("doc_001")

for term in result["vocabulary_terms"]:
    print(f"Word: {term['word']}")
    print(f"Score: {term['final_score']}")
    print(f"Context: {term['context']}")
```

### 3. Query by Term

```python
# Get detailed information about a specific term
result = kg.query_by_term("algorithm")

print(f"Word: {result['word']}")
print(f"POS: {result['pos_tag']}")
print(f"Score: {result['final_score']}")
print(f"Contexts: {len(result['contexts'])}")

for context in result["contexts"]:
    print(f"  - {context['sentence']}")
```

### 4. Find Related Terms

```python
# Find terms related to a given term (co-occurrence)
result = kg.query_related_terms("algorithm")

for related in result["related_terms"]:
    print(f"{related['word']} (score: {related['final_score']})")
```

### 5. Get Graph Statistics

```python
stats = kg.get_statistics()

print(f"Total entities: {stats['total_entities']}")
print(f"Total relations: {stats['total_relations']}")
print(f"Entities by type: {stats['entities_by_type']}")
print(f"Relations by type: {stats['relations_by_type']}")
```

### 6. Export to Neo4j

```python
# Generate Cypher statements for Neo4j import
cypher = kg.export_to_cypher()

# Save to file
with open("import.cypher", "w") as f:
    f.write(cypher)
```

### 7. Persistence

```python
# Save graph to file
kg.save_to_file("knowledge_graph.json")

# Load graph from file
new_kg = KnowledgeGraph()
new_kg.load_from_file("knowledge_graph.json")
```

## API Endpoints

### 1. Construct Graph

```http
POST /api/kg/construct
Content-Type: application/json

{
  "stage2_output": { ... }
}
```

### 2. Query by Document

```http
GET /api/kg/query/document/{document_id}
```

### 3. Query by Term

```http
GET /api/kg/query/term/{word}
```

### 4. Query Related Terms

```http
GET /api/kg/query/related/{word}
```

### 5. Get Statistics

```http
GET /api/kg/statistics
```

### 6. Complete Pipeline (STAGE 1-4)

```http
POST /api/pipeline/complete
Content-Type: application/json

{
  "document_text": "Your document text here...",
  "document_title": "Document Title",
  "document_id": "doc_001"
}
```

## Data Flow

```
STAGE 1 (Ensemble Extraction)
    ↓
STAGE 2 (Context Intelligence)
    ↓
STAGE 4 (Knowledge Graph)
    ↓
{
  Document Entity
    ↓ BELONGS_TO
  Sentence Entities
    ↓ APPEARS_IN
  VocabularyTerm Entities
    ↓ HAS_CONTEXT
  Context Entities
}
```

## Traceability

Every entity maintains traceability to its source:

1. **VocabularyTerm** → APPEARS_IN → **Sentence**
2. **Sentence** → BELONGS_TO → **Document**
3. **VocabularyTerm** → EXTRACTED_FROM → **Document**

This ensures:
- No hallucinated data
- Verifiable sources
- Audit trail for all extractions

## Semantic Queries

The knowledge graph supports complex semantic queries:

### Query 1: All terms from a document
```python
kg.query_by_document("doc_001")
```

### Query 2: Term details with all contexts
```python
kg.query_by_term("algorithm")
```

### Query 3: Related terms (co-occurrence)
```python
kg.query_related_terms("algorithm")
```

### Query 4: Terms by concept
```python
kg.query_by_concept("Machine Learning")
```

### Query 5: Terms with high scores
```python
terms = kg.query_entities_by_type(EntityType.VOCABULARY_TERM)
high_score_terms = [t for t in terms if t.properties.get("final_score", 0) > 0.8]
```

## Integration with STAGE 3 (Feedback Loop)

The knowledge graph integrates with the feedback loop:

```python
# Add user feedback to graph
feedback = Feedback(
    entity_id="feedback_001",
    action="keep",
    timestamp="2026-02-02T10:00:00",
    vocabulary_id="term_algorithm",
    user_id="user_001"
)

kg.add_entity(feedback)

# Create relations
kg.add_relation(Relation(
    relation_id="rel_fb_001",
    relation_type=RelationType.EVALUATES,
    source_id="feedback_001",
    target_id="term_algorithm"
))

kg.add_relation(Relation(
    relation_id="rel_fb_002",
    relation_type=RelationType.GIVEN_BY,
    source_id="feedback_001",
    target_id="user_001"
))
```

## Preparation for STAGE 5 (RAG)

The knowledge graph structure is optimized for RAG:

1. **Efficient Retrieval**: Indexed entities and relations
2. **Context-Aware**: Each term has rich context
3. **Relationship Discovery**: Find related terms and concepts
4. **Semantic Search**: Query by meaning, not just keywords
5. **Explainable**: Every result traces back to source

## Testing

Run comprehensive tests:

```bash
cd python-api
python test_knowledge_graph.py
```

Test coverage:
- ✅ Entity creation and validation
- ✅ Relation creation and validation
- ✅ Graph construction from STAGE 2
- ✅ Semantic queries (document, term, related)
- ✅ Graph statistics and export
- ✅ Persistence (save/load)
- ✅ Complete pipeline integration
- ✅ Traceability verification

## Performance

- **Entity Creation**: O(1) insertion
- **Relation Creation**: O(1) insertion
- **Query by ID**: O(1) lookup
- **Query by Type**: O(n) where n = entities of that type
- **Query Relations**: O(m) where m = relations from source
- **Graph Construction**: O(n + m) where n = terms, m = sentences

## Constraints

1. **No Hallucination**: All data comes from source documents
2. **Deterministic**: Same input always produces same graph
3. **Explainable**: Every entity and relation has clear origin
4. **Traceable**: All entities link back to source
5. **Rule-Based**: No ML models, only transformations

## Future Enhancements

1. **Graph Embeddings**: Add vector representations for semantic similarity
2. **Temporal Relations**: Track how vocabulary usage changes over time
3. **User Modeling**: Build user knowledge graphs
4. **Concept Hierarchy**: Automatic concept taxonomy construction
5. **Cross-Document Relations**: Link related terms across documents

## Conclusion

STAGE 4 successfully transforms flat vocabulary data into a rich, interconnected knowledge graph. This structure enables:

- Semantic queries beyond keyword matching
- Relationship discovery between terms
- Context-aware vocabulary learning
- Foundation for RAG-based applications
- Explainable and traceable results

The knowledge graph is ready for STAGE 5 (RAG) integration.
