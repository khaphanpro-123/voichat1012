# 📊 TẠO ĐỒ THỊ ELBOW KHI UPLOAD FILE

## ✅ ĐÃ SỬA

Bây giờ khi upload file, hệ thống sẽ **TỰ ĐỘNG**:
1. Trích xuất từ vựng
2. Chạy K-Means clustering
3. Tạo đồ thị Elbow
4. Trả về kết quả trong response

---

## 🚀 CÁCH SỬ DỤNG

### Bước 1: Restart Server

```bash
# Dừng server (Ctrl+C)
cd python-api
python main.py
```

### Bước 2: Upload File

**Swagger UI:**
1. Mở http://127.0.0.1:8000/docs
2. Tìm **POST /api/upload-document**
3. Click **"Try it out"**
4. Chọn file
5. Điền:
   ```
   max_words: 50  ← Ít nhất 5 từ để cluster
   language: en
   ```
6. Click **"Execute"**

---

## 📊 RESPONSE MỚI

### Trước (Không có K-Means):

```json
{
  "vocabulary_count": 50,
  "vocabulary": [...],
  "flashcards_count": 10
}
```

### Sau (Có K-Means + Elbow):

```json
{
  "vocabulary_count": 50,
  "vocabulary": [...],
  "flashcards_count": 10,
  
  "kmeans_clustering": {                    ← MỚI! ✅
    "n_clusters": 5,
    "silhouette_score": 0.342,
    "method": "K-Means with TF-IDF",
    
    "elbow_analysis": {                     ← Elbow Method ✅
      "optimal_k": 5,
      "inertias": [45.2, 32.1, 24.5, 20.1, 18.3],
      "k_values": [2, 3, 4, 5, 6],
      "plot_path": "cache/elbow_curve.png"  ← Đồ thị ✅
    },
    
    "clusters": [
      {
        "cluster_id": 0,
        "representative_word": "machine learning",
        "cluster_size": 12,
        "words": ["machine learning", "deep learning", "neural networks"]
      },
      {
        "cluster_id": 1,
        "representative_word": "data science",
        "cluster_size": 10,
        "words": ["data science", "big data", "analytics"]
      }
    ]
  }
}
```

---

## 🖼️ XEM ĐỒ THỊ ELBOW

### Vị trí file:

```
python-api/cache/elbow_curve.png
```

### Mở file:

**Windows:**
```bash
start python-api\cache\elbow_curve.png
```

**Mac/Linux:**
```bash
open python-api/cache/elbow_curve.png
```

**Hoặc:** Mở thư mục `python-api/cache/` và double-click file `elbow_curve.png`

---

## 🔍 ĐIỀU KIỆN TẠO ĐỒ THỊ

Đồ thị Elbow chỉ được tạo khi:

1. ✅ **Có ít nhất 5 từ vựng** (để cluster)
2. ✅ **File có nội dung đủ dài** (ít nhất 50 ký tự)
3. ✅ **Server đã restart** (để áp dụng code mới)

### Nếu không đủ điều kiện:

Response sẽ có:
```json
{
  "kmeans_clustering": null  ← Không có clustering
}
```

Hoặc:
```json
{
  "kmeans_clustering": {
    "clusters": [],
    "n_clusters": 0,
    "method": "K-Means (skipped - too few words)"
  }
}
```

---

## 🎯 VÍ DỤ HOÀN CHỈNH

### 1. Tạo file test

```bash
echo "Machine learning is transforming the world. Deep learning uses neural networks. Natural language processing helps computers understand text. Computer vision enables image recognition. Data science combines statistics and programming." > test.txt
```

### 2. Upload file

```bash
curl -X POST "http://127.0.0.1:8000/api/upload-document" \
  -F "file=@test.txt" \
  -F "max_words=20" \
  -F "language=en"
```

### 3. Kiểm tra response

```json
{
  "success": true,
  "vocabulary_count": 20,
  "kmeans_clustering": {
    "n_clusters": 4,
    "elbow_analysis": {
      "optimal_k": 4,
      "plot_path": "cache/elbow_curve.png"  ← Đồ thị đã tạo!
    }
  }
}
```

### 4. Xem đồ thị

```bash
start python-api\cache\elbow_curve.png
```

---

## 🐛 TROUBLESHOOTING

### Vấn đề 1: Không có `kmeans_clustering` trong response

**Nguyên nhân:** Server chưa restart

**Giải pháp:**
```bash
# Dừng server (Ctrl+C)
cd python-api
python main.py
```

### Vấn đề 2: `kmeans_clustering: null`

**Nguyên nhân:** File quá ngắn, không đủ từ vựng

**Giải pháp:** Upload file dài hơn hoặc tăng `max_words`

### Vấn đề 3: Không tìm thấy file `elbow_curve.png`

**Nguyên nhân:** Thư mục `cache` chưa tồn tại

**Giải pháp:**
```bash
mkdir python-api\cache
```

### Vấn đề 4: Lỗi matplotlib

**Nguyên nhân:** Chưa cài matplotlib

**Giải pháp:**
```bash
pip install matplotlib
```

---

## 📝 TÓM TẮT

| Endpoint | Tạo đồ thị Elbow? | Điều kiện |
|----------|------------------|-----------|
| /api/upload-document | ✅ Có (sau khi sửa) | ≥ 5 từ vựng |
| /api/kmeans-cluster | ✅ Có | ≥ 2 từ vựng |
| /api/smart-vocabulary-extract | ❌ Không | - |

---

## 🎉 HOÀN THÀNH!

Bây giờ mỗi lần upload file, bạn sẽ nhận:
- ✅ Từ vựng được trích xuất
- ✅ K-Means clustering
- ✅ Đồ thị Elbow
- ✅ Optimal K tự động

**Không cần gọi endpoint riêng nữa!**
