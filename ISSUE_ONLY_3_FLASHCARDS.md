# VẤN ĐỀ: CHỈ CÓ 3 FLASHCARDS

## ❌ Hiện trạng

Sau khi upload file, chỉ thấy 3 flashcards thay vì tất cả (46 từ vựng).

## 🔍 Phân tích

### Frontend (Vercel) - ✅ OK
Code đã có đầy đủ tính năng:
- ✅ IPA/Phonetic: `{card.phonetic && <p>/{card.phonetic}/</p>}`
- ✅ Nghĩa: `{card.definition && <p>📖 Nghĩa: {card.definition}</p>}`
- ✅ Câu ví dụ: `{card.context_sentence && <div className="bg-yellow-50">...}</div>}`
- ✅ Phát âm: `<button onClick={() => speakText(card.word)}>🔊</button>`
- ✅ Synonyms: `{card.synonyms && card.synonyms.map(...)}`
- ✅ Mindmap links: `generateMarkmapLink()`, `generateMermaidLink()`, `generateExcalidrawLink()`
- ✅ Auto-save: `handleSaveToDatabase()`
- ✅ Hiển thị TẤT CẢ: `{result.flashcards?.map(...)}` (không có slice)

### Backend (Railway) - ❌ VẤN ĐỀ
API chỉ trả về 3 flashcards trong response:
```json
{
  "flashcards": [
    { "word": "the job", ... },
    { "word": "save fresh water", ... },
    { "word": "...", ... }
  ]
}
```

## 💡 Nguyên nhân có thể

### 1. Parameter `generate_flashcards`
```typescript
formData.append("generate_flashcards", "true")
```

Có thể API cần parameter khác hoặc giá trị khác:
- `generate_flashcards: "all"`
- `max_flashcards: "100"`
- `flashcard_limit: "0"` (unlimited)

### 2. API grouping logic
File `complete_pipeline_12_stages.py` có logic group flashcards:
```python
def _stage12_flashcard_generation(
    self,
    vocabulary: List[Dict],
    group_by_cluster: bool = True
):
    if group_by_cluster:
        flashcard_groups = self._group_by_cluster(vocabulary)
        # Có thể chỉ tạo 3 groups/clusters
```

### 3. Default limit trong API
Có thể có default limit = 3 ở đâu đó trong code Python.

## ✅ Giải pháp

### Solution 1: Thay đổi parameters
```typescript
formData.append("max_phrases", "100")  // Tăng từ 40 lên 100
formData.append("generate_flashcards", "all")  // Thay "true" thành "all"
formData.append("flashcard_limit", "0")  // Thêm param unlimited
```

### Solution 2: Check Railway logs
```bash
# Vào Railway dashboard
# Click service → Deployments → View Logs
# Tìm dòng: "Grouped X items into Y flashcards"
# Xem Y có phải là 3 không
```

### Solution 3: Test với file khác
- Upload file khác (lớn hơn, nhiều từ hơn)
- Xem có vẫn chỉ 3 flashcards không
- Nếu vẫn 3 → Confirm là API limit

### Solution 4: Sửa Python API
Nếu confirm là API limit, sửa trong `complete_pipeline_12_stages.py`:

```python
# Tìm dòng có limit
flashcards = flashcards[:3]  # ← XÓA DÒNG NÀY

# Hoặc
max_flashcards = 3  # ← ĐỔI THÀNH 100
```

## 🎯 Action Plan

### Bước 1: Test với parameters mới
```typescript
// Trong handleUpload()
formData.append("max_phrases", "100")
formData.append("generate_flashcards", "all")
```

### Bước 2: Check Railway logs
- Vào Railway dashboard
- Xem logs khi upload
- Tìm số lượng flashcards được generate

### Bước 3: Nếu vẫn 3, sửa Python API
- Tìm file có logic limit
- Xóa hoặc tăng limit
- Redeploy Railway

## 📊 Tính năng đã có (chỉ thiếu data)

### ✅ Frontend hoàn chỉnh
```typescript
// IPA/Phonetic
{card.phonetic && (
  <p className="text-sm text-gray-600 mb-2">
    /{card.phonetic}/
  </p>
)}

// Nghĩa
{card.definition && (
  <p className="text-sm text-gray-700 mb-2">
    <span className="font-semibold">📖 Nghĩa:</span> {card.definition}
  </p>
)}

// Câu ví dụ
{card.context_sentence && (
  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-2 mb-2">
    <div className="flex items-start gap-2">
      <p className="text-sm text-gray-700 italic flex-1">
        "{card.context_sentence.replace(/<[^>]*>/g, '')}"
      </p>
      <button onClick={() => speakText(card.context_sentence)}>
        <Volume2 className="h-4 w-4 text-yellow-700" />
      </button>
    </div>
  </div>
)}

// Phát âm từ
<button onClick={() => speakText(card.word)}>
  <Volume2 className="h-4 w-4 text-blue-600" />
</button>

// Synonyms
{card.synonyms && card.synonyms.length > 0 && (
  <div className="flex flex-wrap gap-1 mt-2">
    <span className="text-xs font-semibold">🔄 Từ đồng nghĩa:</span>
    {card.synonyms.map((syn, i) => (
      <span key={i} className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
        {syn}
      </span>
    ))}
  </div>
)}

// Mindmap links
<a href={generateMarkmapLink(result.knowledge_graph)} target="_blank">
  🗺️ Markmap (Interactive)
</a>
<a href={generateMermaidLink(result.knowledge_graph)} target="_blank">
  📊 Mermaid (Flowchart)
</a>
<a href={generateExcalidrawLink(result.knowledge_graph)} target="_blank">
  ✏️ Excalidraw (Draw)
</a>

// Auto-save vocabulary
await fetch("/api/vocabulary", {
  method: "POST",
  body: JSON.stringify({
    word: card.word,
    meaning: card.definition,
    example: card.context_sentence,
    pronunciation: card.phonetic,
    synonyms: card.synonyms,
  })
})

// Auto-save knowledge graph
await fetch("/api/knowledge-graph", {
  method: "POST",
  body: JSON.stringify({
    document_id: data.document_id,
    graph_data: data.knowledge_graph,
  })
})
```

### ✅ Lưu document metadata
```typescript
// API route: /api/documents
await fetch("/api/documents", {
  method: "POST",
  body: JSON.stringify({
    title: file.name,
    file_name: file.name,
    file_size: file.size,
    flashcard_count: result.flashcards.length,
    entity_count: result.knowledge_graph.entities.length,
    relation_count: result.knowledge_graph.relations.length,
    markmap_link: generateMarkmapLink(result.knowledge_graph),
    mermaid_link: generateMermaidLink(result.knowledge_graph),
    excalidraw_link: generateExcalidrawLink(result.knowledge_graph),
  })
})
```

## 🚀 Next Steps

### 1. Test ngay
```bash
# Deploy code hiện tại
git add .
git commit -m "test: Check why only 3 flashcards"
git push origin main

# Upload file và check Railway logs
```

### 2. Nếu vẫn 3 flashcards
- Check Railway logs
- Tìm dòng "Grouped X items into Y flashcards"
- Nếu Y = 3 → Sửa Python API

### 3. Sửa Python API (nếu cần)
```python
# File: python-api/complete_pipeline_12_stages.py
# Tìm và sửa limit

# Redeploy Railway
git add python-api/
git commit -m "fix: Remove flashcard limit"
git push origin main
```

## 💡 Tạm thời: Workaround

Nếu không thể sửa API ngay, có thể:
1. Hiển thị message: "Đang hiển thị 3/46 flashcards (API limit)"
2. Thêm button "Load more" (fake, chỉ hiển thị message)
3. Link đến trang vocabulary để xem tất cả

Nhưng tốt nhất là sửa API để trả về tất cả flashcards!

---

**Status**: 🔍 INVESTIGATING
**Action**: Check Railway logs và parameters
**Goal**: Hiển thị TẤT CẢ flashcards (46 thay vì 3)
