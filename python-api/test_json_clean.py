"""
Test script to verify numpy array cleaning works correctly
"""

import json
import numpy as np
from complete_pipeline_13_stages import CompletePipeline13Stages

def test_clean_numpy_arrays():
    """Test the _clean_numpy_arrays method"""
    
    pipeline = CompletePipeline13Stages(knowledge_graph=None, rag_system=None)
    
    # Create test data with numpy arrays
    test_data = {
        'vocabulary': [
            {
                'phrase': 'climate change',
                'importance_score': 0.85,
                'cluster_id': 0,
                'cluster_centroid': np.array([0.1, 0.2, 0.3]),  # numpy array
                'tfidf_score': np.float64(0.75),  # numpy float
                'frequency': np.int64(5)  # numpy int
            },
            {
                'phrase': 'environmental protection',
                'importance_score': 0.78,
                'cluster_id': 1,
                'cluster_centroid': np.array([0.4, 0.5, 0.6]),
                'tfidf_score': 0.65
            }
        ],
        'stages': {
            'stage12': {
                'entities': [
                    {
                        'id': 'cluster_0',
                        'embedding': np.array([0.7, 0.8, 0.9])
                    }
                ]
            }
        }
    }
    
    print("=" * 80)
    print("TESTING NUMPY ARRAY CLEANING")
    print("=" * 80)
    
    print("\n[BEFORE CLEANING]")
    print(f"Type of cluster_centroid: {type(test_data['vocabulary'][0]['cluster_centroid'])}")
    print(f"Type of tfidf_score: {type(test_data['vocabulary'][0]['tfidf_score'])}")
    print(f"Type of frequency: {type(test_data['vocabulary'][0]['frequency'])}")
    
    # Clean numpy arrays
    cleaned_data = pipeline._clean_numpy_arrays(test_data)
    
    print("\n[AFTER CLEANING]")
    print(f"Type of cluster_centroid: {type(cleaned_data['vocabulary'][0]['cluster_centroid'])}")
    print(f"Type of tfidf_score: {type(cleaned_data['vocabulary'][0]['tfidf_score'])}")
    print(f"Type of frequency: {type(cleaned_data['vocabulary'][0]['frequency'])}")
    
    # Try to serialize to JSON
    print("\n[JSON SERIALIZATION TEST]")
    try:
        json_str = json.dumps(cleaned_data)
        print("✅ JSON serialization successful!")
        print(f"JSON length: {len(json_str)} characters")
        
        # Verify we can parse it back
        parsed = json.loads(json_str)
        print("✅ JSON parsing successful!")
        print(f"Vocabulary count: {len(parsed['vocabulary'])}")
        
    except TypeError as e:
        print(f"❌ JSON serialization failed: {e}")
        
        # Find the problematic field
        print("\n[DEBUGGING] Checking each field...")
        for i, item in enumerate(cleaned_data['vocabulary']):
            print(f"\nVocabulary item {i}:")
            for key, value in item.items():
                try:
                    json.dumps({key: value})
                    print(f"  ✅ {key}: {type(value)}")
                except TypeError:
                    print(f"  ❌ {key}: {type(value)} - NOT JSON SERIALIZABLE")
    
    print("\n" + "=" * 80)
    print("TEST COMPLETE")
    print("=" * 80)


if __name__ == "__main__":
    test_clean_numpy_arrays()
