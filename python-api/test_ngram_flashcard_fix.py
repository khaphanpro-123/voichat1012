"""
Test script để verify N-gram và Flashcard fixes
"""

import requests
import json

BASE_URL = "http://127.0.0.1:8000"

def test_upload_with_params():
    """Test upload với tham số mới"""
    
    print("=" * 80)
    print("TEST: Upload Document với N-gram và Flashcard Fixes")
    print("=" * 80)
    
    # Tạo test file
    test_content = """
    Machine learning is a subset of artificial intelligence that enables computers 
    to learn from data without explicit programming. Deep learning uses neural networks 
    with multiple layers to process complex patterns in healthcare systems.
    
    Natural language processing helps computers understand human language and medical records.
    Computer vision allows machines to interpret visual information from medical images.
    
    The healthcare industry benefits from artificial intelligence in diagnosis accuracy,
    treatment planning, and patient care. Medical professionals use machine learning
    algorithms to analyze patient data and predict health outcomes.
    
    Deep neural networks can identify patterns in medical imaging that human doctors
    might miss. This technology improves early detection of diseases and helps save lives.
    """
    
    # Save to file
    with open("test_sample.txt", "w", encoding="utf-8") as f:
        f.write(test_content)
    
    print("\n📄 Test file created: test_sample.txt")
    print(f"   Content length: {len(test_content)} characters")
    
    # Test với tham số mới
    print("\n🚀 Uploading with new parameters...")
    print("   max_words: 50")
    print("   max_flashcards: 30")
    
    try:
        with open("test_sample.txt", "rb") as f:
            files = {"file": ("test_sample.txt", f, "text/plain")}
            data = {
                "max_words": 50,
                "language": "en",
                "max_flashcards": 30
            }
            
            response = requests.post(
                f"{BASE_URL}/api/upload-document",
                files=files,
                data=data
            )
        
        if response.status_code == 200:
            result = response.json()
            
            print("\n✅ Upload successful!")
            print("-" * 80)
            
            # Check vocabulary
            vocab = result.get("vocabulary", [])
            print(f"\n📊 VOCABULARY RESULTS:")
            print(f"   Total words extracted: {len(vocab)}")
            
            # Count unigrams vs bigrams
            unigrams = [v for v in vocab if " " not in v["word"]]
            bigrams = [v for v in vocab if v["word"].count(" ") == 1]
            trigrams = [v for v in vocab if v["word"].count(" ") == 2]
            
            print(f"   - Unigrams (single words): {len(unigrams)}")
            print(f"   - Bigrams (2-word phrases): {len(bigrams)}")
            print(f"   - Trigrams (3-word phrases): {len(trigrams)}")
            
            # Show top bigrams
            if bigrams:
                print(f"\n🔹 Top Bigrams/Phrases:")
                for i, v in enumerate(bigrams[:10], 1):
                    print(f"   {i}. '{v['word']}' (score: {v.get('finalScore', 0):.3f})")
            else:
                print("\n❌ WARNING: No bigrams found! Fix may not be working.")
            
            # Check flashcards
            flashcards = result.get("flashcards", [])
            print(f"\n📇 FLASHCARD RESULTS:")
            print(f"   Total flashcards: {len(flashcards)}")
            
            if len(flashcards) < 20:
                print(f"   ⚠️  WARNING: Only {len(flashcards)} flashcards (expected ~30)")
            else:
                print(f"   ✅ Good! Generated {len(flashcards)} flashcards")
            
            # Show sample flashcards
            if flashcards:
                print(f"\n🔹 Sample Flashcards:")
                for i, fc in enumerate(flashcards[:5], 1):
                    word = fc.get("word", "N/A")
                    print(f"   {i}. {word}")
            
            # Summary
            print("\n" + "=" * 80)
            print("📈 SUMMARY")
            print("=" * 80)
            
            success = True
            issues = []
            
            if len(bigrams) == 0:
                success = False
                issues.append("❌ No bigrams found - N-gram fix may not be working")
            else:
                print(f"✅ Bigrams: {len(bigrams)} found")
            
            if len(flashcards) < 20:
                success = False
                issues.append(f"❌ Only {len(flashcards)} flashcards - expected ~30")
            else:
                print(f"✅ Flashcards: {len(flashcards)} generated")
            
            if success:
                print("\n🎉 ALL TESTS PASSED!")
            else:
                print("\n⚠️  ISSUES FOUND:")
                for issue in issues:
                    print(f"   {issue}")
                print("\n💡 Make sure you restarted the server after applying fixes!")
            
        else:
            print(f"\n❌ Upload failed!")
            print(f"   Status code: {response.status_code}")
            print(f"   Response: {response.text}")
            
    except requests.exceptions.ConnectionError:
        print("\n❌ ERROR: Cannot connect to server!")
        print("   Make sure the server is running:")
        print("   python main.py")
    except Exception as e:
        print(f"\n❌ ERROR: {e}")


def test_direct_extraction():
    """Test direct extraction endpoint"""
    
    print("\n" + "=" * 80)
    print("TEST: Direct Extraction Endpoint")
    print("=" * 80)
    
    test_text = """
    Machine learning is a subset of artificial intelligence. Deep learning uses 
    neural networks. Natural language processing helps computers understand text.
    Healthcare systems benefit from medical imaging and diagnosis accuracy.
    """
    
    try:
        response = requests.post(
            f"{BASE_URL}/api/smart-vocabulary-extract",
            json={
                "text": test_text,
                "max_words": 20,
                "language": "en"
            }
        )
        
        if response.status_code == 200:
            result = response.json()
            vocab = result.get("vocabulary", [])
            
            print(f"\n✅ Extraction successful!")
            print(f"   Total words: {len(vocab)}")
            
            bigrams = [v for v in vocab if " " in v["word"]]
            print(f"   Bigrams: {len(bigrams)}")
            
            if bigrams:
                print(f"\n🔹 Bigrams found:")
                for v in bigrams[:5]:
                    print(f"   - '{v['word']}'")
            else:
                print("\n❌ No bigrams found!")
                
        else:
            print(f"❌ Failed: {response.status_code}")
            
    except Exception as e:
        print(f"❌ ERROR: {e}")


if __name__ == "__main__":
    print("\n🧪 TESTING N-GRAM AND FLASHCARD FIXES")
    print("=" * 80)
    
    # Test 1: Upload with new parameters
    test_upload_with_params()
    
    # Test 2: Direct extraction
    test_direct_extraction()
    
    print("\n" + "=" * 80)
    print("✅ Testing complete!")
    print("=" * 80)
