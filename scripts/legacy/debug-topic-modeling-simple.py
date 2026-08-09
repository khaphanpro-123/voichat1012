#!/usr/bin/env python3
"""
Debug script to test Topic Modeling functionality
"""

import sys
import os
sys.path.append('python-api')

def test_topic_modeling():
    """Test if topic modeling is working"""
    
    print("🔍 Testing Topic Modeling...")
    print("=" * 50)
    
    # Test 1: Check dependencies
    print("\n1. Checking dependencies...")
    
    try:
        import sklearn
        print(f"✅ scikit-learn: {sklearn.__version__}")
    except ImportError:
        print("❌ scikit-learn not installed")
        return False
    
    try:
        import sentence_transformers
        print(f"✅ sentence-transformers: {sentence_transformers.__version__}")
    except ImportError:
        print("❌ sentence-transformers not installed")
        print("💡 Install with: pip install sentence-transformers")
        return False
    
    # Test 2: Check embedding model
    print("\n2. Testing embedding model...")
    
    try:
        from embedding_utils import SentenceTransformer
        model = SentenceTransformer('all-MiniLM-L6-v2')
        
        # Test encoding
        test_texts = [
            "machine learning algorithms",
            "climate change effects", 
            "renewable energy sources",
            "medical technology advances",
            "space exploration missions"
        ]
        
        embeddings = model.encode(test_texts)
        print(f"✅ Embedding model working: {embeddings.shape}")
        
    except Exception as e:
        print(f"❌ Embedding model error: {e}")
        return False
    
    # Test 3: Test pipeline initialization
    print("\n3. Testing pipeline initialization...")
    
    try:
        from new_pipeline_learned_scoring import NewPipelineLearnedScoring, HAS_EMBEDDINGS
        
        print(f"HAS_EMBEDDINGS: {HAS_EMBEDDINGS}")
        
        pipeline = NewPipelineLearnedScoring(n_topics=3)
        print(f"✅ Pipeline initialized")
        print(f"   - embedding_model: {pipeline.embedding_model is not None}")
        print(f"   - n_topics: {pipeline.n_topics}")
        
    except Exception as e:
        print(f"❌ Pipeline initialization error: {e}")
        return False
    
    # Test 4: Test topic modeling with sample data
    print("\n4. Testing topic modeling with sample data...")
    
    try:
        # Create sample vocabulary items
        sample_items = [
            {
                'word': 'machine learning',
                'type': 'phrase',
                'final_score': 0.8,
                'embedding': embeddings[0]
            },
            {
                'word': 'neural networks',
                'type': 'phrase', 
                'final_score': 0.7,
                'embedding': embeddings[0] + 0.1  # Similar to ML
            },
            {
                'word': 'climate change',
                'type': 'phrase',
                'final_score': 0.9,
                'embedding': embeddings[1]
            },
            {
                'word': 'global warming',
                'type': 'phrase',
                'final_score': 0.8,
                'embedding': embeddings[1] + 0.1  # Similar to climate
            },
            {
                'word': 'solar power',
                'type': 'phrase',
                'final_score': 0.6,
                'embedding': embeddings[2]
            },
            {
                'word': 'wind energy',
                'type': 'phrase',
                'final_score': 0.7,
                'embedding': embeddings[2] + 0.1  # Similar to solar
            }
        ]
        
        # Test topic modeling
        topics = pipeline._topic_modeling(sample_items)
        
        print(f"✅ Topic modeling successful!")
        print(f"   - Number of topics: {len(topics)}")
        
        for i, topic in enumerate(topics):
            print(f"   - Topic {i+1}: {topic['topic_name']} ({len(topic['items'])} items)")
            items_preview = [item['word'] for item in topic['items'][:3]]
            print(f"     Items: {', '.join(items_preview)}")
        
        return True
        
    except Exception as e:
        print(f"❌ Topic modeling error: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_complete_pipeline():
    """Test complete pipeline with sample text"""
    
    print("\n" + "=" * 50)
    print("🚀 Testing Complete Pipeline...")
    print("=" * 50)
    
    try:
        from complete_pipeline import CompletePipelineNew
        
        # Sample text with multiple topics
        sample_text = """
        Machine Learning and Artificial Intelligence
        
        Machine learning algorithms are revolutionizing data processing. Neural networks enable pattern recognition in large datasets. Deep learning models understand natural language and recognize images.
        
        Climate Change and Environmental Issues
        
        Climate change represents pressing global challenges. Rising temperatures cause melting ice caps and rising sea levels. Greenhouse gas emissions drive global warming.
        
        Renewable Energy Solutions
        
        Solar power harnesses energy from sunlight using photovoltaic panels. Wind energy captures kinetic energy through wind turbines. Hydroelectric power generates electricity from flowing water.
        """
        
        pipeline = CompletePipelineNew(n_topics=3)
        
        result = pipeline.process_document(
            text=sample_text,
            document_title="Sample Test",
            max_phrases=20,
            max_words=10,
            generate_flashcards=False
        )
        
        print(f"✅ Complete pipeline successful!")
        print(f"   - Vocabulary: {len(result['vocabulary'])} items")
        print(f"   - Topics: {len(result.get('topics', []))} topics")
        
        if result.get('topics'):
            print("\n📊 Topics found:")
            for i, topic in enumerate(result['topics']):
                print(f"   Topic {i+1}: {topic.get('topic_name', 'Unnamed')}")
                print(f"   - Items: {len(topic.get('items', []))}")
                if topic.get('items'):
                    sample_items = [item.get('word', item.get('phrase', '')) for item in topic['items'][:3]]
                    print(f"   - Sample: {', '.join(sample_items)}")
        else:
            print("⚠️  No topics in result")
            print("   This suggests topic modeling is not working")
        
        return True
        
    except Exception as e:
        print(f"❌ Complete pipeline error: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    print("🔍 Topic Modeling Debug Script")
    print("=" * 50)
    
    # Test basic topic modeling
    success1 = test_topic_modeling()
    
    # Test complete pipeline
    success2 = test_complete_pipeline()
    
    print("\n" + "=" * 50)
    print("📋 SUMMARY")
    print("=" * 50)
    
    if success1 and success2:
        print("✅ All tests passed!")
        print("   Topic Modeling is working correctly.")
        print("   If you don't see topics in UI, the issue is in the frontend.")
    elif success1:
        print("⚠️  Basic topic modeling works, but complete pipeline has issues")
    else:
        print("❌ Topic modeling is not working")
        print("   Most likely cause: sentence-transformers not installed")
        print("   Solution: pip install sentence-transformers")
    
    print("\n💡 Next steps:")
    print("1. If tests pass: Check frontend UI rendering")
    print("2. If tests fail: Install missing dependencies")
    print("3. Test with real document upload")