"""
Quick Test Script for Python API Server
Run this after starting the server to verify all endpoints work
"""

import requests
import json

BASE_URL = "http://localhost:8000"

def test_health_check():
    """Test 1: Health check"""
    print("\n🔍 Test 1: Health Check")
    print("-" * 50)
    
    response = requests.get(f"{BASE_URL}/")
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    
    return response.status_code == 200


def test_vocabulary_extraction():
    """Test 2: Vocabulary extraction (STAGE 1 + 2)"""
    print("\n🔍 Test 2: Vocabulary Extraction")
    print("-" * 50)
    
    data = {
        "text": "Machine learning is a subset of artificial intelligence that enables computers to learn from data without being explicitly programmed. Deep learning is a type of machine learning that uses neural networks with multiple layers.",
        "max_words": 10,
        "language": "en"
    }
    
    response = requests.post(f"{BASE_URL}/api/smart-vocabulary-extract", json=data)
    print(f"Status: {response.status_code}")
    
    if response.status_code == 200:
        result = response.json()
        print(f"✅ Extracted {result['count']} words")
        print("\nTop 3 words:")
        for word in result['vocabulary'][:3]:
            print(f"  - {word['word']}: {word['score']:.2f}")
            print(f"    Context: {word['contextPlain'][:80]}...")
    else:
        print(f"❌ Error: {response.text}")
    
    return response.status_code == 200


def test_adaptive_extraction():
    """Test 3: Adaptive extraction (STAGE 3)"""
    print("\n🔍 Test 3: Adaptive Extraction with Feedback")
    print("-" * 50)
    
    data = {
        "text": "Python is a high-level programming language. It is widely used for web development, data science, and machine learning applications.",
        "max_words": 8,
        "language": "en"
    }
    
    response = requests.post(f"{BASE_URL}/api/smart-vocabulary-extract-adaptive", json=data)
    print(f"Status: {response.status_code}")
    
    if response.status_code == 200:
        result = response.json()
        print(f"✅ Extracted {result['count']} words")
        print(f"Adaptive weights: {result['adaptive_weights']['weights']}")
        print(f"Feedback count: {result['adaptive_weights']['feedback_count']}")
    else:
        print(f"❌ Error: {response.text}")
    
    return response.status_code == 200


def test_feedback_submission():
    """Test 4: Submit feedback (STAGE 3)"""
    print("\n🔍 Test 4: Submit Feedback")
    print("-" * 50)
    
    data = {
        "word": "algorithm",
        "document_id": "test_doc_001",
        "user_id": "test_user_123",
        "scores": {
            "tfidf": 0.85,
            "frequency": 0.30,
            "pos": 0.90
        },
        "final_score": 0.82,
        "user_action": "keep"
    }
    
    response = requests.post(f"{BASE_URL}/api/vocabulary-feedback", json=data)
    print(f"Status: {response.status_code}")
    
    if response.status_code == 200:
        result = response.json()
        print(f"✅ Feedback saved: {result['feedback_saved']}")
        print(f"Weights updated: {result['weights_updated']}")
        print(f"New weights: {result['new_weights']}")
    else:
        print(f"❌ Error: {response.text}")
    
    return response.status_code == 200


def test_knowledge_graph():
    """Test 5: Build knowledge graph (STAGE 4)"""
    print("\n🔍 Test 5: Build Knowledge Graph")
    print("-" * 50)
    
    data = {
        "document_id": "test_doc_kg_001",
        "document_title": "Test Document",
        "document_content": "This is a test document about machine learning.",
        "vocabulary_contexts": [
            {
                "word": "machine",
                "finalScore": 0.85,
                "contextSentence": "This is about <b>machine</b> learning.",
                "sentenceId": "s1",
                "sentenceScore": 0.80,
                "explanation": "Test context",
                "features": {"tfidf": 0.85}
            }
        ]
    }
    
    response = requests.post(f"{BASE_URL}/api/knowledge-graph/build", json=data)
    print(f"Status: {response.status_code}")
    
    if response.status_code == 200:
        result = response.json()
        print(f"✅ Knowledge graph built")
        print(f"Build stats: {result['build_stats']}")
    else:
        print(f"❌ Error: {response.text}")
    
    return response.status_code == 200


def test_rag_flashcards():
    """Test 6: Generate flashcards (STAGE 5)"""
    print("\n🔍 Test 6: Generate Flashcards with RAG")
    print("-" * 50)
    
    data = {
        "document_id": "test_doc_kg_001",
        "max_cards": 5
    }
    
    response = requests.post(f"{BASE_URL}/api/rag/generate-flashcards", json=data)
    print(f"Status: {response.status_code}")
    
    if response.status_code == 200:
        result = response.json()
        print(f"✅ Generated {result.get('count', 0)} flashcards")
        if result.get('results'):
            print(f"First card: {result['results'][0].get('term', 'N/A')}")
    else:
        print(f"❌ Error: {response.text}")
    
    return response.status_code == 200


def test_complete_pipeline():
    """Test 7: Complete pipeline (STAGE 1-5)"""
    print("\n🔍 Test 7: Complete Pipeline (All Stages)")
    print("-" * 50)
    
    data = {
        "text": "Artificial intelligence is transforming the world. Machine learning algorithms can analyze vast amounts of data to identify patterns and make predictions. Deep learning uses neural networks to process complex information.",
        "max_words": 15,
        "language": "en"
    }
    
    response = requests.post(f"{BASE_URL}/api/complete-pipeline", json=data)
    print(f"Status: {response.status_code}")
    
    if response.status_code == 200:
        result = response.json()
        print(f"✅ Pipeline completed successfully")
        print(f"Document ID: {result['document_id']}")
        print(f"Vocabulary count: {result['count']}")
        print(f"Flashcards count: {result.get('flashcards_count', 0)}")
        print(f"Pipeline: {result['pipeline']}")
    else:
        print(f"❌ Error: {response.text}")
    
    return response.status_code == 200


def main():
    """Run all tests"""
    print("=" * 50)
    print("🚀 PYTHON API SERVER TEST SUITE")
    print("=" * 50)
    print(f"Testing server at: {BASE_URL}")
    
    tests = [
        test_health_check,
        test_vocabulary_extraction,
        test_adaptive_extraction,
        test_feedback_submission,
        test_knowledge_graph,
        test_rag_flashcards,
        test_complete_pipeline
    ]
    
    results = []
    for test in tests:
        try:
            result = test()
            results.append(result)
        except Exception as e:
            print(f"❌ Test failed with error: {e}")
            results.append(False)
    
    # Summary
    print("\n" + "=" * 50)
    print("📊 TEST SUMMARY")
    print("=" * 50)
    passed = sum(results)
    total = len(results)
    print(f"Passed: {passed}/{total}")
    print(f"Success rate: {passed/total*100:.1f}%")
    
    if passed == total:
        print("\n✅ ALL TESTS PASSED! Server is working perfectly!")
    else:
        print(f"\n⚠️ {total - passed} test(s) failed. Check the output above.")


if __name__ == "__main__":
    main()
