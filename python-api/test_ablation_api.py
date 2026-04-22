import requests
import json
BASE_URL = "http://localhost:8000"  # Hoặc Railway URL

def test_example_endpoint():
    """Test GET /api/ablation-study/example"""
    print("\n" + "="*80)
    print("TEST 1: GET /api/ablation-study/example")
    print("="*80)
    
    url = f"{BASE_URL}/api/ablation-study/example"
    
    try:
        response = requests.get(url)
        
        if response.status_code == 200:
            data = response.json()
            print(" Example endpoint works!")
            print(f"\nExample request:")
            print(json.dumps(data['example_request'], indent=2))
        else:
            print(f" Failed with status code: {response.status_code}")
            print(response.text)
    
    except Exception as e:
        print(f" Error: {e}")


def test_ablation_study():
    """Test POST /api/ablation-study"""
    print("\n" + "="*80)
    print("TEST 2: POST /api/ablation-study")
    print("="*80)
    
    url = f"{BASE_URL}/api/ablation-study"
    
    # Sample data
    data = {
        "document_text": """
        Machine Learning and Artificial Intelligence
        
        Machine learning is a subset of artificial intelligence that focuses on 
        developing algorithms that can learn from data. Neural networks are a 
        fundamental component of modern machine learning systems.
        
        Deep Learning
        
        Deep learning uses neural networks with multiple layers to process complex 
        patterns. Backpropagation is the key algorithm for training these networks.
        Gradient descent optimization helps minimize the loss function.
        
        Applications
        
        Machine learning has numerous applications including natural language 
        processing, computer vision, and reinforcement learning. These technologies
        are transforming industries worldwide.
        """,
        "ground_truth_vocabulary": [
            "machine learning",
            "artificial intelligence",
            "neural network",
            "deep learning",
            "algorithm",
            "backpropagation",
            "gradient descent",
            "natural language processing",
            "computer vision",
            "reinforcement learning"
        ],
        "document_title": "Machine Learning Introduction"
    }
    
    try:
        print("Sending request...")
        print(f"Document length: {len(data['document_text'])} characters")
        print(f"Ground truth size: {len(data['ground_truth_vocabulary'])} terms")
        
        response = requests.post(url, json=data)
        
        if response.status_code == 200:
            result = response.json()
            
            print("\n Ablation study completed!")
            print("\n" + "-"*80)
            print("SUMMARY")
            print("-"*80)
            print(f"Best Case: {result['summary']['best_case']}")
            print(f"Best F1: {result['summary']['best_f1']}")
            print(f"Baseline F1: {result['summary']['baseline_f1']}")
            print(f"Improvement: {result['summary']['improvement_percent']}%")
            print(f"Total Execution Time: {result['summary']['total_execution_time']}s")
            
            print("\n" + "-"*80)
            print("RESULTS BY CASE")
            print("-"*80)
            
            for case_result in result['results']:
                print(f"\n{case_result['case']}")
                print(f"  Steps: {case_result['steps']}")
                print(f"  Description: {case_result['description']}")
                print(f"  Precision: {case_result['precision']}")
                print(f"  Recall: {case_result['recall']}")
                print(f"  F1-Score: {case_result['f1_score']}")
                print(f"  Latency: {case_result['latency']}s")
                print(f"  Diversity: {case_result['diversity_index']}")
                print(f"  Total Words: {case_result['total_words']}")
                print(f"  Unique Words: {case_result['unique_words']}")
                
                if 'improvement_from_previous' in case_result:
                    print(f"  Improvement from previous: +{case_result['improvement_from_previous']}%")
            
            # Save result to file
            with open('ablation_test_result.json', 'w', encoding='utf-8') as f:
                json.dump(result, f, indent=2, ensure_ascii=False)
            
            print("\n Result saved to ablation_test_result.json")
        
        else:
            print(f" Failed with status code: {response.status_code}")
            print(response.text)
    
    except Exception as e:
        print(f" Error: {e}")
        import traceback
        traceback.print_exc()


def test_root_endpoint():
    """Test GET / to check if ablation endpoints are listed"""
    print("\n" + "="*80)
    print("TEST 3: GET / (Check ablation endpoints listed)")
    print("="*80)
    
    url = f"{BASE_URL}/"
    
    try:
        response = requests.get(url)
        
        if response.status_code == 200:
            data = response.json()
            
            if 'endpoints' in data and 'ablation_study' in data['endpoints']:
                print(" Ablation endpoints are listed in root!")
                print(f"\nAblation Study: {data['endpoints']['ablation_study']}")
                print(f"Ablation Example: {data['endpoints']['ablation_example']}")
            else:
                print("  Ablation endpoints not found in root response")
                print(json.dumps(data, indent=2))
        else:
            print(f" Failed with status code: {response.status_code}")
    
    except Exception as e:
        print(f" Error: {e}")


if __name__ == "__main__":
    print("="*80)
    print("ABLATION API ENDPOINT TESTS")
    print("="*80)
    print(f"\nBase URL: {BASE_URL}")
    print("\nNOTE: Make sure the backend is running!")
    print("  - Local: python main.py")
    print("  - Railway: Check Railway dashboard")
    
    # Run tests
    test_root_endpoint()
    test_example_endpoint()
    test_ablation_study()
    
    print("\n" + "="*80)
    print("ALL TESTS COMPLETED")
    print("="*80)
