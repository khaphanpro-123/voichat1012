# 🎯 CẢI TIẾN CẦN THIẾT - DOCUMENTS PAGE

## 📋 DANH SÁCH VẤN ĐỀ

### ❌ Vấn Đề 1: Hiển Thị Sai Số Liệu
**Hiện tại:** "50 vocabulary nhưng 2 flashcards"  
**Nguyên nhân:** API trả về 50 vocabulary items nhưng chỉ 2 flashcards  
**Giải pháp:** Hiển thị đúng vocabulary array (50 items) thay vì flashcards (2 items)

### ❌ Vấn Đề 2: Mindmap Links Không Hoạt Động
**Hiện tại:** Click vào Markmap/Mermaid/Excalidraw không thấy gì  
**Nguyên nhân:** 
- Link format sai
- Data không đủ để generate mindmap
- Entities/relations thiếu

**Giải pháp:** 
- Fix link generation logic
- Validate data trước khi generate
- Fallback khi không có data

### ❌ Vấn Đề 3: Không Hiển Thị Đủ 50 Từ
**Hiện tại:** Scroll không thấy hết 50 từ  
**Nguyên nhân:** 
- max-height giới hạn
- Hoặc chỉ render một phần

**Giải pháp:**
- Remove height limit hoặc tăng lên
- Ensure tất cả items được render

### ❌ Vấn Đề 4: Thiếu Features
**Thiếu:**
- IPA phonetic cho mỗi từ
- Phát âm câu ví dụ (đã có nút nhưng cần verify)
- Lưu document history (draft)
- Click vào file cũ để xem lại

**Giải pháp:**
- Thêm IPA từ API hoặc dictionary
- Verify text-to-speech cho câu
- Implement document history với MongoDB
- UI để xem lại documents đã upload

### ❌ Vấn Đề 5: Vocabulary Page Thiếu IPA
**Hiện tại:** Vocabulary page không hiển thị IPA  
**Giải pháp:** Thêm IPA display trong vocabulary cards

---

## ✅ GIẢI PHÁP CHI TIẾT

### Fix 1: Hiển Thị Đúng Vocabulary (50 items)

**Code hiện tại:**
```tsx
{(result.vocabulary || result.flashcards)?.map(...)}
```

**Vấn đề:** Đang ưu tiên vocabulary (đúng) nhưng cần clarify

**Fix:**
```tsx
// Clarify: Always use vocabulary (50 items) not flashcards (2 items)
const itemsToDisplay = result.vocabulary || result.flashcards || []

<h3>Danh sách từ vựng ({itemsToDisplay.length} từ):</h3>
{itemsToDisplay.map((item, idx) => (
  <div key={idx}>
    {/* Display item */}
  </div>
))}
```

---

### Fix 2: Mindmap Links

**Vấn đề:** Links không hoạt động

**Debug:**
```tsx
const generateMarkmapLink = (graph: any) => {
  console.log('Graph data:', graph)
  console.log('Entities:', graph?.entities?.length)
  console.log('Relations:', graph?.relations?.length)
  
  if (!graph || !graph.entities || graph.entities.length === 0) {
    console.warn('No graph data available')
    return "#"
  }
  
  // ... rest of code
}
```

**Fix:**
```tsx
// 1. Validate data
if (!graph?.entities?.length) {
  return "#" // Disable link
}

// 2. Generate proper markdown
const markdown = `# ${centerNode.label}\n\n` + 
  childNodes.map(n => `## ${n.label}`).join('\n')

// 3. Encode properly
const encoded = encodeURIComponent(markdown)
return `https://markmap.js.org/repl#?d=${encoded}`
```

---

### Fix 3: Hiển Thị Đủ 50 Từ

**Code hiện tại:**
```tsx
<div className="space-y-3 max-h-[600px] overflow-y-auto">
```

**Fix:**
```tsx
// Option 1: Remove height limit
<div className="space-y-3 overflow-y-auto">

// Option 2: Increase height
<div className="space-y-3 max-h-[1200px] overflow-y-auto">

// Option 3: Show all with pagination
<div className="space-y-3">
  {/* No scroll, show all */}
</div>
```

---

### Fix 4: Thêm IPA & Document History

#### 4.1: Thêm IPA Display

**API Response:**
```json
{
  "word": "machine learning",
  "phonetic": "/məˈʃiːn ˈlɜːnɪŋ/",  // ← IPA from API
  "definition": "..."
}
```

**Frontend Display:**
```tsx
{item.phonetic && (
  <div className="flex items-center gap-2">
    <span className="text-sm text-gray-600 font-mono">
      {item.phonetic}
    </span>
    <button onClick={() => speakText(item.word)}>
      <Volume2 className="h-4 w-4" />
    </button>
  </div>
)}
```

#### 4.2: Phát Âm Câu Ví Dụ

**Đã có:**
```tsx
<button onClick={() => speakText(card.context_sentence)}>
  <Volume2 />
</button>
```

**Verify:** Đã implement ✅

#### 4.3: Document History

**Database Schema:**
```typescript
interface DocumentHistory {
  _id: ObjectId
  userId: string
  documentId: string
  filename: string
  uploadedAt: Date
  vocabularyCount: number
  flashcardsCount: number
  status: 'completed' | 'processing' | 'failed'
  result: {
    vocabulary: Array<any>
    flashcards: Array<any>
    knowledge_graph_stats: any
  }
}
```

**API Endpoint:**
```typescript
// GET /api/documents/history
// Returns list of uploaded documents

// GET /api/documents/[documentId]
// Returns full document with vocabulary
```

**UI:**
```tsx
<div className="mb-4">
  <h3>Tài liệu đã upload:</h3>
  <div className="space-y-2">
    {history.map(doc => (
      <div key={doc._id} onClick={() => loadDocument(doc._id)}>
        <p>{doc.filename}</p>
        <p>{doc.vocabularyCount} từ vựng</p>
        <p>{formatDate(doc.uploadedAt)}</p>
      </div>
    ))}
  </div>
</div>
```

---

### Fix 5: Vocabulary Page - Thêm IPA

**Current Code:**
```tsx
<div className="vocabulary-card">
  <h3>{word.word}</h3>
  <p>{word.meaning}</p>
  <p>{word.example}</p>
</div>
```

**Fixed Code:**
```tsx
<div className="vocabulary-card">
  <div className="flex items-center gap-2">
    <h3>{word.word}</h3>
    <button onClick={() => speakText(word.word)}>
      <Volume2 className="h-4 w-4" />
    </button>
  </div>
  
  {/* IPA Display */}
  {(word.ipa || word.pronunciation) && (
    <p className="text-sm text-gray-600 font-mono">
      /{word.ipa || word.pronunciation}/
    </p>
  )}
  
  <p>{word.meaning}</p>
  <p className="italic">"{word.example}"</p>
</div>
```

---

## 🚀 IMPLEMENTATION PLAN

### Phase 1: Quick Fixes (30 minutes)
1. ✅ Fix vocabulary display (use vocabulary array)
2. ✅ Add IPA display in documents page
3. ✅ Add IPA display in vocabulary page
4. ✅ Remove height limit or increase
5. ✅ Debug mindmap links

### Phase 2: Document History (2 hours)
1. Create MongoDB schema for document history
2. Create API endpoints:
   - POST /api/documents/save (auto-save after upload)
   - GET /api/documents/history (list documents)
   - GET /api/documents/[id] (get specific document)
3. Update documents page UI:
   - Show document history sidebar
   - Click to load previous document
   - Delete document option

### Phase 3: Enhanced Features (1 hour)
1. Better IPA display with tooltips
2. Sentence audio with highlighting
3. Export vocabulary to CSV/PDF
4. Share document link

---

## 📊 PRIORITY

### 🔴 HIGH (Fix Now):
1. Display correct vocabulary count (50 not 2)
2. Add IPA display
3. Fix mindmap links
4. Show all 50 items

### 🟡 MEDIUM (Next):
1. Document history
2. Better UI/UX
3. Export features

### 🟢 LOW (Future):
1. Advanced search
2. Spaced repetition
3. Gamification

---

## 🎯 EXPECTED RESULTS

### After Quick Fixes:
- ✅ Shows "50 từ vựng" correctly
- ✅ IPA displayed for each word
- ✅ All 50 words visible (scroll or pagination)
- ✅ Mindmap links work or disabled if no data
- ✅ Vocabulary page shows IPA

### After Document History:
- ✅ See list of uploaded documents
- ✅ Click to view previous documents
- ✅ No need to re-upload same file

### After Enhanced Features:
- ✅ Better learning experience
- ✅ Export vocabulary
- ✅ Share with others

---

## 📝 NOTES

### About Vocabulary vs Flashcards:
- **Vocabulary (50 items):** Raw extracted words/phrases
- **Flashcards (2 items):** Curated learning cards with full definitions
- **Display:** Should show vocabulary (more comprehensive)

### About IPA:
- API should return `phonetic` field with IPA
- If not available, can use external IPA dictionary
- Format: `/məˈʃiːn ˈlɜːnɪŋ/`

### About Mindmap:
- Requires entities and relations from knowledge graph
- If data insufficient, disable links or show message
- Consider using simpler visualization if complex fails

---

**Next Steps:** Implement Phase 1 quick fixes first!
