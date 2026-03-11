# HƯỚNG DẪN THỰC HIỆN ABLATION STUDY

## Mục tiêu
Đánh giá hiệu quả của từng thành phần trong pipeline 12 bước thông qua phương pháp Ablation Studies.

## Các chỉ số đánh giá

### 1. Độ chính xác (Precision)
```
P = TP / (TP + FP)
```
- TP (True Positive): Số từ khóa máy trích đúng
- FP (False Positive): Số từ khóa máy trích sai (rác)
- **Ý nghĩa**: Đo lường khả năng lọc nhiễu của hệ thống

### 2. Độ bao phủ (Recall)
```
R = TP / (TP + FN)
```
- TP: Số từ khóa máy trích đúng
- FN (False Negative): Số từ khóa máy trích bị sót
- **Ý nghĩa**: Đo lường khả năng "học đủ" kiến thức từ tài liệu

### 3. F1-Score
```
F1 = 2 * (P * R) / (P + R)
```
- **Ý nghĩa**: Điểm trung bình điều hòa giữa Precision và Recall
- **Quan trọng nhất** để đánh giá chất lượng tổng thể

### 4. Thời gian xử lý (Latency)
```
T = thời gian kết thúc - thời gian bắt đầu (giây)
```
- **Ý nghĩa**: Đánh giá tính khả thi khi ứng dụng vào thực tế

### 5. Độ đa dạng (Diversity Index)
```
DI = số từ unique / tổng số từ
```
- **Ý nghĩa**: Chứng minh bước xử lý đồng nghĩa giúp giảm trùng lặp

---

## 4 Trường hợp thử nghiệm

### Trường hợp 1: Baseline (Trích xuất cơ bản)
**Các bước**: 1, 2, 4, 7, 8, 12
- Bước 1: Document Ingestion
- Bước 2: Heading Detection
- Bước 4: Phrase Extraction
- Bước 7: Merge
- Bước 8: Learned Final Scoring
- Bước 12: Flashcard Generation

**Đặc điểm**: Chỉ trích xuất từ/cụm từ cơ bản, không có lọc nhiễu hay phân tích ngữ cảnh

### Trường hợp 2: + Context Intelligence
**Các bước**: 1, 2, 3, 4, 7, 8, 12
- **Thêm bước 3**: Context Intelligence

**Đặc điểm**: Có phân tích ngữ cảnh và phân cấp tiêu đề

### Trường hợp 3: + Filtering & Scoring
**Các bước**: 1, 2, 3, 4, 5, 6, 7, 8, 9, 12
- **Thêm bước 5**: Single Word Extraction (với L2R)
- **Thêm bước 6**: Independent Scoring
- **Thêm bước 9**: Topic Modeling

**Đặc điểm**: Có bộ lọc nhiễu và chấm điểm tương phản

### Trường hợp 4: Full Pipeline
**Các bước**: 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12
- **Thêm bước 10**: Within-Topic Ranking
- **Thêm bước 11**: Synonym Grouping (mới thêm)

**Đặc điểm**: Hệ thống đầy đủ, bao gồm xử lý đồng nghĩa

---

## Quy trình thực hiện

### Bước 1: Chuẩn bị Ground Truth
Tạo file `ground_truth.json` với danh sách từ vựng chuẩn:

```json
{
  "document_id": "test_doc_001",
  "document_title": "Machine Learning Basics",
  "ground_truth_vocabulary": [
    {
      "word": "machine learning",
      "type": "phrase",
      "importance": "high",
      "reason": "Core concept"
    },
    {
      "word": "algorithm",
      "type": "word",
      "importance": "high",
      "reason": "Key term"
    }
  ],
  "total_keywords": 50
}
```

### Bước 2: Tạo script đánh giá
Tạo file `python-api/ablation_study.py`

### Bước 3: Chạy thử nghiệm
```bash
cd python-api
python ablation_study.py --document test_document.txt --ground-truth ground_truth.json
```

### Bước 4: Thu thập kết quả
Script sẽ tự động tạo file `ablation_results.csv` với các cột:
- Case
- Precision
- Recall
- F1-Score
- Latency (s)
- Diversity Index
- Total Words
- Unique Words

### Bước 5: Phân tích và vẽ biểu đồ
Script sẽ tự động tạo:
- `ablation_comparison.png`: Biểu đồ so sánh F1-Score
- `ablation_metrics.png`: Biểu đồ radar chart
- `ablation_report.md`: Báo cáo chi tiết

---

## Cách tính các chỉ số

### Tính TP, FP, FN

```python
def calculate_metrics(predicted_words, ground_truth_words):
    # Convert to sets for comparison
    pred_set = set([w.lower().strip() for w in predicted_words])
    truth_set = set([w.lower().strip() for w in ground_truth_words])
    
    # True Positives: Từ máy trích đúng
    TP = len(pred_set.intersection(truth_set))
    
    # False Positives: Từ máy trích sai (rác)
    FP = len(pred_set - truth_set)
    
    # False Negatives: Từ máy trích bị sót
    FN = len(truth_set - pred_set)
    
    # Precision
    precision = TP / (TP + FP) if (TP + FP) > 0 else 0
    
    # Recall
    recall = TP / (TP + FN) if (TP + FN) > 0 else 0
    
    # F1-Score
    f1 = 2 * (precision * recall) / (precision + recall) if (precision + recall) > 0 else 0
    
    return {
        'TP': TP,
        'FP': FP,
        'FN': FN,
        'precision': precision,
        'recall': recall,
        'f1_score': f1
    }
```

### Tính Diversity Index

```python
def calculate_diversity(vocabulary):
    total_words = len(vocabulary)
    unique_words = len(set([v['word'] for v in vocabulary]))
    diversity_index = unique_words / total_words if total_words > 0 else 0
    return diversity_index
```

---

## Ví dụ kết quả mong đợi

| Case | Precision | Recall | F1-Score | Latency (s) | Diversity Index |
|------|-----------|--------|----------|-------------|-----------------|
| 1    | 0.65      | 0.82   | 0.73     | 2.3         | 0.75            |
| 2    | 0.72      | 0.85   | 0.78     | 3.1         | 0.78            |
| 3    | 0.81      | 0.88   | 0.84     | 4.5         | 0.82            |
| 4    | 0.85      | 0.90   | 0.87     | 5.2         | 0.91            |

**Phân tích**:
- Case 1 → 2: Context Intelligence tăng Precision 10.8%
- Case 2 → 3: Filtering & Scoring tăng F1-Score 7.7%
- Case 3 → 4: Synonym Grouping tăng Diversity Index 11%

---

## Lưu ý quan trọng

### 1. Chọn tài liệu test
- Chọn 3-5 tài liệu đại diện
- Độ dài: 1000-3000 từ
- Chủ đề: Đa dạng (technical, academic, general)

### 2. Tạo Ground Truth
- Có thể dùng 2-3 chuyên gia đánh giá độc lập
- Lấy consensus (từ được 2/3 chuyên gia đồng ý)
- Hoặc dùng dataset có sẵn (nếu có)

### 3. Đảm bảo công bằng
- Chạy trên cùng 1 máy
- Cùng 1 tài liệu
- Cùng 1 ground truth
- Chạy 3 lần và lấy trung bình

### 4. Xử lý edge cases
- Từ đồng nghĩa: "ML" vs "Machine Learning" → coi là đúng
- Dạng số nhiều: "algorithm" vs "algorithms" → coi là đúng
- Viết hoa/thường: không phân biệt

---

## Các file cần tạo

1. ✅ `ablation_study.py` - Script chính
2. ✅ `ground_truth.json` - Dữ liệu chuẩn
3. ✅ `test_documents/` - Thư mục chứa tài liệu test
4. ✅ `ablation_results.csv` - Kết quả (tự động tạo)
5. ✅ `ablation_report.md` - Báo cáo (tự động tạo)

---

## Bước tiếp theo

1. Tạo script `ablation_study.py`
2. Chuẩn bị ground truth
3. Chạy thử nghiệm
4. Thu thập và phân tích kết quả
5. Viết báo cáo

Bạn có muốn tôi tạo script `ablation_study.py` ngay không?
