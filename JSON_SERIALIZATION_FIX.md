# Fix JSON Serialization Error - Numpy Array

## Vấn Đề

Lỗi khi trả về response từ API:
```
{"detail":"Object of type ndarray is not JSON serializable"}
```

## Nguyên Nhân

Pipeline trả về kết quả có chứa **numpy types** (ndarray, np.int64, np.float64, etc.) trong:
- `result['vocabulary']` - có thể chứa numpy arrays trong embeddings
- `result['flashcards']` - có thể chứa numpy scores
- `result['topics']` - có thể chứa numpy centroids
- `result['statistics']` - có thể chứa numpy numbers

JSON không thể serialize numpy types trực tiếp → cần convert sang Python native types.

## Giải Pháp ✅

### Bước 1: Import numpy
```python
import numpy as np
```

### Bước 2: Tạo Helper Function
```python
def convert_numpy_types(obj):
    """
    Recursively convert numpy types to Python native types for JSON serialization
    """
    if isinstance(obj, np.ndarray):
        return obj.tolist()
    elif isinstance(obj, np.integer):
        return int(obj)
    elif isinstance(obj, np.floating):
        return float(obj)
    elif isinstance(obj, np.bool_):
        return bool(obj)
    elif isinstance(obj, dict):
        return {key: convert_numpy_types(value) for key, value in obj.items()}
    elif isinstance(obj, list):
        return [convert_numpy_types(item) for item in obj]
    elif isinstance(obj, tuple):
        return tuple(convert_numpy_types(item) for item in obj)
    else:
        return obj
```

### Bước 3: Convert Trước Khi Trả Response

**Endpoint: `/api/upload-document-complete`**
```python
# TRƯỚC
return JSONResponse(content={
    'vocabulary': result['vocabulary'],
    'flashcards': result.get('flashcards', []),
    'topics': result.get('topics', []),
    'statistics': result.get('statistics', {}),
    ...
})

# SAU
# Convert numpy types to Python native types
vocabulary = convert_numpy_types(result['vocabulary'])
flashcards = convert_numpy_types(result.get('flashcards', []))
topics = convert_numpy_types(result.get('topics', []))
statistics = convert_numpy_types(result.get('statistics', {}))

return JSONResponse(content={
    'vocabulary': vocabulary,
    'flashcards': flashcards,
    'topics': topics,
    'statistics': statistics,
    ...
})
```

**Endpoint: `/api/upload-document`**
```python
# Convert numpy types
vocabulary_contexts = convert_numpy_types(vocabulary_contexts)
flashcards = convert_numpy_types(flashcards)
kg_stats = convert_numpy_types(kg_stats)

return JSONResponse(content={
    'vocabulary': vocabulary_contexts,
    'flashcards': flashcards,
    'knowledge_graph_stats': kg_stats,
    ...
})
```

## Cách Hoạt Động

### Recursive Conversion
Function `convert_numpy_types()` xử lý đệ quy:

1. **ndarray** → `list` (via `.tolist()`)
2. **np.integer** (int64, int32, etc.) → `int`
3. **np.floating** (float64, float32, etc.) → `float`
4. **np.bool_** → `bool`
5. **dict** → convert tất cả values
6. **list** → convert tất cả items
7. **tuple** → convert tất cả items
8. **other types** → giữ nguyên

### Ví Dụ:
```python
# Input (có numpy types)
data = {
    'score': np.float64(0.85),
    'count': np.int64(42),
    'embedding': np.array([0.1, 0.2, 0.3]),
    'nested': {
        'value': np.float32(1.5)
    }
}

# Output (Python native types)
{
    'score': 0.85,           # float
    'count': 42,             # int
    'embedding': [0.1, 0.2, 0.3],  # list
    'nested': {
        'value': 1.5         # float
    }
}
```

## Files Đã Sửa

**python-api/main.py**
- Import numpy
- Thêm function `convert_numpy_types()` (dòng ~120)
- Convert trong `/api/upload-document-complete` (dòng ~305)
- Convert trong `/api/upload-document` (dòng ~475)

## Kết Quả Mong Đợi

### Trước Fix: ❌
```
POST /api/upload-document-complete
500 Internal Server Error
{"detail":"Object of type ndarray is not JSON serializable"}
```

### Sau Fix: ✅
```
POST /api/upload-document-complete
200 OK
{
  "success": true,
  "vocabulary": [...],
  "flashcards": [...],
  "topics": [...],
  "statistics": {...}
}
```

## Deployment

### Commit:
```bash
a40bdda - fix: convert numpy types to Python native types for JSON serialization
```

### Status:
- ✅ Committed
- ✅ Pushed to GitHub
- ⏳ Railway đang deploy (2-3 phút)

## Kiểm Tra

### Bước 1: Đợi Railway Deploy (2-3 phút)
- Railway: https://railway.app/dashboard

### Bước 2: Test Upload
1. Vào: https://voichat1012.vercel.app/dashboard-new/documents-simple
2. Upload tài liệu tiếng Anh
3. Kiểm tra response

### Bước 3: Xác Nhận
- ✅ Upload thành công
- ✅ Response trả về JSON hợp lệ
- ✅ Không còn lỗi serialization

## Tóm Tắt Tất Cả Fixes

| # | Vấn Đề | File | Commit | Trạng Thái |
|---|--------|------|--------|-----------|
| 1 | Frontend syntax | vocabulary/page.tsx | 39fa595 | ✅ Fixed |
| 2 | Frontend syntax | documents-simple/page.tsx | 39fa595 | ✅ Fixed |
| 3 | Backend params | complete_pipeline.py | 39fa595 | ✅ Fixed |
| 4 | API response | main.py | 39fa595 | ✅ Fixed |
| 5 | Semantic theme | phrase_scorer.py | 32ebeb5 | ✅ Fixed |
| 6 | NLTK data | main.py | 7988320 | ✅ Fixed |
| 7 | NaN (pipeline) | new_pipeline_learned_scoring.py | 3237984 | ✅ Fixed |
| 8 | NaN (scorer) | phrase_scorer.py | 21a6d83 | ✅ Fixed |
| 9 | NaN (ranker) | word_ranker.py | 21a6d83 | ✅ Fixed |
| 10 | JSON serialization | main.py | a40bdda | ✅ Fixed |

## Trạng Thái Cuối Cùng

✅ **10 FIXES ĐÃ HOÀN THÀNH**
- Tất cả lỗi đã được xử lý
- Code đã commit và push
- Đang chờ Railway deploy

## Bước Tiếp Theo

1. **Đợi 2-3 phút** cho Railway deploy
2. **Test upload** tài liệu
3. **Xác nhận** upload thành công

---

**Thời gian:** 2026-03-02  
**Commit:** a40bdda  
**Trạng thái:** ĐÃ FIX ✅  
**Đang chờ:** Railway deploy ⏳
