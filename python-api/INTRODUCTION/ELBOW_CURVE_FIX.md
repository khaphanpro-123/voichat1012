# Fix: Unique Elbow Curve Files Per Document

## 🔴 Problem

Khi upload nhiều tài liệu khác nhau, tất cả đều tạo ra cùng một file `cache/elbow_curve.png`, dẫn đến:
- File cũ bị ghi đè bởi file mới
- Không thể xem lại đồ thị Elbow của các tài liệu trước đó
- Mất dữ liệu chứng minh thuật toán cho từng tài liệu

## 🎯 Mục đích của Elbow Curve

Đồ thị Elbow curve có 3 mục đích quan trọng:

### 1. Chứng minh thuật toán Elbow Method
- Hiển thị quá trình tìm K tối ưu
- Cho thấy inertia giảm dần khi K tăng
- Xác định "điểm gãy" (elbow point) để chọn K

### 2. Minh chứng cho khóa luận
- Cung cấp bằng chứng trực quan về thuật toán
- Có thể chèn vào báo cáo/khóa luận
- Chứng minh hệ thống thực sự sử dụng Elbow Method

### 3. Phân tích từng tài liệu
- Mỗi tài liệu có đặc điểm riêng
- Số cluster tối ưu khác nhau cho mỗi tài liệu
- Cần lưu trữ riêng để so sánh và phân tích

## ✅ Solution

### Thay đổi 1: Thêm tham số `document_id` vào `cluster_vocabulary_kmeans()`

**File: `python-api/kmeans_clustering.py`**

```python
def cluster_vocabulary_kmeans(
    vocabulary_list: List[Dict],
    text: str,
    n_clusters: int = None,
    use_elbow: bool = True,
    max_k: int = 10,
    document_id: str = None  # ✅ Thêm tham số này
) -> Dict:
```

### Thay đổi 2: Tạo tên file duy nhất cho mỗi document

**File: `python-api/kmeans_clustering.py`**

```python
# Tạo tên file duy nhất cho mỗi document
if document_id:
    plot_filename = f"cache/elbow_curve_{document_id}.png"
else:
    from datetime import datetime
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    plot_filename = f"cache/elbow_curve_{timestamp}.png"

plot_elbow_curve(inertias, k_values, optimal_k, plot_filename)
```

### Thay đổi 3: Truyền `document_id` từ upload endpoint

**File: `python-api/main.py`**

```python
# STAGE 4: Build Knowledge Graph
document_id = f"doc_{timestamp}"

# K-MEANS: Cluster vocabulary (if enough words)
clustering_result = cluster_vocabulary_kmeans(
    vocabulary_list,
    text,
    use_elbow=True,
    max_k=min(10, len(vocabulary_list) // 2),
    document_id=document_id  # ✅ Truyền document_id
)
```

### Thay đổi 4: Cập nhật `/api/kmeans-cluster` endpoint

**File: `python-api/main.py`**

```python
# Generate unique document_id for this request
document_id = f"kmeans_{datetime.now().strftime('%Y%m%d_%H%M%S')}"

# K-MEANS: Cluster vocabulary
clustering_result = cluster_vocabulary_kmeans(
    vocabulary_list,
    text,
    use_elbow=True,
    max_k=min(10, len(vocabulary_list) // 2),
    document_id=document_id  # ✅ Truyền document_id
)
```

## 📊 Kết quả

### Trước khi fix:
```
cache/
  └── elbow_curve.png  (bị ghi đè mỗi lần upload)
```

### Sau khi fix:
```
cache/
  ├── elbow_curve_doc_20260203_074846.png
  ├── elbow_curve_doc_20260203_080211.png
  ├── elbow_curve_doc_20260203_134225.png
  └── elbow_curve_kmeans_20260203_162538.png
```

## 🧪 Testing

Chạy script test để kiểm tra:

```bash
cd python-api
python test_unique_elbow.py
```

Script này sẽ:
1. Upload 3 tài liệu khác nhau
2. Kiểm tra mỗi tài liệu tạo ra file elbow curve riêng
3. Xác nhận tất cả file đều unique (không bị ghi đè)

## 📝 Response JSON

Sau khi fix, response sẽ chứa đường dẫn file duy nhất:

```json
{
  "success": true,
  "document_id": "doc_20260203_074846",
  "kmeans_clustering": {
    "n_clusters": 3,
    "silhouette_score": 0.45,
    "elbow_analysis": {
      "optimal_k": 3,
      "plot_path": "cache/elbow_curve_doc_20260203_074846.png",
      "inertias": [12.5, 8.3, 5.2, 4.1],
      "k_values": [2, 3, 4, 5]
    }
  }
}
```

## 🎓 Sử dụng trong khóa luận

### Cách trích dẫn trong báo cáo:

**Hình X.X: Đồ thị Elbow Method cho tài liệu "Example.docx"**

> Hình X.X minh họa quá trình tìm số cluster tối ưu sử dụng Elbow Method. 
> Trục hoành biểu diễn số cluster K (từ 2 đến 10), trục tung biểu diễn giá trị 
> Inertia (tổng bình phương khoảng cách trong cluster). Điểm gãy (elbow point) 
> xuất hiện tại K=3, cho thấy đây là số cluster tối ưu cho tài liệu này.

### Các file cần lưu trữ:

1. **Elbow curve image**: `cache/elbow_curve_doc_XXXXXX.png`
2. **JSON response**: Lưu toàn bộ response để có dữ liệu số
3. **Document metadata**: Tên file, số từ vựng, timestamp

## ✅ Checklist

- [x] Thêm tham số `document_id` vào `cluster_vocabulary_kmeans()`
- [x] Tạo tên file unique dựa trên `document_id`
- [x] Truyền `document_id` từ `/api/upload-document`
- [x] Truyền `document_id` từ `/api/kmeans-cluster`
- [x] Cập nhật response JSON với `plot_path` chính xác
- [x] Tạo test script để verify
- [x] Viết documentation

## 🚀 Next Steps

1. Chạy test để verify fix hoạt động đúng
2. Upload nhiều tài liệu và kiểm tra folder `cache/`
3. Lưu trữ các elbow curve images cho khóa luận
4. Có thể thêm API endpoint để list tất cả elbow curves đã tạo

---

**Tác giả**: Kiro AI Assistant  
**Ngày**: 2026-02-03  
**Version**: 1.0
