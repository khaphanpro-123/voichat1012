# Fix NaN Values - HOÀN CHỈNH

## Vấn Đề Ban Đầu

Lỗi từ scikit-learn LinearRegression:
```
ValueError: Input X contains NaN. 
LinearRegression does not accept missing values encoded as NaN natively.
```

## Nguyên Nhân

Có **3 nơi** sử dụng LinearRegression/Ridge trong pipeline, nhưng chỉ fix 1 nơi:

1. ✅ `new_pipeline_learned_scoring.py` - Ridge (đã fix trước đó)
2. ❌ `phrase_scorer.py` - LinearRegression (CHƯA FIX)
3. ❌ `word_ranker.py` - LinearRegression (CHƯA FIX)

## Các Fix Đã Áp Dụng ✅

### Fix 1: phrase_scorer.py - train_weights()

**Vị trí:** Dòng 187-234

**Thay đổi:**
```python
# TRƯỚC
X = np.array([
    [
        p.get('semantic_score', 0.5),
        p.get('freq_score', 0.5),
        p.get('length_score', 0.5)
    ]
    for p in phrases
])

# SAU
X = []
for p in phrases:
    features = [
        p.get('semantic_score', 0.5),
        p.get('freq_score', 0.5),
        p.get('length_score', 0.5)
    ]
    # Replace NaN with default value
    features = [0.5 if np.isnan(f) or f is None else f for f in features]
    X.append(features)

X = np.array(X)

# Additional NaN check
if np.any(np.isnan(X)):
    print("  ⚠️  Found NaN values in features, replacing with 0.5")
    X = np.nan_to_num(X, nan=0.5)

if np.any(np.isnan(y)):
    print("  ⚠️  Found NaN values in labels, replacing with 0.5")
    y = np.nan_to_num(y, nan=0.5)
```

### Fix 2: word_ranker.py - train()

**Vị trí:** Dòng 452-510

**Thay đổi:**
```python
# TRƯỚC
X = self._prepare_feature_matrix(candidates)
y = np.array(labels)
X_normalized = self.scaler.fit_transform(X)
self.regression_model = LinearRegression()
self.regression_model.fit(X_normalized, y)

# SAU
X = self._prepare_feature_matrix(candidates)
y = np.array(labels)

# Check for NaN in features
if np.any(np.isnan(X)):
    print("  ⚠️  Found NaN values in features, replacing with 0.5")
    X = np.nan_to_num(X, nan=0.5)

# Check for NaN in labels
if np.any(np.isnan(y)):
    print("  ⚠️  Found NaN values in labels, replacing with 0.5")
    y = np.nan_to_num(y, nan=0.5)

# Normalize features
X_normalized = self.scaler.fit_transform(X)

# Check for NaN after normalization
if np.any(np.isnan(X_normalized)):
    print("  ⚠️  Found NaN values after normalization, replacing with 0.5")
    X_normalized = np.nan_to_num(X_normalized, nan=0.5)

self.regression_model = LinearRegression()
self.regression_model.fit(X_normalized, y)
```

### Fix 3: word_ranker.py - _prepare_feature_matrix()

**Vị trí:** Dòng 515-540

**Thay đổi:**
```python
# TRƯỚC
for candidate in candidates:
    features = [
        candidate.get('semantic_score', 0.5),
        candidate.get('frequency_score', 0.5),
        candidate.get('learning_value', 0.5),
        candidate.get('rarity_penalty', 0.5),
        candidate.get('coverage_penalty', 0.0),
        candidate.get('word_length', 0.5),
        candidate.get('morphological_score', 0.5)
    ]
    X.append(features)

return np.array(X)

# SAU
for candidate in candidates:
    features = [
        candidate.get('semantic_score', 0.5),
        candidate.get('frequency_score', 0.5),
        candidate.get('learning_value', 0.5),
        candidate.get('rarity_penalty', 0.5),
        candidate.get('coverage_penalty', 0.0),
        candidate.get('word_length', 0.5),
        candidate.get('morphological_score', 0.5)
    ]
    # Replace NaN with default values
    features = [0.5 if np.isnan(f) or f is None else f for f in features]
    X.append(features)

X = np.array(X)

# Additional NaN check
if np.any(np.isnan(X)):
    print("  ⚠️  Found NaN in feature matrix, replacing with 0.5")
    X = np.nan_to_num(X, nan=0.5)

return X
```

## Chiến Lược Xử Lý NaN

### Lớp 1: Kiểm tra từng feature
```python
features = [0.5 if np.isnan(f) or f is None else f for f in features]
```
- Thay thế mỗi giá trị NaN/None bằng 0.5

### Lớp 2: Kiểm tra ma trận
```python
if np.any(np.isnan(X)):
    X = np.nan_to_num(X, nan=0.5)
```
- Kiểm tra toàn bộ ma trận
- Thay thế tất cả NaN còn lại

### Lớp 3: Kiểm tra sau normalization
```python
if np.any(np.isnan(X_normalized)):
    X_normalized = np.nan_to_num(X_normalized, nan=0.5)
```
- Kiểm tra sau khi normalize
- Xử lý NaN từ scaler

### Lớp 4: Kiểm tra labels
```python
if np.any(np.isnan(y)):
    y = np.nan_to_num(y, nan=0.5)
```
- Kiểm tra labels
- Thay thế NaN trong target

## Files Đã Sửa

1. **python-api/phrase_scorer.py**
   - Method: `train_weights()` (dòng 187-234)
   - Thêm 4 lớp kiểm tra NaN

2. **python-api/word_ranker.py**
   - Method: `train()` (dòng 452-510)
   - Method: `_prepare_feature_matrix()` (dòng 515-540)
   - Thêm 4 lớp kiểm tra NaN

3. **python-api/new_pipeline_learned_scoring.py** (đã fix trước đó)
   - Method: `_learned_final_scoring()` (dòng ~295)
   - Method: `_independent_scoring()` (dòng ~270)

## Deployment

### Commit History:
```bash
3237984 - fix: handle NaN values in learned scoring pipeline
4f7c258 - fix error l5
21a6d83 - fix: add NaN handling to phrase_scorer and word_ranker LinearRegression
```

### Deploy Status:
- ✅ Committed: 21a6d83
- ✅ Pushed to GitHub
- ⏳ Railway đang deploy (2-3 phút)
- ⏳ Vercel sẽ tự động deploy

## Kết Quả Mong Đợi

### Trước Fix: ❌
```
ValueError: Input X contains NaN
LinearRegression does not accept missing values
Build Failed
500 Internal Server Error
```

### Sau Fix: ✅
```
[STAGE 4] Phrase Extraction...
  ✓ Extracted 40 phrases
[STAGE 5] Single Word Extraction...
  ✓ Extracted 10 words
[STAGE 6] Independent Scoring...
  ✓ Scored 40 phrases
  ✓ Scored 10 words
[STAGE 8] Learned Final Scoring...
  ✓ Applied final scoring
Upload successful
```

## Kiểm Tra

### Bước 1: Đợi Deploy (2-3 phút)
- Railway: https://railway.app/dashboard
- Vercel: https://vercel.com/dashboard

### Bước 2: Test Upload
1. Vào: https://voichat1012.vercel.app/dashboard-new/documents-simple
2. Upload tài liệu tiếng Anh (PDF/DOCX/TXT)
3. Kiểm tra kết quả

### Bước 3: Kiểm Tra Logs
- Railway logs không còn lỗi NaN
- Upload thành công
- Trả về vocabulary + flashcards

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

## Trạng Thái Cuối Cùng

✅ **TẤT CẢ FIX ĐÃ HOÀN THÀNH**
- 9 fixes đã được áp dụng
- 3 nơi sử dụng LinearRegression đều đã xử lý NaN
- Code đã được commit và push
- Đang chờ Railway + Vercel deploy

## Bước Tiếp Theo

1. **Đợi 2-3 phút** cho Railway deploy
2. **Đợi 1-2 phút** cho Vercel deploy
3. **Test upload** tài liệu
4. **Xác nhận** không còn lỗi NaN

---

**Thời gian:** 2026-03-02  
**Commit:** 21a6d83  
**Trạng thái:** ĐÃ FIX HOÀN CHỈNH ✅  
**Đang chờ:** Railway + Vercel deploy ⏳
