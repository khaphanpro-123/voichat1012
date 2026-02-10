"""
Test STEP 3B: Statistical + Semantic Refinement
"""
from phrase_centric_extractor import PhraseCentricExtractor

test_text = """
Climate Change and Environmental Protection

Climate change is one of the most pressing environmental problems today. 
The burning of fossil fuels releases greenhouse gases into the atmosphere.
Air pollution and water pollution are major environmental issues.
Deforestation contributes to biodiversity loss and habitat destruction.

Renewable energy sources like solar power and wind energy can help reduce 
carbon emissions. Environmental protection requires global cooperation.
Sustainable development and green technology are essential solutions.
Conservation efforts must focus on protecting endangered species.
"""

print("=" * 80)
print("TESTING STEP 3B: Statistical + Semantic Refinement")
print("=" * 80)

extractor = PhraseCentricExtractor()
result = extractor.extract_vocabulary(
    text=test_text,
    document_title="Climate Change and Environmental Protection",
    max_phrases=20
)

print("\n" + "=" * 80)
print("RESULTS")
print("=" * 80)
print(f"\nTotal phrases extracted: {len(result)}")

print("\n📊 Top 10 Phrases with Metadata:")
print("-" * 80)
for i, phrase in enumerate(result[:10], 1):
    print(f"\n{i}. {phrase['phrase']}")
    print(f"   Frequency: {phrase.get('frequency', 0)}")
    print(f"   TF-IDF: {phrase.get('tfidf_score', 0):.4f}")
    print(f"   Semantic Role: {phrase.get('semantic_role', 'N/A')}")
    print(f"   Priority: {phrase.get('priority', 'N/A')}")
    print(f"   Cluster ID: {phrase.get('cluster_id', 'N/A')}")
    print(f"   Cluster Rank: {phrase.get('cluster_rank', 'N/A')}")
    print(f"   Centroid Similarity: {phrase.get('centroid_similarity', 0):.4f}")

print("\n✅ Test completed!")
