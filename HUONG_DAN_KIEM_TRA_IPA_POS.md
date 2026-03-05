# Hướng dẫn Kiểm tra IPA và POS Grouping

## 🎯 Tóm tắt vấn đề đã fix

### Vấn đề 1: IPA không hiển thị hoặc sai
**Nguyên nhân**: 
- API rate limiting (delay quá ngắn 100ms)
- Timeout quá ngắn (2s)
- Phrases không có IPA nếu bất kỳ từ nào fail

**Đã fix**:
- ✅ Tăng delay lên 200ms
- ✅ Tăng timeout lên 3s
- ✅ Thêm debug logging để track IPA generation

### Vấn đề 2: POS Grouping luôn hiển thị "Khác"
**Nguyên nhân**:
- Field `partOfSpeech` và `type` không sync
- Backend gửi `pos_label: "noun"` nhưng API save vào `type: "other"`

**Đã fix**:
- ✅ Sync 2 fields `partOfSpeech` và `type` trong API
- ✅ Update cũng sync 2 fields

---

## 📋 Các bước kiểm tra

### Bước 1: Đợi Railway Deploy (2-3 phút)

1. Mở Railway dashboard: https://railway.app
2. Vào project backend
3. Xem Deployments tab
4. Đợi deployment mới nhất (commit `ee0c4fc`) chuyển sang "Active"

### Bước 2: Kiểm tra Railway Logs

1. Click vào deployment mới nhất
2. Xem logs, tìm dòng:
   ```
   ✅ New Pipeline initialized (Learned Scoring)
   ✅ PIPELINE READY
   ```

3. Nếu thấy error, copy error và báo lại

### Bước 3: Test Upload Tài liệu

1. Vào trang: http://localhost:3000/dashboard-new/documents-simple
   (hoặc production URL nếu đã deploy)

2. Upload 1 tài liệu PDF/DOCX nhỏ (1-2 trang)

3. Đợi xử lý xong

4. Mở Console (F12) và xem logs:
   ```
   📊 Backend response: {...}
   📊 Vocabulary items: 30
   📊 First vocabulary item: {...}
   📊 IPA field check: {
     hasPhonetic: true,
     hasIpa: true,
     phoneticValue: "/məˈʃiːn/",
     ipaValue: "/məˈʃiːn/"
   }
   💾 First item payload: {...}
   💾 IPA check: {...}
   💾 POS check: {
     hasPosLabel: true,
     posLabelValue: "noun",
     finalPartOfSpeech: "noun",
     finalType: "noun"
   }
   ```

### Bước 4: Kiểm tra Hiển thị

#### 4.1. Kiểm tra IPA trên trang Documents

Xem từng vocabulary card:
- ✅ Có hiển thị IPA không? (màu xanh, font mono)
- ✅ IPA có đúng format không? `/ðə/`, `/ˈɡʌvənmənt/`
- ✅ Phrases có IPA không? "the teacher" → `/ðə ˈtiːtʃə(r)/`

#### 4.2. Kiểm tra POS Tag

Xem badge màu xanh lá:
- ✅ Có hiển thị POS tag không? (noun, verb, adjective)
- ✅ POS tag có đúng không?

### Bước 5: Kiểm tra Vocabulary Page

1. Click "Xem từ vựng đã lưu" hoặc vào: `/dashboard-new/vocabulary`

2. Kiểm tra filter buttons:
   ```
   [Tất cả (30)] [Danh từ (15)] [Động từ (8)] [Tính từ (5)] [Khác (2)]
   ```

3. Click vào từng filter:
   - ✅ "Danh từ" có từ không? (không còn 0)
   - ✅ "Động từ" có từ không?
   - ✅ "Tính từ" có từ không?
   - ✅ "Khác" chỉ có từ thực sự không xác định được loại

4. Kiểm tra từng vocabulary card:
   - ✅ Có hiển thị IPA không?
   - ✅ Có hiển thị POS tag (badge xanh lá) không?

---

## 🐛 Nếu vẫn có vấn đề

### Vấn đề: IPA vẫn không hiển thị

**Kiểm tra Railway logs**:
```bash
# Tìm dòng này trong logs:
📊 IPA Sample (first 5 items):
  1. 'machine learning' -> IPA: '' | POS: 'noun'
  2. 'algorithm' -> IPA: '' | POS: 'noun'
```

Nếu IPA = '' (empty):
1. Check xem có error "Dictionary API failed" không
2. Check xem có error "Rate limit" không
3. Có thể Dictionary API đang down hoặc rate limit

**Giải pháp tạm thời**:
- Đợi 1 giờ rồi thử lại (API reset rate limit)
- Upload tài liệu nhỏ hơn (ít từ vựng hơn)

### Vấn đề: POS vẫn hiển thị "Khác"

**Kiểm tra Console logs**:
```javascript
💾 POS check: {
  hasPosLabel: true,
  posLabelValue: "noun",
  finalPartOfSpeech: "???",  // Check giá trị này
  finalType: "???"           // Check giá trị này
}
```

Nếu `finalPartOfSpeech` và `finalType` khác nhau:
- API chưa sync đúng
- Cần check lại code `app/api/vocabulary/route.ts`

**Kiểm tra Database**:
```javascript
// Vào MongoDB Atlas
// Query:
db.vocabulary.find({ userId: "your-user-id" }).limit(5)

// Check fields:
{
  word: "machine learning",
  partOfSpeech: "???",  // Should be "noun"
  type: "???",          // Should be "noun" (same as partOfSpeech)
  ipa: "/məˈʃiːn ˈlɜːnɪŋ/"
}
```

### Vấn đề: Từ vựng CŨ vẫn không có IPA/POS

**Nguyên nhân**: Từ vựng đã lưu trước khi fix không tự động update

**Giải pháp**:
1. Upload lại tài liệu (từ vựng mới sẽ có IPA/POS)
2. Hoặc xóa từ vựng cũ và upload lại
3. Hoặc chạy migration script (cần viết thêm)

---

## 📊 Kết quả mong đợi

### Trước khi fix:
```
❌ IPA: 5/30 từ có IPA (17%)
❌ POS: Tất cả 30 từ trong nhóm "Khác"
```

### Sau khi fix:
```
✅ IPA: 25-28/30 từ có IPA (83-93%)
✅ POS: 
   - Danh từ: 15 từ
   - Động từ: 8 từ
   - Tính từ: 5 từ
   - Khác: 2 từ
```

**Lưu ý**: Một số từ vẫn có thể không có IPA nếu:
- Từ quá hiếm, không có trong Dictionary API
- Từ chuyên ngành
- Từ viết tắt
- API rate limit (nếu upload nhiều tài liệu liên tiếp)

---

## 🔗 Links hữu ích

- Railway Dashboard: https://railway.app
- MongoDB Atlas: https://cloud.mongodb.com
- Dictionary API: https://dictionaryapi.dev
- GitHub Repo: https://github.com/khaphanpro-123/voichat1012

---

## 📞 Báo lỗi

Nếu vẫn có vấn đề, cung cấp thông tin sau:

1. **Railway logs** (copy toàn bộ logs khi upload tài liệu)
2. **Console logs** (F12 → Console tab)
3. **Screenshot** của vocabulary page
4. **Tài liệu test** (nếu có thể share)

Format báo lỗi:
```
## Vấn đề: [Mô tả ngắn gọn]

### Railway Logs:
```
[Copy logs here]
```

### Console Logs:
```
[Copy logs here]
```

### Screenshot:
[Attach screenshot]

### Tài liệu test:
[Link hoặc mô tả]
```
