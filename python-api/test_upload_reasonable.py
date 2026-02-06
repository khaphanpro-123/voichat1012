"""
Test Upload với số từ hợp lý
"""

import requests

API_URL = "http://127.0.0.1:8000"

def test_upload_with_reasonable_words():
    """Test upload với max_words=20 (hợp lý)"""
    print("\n=== TEST: Upload với max_words=20 ===")
    
    # Create sample text file
    sample_text = """
    Artificial intelligence is transforming the world. Machine learning algorithms 
    can analyze vast amounts of data to identify patterns and make predictions. 
    Deep learning, a subset of machine learning, uses neural networks with multiple 
    layers to process information. Natural language processing enables computers 
    to understand and generate human language. Computer vision allows machines 
    to interpret and analyze visual information from the world.
    
    The applications of AI are diverse and growing. In healthcare, AI helps diagnose 
    diseases and recommend treatments. In finance, it detects fraud and manages 
    investments. In transportation, autonomous vehicles use AI to navigate safely.
    """
    
    # Save to file
    test_file = "test_reasonable.txt"
    with open(test_file, "w", encoding="utf-8") as f:
        f.write(sample_text)
    
    try:
        # Upload file with reasonable max_words
        with open(test_file, "rb") as f:
            files = {"file": (test_file, f, "text/plain")}
            data = {
                "max_words": 20,  # Reasonable number
                "language": "en"
            }
            
            print(f"Uploading {test_file} with max_words=20...")
            response = requests.post(
                f"{API_URL}/api/upload-document",
                files=files,
                data=data
            )
        
        if response.status_code == 200:
            result = response.json()
            print("✅ Upload successful!")
            print(f"Document ID: {result['document_id']}")
            print(f"Vocabulary count: {result['vocabulary_count']}")
            print(f"Flashcards count: {result['flashcards_count']}")
            print("\nTop 10 vocabulary words:")
            for i, vocab in enumerate(result['vocabulary'][:10], 1):
                print(f"{i}. {vocab['word']} (score: {vocab['finalScore']:.3f})")
                print(f"   Context: {vocab['contextSentence'][:80]}...")
        else:
            print(f"❌ Error: {response.status_code}")
            print(response.text)
    
    except Exception as e:
        print(f"❌ Error: {e}")
    
    finally:
        # Cleanup
        import os
        if os.path.exists(test_file):
            os.remove(test_file)


def test_upload_with_too_many_words():
    """Test upload với max_words=2000 (quá nhiều, sẽ bị giới hạn)"""
    print("\n=== TEST: Upload với max_words=2000 (sẽ bị giới hạn xuống 100) ===")
    
    sample_text = """
    Climate change is one of the most pressing challenges facing humanity today. 
    Rising global temperatures are causing ice caps to melt, sea levels to rise, 
    and weather patterns to become more extreme.
    """
    
    test_file = "test_too_many.txt"
    with open(test_file, "w", encoding="utf-8") as f:
        f.write(sample_text)
    
    try:
        with open(test_file, "rb") as f:
            files = {"file": (test_file, f, "text/plain")}
            data = {
                "max_words": 2000,  # Too many!
                "language": "en"
            }
            
            print(f"Uploading {test_file} with max_words=2000...")
            response = requests.post(
                f"{API_URL}/api/upload-document",
                files=files,
                data=data
            )
        
        if response.status_code == 200:
            result = response.json()
            print("✅ Upload successful!")
            print(f"Vocabulary count: {result['vocabulary_count']} (limited to max 100)")
        else:
            print(f"❌ Error: {response.status_code}")
    
    except Exception as e:
        print(f"❌ Error: {e}")
    
    finally:
        import os
        if os.path.exists(test_file):
            os.remove(test_file)


if __name__ == "__main__":
    print("=" * 60)
    print("PYTHON API UPLOAD TEST - REASONABLE WORDS")
    print("=" * 60)
    
    # Test 1: Reasonable number
    test_upload_with_reasonable_words()
    
    # Test 2: Too many words (will be limited)
    test_upload_with_too_many_words()
    
    print("\n" + "=" * 60)
    print("TESTS COMPLETED")
    print("=" * 60)
    print("\n💡 TIP: Sử dụng max_words=20-50 cho kết quả tốt nhất!")
