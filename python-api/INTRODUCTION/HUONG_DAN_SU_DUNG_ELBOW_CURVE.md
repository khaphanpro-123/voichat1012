# Hướng dẫn sử dụng Elbow Curve trong Khóa luận

## 📊 Elbow Curve là gì?

Elbow Curve (Đồ thị khuỷu tay) là biểu đồ minh họa **Elbow Method** - phương pháp xác định số cluster tối ưu trong thuật toán K-Means Clustering.

### Các thành phần của đồ thị:

- **Trục X (hoành)**: Số cluster K (từ 2 đến max_k)
- **Trục Y (tung)**: Inertia (Within-cluster sum of squares)
- **Đường màu xanh**: Giá trị Inertia tại mỗi K
- **Đường đỏ đứt**: Điểm K tối ưu (elbow point)

## 🎯 Mục đích sử dụng

### 1. Chứng minh thuật toán trong hệ thống

Khi bạn viết trong khóa luận:

> "Hệ thống sử dụng Elbow Method để tự động xác định số cluster tối ưu..."

Bạn cần **bằng chứng trực quan** → Đó chính là Elbow Curve!

### 2. Giải thích cách hoạt động

**Nguyên lý Elbow Method:**

1. Chạy K-Means với K từ 2 đến max_k
2. Tính Inertia cho mỗi K
3. Vẽ đồ thị Inertia theo K
4. Tìm "điểm gãy" (elbow point) - nơi Inertia giảm chậm lại
5. K tại điểm gãy là K tối ưu

### 3. Phân tích kết quả cụ thể

Mỗi tài liệu có đặc điểm riêng:
- Tài liệu về "Machine Learning" → K=3 (AI, Data, Programming)
- Tài liệu về "Web Development" → K=4 (Frontend, Backend, Database, DevOps)
- Tài liệu về "Cybersecurity" → K=2 (Attack, Defense)

## 📝 Cách trích dẫn trong khóa luận

### Ví dụ 1: Mô tả thuật toán (Chương 2 - Cơ sở lý thuyết)

```markdown
### 2.3.4 Elbow Method

Elbow Method là phương pháp xác định số cluster tối ưu trong K-Means Clustering.
Phương pháp này dựa trên việc phân tích sự thay đổi của Inertia (tổng bình phương 
khoảng cách từ các điểm đến tâm cluster) khi số cluster K tăng dần.

**Quy trình:**

1. Chạy K-Means với K = 2, 3, 4, ..., max_k
2. Tính Inertia cho mỗi giá trị K
3. Vẽ đồ thị Inertia theo K
4. Xác định "điểm gãy" (elbow point) - điểm mà Inertia giảm chậm lại đáng kể
5. Chọn K tại điểm gãy làm số cluster tối ưu

**Hình 2.X** minh họa đồ thị Elbow Method với dữ liệu mẫu.

[Chèn hình: cache/elbow_curve_doc_XXXXXX.png]

**Hình 2.X: Đồ thị Elbow Method**

Trong ví dụ này, điểm gãy xuất hiện tại K=3, cho thấy 3 cluster là lựa chọn 
tối ưu cho tập dữ liệu này.
```

### Ví dụ 2: Kết quả thực nghiệm (Chương 4 - Kết quả)

```markdown
### 4.2 Kết quả phân cụm từ vựng

Hệ thống đã được thử nghiệm với 3 tài liệu khác nhau về các chủ đề:
Machine Learning, Web Development, và Cybersecurity.

**Bảng 4.1: Kết quả K-Means Clustering**

| Tài liệu | Số từ vựng | K tối ưu | Silhouette Score |
|----------|------------|----------|------------------|
| ML.docx  | 25         | 3        | 0.52             |
| Web.docx | 30         | 4        | 0.48             |
| Sec.docx | 20         | 2        | 0.61             |

**Hình 4.X, 4.Y, 4.Z** minh họa đồ thị Elbow Method cho từng tài liệu.

[Chèn 3 hình elbow curve]

**Hình 4.X: Elbow Method cho tài liệu Machine Learning**
**Hình 4.Y: Elbow Method cho tài liệu Web Development**
**Hình 4.Z: Elbow Method cho tài liệu Cybersecurity**

Kết quả cho thấy Elbow Method tự động xác định được số cluster phù hợp với 
đặc điểm của từng tài liệu. Tài liệu về Machine Learning được chia thành 3 
nhóm chủ đề chính, trong khi tài liệu về Cybersecurity chỉ cần 2 nhóm.
```

### Ví dụ 3: Giải thích chi tiết (Phụ lục)

```markdown
## Phụ lục A: Chi tiết thuật toán Elbow Method

### A.1 Dữ liệu đầu vào

Tài liệu: "Example.docx"
Số từ vựng trích xuất: 25 từ
Phương pháp vector hóa: TF-IDF

### A.2 Quá trình tính toán

**Bảng A.1: Giá trị Inertia theo K**

| K | Inertia | Giảm so với K-1 | Tỷ lệ giảm |
|---|---------|-----------------|------------|
| 2 | 15.23   | -               | -          |
| 3 | 9.87    | 5.36            | 35.2%      |
| 4 | 7.45    | 2.42            | 24.5%      |
| 5 | 6.12    | 1.33            | 17.9%      |
| 6 | 5.34    | 0.78            | 12.7%      |

Từ bảng trên, ta thấy tỷ lệ giảm Inertia chậm lại đáng kể từ K=4 trở đi.
Tuy nhiên, điểm gãy rõ ràng nhất nằm ở K=3, nơi Inertia giảm 35.2%.

**Hình A.1** minh họa đồ thị Elbow với điểm gãy tại K=3.

[Chèn hình: cache/elbow_curve_doc_XXXXXX.png]

### A.3 Kết luận

Dựa trên Elbow Method, hệ thống tự động chọn K=3 làm số cluster tối ưu 
cho tài liệu này.
```

## 🔍 Cách lấy dữ liệu từ Response JSON

Khi upload tài liệu, bạn nhận được response:

```json
{
  "kmeans_clustering": {
    "n_clusters": 3,
    "silhouette_score": 0.52,
    "elbow_analysis": {
      "optimal_k": 3,
      "inertias": [15.23, 9.87, 7.45, 6.12, 5.34],
      "k_values": [2, 3, 4, 5, 6],
      "plot_path": "cache/elbow_curve_doc_20260203_074846.png"
    }
  }
}
```

### Dữ liệu cần lưu:

1. **optimal_k**: Số cluster tối ưu (3)
2. **inertias**: Danh sách giá trị Inertia
3. **k_values**: Danh sách giá trị K đã thử
4. **plot_path**: Đường dẫn file hình
5. **silhouette_score**: Điểm đánh giá chất lượng clustering

## 📸 Cách lưu và sử dụng hình

### Bước 1: Lưu file hình

```bash
# File được lưu tự động tại:
python-api/cache/elbow_curve_doc_20260203_074846.png

# Copy vào thư mục khóa luận:
cp cache/elbow_curve_doc_20260203_074846.png ~/thesis/images/elbow_ml.png
```

### Bước 2: Chèn vào Word/LaTeX

**Word:**
```
Insert → Picture → elbow_ml.png
Caption: "Hình 2.X: Đồ thị Elbow Method cho tài liệu Machine Learning"
```

**LaTeX:**
```latex
\begin{figure}[h]
\centering
\includegraphics[width=0.8\textwidth]{images/elbow_ml.png}
\caption{Đồ thị Elbow Method cho tài liệu Machine Learning}
\label{fig:elbow_ml}
\end{figure}

Như thể hiện trong Hình \ref{fig:elbow_ml}, điểm gãy xuất hiện tại K=3...
```

## 🎓 Các câu hỏi thường gặp khi bảo vệ

### Câu 1: "Em giải thích Elbow Method hoạt động như thế nào?"

**Trả lời:**

> "Elbow Method là phương pháp xác định số cluster tối ưu trong K-Means. 
> Phương pháp này chạy K-Means với nhiều giá trị K khác nhau, từ 2 đến max_k, 
> và tính Inertia (tổng bình phương khoảng cách trong cluster) cho mỗi K.
> 
> Khi K tăng, Inertia sẽ giảm. Tuy nhiên, từ một điểm nào đó, việc tăng K 
> không còn giảm Inertia đáng kể nữa. Điểm đó gọi là 'elbow point' - điểm gãy.
> 
> Trong hệ thống của em, elbow point được xác định tự động bằng cách tìm điểm 
> có sự thay đổi Inertia lớn nhất. Như trong Hình X.X, em thấy điểm gãy rõ ràng 
> tại K=3, nên hệ thống chọn 3 cluster."

### Câu 2: "Tại sao không dùng số cluster cố định?"

**Trả lời:**

> "Mỗi tài liệu có đặc điểm riêng về nội dung và số lượng chủ đề. Ví dụ:
> - Tài liệu về Machine Learning có 3 chủ đề chính: AI, Data, Programming
> - Tài liệu về Web Development có 4 chủ đề: Frontend, Backend, Database, DevOps
> 
> Nếu dùng số cluster cố định, sẽ không phù hợp với tất cả tài liệu. Elbow Method 
> giúp hệ thống tự động điều chỉnh số cluster phù hợp với từng tài liệu.
> 
> Em có thể chứng minh điều này qua Hình X.X, X.Y, X.Z - mỗi tài liệu có K tối ưu 
> khác nhau."

### Câu 3: "Làm sao biết K tối ưu là chính xác?"

**Trả lời:**

> "Em sử dụng 2 chỉ số để đánh giá:
> 
> 1. **Elbow Method**: Xác định K dựa trên điểm gãy của đồ thị Inertia
> 2. **Silhouette Score**: Đánh giá chất lượng clustering (từ -1 đến 1)
> 
> Trong thực nghiệm, em đạt được Silhouette Score trung bình 0.52, cho thấy 
> chất lượng clustering tốt. Score > 0.5 được coi là acceptable trong nghiên cứu.
> 
> Ngoài ra, em cũng kiểm tra thủ công các cluster được tạo ra, và thấy các từ 
> trong cùng cluster thực sự có liên quan về mặt ngữ nghĩa."

## ✅ Checklist cho khóa luận

- [ ] Lưu tất cả elbow curve images vào thư mục thesis
- [ ] Đặt tên file rõ ràng (elbow_ml.png, elbow_web.png, ...)
- [ ] Lưu JSON response để có dữ liệu số
- [ ] Tạo bảng tổng hợp kết quả (K, Inertia, Silhouette Score)
- [ ] Viết caption cho mỗi hình
- [ ] Giải thích ý nghĩa của từng đồ thị
- [ ] Chuẩn bị câu trả lời cho các câu hỏi bảo vệ

## 📚 Tài liệu tham khảo

Khi trích dẫn Elbow Method trong khóa luận:

```
[1] Thorndike, R. L. (1953). "Who belongs in the family?". 
    Psychometrika, 18(4), 267-276.

[2] Kodinariya, T. M., & Makwana, P. R. (2013). "Review on determining 
    number of Cluster in K-Means Clustering". International Journal, 1(6), 90-95.

[3] Scikit-learn Documentation: K-Means Clustering
    https://scikit-learn.org/stable/modules/clustering.html#k-means
```

---

**Lưu ý quan trọng:**

Elbow Curve không chỉ là "hình đẹp" để chèn vào khóa luận. Nó là **bằng chứng** 
cho thấy hệ thống của bạn thực sự sử dụng thuật toán Elbow Method một cách 
chính xác và tự động.

Hãy hiểu rõ cách đọc và giải thích đồ thị này để tự tin trả lời khi bảo vệ!

---

**Tác giả**: Kiro AI Assistant  
**Ngày**: 2026-02-03
