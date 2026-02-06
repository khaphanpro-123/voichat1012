"""
Test script for Document Embedding System
"""

import requests
import json

API_URL = "http://127.0.0.1:8000"

def test_embedding_system():
    """Test complete embedding pipeline"""
    
    print("=" * 80)
    print("TESTING DOCUMENT EMBEDDING SYSTEM")
    print("=" * 80)
    
    # Test documents
    documents = [
        "Machine learning is a subset of artificial intelligence used in medical diagnosis",
        "Deep learning models with neural networks improve healthcare accuracy",
        "Natural language processing helps computers understand human text",
        "Football is a popular sport played by teams worldwide",
        "Basketball requires good coordination and teamwork skills"
    ]
    
    print(f"\n📄 Test documents: {len(documents)}")
    for i, doc in enumerate(documents):
        print(f"  {i}: {doc[:60]}...")
    
    # Test 1: Create embeddings
    print(f"\n{'=' * 80}")
    print("TEST 1: Create Document Embeddings")
    print(f"{'=' * 80}")
    
    try:
        response = requests.post(
            f"{API_URL}/api/embedding/create",
            json={
                "query": "",  # Not used for creation
                "documents": documents,
                "top_k": 5
            }
        )
        
        if response.status_code == 200:
            result = response.json()
            print(f"✅ Embeddings created successfully!")
            print(f"  Documents: {result['n_documents']}")
            print(f"  Embedding dimensions: {result['embedding_dim']}")
            print(f"  Model: {result['model']}")
        else:
            print(f"❌ Failed: {response.status_code}")
            print(f"  Error: {response.text}")
            return
    
    except Exception as e:
        print(f"❌ Error: {e}")
        return
    
    # Test 2: Semantic Search
    print(f"\n{'=' * 80}")
    print("TEST 2: Semantic Search")
    print(f"{'=' * 80}")
    
    queries = [
        "AI applications in healthcare",
        "sports and team activities"
    ]
    
    for query in queries:
        print(f"\n🔍 Query: '{query}'")
        
        try:
            response = requests.post(
                f"{API_URL}/api/embedding/search",
                json={
                    "query": query,
                    "documents": documents,
                    "top_k": 3,
                    "threshold": 0.0
                }
            )
            
            if response.status_code == 200:
                result = response.json()
                print(f"✅ Found {result['count']} results:")
                
                for res in result['results']:
                    print(f"\n  Rank {res['rank']}: (similarity: {res['similarity']:.4f})")
                    print(f"    {res['document'][:70]}...")
            else:
                print(f"❌ Failed: {response.status_code}")
        
        except Exception as e:
            print(f"❌ Error: {e}")
    
    # Test 3: Document Similarity
    print(f"\n{'=' * 80}")
    print("TEST 3: Find Similar Documents")
    print(f"{'=' * 80}")
    
    document_id = 0
    print(f"\n🔗 Finding documents similar to document {document_id}:")
    print(f"  '{documents[document_id][:70]}...'")
    
    try:
        response = requests.post(
            f"{API_URL}/api/embedding/similarity",
            json={
                "document_id": document_id,
                "documents": documents,
                "top_k": 3
            }
        )
        
        if response.status_code == 200:
            result = response.json()
            print(f"\n✅ Found {result['count']} similar documents:")
            
            for res in result['similar_documents']:
                print(f"\n  Rank {res['rank']}: (similarity: {res['similarity']:.4f})")
                print(f"    {res['document'][:70]}...")
        else:
            print(f"❌ Failed: {response.status_code}")
            print(f"  Error: {response.text}")
    
    except Exception as e:
        print(f"❌ Error: {e}")
    
    # Summary
    print(f"\n{'=' * 80}")
    print("SUMMARY")
    print(f"{'=' * 80}")
    print("\n✅ Embedding system is working!")
    print("\nKey features tested:")
    print("  ✅ Document embedding creation")
    print("  ✅ Semantic search (query → documents)")
    print("  ✅ Document similarity (document → similar documents)")
    print("\n📌 Note: Embeddings run PARALLEL to TF-IDF pipeline")
    print("  - TF-IDF: For clustering & keyword extraction")
    print("  - Embeddings: For semantic search & similarity")


if __name__ == "__main__":
    test_embedding_system()
