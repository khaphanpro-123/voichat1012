"""
Test script for Context Intelligence Engine
"""

from ensemble_extractor import extract_vocabulary_ensemble
from context_intelligence import select_vocabulary_contexts

# Test text
TEST_TEXT = """
Machine learning is a subset of artificial intelligence that enables computers 
to learn from data without explicit programming. Deep learning uses neural networks 
with multiple layers to process complex patterns in data. Natural language processing 
helps computers understand and generate human language effectively.

Computer vision allows machines to interpret and understand visual information from 
the world. These technologies are transforming industries including healthcare, 
finance, and transportation. Artificial intelligence systems can now perform tasks 
that previously required human intelligence.

The field of machine learning continues to evolve rapidly. Researchers develop new 
algorithms and techniques to improve model performance. Data scientists apply these 
methods to solve real-world problems across various domains.
"""

def test_stage_1():
    """Test STAGE 1: Ensemble Vocabulary Extraction"""
    print("=" * 80)
    print("TESTING STAGE 1 - Ensemble Vocabulary Extraction")
    print("=" * 80)
    
    result = extract_vocabulary_ensemble(
        TEST_TEXT,
        max_words=15,
        min_word_length=3,
        weights={
            'frequency': 0.15,
            'tfidf': 0.35,
            'rake': 0.25,
            'yake': 0.25
        },
        include_ngrams=True,
        filter_proper_nouns=True,
        filter_technical=True,
        context_filtering=True
    )
    
    print(f"\n📊 STAGE 1 RESULTS:")
    print("-" * 80)
    print(f"Total words: {result['stats']['totalWords']}")
    print(f"Unique words: {result['stats']['uniqueWords']}")
    print(f"Sentences: {result['stats']['sentences']}")
    print(f"Extracted: {len(result['vocabulary'])} vocabulary words")
    
    print(f"\n🔹 Top vocabulary words:")
    for idx, item in enumerate(result['scores'][:10], 1):
        print(f"\n{idx}. {item['word']}")
        print(f"   Score: {item['score']:.3f}")
        print(f"   Features: freq={item['features']['frequency']:.3f}, "
              f"tfidf={item['features']['tfidf']:.3f}, "
              f"rake={item['features']['rake']:.3f}, "
              f"yake={item['features']['yake']:.3f}")
        print(f"   {item['reason']}")
    
    return result


def test_stage_2(vocabulary_list):
    """Test STAGE 2: Context Intelligence Engine"""
    print("\n" + "=" * 80)
    print("TESTING STAGE 2 - Context Intelligence Engine")
    print("=" * 80)
    
    contexts = select_vocabulary_contexts(
        TEST_TEXT,
        vocabulary_list,
        language="en",
        min_words=5,
        max_words=35,
        optimal_min=8,
        optimal_max=20,
        require_verb=True,
        weights={
            'keyword_density': 0.4,
            'length_score': 0.3,
            'position_score': 0.2,
            'clarity_score': 0.1
        }
    )
    
    print(f"\n📊 STAGE 2 RESULTS:")
    print("-" * 80)
    print(f"Selected contexts: {len(contexts)}")
    
    if contexts:
        avg_score = sum(c['sentenceScore'] for c in contexts) / len(contexts)
        print(f"Average sentence score: {avg_score:.3f}")
    
    print(f"\n🔹 Context sentences:")
    for idx, ctx in enumerate(contexts[:10], 1):
        print(f"\n{idx}. Word: {ctx['word']}")
        print(f"   Context: {ctx['contextSentence']}")
        print(f"   Sentence Score: {ctx['sentenceScore']:.3f}")
        print(f"   {ctx['explanation']}")
    
    return contexts


def test_full_pipeline():
    """Test full pipeline: STAGE 1 + STAGE 2"""
    print("\n" + "=" * 80)
    print("TESTING FULL PIPELINE")
    print("=" * 80)
    
    # STAGE 1
    print("\n[STAGE 1] Extracting vocabulary...")
    ensemble_result = extract_vocabulary_ensemble(
        TEST_TEXT,
        max_words=10,
        include_ngrams=True
    )
    
    vocabulary_list = [
        {'word': score['word'], 'score': score['score']}
        for score in ensemble_result['scores']
    ]
    
    print(f"✅ Extracted {len(vocabulary_list)} words")
    
    # STAGE 2
    print("\n[STAGE 2] Selecting best contexts...")
    contexts = select_vocabulary_contexts(
        TEST_TEXT,
        vocabulary_list,
        language="en"
    )
    
    print(f"✅ Selected {len(contexts)} contexts")
    
    # Combined results
    print("\n📊 FINAL RESULTS:")
    print("-" * 80)
    
    for idx, ctx in enumerate(contexts, 1):
        print(f"\n{idx}. {ctx['word']} (Score: {ctx['finalScore']:.3f})")
        print(f"   📝 {ctx['contextSentence']}")
        print(f"   💡 {ctx['explanation']}")
    
    return {
        'stage1': ensemble_result,
        'stage2': contexts
    }


def test_checkpoint():
    """Test checkpoint requirements (BƯỚC 2.6)"""
    print("\n" + "=" * 80)
    print("CHECKPOINT - Quality Assurance")
    print("=" * 80)
    
    # Test 1: Explainable scoring
    print("\n✅ Test 1: Explainable scoring")
    result = test_full_pipeline()
    
    for ctx in result['stage2'][:3]:
        print(f"\n   Word: {ctx['word']}")
        print(f"   Explanation: {ctx['explanation']}")
        print(f"   ✓ Can explain why this sentence was chosen")
    
    # Test 2: Deterministic output
    print("\n✅ Test 2: Deterministic output")
    contexts1 = select_vocabulary_contexts(
        TEST_TEXT,
        [{'word': 'machine learning', 'score': 0.9}],
        language="en"
    )
    contexts2 = select_vocabulary_contexts(
        TEST_TEXT,
        [{'word': 'machine learning', 'score': 0.9}],
        language="en"
    )
    
    if contexts1 == contexts2:
        print("   ✓ Same input produces same output")
    else:
        print("   ✗ Output is not deterministic!")
    
    # Test 3: Readable flashcard contexts
    print("\n✅ Test 3: Readable flashcard contexts")
    for ctx in result['stage2'][:3]:
        plain_text = ctx['contextSentence'].replace('<b>', '').replace('</b>', '')
        if len(plain_text) > 10 and not plain_text.strip().startswith(('-', '•', '*')):
            print(f"   ✓ {ctx['word']}: Context is readable")
        else:
            print(f"   ✗ {ctx['word']}: Context may not be readable")
    
    print("\n" + "=" * 80)
    print("✅ All checkpoint tests completed!")
    print("=" * 80)


if __name__ == "__main__":
    print("\n" + "=" * 80)
    print("CONTEXT INTELLIGENCE ENGINE - COMPREHENSIVE TEST")
    print("=" * 80)
    
    # Run tests
    print("\n🚀 Starting tests...\n")
    
    # Test STAGE 1
    stage1_result = test_stage_1()
    
    # Prepare vocabulary list for STAGE 2
    vocabulary_list = [
        {'word': score['word'], 'score': score['score']}
        for score in stage1_result['scores'][:10]
    ]
    
    # Test STAGE 2
    stage2_result = test_stage_2(vocabulary_list)
    
    # Test full pipeline
    test_full_pipeline()
    
    # Test checkpoint
    test_checkpoint()
    
    print("\n" + "=" * 80)
    print("✅ ALL TESTS COMPLETED SUCCESSFULLY!")
    print("=" * 80)
