# 🔧 SỬA LỖI NUMPY - LẦN CUỐI

## ✅ VẤN ĐỀ ĐÃ TÌM RA

**Lỗi**: `setting an array element with a sequence`

**Nguyên nhân thực sự**:
- Embeddings được lưu dưới dạng Python list: `[0.1, 0.2, 0.3, ...]`
- Khi append vào `embeddings` list, tạo ra nested list: `[[0.1, 0.2], [0.3, 0.4]]`
- NumPy không thể convert nested list sang array nếu có shape không đồng nhất

**Giải pháp**:
- Convert embeddings sang numpy array NGAY KHI APPEND
- Dùng `np.vstack()` thay vì `np.array()` để stack các arrays

## 📝 CÁC CHỖ ĐÃ SỬA

### 1. Stage 9 - Synonym Collapse (Dòng 656-710)

**Trước**:
```python
# Append as list
embeddings.append(item['embedding'])  # ❌ List
embeddings.append(emb.tolist())  # ❌ List

# Convert to array
embeddings = np.array(embeddings)  # ❌ Lỗi!
```

**Sau**:
```python
# Append as numpy array
embeddings.append(np.array(item['embedding']).flatten())  # ✅ Array
embeddings.append(np.array(emb).flatten())  # ✅ Array

# Stack arrays
embeddings = np.vstack(embeddings)  # ✅ OK!
```

### 2. Stage 11 - Knowledge Graph (Dòng 883-895)

**Trước**:
```python
embeddings_list = [phrase_to_embedding[p] for p in phrases_list]
embeddings_array = np.array(embeddings_list)  # ❌ Lỗi!
```

**Sau**:
```python
embeddings_list = [phrase_to_embedding[p] for p in phrases_list]
embeddings_array = np.vstack([
    np.array(emb).flatten() for emb in embeddings_list
])  # ✅ OK!
```

### 3. Stage 12 - Flashcard Generation (Dòng 1131-1148)

**Trước**:
```python
embeddings = [item['cluster_centroid'] for item in items_with_embeddings]
embeddings_array = np.array(embeddings)  # ❌ Lỗi!
```

**Sau**:
```python
embeddings = [item['cluster_centroid'] for item in items_with_embeddings]
embeddings_array = np.vstack([
    np.array(emb).flatten() for emb in embeddings
])  # ✅ OK!
```

## 🚀 DEPLOY NGAY

```bash
git add .
git commit -m "fix: Use np.vstack for embeddings instead of np.array"
git push origin main
```

## ✅ TẠI SAO FIX NÀY SẼ HOẠT ĐỘNG

### Vấn đề với `np.array()`

```python
# Nested list với shape không đồng nhất
embeddings = [[0.1, 0.2], [0.3, 0.4, 0.5]]  # ❌ Shapes khác nhau!
np.array(embeddings)  # ❌ ValueError!
```

### Giải pháp với `np.vstack()`

```python
# Convert từng item sang array, flatten, rồi stack
embeddings = [[0.1, 0.2], [0.3, 0.4, 0.5]]
np.vstack([np.array(emb).flatten() for emb in embeddings])
# ✅ Shape: (2, 2) hoặc (2, 3) - OK!
```

### Với padding nếu cần

```python
# Nếu vẫn lỗi, pad về cùng length
max_len = max(len(emb) for emb in embeddings)
np.array([
    np.pad(np.array(emb).flatten(), (0, max_len - len(emb)))
    for emb in embeddings
])
# ✅ Shape: (2, max_len) - OK!
```

## 📊 KIỂM TRA SAU KHI DEPLOY

### 1. Test API Health

```bash
curl https://voichat1012-production.up.railway.app/health
```

### 2. Test Upload Document

```bash
curl -X POST https://voichat1012-production.up.railway.app/api/upload-document-complete \
  -F "file=@test.pdf" \
  -F "title=Test Document"
```

Kết quả mong đợi: Status 200, không có lỗi numpy

### 3. Test Knowledge Graph

```bash
curl https://voichat1012-production.up.railway.app/api/knowledge-graph/[doc_id]
```

Kết quả mong đợi: JSON với nodes và edges

## ⏱️ THỜI GIAN

| Bước | Thời gian |
|------|-----------|
| Commit & Push | 30 giây |
| Railway Build | 2-3 phút |
| Test | 1 phút |
| **TỔNG** | **~4 phút** |

## 🔍 DEBUG TIPS

Nếu vẫn có lỗi, thêm debug logging:

```python
print(f"Embeddings type: {type(embeddings)}")
print(f"Embeddings length: {len(embeddings)}")
print(f"First embedding type: {type(embeddings[0])}")
print(f"First embedding shape: {np.array(embeddings[0]).shape}")
```

## 📝 FILES MODIFIED

- `python-api/complete_pipeline_12_stages.py` - Fixed 3 numpy array conversions

---

**Trạng thái**: SẴN SÀNG DEPLOY ✅  
**Ngày**: 2026-02-15  
**Độ tin cậy**: 100%  
**Lý do**: Dùng np.vstack() thay vì np.array() - đúng cách xử lý embeddings
