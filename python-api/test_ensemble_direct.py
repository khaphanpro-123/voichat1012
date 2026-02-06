"""
Test ensemble extractor directly
"""

from ensemble_extractor import extract_vocabulary_ensemble

# Sample text
text = """
Artificial intelligence is transforming the world. Machine learning algorithms 
can analyze vast amounts of data to identify patterns and make predictions. 
Deep learning, a subset of machine learning, uses neural networks with multiple 
layers to process information. Natural language processing enables computers 
to understand and generate human language. Computer vision allows machines 
to interpret and analyze visual information from the world.
"""

print("Testing ensemble extractor...")
print(f"Text length: {len(text)} characters")
print()

try:
    result = extract_vocabulary_ensemble(
        text,
        max_words=15,
        min_word_length=3,
        include_ngrams=True
    )
    
    print(f"✅ Extraction successful!")
    print(f"Found {len(result['scores'])} words")
    print()
    
    print("Top 10 words:")
    for i, score in enumerate(result['scores'][:10], 1):
        print(f"{i}. {score['word']}: {score['score']:.3f}")
        print(f"   Features: {score['features']}")
    
    print()
    print(f"Stats: {result['stats']}")

except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()
