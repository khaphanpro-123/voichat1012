
def test_embeddings():
    """Test xem embeddings có hoạt động không"""
    print(" TESTING EMBEDDINGS")
    print("-" * 40)
    
    try:
        from embedding_utils import SentenceTransformer
        print(" embedding_utils import successful")
        
        model = SentenceTransformer('all-MiniLM-L6-v2')
        print("SentenceTransformer model loaded")
        
        # Test encoding
        test_texts = ["machine learning", "climate change", "renewable energy"]
        embeddings = model.encode(test_texts)
        print(f" Encoded {len(test_texts)} texts")
        print(f"   Embedding shape: {embeddings.shape}")
        
        return True, model
        
    except Exception as e:
        print(f"Embedding test failed: {e}")
        return False, None

def test_new_pipeline():
    """Test NewPipelineLearnedScoring"""
    print("\nTESTING NEW PIPELINE")
    print("-" * 40)
    
    try:
        from new_pipeline_learned_scoring import NewPipelineLearnedScoring
        
        pipeline = NewPipelineLearnedScoring(n_topics=3)
        print("NewPipelineLearnedScoring initialized")
        print(f"   n_topics: {pipeline.n_topics}")
        print(f"   embedding_model: {pipeline.embedding_model is not None}")
        
        # Test with sample data
        phrases = [
            {'phrase': 'machine learning', 'importance_score': 0.9, 'type': 'phrase'},
            {'phrase': 'climate change', 'importance_score': 0.8, 'type': 'phrase'},
            {'phrase': 'renewable energy', 'importance_score': 0.7, 'type': 'phrase'}
        ]
        
        words = [
            {'word': 'algorithm', 'importance_score': 0.6, 'type': 'word'},
            {'word': 'temperature', 'importance_score': 0.5, 'type': 'word'},
            {'word': 'solar', 'importance_score': 0.4, 'type': 'word'}
        ]
        
        print(f"   Test data: {len(phrases)} phrases, {len(words)} words")
        
        # Process
        result = pipeline.process(
            phrases=phrases,
            words=words,
            document_text="Machine learning and climate change are important topics."
        )
        
        print(f"   Pipeline processing successful")
        print(f"   Vocabulary: {len(result['vocabulary'])} items")
        print(f"   Topics: {len(result['topics'])} topics")
        print(f"   Flashcards: {len(result['flashcards'])} flashcards")
        
        # Check topics detail
        if result['topics']:
            print(f"\n TOPICS DETAIL:")
            for i, topic in enumerate(result['topics']):
                print(f"   Topic {i+1}: {topic.get('topic_name', 'Unknown')}")
                print(f"     Items: {len(topic.get('items', []))}")
                if topic.get('items'):
                    items_text = [item.get('word', item.get('phrase', 'unknown')) for item in topic['items'][:3]]
                    print(f"     Sample: {items_text}")
        else:
            print(f"No topics found!")
        
        return True, result
        
    except Exception as e:
        print(f"New pipeline test failed: {e}")
        import traceback
        traceback.print_exc()
        return False, None

def test_complete_pipeline():
    """Test CompletePipelineNew"""
    print("\nTESTING COMPLETE PIPELINE")
    print("-" * 40)
    
    try:
        from complete_pipeline import CompletePipelineNew
        
        pipeline = CompletePipelineNew(n_topics=3)
        print("CompletePipelineNew initialized")
        
        sample_text = """
        Machine learning is a powerful technology for solving complex problems. 
        Neural networks and deep learning algorithms can process large datasets.
        
        Climate change is a global challenge that requires immediate action.
        Global warming affects weather patterns and sea levels worldwide.
        
        Renewable energy sources like solar and wind power provide clean alternatives.
        Solar panels and wind turbines help reduce carbon emissions.
        """
        
        result = pipeline.process_document(
            text=sample_text,
            document_title="Test Document",
            max_phrases=15,
            max_words=10,
            generate_flashcards=False
        )
        
        print(f"   Complete pipeline processing successful")
        print(f"   Vocabulary: {len(result['vocabulary'])} items")
        print(f"   Topics: {len(result['topics'])} topics")
        print(f"   Flashcards: {len(result['flashcards'])} flashcards")
        
        # Check topics detail
        if result['topics']:
            print(f"\n TOPICS DETAIL:")
            for i, topic in enumerate(result['topics']):
                print(f"   Topic {i+1}: {topic.get('topic_name', 'Unknown')}")
                print(f"     Items: {len(topic.get('items', []))}")
                if topic.get('items'):
                    items_text = [item.get('word', item.get('phrase', item.get('term', 'unknown'))) for item in topic['items'][:3]]
                    print(f"     Sample: {items_text}")
        else:
            print(f" No topics found in complete pipeline!")
            
            # Debug: check vocabulary
            vocab = result.get('vocabulary', [])
            if vocab:
                print(f"\n DEBUG - Vocabulary items:")
                for i, item in enumerate(vocab[:5]):
                    print(f"   {i+1}. {item.get('word', item.get('phrase', item.get('term', 'unknown')))}")
                    print(f"      Type: {item.get('type', 'unknown')}")
                    print(f"      Has embedding: {'embedding' in item}")
                    if 'cluster_id' in item:
                        print(f"      Cluster ID: {item['cluster_id']}")
        
        return True, result
        
    except Exception as e:
        print(f"Complete pipeline test failed: {e}")
        import traceback
        traceback.print_exc()
        return False, None

def main():
    """Main debug function"""
    print("TOPIC MODELING DEBUG")
    print("=" * 50)
    
    # Test 1: Embeddings
    embeddings_ok, model = test_embeddings()
    
    # Test 2: New Pipeline
    if embeddings_ok:
        new_pipeline_ok, new_result = test_new_pipeline()
    else:
        print("\n Skipping new pipeline test (embeddings failed)")
        new_pipeline_ok = False
        new_result = None
    
    # Test 3: Complete Pipeline
    if embeddings_ok:
        complete_pipeline_ok, complete_result = test_complete_pipeline()
    else:
        print("\n  Skipping complete pipeline test (embeddings failed)")
        complete_pipeline_ok = False
        complete_result = None
    
    # Summary
    print("\n" + "=" * 50)
    print(" DEBUG SUMMARY")
    print("=" * 50)
    
    print(f"Embeddings: {'' if embeddings_ok else ''}")
    print(f"New Pipeline: {'' if new_pipeline_ok else ''}")
    print(f"Complete Pipeline: {'' if complete_pipeline_ok else ''}")
    
    if not embeddings_ok:
        print(f"\n ROOT CAUSE: Embeddings not working")
        print(f"   Solution: Install sentence-transformers")
        print(f"   Command: pip install sentence-transformers")
    elif new_pipeline_ok and complete_pipeline_ok:
        print(f"\n Topic Modeling is working!")
        
        # Check if topics are actually created
        new_topics = new_result.get('topics', []) if new_result else []
        complete_topics = complete_result.get('topics', []) if complete_result else []
        
        if len(new_topics) == 0 and len(complete_topics) == 0:
            print(f"  But no topics are being created")
            print(f"   Possible causes:")
            print(f"   1. Not enough vocabulary items")
            print(f"   2. All items have same embedding")
            print(f"   3. KMeans clustering issue")
        else:
            print(f"   New Pipeline topics: {len(new_topics)}")
            print(f"   Complete Pipeline topics: {len(complete_topics)}")
    else:
        print(f"\n Pipeline issues detected")

if __name__ == "__main__":
    main()