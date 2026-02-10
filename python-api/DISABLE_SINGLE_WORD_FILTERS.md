# Giải Pháp: Từ 255 Từ Đơn → 5 Từ (Quá Ít!)

## Vấn Đề

```
[STEP 7.1] POS Constraint...
✓ Extracted 255 candidates

[STEP 7.8] Final Scoring & Ranking...
✓ Final output: 5 single words
```

**Mất 250 từ (98%)** - Quá nhiều!

## Các Bước Lọc Trong Single-Word Extraction

### STEP 7.1: POS Constraint (SOFT)
- Chỉ giữ: NOUN, VERB, ADJ, PROPN
- **Impact**: Thường OK, loại bỏ function words

### STEP 7.2: Stopword Removal (HARD) ⚠️
- Loại: the, a, an, of, in, for, with, and, or, but...
- **Impact**: Có thể loại nhầm từ có giá trị
- **Đề xuất**: DISABLE hoặc làm SOFT hơn

### STEP 7.3: Rarity Penalty (SOFT)
- Penalty cho từ quá hiếm hoặc quá phổ biến
- **Impact**: Thấp (chỉ penalty, không loại bỏ)

### STEP 7.4: Learning Value Score (CORE)
- Tính: concreteness, domain_specificity, morphological_richness
- **Impact**: Thấp (chỉ scoring, không loại bỏ)

### STEP 7.5: Phrase Coverage Penalty (SOFT)
- Penalty cho từ đã có trong phrases
- **Impact**: Trung bình (penalty 0.5)

### STEP 7.6: Heading-aware Semantic Filter (HARD) ⚠️⚠️
- Loại từ có similarity < 0.2 với heading
- **Impact**: RẤT CAO - Có thể loại 80-90% từ
- **Đề xuất**: DISABLE hoặc giảm threshold xuống 0.1

### STEP 7.7: Lexical Specificity Check (HARD) ⚠️
- Loại: make, take, provide, important, necessary
- Loại từ < 2 syllables
- **Impact**: Cao - Loại nhiều từ đơn giản
- **Đề xuất**: DISABLE hoặc chỉ loại generic words

### STEP 7.8: Final Scoring & Ranking
- Sort và lấy top max_words
- **Impact**: Phụ thuộc vào max_words parameter

## Đề Xuất Giải Pháp

### Option 1: Disable STEP 7.6 (Heading-aware Semantic Filter)
**Lý do**: Đây là bước lọc MẠNH NHẤT, có thể loại 80-90% từ

```python
# In single_word_extractor.py, line ~199
# Comment out the semantic filter
semantic_words = words_with_coverage  # Skip semantic filter
print(f"  ⚠️  Semantic filter DISABLED")
print(f"  ✓ After semantic filtering: {len(semantic_words)} words")
```

**Expected**: 255 → 100-150 từ

### Option 2: Disable STEP 7.7 (Lexical Specificity Check)
**Lý do**: Loại bỏ từ đơn giản nhưng có thể có giá trị học tập

```python
# In single_word_extractor.py, line ~218
# Comment out specificity check
specific_words = semantic_words  # Skip specificity check
print(f"  ⚠️  Specificity check DISABLED")
print(f"  ✓ After specificity check: {len(specific_words)} words")
```

**Expected**: Giữ thêm 20-30 từ

### Option 3: Tăng max_words Parameter
**Lý do**: Có thể bạn đang set max_words = 5 hoặc 10

```python
# In main.py or complete_pipeline_12_stages.py
result = pipeline.process_document(
    ...
    max_words=30,  # Tăng từ 10 lên 30
    ...
)
```

**Expected**: Lấy nhiều từ hơn từ danh sách đã lọc

### Option 4: Giảm Threshold Semantic Filter
**Lý do**: Threshold 0.2 quá cao, giảm xuống 0.1

```python
# In single_word_extractor.py, method _semantic_filter_by_heading
# Line ~350
if similarity < 0.1:  # Giảm từ 0.2 xuống 0.1
    continue
```

**Expected**: Giữ thêm 30-50% từ

## Cách Kiểm Tra Bước Nào Đang Lọc Nhiều

Xem output console:

```
[STEP 7.1] POS Constraint...
✓ Extracted 255 candidates

[STEP 7.2] Stopword & Function-word Removal...
✓ After stopword removal: 200 words  ← Mất 55 từ (OK)

[STEP 7.6] Heading-aware Semantic Filter...
✓ After semantic filtering: 20 words  ← MẤT 180 TỪ! (PROBLEM!)

[STEP 7.7] Lexical Specificity Check...
✓ After specificity check: 15 words  ← Mất 5 từ (OK)

[STEP 7.8] Final Scoring & Ranking...
✓ Final output: 5 single words  ← Lấy top 5 từ 15 từ
```

→ **STEP 7.6 là thủ phạm!**

## Script Để Disable Filters

Tôi sẽ tạo script để disable các filters:

### 1. Disable STEP 7.6 (Semantic Filter)
```bash
cd python-api
python disable_semantic_filter.py
```

### 2. Disable STEP 7.7 (Specificity Check)
```bash
cd python-api
python disable_specificity_check.py
```

### 3. Tăng max_words
```bash
# Edit main.py hoặc khi gọi API
max_words=30
```

## Khuyến Nghị

**Bắt đầu với Option 1**: Disable STEP 7.6 (Semantic Filter)

Lý do:
- Đây là bước lọc MẠNH NHẤT
- Loại bỏ từ dựa trên similarity với heading
- Nhiều từ có giá trị nhưng không liên quan trực tiếp với heading

Sau khi disable, nếu vẫn ít từ, tiếp tục với Option 2 hoặc 4.

---

**Bạn muốn tôi tạo script để disable filter nào?**
