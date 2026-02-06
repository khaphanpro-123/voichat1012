"""
STAGE 5 – Retrieval-Augmented Generation (RAG)

Mục tiêu:
- Kết hợp Knowledge Graph với LLM để tạo sinh tri thức
- Giảm hallucination bằng cách chỉ sử dụng tri thức đã truy xuất
- Tạo flashcard, giải thích, ví dụ có thể truy vết ngược về nguồn
- Đảm bảo tính học thuật và chính xác

Pipeline:
1. Query Understanding - Phân tích ý định người dùng
2. Knowledge Retrieval - Truy xuất từ Knowledge Graph
3. Context Packaging - Đóng gói ngữ cảnh có cấu trúc
4. LLM Generation - Tạo sinh với LLM (không hallucinate)
5. Traceability - Gắn metadata truy vết

Author: AI System
Date: 2026-02-02
"""

import json
import os
from typing import List, Dict, Optional, Any
from dataclasses import dataclass, asdict
from datetime import datetime
from enum import Enum

# Import Knowledge Graph
from knowledge_graph import KnowledgeGraph, EntityType, RelationType


# ============================================================================
# BƯỚC 5.1 – QUERY UNDERSTANDING
# ============================================================================

class QueryIntent(Enum):
    """Các loại ý định truy vấn"""
    GENERATE_FLASHCARD = "generate_flashcard"
    EXPLAIN_TERM = "explain_term"
    FIND_EXAMPLES = "find_examples"
    FIND_RELATED = "find_related"
    SUMMARIZE_DOCUMENT = "summarize_document"
    COMPARE_TERMS = "compare_terms"


@dataclass
class ParsedQuery:
    """Kết quả phân tích query"""
    intent: QueryIntent
    target_entity: str  # VocabularyTerm, Document, Concept
    constraints: Dict[str, Any]
    parameters: Dict[str, Any]


class QueryParser:
    """
    Phân tích query của người dùng thành intent và constraints
    
    Rule-based parser - không cần LLM
    """
    
    def __init__(self):
        # Keywords for intent detection
        self.intent_keywords = {
            QueryIntent.GENERATE_FLASHCARD: ['flashcard', 'thẻ từ', 'card', 'học từ'],
            QueryIntent.EXPLAIN_TERM: ['giải thích', 'explain', 'nghĩa', 'meaning', 'định nghĩa'],
            QueryIntent.FIND_EXAMPLES: ['ví dụ', 'example', 'minh họa', 'illustrate'],
            QueryIntent.FIND_RELATED: ['liên quan', 'related', 'tương tự', 'similar'],
            QueryIntent.SUMMARIZE_DOCUMENT: ['tóm tắt', 'summarize', 'summary', 'overview'],
            QueryIntent.COMPARE_TERMS: ['so sánh', 'compare', 'khác nhau', 'difference']
        }
    
    def parse(self, query: str, context: Dict = None) -> ParsedQuery:
        """
        Phân tích query thành structured intent
        
        Args:
            query: Câu hỏi của người dùng
            context: Ngữ cảnh bổ sung (document_id, user_id, etc.)
        
        Returns:
            ParsedQuery object
        """
        query_lower = query.lower()
        
        # Detect intent
        intent = self._detect_intent(query_lower)
        
        # Extract target entity
        target_entity = self._extract_target_entity(query_lower, context)
        
        # Extract constraints
        constraints = self._extract_constraints(query_lower, context)
        
        # Extract parameters
        parameters = self._extract_parameters(query_lower, context)
        
        return ParsedQuery(
            intent=intent,
            target_entity=target_entity,
            constraints=constraints,
            parameters=parameters
        )
    
    def _detect_intent(self, query: str) -> QueryIntent:
        """Phát hiện intent từ keywords"""
        for intent, keywords in self.intent_keywords.items():
            if any(kw in query for kw in keywords):
                return intent
        
        # Default intent
        return QueryIntent.EXPLAIN_TERM
    
    def _extract_target_entity(self, query: str, context: Dict) -> str:
        """Xác định loại entity cần truy vấn"""
        if 'document' in query or 'tài liệu' in query:
            return 'Document'
        elif 'concept' in query or 'khái niệm' in query:
            return 'Concept'
        else:
            return 'VocabularyTerm'
    
    def _extract_constraints(self, query: str, context: Dict) -> Dict:
        """Trích xuất điều kiện lọc"""
        constraints = {}
        
        # Document constraint
        if context and 'document_id' in context:
            constraints['document_id'] = context['document_id']
        
        # Word constraint
        if context and 'word' in context:
            constraints['word'] = context['word']
        
        # Concept constraint
        if context and 'concept' in context:
            constraints['concept'] = context['concept']
        
        return constraints
    
    def _extract_parameters(self, query: str, context: Dict) -> Dict:
        """Trích xuất tham số bổ sung"""
        parameters = {}
        
        # Max results
        if 'top' in query or 'first' in query:
            # Extract number
            import re
            numbers = re.findall(r'\d+', query)
            if numbers:
                parameters['max_results'] = int(numbers[0])
        
        # Language
        if context and 'language' in context:
            parameters['language'] = context['language']
        else:
            parameters['language'] = 'en'
        
        return parameters


# ============================================================================
# BƯỚC 5.2 – KNOWLEDGE RETRIEVAL
# ============================================================================

@dataclass
class RetrievedContext:
    """Ngữ cảnh đã truy xuất từ Knowledge Graph"""
    vocabulary_term: Dict
    context_sentence: Dict
    source_document: Dict
    related_terms: List[Dict]
    metadata: Dict


class KnowledgeRetriever:
    """
    Truy xuất tri thức từ Knowledge Graph
    
    Graph-based retrieval (primary) + optional vector retrieval
    """
    
    def __init__(self, knowledge_graph: KnowledgeGraph):
        self.kg = knowledge_graph
    
    def retrieve(self, parsed_query: ParsedQuery) -> List[RetrievedContext]:
        """
        Truy xuất tri thức dựa trên parsed query
        
        Args:
            parsed_query: Query đã được phân tích
        
        Returns:
            List of RetrievedContext
        """
        if parsed_query.intent == QueryIntent.GENERATE_FLASHCARD:
            return self._retrieve_for_flashcard(parsed_query)
        
        elif parsed_query.intent == QueryIntent.EXPLAIN_TERM:
            return self._retrieve_for_explanation(parsed_query)
        
        elif parsed_query.intent == QueryIntent.FIND_RELATED:
            return self._retrieve_related_terms(parsed_query)
        
        elif parsed_query.intent == QueryIntent.FIND_EXAMPLES:
            return self._retrieve_examples(parsed_query)
        
        else:
            return self._retrieve_for_explanation(parsed_query)
    
    def _retrieve_for_flashcard(self, query: ParsedQuery) -> List[RetrievedContext]:
        """Truy xuất dữ liệu cho flashcard generation"""
        contexts = []
        
        # Get vocabulary terms from document
        if 'document_id' in query.constraints:
            doc_id = query.constraints['document_id']
            vocab_terms = self.kg.query_vocabulary_by_document(doc_id)
            
            for term in vocab_terms:
                context = self._build_context_for_term(term)
                if context:
                    contexts.append(context)
        
        # Get specific word
        elif 'word' in query.constraints:
            word = query.constraints['word']
            # Find term by word
            all_terms = self.kg.get_entities_by_type(EntityType.VOCABULARY_TERM)
            matching_terms = [t for t in all_terms if t.properties.get('word') == word]
            
            for term in matching_terms:
                context = self._build_context_for_term(term)
                if context:
                    contexts.append(context)
        
        # Limit results
        max_results = query.parameters.get('max_results', 10)
        return contexts[:max_results]
    
    def _retrieve_for_explanation(self, query: ParsedQuery) -> List[RetrievedContext]:
        """Truy xuất dữ liệu cho term explanation"""
        return self._retrieve_for_flashcard(query)
    
    def _retrieve_related_terms(self, query: ParsedQuery) -> List[RetrievedContext]:
        """Truy xuất các từ liên quan"""
        contexts = []
        
        if 'word' in query.constraints:
            word = query.constraints['word']
            
            # Find term entity
            all_terms = self.kg.get_entities_by_type(EntityType.VOCABULARY_TERM)
            term = next((t for t in all_terms if t.properties.get('word') == word), None)
            
            if term:
                # Get related terms
                related = self.kg.query_related_terms(term.entity_id)
                
                for rel_term in related:
                    context = self._build_context_for_term(rel_term)
                    if context:
                        contexts.append(context)
        
        return contexts
    
    def _retrieve_examples(self, query: ParsedQuery) -> List[RetrievedContext]:
        """Truy xuất ví dụ sử dụng"""
        return self._retrieve_for_flashcard(query)
    
    def _build_context_for_term(self, term_entity) -> Optional[RetrievedContext]:
        """
        Xây dựng context đầy đủ cho một vocabulary term
        
        Bao gồm: term, sentence, document, related terms
        """
        try:
            # Get term properties
            term_data = {
                'term_id': term_entity.entity_id,
                'word': term_entity.properties.get('word'),
                'score': term_entity.properties.get('score'),
                'features': term_entity.properties.get('features', {})
            }
            
            # Get context sentence
            sentence_id = term_entity.properties.get('sentence_id')
            sentence_entity = self.kg.get_entity(sentence_id)
            
            sentence_data = {}
            if sentence_entity:
                sentence_data = {
                    'sentence_id': sentence_entity.entity_id,
                    'text': sentence_entity.properties.get('text'),
                    'position': sentence_entity.properties.get('position')
                }
            
            # Get source document
            document_id = term_entity.properties.get('document_id')
            document_entity = self.kg.get_entity(document_id)
            
            document_data = {}
            if document_entity:
                document_data = {
                    'document_id': document_entity.entity_id,
                    'title': document_entity.properties.get('title'),
                    'content_preview': document_entity.properties.get('content', '')[:200]
                }
            
            # Get related terms
            related_terms = self.kg.query_related_terms(term_entity.entity_id, max_depth=1)
            related_data = [
                {
                    'word': rt.properties.get('word'),
                    'score': rt.properties.get('score')
                }
                for rt in related_terms[:5]  # Top 5 related
            ]
            
            # Metadata
            metadata = {
                'retrieval_timestamp': datetime.now().isoformat(),
                'retrieval_method': 'knowledge_graph',
                'confidence': term_entity.properties.get('score', 0.0)
            }
            
            return RetrievedContext(
                vocabulary_term=term_data,
                context_sentence=sentence_data,
                source_document=document_data,
                related_terms=related_data,
                metadata=metadata
            )
        
        except Exception as e:
            print(f"[Retriever] Error building context: {e}")
            return None


# ============================================================================
# BƯỚC 5.3 – CONTEXT PACKAGING
# ============================================================================

class ContextPackager:
    """
    Đóng gói retrieved context thành format chuẩn cho LLM
    
    Structured context giúp LLM không hallucinate
    """
    
    def package_for_flashcard(self, contexts: List[RetrievedContext]) -> List[Dict]:
        """Đóng gói context cho flashcard generation"""
        packaged = []
        
        for ctx in contexts:
            package = {
                'word': ctx.vocabulary_term['word'],
                'context_sentence': ctx.context_sentence.get('text', ''),
                'source_document': ctx.source_document.get('title', 'Unknown'),
                'related_words': [rt['word'] for rt in ctx.related_terms],
                'score': ctx.vocabulary_term.get('score', 0.0),
                'features': ctx.vocabulary_term.get('features', {}),
                'metadata': {
                    'term_id': ctx.vocabulary_term['term_id'],
                    'sentence_id': ctx.context_sentence.get('sentence_id'),
                    'document_id': ctx.source_document.get('document_id'),
                    'retrieval_timestamp': ctx.metadata['retrieval_timestamp']
                }
            }
            packaged.append(package)
        
        return packaged
    
    def package_for_explanation(self, contexts: List[RetrievedContext]) -> List[Dict]:
        """Đóng gói context cho term explanation"""
        return self.package_for_flashcard(contexts)
    
    def package_for_examples(self, contexts: List[RetrievedContext]) -> List[Dict]:
        """Đóng gói context cho example generation"""
        return self.package_for_flashcard(contexts)


# ============================================================================
# BƯỚC 5.4 – LLM GENERATION
# ============================================================================

class LLMGenerator:
    """
    Tạo sinh nội dung học tập bằng LLM
    
    LLM chỉ được sử dụng context đã cung cấp, không tự tìm kiếm
    """
    
    def __init__(self, api_key: str = None, model: str = "gpt-4"):
        self.api_key = api_key or os.getenv("OPENAI_API_KEY")
        self.model = model
        
        # Initialize OpenAI client if available
        try:
            from openai import OpenAI
            self.client = OpenAI(api_key=self.api_key)
            self.available = True
        except:
            self.client = None
            self.available = False
            print("[LLM] OpenAI client not available - using fallback")
    
    def generate_flashcard(self, context: Dict) -> Dict:
        """
        Tạo flashcard từ context
        
        Args:
            context: Packaged context with word, sentence, etc.
        
        Returns:
            Flashcard dict with term, meaning, example, source
        """
        if not self.available:
            return self._fallback_flashcard(context)
        
        # Build prompt
        prompt = self._build_flashcard_prompt(context)
        
        try:
            # Call LLM
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "system",
                        "content": "You are an academic language learning assistant. Generate flashcards using ONLY the provided context. Do NOT add external knowledge."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                temperature=0.3,  # Low temperature for consistency
                max_tokens=300
            )
            
            # Parse response
            content = response.choices[0].message.content
            flashcard = self._parse_flashcard_response(content, context)
            
            return flashcard
        
        except Exception as e:
            print(f"[LLM] Error generating flashcard: {e}")
            return self._fallback_flashcard(context)
    
    def generate_explanation(self, context: Dict) -> Dict:
        """Tạo giải thích học thuật cho từ vựng"""
        if not self.available:
            return self._fallback_explanation(context)
        
        prompt = self._build_explanation_prompt(context)
        
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "system",
                        "content": "You are an academic language expert. Explain terms using ONLY the provided context."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                temperature=0.3,
                max_tokens=400
            )
            
            content = response.choices[0].message.content
            
            return {
                'word': context['word'],
                'explanation': content,
                'source': context['source_document'],
                'metadata': context['metadata']
            }
        
        except Exception as e:
            print(f"[LLM] Error generating explanation: {e}")
            return self._fallback_explanation(context)
    
    def generate_examples(self, context: Dict, count: int = 3) -> List[str]:
        """Tạo ví dụ sử dụng từ vựng"""
        if not self.available:
            return [context.get('context_sentence', '')]
        
        prompt = self._build_examples_prompt(context, count)
        
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "system",
                        "content": "Generate example sentences using ONLY the context provided. Maintain academic style."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                temperature=0.5,
                max_tokens=300
            )
            
            content = response.choices[0].message.content
            examples = [line.strip() for line in content.split('\n') if line.strip()]
            
            return examples[:count]
        
        except Exception as e:
            print(f"[LLM] Error generating examples: {e}")
            return [context.get('context_sentence', '')]
    
    def _build_flashcard_prompt(self, context: Dict) -> str:
        """Build prompt for flashcard generation"""
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
    
    def _build_explanation_prompt(self, context: Dict) -> str:
        """Build prompt for explanation generation"""
        return f"""Explain this term based on the provided context:

Term: {context['word']}
Context: {context['context_sentence']}
Source: {context['source_document']}

Provide a clear, academic explanation (2-3 sentences) using ONLY the context provided."""
    
    def _build_examples_prompt(self, context: Dict, count: int) -> str:
        """Build prompt for example generation"""
        return f"""Generate {count} example sentences for this word:

Word: {context['word']}
Original Context: {context['context_sentence']}

Generate {count} NEW example sentences that:
- Use the word in similar academic contexts
- Maintain the same meaning as shown in the original context
- Are clear and educational

Output one example per line."""
    
    def _parse_flashcard_response(self, response: str, context: Dict) -> Dict:
        """Parse LLM response into flashcard format"""
        try:
            # Try to parse as JSON
            import re
            json_match = re.search(r'\{.*\}', response, re.DOTALL)
            if json_match:
                flashcard = json.loads(json_match.group())
            else:
                # Fallback parsing
                flashcard = {
                    'term': context['word'],
                    'meaning': response.split('\n')[0],
                    'example': context['context_sentence'],
                    'notes': ''
                }
            
            # Add metadata
            flashcard['metadata'] = context['metadata']
            flashcard['source'] = context['source_document']
            
            return flashcard
        
        except:
            return self._fallback_flashcard(context)
    
    def _fallback_flashcard(self, context: Dict) -> Dict:
        """Fallback flashcard when LLM not available"""
        return {
            'term': context['word'],
            'meaning': f"Academic term from {context['source_document']}",
            'example': context['context_sentence'],
            'notes': f"Related: {', '.join(context['related_words'][:3])}",
            'metadata': context['metadata'],
            'source': context['source_document'],
            'generation_method': 'fallback'
        }
    
    def _fallback_explanation(self, context: Dict) -> Dict:
        """Fallback explanation when LLM not available"""
        return {
            'word': context['word'],
            'explanation': f"The term '{context['word']}' appears in the context: {context['context_sentence']}",
            'source': context['source_document'],
            'metadata': context['metadata'],
            'generation_method': 'fallback'
        }


# ============================================================================
# BƯỚC 5.5 – RAG PIPELINE (COMPLETE)
# ============================================================================

class RAGSystem:
    """
    Complete RAG System integrating all components
    
    Pipeline: Query → Retrieve → Package → Generate → Trace
    """
    
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
    
    def process_query(
        self,
        query: str,
        context: Dict = None
    ) -> Dict:
        """
        Process user query through complete RAG pipeline
        
        Args:
            query: User's question/request
            context: Additional context (document_id, word, etc.)
        
        Returns:
            Generated output with traceability
        """
        print(f"[RAG] Processing query: {query}")
        
        # Step 1: Parse query
        parsed_query = self.query_parser.parse(query, context or {})
        print(f"[RAG] Intent: {parsed_query.intent.value}")
        print(f"[RAG] Constraints: {parsed_query.constraints}")
        
        # Step 2: Retrieve from Knowledge Graph
        retrieved_contexts = self.retriever.retrieve(parsed_query)
        print(f"[RAG] Retrieved {len(retrieved_contexts)} contexts")
        
        if not retrieved_contexts:
            return {
                'success': False,
                'message': 'No relevant knowledge found',
                'query': query
            }
        
        # Step 3: Package contexts
        if parsed_query.intent == QueryIntent.GENERATE_FLASHCARD:
            packaged = self.packager.package_for_flashcard(retrieved_contexts)
        elif parsed_query.intent == QueryIntent.EXPLAIN_TERM:
            packaged = self.packager.package_for_explanation(retrieved_contexts)
        else:
            packaged = self.packager.package_for_flashcard(retrieved_contexts)
        
        print(f"[RAG] Packaged {len(packaged)} contexts")
        
        # Step 4: Generate with LLM
        results = []
        for pkg in packaged:
            if parsed_query.intent == QueryIntent.GENERATE_FLASHCARD:
                result = self.generator.generate_flashcard(pkg)
            elif parsed_query.intent == QueryIntent.EXPLAIN_TERM:
                result = self.generator.generate_explanation(pkg)
            elif parsed_query.intent == QueryIntent.FIND_EXAMPLES:
                examples = self.generator.generate_examples(pkg)
                result = {
                    'word': pkg['word'],
                    'examples': examples,
                    'metadata': pkg['metadata']
                }
            else:
                result = self.generator.generate_flashcard(pkg)
            
            results.append(result)
        
        print(f"[RAG] Generated {len(results)} results")
        
        # Step 5: Return with traceability
        return {
            'success': True,
            'query': query,
            'intent': parsed_query.intent.value,
            'results': results,
            'count': len(results),
            'pipeline': 'Query Understanding → Knowledge Retrieval → Context Packaging → LLM Generation → Traceability',
            'timestamp': datetime.now().isoformat()
        }
    
    def generate_flashcards(
        self,
        document_id: str = None,
        word: str = None,
        max_cards: int = 10
    ) -> Dict:
        """
        Convenience method for flashcard generation
        
        Args:
            document_id: Generate flashcards for specific document
            word: Generate flashcard for specific word
            max_cards: Maximum number of flashcards
        
        Returns:
            Flashcards with traceability
        """
        context = {}
        if document_id:
            context['document_id'] = document_id
        if word:
            context['word'] = word
        
        context['max_results'] = max_cards
        
        query = "Generate flashcards"
        if word:
            query = f"Generate flashcard for {word}"
        elif document_id:
            query = f"Generate flashcards for document {document_id}"
        
        return self.process_query(query, context)
    
    def explain_term(self, word: str, document_id: str = None) -> Dict:
        """
        Convenience method for term explanation
        
        Args:
            word: Word to explain
            document_id: Optional document context
        
        Returns:
            Explanation with traceability
        """
        context = {'word': word}
        if document_id:
            context['document_id'] = document_id
        
        query = f"Explain the term {word}"
        
        return self.process_query(query, context)
    
    def find_related_terms(self, word: str, max_terms: int = 5) -> Dict:
        """
        Find related terms with explanations
        
        Args:
            word: Source word
            max_terms: Maximum related terms
        
        Returns:
            Related terms with context
        """
        context = {
            'word': word,
            'max_results': max_terms
        }
        
        query = f"Find terms related to {word}"
        
        return self.process_query(query, context)


# ============================================================================
# TESTING & DEMO
# ============================================================================

if __name__ == "__main__":
    print("=" * 80)
    print("TESTING STAGE 5 - RAG System")
    print("=" * 80)
    
    # Initialize Knowledge Graph
    from knowledge_graph import KnowledgeGraph
    kg = KnowledgeGraph(storage_path="knowledge_graph_data")
    
    # Initialize RAG System
    rag = RAGSystem(
        knowledge_graph=kg,
        llm_api_key=os.getenv("OPENAI_API_KEY"),
        llm_model="gpt-4"
    )
    
    print("\n✅ RAG System initialized")
    
    # Test 1: Generate flashcards
    print("\n" + "=" * 80)
    print("TEST 1: Generate Flashcards")
    print("=" * 80)
    
    result = rag.generate_flashcards(max_cards=3)
    print(json.dumps(result, indent=2, ensure_ascii=False))
    
    print("\n✅ RAG System tests completed!")
