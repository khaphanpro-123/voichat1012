# ABLATION API - QUICK REFERENCE

## 🚀 Endpoints

### 1. Run Ablation Study
```
POST /api/ablation-study
```

### 2. Get Example Request
```
GET /api/ablation-study/example
```

## 📝 Request Format

```json
{
  "document_text": "Your document text here...",
  "ground_truth_vocabulary": [
    "term1",
    "term2",
    "term3"
  ],
  "document_title": "Document Title"
}
```

## 📊 Response Format

```json
{
  "success": true,
  "summary": {
    "best_case": "Case 4: Full Pipeline",
    "best_f1": 0.8947,
    "baseline_f1": 0.7317,
    "improvement_percent": 22.28,
    "total_execution_time": 45.2
  },
  "results": [
    {
      "case": "Case 1: Baseline",
      "precision": 0.6522,
      "recall": 0.8333,
      "f1_score": 0.7317,
      "latency": 10.5,
      "diversity_index": 0.92
    }
  ]
}
```

## 🔢 4 Test Cases

| Case | Steps | Description |
|------|-------|-------------|
| 1 | 1,2,4,7,8,12 | Baseline |
| 2 | 1,2,3,4,7,8,12 | + Context |
| 3 | 1,2,3,4,5,6,7,8,9,12 | + Filtering |
| 4 | 1,2,3,4,5,6,7,8,9,10,11,12 | Full Pipeline |

## 📈 Metrics

- **Precision:** TP/(TP+FP) - Accuracy
- **Recall:** TP/(TP+FN) - Coverage
- **F1-Score:** 2×(P×R)/(P+R) - Harmonic mean
- **Latency:** Processing time (seconds)
- **Diversity:** Unique/Total words

## 💻 Quick Examples

### cURL
```bash
curl -X POST https://your-backend.railway.app/api/ablation-study \
  -H "Content-Type: application/json" \
  -d '{"document_text":"...","ground_truth_vocabulary":["..."]}'
```

### Python
```python
import requests
response = requests.post(
    "https://your-backend.railway.app/api/ablation-study",
    json={"document_text":"...","ground_truth_vocabulary":["..."]}
)
print(response.json()['summary']['best_f1'])
```

### JavaScript
```javascript
const response = await fetch('https://your-backend.railway.app/api/ablation-study', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({document_text:"...",ground_truth_vocabulary:["..."]})
});
const result = await response.json();
```

## 📚 Documentation

- Full Guide: `python-api/ABLATION_API_USAGE.md`
- Ablation Study Guide: `python-api/ABLATION_STUDY_GUIDE.md`
- Test Script: `python-api/test_ablation_api.py`

## ⏱️ Timing

- Each case: ~10-20 seconds
- Total: ~40-80 seconds
- Railway timeout: 120 seconds (safe)

## ✅ Status

- ✅ Integrated into main.py
- ✅ Deployed to Railway
- ✅ Documentation complete
- ✅ Test script available
