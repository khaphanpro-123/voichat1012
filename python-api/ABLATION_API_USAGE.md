# ABLATION STUDY API - Hướng Dẫn Sử Dụng

## Tổng Quan

API Ablation Study cho phép bạn tự động chạy thí nghiệm ablation study để đánh giá hiệu quả của từng thành phần trong pipeline.

## Endpoints

### 1. POST /api/ablation-study

Chạy ablation study tự động với 4 trường hợp kiểm thử.

**URL:** `http://localhost:8000/api/ablation-study`

**Method:** POST

**Request Body:**
```json
{
  "document_text": "Machine learning is a subset of artificial intelligence...",
  "ground_truth_vocabulary": [
    "machine learning",
    "artificial intelligence",
    "algorithm",
    "neural network",
    "deep learning"
  ],
  "document_title": "Machine Learning Basics"
}
```

**Response:**
```json
{
  "success": true,
  "summary": {
    "best_case": "Case 4: Full Pipeline",
    "best_f1": 0.87,
    "baseline_f1": 0.73,
    "improvement_percent": 19.18,
    "total_execution_time": 45.2,
    "ground_truth_size": 5
  },
  "results": [
    {
      "case": "Case 1: Baseline",
      "steps": "1,2,4,7,8,12",
      "description": "Trích xuất cơ bản",
      "TP": 15,
      "FP": 8,
      "FN": 3,
      "precision": 0.6522,
      "recall": 0.8333,
      "f1_score": 0.7317,
      "latency": 10.5,
      "diversity_index": 0.92,
      "total_words": 23,
      "unique_words": 21
    },
    {
      "case": "Case 2: + Context",
      "steps": "1,2,3,4,7,8,12",
      "description": "Thêm phân tích ngữ cảnh",
      "TP": 16,
      "FP": 6,
      "FN": 2,
      "precision": 0.7273,
      "recall": 0.8889,
      "f1_score": 0.8000,
      "latency": 12.3,
      "diversity_index": 0.94,
      "total_words": 22,
      "unique_words": 21,
      "improvement_from_previous": 9.33
    },
    {
      "case": "Case 3: + Filtering",
      "steps": "1,2,3,4,5,6,7,8,9,12",
      "description": "Thêm bộ lọc nhiễu và chấm điểm",
      "TP": 17,
      "FP": 4,
      "FN": 1,
      "precision": 0.8095,
      "recall": 0.9444,
      "f1_score": 0.8718,
      "latency": 15.8,
      "diversity_index": 0.96,
      "total_words": 21,
      "unique_words": 20,
      "improvement_from_previous": 8.98
    },
    {
      "case": "Case 4: Full Pipeline",
      "steps": "1,2,3,4,5,6,7,8,9,10,11,12",
      "description": "Hệ thống đầy đủ với synonym grouping",
      "TP": 17,
      "FP": 3,
      "FN": 1,
      "precision": 0.8500,
      "recall": 0.9444,
      "f1_score": 0.8947,
      "latency": 18.2,
      "diversity_index": 0.98,
      "total_words": 20,
      "unique_words": 20,
      "improvement_from_previous": 2.63
    }
  ],
  "execution_time": 45.2
}
```

### 2. GET /api/ablation-study/example

Lấy ví dụ request body.

**URL:** `http://localhost:8000/api/ablation-study/example`

**Method:** GET

**Response:**
```json
{
  "example_request": {
    "document_text": "Machine learning is a subset of artificial intelligence...",
    "ground_truth_vocabulary": [
      "machine learning",
      "artificial intelligence",
      "algorithm",
      "neural network",
      "deep learning"
    ],
    "document_title": "Machine Learning Basics"
  },
  "usage": "POST /api/ablation-study with the above JSON body"
}
```

## Cách Sử Dụng

### 1. Sử dụng cURL

```bash
curl -X POST http://localhost:8000/api/ablation-study \
  -H "Content-Type: application/json" \
  -d '{
    "document_text": "Machine learning is a subset of artificial intelligence that focuses on developing algorithms that can learn from data. Neural networks are a fundamental component of modern machine learning systems.",
    "ground_truth_vocabulary": [
      "machine learning",
      "artificial intelligence",
      "algorithm",
      "neural network"
    ],
    "document_title": "ML Basics"
  }'
```

### 2. Sử dụng Python

```python
import requests
import json

url = "http://localhost:8000/api/ablation-study"

data = {
    "document_text": "Machine learning is a subset of artificial intelligence...",
    "ground_truth_vocabulary": [
        "machine learning",
        "artificial intelligence",
        "algorithm",
        "neural network",
        "deep learning"
    ],
    "document_title": "Machine Learning Basics"
}

response = requests.post(url, json=data)
result = response.json()

print(f"Best Case: {result['summary']['best_case']}")
print(f"Best F1: {result['summary']['best_f1']}")
print(f"Improvement: {result['summary']['improvement_percent']}%")

# In chi tiết từng case
for case_result in result['results']:
    print(f"\n{case_result['case']}")
    print(f"  Precision: {case_result['precision']}")
    print(f"  Recall: {case_result['recall']}")
    print(f"  F1-Score: {case_result['f1_score']}")
    print(f"  Latency: {case_result['latency']}s")
```

### 3. Sử dụng JavaScript/Fetch

```javascript
const url = "http://localhost:8000/api/ablation-study";

const data = {
  document_text: "Machine learning is a subset of artificial intelligence...",
  ground_truth_vocabulary: [
    "machine learning",
    "artificial intelligence",
    "algorithm",
    "neural network",
    "deep learning"
  ],
  document_title: "Machine Learning Basics"
};

fetch(url, {
  method: "POST",
  headers: {
    "Content-Type": "application/json"
  },
  body: JSON.stringify(data)
})
  .then(response => response.json())
  .then(result => {
    console.log("Best Case:", result.summary.best_case);
    console.log("Best F1:", result.summary.best_f1);
    console.log("Improvement:", result.summary.improvement_percent + "%");
    
    // In chi tiết
    result.results.forEach(caseResult => {
      console.log(`\n${caseResult.case}`);
      console.log(`  Precision: ${caseResult.precision}`);
      console.log(`  Recall: ${caseResult.recall}`);
      console.log(`  F1-Score: ${caseResult.f1_score}`);
    });
  });
```

## Các Chỉ Số Đánh Giá

### 1. Precision (Độ Chính Xác)
- **Công thức:** `TP / (TP + FP)`
- **Ý nghĩa:** Tỷ lệ từ khóa được trích xuất đúng trong tổng số từ khóa được trích xuất
- **Giá trị:** 0.0 - 1.0 (càng cao càng tốt)

### 2. Recall (Độ Bao Phủ)
- **Công thức:** `TP / (TP + FN)`
- **Ý nghĩa:** Tỷ lệ từ khóa được trích xuất đúng trong tổng số từ khóa cần trích xuất
- **Giá trị:** 0.0 - 1.0 (càng cao càng tốt)

### 3. F1-Score
- **Công thức:** `2 * (Precision * Recall) / (Precision + Recall)`
- **Ý nghĩa:** Điểm trung bình điều hòa giữa Precision và Recall
- **Giá trị:** 0.0 - 1.0 (càng cao càng tốt)

### 4. Latency (Thời Gian Xử Lý)
- **Đơn vị:** Giây (s)
- **Ý nghĩa:** Thời gian xử lý của pipeline
- **Giá trị:** Càng thấp càng tốt

### 5. Diversity Index (Độ Đa Dạng)
- **Công thức:** `Số từ unique / Tổng số từ`
- **Ý nghĩa:** Tỷ lệ từ không trùng lặp
- **Giá trị:** 0.0 - 1.0 (càng cao càng tốt)

## 4 Trường Hợp Kiểm Thử

### Case 1: Baseline
- **Bước:** 1,2,4,7,8,12
- **Mô tả:** Trích xuất cơ bản (phrases + words)
- **Mục đích:** Đo lường hiệu suất cơ bản

### Case 2: + Context Intelligence
- **Bước:** 1,2,3,4,7,8,12
- **Mô tả:** Thêm phân tích ngữ cảnh và phân cấp tiêu đề
- **Mục đích:** Đánh giá tác động của context intelligence

### Case 3: + Filtering & Scoring
- **Bước:** 1,2,3,4,5,6,7,8,9,12
- **Mô tả:** Thêm bộ lọc nhiễu và chấm điểm tương phản
- **Mục đích:** Đánh giá tác động của filtering và scoring

### Case 4: Full Pipeline
- **Bước:** 1,2,3,4,5,6,7,8,9,10,11,12
- **Mô tả:** Hệ thống đầy đủ với synonym grouping và knowledge graph
- **Mục đích:** Đánh giá hiệu suất tổng thể

## Lưu Ý

1. **Ground Truth Vocabulary:** Cần chuẩn bị danh sách từ vựng chuẩn để so sánh
2. **Document Text:** Văn bản cần đủ dài (tối thiểu 50 ký tự)
3. **Thời Gian Xử Lý:** Mỗi case mất khoảng 10-20 giây, tổng cộng 40-80 giây
4. **Normalization:** Hệ thống tự động chuẩn hóa từ (lowercase, remove plurals)

## Ví Dụ Kết Quả

```
Best Case: Case 4: Full Pipeline
Best F1: 0.8947
Baseline F1: 0.7317
Improvement: 22.28%

Case 1: Baseline
  Precision: 0.6522 | Recall: 0.8333 | F1: 0.7317
  Latency: 10.5s | Diversity: 0.92

Case 2: + Context
  Precision: 0.7273 | Recall: 0.8889 | F1: 0.8000
  Latency: 12.3s | Diversity: 0.94
  Improvement: +9.33%

Case 3: + Filtering
  Precision: 0.8095 | Recall: 0.9444 | F1: 0.8718
  Latency: 15.8s | Diversity: 0.96
  Improvement: +8.98%

Case 4: Full Pipeline
  Precision: 0.8500 | Recall: 0.9444 | F1: 0.8947
  Latency: 18.2s | Diversity: 0.98
  Improvement: +2.63%
```

## Troubleshooting

### Lỗi 500: Internal Server Error
- Kiểm tra document_text có đủ dài không
- Kiểm tra ground_truth_vocabulary có hợp lệ không

### Lỗi 422: Validation Error
- Kiểm tra format JSON có đúng không
- Kiểm tra các field bắt buộc: document_text, ground_truth_vocabulary

### Thời gian xử lý quá lâu
- Giảm độ dài document_text
- Giảm số lượng ground_truth_vocabulary

## Tích Hợp với Frontend

Bạn có thể tạo một trang UI để gọi API này:

```typescript
// app/dashboard-new/ablation-study/page.tsx
'use client';

import { useState } from 'react';

export default function AblationStudyPage() {
  const [documentText, setDocumentText] = useState('');
  const [groundTruth, setGroundTruth] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const runAblationStudy = async () => {
    setLoading(true);
    
    const response = await fetch('/api/ablation-study', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        document_text: documentText,
        ground_truth_vocabulary: groundTruth.split('\n').filter(x => x.trim()),
        document_title: 'Test Document'
      })
    });
    
    const data = await response.json();
    setResult(data);
    setLoading(false);
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Ablation Study</h1>
      
      <textarea
        placeholder="Document text..."
        value={documentText}
        onChange={(e) => setDocumentText(e.target.value)}
        className="w-full h-40 p-2 border rounded mb-4"
      />
      
      <textarea
        placeholder="Ground truth vocabulary (one per line)..."
        value={groundTruth}
        onChange={(e) => setGroundTruth(e.target.value)}
        className="w-full h-40 p-2 border rounded mb-4"
      />
      
      <button
        onClick={runAblationStudy}
        disabled={loading}
        className="px-4 py-2 bg-blue-500 text-white rounded"
      >
        {loading ? 'Running...' : 'Run Ablation Study'}
      </button>
      
      {result && (
        <div className="mt-6">
          <h2 className="text-xl font-bold">Results</h2>
          <p>Best Case: {result.summary.best_case}</p>
          <p>Best F1: {result.summary.best_f1}</p>
          <p>Improvement: {result.summary.improvement_percent}%</p>
          
          {result.results.map((caseResult, i) => (
            <div key={i} className="mt-4 p-4 border rounded">
              <h3 className="font-bold">{caseResult.case}</h3>
              <p>Precision: {caseResult.precision}</p>
              <p>Recall: {caseResult.recall}</p>
              <p>F1-Score: {caseResult.f1_score}</p>
              <p>Latency: {caseResult.latency}s</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

## Kết Luận

API Ablation Study giúp bạn tự động đánh giá hiệu quả của từng thành phần trong pipeline, tiết kiệm thời gian và công sức so với việc chạy thủ công.
