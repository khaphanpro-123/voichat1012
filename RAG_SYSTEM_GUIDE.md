# HƯỚNG DẪN HỆ THỐNG RAG (Retrieval-Augmented Generation)

## TỔNG QUAN

RAG System là **STAGE 5** trong pipeline, kết hợp Knowledge Graph với LLM để tạo sinh nội dung học tập có độ chính xác cao, tránh hallucination.

### Mục tiêu chính:
- ✅ Tạo flashcards tự động từ từ vựng đã trích xuất
- ✅ Giải thích thuật ngữ dựa trên ngữ cảnh thực tế
- ✅ Tìm từ vựng liên quan và ví dụ sử dụng
- ✅ Đảm bảo traceability (truy vết nguồn gốc)
- ✅ Giảm hallucination bằng cách chỉ dùng tri thức đã truy xuất

---

## KIẾN TRÚC RAG SYSTEM

```
┌─────────────────────────────────────────────────────────────┐
│                      RAG PIPELINE                            │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. QUERY UNDERSTANDING                                      │
│     ↓                                                        │
│     Parse user query → Intent + Constraints                 │
│                                                              │
│  2. KNOWLEDGE RETRIEVAL                                      │
│     ↓                                                        │
│     Query Knowledge Graph → Retrieved Contexts              │
│                                                              │
│  3. CONTEXT PACKAGING                                        │
│     ↓                                                        │
│     Structure contexts → LLM-ready format                   │
│                                                              │
│  4. LLM GENERATION                                           │
│     ↓                                                        │
│     Generate content (GPT-4) → Flashcards/Explanations     │
│                                                              │
│  5. TRACEABILITY                                             │
│     ↓                                                        │
│     Add metadata → Source tracking                          │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## STAGE 5.1: QUERY UNDERSTANDING

### QueryParser Class

**Mục đích**: Phân tích query của người dùng thành structured intent

#### Các loại Intent:

```python
class QueryIntent(Enum):
    GENERATE_FLASHCARD = "generate_flashcard"
    EXPLAIN_TERM = "explain_term"
    FIND_EXAMPLES = "find_examples"
    FIND_RELATED = "find_related"
    SUMMARIZE_DOCUMENT = "summarize_document"
    COMPARE_TERMS = "compare_terms"
```

#### Intent Detection (Rule-based)

**Keywords mapping**:
```python
intent_keywords = {
    GENERATE_FLASHCARD: ['flashcard', 'thẻ từ', 'card', 'học từ'],
    EXPLAIN_TERM: ['giải thích', 'explain', 'nghĩa', 'meaning'],
    FIND_EXAMPLES: ['ví dụ', 'example', 'minh họa'],
    FIND_RELATED: ['liên quan', 'related', 'tương tự'],
    SUMMARIZE_DOCUMENT: ['tóm tắt', 'summarize', 'summary'],
    COMPARE_TERMS: ['so sánh', 'compare', 'khác nhau']
}
```

#### ParsedQuery Structure

```python
@dataclass
class ParsedQuery:
    intent: QueryIntent              # Ý định người dùng
    target_entity: str               # VocabularyTerm, Document, Concept
    constraints: Dict[str, Any]      # Điều kiện lọc
    parameters: Dict[str, Any]       # Tham số bổ sung
```

**Example**:
```python
# Input query
query = "Generate flashcards for document doc_123"
context = {'document_id': 'doc_123'}

# Parsed result
ParsedQuery(
    intent=QueryIntent.GENERATE_FLASHCARD,
    target_entity='VocabularyTerm',
    constraints={'document_id': 'doc_123'},
    parameters={'language': 'en', 'max_results': 10}
)
```

---

## STAGE 5.2: KNOWLEDGE RETRIEVAL

### KnowledgeRetriever Class

**Mục đích**: Truy xuất tri thức từ Knowledge Graph dựa trên parsed query

#### Retrieval Methods

**1. Retrieve for Flashcard**
```python
def _retrieve_for_flashcard(query: ParsedQuery) -> List[RetrievedContext]:
    # Query vocabulary terms from document
    vocab_terms = kg.query_vocabulary_by_document(document_id)
    
    # Build full context for each term
    for term in vocab_terms:
        context = _build_context_for_term(term)
        contexts.append(context)
    
    return contexts[:max_results]
```

**2. Retrieve for Explanation**
```python
def _retrieve_for_explanation(query: ParsedQuery) -> List[RetrievedContext]:
    # Find specific word
    matching_terms = [t for t in all_terms if t.word == query.word]
    
    # Build context with sentence, document, related terms
    return [_build_context_for_term(term) for term in matching_terms]
```

**3. Retrieve Related Terms**
```python
def _retrieve_related_terms(query: ParsedQuery) -> List[RetrievedContext]:
    # Find term entity
    term = find_term_by_word(query.word)
    
    # Query related terms from Knowledge Graph
    related = kg.query_related_terms(term.entity_id)
    
    return [_build_context_for_term(rt) for rt in related]
```

#### RetrievedContext Structure

```python
@dataclass
class RetrievedContext:
    vocabulary_term: Dict      # {term_id, word, score, features}
    context_sentence: Dict     # {sentence_id, text, position}
    source_document: Dict      # {document_id, title, content_preview}
    related_terms: List[Dict]  # [{word, score}, ...]
    metadata: Dict             # {retrieval_timestamp, method, confidence}
```

**Example**:
```python
RetrievedContext(
    vocabulary_term={
        'term_id': 'term_doc_123_ontology',
        'word': 'ontology',
        'score': 0.85,
        'features': {'tfidf': 0.9, 'frequency': 0.3}
    },
    context_sentence={
        'sentence_id': 's1',
        'text': 'Ontology is a formal representation of knowledge.',
        'position': 0
    },
    source_document={
        'document_id': 'doc_123',
        'title': 'Introduction to Semantic Web',
        'content_preview': 'Ontology is a formal...'
    },
    related_terms=[
        {'word': 'semantic', 'score': 0.80},
        {'word': 'knowledge graph', 'score': 0.75}
    ],
    metadata={
        'retrieval_timestamp': '2026-02-05T12:34:56',
        'retrieval_method': 'knowledge_graph',
        'confidence': 0.85
    }
)
```

#### Build Context for Term

**Quy trình**:
```python
def _build_context_for_term(term_entity) -> RetrievedContext:
    # 1. Get term properties
    term_data = extract_term_properties(term_entity)
    
    # 2. Get context sentence (via sentence_id)
    sentence_entity = kg.get_entity(term.sentence_id)
    sentence_data = extract_sentence_properties(sentence_entity)
    
    # 3. Get source document (via document_id)
    document_entity = kg.get_entity(term.document_id)
    document_data = extract_document_properties(document_entity)
    
    # 4. Get related terms (via graph traversal)
    related_terms = kg.query_related_terms(term.entity_id, max_depth=1)
    related_data = [extract_term_properties(rt) for rt in related_terms[:5]]
    
    # 5. Add metadata
    metadata = {
        'retrieval_timestamp': now(),
        'retrieval_method': 'knowledge_graph',
        'confidence': term.score
    }
    
    return RetrievedContext(...)
```

---

## STAGE 5.3: CONTEXT PACKAGING

### ContextPackager Class

**Mục đích**: Đóng gói retrieved contexts thành format chuẩn cho LLM

#### Package for Flashcard

```python
def package_for_flashcard(contexts: List[RetrievedContext]) -> List[Dict]:
    packaged = []
    
    for ctx in contexts:
        package = {
            # Core content
            'word': ctx.vocabulary_term['word'],
            'context_sentence': ctx.context_sentence['text'],
            'source_document': ctx.source_document['title'],
            'related_words': [rt['word'] for rt in ctx.related_terms],
            
            # Scoring
            'score': ctx.vocabulary_term['score'],
            'features': ctx.vocabulary_term['features'],
            
            # Traceability metadata
            'metadata': {
                'term_id': ctx.vocabulary_term['term_id'],
                'sentence_id': ctx.context_sentence['sentence_id'],
                'document_id': ctx.source_document['document_id'],
                'retrieval_timestamp': ctx.metadata['retrieval_timestamp']
            }
        }
        packaged.append(package)
    
    return packaged
```

**Example Output**:
```json
{
  "word": "ontology",
  "context_sentence": "Ontology is a formal representation of knowledge.",
  "source_document": "Introduction to Semantic Web",
  "related_words": ["semantic", "knowledge graph", "RDF"],
  "score": 0.85,
  "features": {
    "tfidf": 0.9,
    "frequency": 0.3,
    "rake": 0.7,
    "yake": 0.6
  },
  "metadata": {
    "term_id": "term_doc_123_ontology",
    "sentence_id": "s1",
    "document_id": "doc_123",
    "retrieval_timestamp": "2026-02-05T12:34:56"
  }
}
```

---

## STAGE 5.4: LLM GENERATION

### LLMGenerator Class

**Mục đích**: Tạo sinh nội dung học tập bằng LLM (GPT-4)

#### Configuration

```python
class LLMGenerator:
    def __init__(self, api_key: str, model: str = "gpt-4"):
        self.api_key = api_key
        self.model = model
        self.client = OpenAI(api_key=api_key)
```

#### Generate Flashcard

**Prompt Template**:
```python
def _build_flashcard_prompt(context: Dict) -> str:
    return f"""Generate a vocabulary flashcard based on this context:

Word: {context['word']}
Context Sentence: {context['context_sentence']}
Source: {context['source_document']}
Related Words: {', '.join(context['related_words'][:3])}

Output format (JSON):
{{
  "term": "the word",
  "meaning": "concise academic definition",
  "example": "example sentence using the word",
  "notes": "brief usage notes"
}}

Rules:
- Use ONLY information from the context
- Keep meaning concise (1-2 sentences)
- Example should be academic/formal
- Do NOT add external knowledge"""
```

**LLM Call**:
```python
def generate_flashcard(context: Dict) -> Dict:
    prompt = _build_flashcard_prompt(context)
    
    response = client.chat.completions.create(
        model="gpt-4",
        messages=[
            {
                "role": "system",
                "content": "You are an academic language learning assistant. "
                          "Generate flashcards using ONLY the provided context. "
                          "Do NOT add external knowledge."
            },
            {
                "role": "user",
                "content": prompt
            }
        ],
        temperature=0.3,  # Low temperature for consistency
        max_tokens=300
    )
    
    content = response.choices[0].message.content
    flashcard = parse_flashcard_response(content, context)
    
    return flashcard
```

**Output Example**:
```json
{
  "term": "ontology",
  "meaning": "A formal representation of knowledge within a domain, defining concepts, properties, and relationships between entities.",
  "example": "The semantic web relies on ontology to enable machines to understand and process information.",
  "notes": "Related to: semantic, knowledge graph, RDF. Commonly used in AI and information systems.",
  "metadata": {
    "term_id": "term_doc_123_ontology",
    "sentence_id": "s1",
    "document_id": "doc_123",
    "retrieval_timestamp": "2026-02-05T12:34:56"
  },
  "source": "Introduction to Semantic Web"
}
```

#### Generate Explanation

**Prompt Template**:
```python
def _build_explanation_prompt(context: Dict) -> str:
    return f"""Explain this term based on the provided context:

Term: {context['word']}
Context: {context['context_sentence']}
Source: {context['source_document']}

Provide a clear, academic explanation (2-3 sentences) using ONLY the context provided."""
```

**Output Example**:
```json
{
  "word": "ontology",
  "explanation": "Ontology is a formal representation of knowledge that defines concepts, properties, and relationships within a specific domain. In the context of semantic web and information systems, ontologies enable machines to understand and process structured information by providing a shared vocabulary and logical framework.",
  "source": "Introduction to Semantic Web",
  "metadata": {
    "term_id": "term_doc_123_ontology",
    "retrieval_timestamp": "2026-02-05T12:34:56"
  }
}
```

#### Generate Examples

**Prompt Template**:
```python
def _build_examples_prompt(context: Dict, count: int) -> str:
    return f"""Generate {count} example sentences for this word:

Word: {context['word']}
Original Context: {context['context_sentence']}

Generate {count} NEW example sentences that:
- Use the word in similar academic contexts
- Maintain the same meaning as shown in the original context
- Are clear and educational

Output one example per line."""
```

**Output Example**:
```json
{
  "word": "ontology",
  "examples": [
    "The medical ontology provides a standardized framework for representing diseases and treatments.",
    "Researchers developed an ontology to model the relationships between different biological entities.",
    "The ontology-based approach enables better data integration across heterogeneous systems."
  ],
  "metadata": {
    "term_id": "term_doc_123_ontology"
  }
}
```

#### Fallback Mechanism

**Khi LLM không khả dụng**:
```python
def _fallback_flashcard(context: Dict) -> Dict:
    return {
        'term': context['word'],
        'meaning': f"Academic term from {context['source_document']}",
        'example': context['context_sentence'],
        'notes': f"Related: {', '.join(context['related_words'][:3])}",
        'metadata': context['metadata'],
        'source': context['source_document'],
        'generation_method': 'fallback'
    }
```

---

## STAGE 5.5: COMPLETE RAG PIPELINE

### RAGSystem Class

**Main orchestrator** kết hợp tất cả components

#### Initialization

```python
class RAGSystem:
    def __init__(
        self,
        knowledge_graph: KnowledgeGraph,
        llm_api_key: str = None,
        llm_model: str = "gpt-4"
    ):
        self.kg = knowledge_graph
        self.query_parser = QueryParser()
        self.retriever = KnowledgeRetriever(knowledge_graph)
        self.packager = ContextPackager()
        self.generator = LLMGenerator(llm_api_key, llm_model)
```

#### Process Query (Complete Pipeline)

```python
def process_query(query: str, context: Dict = None) -> Dict:
    # Step 1: Parse query
    parsed_query = query_parser.parse(query, context)
    
    # Step 2: Retrieve from Knowledge Graph
    retrieved_contexts = retriever.retrieve(parsed_query)
    
    # Step 3: Package contexts
    packaged = packager.package_for_flashcard(retrieved_contexts)
    
    # Step 4: Generate with LLM
    results = []
    for pkg in packaged:
        result = generator.generate_flashcard(pkg)
        results.append(result)
    
    # Step 5: Return with traceability
    return {
        'success': True,
        'query': query,
        'intent': parsed_query.intent.value,
        'results': results,
        'count': len(results),
        'pipeline': 'Query → Retrieve → Package → Generate → Trace',
        'timestamp': datetime.now().isoformat()
    }
```

#### Convenience Methods

**1. Generate Flashcards**
```python
def generate_flashcards(
    document_id: str = None,
    word: str = None,
    max_cards: int = 10
) -> Dict:
    context = {}
    if document_id:
        context['document_id'] = document_id
    if word:
        context['word'] = word
    context['max_results'] = max_cards
    
    query = "Generate flashcards"
    return process_query(query, context)
```

**2. Explain Term**
```python
def explain_term(word: str, document_id: str = None) -> Dict:
    context = {'word': word}
    if document_id:
        context['document_id'] = document_id
    
    query = f"Explain the term {word}"
    return process_query(query, context)
```

**3. Find Related Terms**
```python
def find_related_terms(word: str, max_terms: int = 5) -> Dict:
    context = {
        'word': word,
        'max_results': max_terms
    }
    
    query = f"Find terms related to {word}"
    return process_query(query, context)
```

---

## API ENDPOINTS

### 1. Generate Flashcards

**Endpoint**: `POST /api/rag/generate-flashcards`

**Request**:
```json
{
  "document_id": "doc_20260205_123456",
  "word": "ontology",
  "max_cards": 10
}
```

**Response**:
```json
{
  "success": true,
  "results": [
    {
      "term": "ontology",
      "meaning": "A formal representation of knowledge...",
      "example": "The semantic web uses ontology...",
      "notes": "Related to: semantic, knowledge graph",
      "metadata": {
        "term_id": "term_doc_123_ontology",
        "sentence_id": "s1",
        "document_id": "doc_123"
      },
      "source": "Introduction to Semantic Web"
    }
  ],
  "count": 10,
  "pipeline": "Query → Retrieve → Package → Generate → Trace"
}
```

### 2. Explain Term

**Endpoint**: `POST /api/rag/explain-term`

**Request**:
```json
{
  "word": "ontology",
  "document_id": "doc_20260205_123456"
}
```

**Response**:
```json
{
  "success": true,
  "results": [
    {
      "word": "ontology",
      "explanation": "Ontology is a formal representation...",
      "source": "Introduction to Semantic Web",
      "metadata": {
        "term_id": "term_doc_123_ontology"
      }
    }
  ]
}
```

### 3. Find Related Terms

**Endpoint**: `POST /api/rag/find-related`

**Request**:
```json
{
  "word": "ontology",
  "max_terms": 5
}
```

**Response**:
```json
{
  "success": true,
  "results": [
    {
      "word": "semantic",
      "score": 0.80,
      "context": "Semantic web technologies...",
      "metadata": {...}
    },
    {
      "word": "knowledge graph",
      "score": 0.75,
      "context": "Knowledge graphs are built...",
      "metadata": {...}
    }
  ],
  "count": 5
}
```

### 4. Custom RAG Query

**Endpoint**: `POST /api/rag/query`

**Request**:
```json
{
  "query": "Generate flashcards for machine learning terms",
  "context": {
    "document_id": "doc_123",
    "max_results": 10
  }
}
```

**Response**:
```json
{
  "success": true,
  "query": "Generate flashcards for machine learning terms",
  "intent": "generate_flashcard",
  "results": [...],
  "count": 10,
  "pipeline": "Query → Retrieve → Package → Generate → Trace",
  "timestamp": "2026-02-05T12:34:56"
}
```

---

## TRACEABILITY & METADATA

### Metadata Structure

Mỗi kết quả RAG đều có metadata đầy đủ để truy vết:

```json
{
  "metadata": {
    "term_id": "term_doc_123_ontology",
    "sentence_id": "s1",
    "document_id": "doc_123",
    "retrieval_timestamp": "2026-02-05T12:34:56",
    "retrieval_method": "knowledge_graph",
    "confidence": 0.85,
    "generation_method": "gpt-4"
  }
}
```

### Traceability Benefits

1. **Source Tracking**: Biết từ vựng đến từ document nào, câu nào
2. **Quality Control**: Có thể kiểm tra lại ngữ cảnh gốc
3. **Debugging**: Dễ dàng debug khi có vấn đề
4. **Audit Trail**: Lưu vết toàn bộ quá trình tạo sinh
5. **Confidence Score**: Đánh giá độ tin cậy của kết quả

---

## ANTI-HALLUCINATION STRATEGIES

### 1. Context-Only Generation

**LLM chỉ được sử dụng context đã cung cấp**:
```python
system_prompt = """You are an academic language learning assistant. 
Generate flashcards using ONLY the provided context. 
Do NOT add external knowledge."""
```

### 2. Low Temperature

**Giảm creativity, tăng consistency**:
```python
temperature=0.3  # Low temperature for factual generation
```

### 3. Structured Prompts

**Prompt rõ ràng, có cấu trúc**:
- Cung cấp context đầy đủ
- Yêu cầu output format cụ thể (JSON)
- Liệt kê rules rõ ràng

### 4. Fallback Mechanism

**Khi LLM không khả dụng, dùng context trực tiếp**:
```python
if not llm_available:
    return {
        'term': context['word'],
        'example': context['context_sentence'],  # Dùng câu gốc
        'generation_method': 'fallback'
    }
```

### 5. Metadata Verification

**Mỗi kết quả có metadata để verify**:
- Source document
- Original sentence
- Retrieval timestamp
- Confidence score

---

## PERFORMANCE & OPTIMIZATION

### Caching Strategy

**Cache retrieved contexts**:
```python
# Cache key: document_id + word
cache_key = f"{document_id}_{word}"

if cache_key in context_cache:
    return context_cache[cache_key]

context = retrieve_from_kg(...)
context_cache[cache_key] = context
```

### Batch Processing

**Generate multiple flashcards in parallel**:
```python
from concurrent.futures import ThreadPoolExecutor

with ThreadPoolExecutor(max_workers=5) as executor:
    futures = [
        executor.submit(generator.generate_flashcard, pkg)
        for pkg in packaged_contexts
    ]
    results = [f.result() for f in futures]
```

### Rate Limiting

**Tránh vượt quá OpenAI rate limits**:
```python
import time

for pkg in packaged_contexts:
    result = generator.generate_flashcard(pkg)
    results.append(result)
    time.sleep(0.5)  # 500ms delay between calls
```

---

## ERROR HANDLING

### Graceful Degradation

```python
try:
    # Try LLM generation
    result = generator.generate_flashcard(context)
except Exception as e:
    print(f"[RAG] LLM generation failed: {e}")
    # Fallback to context-only
    result = generator._fallback_flashcard(context)
```

### Empty Results Handling

```python
if not retrieved_contexts:
    return {
        'success': False,
        'message': 'No relevant knowledge found',
        'query': query,
        'suggestions': [
            'Try a different document',
            'Check if vocabulary was extracted',
            'Verify Knowledge Graph is populated'
        ]
    }
```

---

## TESTING

### Unit Tests

```python
def test_query_parser():
    parser = QueryParser()
    
    query = "Generate flashcards for document doc_123"
    context = {'document_id': 'doc_123'}
    
    parsed = parser.parse(query, context)
    
    assert parsed.intent == QueryIntent.GENERATE_FLASHCARD
    assert parsed.constraints['document_id'] == 'doc_123'
```

### Integration Tests

```python
def test_complete_rag_pipeline():
    # Setup
    kg = KnowledgeGraph()
    rag = RAGSystem(kg, llm_api_key="test_key")
    
    # Test
    result = rag.generate_flashcards(document_id="doc_test", max_cards=5)
    
    # Verify
    assert result['success'] == True
    assert len(result['results']) <= 5
    assert all('metadata' in r for r in result['results'])
```

---

## KẾT LUẬN

RAG System là **trái tim** của hệ thống học tập, kết hợp:

- ✅ **Knowledge Graph**: Lưu trữ tri thức có cấu trúc
- ✅ **LLM (GPT-4)**: Tạo sinh nội dung tự nhiên
- ✅ **Traceability**: Truy vết nguồn gốc
- ✅ **Anti-Hallucination**: Chỉ dùng context đã verify

Pipeline này đảm bảo:
- Flashcards chính xác, có nguồn gốc
- Giải thích dựa trên ngữ cảnh thực tế
- Không tự bịa đặt thông tin (hallucination)
- Có thể kiểm tra và verify mọi kết quả
