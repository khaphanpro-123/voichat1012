# Phân tích và Giải quyết Vấn đề IPA & POS Grouping

## Ngày: 2026-03-05
## Commit: ee0c4fc

---

## 🔍 Vấn đề 1: IPA không hiển thị hoặc hiển thị sai

### Triệu chứng:
- Một số từ có IPA đúng chuẩn: `/ðə/`, `/ˈɡʌvənmənt/`
- Một số từ hiển thị sai hoặc không có IPA
- Một số cụm từ không có IPA

### Nguyên nhân gốc rễ:

#### 1. Rate Limiting của Dictionary API
```python
# CŨ: Delay 100ms giữa các request
if current_time - self._last_api_call < 0.1:  # 100ms
    time.sleep(0.1)
```

**Vấn đề**: Với tài liệu có 30-50 từ vựng, backend gửi 30-50 requests liên tiếp đến Dictionary API. Delay 100ms quá ngắn → API có thể rate limit hoặc timeout.

**Giải pháp**: Tăng delay lên 200ms và timeout lên 3s
```python
# MỚI: Delay 200ms, timeout 3s
time_since_last = current_time - self._last_api_call
if time_since_last < 0.2:  # 200ms delay
    time.sleep(0.2 - time_since_last)
self._last_api_call = time.time()

response = requests.get(url, timeout=3)  # 3s timeout
```

#### 2. Phrase IPA Generation
Backend đã implement logic split phrases thành words và combine IPA:

```python
# Ví dụ: "the teacher" → "/ðə ˈtiːtʃə(r)/"
if ' ' in word:
    words = word.split()
    ipa_parts = []
    for w in words:
        word_ipa = self._get_single_word_ipa(w_clean)
        if word_ipa:
            word_ipa = word_ipa.strip('/')
            ipa_parts.append(word_ipa)
    
    if ipa_parts:
        combined_ipa = ' '.join(ipa_parts)
        return f'/{combined_ipa}/'
```

**Vấn đề**: Nếu BẤT KỲ từ nào trong cụm từ không có IPA → toàn bộ cụm từ không có IPA

**Giải pháp hiện tại**: Backend vẫn cố gắng lấy IPA cho từng từ. Nếu không có, trả về empty string.

#### 3. Frontend Fallback Dictionary
Frontend có dictionary `ipaDict.ts` với ~400 từ phổ biến:

```typescript
export const IPA_DICT: Record<string, string> = {
  'be': '/biː/',
  'teacher': '/ˈtiːtʃə(r)/',
  // ... ~400 words
}
```

**Vấn đề**: Dictionary quá nhỏ, chỉ cover được từ cơ bản. Từ chuyên ngành hoặc từ ít gặp không có trong dictionary.

**Giải pháp**: Backend ưu tiên Dictionary API (real-time lookup) thay vì dựa vào dictionary tĩnh.

---

## 🔍 Vấn đề 2: POS Grouping luôn hiển thị "Khác" (Other)

### Triệu chứng:
- Tất cả từ vựng đều hiển thị trong nhóm "Khác"
- Không có từ nào trong nhóm "Danh từ", "Động từ", "Tính từ"

### Nguyên nhân gốc rễ:

#### 1. Field Mismatch giữa Backend và Frontend

**Backend** (complete_pipeline.py):
```python
item['pos'] = 'NN'  # NLTK POS tag
item['pos_label'] = 'noun'  # Readable label
```

**API** (vocabulary/route.ts):
```typescript
// CŨ: Không sync 2 fields
partOfSpeech: partOfSpeech || "other",
type: type || "other",
```

**Frontend** (vocabulary/page.tsx):
```typescript
const getWordType = (word: VocabularyWord): string => 
  word.partOfSpeech || word.type || "other";
```

**Vấn đề**: 
1. Backend gửi `pos_label: "noun"`
2. Frontend save vào API với field `partOfSpeech` và `type`
3. Nhưng 2 fields này không được sync → có thể `partOfSpeech = "noun"` nhưng `type = "other"`
4. Frontend đọc `partOfSpeech` trước, nhưng nếu không có thì fallback sang `type = "other"`

#### 2. Normalize Function không match

```typescript
const normalizeType = (type: string): string => {
  const t = type?.toLowerCase() || "";
  if (t.includes("noun") || t === "n") return "noun";
  if (t.includes("verb") || t === "v") return "verb";
  // ...
}
```

**Vấn đề**: Nếu `type = "other"` thì normalize vẫn trả về `"other"` → không match với bất kỳ nhóm nào.

### Giải pháp:

#### 1. Sync partOfSpeech và type trong API

```typescript
// MỚI: Sync 2 fields
const finalPartOfSpeech = partOfSpeech || type || "other"

await collection.insertOne({
  partOfSpeech: finalPartOfSpeech,
  type: finalPartOfSpeech,  // Keep both fields synced
  // ...
})
```

#### 2. Update cũng sync

```typescript
const finalPartOfSpeech = partOfSpeech || type || 
  existing.partOfSpeech || existing.type || "other"

await collection.updateOne(
  { word, userId },
  { 
    $set: {
      partOfSpeech: finalPartOfSpeech,
      type: finalPartOfSpeech,  // Keep both fields synced
      // ...
    }
  }
)
```

---

## 🔧 Các thay đổi đã thực hiện

### 1. Backend (python-api/complete_pipeline.py)

```python
# Tăng rate limit delay
time_since_last = current_time - self._last_api_call
if time_since_last < 0.2:  # 200ms delay (tăng từ 100ms)
    time.sleep(0.2 - time_since_last)

# Tăng timeout
response = requests.get(url, timeout=3)  # 3s (tăng từ 2s)

# Thêm debug logging
print(f"\n  📊 IPA Sample (first 5 items):")
for i, item in enumerate(vocabulary[:5]):
    word = item.get('word', item.get('phrase', ''))
    ipa = item.get('ipa', '')
    pos = item.get('pos_label', '')
    print(f"    {i+1}. '{word}' -> IPA: '{ipa}' | POS: '{pos}'")
```

### 2. API (app/api/vocabulary/route.ts)

```typescript
// Sync partOfSpeech và type
const finalPartOfSpeech = partOfSpeech || type || "other"

await collection.insertOne({
  partOfSpeech: finalPartOfSpeech,
  type: finalPartOfSpeech,
  // ...
})
```

### 3. Force Railway Rebuild

Tạo file `.railway-rebuild` để force Railway deploy lại code mới.

---

## 📊 Kết quả mong đợi

### IPA:
- ✅ Tăng tỷ lệ thành công từ Dictionary API (delay 200ms, timeout 3s)
- ✅ Phrases có IPA đầy đủ: "the teacher" → "/ðə ˈtiːtʃə(r)/"
- ✅ Debug log giúp identify từ nào không có IPA

### POS Grouping:
- ✅ Từ vựng được phân nhóm đúng: Danh từ, Động từ, Tính từ
- ✅ Không còn tất cả từ trong nhóm "Khác"
- ✅ Sync giữa `partOfSpeech` và `type` fields

---

## 🧪 Cách kiểm tra

### 1. Kiểm tra Railway Logs

```bash
# Xem Railway logs để check:
# - IPA Sample output
# - API rate limiting errors
# - POS tagging success rate
```

Tìm dòng:
```
📊 IPA Sample (first 5 items):
  1. 'machine learning' -> IPA: '/məˈʃiːn ˈlɜːnɪŋ/' | POS: 'noun'
  2. 'algorithm' -> IPA: '/ˈælɡərɪðəm/' | POS: 'noun'
```

### 2. Kiểm tra Frontend

1. Upload tài liệu mới
2. Xem console logs:
   ```
   📊 Backend response: {...}
   📊 First vocabulary item: {...}
   📊 IPA field check: {hasPhonetic: true, hasIpa: true, ...}
   ```

3. Vào trang `/dashboard-new/vocabulary`
4. Check:
   - Từ vựng có hiển thị IPA không?
   - Từ vựng có được phân nhóm đúng không? (Danh từ, Động từ, Tính từ)

### 3. Kiểm tra Database

```javascript
// MongoDB query
db.vocabulary.find({ userId: "..." }).limit(5)

// Check fields:
// - ipa: "/ðə/"
// - partOfSpeech: "noun"
// - type: "noun"  // Should match partOfSpeech
```

---

## 🚨 Lưu ý

### Dictionary API Rate Limiting
- Free tier: ~450 requests/hour
- Với delay 200ms: 300 requests/minute = 18,000 requests/hour
- **Vẫn có thể bị rate limit nếu upload nhiều tài liệu liên tiếp**

### Giải pháp dài hạn:
1. **Cache IPA results**: Lưu IPA vào database để không phải query lại
2. **Batch processing**: Xử lý từng batch 10-20 từ, delay giữa các batch
3. **Fallback library**: Cài đặt `eng_to_ipa` library trên Railway
4. **Premium API**: Nâng cấp lên paid tier nếu cần

### POS Grouping
- Hiện tại đã sync `partOfSpeech` và `type`
- Từ vựng CŨ trong database vẫn có thể có mismatch
- **Giải pháp**: Re-save từ vựng cũ hoặc chạy migration script

---

## 📝 Commit History

```
ee0c4fc - fix: Improve IPA generation and POS grouping
63e5bdc - HOTFIX: Remove duplicate phonetic line causing IndentationError
e6ec00b - feat: Add IPA support for phrases
5080de1 - chore: Trigger Railway rebuild
c0a0bd7 - HOTFIX: Fix IndentationError in complete_pipeline.py
```

---

## ✅ Checklist

- [x] Tăng API rate limit delay (100ms → 200ms)
- [x] Tăng API timeout (2s → 3s)
- [x] Sync partOfSpeech và type fields
- [x] Thêm debug logging cho IPA
- [x] Force Railway rebuild
- [x] Commit và push code
- [ ] Đợi Railway deploy (2-3 phút)
- [ ] Test upload tài liệu mới
- [ ] Verify IPA hiển thị đúng
- [ ] Verify POS grouping đúng

---

## 🔗 Related Files

- `python-api/complete_pipeline.py` - IPA generation logic
- `app/api/vocabulary/route.ts` - Vocabulary save API
- `app/dashboard-new/documents-simple/page.tsx` - Upload & display
- `app/dashboard-new/vocabulary/page.tsx` - Vocabulary page with grouping
- `lib/ipaDict.ts` - Frontend IPA dictionary (fallback)
