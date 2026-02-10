"""
Test DocumentStructure JSON serialization fix
"""

import json

# Simulate DocumentStructure object
class DocumentStructure:
    def __init__(self):
        self.headings = []
        self.sentence_to_heading = {}

# Test the cleaning function
def _clean_numpy_arrays(obj):
    """Clean numpy arrays and custom objects"""
    import numpy as np
    
    if isinstance(obj, np.ndarray):
        return obj.tolist()
    elif isinstance(obj, dict):
        return {key: _clean_numpy_arrays(value) for key, value in obj.items()}
    elif isinstance(obj, list):
        return [_clean_numpy_arrays(item) for item in obj]
    elif isinstance(obj, (np.integer, np.floating)):
        return float(obj)
    elif hasattr(obj, '__dict__'):
        # Handle custom objects (like DocumentStructure) by skipping them
        return None
    else:
        return obj

# Test data
test_data = {
    'stage2': {
        'heading_count': 2,
        'headings': ['Heading 1', 'Heading 2'],
        'doc_structure': DocumentStructure()  # This should be removed
    },
    'vocabulary': [
        {
            'phrase': 'test phrase',
            'score': 0.85
        }
    ]
}

print("=" * 80)
print("TESTING DocumentStructure FIX")
print("=" * 80)

print("\n[BEFORE CLEANING]")
print(f"doc_structure type: {type(test_data['stage2']['doc_structure'])}")

# Clean
cleaned_data = _clean_numpy_arrays(test_data)

print("\n[AFTER CLEANING]")
print(f"doc_structure value: {cleaned_data['stage2']['doc_structure']}")

# Try to serialize
print("\n[JSON SERIALIZATION TEST]")
try:
    json_str = json.dumps(cleaned_data)
    print("✅ JSON serialization successful!")
    print(f"JSON length: {len(json_str)} characters")
except TypeError as e:
    print(f"❌ JSON serialization failed: {e}")

print("\n" + "=" * 80)
print("TEST COMPLETE")
print("=" * 80)
