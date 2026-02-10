# BM25 - Ví Dụ Trực Quan

## 🎯 Ví Dụ Đơn Giản: Tìm Từ Vựng Trong Văn Bản

### 📄 Văn Bản Gốc

```
Climate change is one of the most pressing issues facing humanity 
today. The global temperature has increased by 1.5°C since 
pre-industrial times. Scientists warn that we must reduce carbon 
emissions by 45% by 2030 to avoid catastrophic consequences.
```

---

## 🤖 STAGE 4: Semantic Model (Phrase Extraction)

**Cách hoạt động**: Hiểu nghĩa, tìm từ quan trọng

**Kết quả**:

| # | Phrase | Semantic Score | Lý do |
|---|--------|----------------|-------|
| 1 | "climate change" | 0.95 | ✅ Chủ đề chính |
| 2 | "environmental crisis" | 0.88 | ⚠️ Gần nghĩa nhưng KHÔNG CÓ trong văn bản |
| 3 | "global warming" | 0.85 | ⚠️ Đồng nghĩa nhưng KHÔNG CÓ trong văn bản |
| 4 | "temperature increase" | 0.82 | ⚠️ Gần đúng (văn bản: "temperature has increased") |
| 5 | "carbon emissions" | 0.78 | ✅ Có trong văn bản |
| 6 | "1.5°C" | 0.60 | ⚠️ Điểm thấp (số liệu quan trọng) |
| 7 | "45% by 2030" | 0.55 | ⚠️ Điểm thấp (số liệu quan trọng) |

**Vấn đề**:
- ❌ "environmental crisis" - KHÔNG CÓ trong văn bản (ảo giác)
- ❌ "global warming" - KHÔNG CÓ trong văn bản (ảo giác)
- ❌ "1.5°C" và "45% by 2030" - Điểm thấp (bị bỏ qua)

---

## 🔍 STAGE 6: BM25 Filter (Sanity Check)

**Cách hoạt động**: Kiểm tra từ có trong văn bản không

### Bước 1: Tính BM25 Score

**BM25 = Đếm từ khóa xuất hiện trong câu**

| Phrase | Có trong văn bản? | BM25 Score | Giải thích |
|--------|-------------------|------------|------------|
| "climate change" | ✅ YES | 8.5 | Cả 2 từ đều có |
| "environmental crisis" | ❌ NO | 0.0 | Không có từ nào |
| "global warming" | ❌ NO | 0.0 | Không có từ nào |
| "temperature increase" | ⚠️ PARTIAL | 4.2 | Chỉ có "temperature" |
| "carbon emissions" | ✅ YES | 8.8 | Cả 2 từ đều có |
| "1.5°C" | ✅ YES | 9.2 | Số liệu chính xác |
| "45% by 2030" | ✅ YES | 9.5 | Số liệu chính xác |

---

### Bước 2: Kết Hợp Semantic + BM25

**Công thức**: Final = 0.8 × Semantic + 0.2 × BM25 (normalized)

| Phrase | Semantic | BM25 | BM25 Norm | Final | Kết quả |
|--------|----------|------|-----------|-------|---------|
| "climate change" | 0.95 | 8.5 | 0.85 | **0.93** | ✅ GIỮ |
| "environmental crisis" | 0.88 | 0.0 | 0.00 | **0.70** | ❌ LOẠI |
| "global warming" | 0.85 | 0.0 | 0.00 | **0.68** | ❌ LOẠI |
| "temperature increase" | 0.82 | 4.2 | 0.42 | **0.74** | ⚠️ GIỮ (thấp) |
| "carbon emissions" | 0.78 | 8.8 | 0.88 | **0.80** | ✅ GIỮ |
| "1.5°C" | 0.60 | 9.2 | 0.92 | **0.66** | ✅ GIỮ |
| "45% by 2030" | 0.55 | 9.5 | 0.95 | **0.63** | ✅ GIỮ |

**Cải thiện**:
- ✅ Loại bỏ "environmental crisis" (0.88 → 0.70)
- ✅ Loại bỏ "global warming" (0.85 → 0.68)
- ✅ Tăng điểm "1.5°C" (0.60 → 0.66)
- ✅ Tăng điểm "45% by 2030" (0.55 → 0.63)

---

## 📊 So Sánh Trực Quan

### Không Có BM25 (Chỉ Semantic)

```
Top 5 Phrases:
1. climate change         (0.95) ✅
2. environmental crisis   (0.88) ❌ ẢO GIÁC
3. global warming         (0.85) ❌ ẢO GIÁC
4. temperature increase   (0.82) ⚠️
5. carbon emissions       (0.78) ✅

Bỏ qua:
- 1.5°C                   (0.60) ❌ SỐ LIỆU QUAN TRỌNG
- 45% by 2030             (0.55) ❌ SỐ LIỆU QUAN TRỌNG
```

**Vấn đề**: 2/5 từ là ảo giác, bỏ qua số liệu quan trọng

---

### Có BM25 (Semantic + BM25)

```
Top 5 Phrases:
1. climate change         (0.93) ✅
2. carbon emissions       (0.80) ✅
3. temperature increase   (0.74) ⚠️
4. environmental crisis   (0.70) ❌ LOẠI (< threshold)
5. global warming         (0.68) ❌ LOẠI (< threshold)

Giữ lại:
- 1.5°C                   (0.66) ✅ SỐ LIỆU QUAN TRỌNG
- 45% by 2030             (0.63) ✅ SỐ LIỆU QUAN TRỌNG
```

**Cải thiện**: Loại bỏ ảo giác, giữ lại số liệu quan trọng

---

## 🎯 Ví Dụ Cụ Thể: "environmental crisis"

### Phân Tích Chi Tiết

**Văn bản**:
```
Climate change is one of the most pressing issues...
```

**Phrase**: "environmental crisis"

---

### Semantic Model (STAGE 4)

**Suy nghĩ**:
- "climate change" = "environmental crisis" (gần nghĩa)
- "pressing issues" = "crisis" (gần nghĩa)
- → Score: 0.88 (cao)

**Kết luận**: Từ quan trọng ✅

---

### BM25 Filter (STAGE 6)

**Kiểm tra**:
- Tìm "environmental" trong văn bản: ❌ KHÔNG CÓ
- Tìm "crisis" trong văn bản: ❌ KHÔNG CÓ
- → BM25 Score: 0.0

**Kết luận**: Từ KHÔNG CÓ trong văn bản ❌

---

### Kết Hợp

```
Final Score = 0.8 × 0.88 + 0.2 × 0.0
            = 0.704 + 0.0
            = 0.70
```

**Threshold**: 0.75 (ví dụ)

**Kết luận**: 0.70 < 0.75 → LOẠI BỎ ❌

---

## 🎯 Ví Dụ Cụ Thể: "1.5°C"

### Phân Tích Chi Tiết

**Văn bản**:
```
The global temperature has increased by 1.5°C since pre-industrial times.
```

**Phrase**: "1.5°C"

---

### Semantic Model (STAGE 4)

**Suy nghĩ**:
- "1.5°C" là số liệu
- Không có ngữ cảnh semantic rõ ràng
- → Score: 0.60 (thấp)

**Kết luận**: Từ không quan trọng ❌

---

### BM25 Filter (STAGE 6)

**Kiểm tra**:
- Tìm "1.5°C" trong văn bản: ✅ CÓ (chính xác)
- Xuất hiện trong câu quan trọng
- → BM25 Score: 9.2 (rất cao)

**Kết luận**: Từ CÓ trong văn bản, quan trọng ✅

---

### Kết Hợp

```
Final Score = 0.8 × 0.60 + 0.2 × 0.92
            = 0.48 + 0.184
            = 0.66
```

**Threshold**: 0.65 (ví dụ)

**Kết luận**: 0.66 > 0.65 → GIỮ LẠI ✅

---

## 📈 Biểu Đồ Trực Quan

### Semantic Score vs Final Score

```
1.0 ┤
    │  ●climate change (0.95 → 0.93)
0.9 ┤
    │  ●environmental crisis (0.88 → 0.70) ❌ LOẠI
0.8 ┤  ●global warming (0.85 → 0.68) ❌ LOẠI
    │  ●temperature increase (0.82 → 0.74)
    │  ●carbon emissions (0.78 → 0.80) ✅ TĂNG
0.7 ┤
    │
0.6 ┤  ●1.5°C (0.60 → 0.66) ✅ TĂNG
    │  ●45% by 2030 (0.55 → 0.63) ✅ TĂNG
0.5 ┤
    └─────────────────────────────────────
      Semantic Score → Final Score (with BM25)
```

**Quan sát**:
- ✅ Số liệu (1.5°C, 45%) được tăng điểm
- ❌ Ảo giác (environmental crisis, global warming) bị giảm điểm

---

## 🔍 Tại Sao BM25 Quan Trọng?

### Case 1: Văn Bản Khoa Học

**Văn bản**:
```
The F1-score improved from 0.85 to 0.92 after fine-tuning.
```

**Không có BM25**:
- "performance improvement" (0.88) ✅ Gần nghĩa
- "0.85 to 0.92" (0.55) ❌ Điểm thấp

**Có BM25**:
- "performance improvement" (0.70) ❌ Không có trong văn bản
- "0.85 to 0.92" (0.68) ✅ Số liệu chính xác

**Kết luận**: BM25 giữ lại số liệu chính xác

---

### Case 2: Văn Bản Kỹ Thuật

**Văn bản**:
```
The transformer architecture uses multi-head attention mechanism.
```

**Không có BM25**:
- "neural network" (0.85) ✅ Gần nghĩa
- "transformer architecture" (0.82) ✅

**Có BM25**:
- "neural network" (0.68) ❌ Không có trong văn bản
- "transformer architecture" (0.84) ✅ Có trong văn bản

**Kết luận**: BM25 loại bỏ từ gần nghĩa nhưng không chính xác

---

## 💡 Kết Luận

### BM25 Giúp Gì?

1. **Loại bỏ ảo giác** (hallucination)
   - Từ gần nghĩa nhưng KHÔNG CÓ trong văn bản
   - Ví dụ: "environmental crisis" → "climate change"

2. **Giữ lại số liệu** (numbers, statistics)
   - Số liệu quan trọng nhưng điểm semantic thấp
   - Ví dụ: "1.5°C", "45% by 2030"

3. **Giữ lại định nghĩa** (definitions)
   - Thuật ngữ kỹ thuật chính xác
   - Ví dụ: "transformer architecture", "F1-score"

---

### Khi Nào Dùng BM25?

✅ **Nên dùng**:
- Văn bản kỹ thuật, khoa học
- Có số liệu, định nghĩa chính xác
- Cần độ chính xác cao

❌ **Không cần**:
- Văn bản văn học, sáng tạo
- Văn bản ngắn, đơn giản
- Cần tốc độ xử lý nhanh

---

### Cấu Hình Khuyến Nghị

```python
# Mặc định (recommended)
use_bm25=True
bm25_weight=0.2

# Văn bản kỹ thuật (maximum accuracy)
use_bm25=True
bm25_weight=0.2

# Văn bản văn học (semantic only)
use_bm25=False
```

---

**Tác giả**: Kiro AI
**Ngày**: 2026-02-10
**Version**: 5.1.0-enhanced-flashcards
