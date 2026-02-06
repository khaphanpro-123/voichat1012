# 📇 SỐ LƯỢNG FLASHCARD PHỤ THUỘC VÀO ĐÂU?

## 🎯 TÓM TẮT NHANH

Số lượng flashcard phụ thuộc vào **3 yếu tố**:

1. **max_flashcards** (tham số user truyền vào)
2. **Số từ vựng được trích xuất** (vocabulary_count)
3. **Công thức**: `min(max_flashcards, vocabulary_count)`

---

## 📊 CÔNG THỨC CHI TIẾT

### Trong Upload Endpoint:

```python
# File: main.py, line ~699-702

# User truyền vào
max_flashcards: int = Form(30)  # Default 30

# Số từ vựng thực tế
vocabulary_count = len(vocabulary_contexts)

# Số flashcards thực tế = MIN của 2 số
flashcards_result = rag_system.generate_flashcards(
    document_id=document_id,
    max_cards=min(max_flashcards, vocabulary_contexts)
)
```

### Ví dụ:

| max_flashcards | vocabulary_count | Kết quả | Giải thích |
|----------------|------------------|---------|------------|
| 30 | 47 | **30** | Lấy min(30, 47) = 30 |
| 50 | 47 | **47** | Lấy min(50, 47) = 47 |
| 20 | 47 | **20** | Lấy min(20, 47) = 20 |
| 30 | 15 | **15** | Lấy min(30, 15) = 15 |

---

## 🔍 PHÂN TÍCH CHI TIẾT

### Yếu tố 1: max_flashcards (User Input)

**Định nghĩa**: Số flashcards tối đa user muốn tạo

**Cách truyền**:

```bash
# Qua curl
curl -X POST "http://127.0.0.1:8000/api/upload-document" \
  -F "file=@example.docx" \
  -F "max_flashcards=30"

# Qua Python
data = {'max_flashcards': 30}
requests.post(url, files=files, data=data)

# Qua Swagger UI
max_flashcards: 30
```

**Default**: 30 (sau khi fix)

**Range**: 
- Minimum: 1
- Maximum: Không giới hạn (nhưng bị giới hạn bởi vocabulary_count)
- Recommended: 20-50

---

### Yếu tố 2: vocabulary_count (Số từ vựng)

**Định nghĩa**: Số từ vựng thực tế được trích xuất từ document

**Phụ thuộc vào**:

#### 2.1. max_words (Tham số trích xuất)

```python
max_words: int = Form(50)  # Default 50
```

**Ảnh hưởng**:
- `max_words=20` → Tối đa 20 từ vựng
- `max_words=50` → Tối đa 50 từ vựng
- `max_words=100` → Tối đa 100 từ vựng

#### 2.2. Độ dài document

**Document ngắn** (< 500 từ):
- Ít từ vựng quan trọng
- vocabulary_count thường < 20

**Document trung bình** (500-2000 từ):
- Từ vựng vừa phải
- vocabulary_count: 20-50

**Document dài** (> 2000 từ):
- Nhiều từ vựng
- vocabulary_count: 50-100+

#### 2.3. Chất lượng document

**Document chuyên ngành** (medical, technical):
- Nhiều thuật ngữ quan trọng
- vocabulary_count cao

**Document thông thường**:
- Từ vựng phổ biến
- vocabulary_count trung bình

#### 2.4. Thuật toán trích xuất

**Ensemble Extraction** sử dụng:
- TF-IDF scores
- RAKE scores
- YAKE scores
- Frequency scores

→ Chỉ giữ từ vựng có điểm cao nhất

---

### Yếu tố 3: min() Function

**Logic**:

```python
actual_flashcards = min(max_flashcards, vocabulary_count)
```

**Tại sao dùng min()?**

1. **Không tạo flashcard cho từ không tồn tại**:
   - Nếu chỉ có 15 từ vựng
   - Không thể tạo 30 flashcards
   - → Chỉ tạo 15

2. **Tôn trọng giới hạn user**:
   - User muốn tối đa 20 flashcards
   - Dù có 50 từ vựng
   - → Chỉ tạo 20

3. **Tối ưu performance**:
   - Tạo flashcard tốn thời gian (LLM call)
   - Giới hạn số lượng hợp lý

---

## 📈 FLOW CHART

```
User Upload Document
        ↓
Extract Vocabulary (max_words=50)
        ↓
vocabulary_count = 47 từ
        ↓
User truyền max_flashcards = 30
        ↓
actual_flashcards = min(30, 47) = 30
        ↓
Tạo 30 flashcards
```

---

## 🎯 CASE STUDIES

### Case 1: Document dài, muốn nhiều flashcards

**Input**:
- Document: 3000 từ
- max_words: 100
- max_flashcards: 50

**Process**:
1. Extract vocabulary → 100 từ
2. min(50, 100) = 50
3. **Kết quả**: 50 flashcards ✅

---

### Case 2: Document ngắn, muốn nhiều flashcards

**Input**:
- Document: 300 từ
- max_words: 50
- max_flashcards: 50

**Process**:
1. Extract vocabulary → 15 từ (document ngắn)
2. min(50, 15) = 15
3. **Kết quả**: 15 flashcards (không đủ 50) ⚠️

**Giải pháp**: Upload document dài hơn

---

### Case 3: Document dài, muốn ít flashcards

**Input**:
- Document: 2000 từ
- max_words: 50
- max_flashcards: 10

**Process**:
1. Extract vocabulary → 50 từ
2. min(10, 50) = 10
3. **Kết quả**: 10 flashcards (chỉ lấy top 10) ✅

---

### Case 4: Trước khi fix (vấn đề cũ)

**Input**:
- Document: 2000 từ
- max_words: 20 (default cũ)
- max_flashcards: HARDCODE 10

**Process**:
1. Extract vocabulary → 20 từ
2. Hardcode 10 flashcards
3. **Kết quả**: 10 flashcards (dù có 20 từ) ❌

**Vấn đề**: Không tận dụng hết từ vựng

---

## 🔧 CÁCH ĐIỀU CHỈNH

### Muốn nhiều flashcards hơn?

**Option 1: Tăng max_flashcards**

```bash
curl -X POST "http://127.0.0.1:8000/api/upload-document" \
  -F "file=@example.docx" \
  -F "max_flashcards=50"  # Tăng lên 50
```

**Option 2: Tăng max_words**

```bash
curl -X POST "http://127.0.0.1:8000/api/upload-document" \
  -F "file=@example.docx" \
  -F "max_words=100"      # Trích xuất nhiều từ hơn
  -F "max_flashcards=50"
```

**Option 3: Upload document dài hơn**

- Document dài → Nhiều từ vựng → Nhiều flashcards

---

### Muốn ít flashcards hơn?

**Giảm max_flashcards**:

```bash
curl -X POST "http://127.0.0.1:8000/api/upload-document" \
  -F "file=@example.docx" \
  -F "max_flashcards=10"  # Chỉ lấy 10
```

---

## 📊 BẢNG THAM KHẢO

### Recommended Settings:

| Document Length | max_words | max_flashcards | Expected Result |
|----------------|-----------|----------------|-----------------|
| Ngắn (< 500 từ) | 20 | 15 | 10-15 flashcards |
| Trung bình (500-2000) | 50 | 30 | 25-30 flashcards |
| Dài (> 2000 từ) | 100 | 50 | 40-50 flashcards |

### Performance Considerations:

| max_flashcards | LLM Calls | Time | Cost |
|----------------|-----------|------|------|
| 10 | ~10 | ~30s | Low |
| 30 | ~30 | ~90s | Medium |
| 50 | ~50 | ~150s | High |
| 100 | ~100 | ~300s | Very High |

**Lưu ý**: Mỗi flashcard cần 1 LLM call để generate definition

---

## 🎓 GIẢI THÍCH CHO KHÓA LUẬN

### Tại sao dùng min()?

> Hệ thống sử dụng hàm `min()` để đảm bảo:
>
> 1. **Không vượt quá số từ vựng có sẵn**: Nếu chỉ trích xuất được 15 từ, không thể tạo 30 flashcards
>
> 2. **Tôn trọng giới hạn người dùng**: Nếu user chỉ muốn 10 flashcards, không tạo thừa
>
> 3. **Tối ưu hiệu suất**: Giới hạn số lượng LLM calls để giảm thời gian xử lý và chi phí

### Tại sao không tạo flashcard cho tất cả từ?

> Có 3 lý do:
>
> 1. **Performance**: Mỗi flashcard cần 1 LLM call (~3s), 100 flashcards = 5 phút
>
> 2. **Cost**: LLM API có chi phí, tạo quá nhiều flashcards tốn kém
>
> 3. **User Experience**: User thường chỉ cần 20-30 flashcards quan trọng nhất, không cần tất cả

### Thuật toán chọn flashcards:

> Hệ thống chọn flashcards theo thứ tự ưu tiên:
>
> 1. **Sắp xếp từ vựng theo score** (TF-IDF + RAKE + YAKE + Frequency)
> 2. **Lấy top N từ** (N = min(max_flashcards, vocabulary_count))
> 3. **Generate flashcard** cho mỗi từ bằng RAG + LLM
>
> → Đảm bảo chỉ tạo flashcard cho từ vựng quan trọng nhất

---

## 🔍 CODE REFERENCE

### Upload Endpoint (main.py):

```python
@app.post("/api/upload-document")
async def upload_document(
    file: UploadFile = File(...),
    max_words: int = Form(50),           # Số từ vựng tối đa
    max_flashcards: int = Form(30)       # Số flashcards tối đa
):
    # Extract vocabulary
    ensemble_result = extract_vocabulary_ensemble(
        text,
        max_words=max_words  # Giới hạn số từ vựng
    )
    
    vocabulary_contexts = [...]  # Danh sách từ vựng
    
    # Generate flashcards
    flashcards_result = rag_system.generate_flashcards(
        document_id=document_id,
        max_cards=min(max_flashcards, len(vocabulary_contexts))
        #          ↑ Lấy MIN của 2 số
    )
```

### RAG System (rag_system.py):

```python
def generate_flashcards(
    self,
    document_id: str = None,
    word: str = None,
    max_cards: int = 10  # Default 10 (nếu không truyền)
) -> Dict:
    # Query Knowledge Graph
    vocab_terms = self.kg.query_vocabulary_by_document(document_id)
    
    # Limit to max_cards
    vocab_terms = vocab_terms[:max_cards]
    
    # Generate flashcard for each term
    for term in vocab_terms:
        flashcard = self._generate_flashcard_with_llm(term)
        results.append(flashcard)
    
    return results
```

---

## ✅ TÓM TẮT

### Công thức:

```
flashcards_count = min(max_flashcards, vocabulary_count)

Trong đó:
- max_flashcards: User input (default 30)
- vocabulary_count: Số từ vựng trích xuất được
```

### Để có nhiều flashcards:

1. ✅ Tăng `max_flashcards` (30 → 50)
2. ✅ Tăng `max_words` (50 → 100)
3. ✅ Upload document dài hơn
4. ✅ Upload document chuyên ngành (nhiều thuật ngữ)

### Giới hạn:

- **Minimum**: 1 flashcard
- **Maximum**: min(max_flashcards, vocabulary_count)
- **Recommended**: 20-30 flashcards (balance giữa quality và quantity)

---

**Kết luận**: Số lượng flashcard phụ thuộc vào **cả user input VÀ số từ vựng thực tế**, lấy số nhỏ hơn trong 2 số đó! 🎯
