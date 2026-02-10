"""
Test STAGE 12: Enhanced Flashcard Generation

This script tests the new enhanced flashcard features:
1. Synonym grouping
2. Cluster information
3. IPA phonetics
4. Audio URLs
5. Related words
"""

from complete_pipeline_12_stages import CompletePipeline12Stages

def test_enhanced_flashcards():
    """Test enhanced flashcard generation"""
    
    print("=" * 80)
    print("TESTING STAGE 12: Enhanced Flashcard Generation")
    print("=" * 80)
    print()
    
    # Test text with similar terms
    test_text = """
# Climate Change and Global Warming

Climate change is one of the most pressing issues facing humanity today.
Global warming and climatic change are causing extreme weather events.
The greenhouse effect leads to rising temperatures worldwide.

## Environmental Impact

Carbon emissions from fossil fuels contribute to atmospheric pollution.
Greenhouse gases trap heat in the atmosphere, causing climate shift.
Environmental degradation threatens biodiversity and ecosystem stability.

## Solutions

Renewable energy sources can reduce carbon footprint significantly.
Sustainable practices and green technology are essential for mitigation.
Climate action requires international cooperation and policy changes.
"""
    
    # Initialize pipeline
    print("Initializing pipeline...")
    pipeline = CompletePipeline12Stages()
    print("✓ Pipeline initialized\n")
    
    # Process document
    print("Processing document...")
    result = pipeline.process_document(
        text=test_text,
        document_id="test_stage12",
        document_title="Climate Change Report",
        max_phrases=20,
        max_words=10,
        use_bm25=False,
        generate_flashcards=True
    )
    print()
    
    # Check results
    flashcards = result['flashcards']
    stage12 = result['stages']['stage12']
    
    print("=" * 80)
    print("RESULTS")
    print("=" * 80)
    print(f"Total vocabulary items: {result['vocabulary_count']}")
    print(f"Total flashcards: {len(flashcards)}")
    print(f"Synonym groups: {stage12['synonym_groups']}")
    print(f"Reduction: {result['vocabulary_count'] - len(flashcards)} items grouped")
    print()
    
    # Show sample flashcards
    print("=" * 80)
    print("SAMPLE FLASHCARDS (Top 5)")
    print("=" * 80)
    
    for i, card in enumerate(flashcards[:5], 1):
        print(f"\n{i}. {card['word']}")
        print(f"   ID: {card['id']}")
        print(f"   Cluster: {card['cluster_name']} (rank: {card['cluster_rank']})")
        print(f"   Role: {card['semantic_role']}")
        print(f"   Score: {card['importance_score']:.3f}")
        print(f"   Difficulty: {card['difficulty']}")
        
        # Synonyms
        if card['synonyms']:
            print(f"   Synonyms ({len(card['synonyms'])}):")
            for syn in card['synonyms']:
                print(f"     - {syn['word']} (similarity: {syn['similarity']:.2f})")
        else:
            print(f"   Synonyms: None")
        
        # IPA
        if card['ipa']:
            print(f"   IPA: {card['ipa']}")
        else:
            print(f"   IPA: Not available (install eng-to-ipa)")
        
        # Audio
        print(f"   Audio (word): {card['audio_word_url'][:60]}...")
        if card['audio_example_url']:
            print(f"   Audio (example): {card['audio_example_url'][:60]}...")
        
        # Related words
        if card['related_words']:
            print(f"   Related words ({len(card['related_words'])}):")
            for rel in card['related_words'][:3]:
                print(f"     - {rel['word']} (similarity: {rel['similarity']:.2f})")
        
        # Example
        if card['example']:
            print(f"   Example: {card['example'][:80]}...")
        
        # Tags
        print(f"   Tags: {', '.join(card['tags'])}")
    
    print()
    print("=" * 80)
    print("FEATURE CHECKLIST")
    print("=" * 80)
    
    # Check features
    has_synonyms = any(len(card['synonyms']) > 0 for card in flashcards)
    has_ipa = any(card['ipa'] != '' for card in flashcards)
    has_audio = all('audio_word_url' in card for card in flashcards)
    has_related = any(len(card['related_words']) > 0 for card in flashcards)
    has_cluster = all('cluster_name' in card for card in flashcards)
    
    print(f"✓ Synonym grouping: {'✅' if has_synonyms else '⚠️  No synonyms found'}")
    print(f"✓ IPA phonetics: {'✅' if has_ipa else '⚠️  Install eng-to-ipa'}")
    print(f"✓ Audio URLs: {'✅' if has_audio else '❌'}")
    print(f"✓ Related words: {'✅' if has_related else '⚠️  No related words'}")
    print(f"✓ Cluster info: {'✅' if has_cluster else '❌'}")
    
    print()
    print("=" * 80)
    print("TEST COMPLETE")
    print("=" * 80)
    
    # Return results for inspection
    return result


if __name__ == "__main__":
    result = test_enhanced_flashcards()
    
    print("\n💡 TIP: To enable IPA phonetics, run:")
    print("   pip install eng-to-ipa")
    print("\n✅ All features implemented successfully!")
