"""
Test Upload Document Endpoint
"""

import requests
import os

# API URL
API_URL = "http://127.0.0.1:8000"

def test_upload_txt():
    """Test upload .txt file"""
    print("\n=== TEST 1: Upload TXT File ===")
    
    # Create sample text file
    sample_text = """
    Artificial intelligence is transforming the world. Machine learning algorithms 
    can analyze vast amounts of data to identify patterns and make predictions. 
    Deep learning, a subset of machine learning, uses neural networks with multiple 
    layers to process information. Natural language processing enables computers 
    to understand and generate human language. Computer vision allows machines 
    to interpret and analyze visual information from the world.
    """
    
    # Save to file
    test_file = "test_sample.txt"
    with open(test_file, "w", encoding="utf-8") as f:
        f.write(sample_text)
    
    try:
        # Upload file
        with open(test_file, "rb") as f:
            files = {"file": (test_file, f, "text/plain")}
            data = {
                "max_words": 15,
                "language": "en"
            }
            
            print(f"Uploading {test_file}...")
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
            print("\nTop 5 vocabulary words:")
            for i, vocab in enumerate(result['vocabulary'][:5], 1):
                print(f"{i}. {vocab['word']} (score: {vocab['finalScore']:.3f})")
                print(f"   Context: {vocab['contextSentence'][:100]}...")
        else:
            print(f"❌ Error: {response.status_code}")
            print(response.text)
    
    finally:
        # Cleanup
        if os.path.exists(test_file):
            os.remove(test_file)


def test_health_check():
    """Test health check endpoint"""
    print("\n=== TEST 0: Health Check ===")
    
    try:
        response = requests.get(f"{API_URL}/")
        
        if response.status_code == 200:
            result = response.json()
            print("✅ API is online!")
            print(f"Version: {result['version']}")
            print(f"Stages: {list(result['stages'].keys())}")
        else:
            print(f"❌ Error: {response.status_code}")
    
    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to API. Make sure server is running at http://127.0.0.1:8000")
        return False
    
    return True


def test_text_extraction():
    """Test text extraction endpoint (without file upload)"""
    print("\n=== TEST 2: Text Extraction (No Upload) ===")
    
    sample_text = """
    Climate change is one of the most pressing challenges facing humanity today. 
    Rising global temperatures are causing ice caps to melt, sea levels to rise, 
    and weather patterns to become more extreme. Renewable energy sources like 
    solar and wind power offer sustainable alternatives to fossil fuels. 
    International cooperation is essential to address this global crisis.
    """
    
    try:
        response = requests.post(
            f"{API_URL}/api/smart-vocabulary-extract",
            json={
                "text": sample_text,
                "max_words": 10,
                "language": "en"
            }
        )
        
        if response.status_code == 200:
            result = response.json()
            print("✅ Text extraction successful!")
            print(f"Vocabulary count: {result['count']}")
            print("\nTop 5 vocabulary words:")
            for i, vocab in enumerate(result['vocabulary'][:5], 1):
                print(f"{i}. {vocab['word']} (score: {vocab['score']:.3f})")
        else:
            print(f"❌ Error: {response.status_code}")
            print(response.text)
    
    except Exception as e:
        print(f"❌ Error: {e}")


if __name__ == "__main__":
    print("=" * 60)
    print("PYTHON API UPLOAD TEST")
    print("=" * 60)
    
    # Test 0: Health check
    if not test_health_check():
        print("\n⚠️  Server is not running. Please start it first:")
        print("   cd python-api")
        print("   python main.py")
        exit(1)
    
    # Test 1: Upload file
    test_upload_txt()
    
    # Test 2: Text extraction
    test_text_extraction()
    
    print("\n" + "=" * 60)
    print("ALL TESTS COMPLETED")
    print("=" * 60)
