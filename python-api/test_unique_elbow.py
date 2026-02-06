"""
Test script to verify unique elbow curve generation per document
"""

import requests
import time
import os

API_URL = "http://127.0.0.1:8000"

def test_unique_elbow_curves():
    """Test that each upload creates a unique elbow curve file"""
    
    print("=" * 80)
    print("TESTING UNIQUE ELBOW CURVE GENERATION")
    print("=" * 80)
    
    # Test data - 3 different documents
    test_documents = [
        {
            "filename": "doc1.txt",
            "content": """
            Machine learning is a subset of artificial intelligence. Deep learning uses neural networks.
            Natural language processing helps computers understand text. Computer vision enables image recognition.
            Data science combines statistics and programming. Big data requires distributed computing.
            Cloud computing provides scalable infrastructure. DevOps automates software deployment.
            Python is popular for data science. TensorFlow and PyTorch are deep learning frameworks.
            """
        },
        {
            "filename": "doc2.txt",
            "content": """
            Web development involves frontend and backend technologies. JavaScript is essential for web apps.
            React and Vue are popular frontend frameworks. Node.js enables server-side JavaScript.
            Databases store application data. SQL and NoSQL are database types.
            REST APIs connect frontend and backend. GraphQL is an alternative to REST.
            Docker containers simplify deployment. Kubernetes orchestrates containers.
            """
        },
        {
            "filename": "doc3.txt",
            "content": """
            Cybersecurity protects systems from attacks. Encryption secures sensitive data.
            Firewalls block unauthorized access. Penetration testing finds vulnerabilities.
            Authentication verifies user identity. Authorization controls access rights.
            Malware includes viruses and ransomware. Phishing tricks users into revealing credentials.
            Security audits assess system safety. Compliance ensures regulatory adherence.
            """
        }
    ]
    
    results = []
    
    for i, doc in enumerate(test_documents, 1):
        print(f"\n{'=' * 80}")
        print(f"TEST {i}: Uploading {doc['filename']}")
        print(f"{'=' * 80}")
        
        # Create temporary file
        temp_file = f"temp_{doc['filename']}"
        with open(temp_file, 'w', encoding='utf-8') as f:
            f.write(doc['content'])
        
        try:
            # Upload document
            with open(temp_file, 'rb') as f:
                files = {'file': (doc['filename'], f, 'text/plain')}
                data = {'max_words': 20, 'language': 'en'}
                
                print(f"[Test {i}] Uploading document...")
                response = requests.post(
                    f"{API_URL}/api/upload-document",
                    files=files,
                    data=data
                )
            
            if response.status_code == 200:
                result = response.json()
                
                print(f"[Test {i}] ✅ Upload successful!")
                print(f"[Test {i}] Document ID: {result['document_id']}")
                print(f"[Test {i}] Vocabulary count: {result['vocabulary_count']}")
                
                # Check K-Means clustering result
                if result.get('kmeans_clustering'):
                    kmeans = result['kmeans_clustering']
                    print(f"[Test {i}] K-Means clusters: {kmeans['n_clusters']}")
                    
                    if kmeans.get('elbow_analysis'):
                        plot_path = kmeans['elbow_analysis']['plot_path']
                        print(f"[Test {i}] Elbow plot: {plot_path}")
                        
                        # Check if file exists
                        if os.path.exists(plot_path):
                            print(f"[Test {i}] ✅ Elbow curve file exists: {plot_path}")
                            results.append({
                                'test': i,
                                'document_id': result['document_id'],
                                'plot_path': plot_path,
                                'exists': True
                            })
                        else:
                            print(f"[Test {i}] ❌ Elbow curve file NOT found: {plot_path}")
                            results.append({
                                'test': i,
                                'document_id': result['document_id'],
                                'plot_path': plot_path,
                                'exists': False
                            })
                    else:
                        print(f"[Test {i}] ⚠️  No elbow analysis in response")
                else:
                    print(f"[Test {i}] ⚠️  No K-Means clustering in response")
            else:
                print(f"[Test {i}] ❌ Upload failed: {response.status_code}")
                print(f"[Test {i}] Error: {response.text}")
        
        finally:
            # Clean up temp file
            if os.path.exists(temp_file):
                os.remove(temp_file)
        
        # Wait a bit between uploads
        time.sleep(1)
    
    # Summary
    print(f"\n{'=' * 80}")
    print("SUMMARY")
    print(f"{'=' * 80}")
    
    print(f"\nTotal tests: {len(test_documents)}")
    print(f"Successful uploads: {len(results)}")
    
    if results:
        print("\nGenerated elbow curve files:")
        for r in results:
            status = "✅" if r['exists'] else "❌"
            print(f"  {status} Test {r['test']}: {r['plot_path']}")
        
        # Check uniqueness
        plot_paths = [r['plot_path'] for r in results]
        unique_paths = set(plot_paths)
        
        print(f"\nUniqueness check:")
        print(f"  Total files: {len(plot_paths)}")
        print(f"  Unique files: {len(unique_paths)}")
        
        if len(unique_paths) == len(plot_paths):
            print("  ✅ All elbow curve files are UNIQUE!")
        else:
            print("  ❌ Some elbow curve files are DUPLICATED!")
            print("  This means the fix didn't work properly.")
    
    print("\n✅ Test completed!")


if __name__ == "__main__":
    test_unique_elbow_curves()
