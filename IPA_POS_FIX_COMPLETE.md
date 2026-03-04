# Fix IPA và Phân Loại Từ Loại - Hoàn Thành

## Vấn Đề

1. **IPA không hiển thị trong /vocabulary**
   - IPA hiển thị dạng `//biː//` thay vì `/biː/`
   - Nguyên nhân: Frontend thêm dấu `/` trong khi dictionary đã có sẵn

2. **Từ vựng không phân loại đúng từ loại**
   - Tất cả từ vựng đều hiển thị trong nhóm "Khác" (Other)
   - Nguyên nhân: API không lưu field `partOfSpeech` và `type`

## Giải Pháp

### 1. Fix IPA Display (Commit: fad3afb)

**Frontend Changes:**
- `app/dashboard-new/vocabulary/page.tsx`: Xóa dấu `/` thừa trong display
  ```tsx
  // Before: <span>/{getPronunciation(word)}/</span>
  // After:  <span>{getPronunciation(word)}</span>
  ```

- `app/dashboard-new/documents-simple/page.tsx`: Xóa dấu `/` thừa
  ```tsx
  // Before: <p>/{card.phonetic || card.ipa}/</p>
  // After:  <p>{card.phonetic || card.ipa}</p>
  ```

**Backend Changes:**
- `python-api/complete_pipeline.py`: Đảm bảo IPA luôn có dấu `/` chuẩn
  ```python
  # Ensure it has slashes for standard IPA format
  if not ipa_text.startswith('/'):
      ipa_text = '/' + ipa_text
  if not ipa_text.endswith('/'):
      ipa_text = ipa_text + '/'
  return ipa_text
  ```

**Kết Quả:**
- Backend trả về: `/biː/` (có dấu `/`)
- Frontend hiển thị: `/biː/` (không thêm dấu `/` nữa)
- Dictionary trả về: `/biː/` (đã có sẵn dấu `/`)

### 2. Fix Part of Speech Classification (Commit: f3e1b68)

**Frontend Changes:**
- `app/dashboard-new/documents-simple/page.tsx`: Thêm `partOfSpeech` và `type` vào payload
  ```typescript
  const payload = {
    word: item.word || item.phrase,
    meaning: item.definition || "",
    example: item.context_sentence || item.supporting_sentence || "",
    level: level,
    pronunciation: item.phonetic || item.ipa || "",
    ipa: item.ipa || item.phonetic || "",
    partOfSpeech: item.pos_label || "other", // ✅ NEW
    type: item.pos_label || "other",         // ✅ NEW
    source: `document_${data.document_id || Date.now()}`,
    synonyms: item.synonyms || [],
  }
  ```

- Thêm debug log cho POS:
  ```typescript
  console.log("💾 POS check:", {
    hasPosLabel: !!item.pos_label,
    posLabelValue: item.pos_label,
    finalPartOfSpeech: payload.partOfSpeech,
    finalType: payload.type
  })
  ```

**API Changes:**
- `app/api/vocabulary/route.ts`: Lưu `partOfSpeech` và `type` vào database
  ```typescript
  // Parse from body
  const { 
    word, 
    meaning, 
    example, 
    pronunciation,
    ipa,
    synonyms,
    level,
    source,
    partOfSpeech,  // ✅ NEW
    type           // ✅ NEW
  } = body
  
  // Save to database
  await collection.insertOne({
    userId,
    word,
    meaning: meaning || "",
    example: example || "",
    pronunciation: pronunciation || "",
    ipa: ipa || pronunciation || "",
    synonyms: synonyms || [],
    level: level || "intermediate",
    source: source || "document",
    partOfSpeech: partOfSpeech || "other",  // ✅ NEW
    type: type || "other",                  // ✅ NEW
    created_at: new Date(),
  })
  ```

**Backend (Đã có sẵn):**
- `python-api/complete_pipeline.py` đã thêm `pos_label` vào mỗi vocabulary item:
  ```python
  item['pos'] = pos
  item['pos_label'] = self._get_pos_label(pos)
  ```

**Kết Quả:**
- Backend trả về: `pos_label: "noun"` (hoặc verb, adjective, etc.)
- Frontend gửi: `partOfSpeech: "noun"`, `type: "noun"`
- API lưu: `partOfSpeech: "noun"`, `type: "noun"`
- Vocabulary page hiển thị: Phân loại đúng vào nhóm "Danh từ", "Động từ", etc.

## Cách Phân Loại Từ Loại

Frontend sử dụng hàm `normalizeType()` để chuẩn hóa:

```typescript
const normalizeType = (type: string): string => {
  const t = type?.toLowerCase() || "";
  if (t.includes("adverb") || t === "adv") return "adverb";
  if (t.includes("adjective") || t.includes("adj") || t === "a") return "adjective";
  if (t.includes("noun") || t === "n") return "noun";
  if (t.includes("verb") || t === "v") return "verb";
  if (t.includes("prep")) return "preposition";
  return "other";
};
```

Backend sử dụng `_get_pos_label()` để chuyển đổi POS tag:

```python
def _get_pos_label(self, pos_tag: str) -> str:
    """Convert POS tag to readable label"""
    if pos_tag.startswith('N'):  # Noun
        return 'noun'
    elif pos_tag.startswith('V'):  # Verb
        return 'verb'
    elif pos_tag.startswith('J'):  # Adjective
        return 'adjective'
    elif pos_tag.startswith('R'):  # Adverb
        return 'adverb'
    elif pos_tag.startswith('IN'):  # Preposition
        return 'preposition'
    else:
        return 'other'
```

## Kiểm Tra

1. **Upload tài liệu mới**
2. **Kiểm tra console log:**
   - `💾 IPA check:` - Xem IPA có đúng format không
   - `💾 POS check:` - Xem pos_label có được gửi không
3. **Vào /vocabulary:**
   - IPA hiển thị đúng format `/biː/`
   - Từ vựng được phân loại vào đúng nhóm (Danh từ, Động từ, Tính từ, etc.)

## Deployment

- Frontend: Vercel auto-deploy (commit f3e1b68)
- Backend: Railway auto-deploy (commit fad3afb)
- Đợi 2-3 phút để deployment hoàn tất

## Commits

1. `fad3afb` - Fix double slashes in IPA display
2. `f3e1b68` - Add partOfSpeech and type fields to vocabulary save
