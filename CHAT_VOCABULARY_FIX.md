# Chat Vocabulary Save Fix

## Vấn đề
Từ vựng được sinh ra trong `/dashboard-new/chat` chưa được lưu vào `/vocabulary`.

## Nguyên nhân
1. API `/api/voice-chat-enhanced` sử dụng Mongoose model để lưu
2. API `/api/vocabulary` sử dụng MongoDB native client để đọc
3. Cả 2 đều truy cập cùng collection `vocabulary` nhưng có thể có conflict về schema
4. User có thể chưa bật "Tự động lưu từ vựng" trong settings

## Giải pháp đã thực hiện

### 1. Thêm Debug Logging (Vocabulary Page)
- Thêm console.log trong `loadVocabulary()` để xem số lượng từ vựng từ mỗi source
- Log sample items để debug
- Hiển thị stats chi tiết: total, vocabulary, structures, fromVoiceChat, fromDocument

### 2. Thêm Source Filter (Vocabulary Page)
- Thêm state `selectedSource` để filter theo nguồn (voice_chat, document, manual)
- Thêm UI buttons để filter:
  - 🎤 Voice Chat - hiển thị số lượng từ voice chat
  - 📄 Tài liệu - hiển thị số lượng từ documents
  - ✍️ Thủ công - hiển thị số lượng từ thêm thủ công
- Filter hoạt động kết hợp với type filter và search

### 3. Cải thiện Search Box (Vocabulary Page)
- Thêm placeholder text rõ ràng hơn: "Tìm kiếm từ vựng trong kho..."
- Thêm nút X để clear search nhanh
- Thêm shadow và focus states đẹp hơn
- Search trong cả word và meaning

### 4. Enhanced Filtering (Vocabulary Page)
- Filter theo type (noun, verb, adjective, etc.)
- Filter theo source (voice_chat, document, manual)
- Search trong cả word và meaning
- Tất cả filters hoạt động đồng thời

### 5. Save Notification (Voice Chat Component)
- Thêm state `saveNotification` để hiển thị thông báo khi lưu
- Hiển thị số lượng từ vựng và cấu trúc đã lưu
- Auto-hide sau 3 giây
- Animation mượt mà với framer-motion
- Màu xanh lá để dễ nhận biết

### 6. Better User Feedback (Voice Chat Component)
- Hiển thị notification: "✅ Đã lưu X từ vựng, Y cấu trúc"
- Badge số lượng trên nút "Từ vựng đã lưu"
- Checkmark xanh bên cạnh "Từ vựng" khi autoSave bật

## Cách kiểm tra

### Bước 1: Kiểm tra Voice Chat
1. Mở `/dashboard-new/chat`
2. Click nút Settings (⚙️)
3. Đảm bảo checkbox "Tự động lưu từ vựng" được BẬT ✓
4. Chat với AI bằng tiếng Anh
5. Xem phần "Chi tiết" của mỗi response
6. Kiểm tra có từ vựng được hiển thị không
7. Sau khi chat, sẽ thấy notification: "✅ Đã lưu X từ vựng, Y cấu trúc"

### Bước 2: Kiểm tra Console Logs
Mở Console (F12) và xem logs:
```
💾 Saving 3 vocabulary items for user 67xxxxx
  💾 Saving word: example {...}
  ✅ Saved: example (ID: 67xxxxx)
✅ Successfully saved 3 vocabulary items
```

### Bước 3: Kiểm tra Vocabulary Page
1. Mở `/vocabulary`
2. Xem Console logs:
   ```
   📚 Loaded vocabulary: X items
   📊 Sample items: [...]
   📊 Vocabulary stats: {
     total: X,
     vocabulary: X,
     structures: X,
     fromVoiceChat: X,  ← Kiểm tra số này
     fromDocument: X
   }
   ```
3. Click filter "🎤 Voice Chat" - số lượng phải > 0
4. Kiểm tra xem từ vựng từ chat có hiển thị không

### Bước 4: Kiểm tra Database (nếu cần)
```javascript
// Trong MongoDB
db.vocabulary.find({ 
  userId: "YOUR_USER_ID", 
  source: "voice_chat" 
}).count()
```

## Files đã sửa

### 1. `app/dashboard-new/vocabulary/page.tsx`
- Thêm `selectedSource` state
- Thêm source filter UI với 4 buttons (All, Voice Chat, Document, Manual)
- Cải thiện search box với clear button
- Thêm debug logging chi tiết
- Update filter logic để support source filter

### 2. `components/VoiceChatEnhanced.tsx`
- Thêm `saveNotification` state
- Thêm logic hiển thị notification khi lưu thành công
- Thêm AnimatePresence cho notification
- Hiển thị số lượng từ vựng và cấu trúc đã lưu

## Lưu ý quan trọng

### Source Tags
- Từ vựng từ voice chat có `source: "voice_chat"`
- Từ vựng từ documents có `source: "document"`
- Từ vựng thêm thủ công có `source: "manual"`
- Cấu trúc câu có `type: "structure"`

### Auto-Save Setting
- User PHẢI bật "Tự động lưu từ vựng" trong settings
- Mặc định là BẬT (autoSave = true)
- Nếu tắt, từ vựng sẽ KHÔNG được lưu

### Authentication
- User phải đăng nhập (không phải "anonymous")
- Nếu userId === "anonymous", từ vựng sẽ KHÔNG được lưu

## Troubleshooting

### Nếu vẫn không thấy từ vựng:

1. **Kiểm tra user đã đăng nhập chưa**
   - Xem console log có userId không
   - Nếu là "anonymous", cần đăng nhập

2. **Kiểm tra autoSave có bật không**
   - Mở settings trong voice chat
   - Đảm bảo checkbox "Tự động lưu từ vựng" được tích

3. **Kiểm tra AI có trả về vocabulary không**
   - Xem response trong console
   - AI phải trả về array `vocabulary` với ít nhất 1 item

4. **Kiểm tra database connection**
   - Xem server logs có lỗi MongoDB không
   - Verify MONGO_URI trong .env

5. **Kiểm tra schema validation**
   - Tất cả required fields phải có giá trị
   - example và exampleTranslation đều có fallback

## Next Steps (nếu vẫn không hoạt động)

1. Kiểm tra MongoDB collection trực tiếp
2. Verify schema validation không block insert
3. Check API logs khi save vocabulary
4. Có thể cần migrate sang dùng Mongoose cho cả GET và POST
5. Test với user account khác để loại trừ vấn đề user-specific
