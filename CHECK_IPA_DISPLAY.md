# 🔍 Kiểm Tra IPA Không Hiển Thị

## ❌ Vấn Đề

IPA hiển thị sai format:
- Hiện tại: `//the laws//`
- Mong muốn: `/ðə lɔːz/` (IPA chuẩn)

## 🔍 Các Bước Kiểm Tra

### Bước 1: Kiểm Tra Database

Mở Console (F12) trong trang `/vocabulary` và chạy:

```javascript
// Test 1: Kiểm tra data từ API
fetch('/api/vocabulary?limit=5')
  .then(r => r.json())
  .then(data => {
    console.log('📊 Database check:')
    data.forEach((item, i) => {
      console.log(`\n${i+1}. Word: ${item.word}`)
      console.log(`   IPA field: "${item.ipa}"`)
      console.log(`   Pronunciation field: "${item.pronunciation}"`)
      console.log(`   Has IPA: ${!!item.ipa}`)
      console.log(`   Has Pronunciation: ${!!item.pronunciation}`)
    })
  })
```

**Kết quả mong đợi:**
```
1. Word: the laws
   IPA field: ""
   Pronunciation field: ""
   Has IPA: false
   Has Pronunciation: false
```

**Nếu IPA = empty string:**
- Backend không generate IPA
- Railway chưa cài `requests` library

### Bước 2: Kiểm Tra getPronunciation Function

Trong Console, chạy:

```javascript
// Test 2: Kiểm tra function getPronunciation
// Copy function từ vocabulary page
const getIPA = (word) => {
  // Fallback dictionary (simplified)
  const dict = {
    'the': 'ðə',
    'laws': 'lɔːz',
    'freedom': 'ˈfriːdəm'
  }
  return dict[word.toLowerCase()] || ''
}

const getPronunciation = (word) => {
  if (word.ipa) return word.ipa
  if (word.pronunciation) return word.pronunciation
  return getIPA(word.word)
}

// Test với data giả
const testWord = {
  word: 'the laws',
  ipa: '',
  pronunciation: ''
}

console.log('Test getPronunciation:', getPronunciation(testWord))
// Expected: '' (empty) vì không có IPA trong database
```

### Bước 3: Kiểm Tra lib/ipaDict.ts

File này có dictionary IPA fallback. Kiểm tra:

```javascript
// Test 3: Import và test getIPA function
import { getIPA } from '@/lib/ipaDict'

console.log('Test getIPA:')
console.log('  the:', getIPA('the'))
console.log('  laws:', getIPA('laws'))
console.log('  freedom:', getIPA('freedom'))
```

**Nếu trả về empty string:**
- Dictionary không có từ này
- Cần thêm vào dictionary

**Nếu trả về `//the laws//`:**
- Dictionary có bug
- Cần fix format

## 🐛 Nguyên Nhân Có Thể

### Nguyên nhân 1: Backend không generate IPA

**Triệu chứng:**
```
Railway logs:
⚠️ Dictionary API failed: No module named 'requests'
✓ Added IPA to 0/29 items ❌
```

**Giải pháp:**
- Đợi Railway rebuild (đã push code cài `requests`)
- Hoặc fix backend để generate IPA

### Nguyên nhân 2: lib/ipaDict.ts trả về sai format

**Triệu chứng:**
```javascript
getIPA('the laws') // Returns: '//the laws//'
```

**Giải pháp:**
- Fix function getIPA() để trả về IPA chuẩn
- Hoặc return empty string nếu không có

### Nguyên nhân 3: Database có IPA nhưng sai format

**Triệu chứng:**
```javascript
item.ipa = '//the laws//'  // Sai format
```

**Giải pháp:**
- Clean database
- Re-upload documents

## ✅ Giải Pháp

### Fix 1: Đợi Railway Rebuild

Railway đang rebuild với `requests` library. Sau khi xong:
1. Upload file mới
2. IPA sẽ được generate từ Dictionary API
3. Format: `/ðə lɔːz/` (chuẩn)

### Fix 2: Fix lib/ipaDict.ts

Nếu getIPA() trả về sai format, cần fix:

```typescript
// lib/ipaDict.ts
export function getIPA(word: string): string {
  const dict: Record<string, string> = {
    'the': 'ðə',
    'laws': 'lɔːz',
    'freedom': 'ˈfriːdəm',
    // ... more words
  }
  
  // Return IPA or empty string
  return dict[word.toLowerCase()] || ''
}
```

### Fix 3: Clean Database và Re-upload

Nếu database có data sai:

```javascript
// Delete all vocabulary
fetch('/api/vocabulary?limit=1000')
  .then(r => r.json())
  .then(data => {
    data.forEach(item => {
      fetch(`/api/vocabulary?id=${item._id}`, { method: 'DELETE' })
    })
  })
```

Sau đó upload lại documents.

## 🎯 Test Sau Khi Fix

### Test 1: Upload File Mới

1. Vào `/dashboard-new/documents-simple`
2. Upload file test
3. Mở Console
4. Tìm logs:
   ```
   ✓ Added IPA to X/29 items ✅
   ```

### Test 2: Check Vocabulary Page

1. Vào `/vocabulary`
2. Xem IPA hiển thị
3. Expected: `/ðə lɔːz/` (có dấu gạch chéo)

### Test 3: Check Database

```javascript
fetch('/api/vocabulary?limit=5')
  .then(r => r.json())
  .then(data => {
    console.log('IPA check:', data[0].ipa)
    // Expected: 'ðə lɔːz' (không có dấu gạch chéo)
  })
```

## 📝 Tóm Tắt

**Vấn đề:** IPA hiển thị `//the laws//` thay vì `/ðə lɔːz/`

**Nguyên nhân có thể:**
1. Backend không generate IPA (Railway chưa cài `requests`)
2. lib/ipaDict.ts trả về sai format
3. Database có data sai

**Giải pháp:**
1. Đợi Railway rebuild (2-3 phút)
2. Upload file mới
3. Check IPA trong vocabulary page

**Nếu vẫn sai:**
- Chạy các test scripts ở trên
- Gửi kết quả cho developer
