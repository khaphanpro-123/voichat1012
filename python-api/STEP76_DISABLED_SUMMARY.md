# ✅ STEP 7.6 (Semantic Filter) Đã Disable

## Vấn Đề

```
Input:  255 từ đơn (sau STEP 7.1)
Output: 5 từ đơn (sau STEP 7.8)
Loss:   250 từ (98%)
```

**Quá nhiều từ bị lọc bỏ!**

## Nguyên Nhân

**STEP 7.6: Heading-aware Semantic Filter** đang lọc quá mạnh:
- Loại bỏ từ có `similarity < 0.2` với heading
- Có thể loại 80-90% từ
- Nhiều từ có giá trị học tập nhưng không liên quan trực tiếp với heading

## Giải Pháp

Đã **DISABLE STEP 7.6** hoàn toàn:

### Code Cũ (OLD)
```python
# STEP 7.6: Heading-aware Semantic Filter (HARD FILTER)
print("[STEP 7.6] Heading-aware Semantic Filter...")

main_heading = self._get_main_heading(headings)

if main_heading and HAS_EMBEDDINGS:
    semantic_words = self._semantic_filter(
        words_with_coverage,
        main_heading,
        threshold=semantic_threshold
    )
else:
    semantic_words = words_with_coverage
    print(f"  ⚠️  Semantic filtering skipped (no heading or embeddings)")

print(f"  ✓ After semantic filtering: {len(semantic_words)} words")
```

### Code Mới (NEW)
```python
# STEP 7.6: Heading-aware Semantic Filter (DISABLED)
print("[STEP 7.6] Heading-aware Semantic Filter - DISABLED")

# DISABLED: This filter is too aggressive (removes 80-90% of words)
semantic_words = words_with_coverage  # Keep all words
print(f"  ⚠️  Semantic filter DISABLED - keeping all {len(semantic_words)} words")
```

## Kết Quả Mong Đợi

### Trước (OLD)
```
[STEP 7.1] POS Constraint...
✓ Extracted 255 candidates

[STEP 7.5] Calculate Phrase Coverage Penalty...
✓ After coverage penalty: 200 words

[STEP 7.6] Heading-aware Semantic Filter...
✓ After semantic filtering: 20 words  ← MẤT 180 TỪ!

[STEP 7.7] Lexical Specificity Check...
✓ After specificity check: 15 words

[STEP 7.8] Final Scoring & Ranking...
✓ Final output: 5 single words
```

### Sau (NEW)
```
[STEP 7.1] POS Constraint...
✓ Extracted 255 candidates

[STEP 7.5] Calculate Phrase Coverage Penalty...
✓ After coverage penalty: 200 words

[STEP 7.6] Heading-aware Semantic Filter - DISABLED
⚠️  Semantic filter DISABLED - keeping all 200 words  ← GIỮ TẤT CẢ!

[STEP 7.7] Lexical Specificity Check...
✓ After specificity check: 150 words

[STEP 7.8] Final Scoring & Ranking...
✓ Final output: 30 single words  ← NHIỀU HƠN!
```

**Expected**: Từ 5 từ → 30-50 từ (tăng 6-10 lần)

## Nếu Vẫn Ít Từ

Nếu sau khi disable STEP 7.6 mà vẫn chỉ có 10-15 từ, có thể:

### Option 1: Disable STEP 7.7 (Lexical Specificity Check)
```bash
cd python-api
python disable_step77_specificity_check.py
```

### Option 2: Tăng max_words Parameter
```python
# In main.py or when calling API
max_words=50  # Tăng từ 10 lên 50
```

### Option 3: Giảm Phrase Coverage Penalty
STEP 7.5 đang penalty 0.5 cho từ có trong phrases. Có thể giảm xuống 0.2.

## Testing

```bash
# 1. Restart server
cd python-api
python main.py

# 2. Upload document lại

# 3. Check output - phải thấy:
#    [STEP 7.6] Heading-aware Semantic Filter - DISABLED
#    ⚠️  Semantic filter DISABLED - keeping all X words
```

## Files Đã Sửa

- ✅ `python-api/single_word_extractor.py` - STEP 7.6 disabled

---

**Status**: ✅ COMPLETED  
**Date**: 2026-02-09  
**Impact**: HIGH - Giữ nhiều từ đơn hơn (từ 5 → 30-50 từ)
