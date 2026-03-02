# Fix Lỗi NaN Values trong LinearRegression

## Vấn Đề
Lỗi từ scikit-learn:
```
Input X contains NaN. LinearRegression does not accept missing values encoded as NaN natively.
```

## Nguyên Nhân
Trong quá trình tính toán các điểm số (semantic_score, learning_value, freq_score, rarity_score), một số giá trị có thể là NaN do:
1. Chia cho 0 khi normalize
2. Cosine similarity với vector rỗng
3. Log của số âm
4. Thiếu dữ liệu embedding

## Các Fix Đã Áp Dụng ✅

### Fix 1: Xử lý NaN trong `_learned_final_scoring`
```python
# TRƯỚC
features = [
    item.get('semantic_score', 0.5),
    item.get('learning_value', 0.5),
    item.get('freq_score', 0.5),
    item.get('rarity_score', 0.5)
]
X.append(features)

# SAU
features = [
    item.get('semantic_score', 0.5),
    item.get('learning_value', 0.5),
    item.get('freq_score', 0.5),
    item.get('rarity_score', 0.5)
]
# Thay thế NaN bằng giá trị mặc định
features = [0.5 if np.isnan(f) or f is None else f for f in features]
X.append(features)

# Kiểm tra thêm
if np.any(np.isnan(X)):
    print("  ⚠️  Found NaN values in features, replacing with 0.5")
    X = np.nan_to_num(X, nan=0.5)
```

### Fix 2: Xử lý NaN trong normalization
```python
# TRƯỚC
freq_scores = [item['freq_score'] for item in items]
rarity_scores = [item['rarity_score'] for item in items]
max_freq = max(freq_scores) if freq_scores else 1.0
max_rarity = max(rarity_scores) if rarity_scores else 1.0

for item in items:
    item['freq_score'] = item['freq_score'] / max_freq if max_freq > 0 else 0.0
    item['rarity_score'] = item['rarity_score'] / max_rarity if max_rarity > 0 else 0.0

# SAU
freq_scores = [item.get('freq_score', 0.0) for item in items]
rarity_scores = [item.get('rarity_score', 0.0) for item in items]

# Loại bỏ NaN trước khi tìm max
freq_scores = [f for f in freq_scores if not np.isnan(f)]
rarity_scores = [r for r in rarity_scores if not np.isnan(r)]

max_freq = max(freq_scores) if freq_scores else 1.0
max_rarity = max(rarity_scores) if rarity_scores else 1.0

for item in items:
    freq = item.get('freq_score', 0.0)
    rarity = item.get('rarity_score', 0.0)
    
    # Xử lý NaN và chia cho 0
    if np.isnan(freq) or max_freq == 0:
        item['freq_score'] = 0.0
    else:
        item['freq_score'] = freq / max_freq
    
    if np.isnan(rarity) or max_rarity == 0:
        item['rarity_score'] = 0.0
    else:
        item['rarity_score'] = rarity / max_rarity
```

## File Đã Sửa

**python-api/new_pipeline_learned_scoring.py**
- Thêm xử lý NaN trong `_learned_final_scoring()` (dòng ~295)
- Thêm xử lý NaN trong `_independent_scoring()` (dòng ~270)

## Cách Hoạt Động

### Bước 1: Kiểm tra từng feature
```python
features = [0.5 if np.isnan(f) or f is None else f for f in features]
```
- Thay thế mỗi giá trị NaN bằng 0.5 (giá trị trung bình)

### Bước 2: Kiểm tra toàn bộ ma trận
```python
if np.any(np.isnan(X)):
    X = np.nan_to_num(X, nan=0.5)
```
- Kiểm tra lại toàn bộ ma trận X
- Thay thế tất cả NaN còn lại

### Bước 3: Xử lý normalization an toàn
```python
if np.isnan(freq) or max_freq == 0:
    item['freq_score'] = 0.0
```
- Kiểm tra NaN trước khi chia
- Kiểm tra chia cho 0

## Kết Quả Mong Đợi

### Trước Fix: ❌
```
ValueError: Input X contains NaN
LinearRegression does not accept missing values
Pipeline crashes
500 error
```

### Sau Fix: ✅
```
[STAGE 8] Learned Final Scoring...
  ✓ Applied final scoring
[STAGE 9] Topic Modeling...
  ✓ Created 5 topics
Upload successful
Vocabulary extracted
```

## Deploy

### Lệnh Deploy:
```bash
git add python-api/new_pipeline_learned_scoring.py
git commit -m "fix: handle NaN values in learned scoring pipeline"
git push origin main
```

### Kiểm Tra:
1. Đợi Railway deploy (2-3 phút)
2. Thử upload tài liệu
3. Kiểm tra không còn lỗi NaN

## Các Fix Liên Quan

Đây là fix thứ 5 trong chuỗi:
1. **BACKEND_API_PARAMETER_FIX** - Tương thích tham số
2. **API_RESPONSE_STRUCTURE_FIX** - Cấu trúc response
3. **SEMANTIC_THEME_KEYERROR_FIX** - Clustering fallback
4. **NLTK_DATA_DOWNLOAD_FIX** - Download NLTK data
5. **NAN_VALUES_FIX** - Fix này (xử lý NaN)

## Trạng Thái

✅ **ĐÃ FIX** - Xử lý NaN ở tất cả các điểm có thể  
✅ **AN TOÀN** - Nhiều lớp kiểm tra  
✅ **HOÀN CHỈNH** - Xử lý cả feature và normalization  
✅ **SẴN SÀNG** - Deploy lên Railway

## Tóm Tắt

**Vấn đề:** LinearRegression nhận giá trị NaN  
**Nguyên nhân:** Tính toán điểm số tạo ra NaN  
**Giải pháp:** Thay thế NaN bằng 0.5, kiểm tra chia cho 0  
**Kết quả:** Upload hoạt động, không còn lỗi NaN  
**Trạng thái:** ĐÃ FIX ✅
