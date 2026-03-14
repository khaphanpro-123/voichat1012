#!/usr/bin/env python3
"""
Debug script for ablation study issue

This script helps debug the document_id parameter issue
"""

import inspect
from configurable_pipeline import ConfigurablePipeline, create_pipeline_for_case
from complete_pipeline import CompletePipelineNew

def debug_pipeline_signatures():
    """Debug pipeline method signatures"""
    print("🔍 DEBUGGING PIPELINE SIGNATURES")
    print("="*50)
    
    # Check ConfigurablePipeline
    print("\n1. ConfigurablePipeline.process_document signature:")
    sig = inspect.signature(ConfigurablePipeline.process_document)
    print(f"   {sig}")
    
    # Check CompletePipelineNew
    print("\n2. CompletePipelineNew.process_document signature:")
    sig = inspect.signature(CompletePipelineNew.process_document)
    print(f"   {sig}")
    
    # Test creating a pipeline for case 1
    print("\n3. Testing create_pipeline_for_case(1):")
    try:
        pipeline = create_pipeline_for_case(1)
        print(f"   ✅ Created pipeline: {type(pipeline)}")
        
        # Check its process_document method
        sig = inspect.signature(pipeline.process_document)
        print(f"   Method signature: {sig}")
        
    except Exception as e:
        print(f"   ❌ Error: {e}")
    
    print("\n4. Testing method call with correct parameters:")
    try:
        pipeline = create_pipeline_for_case(1)
        
        # Test with minimal parameters
        result = pipeline.process_document(
            text="This is a test document about machine learning.",
            document_title="Test Document"
        )
        
        print(f"   ✅ Method call successful")
        print(f"   ✅ Result keys: {list(result.keys())}")
        print(f"   ✅ Vocabulary items: {len(result.get('vocabulary', []))}")
        
    except Exception as e:
        print(f"   ❌ Error in method call: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    debug_pipeline_signatures()