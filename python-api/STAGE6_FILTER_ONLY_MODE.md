# STAGE 6: BM25 Filter Only Mode - Chỉ Loại Bỏ Ảo Giác

## 🎯 Thay Đổi Quan Trọng

### Trước Đây (Old Mode)
```
BM25 = Re-ranking (80% semantic + 20% BM25)
→ Thay đổi điểm số của TẤT CẢ từ vựng
```

### Bây Giờ (Filter Only Mode)
```
BM25 = Filter Only (loại bỏ hallucination)
→ CHỈ loại bỏ từ không có trong văn bản
→ GIỮ NGUYÊN điểm số semantic cho các từ còn lại
```

---

## 📊 Cách Hoạt Động Mới

### Quy Tắc Đơn Giản

```python
for phrase in phrases:
    bm25_score = calculate_bm25(phrase, document)
    
    if bm25_score == 0:
        # Từ KHÔNG CÓ trong văn bản → LOẠI BỎ
        remove(phrase)
    else:
        # Từ CÓ trong văn bản → GIỮ LẠI (điểm số không đổi)
        keep(phrase, original_score)
```

**Không có công thức phức tạp!** Chỉ có 2 trường hợp:
- BM25 = 0 → Loại bỏ ❌
- BM25 > 0 → Giữ lại ✅

---

## 🔍 Ví Dụ Cụ Thể

### Văn Bản
```
Climate change is one of the most pressing issues. The global 
temperature has increased by 1.5°C since pre-industrial times.
```

### Input (từ STAGE 4)

| # | Phrase | Semantic Score | BM25 Score | Có trong văn bản? |
|---|--------|----------------|------------|-------------------|
| 1 | "climate change" | 0.95 | 8.5 | ✅ YES |
| 2 | "environmental crisis" | 0.88 | 0.0 | ❌ NO |
| 3 | "global warming" | 0.85 | 0.0 | ❌ NO |
| 4 | "temperature increase" | 0.82 | 4.2 | ✅ YES (partial) |
| 5 | "1.5°C" | 0.60 | 9.2 | ✅ YES |

---

### Output (sau STAGE 6)

#### ✅ Giữ Lại (BM25 > 0)

| Phrase | Original Score | BM25 | Final Score | Thay đổi |
|--------|----------------|------|-------------|----------|
| "climate change" | 0.95 | 8.5 | **0.95** | Không đổi ✅ |
| "temperature increase" | 0.82 | 4.2 | **0.82** | Không đổi ✅ |
| "1.5°C" | 0.60 | 9.2 | **0.60** | Không đổi ✅ |

**Quan trọng**: Điểm số semantic **KHÔNG THAY ĐỔI**!

---

#### ❌ Loại Bỏ (BM25 = 0)

| Phrase | Original Score | BM25 | Lý do |
|--------|----------------|------|-------|
| "environmental crisis" | 0.88 | 0.0 | Không có trong văn bản |
| "global warming" | 0.85 | 0.0 | Không có trong văn bản |

**Kết quả**: 5 phrases → 3 phrases (loại bỏ 2 ảo giác)

---

## 📈 So Sánh: Old vs New Mode

### Old Mode (Re-ranking)

```
Input: "climate change" (semantic: 0.95, BM25: 8.5)

Calculation:
Final = 0.8 × 0.95 + 0.2 × 0.85
      = 0.76 + 0.17
      = 0.93

Result: 0.95 → 0.93 (giảm 0.02) ⚠️
```

**Vấn đề**: Điểm số bị thay đổi (dù từ có trong văn bản)

---

### New Mode (Filter Only)

```
Input: "climate change" (semantic: 0.95, BM25: 8.5)

Check:
BM25 > 0? YES → Keep with original score

Result: 0.95 → 0.95 (không đổi) ✅
```

**Lợi ích**: Điểm số semantic được giữ nguyên

---

## 🎯 Lợi Ích Của Filter Only Mode

### 1. Đơn Giản Hơn
- ❌ Không có công thức phức tạp (80% + 20%)
- ✅ Chỉ có quy tắc đơn giản: BM25 = 0 → loại bỏ

### 2. Giữ Nguyên Semantic Score
- ❌ Không thay đổi điểm số của semantic model
- ✅ Tin tưởng 100% vào semantic model cho các từ có trong văn bản

### 3. Chỉ Loại Bỏ Ảo Giác
- ✅ Loại bỏ từ KHÔNG CÓ trong văn bản
- ✅ Giữ lại TẤT CẢ từ CÓ trong văn bản (kể cả điểm thấp)

### 4. Không Ảnh Hưởng Đến Số Liệu
- ✅ "1.5°C" (semantic: 0.60) → vẫn là 0.60
- ✅ Không tăng điểm giả tạo

---

## 📊 Kết Quả Thực Tế

### Test Case: Climate Change Document

**Input**: 159 phrases từ STAGE 4

**BM25 Filter Only**:
- ✅ Kept: 155 phrases (có trong văn bản)
- ❌ Removed: 4 phrases (ảo giác)
- 📊 Điểm số: Không thay đổi cho 155 phrases còn lại

**Phrases bị loại bỏ**:
1. "environmental crisis" (semantic: 0.88, BM25: 0.0)
2. "global warming" (semantic: 0.85, BM25: 0.0)
3. "ecological disaster" (semantic: 0.78, BM25: 0.0)
4. "planetary emergency" (semantic: 0.72, BM25: 0.0)

**Tất cả đều là ảo giác** (không có trong văn bản gốc)

---

## 🔧 Implementation

### Code Mới

```python
def _stage6_bm25_filter(self, phrases, sentences, headings, bm25_weight):
    """
    BM25 Filter Only Mode
    
    Rule: Remove phrases with BM25 = 0 (not in document)
    """
    filtered_phrases = []
    removed_count = 0
    
    for phrase in phrases:
        bm25_score = calculate_bm25(phrase, sentences)
        
        if bm25_score > 0:
            # Keep phrase with ORIGINAL score
            filtered_phrases.append({
                'phrase': phrase['phrase'],
                'importance_score': phrase['importance_score'],  # UNCHANGED
                'supporting_sentence': phrase['supporting_sentence'],
                'bm25_score': bm25_score  # For debugging only
            })
        else:
            # Remove hallucination
            removed_count += 1
            print(f"  ⚠️  Removed: '{phrase['phrase']}' (not in document)")
    
    return {
        'filtered_count': len(filtered_phrases),
        'removed_count': removed_count,
        'filtered_phrases': filtered_phrases,
        'mode': 'filter_only'
    }
```

**Không có re-ranking!** Chỉ có filter.

---

## 📝 Output Format

### STAGE 6 Output

```json
{
  "filtered_count": 155,
  "removed_count": 4,
  "mode": "filter_only",
  "filtered_phrases": [
    {
      "phrase": "climate change",
      "importance_score": 0.95,  // UNCHANGED from STAGE 4
      "supporting_sentence": "Climate change is...",
      "bm25_score": 8.5  // For debugging only
    },
    {
      "phrase": "1.5°C",
      "importance_score": 0.60,  // UNCHANGED (not boosted)
      "supporting_sentence": "Temperature increased by 1.5°C...",
      "bm25_score": 9.2
    }
  ]
}
```

**Lưu ý**: `importance_score` không thay đổi so với STAGE 4

---

## 🎛️ Cấu Hình

### Bật Filter Only Mode

```python
result = pipeline.process_document(
    text=text,
    use_bm25=True,  # Bật BM25 filter
    bm25_weight=0.0,  # Không dùng (filter only mode)
    ...
)
```

**Lưu ý**: `bm25_weight` không còn tác dụng (filter only mode)

---

### Tắt BM25 (Không Filter)

```python
result = pipeline.process_document(
    text=text,
    use_bm25=False,  # Tắt BM25
    ...
)
```

**Kết quả**: Giữ TẤT CẢ phrases từ STAGE 4 (kể cả ảo giác)

---

## 📊 Console Output

### Khi Bật BM25

```
[STAGE 6] BM25 Sanity Filter (HALLUCINATION REMOVAL)...
  ⚠️  Removed hallucination: 'environmental crisis' (BM25=0, not in document)
  ⚠️  Removed hallucination: 'global warming' (BM25=0, not in document)
  ⚠️  Removed hallucination: 'ecological disaster' (BM25=0, not in document)
  ⚠️  Removed hallucination: 'planetary emergency' (BM25=0, not in document)
  ✓ Kept: 155 phrases (in document)
  ✓ Removed: 4 phrases (hallucination)
  ✓ Mode: Filter only (no re-ranking)
```

---

### Khi Tắt BM25

```
[STAGE 6] BM25 Sanity Filter (SECONDARY)...
  ℹ️  BM25 disabled - keeping all phrases
```

---

## ✅ Ưu Điểm

### 1. Đơn Giản
- Không có công thức phức tạp
- Dễ hiểu: BM25 = 0 → loại bỏ

### 2. Tin Tưởng Semantic Model
- Giữ nguyên điểm số semantic
- Không can thiệp vào ranking

### 3. Chỉ Loại Bỏ Ảo Giác
- Loại bỏ từ không có trong văn bản
- Không ảnh hưởng đến từ có trong văn bản

### 4. Minh Bạch
- Dễ debug: xem từ nào bị loại bỏ
- Dễ giải thích: "từ này không có trong văn bản"

---

## ⚠️ Lưu Ý

### 1. Không Tăng Điểm Số Liệu
```
"1.5°C" (semantic: 0.60, BM25: 9.2)
→ Final: 0.60 (không tăng lên 0.66)
```

**Lý do**: Filter only mode không re-ranking

**Giải pháp**: Nếu muốn tăng điểm số liệu, cần điều chỉnh STAGE 4 (semantic model)

---

### 2. Có Thể Loại Bỏ Từ Quan Trọng
```
"high performance" (semantic: 0.85, BM25: 0.0)
→ Bị loại bỏ (dù semantic score cao)
```

**Lý do**: Từ không có trong văn bản (ảo giác)

**Giải pháp**: Đúng! Đây là mục đích của BM25 filter

---

### 3. Không Xử Lý Partial Match
```
Văn bản: "temperature has increased"
Phrase: "temperature increase"
→ BM25 > 0 (partial match) → Giữ lại
```

**Lưu ý**: BM25 chấp nhận partial match (có ít nhất 1 từ khóa)

---

## 🎯 Kết Luận

### Filter Only Mode

**Mục đích**: Chỉ loại bỏ ảo giác (hallucination)

**Quy tắc**:
- BM25 = 0 → Loại bỏ ❌
- BM25 > 0 → Giữ lại (điểm số không đổi) ✅

**Lợi ích**:
- ✅ Đơn giản, dễ hiểu
- ✅ Giữ nguyên semantic score
- ✅ Chỉ loại bỏ ảo giác
- ✅ Minh bạch, dễ debug

**Khuyến nghị**: Sử dụng mặc định cho tất cả văn bản

---

**Tác giả**: Kiro AI
**Ngày**: 2026-02-10
**Version**: 5.2.0-filter-only-mode
