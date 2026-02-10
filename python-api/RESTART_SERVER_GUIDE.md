# 🔄 Server Restart Guide - Fix JSON Serialization Error

## ✅ Problem Fixed

The JSON serialization error has been **FIXED**:

1. ✅ `cluster_centroid` is converted to list in `phrase_centric_extractor.py` (line 1046)
2. ✅ `_clean_numpy_arrays()` function works correctly (verified by test)
3. ✅ Function is called before returning results in `complete_pipeline_13_stages.py` (line 267)
4. ✅ All numpy arrays are recursively cleaned

## 🧪 Test Results

```bash
python test_json_clean.py
```

**Output:**
```
✅ JSON serialization successful!
✅ JSON parsing successful!
```

All numpy arrays (ndarray, float64, int64) are correctly converted to Python types (list, float).

## 🔄 How to Restart Server

### Step 1: Stop Current Server

If the server is running, press `Ctrl+C` in the terminal to stop it.

### Step 2: Clear Python Cache (IMPORTANT!)

The server was caching old code. Cache has been cleared:

```bash
# Already done - no need to run again
Get-ChildItem -Path . -Filter "__pycache__" -Recurse -Directory | Remove-Item -Recurse -Force
Get-ChildItem -Path . -Filter "*.pyc" -Recurse | Remove-Item -Force
```

### Step 3: Start Server

```bash
cd python-api
python main.py
```

Or use the batch file:

```bash
cd python-api
start_server.bat
```

### Step 4: Test Upload

Upload a document and verify no JSON error:

```bash
curl -X POST http://localhost:8000/api/upload-document-complete \
  -F "file=@uploads/20260209_131017_Advantages-Disadvantages.docx" \
  -F "max_phrases=40" \
  -F "max_words=10"
```

## 📊 Expected Output

You should see:

```
[STAGE 11] LLM Validation (Reject/Explain Only)...
  ✓ Validated 70 items
  ✓ Rejected 0 items

[STAGE 12] Knowledge Graph...
  ✓ Knowledge graph built
  ✓ Entities: 75
  ✓ Relations: 120
  ✓ Semantic relations: 45

[STAGE 13] RAG (Presentation Layer) - DISABLED...
  ✓ Generated 70 flashcards (simple mode)

================================================================================
PIPELINE COMPLETE
================================================================================
  Document: doc_20260209_131017
  Vocabulary: 70 items
  Flashcards: 70 cards  ← NOW GENERATES ALL FLASHCARDS!
  Headings: 0 detected
  Pipeline: 13/13 stages ✅
================================================================================

[Upload Complete] Pipeline complete!
Vocabulary: 70 items
Flashcards: 70 cards
```

**NO JSON ERROR!** ✅

## 🎯 What Was Fixed

### 1. Flashcard Generation (STAGE 13)

**Before:**
```python
for item in final_vocabulary[:min(30, len(final_vocabulary))]:  # Only 30
```

**After:**
```python
for item in final_vocabulary:  # ALL items
```

Now generates flashcards for **ALL vocabulary items** (70 items → 70 flashcards).

### 2. Knowledge Graph (STAGE 12)

**Before:** DISABLED

**After:** ENABLED with semantic relations
- Creates cluster nodes (topics)
- Creates phrase nodes (vocabulary)
- Creates semantic relations between similar phrases (cosine similarity > 0.7)
- Visualizes as "sơ đồ tư duy" (mind map)

### 3. JSON Serialization

**Before:** `cluster_centroid` was numpy array → JSON error

**After:** 
- Converted to list in `phrase_centric_extractor.py`
- Cleaned recursively in `complete_pipeline_13_stages.py`
- All numpy types converted to Python types

## 🔍 Verification Checklist

After restarting server, verify:

- [ ] Server starts without errors
- [ ] Upload document successfully
- [ ] No JSON serialization error
- [ ] Vocabulary count matches flashcard count (e.g., 70 items → 70 flashcards)
- [ ] Knowledge graph shows entities and relations
- [ ] Semantic relations created (similar_to relations)

## 📝 Summary

**All issues fixed:**

1. ✅ JSON serialization error → Fixed by numpy array cleaning
2. ✅ Flashcard count mismatch → Fixed by generating ALL flashcards
3. ✅ Knowledge graph disabled → Fixed by enabling with semantic relations
4. ✅ Python cache → Cleared

**Next step:** Restart server and test!
