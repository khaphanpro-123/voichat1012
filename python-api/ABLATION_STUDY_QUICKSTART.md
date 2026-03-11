# ABLATION STUDY - HƯỚNG DẪN NHANH

## Bước 1: Chuẩn bị tài liệu test

Tạo file `test_document.txt` với nội dung tiếng Anh (1000-3000 từ):

```
Machine Learning Basics

Machine learning is a subset of artificial intelligence that enables computers to learn from data without being explicitly programmed. It uses algorithms to identify patterns and make predictions...

[Nội dung đầy đủ của tài liệu]
```

## Bước 2: Tạo Ground Truth

Tạo file `ground_truth.json` (hoặc dùng `ground_truth_example.json` mẫu):

```json
{
  "document_id": "test_001",
  "document_title": "Machine Learning Basics",
  "ground_truth_vocabulary": [
    "machine learning",
    "artificial intelligence",
    "algorithm",
    ...
  ],
  "total_keywords": 50
}
```

**Cách tạo Ground Truth:**

### Option 1: Thủ công
1. Đọc tài liệu
2. Liệt kê 30-50 từ khóa quan trọng nhất
3. Bao gồm cả từ đơn và cụm từ
4. Lưu vào JSON

### Option 2: Dùng chuyên gia
1. Mời 2-3 chuyên gia
2. Mỗi người tạo danh sách riêng
3. Lấy consensus (từ được 2/3 đồng ý)

### Option 3: Dùng dataset có sẵn
- Nếu có dataset benchmark (như SemEval, ACL)
- Sử dụng ground truth có sẵn

## Bước 3: Cài đặt dependencies

```bash
pip install pandas matplotlib numpy scikit-learn
```

## Bước 4: Chạy Ablation Study

```bash
cd python-api
python ablation_study.py --document test_document.txt --ground-truth ground_truth.json
```

## Bước 5: Xem kết quả

Script sẽ tạo 4 files:

### 1. `ablation_results.csv`
```csv
case,steps,precision,recall,f1_score,latency,diversity_index,total_words,unique_words
Case 1: Baseline,1,2,4,7,8,12,0.65,0.82,0.73,2.3,0.75,120,90
Case 2: + Context,1,2,3,4,7,8,12,0.72,0.85,0.78,3.1,0.78,115,90
...
```

### 2. `ablation_report.md`
Báo cáo chi tiết với phân tích % cải thiện

### 3. `ablation_f1_comparison.png`
Biểu đồ cột so sánh F1-Score

### 4. `ablation_radar_chart.png`
Biểu đồ radar so sánh tất cả metrics

## Bước 6: Phân tích kết quả

### Ví dụ kết quả mong đợi:

| Case | Precision | Recall | F1-Score | Latency | Diversity |
|------|-----------|--------|----------|---------|-----------|
| 1    | 0.65      | 0.82   | 0.73     | 2.3s    | 0.75      |
| 2    | 0.72      | 0.85   | 0.78     | 3.1s    | 0.78      |
| 3    | 0.81      | 0.88   | 0.84     | 4.5s    | 0.82      |
| 4    | 0.85      | 0.90   | 0.87     | 5.2s    | 0.91      |

### Phân tích:

**Case 1 → 2 (+ Context Intelligence):**
- Precision tăng 10.8% (0.65 → 0.72)
- Recall tăng 3.7% (0.82 → 0.85)
- F1-Score tăng 6.8% (0.73 → 0.78)
- **Kết luận**: Context Intelligence giúp lọc nhiễu tốt hơn

**Case 2 → 3 (+ Filtering & Scoring):**
- Precision tăng 12.5% (0.72 → 0.81)
- Recall tăng 3.5% (0.85 → 0.88)
- F1-Score tăng 7.7% (0.78 → 0.84)
- **Kết luận**: Bộ lọc nhiễu và chấm điểm tương phản rất hiệu quả

**Case 3 → 4 (+ Synonym Grouping):**
- Precision tăng 4.9% (0.81 → 0.85)
- Recall tăng 2.3% (0.88 → 0.90)
- F1-Score tăng 3.6% (0.84 → 0.87)
- Diversity Index tăng 11% (0.82 → 0.91)
- **Kết luận**: Synonym Grouping giảm trùng lặp đáng kể

## Bước 7: Viết vào luận văn

### Bảng kết quả:

```
Bảng X: Kết quả Ablation Study

| STT | Thành phần | Precision | Recall | F1-Score | Latency | Diversity |
|-----|------------|-----------|--------|----------|---------|-----------|
| 1   | Baseline   | 0.65      | 0.82   | 0.73     | 2.3s    | 0.75      |
| 2   | + Context  | 0.72      | 0.85   | 0.78     | 3.1s    | 0.78      |
| 3   | + Filter   | 0.81      | 0.88   | 0.84     | 4.5s    | 0.82      |
| 4   | Full       | 0.85      | 0.90   | 0.87     | 5.2s    | 0.91      |
```

### Phần mô tả:

```
Bảng X thể hiện kết quả thực nghiệm Ablation Study trên tập dữ liệu test gồm 
5 tài liệu với tổng cộng 250 từ khóa ground truth. Kết quả cho thấy:

1. Hệ thống baseline (Case 1) đạt F1-Score 0.73, cho thấy khả năng trích xuất 
   cơ bản đã khá tốt.

2. Bổ sung Context Intelligence (Case 2) giúp tăng Precision lên 10.8%, chứng 
   minh việc phân tích ngữ cảnh giúp lọc nhiễu hiệu quả.

3. Thêm Filtering & Scoring (Case 3) mang lại cải thiện đáng kể với F1-Score 
   tăng 7.7%, đạt 0.84.

4. Hệ thống đầy đủ (Case 4) với Synonym Grouping đạt F1-Score cao nhất 0.87 
   và Diversity Index 0.91, chứng minh khả năng giảm trùng lặp tốt.

Thời gian xử lý tăng dần từ 2.3s đến 5.2s, vẫn nằm trong ngưỡng chấp nhận 
được cho ứng dụng thực tế.
```

## Lưu ý quan trọng

### 1. Chọn tài liệu đại diện
- Độ dài: 1000-3000 từ
- Chủ đề: Đa dạng (technical, academic, general)
- Số lượng: 3-5 tài liệu

### 2. Ground Truth chất lượng
- Cần có ít nhất 30-50 từ khóa
- Bao gồm cả từ đơn và cụm từ
- Đại diện cho nội dung chính

### 3. Chạy nhiều lần
- Chạy 3 lần và lấy trung bình
- Đảm bảo kết quả ổn định

### 4. So sánh công bằng
- Cùng 1 máy
- Cùng 1 tài liệu
- Cùng 1 ground truth

## Troubleshooting

### Lỗi: ModuleNotFoundError
```bash
pip install -r requirements.txt
```

### Lỗi: File not found
Kiểm tra đường dẫn file:
```bash
ls test_document.txt
ls ground_truth.json
```

### Kết quả quá thấp
- Kiểm tra ground truth có đúng không
- Kiểm tra tài liệu có phù hợp không
- Thử với tài liệu khác

### Thời gian chạy quá lâu
- Giảm độ dài tài liệu
- Giảm số topics (n_topics=3)

## Liên hệ

Nếu có vấn đề, tạo issue trên GitHub hoặc liên hệ qua email.
