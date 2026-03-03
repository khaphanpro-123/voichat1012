# Thêm IPA Phonetics và POS Tags

## ✅ Tính Năng Mới

Đã thêm 2 tính năng quan trọng cho vocabulary items:

1. **IPA Phonetics** - Phiên âm quốc tế
2. **POS Tags** - Từ loại (Part of Speech)

## 🎯 Mục Đích

### IPA Phonetics:
- Giúp người học phát âm chính xác
- Hiển thị ký hiệu phiên âm quốc tế chuẩn
- Sử dụng thư viện `eng_to_ipa`

### POS Tags:
- Phân loại từ theo từ loại (noun, verb, adjective, etc.)
- Giúp người học hiểu cách sử dụng từ
- Sử dụng NLTK POS tagging

## 🔧 Implementation

### Backend (Python)

#### 1. Thêm Method `_get_pos_tag()`
```python
def _get_pos_tag(self, word: str) -> str:
    """Get Part of Speech tag for a word or phrase"""
    from nltk import word_tokenize, pos_tag
    
    tokens = word_tokenize(word)
    pos_tags = pos_tag(tokens)
    
    # Priority: NOUN > VERB > ADJ
    nouns = [pos for word, pos in pos_tags if pos.startswith('NN')]
    verbs = [pos for word, pos in pos_tags if pos.startswith('VB')]
    adjs = [pos for word, pos in pos_tags if pos.startswith('JJ')]
    
    if nouns:
        return nouns[0]
    elif verbs:
        return verbs[0]
    elif adjs:
        return adjs[0]
    else:
        return pos_tags[0][1] if pos_tags else ""
```

#### 2. Thêm Method `_get_pos_label()`
```python
def _get_pos_label(self, pos: str) -> str:
    """Convert POS tag to readable label"""
    if pos.startswith('NN'):
        return 'noun'
    elif pos.startswith('VB'):
        return 'verb'
    elif pos.startswith('JJ'):
        return 'adjective'
    elif pos.startswith('RB'):
        return 'adverb'
    elif pos.startswith('IN'):
        return 'preposition'
    elif pos.startswith('DT'):
        return 'determiner'
    elif pos.startswith('PR'):
        return 'pronoun'
    elif pos.startswith('CC'):
        return 'conjunction'
    else:
        return 'other'
```

#### 3. Cập Nhật Post-Processing
```python
print(f"\n[POST-PROCESSING] Adding IPA phonetics and POS tags...")

for item in vocabulary:
    word = item.get('phrase', item.get('word', item.get('text', '')))
    
    # Add IPA
    if word and not item.get('ipa'):
        ipa = self._get_ipa_phonetics(word)
        if ipa:
            item['ipa'] = ipa
            item['phonetic'] = ipa
    
    # Add POS
    if word and not item.get('pos'):
        pos = self._get_pos_tag(word)
        if pos:
            item['pos'] = pos
            item['pos_label'] = self._get_pos_label(pos)
```

### Frontend (TypeScript/React)

#### Hiển Thị POS Tag
```tsx
<div className="flex items-center gap-2 mb-2">
  <p className="font-bold text-lg text-gray-800">
    {card.word || card.phrase}
  </p>
  
  {/* POS Tag */}
  {card.pos_label && (
    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full border border-green-200 font-medium">
      {card.pos_label}
    </span>
  )}
  
  <button onClick={() => speakText(card.word || card.phrase || "")}>
    {/* Speaker icon */}
  </button>
</div>
```

#### Hiển Thị IPA (đã có sẵn)
```tsx
{(card.phonetic || card.ipa) && (
  <p className="text-sm text-blue-600 mb-2 font-mono">
    /{card.phonetic || card.ipa}/
  </p>
)}
```

## 📊 POS Tags Mapping

| NLTK Tag | Label | Ví Dụ |
|----------|-------|-------|
| NN* | noun | book, student, knowledge |
| VB* | verb | learn, study, understand |
| JJ* | adjective | important, difficult, good |
| RB* | adverb | quickly, very, well |
| IN | preposition | in, on, at, for |
| DT | determiner | the, a, an |
| PR* | pronoun | he, she, it, they |
| CC | conjunction | and, but, or |

## 🎨 UI Display

### Vocabulary Card:
```
┌─────────────────────────────────────────┐
│ climate change [noun]  🔊               │
│ /ˈklaɪmət tʃeɪndʒ/                      │
│                                         │
│ 📖 Nghĩa: ...                           │
│ 💬 Câu ví dụ: "..."                    │
│                                    0.95 │
└─────────────────────────────────────────┘
```

## 📝 Vocabulary Item Structure

```typescript
{
  phrase: "climate change",
  ipa: "ˈklaɪmət tʃeɪndʒ",
  phonetic: "ˈklaɪmət tʃeɪndʒ",
  pos: "NN",
  pos_label: "noun",
  importance_score: 0.95,
  difficulty: "critical",
  difficulty_label: "Rất quan trọng",
  ...
}
```

## 🚀 Deployment

### Commits:
```bash
f28c3d3 - feat: add IPA phonetics and POS tags to vocabulary items
```

### Files Changed:
1. `python-api/complete_pipeline.py`
   - Added `_get_pos_tag()` method
   - Added `_get_pos_label()` method
   - Updated post-processing to add POS tags

2. `app/dashboard-new/documents-simple/page.tsx`
   - Added POS tag display in vocabulary cards

### Status:
- ✅ Backend: Added IPA + POS generation
- ✅ Frontend: Added POS display
- ✅ Committed and pushed
- ⏳ Railway + Vercel deploying (2-3 phút)

## 🎯 Kết Quả Mong Đợi

### Sau khi deploy:
1. Upload tài liệu
2. Mỗi vocabulary item sẽ có:
   - ✅ IPA phonetics: `/ˈklaɪmət tʃeɪndʒ/`
   - ✅ POS label: `noun`, `verb`, `adjective`, etc.
   - ✅ Difficulty level: `Rất quan trọng`, `Quan trọng`, etc.
   - ✅ Importance score: `0.95`

### Hiển thị:
```
climate change [noun]
/ˈklaɪmət tʃeɪndʒ/
📖 Nghĩa: ...
💬 Câu ví dụ: "..."
Score: 0.95
```

## 📚 Dependencies

### Backend:
- `nltk` - POS tagging (đã có)
- `eng_to_ipa` - IPA conversion (cần cài đặt)

### Cài Đặt:
```bash
pip install eng-to-ipa
```

Hoặc thêm vào `requirements.txt`:
```
eng-to-ipa>=0.0.2
```

## ⚠️ Lưu Ý

1. **IPA Library**: Nếu `eng_to_ipa` chưa được cài đặt trên Railway, cần thêm vào `requirements.txt`
2. **NLTK Data**: Đã được download tự động khi khởi động (punkt, averaged_perceptron_tagger)
3. **Phrases**: Với phrases (multi-word), POS sẽ ưu tiên: NOUN > VERB > ADJ
4. **Fallback**: Nếu không tìm được IPA hoặc POS, sẽ trả về empty string

## 🔍 Testing

### Test IPA:
```python
pipeline._get_ipa_phonetics("climate change")
# Output: "ˈklaɪmət tʃeɪndʒ"
```

### Test POS:
```python
pipeline._get_pos_tag("climate change")
# Output: "NN"

pipeline._get_pos_label("NN")
# Output: "noun"
```

---

**Thời gian:** 2026-03-03  
**Commit:** f28c3d3  
**Trạng thái:** ✅ ĐÃ THÊM IPA + POS  
**Đang chờ:** Railway + Vercel deploy ⏳
