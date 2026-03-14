# ABLATION STUDY PARAMETER FIX

## Problem
Railway logs show error: `CompletePipelineNew.process_document() got an unexpected keyword argument 'document_id'`

## Root Cause
The ablation study API was trying to pass a `document_id` parameter to the `process_document` method, but this parameter doesn't exist in the method signature.

## Solution Applied

### 1. Fixed ablation_api_endpoint.py
- ✅ Removed any `document_id` parameter references
- ✅ Updated `run_pipeline_case` function to only pass supported parameters:
  ```python
  result = pipeline.process_document(
      text=text,
      document_title=document_title
  )
  ```

### 2. Verified Method Signatures
- ✅ `ConfigurablePipeline.process_document(text, document_title, max_phrases, max_words)`
- ✅ `CompletePipelineNew.process_document(text, max_phrases, max_words, document_title, use_bm25, bm25_weight, generate_flashcards)`

### 3. Added Debug Logging
- ✅ Added try-catch with detailed error logging
- ✅ Added pipeline type and method signature debugging

### 4. Force Redeploy Triggers
- ✅ Updated main.py header with new timestamp
- ✅ Updated ablation_api_endpoint.py header with fix note
- ✅ Created force_redeploy.py script

## Files Modified
1. `python-api/ablation_api_endpoint.py` - Fixed parameter passing
2. `python-api/main.py` - Updated header for redeploy
3. `python-api/force_redeploy.py` - New deployment trigger
4. `python-api/debug_ablation.py` - Debug script

## Expected Result
After Railway redeploys with these changes, the ablation study should work without the `document_id` parameter error.

## Testing
The ablation study endpoint should now accept:
```json
{
  "document_text": "Machine learning is...",
  "ground_truth_vocabulary": ["machine learning", "algorithm"],
  "document_title": "Test Document"
}
```

And return results for all 4 cases without parameter errors.

## Deployment Status
- ✅ Code changes applied
- 🔄 Waiting for Railway redeploy
- ⏳ Testing required after deployment

## Next Steps
1. Wait for Railway to redeploy (should happen automatically)
2. Test the ablation study endpoint
3. Verify all 4 cases run successfully
4. Check that results show different vocabulary for different cases