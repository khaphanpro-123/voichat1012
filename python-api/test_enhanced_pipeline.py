"""
Test Enhanced Pipeline với tất cả improvements
"""

import os
from enhanced_pipeline import EnhancedPipeline
from knowledge_graph import KnowledgeGraph
from rag_system import RAGSystem


def test_heading_detection():
    """Test STAGE 2: Heading Detection"""
    print("\n" + "="*80)
    print("TEST 1: HEADING DETECTION")
    print("="*80)
    
    from heading_detector import HeadingDetector
    
    test_text = """
# Introduction

Machine learning is transforming industries.

## Background

Deep learning has achieved remarkable results.

### Neural Networks

Convolutional neural networks excel at image processing.

## Applications

Natural language processing enables chatbots.
"""
    
    detector = HeadingDetector()
    sentences = [
        "Machine learning is transforming industries.",
        "Deep learning has achieved remarkable results.",
        "Convolutional neural networks excel at image processing.",
        "Natural language processing enables chatbots."
    ]
    
    structure = detector.parse_document_structure(test_text, sentences)
    
    print(f"\n✓ Detected {len(structure.headings)} headings")
    for h in structure.headings:
        print(f"  {h.level.name}: {h.text}")
    
    print(f"\n✓ Assigned {len(structure.sentence_to_heading)} sentences")
    
    assert len(structure.headings) >= 4, "Should detect at least 4 headings"
    print("\n✅ PASS: Heading Detection")


def test_bm25_filtering():
    """Test STAGE 5: BM25 Filtering"""
    print("\n" + "="*80)
    print("TEST 2: BM25 FILTERING")
    print("="*80)
    
    from bm25_filter import BM25Filter
    
    sentences = [
        "Machine learning is a subset of artificial intelligence.",
        "Deep learning uses neural networks.",
        "Natural language processing helps computers."
    ]
    
    headings = ["Introduction", "Background"]
    
    bm25_filter = BM25Filter(sentences, headings)
    
    test_phrases = [
        {
            'word': 'machine learning',
            'sentenceId': 's1',
            'contextSentence': sentences[0],
            'finalScore': 0.85
        },
        {
            'word': 'deep learning',
            'sentenceId': 's2',
            'contextSentence': sentences[1],
            'finalScore': 0.80
        }
    ]
    
    # Test scoring
    score = bm25_filter.score_phrase_to_sentence(
        'machine learning',
        's1',
        sentences[0]
    )
    
    print(f"\n✓ BM25 score for 'machine learning': {score:.4f}")
    assert score > 0, "BM25 score should be positive"
    
    # Test filtering
    filtered = bm25_filter.filter_phrases(test_phrases, sentence_threshold=0.0)
    print(f"\n✓ Filtered {len(test_phrases)} → {len(filtered)} phrases")
    
    assert len(filtered) > 0, "Should have filtered phrases"
    print("\n✅ PASS: BM25 Filtering")


def test_complete_pipeline():
    """Test Complete Enhanced Pipeline"""
    print("\n" + "="*80)
    print("TEST 3: COMPLETE ENHANCED PIPELINE")
    print("="*80)
    
    test_text = """
# Machine Learning Fundamentals

Machine learning is a subset of artificial intelligence.

## Supervised Learning

Supervised learning uses labeled data for training.

### Classification

Classification algorithms predict discrete categories.

### Regression

Regression models predict continuous values.

## Unsupervised Learning

Unsupervised learning finds patterns in unlabeled data.

### Clustering

Clustering groups similar data points together.

# Deep Learning

Deep learning uses neural networks with multiple layers.

## Convolutional Networks

CNNs excel at image processing tasks.

## Recurrent Networks

RNNs handle sequential data effectively.
"""
    
    # Initialize systems
    kg = KnowledgeGraph(storage_path="test_kg_pipeline")
    rag = RAGSystem(kg, llm_api_key=os.getenv("OPENAI_API_KEY"))
    
    # Initialize pipeline
    pipeline = EnhancedPipeline(kg, rag)
    
    # Process document
    result = pipeline.process_document(
        text=test_text,
        document_id="doc_test_complete",
        document_title="ML Fundamentals",
        max_words=15,
        use_bm25=True,
        bm25_threshold=0.3
    )
    
    print(f"\n✓ Processed document: {result['document_id']}")
    print(f"✓ Vocabulary: {result['vocabulary_count']} phrases")
    print(f"✓ Headings: {result['heading_count']} detected")
    print(f"✓ Flashcards: {result['flashcards_count']} generated")
    
    # Verify results
    assert result['vocabulary_count'] > 0, "Should extract vocabulary"
    assert result['heading_count'] > 0, "Should detect headings"
    assert result['bm25_enabled'] == True, "BM25 should be enabled"
    
    # Check vocabulary has heading info
    for vocab in result['vocabulary'][:3]:
        print(f"\n  Phrase: {vocab['word']}")
        print(f"    Heading: {vocab.get('heading_text', 'N/A')}")
        print(f"    BM25: {vocab.get('bm25_combined', 0):.3f}")
        print(f"    Validation: {vocab.get('validation_score', 0):.3f}")
        
        assert 'heading_text' in vocab, "Should have heading info"
        assert 'bm25_combined' in vocab, "Should have BM25 score"
        assert 'validation_score' in vocab, "Should have validation score"
    
    print("\n✅ PASS: Complete Enhanced Pipeline")


def test_contrastive_signal():
    """Test STAGE 7: Contrastive Learning Signal"""
    print("\n" + "="*80)
    print("TEST 4: CONTRASTIVE LEARNING SIGNAL")
    print("="*80)
    
    from heading_detector import HeadingDetector, DocumentStructure, Heading, HeadingLevel
    
    # Mock document structure
    headings = [
        Heading("H1_0", HeadingLevel.H1, "Introduction", 0),
        Heading("H2_0", HeadingLevel.H2, "Background", 1)
    ]
    
    structure = DocumentStructure(
        headings=headings,
        hierarchy={},
        sentence_to_heading={
            's1': 'H1_0',
            's2': 'H1_0',
            's3': 'H2_0'
        }
    )
    
    # Mock contexts
    contexts = [
        {'word': 'machine learning', 'sentenceId': 's1', 'heading_id': 'H1_0'},
        {'word': 'deep learning', 'sentenceId': 's2', 'heading_id': 'H1_0'},
        {'word': 'neural network', 'sentenceId': 's3', 'heading_id': 'H2_0'}
    ]
    
    # Initialize pipeline
    kg = KnowledgeGraph(storage_path="test_kg_contrastive")
    rag = RAGSystem(kg)
    pipeline = EnhancedPipeline(kg, rag)
    
    # Add contrastive signal
    contexts = pipeline._add_contrastive_signal(contexts, structure)
    
    print("\n✓ Added contrastive signals:")
    for ctx in contexts:
        print(f"\n  {ctx['word']}:")
        print(f"    Positive: {ctx.get('positive_examples', [])}")
        print(f"    Negative: {ctx.get('negative_examples', [])}")
    
    # Verify
    assert 'positive_examples' in contexts[0], "Should have positive examples"
    assert 'negative_examples' in contexts[0], "Should have negative examples"
    
    print("\n✅ PASS: Contrastive Learning Signal")


def test_llm_validation():
    """Test STAGE 9: LLM Validation"""
    print("\n" + "="*80)
    print("TEST 5: LLM VALIDATION")
    print("="*80)
    
    # Mock contexts
    contexts = [
        {
            'word': 'machine learning',
            'contextSentence': 'Machine learning is a subset of AI.',
            'finalScore': 0.85
        },
        {
            'word': 'xyz',
            'contextSentence': 'This is a test sentence.',
            'finalScore': 0.50
        }
    ]
    
    # Initialize pipeline
    kg = KnowledgeGraph(storage_path="test_kg_validation")
    rag = RAGSystem(kg)
    pipeline = EnhancedPipeline(kg, rag)
    
    # Add validation scores
    contexts = pipeline._add_llm_validation_scores(contexts)
    
    print("\n✓ Added validation scores:")
    for ctx in contexts:
        print(f"\n  {ctx['word']}:")
        print(f"    Groundedness: {ctx['groundedness']:.2f}")
        print(f"    Learning value: {ctx['learning_value']:.2f}")
        print(f"    Academic relevance: {ctx['academic_relevance']:.2f}")
        print(f"    Validation score: {ctx['validation_score']:.2f}")
    
    # Verify
    assert contexts[0]['groundedness'] == 1.0, "Should be grounded"
    assert 'validation_score' in contexts[0], "Should have validation score"
    
    print("\n✅ PASS: LLM Validation")


if __name__ == "__main__":
    print("\n" + "="*80)
    print("ENHANCED PIPELINE TEST SUITE")
    print("="*80)
    
    try:
        test_heading_detection()
        test_bm25_filtering()
        test_contrastive_signal()
        test_llm_validation()
        test_complete_pipeline()
        
        print("\n" + "="*80)
        print("✅ ALL TESTS PASSED")
        print("="*80)
        
    except AssertionError as e:
        print(f"\n❌ TEST FAILED: {e}")
    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        import traceback
        traceback.print_exc()
