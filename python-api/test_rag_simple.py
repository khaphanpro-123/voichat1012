"""
Simple RAG System Test
"""

import os
import sys

print("="*70)
print("STAGE 5 - RAG SYSTEM SIMPLE TEST")
print("="*70)

# Test 1: Import modules
print("\n[TEST 1] Importing modules...")
try:
    from rag_system import RAGSystem, QueryParser, QueryIntent
    from knowledge_graph import KnowledgeGraph
    print("✅ Modules imported successfully")
except Exception as e:
    print(f"❌ Import failed: {e}")
    sys.exit(1)

# Test 2: Initialize Query Parser
print("\n[TEST 2] Testing Query Parser...")
try:
    parser = QueryParser()
    
    # Test flashcard intent
    parsed = parser.parse("Generate flashcard for algorithm")
    assert parsed.intent == QueryIntent.GENERATE_FLASHCARD
    print("✅ Flashcard intent detected")
    
    # Test explanation intent
    parsed = parser.parse("Explain the term machine learning")
    assert parsed.intent == QueryIntent.EXPLAIN_TERM
    print("✅ Explanation intent detected")
    
    # Test related terms intent
    parsed = parser.parse("Find related terms to AI")
    assert parsed.intent == QueryIntent.FIND_RELATED
    print("✅ Related terms intent detected")
    
    print("✅ Query Parser working correctly")
except Exception as e:
    print(f"❌ Query Parser failed: {e}")
    sys.exit(1)

# Test 3: Build Knowledge Graph
print("\n[TEST 3] Building test Knowledge Graph...")
try:
    kg = KnowledgeGraph(storage_path="test_rag_simple")
    
    stage2_output = {
        "document_id": "doc_test_simple",
        "document_title": "AI Basics",
        "document_content": "Artificial intelligence and machine learning.",
        "vocabulary_contexts": [
            {
                "word": "artificial intelligence",
                "finalScore": 0.90,
                "contextSentence": "Artificial intelligence and machine learning.",
                "sentenceId": "sent_001",
                "sentenceScore": 0.88,
                "features": {"tfidf": 0.92}
            },
            {
                "word": "machine learning",
                "finalScore": 0.85,
                "contextSentence": "Artificial intelligence and machine learning.",
                "sentenceId": "sent_001",
                "sentenceScore": 0.88,
                "features": {"tfidf": 0.88}
            }
        ]
    }
    
    stats = kg.build_from_vocabulary_contexts(
        vocabulary_contexts=stage2_output["vocabulary_contexts"],
        document_id=stage2_output["document_id"],
        document_title=stage2_output["document_title"],
        document_content=stage2_output["document_content"]
    )
    
    print(f"✅ Knowledge Graph built: {stats['entities_created']} entities, {stats['relations_created']} relations")
except Exception as e:
    print(f"❌ Knowledge Graph failed: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

# Test 4: Initialize RAG System
print("\n[TEST 4] Initializing RAG System...")
try:
    rag = RAGSystem(
        knowledge_graph=kg,
        llm_api_key=None  # Use fallback mode
    )
    print("✅ RAG System initialized")
except Exception as e:
    print(f"❌ RAG System initialization failed: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

# Test 5: Generate Flashcards
print("\n[TEST 5] Generating flashcards...")
try:
    result = rag.generate_flashcards(
        document_id='doc_test_simple',
        max_cards=2
    )
    
    assert result['success'] == True
    assert result['count'] > 0
    assert 'results' in result
    
    print(f"✅ Generated {result['count']} flashcards")
    
    # Display first flashcard
    if result['results']:
        flashcard = result['results'][0]
        print(f"\n   Sample Flashcard:")
        print(f"   - Term: {flashcard['term']}")
        print(f"   - Meaning: {flashcard['meaning'][:60]}...")
        print(f"   - Source: {flashcard['source']}")
        print(f"   - Has metadata: {'metadata' in flashcard}")
        
except Exception as e:
    print(f"❌ Flashcard generation failed: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

# Test 6: Explain Term
print("\n[TEST 6] Explaining term...")
try:
    result = rag.explain_term('machine learning')
    
    assert result['success'] == True
    assert result['count'] > 0
    
    print(f"✅ Generated explanation for 'machine learning'")
    
    if result['results']:
        explanation = result['results'][0]
        print(f"   - Word: {explanation['word']}")
        print(f"   - Explanation: {explanation['explanation'][:60]}...")
        
except Exception as e:
    print(f"❌ Term explanation failed: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

# Test 7: Find Related Terms
print("\n[TEST 7] Finding related terms...")
try:
    result = rag.find_related_terms('artificial intelligence', max_terms=5)
    
    assert result['success'] == True
    
    print(f"✅ Found related terms")
    print(f"   - Count: {result['count']}")
    
except Exception as e:
    print(f"❌ Related terms search failed: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

# Test 8: Verify Traceability
print("\n[TEST 8] Verifying traceability...")
try:
    result = rag.generate_flashcards(word='artificial intelligence')
    
    if result['results']:
        flashcard = result['results'][0]
        metadata = flashcard['metadata']
        
        # Verify metadata fields
        assert 'term_id' in metadata
        assert 'sentence_id' in metadata
        assert 'document_id' in metadata
        assert 'retrieval_timestamp' in metadata
        
        # Trace back to knowledge graph
        term_entity = kg.get_entity(metadata['term_id'])
        assert term_entity is not None
        
        sentence_entity = kg.get_entity(metadata['sentence_id'])
        assert sentence_entity is not None
        
        document_entity = kg.get_entity(metadata['document_id'])
        assert document_entity is not None
        
        print("✅ Traceability verified")
        print(f"   - Term ID: {metadata['term_id']}")
        print(f"   - Sentence ID: {metadata['sentence_id']}")
        print(f"   - Document ID: {metadata['document_id']}")
        
except Exception as e:
    print(f"❌ Traceability verification failed: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

# Cleanup
print("\n[CLEANUP] Removing test data...")
try:
    import shutil
    if os.path.exists("test_rag_simple"):
        shutil.rmtree("test_rag_simple")
    print("✅ Cleanup completed")
except Exception as e:
    print(f"⚠️  Cleanup warning: {e}")

# Summary
print("\n" + "="*70)
print("TEST SUMMARY")
print("="*70)
print("✅ All 8 tests passed!")
print("="*70)
print("\nSTAGE 5 - RAG System is working correctly!")
print("="*70)
